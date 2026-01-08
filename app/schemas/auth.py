"""
Pydantic схемы для аутентификации.
"""

from datetime import datetime
import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class BaseSchema(BaseModel):
    """Базовая схема с настройками Pydantic."""
    
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    """Схема для создания пользователя при регистрации"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=100)
    fingerprint_id: str | None = Field(None, max_length=255)  # Уникальный идентификатор устройства
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Валидация username"""
        if not v or not v.strip():
            raise ValueError('Имя пользователя обязательно')
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(v) > 30:
            raise ValueError('Имя пользователя не должно превышать 30 символов')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Валидация пароля"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v


class UserUpdate(BaseModel):
    """Схема для обновления пользователя"""
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Схема для ответа с пользователем"""
    id: int
    email: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_admin: Optional[bool] = False  # Может быть None, по умолчанию False
    coins: int = 5
    created_at: Optional[datetime] = None
    subscription: Optional[dict] = None  # Информация о подписке

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """Схема для входа пользователя"""
    email: EmailStr
    password: str
    verification_code: Optional[str] = None


class ConfirmRegistrationRequest(BaseModel):
    """Схема для подтверждения регистрации с кодом верификации"""
    email: EmailStr
    verification_code: str
    fingerprint_id: str | None = Field(None, max_length=255)  # Уникальный идентификатор устройства


class Token(BaseModel):
    """Схема для токена"""
    access_token: str
    token_type: str = "bearer"


class TokenResponse(BaseModel):
    """Схема для ответа с токенами"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Схема для обновления токена"""
    refresh_token: str


class TokenData(BaseModel):
    """Схема для данных токена"""
    email: Optional[str] = None


class Message(BaseModel):
    """Схема для сообщений"""
    message: str = Field(..., description="Сообщение")


class TipCreatorRequest(BaseModel):
    """Схема для отправки благодарности создателю персонажа"""
    character_name: str = Field(..., description="Имя персонажа")
    amount: int = Field(..., ge=1, le=1000, description="Количество кредитов (от 1 до 1000)")
    message: Optional[str] = Field(None, max_length=500, description="Необязательное сообщение")


class TipCreatorResponse(BaseModel):
    """Схема ответа на благодарность"""
    success: bool
    message: str
    sender_coins_remaining: int
    receiver_coins_total: int
    creator_email: str


class TipMessageResponse(BaseModel):
    """Схема сообщения благодарности"""
    id: int
    sender_id: int
    sender_email: str
    sender_username: Optional[str]
    sender_avatar_url: Optional[str] = None
    character_id: int
    character_name: str
    amount: int
    message: Optional[str]
    is_read: bool
    created_at: datetime


class SetUsernameRequest(BaseModel):
    """Схема для установки username после OAuth"""
    username: str = Field(..., min_length=3, max_length=30)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Валидация username"""
        if not v or not v.strip():
            raise ValueError('Имя пользователя обязательно')
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(v) > 30:
            raise ValueError('Имя пользователя не должно превышать 30 символов')
        return v


class UpdateUsernameRequest(BaseModel):
    """Схема для обновления username"""
    username: str = Field(..., min_length=3, max_length=30)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Валидация username"""
        if not v or not v.strip():
            raise ValueError('Имя пользователя обязательно')
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Имя пользователя должно содержать минимум 3 символа')
        if len(v) > 30:
            raise ValueError('Имя пользователя не должно превышать 30 символов')
        return v


class RequestEmailChangeRequest(BaseModel):
    """Схема для запроса смены email"""
    new_email: EmailStr


class ConfirmEmailChangeRequest(BaseModel):
    """Схема для подтверждения смены email"""
    new_email: EmailStr
    verification_code: str


class RequestPasswordChangeRequest(BaseModel):
    """Схема для запроса смены пароля"""
    pass  # Не требует данных, код отправляется на текущий email


class VerifyPasswordChangeCodeRequest(BaseModel):
    """Схема для проверки кода верификации при смене пароля"""
    verification_code: str


class ConfirmPasswordChangeRequest(BaseModel):
    """Схема для подтверждения смены пароля (код уже проверен)"""
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """Валидация пароля"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v


class RequestPasswordChangeWithOldPasswordRequest(BaseModel):
    """Схема для запроса смены пароля с проверкой старого пароля"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """Валидация пароля"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v


class ConfirmPasswordChangeWithCodeRequest(BaseModel):
    """Схема для подтверждения смены пароля с кодом верификации"""
    verification_code: str


class UserPhotoResponse(BaseModel):
    """Схема для фото пользователя"""
    id: int
    image_url: str | None
    image_filename: str | None
    character_name: str
    created_at: str


class UserGalleryResponse(BaseModel):
    """Схема для галереи фото пользователя"""
    photos: list[UserPhotoResponse]
    total: int


class AddPhotoToGalleryRequest(BaseModel):
    """Схема для добавления фото в галерею"""
    image_url: str
    character_name: str | None = None


class UnlockUserGalleryRequest(BaseModel):
    """Схема для открытия галереи пользователя"""
    user_id: int = Field(..., description="ID пользователя, галерею которого нужно открыть")


class ForgotPasswordRequest(BaseModel):
    """Схема для запроса восстановления пароля"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Схема для сброса пароля"""
    email: EmailStr
    verification_code: str
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """Валидация пароля"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну заглавную букву')
        if not re.search(r'[a-z]', v):
            raise ValueError('Пароль должен содержать хотя бы одну строчную букву')
        if not re.search(r'\d', v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        return v
