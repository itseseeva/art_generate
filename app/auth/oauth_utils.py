"""
Утилиты для OAuth аутентификации.
"""

import httpx
import secrets
import hashlib
from urllib.parse import urlencode, parse_qs
from typing import Dict, Optional
from app.auth.oauth_config import OAUTH_PROVIDERS
from app.auth.utils import hash_password, create_refresh_token, get_token_expiry
from app.models.user import Users
from app.services.subscription_service import SubscriptionService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone


def generate_state() -> str:
    """Генерирует случайное состояние для OAuth."""
    return secrets.token_urlsafe(32)


def generate_oauth_url(provider: str, state: str) -> str:
    """Генерирует URL для OAuth авторизации."""
    if provider not in OAUTH_PROVIDERS:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    config = OAUTH_PROVIDERS[provider]
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "scope": config["scope"],
        "response_type": "code",
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    return f"{config['authorize_url']}?{urlencode(params)}"


async def exchange_code_for_token(provider: str, code: str) -> Dict:
    """Обменивает код авторизации на токен доступа."""
    if provider not in OAUTH_PROVIDERS:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    config = OAUTH_PROVIDERS[provider]
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config["token_url"],
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": config["redirect_uri"]
                },
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            print(f"OAuth token exchange error: {e.response.status_code}")
            print(f"Error response: {error_detail}")
            raise


async def get_user_info(provider: str, access_token: str) -> Dict:
    """Получает информацию о пользователе от OAuth провайдера."""
    if provider not in OAUTH_PROVIDERS:
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    config = OAUTH_PROVIDERS[provider]
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                config["user_info_url"],
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            print(f"OAuth user info error: {e.response.status_code}")
            print(f"Error response: {error_detail}")
            raise


async def get_or_create_oauth_user(
    provider: str, 
    user_info: Dict, 
    db: AsyncSession
) -> Users:
    """Получает или создает пользователя на основе OAuth данных."""
    email = user_info.get("email")
    if not email:
        raise ValueError("Email not provided by OAuth provider")
    
    # Ищем существующего пользователя
    result = await db.execute(select(Users).filter(Users.email == email))
    user = result.scalar_one_or_none()
    
    if user:
        # Пользователь существует, обновляем статус верификации
        if not user.is_verified:
            user.is_verified = True
            await db.commit()
        return user
    
    # Создаем нового пользователя
    # Для OAuth пользователей используем случайный пароль
    random_password = secrets.token_urlsafe(32)
    password_hash = hash_password(random_password)
    
    user = Users(
        email=email,
        password_hash=password_hash,
        is_active=True,
        is_verified=True  # OAuth пользователи автоматически верифицированы
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Активируем подписку Free для нового OAuth пользователя
    try:
        print(f"🔍 DEBUG: Активация подписки Free для OAuth пользователя {user.id}")
        subscription_service = SubscriptionService(db)
        await subscription_service.create_subscription(user.id, "free")
        print(f"[OK] DEBUG: Подписка Free успешно активирована для OAuth пользователя {user.id}")
    except Exception as e:
        print(f"[ERROR] DEBUG: Ошибка активации подписки Free для OAuth пользователя {user.id}: {e}")
        # Не прерываем регистрацию из-за ошибки подписки
    
    return user


def create_oauth_tokens(user: Users) -> Dict:
    """Создает токены для OAuth пользователя."""
    from app.auth.dependencies import create_jwt_token
    from datetime import timedelta
    
    # Создаем access token
    access_token_expires = timedelta(minutes=480)  # Увеличиваем до 8 часов
    access_token = create_jwt_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    # Создаем refresh token
    refresh_token = create_refresh_token()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
