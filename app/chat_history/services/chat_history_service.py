"""
Сервис для работы с историей чата.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, or_
from sqlalchemy.orm import selectinload
from app.models.chat_history import ChatHistory
from app.models.subscription import SubscriptionType
from app.services.subscription_service import SubscriptionService
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_chat_history, TTL_CHAT_HISTORY
)


class ChatHistoryService:
    """Сервис для работы с историей чата."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.subscription_service = SubscriptionService(db)
    
    async def can_save_history(self, user_id: int) -> bool:
        """Проверяет, может ли пользователь сохранять историю чата."""
        subscription = await self.subscription_service.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # История доступна только для подписок Standard и Premium
        return subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
    
    async def save_message(self, user_id: int, character_name: str, session_id: str, 
                          message_type: str, message_content: str, 
                          image_url: Optional[str] = None, image_filename: Optional[str] = None) -> bool:
        """Сохраняет сообщение в историю чата."""
        try:
            # Проверяем права на сохранение истории
            if not await self.can_save_history(user_id):
                return False
            
            chat_message = ChatHistory(
                user_id=user_id,
                character_name=character_name,
                session_id=session_id,
                message_type=message_type,
                message_content=message_content,
                image_url=image_url,
                image_filename=image_filename
            )
            
            self.db.add(chat_message)
            await self.db.commit()
            await self.db.refresh(chat_message)
            
            # Инвалидируем кэш истории чата
            cache_key = key_chat_history(user_id, character_name, session_id)
            await cache_delete(cache_key)
            
            return True
            
        except Exception as e:
            print(f"[ERROR] Ошибка сохранения сообщения в историю: {e}")
            await self.db.rollback()
            return False
    
    async def get_chat_history(self, user_id: int, character_name: str, session_id: str) -> List[Dict[str, Any]]:
        """Получает историю чата для конкретного персонажа и сессии с кэшированием."""
        try:
            # Проверяем права на получение истории
            if not await self.can_save_history(user_id):
                return []
            
            cache_key = key_chat_history(user_id, character_name, session_id)
            cached_history = await cache_get(cache_key)
            if cached_history is not None:
                return cached_history
            
            result = await self.db.execute(
                select(ChatHistory)
                .where(
                    ChatHistory.user_id == user_id,
                    ChatHistory.character_name == character_name,
                    ChatHistory.session_id == session_id
                )
                .order_by(ChatHistory.created_at.asc())
            )
            
            messages = result.scalars().all()
            
            # Преобразуем в формат для фронтенда
            history = []
            for msg in messages:
                message_data = {
                    "type": msg.message_type,
                    "content": msg.message_content,
                    "timestamp": msg.created_at.isoformat() if msg.created_at else None
                }
                
                # Добавляем изображение, если есть
                if msg.image_url:
                    message_data["image_url"] = msg.image_url
                    message_data["image_filename"] = msg.image_filename
                
                history.append(message_data)
            
            # Сохраняем в кэш
            await cache_set(cache_key, history, ttl_seconds=TTL_CHAT_HISTORY)
            
            return history
            
        except Exception as e:
            print(f"[ERROR] Ошибка получения истории чата: {e}")
            return []
    
    async def _get_last_image_url(self, user_id: int, character_name: str) -> Optional[str]:
        stmt = (
            select(ChatHistory.image_url)
            .where(ChatHistory.user_id == user_id)
            .where(ChatHistory.character_name == character_name)
            .where(ChatHistory.image_url.isnot(None))
            .order_by(ChatHistory.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        row = result.first()
        return row[0] if row else None

    async def get_user_characters_with_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Получает список персонажей, с которыми у пользователя есть НЕЗАКОНЧЕННЫЙ диалог.
        Показывает только тех персонажей, с которыми пользователь реально общался (есть сообщения).
        """
        try:
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            from app.models.user import Users

            characters: Dict[str, Dict[str, Any]] = {}

            # Получаем персонажей из ChatSession и ChatMessageDB (новая система)
            # Это основной источник - показывает только персонажей, с которыми есть реальные сообщения
            user_id_str = str(user_id).strip()
            conditions = [
                ChatSession.user_id == user_id_str,
                func.trim(ChatSession.user_id) == user_id_str,
            ]

            user_result = await self.db.execute(
                select(Users.username).where(Users.id == user_id)
            )
            username_row = user_result.first()
            username = username_row[0] if username_row else None
            if username:
                normalized_username = username.strip().lower()
                conditions.extend(
                    [
                        ChatSession.user_id == username,
                        func.trim(ChatSession.user_id) == username,
                        func.lower(func.trim(ChatSession.user_id)) == normalized_username,
                    ]
                )

            try:
                # Получаем персонажей, у которых есть хотя бы одно сообщение от пользователя
                session_result = await self.db.execute(
                    select(
                        CharacterDB.name,
                        func.max(ChatMessageDB.timestamp).label("last_message_at"),
                        func.count(ChatMessageDB.id).label("message_count"),
                    )
                    .join(ChatSession, ChatSession.character_id == CharacterDB.id)
                    .join(ChatMessageDB, ChatMessageDB.session_id == ChatSession.id)
                    .where(or_(*conditions))
                    .where(ChatMessageDB.role == "user")  # Только сообщения от пользователя
                    .group_by(CharacterDB.name)
                    .having(func.count(ChatMessageDB.id) > 0)  # Должно быть хотя бы одно сообщение
                    .order_by(func.max(ChatMessageDB.timestamp).desc())
                )

                rows = session_result.fetchall()
                for row in rows:
                    character_name = row[0]
                    last_message_at = row[1]
                    message_count = row[2]
                    
                    # Пропускаем, если нет сообщений от пользователя
                    if message_count == 0:
                        continue
                    
                    key = character_name.lower()
                    last_image_url = await self._get_last_image_url(user_id, character_name)
                    characters[key] = {
                        "name": character_name,
                        "last_message_at": last_message_at.isoformat() if last_message_at else None,
                        "last_image_url": last_image_url,
                    }
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей из ChatSession: {e}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")

            # Дополнительно проверяем ChatHistory, но только если там есть реальные сообщения ОТ ПОЛЬЗОВАТЕЛЯ
            # (не только фото, но и текстовые сообщения с message_type='user')
            try:
                history_result = await self.db.execute(
                    select(
                        ChatHistory.character_name,
                        func.max(ChatHistory.created_at).label("last_message_at"),
                        func.count(ChatHistory.id).label("message_count"),
                    )
                    .where(ChatHistory.user_id == user_id)
                    .where(ChatHistory.message_type == "user")  # Только сообщения от пользователя
                    .where(ChatHistory.message_content.isnot(None))  # Должно быть текстовое сообщение
                    .where(ChatHistory.message_content != "")  # Не пустое сообщение
                    .group_by(ChatHistory.character_name)
                    .having(func.count(ChatHistory.id) > 0)  # Должно быть хотя бы одно сообщение
                    .order_by(func.max(ChatHistory.created_at).desc())
                )

                for row in history_result.fetchall():
                    character_name = row[0]
                    if not character_name:
                        continue
                    last_message_at = row[1]
                    message_count = row[2]
                    
                    # Пропускаем, если нет сообщений
                    if message_count == 0:
                        continue
                    
                    key = character_name.lower()
                    
                    # Добавляем только если персонажа еще нет в списке
                    if key not in characters:
                        last_image_url = await self._get_last_image_url(user_id, character_name)
                        characters[key] = {
                            "name": character_name,
                            "last_message_at": last_message_at.isoformat() if last_message_at else None,
                            "last_image_url": last_image_url,
                        }
                    elif last_message_at:
                        # Обновляем время последнего сообщения, если оно новее
                        existing_time = characters[key].get("last_message_at")
                        if existing_time and last_message_at:
                            try:
                                from datetime import datetime
                                existing_dt = datetime.fromisoformat(existing_time.replace('Z', '+00:00'))
                                if last_message_at > existing_dt:
                                    characters[key]["last_message_at"] = last_message_at.isoformat()
                            except:
                                pass
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей из ChatHistory: {e}")

            return list(characters.values())
        except Exception as e:
            print(f"[ERROR] Ошибка получения списка персонажей: {e}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return []
    
    async def clear_chat_history(self, user_id: int, character_name: str, session_id: str) -> bool:
        """Очищает историю чата для конкретного персонажа и сессии."""
        try:
            # Проверяем права на очистку истории
            if not await self.can_save_history(user_id):
                return False
            
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            
            # Удаляем из ChatHistory (старая система)
            # Сначала находим персонажа по name или display_name
            character_result = await self.db.execute(
                select(CharacterDB).where(
                    or_(
                        CharacterDB.name == character_name,
                        CharacterDB.display_name == character_name
                    )
                )
            )
            character = character_result.scalars().first()
            
            # Удаляем по character_name (как хранится в ChatHistory)
            # Удаляем для всех session_id, так как при очистке истории нужно удалить все сессии
            await self.db.execute(
                delete(ChatHistory)
                .where(
                    ChatHistory.user_id == user_id,
                    ChatHistory.character_name == character_name
                )
            )
            
            # Если нашли персонажа, также удаляем по его name и display_name
            # Удаляем для всех session_id
            if character:
                await self.db.execute(
                    delete(ChatHistory)
                    .where(
                        ChatHistory.user_id == user_id,
                        or_(
                            ChatHistory.character_name == character.name,
                            ChatHistory.character_name == character.display_name
                        )
                    )
                )
            
            # Удаляем из ChatSession и ChatMessageDB (новая система)
            # Используем уже найденного персонажа, если он есть
            if character:
                # Находим сессии пользователя для этого персонажа
                user_id_str = str(user_id).strip()
                session_result = await self.db.execute(
                    select(ChatSession)
                    .where(ChatSession.character_id == character.id)
                    .where(
                        or_(
                            ChatSession.user_id == user_id_str,
                            func.trim(ChatSession.user_id) == user_id_str,
                        )
                    )
                )
                sessions = session_result.scalars().all()
                
                # Удаляем все сообщения из этих сессий и сами сессии
                for session in sessions:
                    # Удаляем все сообщения из сессии
                    await self.db.execute(
                        delete(ChatMessageDB).where(ChatMessageDB.session_id == session.id)
                    )
                    # Удаляем саму сессию
                    await self.db.execute(
                        delete(ChatSession).where(ChatSession.id == session.id)
                    )
            
            await self.db.commit()
            return True
            
        except Exception as e:
            print(f"[ERROR] Ошибка очистки истории чата: {e}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            await self.db.rollback()
            return False
    
    async def get_history_stats(self, user_id: int) -> Dict[str, Any]:
        """Получает статистику по истории чата пользователя."""
        try:
            # Проверяем права на получение статистики
            if not await self.can_save_history(user_id):
                return {"can_save_history": False}
            
            # Подсчитываем общее количество сообщений
            result = await self.db.execute(
                select(ChatHistory)
                .where(ChatHistory.user_id == user_id)
            )
            
            messages = result.scalars().all()
            total_messages = len(messages)
            
            # Подсчитываем количество персонажей
            characters_result = await self.db.execute(
                select(ChatHistory.character_name)
                .where(ChatHistory.user_id == user_id)
                .distinct()
            )
            
            characters_count = len([row[0] for row in characters_result.fetchall()])
            
            return {
                "can_save_history": True,
                "total_messages": total_messages,
                "characters_count": characters_count
            }
            
        except Exception as e:
            print(f"[ERROR] Ошибка получения статистики истории: {e}")
            return {"can_save_history": False}
