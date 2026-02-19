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
    monthly_photos = Column(Integer, nullable=False, default=5)  # Для FREE/BASE: 5 генераций фото
    monthly_messages = Column(Integer, nullable=False, default=5)  # Для FREE: 5 сообщений; 0 = без лимита
    max_message_length = Column(Integer, nullable=False, default=100)  # Максимальная длина сообщения
    
    # Использование в текущем месяце
    used_photos = Column(Integer, nullable=False, default=0)
    used_messages = Column(Integer, nullable=False, default=0)  # Для FREE: счётчик сообщений (лимит 10)
    
    # Новые лимиты для изображений и голоса
    images_limit = Column(Integer, nullable=False, default=5)  # Лимит генераций изображений
    images_used = Column(Integer, nullable=False, default=0)  # Использовано генераций изображений
    voice_limit = Column(Integer, nullable=False, default=5)  # Лимит генераций голоса
    voice_used = Column(Integer, nullable=False, default=0)  # Использовано генераций голоса
    
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
    def photos_remaining(self) -> int:
        """Возвращает оставшиеся генерации фото."""
        return max(0, self.monthly_photos - self.used_photos)
    
    @property
    def messages_remaining(self) -> int:
        """Возвращает оставшиеся сообщения (для FREE при monthly_messages > 0)."""
        if self.monthly_messages <= 0:
            return -1  # без лимита
        return max(0, self.monthly_messages - self.used_messages)
    
    @property
    def images_remaining(self) -> int:
        """Возвращает оставшиеся генерации изображений."""
        return max(0, self.images_limit - self.images_used)
    
    @property
    def voice_remaining(self) -> int:
        """Возвращает оставшиеся единицы голоса."""
        return max(0, self.voice_limit - self.voice_used)
    
    def can_generate_photo(self) -> bool:
        """
        Проверяет, может ли пользователь сгенерировать фото.
        Использует новую систему лимитов: проверяет images_remaining.
        """
        # Проверяем лимит изображений
        # ВАЖНО: Если у пользователя есть оставшиеся генерации (accumulated logic),
        # мы разрешаем их тратить даже если срок подписки технически истек (expires_at),
        # но сама подписка не отменена и не забанена (status == ACTIVE).
        if self.status != SubscriptionStatus.ACTIVE:
            return False
            
        return self.images_remaining > 0
    
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
    
    def use_photo_generation(self) -> bool:
        """
        Тратит одну генерацию фото.
        Использует новую систему лимитов: увеличивает images_used.
        """
        if not self.can_generate_photo():
            return False
        
        # Увеличиваем счётчик использованных генераций
        self.images_used += 1
        return True
    
    def can_use_voice(self, cost: int) -> bool:
        """
        Проверяет, может ли пользователь использовать голос с указанной стоимостью.
        Аналогично фото, разрешаем использовать накопленный лимит, если статус ACTIVE,
        даже если expires_at уже прошел.
        """
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        return self.voice_used + cost <= self.voice_limit
    
    def use_voice(self, cost: int) -> bool:
        """Использует единицы голоса."""
        if not self.can_use_voice(cost):
            return False
        self.voice_used += cost
        return True
    
    def reset_monthly_limits(self):
        """
        Сбрасывает месячные лимиты ТОЛЬКО для FREE подписки.
        Для STANDARD и PREMIUM лимиты НЕ сбрасываются - они накапливаются!
        """
        # Сбрасываем только для FREE подписки
        if self.subscription_type == SubscriptionType.FREE:
            self.used_photos = 0
            self.used_messages = 0
            self.images_used = 0
            self.voice_used = 0
            
            self.last_reset_at = datetime.utcnow()
            
            # Продлеваем дату окончания только для FREE
            new_expiry = datetime.utcnow() + timedelta(days=31)
            if self.expires_at < new_expiry:
                self.expires_at = new_expiry
    
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
            "monthly_photos": self.monthly_photos,
            "monthly_messages": self.monthly_messages,
            "max_message_length": self.max_message_length,
            "used_photos": self.used_photos,
            "used_messages": self.used_messages,
            "photos_remaining": self.photos_remaining,
            "messages_remaining": self.messages_remaining if self.monthly_messages > 0 else None,
            # Новые поля для лимитов изображений и голоса
            "images_limit": self.images_limit,
            "images_used": self.images_used,
            "images_remaining": self.images_remaining,
            "voice_limit": self.voice_limit,
            "voice_used": self.voice_used,
            "voice_remaining": self.voice_remaining,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_reset_at": self.last_reset_at.isoformat() if self.last_reset_at else None,
            "is_active": self.is_active,
            "days_until_expiry": self.days_until_expiry
        }
