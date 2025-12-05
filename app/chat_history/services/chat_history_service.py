"""
Сервис для работы с историей чата.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, or_, and_
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
        """
        Проверяет, может ли пользователь сохранять историю чата.
        КРИТИЧЕСКИ ВАЖНО: PREMIUM обрабатывается так же, как STANDARD - никаких различий.
        """
        subscription = await self.subscription_service.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # КРИТИЧЕСКИ ВАЖНО: История доступна для STANDARD и PREMIUM подписок одинаково
        # PREMIUM должен работать так же, как STANDARD
        can_save = subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
        if subscription.subscription_type == SubscriptionType.PREMIUM:
            print(f"[DEBUG] PREMIUM подписка обнаружена для user_id={user_id} - can_save_history={can_save}")
        return can_save
    
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
        import logging
        logger = logging.getLogger(__name__)
        
        # Сначала проверяем ChatHistory
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
        if row and row[0]:
            logger.info(f"[HISTORY PHOTO] Найдено фото в ChatHistory для {character_name}: {row[0][:50]}...")
            return row[0]
        
        # Если в ChatHistory нет, проверяем UserGallery
        try:
            from app.models.user_gallery import UserGallery
            gallery_stmt = (
                select(UserGallery.image_url)
                .where(UserGallery.user_id == user_id)
                .where(UserGallery.character_name == character_name)
                .order_by(UserGallery.created_at.desc())
                .limit(1)
            )
            gallery_result = await self.db.execute(gallery_stmt)
            gallery_row = gallery_result.first()
            if gallery_row and gallery_row[0]:
                logger.info(f"[HISTORY PHOTO] Найдено фото в UserGallery для {character_name}: {gallery_row[0][:50]}...")
                return gallery_row[0]
            else:
                logger.warning(f"[HISTORY PHOTO] Фото не найдено ни в ChatHistory, ни в UserGallery для user_id={user_id}, character={character_name}")
                return None
        except Exception as e:
            logger.error(f"[HISTORY PHOTO] Ошибка поиска в UserGallery: {e}")
            return None

    async def get_user_characters_with_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Получает список персонажей, с которыми у пользователя есть НЕЗАКОНЧЕННЫЙ диалог.
        Показывает только тех персонажей, с которыми пользователь реально общался (есть сообщения).
        Для STANDARD и PREMIUM подписок возвращает персонажей с незаконченными диалогами.
        """
        try:
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            from app.models.user import Users

            # Проверяем подписку пользователя
            subscription = await self.subscription_service.get_user_subscription(user_id)
            subscription_type_value = subscription.subscription_type.value if subscription and subscription.subscription_type else "unknown"
            is_active = subscription.is_active if subscription else False
            
            print(f"[DEBUG] Пользователь {user_id}: подписка={subscription_type_value}, is_active={is_active}")
            
            # КРИТИЧЕСКИ ВАЖНО: для FREE подписки не возвращаем персонажей
            # Для STANDARD и PREMIUM подписок возвращаем персонажей с незаконченными диалогами
            if not subscription:
                print(f"[DEBUG] Пользователь {user_id}: подписка отсутствует - возвращаем пустой список")
                return []
            
            if subscription.subscription_type == SubscriptionType.FREE:
                print(f"[DEBUG] Пользователь {user_id} имеет FREE подписку - возвращаем пустой список")
                return []
            
            if not subscription.is_active:
                print(f"[DEBUG] Пользователь {user_id} имеет неактивную подписку {subscription_type_value} - возвращаем пустой список")
                return []
            
            print(f"[DEBUG] Пользователь {user_id} имеет активную подписку {subscription_type_value} - получаем персонажей с историей")

            characters: Dict[str, Dict[str, Any]] = {}

            # Получаем персонажей из ChatSession и ChatMessageDB (новая система)
            # Это основной источник - показывает только персонажей, с которыми есть реальные сообщения
            user_id_str = str(user_id).strip()
            
            # Сначала проверим, есть ли вообще ChatSession для этого пользователя
            test_session_query = await self.db.execute(
                select(ChatSession).where(
                    or_(
                        ChatSession.user_id == user_id_str,
                        func.trim(ChatSession.user_id) == user_id_str
                    )
                ).limit(10)
            )
            test_sessions = test_session_query.scalars().all()
            print(f"[DEBUG] Найдено ChatSession для user_id={user_id}: {len(test_sessions)} сессий")
            for sess in test_sessions:
                # Получаем количество сообщений в этой сессии
                msg_count_query = await self.db.execute(
                    select(func.count(ChatMessageDB.id)).where(ChatMessageDB.session_id == sess.id)
                )
                msg_count = msg_count_query.scalar() or 0
                print(f"[DEBUG]   - session_id={sess.id}, character_id={sess.character_id}, user_id='{sess.user_id}', messages={msg_count}")
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
            
            print(f"[DEBUG] Фильтрация по user_id={user_id} (user_id_str='{user_id_str}', username='{username}')")

            try:
                # КРИТИЧЕСКИ ВАЖНО: используем INNER JOIN с условиями фильтрации в самом JOIN
                # Это гарантирует, что мы НЕ получим персонажей без сообщений
                # Условия фильтрации по user_id должны быть в JOIN, а не в WHERE
                session_result = await self.db.execute(
                    select(
                        CharacterDB.name,
                        func.max(ChatMessageDB.timestamp).label("last_message_at"),
                        func.count(func.distinct(ChatMessageDB.id)).label("message_count"),
                    )
                    .select_from(CharacterDB)
                    .join(ChatSession,
                          and_(
                              ChatSession.character_id == CharacterDB.id,
                              or_(*conditions)  # Фильтр по user_id в JOIN
                          )
                    )
                    .join(ChatMessageDB,
                          and_(
                              ChatMessageDB.session_id == ChatSession.id,
                              ChatMessageDB.role == "user",  # Только сообщения от пользователя
                              ChatMessageDB.content.isnot(None),  # Содержимое не NULL
                              ChatMessageDB.content != "",  # Не пустое
                              func.trim(ChatMessageDB.content) != "",  # Не только пробелы
                              func.length(func.trim(ChatMessageDB.content)) >= 3,  # Минимум 3 символа
                              # Исключаем очень длинные сообщения (вероятно промпты для фото)
                              func.length(func.trim(ChatMessageDB.content)) < 1000  # Максимум 1000 символов
                          )
                    )
                    .group_by(CharacterDB.name)
                    .having(func.count(func.distinct(ChatMessageDB.id)) > 0)  # Хотя бы одно сообщение
                    .order_by(func.max(ChatMessageDB.timestamp).desc())
                )

                rows = session_result.fetchall()
                print(f"[DEBUG] Запрос вернул {len(rows)} строк из ChatSession для user_id={user_id}")
                print(f"[DEBUG] Условия фильтрации user_id: {len(conditions)} условий")
                if len(rows) == 0:
                    print(f"[DEBUG] Нет результатов из ChatSession. Проверяем, есть ли вообще ChatSession для user_id={user_id}")
                    # Проверяем все ChatSession для этого user_id
                    all_sessions_query = await self.db.execute(
                        select(ChatSession).where(
                            or_(
                                ChatSession.user_id == user_id_str,
                                func.trim(ChatSession.user_id) == user_id_str
                            )
                        ).limit(10)
                    )
                    all_sessions = all_sessions_query.scalars().all()
                    print(f"[DEBUG] Всего ChatSession для user_id={user_id}: {len(all_sessions)}")
                    for sess in all_sessions:
                        # Проверяем сообщения в этой сессии
                        msg_query = await self.db.execute(
                            select(func.count(ChatMessageDB.id)).where(ChatMessageDB.session_id == sess.id)
                        )
                        msg_count = msg_query.scalar() or 0
                        print(f"[DEBUG]   - session_id={sess.id}, character_id={sess.character_id}, user_id='{sess.user_id}', messages={msg_count}")
                
                for row in rows:
                    character_name = row[0]
                    last_message_at = row[1]
                    message_count = row[2]
                    
                    print(f"[DEBUG] Обрабатываем персонажа {character_name}: message_count={message_count}, last_message_at={last_message_at}")
                    
                    # КРИТИЧЕСКИ ВАЖНО: строгая проверка - пропускаем, если нет сообщений или нет времени
                    if message_count == 0:
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - message_count=0")
                        continue
                    if last_message_at is None:
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - last_message_at is None")
                        continue
                    
                    # Дополнительная проверка: убеждаемся, что время сообщения валидно
                    try:
                        from datetime import datetime
                        if isinstance(last_message_at, str):
                            last_message_at = datetime.fromisoformat(last_message_at.replace('Z', '+00:00'))
                        if not isinstance(last_message_at, datetime):
                            print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - last_message_at не является datetime: {type(last_message_at)}")
                            continue
                    except Exception as e:
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - ошибка парсинга last_message_at: {e}")
                        continue
                    
                    # Финальная проверка: убеждаемся, что у нас действительно есть сообщения
                    if message_count <= 0:
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - message_count <= 0")
                        continue
                    
                    key = character_name.lower()
                    last_image_url = await self._get_last_image_url(user_id, character_name)
                    characters[key] = {
                        "name": character_name,
                        "last_message_at": last_message_at.isoformat() if last_message_at else None,
                        "last_image_url": last_image_url,
                    }
                    print(f"[DEBUG] ДОБАВЛЕН персонаж {character_name} с историей: message_count={message_count}, last_message_at={last_message_at.isoformat() if last_message_at else None}")
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей из ChatSession: {e}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")

            # Дополнительно проверяем ChatHistory, но только если там есть реальные сообщения ОТ ПОЛЬЗОВАТЕЛЯ
            # КРИТИЧЕСКИ ВАЖНО: исключаем записи, созданные автоматически (при генерации фото, создании персонажа и т.д.)
            try:
                # Исключаем записи, которые могут быть созданы автоматически:
                # 1. session_id="photo_generation" - записи при генерации фото (старый способ)
                # 2. session_id начинается с "task_" - записи при генерации фото (новый способ через prompt_saver)
                # 3. Записи только с image_url без реального текстового сообщения
                # 4. Записи с пустым или автоматически сгенерированным содержимым
                history_result = await self.db.execute(
                    select(
                        ChatHistory.character_name,
                        func.max(ChatHistory.created_at).label("last_message_at"),
                        func.count(func.distinct(ChatHistory.id)).label("message_count"),
                    )
                    .where(ChatHistory.user_id == user_id)
                    .where(ChatHistory.message_type == "user")  # Только сообщения от пользователя
                    .where(ChatHistory.session_id != "photo_generation")  # Исключаем записи при генерации фото (старый способ)
                    .where(~ChatHistory.session_id.like("task_%"))  # КРИТИЧЕСКИ ВАЖНО: исключаем записи с session_id="task_*" (генерация фото)
                    .where(ChatHistory.message_content.isnot(None))  # Должно быть текстовое сообщение
                    .where(ChatHistory.message_content != "")  # Не пустое сообщение
                    .where(func.trim(ChatHistory.message_content) != "")  # Не только пробелы
                    .where(func.length(func.trim(ChatHistory.message_content)) >= 3)  # Минимум 3 символа (реальное сообщение)
                    .group_by(ChatHistory.character_name)
                    .having(func.count(func.distinct(ChatHistory.id)) > 0)  # Должно быть хотя бы одно сообщение
                    .order_by(func.max(ChatHistory.created_at).desc())
                )

                for row in history_result.fetchall():
                    character_name = row[0]
                    if not character_name:
                        continue
                    last_message_at = row[1]
                    message_count = row[2]
                    
                    # Строгая проверка: пропускаем, если нет сообщений или нет времени последнего сообщения
                    if message_count == 0 or last_message_at is None:
                        print(f"[DEBUG] Пропускаем персонажа из ChatHistory {character_name}: message_count={message_count}, last_message_at={last_message_at}")
                        continue
                    
                    # Дополнительная проверка: убеждаемся, что время сообщения валидно
                    try:
                        from datetime import datetime
                        if isinstance(last_message_at, str):
                            last_message_at = datetime.fromisoformat(last_message_at.replace('Z', '+00:00'))
                    except:
                        print(f"[DEBUG] Невалидное время сообщения из ChatHistory для {character_name}: {last_message_at}")
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
                        print(f"[DEBUG] Добавлен персонаж из ChatHistory {character_name} с историей: message_count={message_count}, last_message_at={last_message_at}")
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

            # ФИНАЛЬНАЯ ПРОВЕРКА: убеждаемся, что у всех персонажей есть валидное last_message_at
            final_result = []
            for char in characters.values():
                if not char.get('last_message_at'):
                    print(f"[DEBUG] ФИНАЛЬНАЯ ФИЛЬТРАЦИЯ: Пропускаем персонажа {char['name']} - нет last_message_at")
                    continue
                # Проверяем, что last_message_at - это валидная дата
                try:
                    from datetime import datetime
                    last_msg = char.get('last_message_at')
                    if isinstance(last_msg, str):
                        datetime.fromisoformat(last_msg.replace('Z', '+00:00'))
                    final_result.append(char)
                    print(f"[DEBUG] ФИНАЛЬНАЯ ФИЛЬТРАЦИЯ: Добавлен персонаж {char['name']} с last_message_at={last_msg}")
                except:
                    print(f"[DEBUG] ФИНАЛЬНАЯ ФИЛЬТРАЦИЯ: Пропускаем персонажа {char['name']} - невалидное last_message_at={char.get('last_message_at')}")
                    continue
            
            print(f"[DEBUG] Итоговый список персонажей с историей для user_id={user_id}: {len(final_result)} персонажей")
            for char in final_result:
                print(f"[DEBUG]   - {char['name']}: last_message_at={char.get('last_message_at')}")
            return final_result
        except Exception as e:
            print(f"[ERROR] Ошибка получения списка персонажей: {e}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return []
    
    async def clear_chat_history_for_free_users(self, user_id: int) -> bool:
        """
        Очищает всю историю чата для пользователей с FREE подпиской.
        Вызывается при выходе из чата или обновлении страницы.
        """
        try:
            from app.chat_bot.models.models import ChatSession, ChatMessageDB
            from sqlalchemy import delete
            
            subscription = await self.subscription_service.get_user_subscription(user_id)
            if not subscription:
                return False
            
            # Очищаем только для FREE подписки
            if subscription.subscription_type != SubscriptionType.FREE:
                return False
            
            user_id_str = str(user_id)
            
            # Находим все сессии пользователя
            sessions_query = await self.db.execute(
                select(ChatSession).where(ChatSession.user_id == user_id_str)
            )
            sessions = sessions_query.scalars().all()
            
            deleted_messages = 0
            deleted_sessions = 0
            
            for session in sessions:
                # Подсчитываем количество сообщений перед удалением
                messages_count_query = await self.db.execute(
                    select(func.count(ChatMessageDB.id)).where(ChatMessageDB.session_id == session.id)
                )
                messages_count = messages_count_query.scalar_one_or_none() or 0
                
                # Удаляем все сообщения в сессии
                await self.db.execute(
                    delete(ChatMessageDB).where(ChatMessageDB.session_id == session.id)
                )
                deleted_messages += messages_count
                
                # Удаляем саму сессию
                await self.db.execute(
                    delete(ChatSession).where(ChatSession.id == session.id)
                )
                deleted_sessions += 1
            
            # Также удаляем записи из ChatHistory
            chat_history_count_query = await self.db.execute(
                select(func.count(ChatHistory.id)).where(ChatHistory.user_id == user_id)
            )
            chat_history_count = chat_history_count_query.scalar_one_or_none() or 0
            
            await self.db.execute(
                delete(ChatHistory).where(ChatHistory.user_id == user_id)
            )
            
            await self.db.commit()
            
            print(f"[DEBUG] Очищена история для FREE пользователя {user_id}: {deleted_messages} сообщений, {deleted_sessions} сессий, {chat_history_count} записей ChatHistory")
            return True
            
        except Exception as e:
            await self.db.rollback()
            print(f"[ERROR] Ошибка очистки истории для FREE пользователя {user_id}: {e}")
            return False
    
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
