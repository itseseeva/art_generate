"""
Модели пользователей для системы аутентификации.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, ForeignKey, String, Boolean, DateTime, Integer, text, JSON
)
from sqlalchemy.orm import relationship
from app.database.db import Base


class Users(Base):
    """Модель пользователя."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)  # Роль администратора
    coins = Column(Integer, default=5, nullable=False)  # Начальное количество монет
    fingerprint_id = Column(String(255), nullable=True, index=True)  # Уникальный идентификатор устройства
    total_messages_sent = Column(Integer, default=0, nullable=False)  # Общее количество отправленных сообщений (не уменьшается при удалении истории)
    created_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    verification_codes = relationship(
        "EmailVerificationCode",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    subscription = relationship(
        "UserSubscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    def __repr__(self):
        """String representation of user."""
        return f"<User(id={self.id}, email='{self.email}')>"


class RefreshToken(Base):
    """Модель refresh токена."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime, 
        nullable=False, 
        server_default=text("CURRENT_TIMESTAMP")
    )
    user = relationship("Users", back_populates="refresh_tokens")


class EmailVerificationCode(Base):
    """Модель кода верификации email."""
    __tablename__ = "email_verification_codes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    code_type = Column(String, nullable=True, default="email_verification")  # email_verification, email_change, password_change
    extra_data = Column(JSON, nullable=True)  # Для хранения дополнительных данных (например, new_email)

    user = relationship("Users", back_populates="verification_codes")
