"""
Модели для системы подписок.
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.db import Base


class SubscriptionType(str, enum.Enum):
    """Типы подписок."""
    FREE = "free"
    STANDARD = "standard"
    PREMIUM = "premium"
    PRO = "pro"


class SubscriptionStatus(str, enum.Enum):
    """Статусы подписок."""
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


# Стоимость генерации фото в кредитах подписки (если нет оставшихся генераций фото)
PHOTO_GENERATION_CREDITS_COST = 10


class SubscriptionTypeDB(TypeDecorator):
    """
    Хранит SubscriptionType в базе в верхнем регистре (FREE), а в Python возвращает enum с нижним значением.
    """

    impl = Enum(
        "BASE",
        "FREE",
        "STANDARD",
        "PREMIUM",
        "PRO",
        name="subscriptiontype",
        native_enum=False,
    )

    cache_ok = True

    def _normalize_value(self, value: str) -> str:
        normalized = value.strip().lower()
        if normalized in {"free", "base"}:
            return "BASE"
        return normalized.upper()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, SubscriptionType):
            return self._normalize_value(value.value)
        return self._normalize_value(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        db_value = value.strip().lower()
        if db_value == "base":
            db_value = "free"
        return SubscriptionType(db_value)


class UserSubscription(Base):
    """Модель подписки пользователя."""
    
    __tablename__ = "user_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_type = Column(SubscriptionTypeDB(), nullable=False, default=SubscriptionType.FREE)
    status = Column(Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    
    # Лимиты подписки
    monthly_credits = Column(Integer, nullable=False, default=100)  # Для FREE/BASE: 100 кредитов
    monthly_photos = Column(Integer, nullable=False, default=5)  # Для FREE/BASE: 5 генераций фото
    monthly_messages = Column(Integer, nullable=False, default=0)  # Для FREE: 10 сообщений; 0 = без лимита
    max_message_length = Column(Integer, nullable=False, default=100)  # Максимальная длина сообщения
    
    # Использование в текущем месяце
    used_credits = Column(Integer, nullable=False, default=0)
    used_photos = Column(Integer, nullable=False, default=0)
    used_messages = Column(Integer, nullable=False, default=0)  # Для FREE: счётчик сообщений (лимит 10)
    
    # Даты
    activated_at = Column(DateTime, nullable=False, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    last_reset_at = Column(DateTime, nullable=False, default=func.now())
    
    # Связи
    user = relationship(
        "Users",
        back_populates="subscription",
        passive_deletes=True,
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Устанавливаем дату истечения на месяц вперед
        if not self.expires_at:
            self.expires_at = datetime.utcnow() + timedelta(days=30)
    
    @property
    def is_active(self) -> bool:
        """Проверяет, активна ли подписка."""
        return (
            self.status == SubscriptionStatus.ACTIVE and 
            self.expires_at > datetime.utcnow()
        )
    
    @property
    def days_until_expiry(self) -> int:
        """Возвращает количество дней до истечения подписки."""
        if not self.is_active:
            return 0
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
    
    @property
    def credits_remaining(self) -> int:
        """Возвращает оставшиеся кредиты."""
        return max(0, self.monthly_credits - self.used_credits)
    
    @property
    def photos_remaining(self) -> int:
        """Возвращает оставшиеся генерации фото."""
        return max(0, self.monthly_photos - self.used_photos)
    
    @property
    def messages_remaining(self) -> int:
        """Возвращает оставшиеся сообщения (для FREE при monthly_messages > 0)."""
        if self.monthly_messages <= 0:
            return -1  # без лимита
        return max(0, self.monthly_messages - self.used_messages)
    
    def can_use_credits(self, amount: int) -> bool:
        """Проверяет, может ли пользователь потратить указанное количество кредитов."""
        return self.is_active and self.credits_remaining >= amount
    
    def can_generate_photo(self) -> bool:
        """
        Проверяет, может ли пользователь сгенерировать фото.
        Для FREE: проверяет оставшиеся генерации фото (лимит 5).
        Для STANDARD и PREMIUM: только проверяет активность подписки (кредиты проверяются отдельно через user.coins).
        """
        if not self.is_active:
            return False
        
        # Для STANDARD и PREMIUM - нет лимита на фото, генерация оплачивается только кредитами с баланса
        if self.subscription_type in (SubscriptionType.STANDARD, SubscriptionType.PREMIUM):
            return True  # Достаточно активной подписки, кредиты проверяются через user.coins
        
        # Для FREE - проверяем только оставшиеся генерации фото (лимит 5)
        return self.photos_remaining > 0
    
    def can_send_message(self, message_length: int) -> bool:
        """
        Проверяет, может ли пользователь отправить сообщение заданной длины.
        Для FREE: также проверяет лимит 10 сообщений (used_messages < monthly_messages).
        """
        if not self.is_active or message_length > self.max_message_length:
            return False
        if self.monthly_messages > 0 and self.used_messages >= self.monthly_messages:
            return False
        return True
    
    def use_credits(self, amount: int) -> bool:
        """Тратит кредиты пользователя."""
        if not self.can_use_credits(amount):
            return False
        
        self.used_credits += amount
        return True
    
    def use_photo_generation(self) -> bool:
        """
        Тратит одну генерацию фото.
        Для STANDARD и PREMIUM: ничего не делает (кредиты списываются с user.coins отдельно).
        Для FREE: увеличивает счётчик used_photos (лимит 5 генераций).
        """
        if not self.can_generate_photo():
            return False
        
        # Для STANDARD и PREMIUM - ничего не делаем, кредиты списываются с user.coins
        if self.subscription_type in (SubscriptionType.STANDARD, SubscriptionType.PREMIUM):
            return True  # Кредиты уже списаны через coins_service.spend_coins()
        
        # Для FREE - увеличиваем счётчик генераций (лимит 5)
        if self.photos_remaining > 0:
            self.used_photos += 1
            return True
        
        # Если лимит исчерпан - возвращаем False (больше генерировать нельзя)
        return False
    
    def reset_monthly_limits(self):
        """Сбрасывает месячные лимиты."""
        self.used_credits = 0
        self.used_photos = 0
        self.last_reset_at = datetime.utcnow()
        # Продлеваем подписку на месяц
        self.expires_at = datetime.utcnow() + timedelta(days=30)
    
    def should_reset_limits(self) -> bool:
        """Проверяет, нужно ли сбросить месячные лимиты."""
        now = datetime.utcnow()
        # Сбрасываем каждый месяц
        return (now - self.last_reset_at).days >= 30
    
    def to_dict(self) -> dict:
        """Преобразует объект в словарь."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "subscription_type": self.subscription_type.value,
            "status": self.status.value,
            "monthly_credits": self.monthly_credits,
            "monthly_photos": self.monthly_photos,
            "monthly_messages": self.monthly_messages,
            "max_message_length": self.max_message_length,
            "used_credits": self.used_credits,
            "used_photos": self.used_photos,
            "used_messages": self.used_messages,
            "credits_remaining": self.credits_remaining,
            "photos_remaining": self.photos_remaining,
            "messages_remaining": self.messages_remaining if self.monthly_messages > 0 else None,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_reset_at": self.last_reset_at.isoformat() if self.last_reset_at else None,
            "is_active": self.is_active,
            "days_until_expiry": self.days_until_expiry
        }
