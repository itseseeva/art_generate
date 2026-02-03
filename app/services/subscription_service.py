"""
Сервис для работы с подписками пользователей.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.models.user import Users
from app.schemas.subscription import SubscriptionStatsResponse, SubscriptionInfoResponse
from app.services.profit_activate import emit_profile_update
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_subscription, key_subscription_stats,
    TTL_SUBSCRIPTION, TTL_SUBSCRIPTION_STATS
)

logger = logging.getLogger(__name__)


FREE_ALIASES = {"free", "base"}


def _normalize_subscription_type(subscription_type: str | SubscriptionType) -> SubscriptionType:
    if isinstance(subscription_type, SubscriptionType):
        if subscription_type == SubscriptionType.FREE:
            return SubscriptionType.FREE
        return subscription_type

    if isinstance(subscription_type, str):
        try:
            normalized = subscription_type.strip().lower()
            if normalized in FREE_ALIASES:
                return SubscriptionType.FREE

            return SubscriptionType(normalized)
        except ValueError as exc:
            raise ValueError(f"Неподдерживаемый тип подписки: {subscription_type}") from exc

    raise ValueError(f"Некорректное значение типа подписки: {subscription_type}")


class SubscriptionService:
    """Сервис для управления подписками."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
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
        # Используем order_by для получения самой последней подписки, если их несколько
        query = select(UserSubscription).where(UserSubscription.user_id == user_id).order_by(UserSubscription.activated_at.desc())
        result = await self.db.execute(query)
        subscription = result.scalars().first()
        
        # Сохраняем в кэш
        if subscription:
            await cache_set(cache_key, subscription.to_dict(), ttl_seconds=TTL_SUBSCRIPTION)
        else:
            await cache_set(cache_key, {"id": None}, ttl_seconds=TTL_SUBSCRIPTION)
        
        return subscription
    
    async def create_subscription(self, user_id: int, subscription_type: str) -> UserSubscription:
        """Создает подписку для пользователя."""
        print(f"🔍 DEBUG: Создание подписки для пользователя {user_id}, тип: {subscription_type}")

        normalized_enum = _normalize_subscription_type(subscription_type)
        normalized_type = normalized_enum.value
        print(f"🔍 DEBUG: Нормализованный тип подписки: {normalized_type}")

        if normalized_enum == SubscriptionType.FREE:
            existing_subscription = await self.get_user_subscription(user_id)
            if existing_subscription:
                raise ValueError("Бесплатная подписка доступна только при регистрации и не может быть активирована повторно.")
            monthly_credits = 0  # 0 кредитов для FREE подписки (вместо 200)
            monthly_photos = 5  # 5 генераций фото для FREE подписки
            
            # Новые лимиты
            images_limit = 5
            voice_limit = 5
            
            max_message_length = 100
        elif normalized_enum == SubscriptionType.STANDARD:
            monthly_credits = 2000  # Стандартный тариф: 2000 кредитов в месяц
            monthly_photos = 0  # Без лимита - генерация оплачивается кредитами (10 кредитов за фото)
            
            # Новые лимиты для STANDARD
            images_limit = 100
            voice_limit = 100
            
            max_message_length = 200
        elif normalized_enum == SubscriptionType.PREMIUM:
            monthly_credits = 6000  # Премиум тариф: 6000 кредитов в месяц
            monthly_photos = 0  # Без лимита - генерация оплачивается кредитами (10 кредитов за фото)
            
            # Новые лимиты для PREMIUM
            images_limit = 300
            voice_limit = 300
            
            max_message_length = 300
        else:
            print(f"[ERROR] DEBUG: Неподдерживаемый тип подписки: {subscription_type}")
            raise ValueError(f"Неподдерживаемый тип подписки: {subscription_type}")
        
        monthly_messages = 5 if normalized_enum == SubscriptionType.FREE else 0
        print(f"[OK] DEBUG: Параметры подписки - кредиты: {monthly_credits}, фото: {monthly_photos}, сообщения: {monthly_messages}, длина: {max_message_length}")
        print(f"[OK] DEBUG: Новые лимиты - изображения: {images_limit}, голос: {voice_limit}")
        
        # Проверяем, есть ли уже подписка
        existing_subscription = await self.get_user_subscription(user_id)
        if existing_subscription:
            print(f"🔍 DEBUG: Найдена существующая подписка: {existing_subscription.subscription_type.value}, активна: {existing_subscription.is_active}")
            
            # Если подписка активна и того же типа, возвращаем её
            if existing_subscription.is_active and existing_subscription.subscription_type == normalized_enum:
                print(f"[OK] DEBUG: Подписка того же типа уже активна, обновляем лимиты если нужно")
                # Обновляем лимиты, если они старые (0)
                should_update = False
                if existing_subscription.images_limit != images_limit:
                    existing_subscription.images_limit = images_limit
                    should_update = True
                if existing_subscription.voice_limit != voice_limit:
                    existing_subscription.voice_limit = voice_limit
                    should_update = True
                
                if should_update:
                     await self.db.commit()
                     # Инвалидируем кэш
                     await cache_delete(key_subscription(user_id))
                     await cache_delete(key_subscription_stats(user_id))
                
                return existing_subscription
            
            # БЕЗОПАСНОСТЬ: Сохраняем остатки перед обновлением
            old_credits_remaining = existing_subscription.credits_remaining
            old_photos_remaining = existing_subscription.photos_remaining
            
            # Для изображений и голоса не переносим остатки при смене тарифа (они "сгорают" или заменяются новыми),
            # так как это месячные лимиты, а не накапливаемые кредиты.
            # Но если пользователь делает upgrade, логично дать ему полный пакет нового тарифа.
            
            print(f"🔄 DEBUG: Обновляем подписку {existing_subscription.subscription_type.value} -> {subscription_type}")
            print(f"💰 DEBUG: Сохраняем остатки: кредиты={old_credits_remaining}, фото={old_photos_remaining}")
            
            # Обновляем существующую подписку
            existing_subscription.subscription_type = normalized_enum
            existing_subscription.status = SubscriptionStatus.ACTIVE
            existing_subscription.monthly_credits = monthly_credits
            
            # ФОТО: СУММИРУЕМ старые остатки с новым лимитом (только для legacy monthly_photos)
            total_photos_available = monthly_photos + old_photos_remaining
            existing_subscription.monthly_photos = total_photos_available
            
            # Новые лимиты устанавливаем жестко согласно тарифу
            existing_subscription.images_limit = images_limit
            existing_subscription.voice_limit = voice_limit
            # Сбрасываем использование новых лимитов
            existing_subscription.images_used = 0
            existing_subscription.voice_used = 0
            
            existing_subscription.max_message_length = max_message_length
            existing_subscription.monthly_messages = monthly_messages
            existing_subscription.used_credits = 0  # Сбрасываем, т.к. остатки идут на баланс
            existing_subscription.used_photos = 0  # Сбрасываем, получаем полный новый лимит + остатки
            existing_subscription.used_messages = 0
            existing_subscription.activated_at = datetime.utcnow()
            existing_subscription.expires_at = datetime.utcnow() + timedelta(days=30)
            existing_subscription.last_reset_at = datetime.utcnow()
            
            await self.db.commit()
            
            # Инвалидируем кэш подписки
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
            
            # БЕЗОПАСНОСТЬ: Переводим на баланс новые кредиты + старые остатки
            total_credits_to_add = monthly_credits + old_credits_remaining
            await self.add_credits_to_user_balance(user_id, total_credits_to_add)
            
            total_photos_available = monthly_photos + old_photos_remaining
            
            print(f"✅ [CREDITS] Переведено на баланс: {monthly_credits} (новая) + {old_credits_remaining} (остаток) = {total_credits_to_add}")
            print(f"✅ [PHOTOS] Суммировано фото: {monthly_photos} (новая) + {old_photos_remaining} (остаток) = {total_photos_available}")
            
            return existing_subscription
        
        # Создаем новую подписку
        subscription = UserSubscription(
            user_id=user_id,
            subscription_type=normalized_enum,
            status=SubscriptionStatus.ACTIVE,
            monthly_credits=monthly_credits,
            monthly_photos=monthly_photos,
            monthly_messages=monthly_messages,
            # Новые лимиты
            images_limit=images_limit,
            voice_limit=voice_limit,
            
            max_message_length=max_message_length,
            used_credits=0,
            used_photos=0,
            used_messages=0,
            # Сброс использования
            images_used=0,
            voice_used=0,
            
            activated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
            last_reset_at=datetime.utcnow()
        )
        
        self.db.add(subscription)
        await self.db.commit()
        
        # Инвалидируем кэш подписки
        await cache_delete(key_subscription(user_id))
        await cache_delete(key_subscription_stats(user_id))
        
        # Переводим средства на баланс пользователя
        await self.add_credits_to_user_balance(user_id, monthly_credits)
        
        return subscription
    
    async def add_credits_to_user_balance(self, user_id: int, credits: int) -> bool:
        """Добавляет кредиты на баланс пользователя с логированием для безопасности."""
        try:
            # Получаем пользователя
            user_query = select(Users).where(Users.id == user_id)
            result = await self.db.execute(user_query)
            user = result.scalars().first()
            
            if not user:
                print(f"[ERROR] Пользователь {user_id} не найден!")
                return False
            
            # БЕЗОПАСНОСТЬ: Логируем ДО изменения баланса
            old_balance = user.coins
            print(f"💰 [CREDITS ADD] Пользователь {user_id}: баланс ДО = {old_balance}")
            print(f"💰 [CREDITS ADD] Добавляем: {credits} кредитов")
            
            # Обновляем баланс пользователя
            user.coins += credits
            
            # БЕЗОПАСНОСТЬ: Логируем ПОСЛЕ изменения баланса
            print(f"💰 [CREDITS ADD] Баланс ПОСЛЕ = {user.coins} ({old_balance} + {credits})")
            
            # Записываем историю баланса
            try:
                from app.utils.balance_history import record_balance_change
                await record_balance_change(
                    db=self.db,
                    user_id=user_id,
                    amount=credits,
                    reason="Начисление кредитов при активации подписки"
                )
            except Exception as e:
                print(f"[WARNING] Не удалось записать историю баланса: {e}")
            
            await self.db.commit()
            # БЕЗОПАСНОСТЬ: Финальная проверка
            print(f"✅ [CREDITS ADD] Транзакция завершена! Финальный баланс: {user.coins}")
            
            await emit_profile_update(user_id, self.db)
            return True
        except Exception as e:
            print(f"[ERROR] ❌ Ошибка добавления кредитов на баланс: {e}")
            await self.db.rollback()
            return False
    
    async def create_free_subscription(self, user_id: int) -> UserSubscription:
        """Создает бесплатную подписку для пользователя."""
        return await self.create_subscription(user_id, "free")
    
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
                "used_credits": 0,
                "used_photos": 0,
                "credits_remaining": 0,
                "photos_remaining": 0,
                # Новые поля
                "images_limit": 0,
                "images_used": 0,
                "images_remaining": 0,
                "voice_limit": 0,
                "voice_used": 0,
                "voice_remaining": 0,
                
                "days_left": 0,
                "is_active": False,
                "expires_at": None,
                "last_reset_at": None
            }
            
        # FIX: Автоматическое исправление нулевых лимитов для старых подписок
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
                
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            limits_updated = True
            
        if limits_updated:
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш
            await cache_delete(key_subscription(user_id))
            await cache_delete(cache_key)
        
        stats = {
            "subscription_type": subscription.subscription_type.value,
            "status": subscription.status.value,
            "monthly_credits": subscription.monthly_credits,
            "monthly_photos": subscription.monthly_photos,
            "used_credits": subscription.used_credits,
            "used_photos": subscription.used_photos,
            "credits_remaining": subscription.credits_remaining,
            "photos_remaining": subscription.photos_remaining,
            
            # Новые лимиты
            "images_limit": subscription.images_limit,
            "images_used": subscription.images_used,
            "images_remaining": subscription.images_remaining,
            "voice_limit": subscription.voice_limit,
            "voice_used": subscription.voice_used,
            "voice_remaining": subscription.voice_remaining,
            
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
        subscription = await self.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
        
        # Проверяем длину сообщения
        if not subscription.can_send_message(message_length):
            return False
        
        # Для сообщений требуется 2 кредита
        return subscription.can_use_credits(2)
    
    async def can_user_generate_photo(self, user_id: int) -> bool:
        """Проверяет, может ли пользователь сгенерировать фото."""
        subscription = await self.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
        
        return subscription.can_generate_photo()
    
    async def use_message_credits(self, user_id: int) -> bool:
        """Тратит кредиты за отправку сообщения."""
        subscription = await self.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
        
        # Тратим 2 кредита за сообщение
        success = subscription.use_credits(2)
        if success:
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш подписки
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
        
        return success
    
    async def use_photo_generation(self, user_id: int) -> bool:
        """Тратит генерацию фото."""
        subscription = await self.get_user_subscription(user_id)
        if not subscription:
            return False
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
        
        success = subscription.use_photo_generation()
        if success:
            await self.db.commit()
            await self.db.refresh(subscription)
            # Инвалидируем кэш подписки
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
        
        return success
    
    async def get_subscription_info(self, user_id: int) -> Optional[SubscriptionInfoResponse]:
        """Получает полную информацию о подписке пользователя."""
        subscription = await self.get_user_subscription(user_id)
        if not subscription:
            return None
        
        # Проверяем, нужно ли сбросить месячные лимиты
        if subscription.should_reset_limits():
            subscription.reset_monthly_limits()
            await self.db.commit()
            await self.db.refresh(subscription)
        
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
