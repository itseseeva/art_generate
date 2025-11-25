"""
Схемы для системы подписок.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SubscriptionStatsResponse(BaseModel):
    """Ответ со статистикой подписки."""
    
    subscription_type: str
    status: str
    monthly_credits: int
    monthly_photos: int
    used_credits: int
    used_photos: int
    credits_remaining: int
    photos_remaining: int
    days_left: int
    is_active: bool
    expires_at: Optional[datetime] = None
    last_reset_at: Optional[datetime] = None


class SubscriptionActivateRequest(BaseModel):
    """Запрос на активацию подписки."""
    
    subscription_type: str = Field(..., description="Тип подписки (standard, premium)")


class SubscriptionActivateResponse(BaseModel):
    """Ответ на активацию подписки."""
    
    success: bool
    message: str
    subscription: Optional[SubscriptionStatsResponse] = None


class SubscriptionInfoResponse(BaseModel):
    """Информация о подписке пользователя."""
    
    id: int
    user_id: int
    subscription_type: str
    status: str
    monthly_credits: int
    monthly_photos: int
    used_credits: int
    used_photos: int
    credits_remaining: int
    photos_remaining: int
    activated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    last_reset_at: Optional[datetime] = None
    is_active: bool
    days_until_expiry: int
