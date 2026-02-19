"""
Сервис для активации подписок с исправленной логикой.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, DefaultDict, Set

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.models.user import Users
from app.schemas.subscription import SubscriptionStatsResponse, SubscriptionInfoResponse
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_subscription, key_subscription_stats,
    TTL_SUBSCRIPTION, TTL_SUBSCRIPTION_STATS
)


def _normalize_subscription_type(subscription_type: Any) -> SubscriptionType:
    """Приводит произвольное значение к SubscriptionType."""
    if isinstance(subscription_type, SubscriptionType):
        return subscription_type

    if isinstance(subscription_type, str):
        try:
            return SubscriptionType(subscription_type.lower())
        except ValueError as exc:
            raise ValueError(f"Неподдерживаемый тип подписки: {subscription_type}") from exc

    raise ValueError(f"Некорректное значение типа подписки: {subscription_type}")


ProfileUpdatePayload = Dict[str, Any]
ProfileUpdateQueue = asyncio.Queue
_subscribers_lock = asyncio.Lock()
_profile_subscribers: DefaultDict[int, Set[ProfileUpdateQueue]] = defaultdict(set)
logger = logging.getLogger(__name__)


def _serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    """Преобразует datetime в ISO-строку."""
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)


async def register_profile_listener(user_id: int) -> ProfileUpdateQueue:
    """Регистрирует очередь обновлений профиля для пользователя."""
    queue: ProfileUpdateQueue = asyncio.Queue()
    async with _subscribers_lock:
        _profile_subscribers[user_id].add(queue)
    return queue


async def unregister_profile_listener(user_id: int, queue: ProfileUpdateQueue) -> None:
    """Отписывает очередь обновлений профиля для пользователя."""
    async with _subscribers_lock:
        queues = _profile_subscribers.get(user_id)
        if not queues:
            return
        queues.discard(queue)
        if not queues:
            _profile_subscribers.pop(user_id, None)


async def _publish_profile_update(user_id: int, payload: ProfileUpdatePayload) -> None:
    """Рассылает обновление профиля всем подписчикам пользователя."""
    async with _subscribers_lock:
        queues = list(_profile_subscribers.get(user_id, set()))
    if not queues:
        return
    for queue in queues:
        try:
            await queue.put(payload)
        except Exception as exc:
            logger.warning("Не удалось отправить обновление профиля: %s", exc)


async def collect_profile_snapshot(user_id: int, db: AsyncSession) -> ProfileUpdatePayload:
    """Формирует актуальные данные профиля пользователя."""
    # Загружаем пользователя без eager loading подписки, чтобы избежать проблем с множественными подписками
    stmt = select(Users).where(Users.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user is None:
        raise ValueError(f"Пользователь {user_id} не найден")

    # Получаем подписку через сервис, который правильно обрабатывает множественные подписки
    subscription_info: Optional[Dict[str, Any]] = None
    service = ProfitActivateService(db)
    subscription = await service.get_user_subscription(user_id)
    
    if subscription:
        subscription_info = {
            "subscription_type": subscription.subscription_type.value,
            "status": subscription.status.value,
            "monthly_photos": subscription.monthly_photos,
            "max_message_length": subscription.max_message_length,
            "used_photos": subscription.used_photos,
            "activated_at": _serialize_datetime(subscription.activated_at),
            "expires_at": _serialize_datetime(subscription.expires_at),
        }

    subscription_stats = await service.get_subscription_stats(user_id)

    stats_payload = {
        **subscription_stats,
        "expires_at": _serialize_datetime(subscription_stats.get("expires_at")),
        "last_reset_at": _serialize_datetime(subscription_stats.get("last_reset_at")),
    }

    user_payload = {
        "id": user.id,
        "email": user.email,
        "username": getattr(user, "username", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "is_active": user.is_active,
        "is_admin": bool(getattr(user, "is_admin", False)),
        "coins": user.coins,
        "created_at": _serialize_datetime(user.created_at),
        "subscription": subscription_info,
    }

    return {
        "user": user_payload,
        "stats": stats_payload,
        "timestamp": _serialize_datetime(datetime.utcnow()),
    }


async def emit_profile_update(user_id: int, db: AsyncSession) -> None:
    """Отправляет обновление профиля конкретного пользователя подписчикам."""
    try:
        payload = await collect_profile_snapshot(user_id, db)
    except Exception as exc:
        logger.error("Не удалось собрать данные профиля для пользователя %s: %s", user_id, exc)
        return
    await _publish_profile_update(user_id, payload)


class ProfitActivateService:
    """Сервис для активации подписок с исправленной логикой."""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _ensure_subscription(self, user_id: int) -> UserSubscription:
        """
        Гарантирует наличие подписки у пользователя.
        Если подписка отсутствует, создаёт базовую (Free) с дефолтными лимитами.
        """
        subscription = await self.get_user_subscription(user_id)
        if subscription is None:
            subscription = UserSubscription(
                user_id=user_id,
                subscription_type=SubscriptionType.FREE,
                status=SubscriptionStatus.ACTIVE,
                monthly_messages=5,
                images_limit=5,
                voice_limit=5,
                used_messages=0,
            )
            self.db.add(subscription)
            await self.db.flush()

        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.flush()

        return subscription

    async def can_user_use_credits_amount(self, user_id: int, amount: int) -> bool:
        """DEPRECATED: Система кредитов удалена."""
        return False

    async def use_credits_amount(self, user_id: int, amount: int, commit: bool = True) -> bool:
        """DEPRECATED: Система кредитов удалена."""
        return False

    async def get_user_subscription(self, user_id: int) -> Optional[UserSubscription]:
        """Получает подписку пользователя с кэшированием."""
        cache_key = key_subscription(user_id)
        
        # Пытаемся получить из кэша
        cached_data = await cache_get(cache_key)
        if cached_data is not None:
            cached_id = cached_data.get("id")
            if cached_id is None:
                logger.debug(f"[GET_SUBSCRIPTION] Кэш для user_id={user_id} указывает на отсутствие подписки (id=None)")
                return None
            subscription = await self.db.get(UserSubscription, cached_id)
            if subscription:
                # КРИТИЧНО: Проверяем, что подписка действительно принадлежит этому пользователю
                if subscription.user_id != user_id:
                    logger.error(f"[GET_SUBSCRIPTION] ОШИБКА КЭША: Подписка из кэша принадлежит другому пользователю! cached_id={cached_id}, subscription.user_id={subscription.user_id}, запрашиваемый user_id={user_id}")
                    # Инвалидируем кэш и загружаем из БД
                    await cache_delete(cache_key)
                else:
                    logger.debug(f"[GET_SUBSCRIPTION] Подписка загружена из кэша для user_id={user_id}, subscription_type={subscription.subscription_type.value}")
                    return subscription
        
        # Если нет в кэше, загружаем из БД
        # Используем order_by для получения самой последней подписки, если их несколько
        query = select(UserSubscription).where(UserSubscription.user_id == user_id).order_by(UserSubscription.activated_at.desc())
        result = await self.db.execute(query)
        subscription = result.scalars().first()
        
        
        # Если подписка найдена, проверяем и исправляем нулевые лимиты для платных тарифов
        if subscription:
            limits_updated = False
            sub_type = subscription.subscription_type.value.lower()
            
            # Проверяем, являются ли лимиты нулевыми для платных тарифов
            # Это критически важно для миграции существующих пользователей
            if (subscription.images_limit == 0 and subscription.voice_limit == 0):
                if sub_type == "standard":
                    subscription.images_limit = 100
                    subscription.voice_limit = 100
                    limits_updated = True
                elif sub_type == "premium":
                    subscription.images_limit = 300
                    subscription.voice_limit = 300
                    limits_updated = True
                # Для FREE/BASE тоже можно установить базовые значения, если они 0
                elif sub_type == "free" or sub_type == "base":
                    subscription.images_limit = 5
                    subscription.voice_limit = 5
                    limits_updated = True
            
            if limits_updated:
                logger.info(f"[GET_SUBSCRIPTION] AUTO-FIX: Обновлены лимиты для user_id={user_id}. {sub_type}: img={subscription.images_limit}, voice={subscription.voice_limit}")
                # Мы не делаем commit здесь, так как это GET метод, но мы делаем flush, чтобы объект был актуальным
                # В идеале нужно делать commit, но это может вызвать побочные эффекты в транзакции
                # Поэтому мы просто обновляем объект в памяти и надеемся, что вызывающий код сделает commit, если нужно
                # Или просто возвращаем актуальный объект, а сохранение произойдет при следующем использовании
                
                # Попытка сохранить изменения немедленно в отдельной транзакции (сложно в async)
                # Просто логируем и обновляем объект
                try:
                    self.db.add(subscription)
                    await self.db.commit()
                    await self.db.refresh(subscription)
                    logger.info(f"[GET_SUBSCRIPTION] AUTO-FIX: Изменения сохранены в БД")
                    # Обновляем кэш с новыми значениями
                    await cache_set(cache_key, subscription.to_dict(), ttl_seconds=TTL_SUBSCRIPTION)
                    # Также инвалидируем статистику
                    await cache_delete(key_subscription_stats(user_id))
                except Exception as e:
                    logger.error(f"[GET_SUBSCRIPTION] AUTO-FIX ERROR: Не удалось сохранить изменения: {e}")

            logger.debug(f"[GET_SUBSCRIPTION] Подписка загружена из БД для user_id={user_id}, subscription_type={subscription.subscription_type.value}, is_active={subscription.is_active}, subscription_id={subscription.id}")
            # Если мы не обновляли кэш выше (то есть не было auto-fix), обновляем его сейчас
            if not limits_updated:
                await cache_set(cache_key, subscription.to_dict(), ttl_seconds=TTL_SUBSCRIPTION)
        else:
            logger.debug(f"[GET_SUBSCRIPTION] Подписка не найдена в БД для user_id={user_id}")
            await cache_set(cache_key, {"id": None}, ttl_seconds=TTL_SUBSCRIPTION)
        
        return subscription
    
    async def activate_subscription(self, user_id: int, subscription_type: str, months: int = 1) -> UserSubscription:
        """Активирует или продлевает подписку для пользователя."""
        if subscription_type.lower() == "free":
            raise ValueError("Подписка Free доступна только при регистрации и не может быть активирована вручную.")

        # Определяем параметры подписки (базовые лимиты за месяц)
        # Определяем параметры подписки (базовые лимиты за месяц)
        images_limit = 0
        voice_limit = 0
        
        if subscription_type.lower() == "standard":
            monthly_photos = 0
            
            # Новые лимиты
            images_limit = 100
            voice_limit = 100
            
            max_message_length = 200
        elif subscription_type.lower() == "premium":
            monthly_photos = 0
            
            # Новые лимиты
            images_limit = 300
            voice_limit = 300
            
            max_message_length = 300
        else:
            raise ValueError(f"Неподдерживаемый тип подписки: {subscription_type}")
            
        # Увеличение лимитов генераций и голоса при покупке на долгий срок (ИТОГО ЗА ВЕСЬ ПЕРИОД)
        # Пример для Standard (100/мес): на 3 месяца = 100 * 3 + 20% = 360
        total_photos = images_limit * months
        total_voice = voice_limit * months

        if months >= 12:
            images_limit = int(total_photos * 1.15)
            voice_limit = int(total_voice * 1.15)
            logger.info(f"[SUBSCRIPTION] Увеличены лимиты (x1.15) за 12 месяцев: img={images_limit}, voice={voice_limit}")
        elif months >= 6:
            images_limit = int(total_photos * 1.10)
            voice_limit = int(total_voice * 1.10)
            logger.info(f"[SUBSCRIPTION] Увеличены лимиты (x1.10) за 6 месяцев: img={images_limit}, voice={voice_limit}")
        elif months >= 3:
            images_limit = int(total_photos * 1.05)
            voice_limit = int(total_voice * 1.05)
            logger.info(f"[SUBSCRIPTION] Увеличены лимиты (x1.05) за 3 месяца: img={images_limit}, voice={voice_limit}")
        else:
            images_limit = total_photos
            voice_limit = total_voice
        

        # Получаем пользователя для работы с балансом
        from app.models.user import Users
        user_query = select(Users).where(Users.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalars().first()
        
        if not user:
            raise ValueError(f"Пользователь {user_id} не найден")
        
        # Проверяем, есть ли уже подписка
        existing_subscription = await self.get_user_subscription(user_id)
        

        
        if existing_subscription:
            old_type = existing_subscription.subscription_type.value
            old_monthly_photos = existing_subscription.monthly_photos
            is_subscription_active = existing_subscription.is_active
            
            # БЕЗОПАСНОСТЬ: Сохраняем остатки старой подписки ДО обновления
            old_photos_remaining = existing_subscription.photos_remaining
            old_user_balance = user.coins
            
            # Определяем, это продление или смена подписки
            # Продление: та же подписка (активна или истекла) - продлеваем дату окончания
            if old_type == subscription_type.lower():
                # ПРОДЛЕНИЕ: та же подписка, активна - сдвигаем дату окончания
                logger.info(f"[SUBSCRIPTION RENEWAL] Пользователь {user_id} продлевает подписку {old_type.upper()}")
                logger.info(f"[OLD SUBSCRIPTION] Лимиты: фото={old_monthly_photos}")
                logger.info(f"[OLD SUBSCRIPTION] Остатки: фото={old_photos_remaining}")
                logger.info(f"[OLD BALANCE] Баланс пользователя: {old_user_balance} монет")
                logger.info(f"[OLD EXPIRES] Текущая дата окончания: {existing_subscription.expires_at}")
                
                # ПРОДЛЕНИЕ: сдвигаем дату окончания
                # Если подписка еще активна, продлеваем от текущей даты окончания.
                # Если уже истекла, продлеваем от текущего момента.
                now = datetime.utcnow()
                if existing_subscription.expires_at > now:
                    logger.info(f"[RENEWAL] Подписка еще активна, продлеваем от {existing_subscription.expires_at}")
                    new_expires_at = existing_subscription.expires_at + timedelta(days=30 * months)
                else:
                    logger.info(f"[RENEWAL] Подписка истекла ({existing_subscription.expires_at}), продлеваем от текущего момента {now}")
                    new_expires_at = now + timedelta(days=30 * months)
                
                # БЕЗОПАСНОСТЬ: Суммируем остатки старой подписки с новыми лимитами (накопление ресурсов)
                # Чтобы при повторной покупке лимиты не сгорали, а прибавлялись
                old_images_remaining = existing_subscription.images_remaining
                old_voice_remaining = existing_subscription.voice_remaining
                
                # Обновляем лимиты: устанавливаем базовый месячный лимит
                # (кредиты удалены)
                
                # Обновляем новые лимиты (суммируем с остатками)
                existing_subscription.images_limit = old_images_remaining + images_limit
                existing_subscription.voice_limit = old_voice_remaining + voice_limit
                # Сбрасываем использование, так как остатки перенесены в основной лимит
                existing_subscription.images_used = 0
                existing_subscription.voice_used = 0
                
                # Для платных подписок снимаем лимит сообщений (делаем безлимитными)
                existing_subscription.monthly_messages = 0
                
                # Убеждаемся, что статус ACTIVE
                existing_subscription.status = SubscriptionStatus.ACTIVE
                
                # Переводим (ничего не переводим - кредиты удалены)
                pass
                
                # Обновляем дату окончания
                existing_subscription.expires_at = new_expires_at
                existing_subscription.last_reset_at = now
                
                # (кредиты удалены)
                logger.info(f"[RENEWAL] Новая дата окончания: {new_expires_at}")
                logger.info(f"[RENEWAL] Статус установлен: {existing_subscription.status.value}")
                
                # Записываем историю (кредиты удалены)
                pass
                
                await self.db.commit()
                await self.db.refresh(existing_subscription)
                await self.db.refresh(user)
                
                # КРИТИЧЕСКАЯ ПРОВЕРКА ПОСЛЕ COMMIT
                if not existing_subscription.is_active:
                    logger.error(f"[RENEWAL] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка не активна после продления! status={existing_subscription.status.value}, expires_at={existing_subscription.expires_at}")
                    # Принудительно исправляем и сохраняем еще раз
                    existing_subscription.status = SubscriptionStatus.ACTIVE
                    if existing_subscription.expires_at <= now:
                         existing_subscription.expires_at = now + timedelta(days=30 * months)
                    await self.db.commit()
                    await self.db.refresh(existing_subscription)

                # Инвалидируем кэш подписки
                await cache_delete(key_subscription(user_id))
                await cache_delete(key_subscription_stats(user_id))
                
                logger.info("[OK] Подписка успешно продлена!")
                await emit_profile_update(user_id, self.db)
                return existing_subscription
            else:
                # СМЕНА ПОДПИСКИ: другая подписка или истекшая
                old_subscription_type_enum = existing_subscription.subscription_type
                is_old_free = (old_subscription_type_enum == SubscriptionType.FREE)
                
                logger.info(f"[UPGRADE] Старый тип подписки (enum): {old_subscription_type_enum}, is_free={is_old_free}")
                
                # СТРАТЕГИЯ СОХРАНЕНИЯ БОНУСОВ:
                # 1. Сохраняем все остатки от старой подписки
                # 2. Добавляем полный лимит новой подписки
                # 3. Итого: старые остатки + новый лимит (все в подписке)
                
                old_img_rem = existing_subscription.images_remaining
                old_voice_rem = existing_subscription.voice_remaining
                
                # Обновляем тип и лимиты подписки
                existing_subscription.subscription_type = _normalize_subscription_type(subscription_type)
                existing_subscription.status = SubscriptionStatus.ACTIVE
                # Устанавливаем базовый месячный лимит новой подписки
                # (кредиты удалены)
                existing_subscription.monthly_photos = monthly_photos
                existing_subscription.max_message_length = max_message_length
                existing_subscription.monthly_messages = 0  # Безлимит сообщений для платных
                
                # Суммируем новые лимиты с остатками старой подписки
                existing_subscription.images_limit = old_img_rem + images_limit
                existing_subscription.voice_limit = old_voice_rem + voice_limit
                existing_subscription.images_used = 0
                existing_subscription.voice_used = 0
                
                # Кредиты: удалено
                
                # Переводим (кредиты удалены)
                pass
                
                # ФОТО: Для STANDARD и PREMIUM monthly_photos = 0 (без ограничений)
                # Для FREE (старая подписка) сохраняем старые остатки фото
                # ВАЖНО: Используем сохраненный старый тип, а не новый!
                if is_old_free:
                    total_photos_available = monthly_photos + old_photos_remaining
                    existing_subscription.monthly_photos = total_photos_available
                    existing_subscription.used_photos = 0
                    logger.info(f"[UPGRADE] Старая подписка была FREE, суммируем фото: {monthly_photos} + {old_photos_remaining} = {total_photos_available}")
                else:
                    # Для STANDARD и PREMIUM - без ограничений на фото
                    existing_subscription.monthly_photos = 0
                    existing_subscription.used_photos = 0
                    logger.info(f"[UPGRADE] Старая подписка была {old_type.upper()}, фото без ограничений")
                
                existing_subscription.activated_at = datetime.utcnow()
                existing_subscription.expires_at = datetime.utcnow() + timedelta(days=30 * months)
                existing_subscription.last_reset_at = datetime.utcnow()
                
                # (кредиты удалены)
                if is_old_free:
                    total_photos_available = monthly_photos + old_photos_remaining
                    logger.info(f"[PHOTOS TRANSFER] ✅ Суммировано фото: {monthly_photos} (новая) + {old_photos_remaining} (остаток) = {total_photos_available} фото")
                else:
                    logger.info(f"[PHOTOS] Для новой подписки {subscription_type.upper()} генерации фото не ограничены")
                
                # Записываем историю (кредиты удалены)
                pass
                
                logger.info(f"[NEW BALANCE] Баланс пользователя: {old_user_balance} -> {user.coins} монет")
                logger.info(f"[UPGRADE] Новый тип подписки: {existing_subscription.subscription_type.value.upper()}")
                
                logger.info(f"[UPGRADE] Состояние ПЕРЕД commit:")
                logger.info(f"[UPGRADE]   subscription_type: {existing_subscription.subscription_type.value}")
                logger.info(f"[UPGRADE]   status: {existing_subscription.status.value}")
                logger.info(f"[UPGRADE]   expires_at: {existing_subscription.expires_at}")
                logger.info(f"[UPGRADE]   user.coins: {user.coins}")
                
                # КРИТИЧНО: Убеждаемся, что статус установлен как ACTIVE
                if existing_subscription.status != SubscriptionStatus.ACTIVE:
                    logger.warning(f"[UPGRADE] ⚠️ Статус не ACTIVE, исправляем: {existing_subscription.status.value} -> ACTIVE")
                    existing_subscription.status = SubscriptionStatus.ACTIVE
                
                # КРИТИЧНО: Убеждаемся, что expires_at установлена корректно
                if not existing_subscription.expires_at or existing_subscription.expires_at <= datetime.utcnow():
                    new_expires = datetime.utcnow() + timedelta(days=30 * months)
                    logger.warning(f"[UPGRADE] ⚠️ expires_at некорректна, исправляем: {existing_subscription.expires_at} -> {new_expires}")
                    existing_subscription.expires_at = new_expires
                
                await self.db.commit()
                logger.info(f"[UPGRADE] ✅ Commit выполнен успешно")
                
                await self.db.refresh(existing_subscription)
                await self.db.refresh(user)
                
                logger.info(f"[UPGRADE] Состояние ПОСЛЕ refresh:")
                logger.info(f"[UPGRADE]   subscription_id: {existing_subscription.id}")
                logger.info(f"[UPGRADE]   subscription_type: {existing_subscription.subscription_type.value}")
                logger.info(f"[UPGRADE]   status: {existing_subscription.status.value}")
                logger.info(f"[UPGRADE]   expires_at: {existing_subscription.expires_at}")
                logger.info(f"[UPGRADE]   is_active: {existing_subscription.is_active}")
                logger.info(f"[UPGRADE]   user.coins: {user.coins}")
                
                # КРИТИЧНО: Проверяем, что подписка действительно активна после commit
                if not existing_subscription.is_active:
                    logger.error(f"[UPGRADE] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка не активна после commit! status={existing_subscription.status.value}, expires_at={existing_subscription.expires_at}")
                    raise ValueError(f"Подписка не активна после commit: status={existing_subscription.status.value}, expires_at={existing_subscription.expires_at}")
                
                # Инвалидируем кэш подписки
                await cache_delete(key_subscription(user_id))
                await cache_delete(key_subscription_stats(user_id))
                logger.info(f"[UPGRADE] ✅ Кэш подписки инвалидирован")
                
                logger.info("[OK] Подписка успешно обновлена. Все бонусы сохранены!")
                await emit_profile_update(user_id, self.db)
                logger.info(f"[UPGRADE] ✅ Профиль обновлен через WebSocket")
                
                return existing_subscription
        
        # Создаем новую подписку (первая подписка пользователя)
        logger.info(f"[NEW SUBSCRIPTION] Создание первой подписки {subscription_type} для пользователя {user_id}")
        logger.info(f"[NEW SUBSCRIPTION] Базовый месячный лимит: фото={monthly_photos}")
        
        subscription = UserSubscription(
            user_id=user_id,
            subscription_type=_normalize_subscription_type(subscription_type),
            status=SubscriptionStatus.ACTIVE,
            monthly_photos=monthly_photos,
            monthly_messages=0,  # Безлимит сообщений для платных
            max_message_length=max_message_length,
            # Новые лимиты
            images_limit=images_limit,
            voice_limit=voice_limit,
            
            used_photos=0,
            images_used=0,
            voice_used=0,
            
            activated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30 * months),
            last_reset_at=datetime.utcnow()
        )
        
        self.db.add(subscription)
        
        # Переводим (ничего не переводим - кредиты удалены)
        old_user_balance = user.coins
        
        # КРИТИЧНО: Убеждаемся, что статус установлен как ACTIVE
        if subscription.status != SubscriptionStatus.ACTIVE:
            logger.warning(f"[NEW SUBSCRIPTION] ⚠️ Статус не ACTIVE, исправляем: {subscription.status.value} -> ACTIVE")
            subscription.status = SubscriptionStatus.ACTIVE
        
        # КРИТИЧНО: Убеждаемся, что expires_at установлена корректно
        if not subscription.expires_at or subscription.expires_at <= datetime.utcnow():
            new_expires = datetime.utcnow() + timedelta(days=30 * months)
            logger.warning(f"[NEW SUBSCRIPTION] ⚠️ expires_at некорректна, исправляем: {subscription.expires_at} -> {new_expires}")
            subscription.expires_at = new_expires
        
        logger.info(f"[NEW SUBSCRIPTION] Состояние ПЕРЕД commit:")
        logger.info(f"[NEW SUBSCRIPTION]   subscription_type: {subscription.subscription_type.value}")
        logger.info(f"[NEW SUBSCRIPTION]   status: {subscription.status.value}")
        logger.info(f"[NEW SUBSCRIPTION]   expires_at: {subscription.expires_at}")
        logger.info(f"[NEW SUBSCRIPTION]   user.coins: {user.coins}")
        
        # (кредиты удалены)
        
        # Записываем историю (кредиты удалены)
        pass
        
        logger.info(f"[NEW BALANCE] Баланс пользователя: {old_user_balance} -> {user.coins} монет")
        
        await self.db.commit()
        logger.info(f"[NEW SUBSCRIPTION] ✅ Commit выполнен успешно")
        
        await self.db.refresh(subscription)
        await self.db.refresh(user)
        
        logger.info(f"[NEW SUBSCRIPTION] Состояние ПОСЛЕ refresh:")
        logger.info(f"[NEW SUBSCRIPTION]   subscription_id: {subscription.id}")
        logger.info(f"[NEW SUBSCRIPTION]   subscription_type: {subscription.subscription_type.value}")
        logger.info(f"[NEW SUBSCRIPTION]   status: {subscription.status.value}")
        logger.info(f"[NEW SUBSCRIPTION]   expires_at: {subscription.expires_at}")
        logger.info(f"[NEW SUBSCRIPTION]   is_active: {subscription.is_active}")
        logger.info(f"[NEW SUBSCRIPTION]   user.coins: {user.coins}")
        
        # КРИТИЧНО: Проверяем, что подписка действительно активна после commit
        if not subscription.is_active:
            logger.error(f"[NEW SUBSCRIPTION] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка не активна после commit! status={subscription.status.value}, expires_at={subscription.expires_at}")
            raise ValueError(f"Подписка не активна после commit: status={subscription.status.value}, expires_at={subscription.expires_at}")
        
        # Инвалидируем кэш подписки
        await cache_delete(key_subscription(user_id))
        await cache_delete(key_subscription_stats(user_id))
        logger.info(f"[NEW SUBSCRIPTION] ✅ Кэш подписки инвалидирован")
        
        logger.info("[OK] Первая подписка создана успешно!")
        await emit_profile_update(user_id, self.db)
        logger.info(f"[NEW SUBSCRIPTION] ✅ Профиль обновлен через WebSocket")
        
        return subscription
    
    async def add_credits_topup(self, user_id: int, credits: int) -> Dict[str, Any]:
        """
        DEPRECATED: Система кредитов удалена.
        Этот метод больше не выполняет никаких действий.
        """
        logger.warning(f"[DEPRECATED] add_credits_topup вызван для user_id={user_id}, но система кредитов удалена")
        return {
            "success": False,
            "deprecated": True,
            "message": "Система кредитов удалена"
        }

    
    async def get_subscription_stats(self, user_id: int) -> Dict[str, Any]:
        """Получает статистику подписки пользователя с кэшированием."""
        cache_key = key_subscription_stats(user_id)
        
        # Пытаемся получить из кэша
        cached_stats = await cache_get(cache_key)
        if cached_stats is not None:
            # Логируем для отладки
            cached_type = cached_stats.get('subscription_type')
            cached_active = cached_stats.get('is_active')
            logger.debug(f"[STATS] Кэш найден для user_id={user_id}, subscription_type={cached_type}, is_active={cached_active}")
            # ВАЖНО: Если в кэше PREMIUM для пользователя без подписки - принудительно инвалидируем кэш
            # КРИТИЧНО: Инвалидируем ОБА кэша (subscription_stats и subscription)
            if cached_type == "premium" and cached_active:
                await cache_delete(cache_key)
                await cache_delete(key_subscription(user_id))
                # Продолжаем загрузку из БД ниже
            else:
                return cached_stats
        
        # Если нет в кэше, загружаем из БД
        subscription = await self.get_user_subscription(user_id)
        
        if not subscription:
            # Если подписки нет, возвращаем значения по умолчанию для FREE подписки
            logger.debug(f"[STATS] Подписка не найдена для user_id={user_id}, возвращаем FREE по умолчанию")
            default_stats = {
                "subscription_type": "free",
                "status": "inactive",
                "monthly_photos": 0,
                "monthly_messages": 5,
                "max_message_length": 100,
                "used_photos": 0,
                "used_messages": 0,
                "images_limit": 5,
                "images_used": 0,
                "voice_limit": 5,
                "voice_used": 0,
                "photos_remaining": 0,
                "messages_remaining": 5,
                "images_remaining": 5,
                "voice_remaining": 5,
                "days_left": 0,
                "is_active": False,
                "expires_at": None,
                "last_reset_at": None
            }
            # НЕ кэшируем значения по умолчанию, чтобы каждый раз проверять БД
            return default_stats
        
        # Логируем найденную подписку
        sub_type = subscription.subscription_type.value
        sub_active = subscription.is_active
        logger.debug(f"[STATS] Подписка найдена для user_id={user_id}, subscription_type={sub_type}, is_active={sub_active}, status={subscription.status.value}")
        
        # КРИТИЧНО: Проверяем, что подписка действительно существует в БД
        if not subscription.id:
            logger.error(f"[STATS] ОШИБКА: Подписка без ID для user_id={user_id}!")
            return {
                "subscription_type": "free",
                "status": "inactive",
                "monthly_photos": 0,
                "monthly_messages": 5,
                "max_message_length": 0,
                "used_photos": 0,
                "used_messages": 0,
                "photos_remaining": 0,
                "messages_remaining": 5,
                "days_left": 0,
                "is_active": False,
                "expires_at": None,
                "last_reset_at": None
            }
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш при сбросе лимитов
            await cache_delete(key_subscription(user_id))
            await cache_delete(cache_key)

        # FIX: Автоматическое исправление нулевых лимитов для старых подписок
        # Это критически важно для миграции существующих пользователей
        limits_updated = False
        if subscription.images_limit == 0 and subscription.voice_limit == 0:
            sub_type = subscription.subscription_type.value.lower()
            if sub_type == "free" or sub_type == "base":
                subscription.images_limit = 5
                subscription.voice_limit = 5
                limits_updated = True
            elif sub_type == "standard":
                subscription.images_limit = 100
                subscription.voice_limit = 100
                limits_updated = True
            elif sub_type == "premium":
                subscription.images_limit = 300
                subscription.voice_limit = 300
                limits_updated = True
        
        if limits_updated:
            logger.info(f"[STATS] AUTO-FIX: Обновлены лимиты для user_id={user_id}. {sub_type}: img={subscription.images_limit}, voice={subscription.voice_limit}")
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш снова, чтобы вернуть новые данные
            await cache_delete(key_subscription(user_id))
            await cache_delete(cache_key)
        
        # Подсчитываем количество созданных персонажей
        from app.chat_bot.models.models import CharacterDB
        from sqlalchemy import func, select as sql_select
        
        characters_count_query = sql_select(func.count(CharacterDB.id)).where(CharacterDB.user_id == user_id)
        characters_count_result = await self.db.execute(characters_count_query)
        characters_count = characters_count_result.scalar() or 0
        
        # Определяем лимит персонажей в зависимости от подписки
        sub_type = subscription.subscription_type.value.lower()
        if sub_type == "premium":
            characters_limit = None  # Unlimited
        elif sub_type == "standard":
            characters_limit = 10
        else:  # free
            characters_limit = 1
        
        stats = {
            "subscription_type": subscription.subscription_type.value,
            "status": subscription.status.value,
            "monthly_photos": subscription.monthly_photos,
            "monthly_messages": subscription.monthly_messages,
            "max_message_length": subscription.max_message_length,
            "used_photos": subscription.used_photos,
            "used_messages": subscription.used_messages,
            "photos_remaining": subscription.photos_remaining,
            "messages_remaining": subscription.messages_remaining if subscription.monthly_messages > 0 else None,
            # Новые поля для лимитов
            "images_limit": subscription.images_limit,
            "images_used": subscription.images_used,
            "images_remaining": subscription.images_remaining,
            "voice_limit": subscription.voice_limit,
            "voice_used": subscription.voice_used,
            "voice_remaining": subscription.voice_remaining,
            # Лимит персонажей
            "characters_count": characters_count,
            "characters_limit": characters_limit,
            
            "days_left": subscription.days_until_expiry,
            "is_active": subscription.is_active,
            "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
            "last_reset_at": subscription.last_reset_at.isoformat() if subscription.last_reset_at else None
        }
        
        # Сохраняем в кэш
        await cache_set(cache_key, stats, ttl_seconds=TTL_SUBSCRIPTION_STATS)
        
        return stats
    
    async def can_user_send_message(self, user_id: int, message_length: int = 0) -> bool:
        """Проверяет, может ли пользователь отправить сообщение."""
        subscription = await self._ensure_subscription(user_id)
        # Проверяем длину сообщения
        return subscription.can_send_message(message_length)
    
    async def can_user_generate_photo(self, user_id: int) -> bool:
        """
        Проверяет, может ли пользователь сгенерировать фото.
        Для STANDARD/PREMIUM: только проверяет активность подписки (кредиты проверяются отдельно через user.coins).
        Для FREE: проверяет лимит подписки или кредиты.
        """
        subscription = await self._ensure_subscription(user_id)
        return subscription.can_generate_photo()
    
    async def use_message_credits(self, user_id: int) -> bool:
        """
        Увеличивает used_messages для FREE (лимит 10 сообщений).
        Кредиты удалены.
        """
        subscription = await self._ensure_subscription(user_id)
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.flush()
            
        if not subscription.can_send_message(0):
            return False
            
        if subscription.subscription_type == SubscriptionType.FREE and subscription.monthly_messages > 0:
            subscription.used_messages = (subscription.used_messages or 0) + 1
            
        await self.db.commit()
        await self.db.refresh(subscription)
        await cache_delete(key_subscription(user_id))
        await cache_delete(key_subscription_stats(user_id))
        await emit_profile_update(user_id, self.db)
        return True
    
    async def use_photo_generation(self, user_id: int, commit: bool = True) -> bool:
        """
        Тратит генерацию фото.
        Для STANDARD/PREMIUM: ничего не делает (кредиты списываются с user.coins отдельно).
        Для FREE: списывает лимит подписки или кредиты.
        """
        subscription = await self._ensure_subscription(user_id)
        logger.info(f"[PHOTO_COUNTER] До списания: user_id={user_id}, subscription_type={subscription.subscription_type.value}, monthly_photos={subscription.monthly_photos}, used_photos={subscription.used_photos}, photos_remaining={subscription.photos_remaining}")
        
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            if commit:
                await self.db.commit()
                await self.db.refresh(subscription)
            else:
                await self.db.flush()
        
        success = subscription.use_photo_generation()
        if success:
            logger.info(f"[PHOTO_COUNTER] После списания: user_id={user_id}, used_photos={subscription.used_photos}, photos_remaining={subscription.photos_remaining}, commit={commit}")
            if commit:
                await self.db.commit()
                await self.db.refresh(subscription)
                # Инвалидируем кэш подписки
                await cache_delete(key_subscription(user_id))
                await cache_delete(key_subscription_stats(user_id))
                await emit_profile_update(user_id, self.db)
                logger.info(f"[PHOTO_COUNTER] Кэш инвалидирован для user_id={user_id}")
            else:
                await self.db.flush()
                logger.info(f"[PHOTO_COUNTER] Flush выполнен (без commit) для user_id={user_id}")
        else:
            logger.warning(f"[PHOTO_COUNTER] Не удалось списать генерацию для user_id={user_id}")
        
        return success
    
    async def get_subscription_info(self, user_id: int) -> Optional[SubscriptionInfoResponse]:
        """Получает полную информацию о подписке пользователя."""
        subscription = await self._ensure_subscription(user_id)
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш при сбросе лимитов
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
        
        return SubscriptionInfoResponse(
            id=subscription.id,
            user_id=subscription.user_id,
            subscription_type=subscription.subscription_type.value,
            status=subscription.status.value,
            monthly_photos=subscription.monthly_photos,
            used_photos=subscription.used_photos,
            photos_remaining=subscription.photos_remaining,
            activated_at=subscription.activated_at,
            expires_at=subscription.expires_at,
            last_reset_at=subscription.last_reset_at,
            is_active=subscription.is_active,
            days_until_expiry=subscription.days_until_expiry,
            # Новые лимиты
            images_limit=subscription.images_limit,
            images_used=subscription.images_used,
            voice_limit=subscription.voice_limit,
            voice_used=subscription.voice_used,
        )
