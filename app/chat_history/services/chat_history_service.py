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
        if not subscription or not subscription.is_active:
            return False
        
        # КРИТИЧЕСКИ ВАЖНО: История доступна для STANDARD и PREMIUM подписок одинаково
        # PREMIUM должен работать так же, как STANDARD
        can_save = subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
        return can_save
    
    async def save_message(self, user_id: int, character_name: str, session_id: str, 
                          message_type: str, message_content: str, 
                          image_url: Optional[str] = None, image_filename: Optional[str] = None,
                          generation_time: Optional[int] = None) -> bool:
        """Сохраняет сообщение в историю чата."""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Проверяем права на сохранение истории
            if not await self.can_save_history(user_id):
                logger.warning(f"[HISTORY] Пользователь {user_id} не имеет прав на сохранение истории")
                return False
            
            from sqlalchemy import text
            # Пытаемся сохранить через raw SQL, так как поле generation_time может отсутствовать в БД
            try:
                # 1. Пытаемся вставить со всеми полями, включая generation_time
                query = text("""
                    INSERT INTO chat_history (user_id, character_name, session_id, message_type, message_content, image_url, image_filename, generation_time, created_at)
                    VALUES (:user_id, :character_name, :session_id, :message_type, :message_content, :image_url, :image_filename, :generation_time, NOW())
                """)
                await self.db.execute(query, {
                    "user_id": user_id,
                    "character_name": character_name,
                    "session_id": session_id,
                    "message_type": message_type,
                    "message_content": message_content,
                    "image_url": image_url,
                    "image_filename": image_filename,
                    "generation_time": generation_time
                })
            except Exception as e:
                # Если ошибка (вероятно, нет колонки generation_time), пробуем без неё
                logger.warning(f"[HISTORY] Ошибка вставки с generation_time (возможно, нет колонки): {e}")
                await self.db.rollback()
                
                query = text("""
                    INSERT INTO chat_history (user_id, character_name, session_id, message_type, message_content, image_url, image_filename, created_at)
                    VALUES (:user_id, :character_name, :session_id, :message_type, :message_content, :image_url, :image_filename, NOW())
                """)
                await self.db.execute(query, {
                    "user_id": user_id,
                    "character_name": character_name,
                    "session_id": session_id,
                    "message_type": message_type,
                    "message_content": message_content,
                    "image_url": image_url,
                    "image_filename": image_filename
                })
            
            await self.db.commit()
            
            # Инвалидируем кэш истории чата
            cache_key = key_chat_history(user_id, character_name, session_id)
            await cache_delete(cache_key)
            
            # Инвалидируем кэш списка персонажей
            from app.utils.redis_cache import key_user_characters
            user_characters_cache_key = key_user_characters(user_id)
            await cache_delete(user_characters_cache_key)
            
            return True
            
        except Exception as e:
            logger.error(f"[HISTORY] Ошибка сохранения сообщения: {e}")
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
            
            from sqlalchemy.orm import load_only
            result = await self.db.execute(
                select(ChatHistory)
                .options(load_only(
                    ChatHistory.id,
                    ChatHistory.user_id,
                    ChatHistory.character_name,
                    ChatHistory.session_id,
                    ChatHistory.message_type,
                    ChatHistory.message_content,
                    ChatHistory.image_url,
                    ChatHistory.image_filename,
                    ChatHistory.created_at
                ))
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

    async def get_user_characters_with_history(self, user_id: int, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Получает список персонажей, с которыми у пользователя есть НЕЗАКОНЧЕННЫЙ диалог.
        Показывает только тех персонажей, с которыми пользователь реально общался (есть сообщения).
        Для STANDARD и PREMIUM подписок возвращает персонажей с незаконченными диалогами.
        """
        try:
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            from app.models.user import Users
            from app.utils.redis_cache import cache_get, cache_set, cache_delete, key_user_characters, TTL_USER_CHARACTERS

            # Проверяем кэш (если не запрошено принудительное обновление)
            cache_key = key_user_characters(user_id)
            cached_characters = None
            # КРИТИЧЕСКИ ВАЖНО: Всегда очищаем кэш при force_refresh, чтобы получить актуальные данные
            if force_refresh:
                # Очищаем кэш при принудительном обновлении
                await cache_delete(cache_key)
                print(f"[DEBUG] Кэш очищен для user_id={user_id} (force_refresh=True)")
            else:
                cached_characters = await cache_get(cache_key)
            if cached_characters is not None:
                print(f"[DEBUG] Используем кэшированные данные для user_id={user_id}: {len(cached_characters)} персонажей")
                return cached_characters

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
                # КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: OUTER JOIN вместо INNER JOIN
                # Мы берем сессию, даже если сообщений в ней нет (NULL в ChatMessageDB)
                # Это позволяет находить персонажей с фото, но без текстовых сообщений
                session_result = await self.db.execute(
                    select(
                        CharacterDB.name,
                        CharacterDB.id,
                        func.max(ChatMessageDB.timestamp).label("last_message_at"),
                        func.count(ChatMessageDB.id).label("message_count"),
                        func.max(ChatSession.started_at).label("session_created_at")
                    )
                    .select_from(CharacterDB)
                    .join(ChatSession,
                          and_(
                              ChatSession.character_id == CharacterDB.id,
                              or_(*conditions)  # Фильтр по user_id в JOIN
                          )
                    )
                    # Используем outerjoin, чтобы не терять сессии без текстовых сообщений
                    # КРИТИЧЕСКИ ВАЖНО: Фильтруем сообщения по user_id через JOIN с ChatSession
                    .outerjoin(ChatMessageDB, and_(
                        ChatMessageDB.session_id == ChatSession.id,
                        # Дополнительная проверка: сообщения должны быть из сессий этого пользователя
                        # (уже отфильтровано в JOIN ChatSession выше через conditions)
                    ))
                    .group_by(CharacterDB.name, CharacterDB.id)
                    # КРИТИЧЕСКИ ВАЖНО: Показываем только персонажей с реальными сообщениями ИЛИ фото
                    # Используем COALESCE для сортировки: сначала по timestamp сообщений, потом по created_at сессии
                    .order_by(func.coalesce(func.max(ChatMessageDB.timestamp), func.max(ChatSession.started_at)).desc())
                )

                rows = session_result.fetchall()
                print(f"[DEBUG] Запрос вернул {len(rows)} строк из ChatSession для user_id={user_id}")
                print(f"[DEBUG] Условия фильтрации user_id: {len(conditions)} условий")
                print(f"[DEBUG] Условия: {[str(c) for c in conditions[:3]]}...")  # Показываем первые 3 условия
                
                # ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА: проверяем, есть ли вообще сообщения для этого пользователя
                try:
                    from app.chat_bot.models.models import ChatMessageDB, ChatSession
                    total_messages_query = await self.db.execute(
                        select(func.count(ChatMessageDB.id))
                        .select_from(ChatMessageDB)
                        .join(ChatSession, ChatMessageDB.session_id == ChatSession.id)
                        .where(or_(*conditions))
                    )
                    total_messages = total_messages_query.scalar() or 0
                    print(f"[DEBUG] Всего сообщений для user_id={user_id} (без фильтров по content): {total_messages}")
                    
                    # Проверяем сообщения с "Генерация изображения"
                    image_gen_query = await self.db.execute(
                        select(func.count(ChatMessageDB.id))
                        .select_from(ChatMessageDB)
                        .join(ChatSession, ChatMessageDB.session_id == ChatSession.id)
                        .where(or_(*conditions))
                        .where(ChatMessageDB.role == "user")
                        .where(ChatMessageDB.content == "Генерация изображения")
                    )
                    image_gen_count = image_gen_query.scalar() or 0
                    print(f"[DEBUG] Сообщений с текстом 'Генерация изображения': {image_gen_count}")
                except Exception as diag_err:
                    print(f"[DEBUG] Ошибка диагностики: {diag_err}")
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
                    character_id = row[1]
                    last_message_at = row[2]
                    message_count = row[3]
                    session_created_at = row[4] if len(row) > 4 else None
                    
                    print(f"[DEBUG] Обрабатываем персонажа {character_name} (id={character_id}): message_count={message_count}, last_message_at={last_message_at}")
                    
                    # Ищем фото для этого персонажа
                    last_image_url = await self._get_last_image_url(user_id, character_name)
                    
                    # ЛОГИКА ФИЛЬТРАЦИИ:
                    # Показываем персонажа, если:
                    # 1. Есть текстовые сообщения (count > 0)
                    # 2. ИЛИ Есть фото (last_image_url is not None)
                    if message_count == 0 and not last_image_url:
                        # Пустая сессия без фото и текста - пропускаем
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - нет сообщений и нет фото")
                        continue
                    
                    # Определяем время для сортировки
                    # Используем last_message_at если есть, иначе session_created_at, иначе текущее время
                    display_time = last_message_at if last_message_at else session_created_at
                    if display_time is None:
                        # Если нет времени вообще, но есть фото или сообщения - все равно добавляем
                        if last_image_url or message_count > 0:
                            from datetime import datetime, timezone
                            display_time = datetime.now(timezone.utc)
                        else:
                            print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - нет времени, нет фото и нет сообщений")
                        continue
                    
                    # ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: проверяем реальные сообщения для этого персонажа
                    # Это поможет понять, почему персонаж не проходит фильтры
                    try:
                        from app.chat_bot.models.models import ChatMessageDB, ChatSession, CharacterDB
                        check_query = await self.db.execute(
                            select(ChatMessageDB.content, ChatMessageDB.role, ChatMessageDB.timestamp)
                            .select_from(ChatMessageDB)
                            .join(ChatSession, ChatMessageDB.session_id == ChatSession.id)
                            .join(CharacterDB, ChatSession.character_id == CharacterDB.id)
                            .where(CharacterDB.name == character_name)
                            .where(or_(*conditions))
                            .where(ChatMessageDB.role == "user")
                            .order_by(ChatMessageDB.timestamp.desc())
                            .limit(5)
                        )
                        sample_messages = check_query.fetchall()
                        print(f"[DEBUG] Примеры сообщений для {character_name}: {[(msg[0][:50] if msg[0] else 'empty', msg[1], msg[2]) for msg in sample_messages]}")
                    except Exception as check_err:
                        print(f"[DEBUG] Ошибка проверки сообщений для {character_name}: {check_err}")
                    
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
                    
                    # КРИТИЧЕСКИ ВАЖНО: Дополнительная проверка - убеждаемся, что сообщения действительно от этого пользователя
                    # Проверяем реальные сообщения в сессиях этого пользователя
                    try:
                        from app.chat_bot.models.models import ChatMessageDB, ChatSession, CharacterDB
                        real_message_check = await self.db.execute(
                            select(func.count(ChatMessageDB.id))
                            .select_from(ChatMessageDB)
                            .join(ChatSession, ChatMessageDB.session_id == ChatSession.id)
                            .join(CharacterDB, ChatSession.character_id == CharacterDB.id)
                            .where(CharacterDB.name == character_name)
                            .where(or_(*conditions))  # Фильтр по user_id
                        )
                        real_message_count = real_message_check.scalar() or 0
                        print(f"[DEBUG] Проверка реальных сообщений для {character_name}: real_message_count={real_message_count}, message_count={message_count}")
                    except Exception as check_err:
                        print(f"[DEBUG] Ошибка проверки реальных сообщений для {character_name}: {check_err}")
                        real_message_count = message_count
                    
                    # Финальная проверка: убеждаемся, что у нас действительно есть сообщения ИЛИ есть фото
                    # КРИТИЧЕСКИ ВАЖНО: Проверяем реальные сообщения от этого пользователя
                    if real_message_count <= 0 and not last_image_url:
                        print(f"[DEBUG] ПРОПУСК: персонаж {character_name} - нет реальных сообщений от user_id={user_id} и нет фото (real_message_count={real_message_count}, message_count={message_count})")
                        continue
                    
                    # Используем реальное количество сообщений вместо message_count из группировки
                    if real_message_count > 0:
                        message_count = real_message_count
                    
                    key = character_name.lower()
                    characters[key] = {
                        "id": character_id,
                        "name": character_name,
                        "last_message_at": display_time.isoformat() if hasattr(display_time, 'isoformat') else str(display_time),
                        "last_image_url": last_image_url,
                    }
                    print(f"[DEBUG] ДОБАВЛЕН персонаж {character_name} (id={character_id}) с историей: message_count={message_count}, last_message_at={display_time.isoformat() if hasattr(display_time, 'isoformat') else str(display_time)}, has_image={bool(last_image_url)}")
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей из ChatSession: {e}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")

            # Дополнительно проверяем ChatHistory, включая записи с фото
            # УПРОЩЕННЫЙ ЗАПРОС: находим ВСЕХ персонажей с ЛЮБЫМИ сообщениями
            # КРИТИЧЕСКИ ВАЖНО: Показываем только персонажей, которые существуют в таблице characters
            try:
                history_result = await self.db.execute(
                    select(
                        ChatHistory.character_name,
                        CharacterDB.id,
                        func.max(ChatHistory.created_at).label("last_message_at"),
                        func.count(func.distinct(ChatHistory.id)).label("message_count"),
                    )
                    .select_from(ChatHistory)
                    .join(CharacterDB, ChatHistory.character_name.ilike(CharacterDB.name))  # JOIN только с существующими персонажами
                    .where(ChatHistory.user_id == user_id)
                    .group_by(ChatHistory.character_name, CharacterDB.id)
                    .having(func.count(func.distinct(ChatHistory.id)) > 0)
                    .order_by(func.max(ChatHistory.created_at).desc())
                )

                history_rows = history_result.fetchall()
                print(f"[DEBUG] Найдено {len(history_rows)} персонажей в ChatHistory для user_id={user_id}")
                
                # Дополнительная диагностика: проверяем записи с image_url
                test_query = await self.db.execute(
                    select(
                        ChatHistory.character_name,
                        ChatHistory.message_type,
                        ChatHistory.image_url,
                        ChatHistory.created_at
                    )
                    .where(ChatHistory.user_id == user_id)
                    .where(ChatHistory.image_url.isnot(None))
                    .order_by(ChatHistory.created_at.desc())
                    .limit(10)
                )
                test_rows = test_query.fetchall()
                print(f"[DEBUG] Записей с image_url для user_id={user_id}: {len(test_rows)}")
                for test_row in test_rows[:5]:
                    print(f"[DEBUG]   - character={test_row[0]}, type={test_row[1]}, has_url={bool(test_row[2])}, created={test_row[3]}")

                for row in history_rows:
                    character_name = row[0]
                    character_id = row[1]
                    if not character_name:
                        continue
                    last_message_at = row[2]
                    message_count = row[3]
                    
                    # JOIN уже фильтрует только существующих персонажей, дополнительная проверка не нужна
                    key = character_name.lower()
                    
                    # Пропускаем только если персонаж уже добавлен из ChatSession
                    if key in characters:
                        continue
                    
                    # Ищем фото для этого персонажа
                    last_image_url = await self._get_last_image_url(user_id, character_name)
                    
                    # Показываем персонажа если есть сообщения ИЛИ есть фото
                    if message_count == 0 and not last_image_url:
                        continue
                    
                    # Если last_message_at None, но есть сообщения или фото - используем текущее время
                    if last_message_at is None:
                        from datetime import datetime, timezone
                        last_message_at = datetime.now(timezone.utc)
                    
                    # Дополнительная проверка: убеждаемся, что время сообщения валидно
                    try:
                        from datetime import datetime, timezone
                        if isinstance(last_message_at, str):
                            last_message_at = datetime.fromisoformat(last_message_at.replace('Z', '+00:00'))
                        elif last_message_at is None:
                            # Если все еще None, используем текущее время
                            last_message_at = datetime.now(timezone.utc)
                    except Exception as time_err:
                        print(f"[DEBUG] Ошибка обработки времени для {character_name}: {time_err}, используем текущее время")
                        from datetime import datetime, timezone
                        last_message_at = datetime.now(timezone.utc)
                    
                        characters[key] = {
                            "id": character_id,
                            "name": character_name,
                            "last_message_at": last_message_at.isoformat() if last_message_at else None,
                            "last_image_url": last_image_url,
                        }
                    print(f"[DEBUG] Добавлен персонаж из ChatHistory {character_name} (id={character_id}) с историей: message_count={message_count}, last_message_at={last_message_at}, has_image={bool(last_image_url)}")
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей из ChatHistory: {e}")

            # КРИТИЧЕСКИ ВАЖНО: Добавляем персонажей из UserGallery
            # Это нужно для случаев, когда фото было сгенерировано, но ChatSession не был создан
            try:
                from app.models.user_gallery import UserGallery
                
                # Получаем уникальных персонажей из UserGallery для этого пользователя
                # КРИТИЧЕСКИ ВАЖНО: JOIN с CharacterDB, чтобы показывать только существующих персонажей
                gallery_result = await self.db.execute(
                    select(
                        UserGallery.character_name,
                        CharacterDB.id,
                        func.max(UserGallery.created_at).label("last_image_at")
                    )
                    .select_from(UserGallery)
                    .join(CharacterDB, UserGallery.character_name.ilike(CharacterDB.name))  # JOIN только с существующими персонажами
                    .where(UserGallery.user_id == user_id)
                    .where(UserGallery.character_name.isnot(None))
                    .where(UserGallery.character_name != "")
                    .group_by(UserGallery.character_name, CharacterDB.id)
                    .order_by(func.max(UserGallery.created_at).desc())
                )
                
                gallery_rows = gallery_result.fetchall()
                print(f"[DEBUG] Найдено {len(gallery_rows)} персонажей в UserGallery для user_id={user_id}")
                
                for row in gallery_rows:
                    character_name = row[0]
                    character_id = row[1]
                    last_image_at = row[2]
                    
                    if not character_name or not last_image_at:
                        continue
                    
                    # JOIN уже фильтрует только существующих персонажей, дополнительная проверка не нужна
                    key = character_name.lower()
                    
                    # Добавляем только если персонажа еще нет в списке
                    if key not in characters:
                        # Получаем последнее фото для этого персонажа
                        last_image_url = await self._get_last_image_url(user_id, character_name)
                        characters[key] = {
                            "id": character_id,
                            "name": character_name,
                            "last_message_at": last_image_at.isoformat() if hasattr(last_image_at, 'isoformat') else str(last_image_at),
                            "last_image_url": last_image_url,
                        }
                        print(f"[DEBUG] Добавлен персонаж из UserGallery {character_name} (id={character_id}): last_image_at={last_image_at}")
                    else:
                        # Если персонаж уже есть, обновляем last_image_at если фото новее
                        existing_time = characters[key].get("last_message_at")
                        if existing_time and last_image_at:
                            try:
                                from datetime import datetime
                                if isinstance(existing_time, str):
                                    existing_dt = datetime.fromisoformat(existing_time.replace('Z', '+00:00'))
                                else:
                                    existing_dt = existing_time
                                
                                image_dt = last_image_at if isinstance(last_image_at, datetime) else datetime.fromisoformat(str(last_image_at).replace('Z', '+00:00'))
                                
                                if image_dt > existing_dt:
                                    characters[key]["last_message_at"] = image_dt.isoformat()
                                    # Обновляем также last_image_url
                                    characters[key]["last_image_url"] = await self._get_last_image_url(user_id, character_name)
                                    print(f"[DEBUG] Обновлено время для персонажа {character_name} из UserGallery")
                            except Exception as time_err:
                                print(f"[DEBUG] Ошибка сравнения времени для {character_name}: {time_err}")
            except Exception as gallery_err:
                print(f"[WARNING] Ошибка получения персонажей из UserGallery: {gallery_err}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")

            # ДОПОЛНИТЕЛЬНО: проверяем сообщения с картинками от ассистента
            # Это нужно для случаев, когда в истории только картинки без текстовых сообщений от пользователя
            try:
                # Проверяем ChatMessageDB на наличие сообщений ассистента с картинками
                # Импортируем модели (они уже могут быть импортированы выше, но для безопасности импортируем снова)
                from app.chat_bot.models.models import ChatMessageDB, CharacterDB, ChatSession
                
                # Сначала находим все сессии пользователя
                user_sessions_query = await self.db.execute(
                    select(ChatSession.id, ChatSession.character_id)
                    .where(or_(*conditions))
                )
                user_sessions = user_sessions_query.fetchall()
                session_ids = [sess[0] for sess in user_sessions]
                
                if session_ids:
                    # Теперь ищем сообщения ассистента с картинками в этих сессиях
                    image_result = await self.db.execute(
                        select(
                            CharacterDB.name,
                            CharacterDB.id,
                            func.max(ChatMessageDB.timestamp).label("last_message_at"),
                        )
                        .select_from(ChatMessageDB)
                        .join(ChatSession, ChatMessageDB.session_id == ChatSession.id)
                        .join(CharacterDB, ChatSession.character_id == CharacterDB.id)
                        .where(ChatMessageDB.session_id.in_(session_ids))
                        .where(ChatMessageDB.role == "assistant")  # Сообщения от ассистента
                        .where(ChatMessageDB.content.isnot(None))
                        .where(
                            or_(
                                ChatMessageDB.content.like("%[image:%"),  # Старый формат [image:url]
                                ChatMessageDB.content.like("%[image]%")   # Новый формат [image]
                            )
                        )  # Проверяем наличие картинки
                        .group_by(CharacterDB.name, CharacterDB.id)
                        .having(func.count(func.distinct(ChatMessageDB.id)) > 0)
                        .order_by(func.max(ChatMessageDB.timestamp).desc())
                    )
                else:
                    image_result = None
                
                if image_result:
                    for row in image_result.fetchall():
                        character_name = row[0]
                        character_id = row[1]
                        last_message_at = row[2]
                        
                        if not character_name or not last_message_at:
                            continue
                        
                        # Проверяем, что время валидно
                        try:
                            from datetime import datetime
                            if isinstance(last_message_at, str):
                                last_message_at = datetime.fromisoformat(last_message_at.replace('Z', '+00:00'))
                            if not isinstance(last_message_at, datetime):
                                continue
                        except Exception:
                            continue
                        
                        key = character_name.lower()
                        
                        # Добавляем персонажа, если его еще нет в списке
                        if key not in characters:
                            last_image_url = await self._get_last_image_url(user_id, character_name)
                            characters[key] = {
                                "id": character_id,
                                "name": character_name,
                                "last_message_at": last_message_at.isoformat() if last_message_at else None,
                                "last_image_url": last_image_url,
                            }
                            print(f"[DEBUG] ДОБАВЛЕН персонаж {character_name} (id={character_id}) с историей только из картинок: last_message_at={last_message_at.isoformat() if last_message_at else None}")
                        elif last_message_at:
                            # Обновляем время, если оно новее
                            existing_time = characters[key].get("last_message_at")
                            if existing_time:
                                try:
                                    from datetime import datetime
                                    existing_dt = datetime.fromisoformat(existing_time.replace('Z', '+00:00'))
                                    if last_message_at > existing_dt:
                                        characters[key]["last_message_at"] = last_message_at.isoformat()
                                        print(f"[DEBUG] Обновлено время для персонажа {character_name} с картинками: {last_message_at.isoformat()}")
                                except:
                                    pass
                            else:
                                # Если нет времени, но есть картинка, добавляем время
                                characters[key]["last_message_at"] = last_message_at.isoformat()
                                print(f"[DEBUG] Добавлено время для персонажа {character_name} с картинками: {last_message_at.isoformat()}")
                
                # Также проверяем ChatHistory на наличие сообщений ассистента с image_url
                # КРИТИЧЕСКИ ВАЖНО: Используем JOIN с CharacterDB, чтобы показывать только существующих персонажей
                history_image_result = await self.db.execute(
                    select(
                        ChatHistory.character_name,
                        CharacterDB.id,
                        func.max(ChatHistory.created_at).label("last_message_at"),
                    )
                    .select_from(ChatHistory)
                    .join(CharacterDB, ChatHistory.character_name.ilike(CharacterDB.name))  # JOIN только с существующими персонажами
                    .where(ChatHistory.user_id == user_id)
                    .where(ChatHistory.message_type == "assistant")  # Сообщения от ассистента
                    .where(ChatHistory.image_url.isnot(None))  # Есть картинка
                    .where(ChatHistory.session_id != "photo_generation")  # Исключаем автоматические записи
                    .where(~ChatHistory.session_id.like("task_%"))  # Исключаем записи с task_*
                    .group_by(ChatHistory.character_name, CharacterDB.id)
                    .having(func.count(func.distinct(ChatHistory.id)) > 0)
                    .order_by(func.max(ChatHistory.created_at).desc())
                )
                
                for row in history_image_result.fetchall():
                    character_name = row[0]
                    character_id = row[1]
                    last_message_at = row[2]
                    
                    if not character_name or not last_message_at:
                        continue
                    
                    # Проверяем, что время валидно
                    try:
                        from datetime import datetime
                        if isinstance(last_message_at, str):
                            last_message_at = datetime.fromisoformat(last_message_at.replace('Z', '+00:00'))
                    except Exception:
                        continue
                    
                    key = character_name.lower()
                    
                    # Добавляем персонажа, если его еще нет в списке
                    if key not in characters:
                        last_image_url = await self._get_last_image_url(user_id, character_name)
                        characters[key] = {
                            "id": character_id,
                            "name": character_name,
                            "last_message_at": last_message_at.isoformat() if last_message_at else None,
                            "last_image_url": last_image_url,
                        }
                        print(f"[DEBUG] ДОБАВЛЕН персонаж {character_name} (id={character_id}) из ChatHistory с историей только из картинок: last_message_at={last_message_at.isoformat() if last_message_at else None}")
                    elif last_message_at:
                        # Обновляем время, если оно новее
                        existing_time = characters[key].get("last_message_at")
                        if existing_time:
                            try:
                                from datetime import datetime
                                existing_dt = datetime.fromisoformat(existing_time.replace('Z', '+00:00'))
                                if last_message_at > existing_dt:
                                    characters[key]["last_message_at"] = last_message_at.isoformat()
                                    print(f"[DEBUG] Обновлено время для персонажа {character_name} из ChatHistory с картинками: {last_message_at.isoformat()}")
                            except:
                                pass
                        else:
                            # Если нет времени, но есть картинка, добавляем время
                            characters[key]["last_message_at"] = last_message_at.isoformat()
                            print(f"[DEBUG] Добавлено время для персонажа {character_name} из ChatHistory с картинками: {last_message_at.isoformat()}")
            except Exception as e:
                print(f"[WARNING] Ошибка получения персонажей с картинками: {e}")
                import traceback
                print(f"[WARNING] Traceback: {traceback.format_exc()}")

            # ФИНАЛЬНАЯ ПРОВЕРКА: убеждаемся, что у всех персонажей есть валидное last_message_at или last_image_url
            final_result = []
            for char in characters.values():
                # Если есть картинка, но нет времени - все равно добавляем (время будет установлено из картинки)
                has_image = char.get('last_image_url')
                has_message_time = char.get('last_message_at')
                
                # УПРОЩЕННАЯ ЛОГИКА: добавляем персонажа если есть ЛЮБОЕ из:
                # - last_message_at (есть сообщения)
                # - last_image_url (есть фото)
                # Это гарантирует, что персонажи с незаконченными диалогами будут показаны
                if not has_message_time and not has_image:
                    continue
                
                # Если есть картинка, но нет времени - пытаемся получить время из картинки
                if has_image and not has_message_time:
                    # Пытаемся найти время последней картинки
                    try:
                        # Ищем в ChatHistory
                        img_time_query = await self.db.execute(
                            select(func.max(ChatHistory.created_at))
                            .where(ChatHistory.user_id == user_id)
                            .where(ChatHistory.character_name == char['name'])
                            .where(ChatHistory.image_url.isnot(None))
                        )
                        img_time = img_time_query.scalar()
                        if img_time:
                            char['last_message_at'] = img_time.isoformat() if hasattr(img_time, 'isoformat') else str(img_time)
                    except Exception as e:
                        # Все равно добавляем, если есть картинка
                        if has_image:
                            char['last_message_at'] = None  # Устанавливаем None, но все равно добавляем
                
                # Проверяем, что last_message_at - это валидная дата (если есть)
                if has_message_time:
                    try:
                        from datetime import datetime
                        last_msg = char.get('last_message_at')
                        if isinstance(last_msg, str):
                            datetime.fromisoformat(last_msg.replace('Z', '+00:00'))
                    except:
                        # Если есть картинка, все равно добавляем
                        if not has_image:
                            continue
                
                final_result.append(char)
            
            # Финальная сортировка по времени
            final_result = list(characters.values())
            final_result.sort(key=lambda x: x.get('last_message_at') or "", reverse=True)
            
            # Сохраняем в кэш
            await cache_set(cache_key, final_result, ttl_seconds=TTL_USER_CHARACTERS)
            
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
    
    async def clear_all_chat_history(self, user_id: int) -> bool:
        """Очищает всю историю чата для пользователя."""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            logger.info(f"[HISTORY CLEAR ALL] Начинаем очистку всей истории для user_id={user_id}")
            
            # Удаляем из ChatHistory (старая система)
            chat_history_delete_result = await self.db.execute(
                delete(ChatHistory).where(ChatHistory.user_id == user_id)
            )
            deleted_chat_history_count = chat_history_delete_result.rowcount
            
            # Удаляем из ChatSession и ChatMessageDB (новая система)
            user_id_str = str(user_id)
            
            # Получаем все сессии пользователя
            sessions_result = await self.db.execute(
                select(ChatSession).where(
                    or_(
                        ChatSession.user_id == user_id_str,
                        func.trim(ChatSession.user_id) == user_id_str
                    )
                )
            )
            sessions = sessions_result.scalars().all()
            session_ids = [s.id for s in sessions]
            
            deleted_messages = 0
            deleted_sessions = 0
            
            if session_ids:
                # Удаляем все сообщения из сессий
                messages_delete_result = await self.db.execute(
                    delete(ChatMessageDB).where(ChatMessageDB.session_id.in_(session_ids))
                )
                deleted_messages = messages_delete_result.rowcount
                
                # Удаляем все сессии
                sessions_delete_result = await self.db.execute(
                    delete(ChatSession).where(ChatSession.id.in_(session_ids))
                )
                deleted_sessions = sessions_delete_result.rowcount
            
            await self.db.commit()
            
            # Очищаем кэш
            from app.utils.redis_cache import key_user_characters, cache_delete
            cache_key = key_user_characters(user_id)
            await cache_delete(cache_key)
            
            logger.info(f"[HISTORY CLEAR ALL] Очищена вся история для user_id={user_id}: {deleted_chat_history_count} записей ChatHistory, {deleted_messages} сообщений, {deleted_sessions} сессий")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"[HISTORY CLEAR ALL] Ошибка очистки всей истории для user_id={user_id}: {e}")
            return False
    
    async def clear_chat_history(self, user_id: int, character_name: str, session_id: str) -> bool:
        """Очищает историю чата для конкретного персонажа и сессии."""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Проверяем права на очистку истории
            if not await self.can_save_history(user_id):
                return False
            
            from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB
            logger.info(f"[HISTORY CLEAR] Начинаем очистку истории для user_id={user_id}, character={character_name}")
            
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
            
            # КРИТИЧЕСКИ ВАЖНО: Удаляем фото из UserGallery для этого персонажа
            # Это нужно, чтобы персонаж исчез со страницы /history после очистки истории
            # ЗАЩИТА: Проверяем, что character_name не пустой и не None, чтобы не удалить все фото
            if character_name and character_name.strip():
                try:
                    from app.models.user_gallery import UserGallery
                    gallery_delete_result = await self.db.execute(
                        delete(UserGallery)
                        .where(
                            UserGallery.user_id == user_id,
                            UserGallery.character_name == character_name
                        )
                    )
                    deleted_gallery_count = gallery_delete_result.rowcount
                    if deleted_gallery_count > 0:
                        logger.info(f"[HISTORY] Удалено {deleted_gallery_count} фото из UserGallery для персонажа {character_name}")
                except Exception as gallery_error:
                    logger.warning(f"[HISTORY] Ошибка удаления фото из UserGallery: {gallery_error}")
            else:
                logger.warning(f"[HISTORY] ПРОПУСК удаления фото: character_name пустой или None (user_id={user_id})")
            
            # КРИТИЧЕСКИ ВАЖНО: Удаляем записи из ImageGenerationHistory для этого персонажа
            # Это нужно, чтобы персонаж исчез со страницы /history после очистки истории
            # ЗАЩИТА: Проверяем, что character_name не пустой и не None, чтобы не удалить все записи
            if character_name and character_name.strip():
                try:
                    from app.models.image_generation_history import ImageGenerationHistory
                    image_history_delete_result = await self.db.execute(
                        delete(ImageGenerationHistory)
                        .where(
                            ImageGenerationHistory.user_id == user_id,
                            ImageGenerationHistory.character_name == character_name
                        )
                    )
                    deleted_image_history_count = image_history_delete_result.rowcount
                    if deleted_image_history_count > 0:
                        logger.info(f"[HISTORY] Удалено {deleted_image_history_count} записей из ImageGenerationHistory для персонажа {character_name}")
                except Exception as image_history_error:
                    logger.warning(f"[HISTORY] Ошибка удаления записей из ImageGenerationHistory: {image_history_error}")
            else:
                logger.warning(f"[HISTORY] ПРОПУСК удаления записей ImageGenerationHistory: character_name пустой или None (user_id={user_id})")
            
            await self.db.commit()
            
            # Инвалидируем кэш списка персонажей, чтобы удаленный персонаж исчез со страницы /history
            from app.utils.redis_cache import key_user_characters
            user_characters_cache_key = key_user_characters(user_id)
            await cache_delete(user_characters_cache_key)
            logger.info(f"[HISTORY CLEAR] ✓ Кэш списка персонажей инвалидирован после очистки истории для user_id={user_id}, character={character_name}")
            
            # Дополнительно инвалидируем кэш истории для этого персонажа (если есть)
            from app.utils.redis_cache import key_chat_history
            # Инвалидируем кэш для всех возможных session_id (так как мы удалили все сессии)
            # Для простоты просто инвалидируем основной кэш списка персонажей
            logger.info(f"[HISTORY CLEAR] ✓ История полностью очищена для user_id={user_id}, character={character_name}")
            
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
            from sqlalchemy.orm import load_only
            result = await self.db.execute(
                select(ChatHistory)
                .options(load_only(
                    ChatHistory.id,
                    ChatHistory.user_id,
                    ChatHistory.character_name,
                    ChatHistory.session_id,
                    ChatHistory.message_type,
                    ChatHistory.message_content,
                    ChatHistory.image_url,
                    ChatHistory.image_filename,
                    ChatHistory.created_at
                ))
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
