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
    stmt = (
        select(Users)
        .options(selectinload(Users.subscription))
        .where(Users.id == user_id)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError(f"Пользователь {user_id} не найден")

    subscription_info: Optional[Dict[str, Any]] = None
    if user.subscription:
        subscription = user.subscription
        subscription_info = {
            "subscription_type": subscription.subscription_type.value,
            "status": subscription.status.value,
            "monthly_credits": subscription.monthly_credits,
            "monthly_photos": subscription.monthly_photos,
            "max_message_length": subscription.max_message_length,
            "used_credits": subscription.used_credits,
            "used_photos": subscription.used_photos,
            "activated_at": _serialize_datetime(subscription.activated_at),
            "expires_at": _serialize_datetime(subscription.expires_at),
        }

    service = ProfitActivateService(db)
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
            )
            self.db.add(subscription)
            await self.db.flush()

        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.flush()

        return subscription

    async def can_user_use_credits_amount(self, user_id: int, amount: int) -> bool:
        """Проверяет, достаточно ли кредитов у пользователя."""
        subscription = await self._ensure_subscription(user_id)
        return subscription.can_use_credits(amount)
    
    async def use_credits_amount(self, user_id: int, amount: int, commit: bool = True) -> bool:
        """Списывает указанное количество кредитов подписки."""
        subscription = await self._ensure_subscription(user_id)
        success = subscription.use_credits(amount)
        if not success:
            return False
        
        if commit:
            await self.db.commit()
            await self.db.refresh(subscription)
            await emit_profile_update(user_id, self.db)
        else:
            await self.db.flush()
        
        return True
    
    async def get_user_subscription(self, user_id: int) -> Optional[UserSubscription]:
        """Получает подписку пользователя с кэшированием."""
        cache_key = key_subscription(user_id)
        
        # Пытаемся получить из кэша
        cached_data = await cache_get(cache_key)
        if cached_data is not None:
            cached_id = cached_data.get("id")
            if cached_id is None:
                return None
            subscription = await self.db.get(UserSubscription, cached_id)
            if subscription:
                return subscription
        
        # Если нет в кэше, загружаем из БД
        query = select(UserSubscription).where(UserSubscription.user_id == user_id)
        result = await self.db.execute(query)
        subscription = result.scalar_one_or_none()
        
        # Сохраняем в кэш
        if subscription:
            await cache_set(cache_key, subscription.to_dict(), ttl_seconds=TTL_SUBSCRIPTION)
        else:
            await cache_set(cache_key, {"id": None}, ttl_seconds=TTL_SUBSCRIPTION)
        
        return subscription
    
    async def activate_subscription(self, user_id: int, subscription_type: str) -> UserSubscription:
        """Активирует подписку для пользователя."""
        if subscription_type.lower() == "free":
            raise ValueError("Подписка Free доступна только при регистрации и не может быть активирована вручную.")

        # Определяем параметры подписки
        if subscription_type.lower() == "standard":
            monthly_credits = 1000
            monthly_photos = 100
            max_message_length = 200
        elif subscription_type.lower() == "premium":
            monthly_credits = 5000
            monthly_photos = 300
            max_message_length = 300
        else:
            raise ValueError(f"Неподдерживаемый тип подписки: {subscription_type}")
        
        # Получаем пользователя для работы с балансом
        from app.models.user import Users
        user_query = select(Users).where(Users.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise ValueError(f"Пользователь {user_id} не найден")
        
        # Проверяем, есть ли уже подписка
        existing_subscription = await self.get_user_subscription(user_id)
        
        import logging
        logger = logging.getLogger(__name__)
        
        if existing_subscription:
            old_type = existing_subscription.subscription_type.value
            old_monthly_credits = existing_subscription.monthly_credits
            old_monthly_photos = existing_subscription.monthly_photos
            
            # Если та же подписка уже активна - просто возвращаем
            if existing_subscription.is_active and old_type == subscription_type.lower():
                logger.info(f"[SUBSCRIPTION] Пользователь {user_id} уже имеет активную подписку {old_type}")
                await emit_profile_update(user_id, self.db)
                return existing_subscription
            
            # БЕЗОПАСНОСТЬ: Сохраняем остатки старой подписки ДО обновления
            old_credits_remaining = existing_subscription.credits_remaining
            old_photos_remaining = existing_subscription.photos_remaining
            old_user_balance = user.coins
            
            logger.info(f"[SUBSCRIPTION UPGRADE] Пользователь {user_id} меняет подписку {old_type.upper()} -> {subscription_type.upper()}")
            logger.info(f"[OLD SUBSCRIPTION] Лимиты: кредиты={old_monthly_credits}, фото={old_monthly_photos}")
            logger.info(f"[OLD SUBSCRIPTION] Остатки: кредиты={old_credits_remaining}, фото={old_photos_remaining}")
            logger.info(f"[OLD BALANCE] Баланс пользователя: {old_user_balance} монет")
            
            # СТРАТЕГИЯ СОХРАНЕНИЯ БОНУСОВ:
            # 1. Сохраняем все остатки от старой подписки
            # 2. Добавляем полный лимит новой подписки
            # 3. Итого: старые остатки + новый лимит
            
            # Обновляем тип и лимиты подписки
            existing_subscription.subscription_type = _normalize_subscription_type(subscription_type)
            existing_subscription.status = SubscriptionStatus.ACTIVE
            existing_subscription.monthly_credits = monthly_credits
            existing_subscription.monthly_photos = monthly_photos
            existing_subscription.max_message_length = max_message_length
            
            # ВАЖНО: 
            # КРЕДИТЫ - суммируются и переводятся на баланс
            # ФОТО - ТЕПЕРЬ ТОЖЕ СУММИРУЮТСЯ!
            
            # Кредиты: сбрасываем used_credits т.к. все остатки уже на балансе
            existing_subscription.used_credits = 0
            
            # ФОТО: Сохраняем старые остатки фото
            # Новый лимит + старые остатки - то есть used = 0 для полного переноса
            # Формула: used = new_limit - (new_limit + old_remaining) = -old_remaining
            # Но used не может быть отрицательным, поэтому используем другой подход:
            # Увеличиваем monthly_photos на старый остаток
            total_photos_available = monthly_photos + old_photos_remaining
            existing_subscription.monthly_photos = total_photos_available
            existing_subscription.used_photos = 0
            
            existing_subscription.activated_at = datetime.utcnow()
            existing_subscription.expires_at = datetime.utcnow() + timedelta(days=30)
            existing_subscription.last_reset_at = datetime.utcnow()
            
            # ДОПОЛНИТЕЛЬНЫЙ БОНУС: Старые остатки переводим на баланс
            total_credits_to_add = monthly_credits + old_credits_remaining
            user.coins += total_credits_to_add
            
            total_photos_available = monthly_photos + old_photos_remaining
            
            logger.info(f"[NEW SUBSCRIPTION] Базовые лимиты: кредиты={monthly_credits}, фото={monthly_photos}")
            logger.info(f"[CREDITS TRANSFER] ✅ Переведено на баланс: {monthly_credits} (новая) + {old_credits_remaining} (остаток) = {total_credits_to_add} кредитов")
            logger.info(f"[PHOTOS TRANSFER] ✅ Суммировано фото: {monthly_photos} (новая) + {old_photos_remaining} (остаток) = {total_photos_available} фото")
            logger.info(f"[NEW BALANCE] Баланс пользователя: {old_user_balance} + {total_credits_to_add} = {user.coins} монет")
            
            await self.db.commit()
            await self.db.refresh(existing_subscription)
            await self.db.refresh(user)
            
            # Инвалидируем кэш подписки
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
            
            logger.info(f"[OK] ✅ Подписка успешно обновлена. Все бонусы сохранены!")
            await emit_profile_update(user_id, self.db)
            return existing_subscription
        
        # Создаем новую подписку (первая подписка пользователя)
        logger.info(f"[NEW SUBSCRIPTION] Создание первой подписки {subscription_type} для пользователя {user_id}")
        logger.info(f"[NEW SUBSCRIPTION] Лимиты: кредиты={monthly_credits}, фото={monthly_photos}")
        
        subscription = UserSubscription(
            user_id=user_id,
            subscription_type=_normalize_subscription_type(subscription_type),
            status=SubscriptionStatus.ACTIVE,
            monthly_credits=monthly_credits,
            monthly_photos=monthly_photos,
            max_message_length=max_message_length,
            used_credits=0,
            used_photos=0,
            activated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
            last_reset_at=datetime.utcnow()
        )
        
        self.db.add(subscription)
        
        # Начисляем кредиты на баланс при первой подписке
        old_user_balance = user.coins
        user.coins += monthly_credits
        
        logger.info(f"[CREDITS TRANSFER] Переведено на баланс: {monthly_credits} кредитов")
        logger.info(f"[NEW BALANCE] Баланс пользователя: {old_user_balance} + {monthly_credits} = {user.coins} монет")
        
        await self.db.commit()
        await self.db.refresh(subscription)
        await self.db.refresh(user)
        
        # Инвалидируем кэш подписки
        await cache_delete(key_subscription(user_id))
        await cache_delete(key_subscription_stats(user_id))
        
        logger.info(f"[OK] ✅ Первая подписка создана успешно!")
        await emit_profile_update(user_id, self.db)
        return subscription
    
    async def get_subscription_stats(self, user_id: int) -> Dict[str, Any]:
        """Получает статистику подписки пользователя с кэшированием."""
        cache_key = key_subscription_stats(user_id)
        
        # Пытаемся получить из кэша
        cached_stats = await cache_get(cache_key)
        if cached_stats is not None:
            return cached_stats
        
        # Если нет в кэше, загружаем из БД
        subscription = await self.get_user_subscription(user_id)
        
        if not subscription:
            # Если подписки нет, возвращаем значения по умолчанию
            return {
                "subscription_type": "none",
                "status": "inactive",
                "monthly_credits": 0,
                "monthly_photos": 0,
                "max_message_length": 0,
                "used_credits": 0,
                "used_photos": 0,
                "credits_remaining": 0,
                "photos_remaining": 0,
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
        
        stats = {
            "subscription_type": subscription.subscription_type.value,
            "status": subscription.status.value,
            "monthly_credits": subscription.monthly_credits,
            "monthly_photos": subscription.monthly_photos,
            "max_message_length": subscription.max_message_length,
            "used_credits": subscription.used_credits,
            "used_photos": subscription.used_photos,
            "credits_remaining": subscription.credits_remaining,
            "photos_remaining": subscription.photos_remaining,
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
        if not subscription.can_send_message(message_length):
            return False
        
        # Для сообщений требуется 2 кредита
        return subscription.can_use_credits(2)
    
    async def can_user_generate_photo(self, user_id: int) -> bool:
        """Проверяет, может ли пользователь сгенерировать фото."""
        subscription = await self._ensure_subscription(user_id)
        return subscription.can_generate_photo()
    
    async def use_message_credits(self, user_id: int) -> bool:
        """Тратит кредиты за отправку сообщения."""
        return await self.use_credits_amount(user_id, 2)
    
    async def use_photo_generation(self, user_id: int, commit: bool = True) -> bool:
        """Тратит генерацию фото."""
        subscription = await self._ensure_subscription(user_id)
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            if commit:
                await self.db.commit()
                await self.db.refresh(subscription)
            else:
                await self.db.flush()
        
        success = subscription.use_photo_generation()
        if success:
            if commit:
                await self.db.commit()
                await self.db.refresh(subscription)
                # Инвалидируем кэш подписки
                await cache_delete(key_subscription(user_id))
                await cache_delete(key_subscription_stats(user_id))
                await emit_profile_update(user_id, self.db)
            else:
                await self.db.flush()
        
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
            monthly_credits=subscription.monthly_credits,
            monthly_photos=subscription.monthly_photos,
            used_credits=subscription.used_credits,
            used_photos=subscription.used_photos,
            credits_remaining=subscription.credits_remaining,
            photos_remaining=subscription.photos_remaining,
            activated_at=subscription.activated_at,
            expires_at=subscription.expires_at,
            last_reset_at=subscription.last_reset_at,
            is_active=subscription.is_active,
            days_until_expiry=subscription.days_until_expiry
        )
