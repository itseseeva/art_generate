"""
Authentication dependencies.
"""

import jwt
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.db_depends import get_db
from app.models.user import Users
from app.schemas.auth import TokenData
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_user, TTL_USER
)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Users:
    """Get current user by token."""
    import logging
    logger = logging.getLogger(__name__)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("Email not found in token")
            raise credentials_exception
        token_data = TokenData(email=email)
        logger.debug(f"Token valid for user: {email}")
    except jwt.PyJWTError as e:
        logger.warning(f"Token decoding error: {e}")
        raise credentials_exception
    
    try:
        cache_key = key_user(token_data.email)
        
        # Пытаемся получить из кэша (cache_get уже имеет внутренний таймаут)
        # Используем очень короткий таймаут, чтобы не блокировать запросы
        cached_user = await cache_get(cache_key, timeout=0.5)
        
        if cached_user is not None:
            # Восстанавливаем объект Users из словаря
            # username может быть None для старых пользователей - это нормально
            user = Users(
                id=cached_user.get("id"),
                email=cached_user.get("email"),
                username=cached_user.get("username"),  # Может быть None
                avatar_url=cached_user.get("avatar_url"),  # Может быть None
                password_hash=cached_user.get("password_hash"),
                is_active=cached_user.get("is_active", True),
                coins=cached_user.get("coins", 0)
            )
            logger.debug(f"User found in cache: {user.id}")
            return user
        
        result = await db.execute(select(Users).filter(Users.email == token_data.email))
        user = result.scalar_one_or_none()
        if user is None:
            logger.warning(f"User not found: {email}")
            raise credentials_exception
        
        # Сохраняем в кэш актуальные данные (cache_set уже имеет внутренний таймаут)
        try:
            user_dict = {
                "id": getattr(user, "id", None),
                "email": getattr(user, "email", None),
                "username": getattr(user, "username", None),
                "avatar_url": getattr(user, "avatar_url", None),
                "password_hash": getattr(user, "password_hash", None),
                "is_active": getattr(user, "is_active", True),
                "coins": getattr(user, "coins", 0)
            }
            # Сохраняем с таймаутом (не блокируем ответ при ошибке)
            await cache_set(cache_key, user_dict, ttl_seconds=TTL_USER, timeout=1.0)
        except Exception as cache_error:
            logger.warning(f"Не удалось сохранить пользователя в кэш: {cache_error}")
        
        logger.debug(f"User found: {user.id}")
        return user
    except Exception as e:
        logger.error(f"Database error in get_current_user: {e}")
        raise credentials_exception


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[Users]:
    """Get current user by token, returns None if not authenticated."""
    import logging
    logger = logging.getLogger(__name__)
    
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        return None
    
    try:
        result = await db.execute(select(Users).filter(Users.email == token_data.email))
        user = result.scalar_one_or_none()
        return user
    except Exception as e:
        logger.error(f"Database error in get_current_user_optional: {e}")
        return None


async def get_current_active_user(current_user: Users = Depends(get_current_user)) -> Users:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def create_jwt_token(data: dict, expires_delta: timedelta) -> str:
    """Создает JWT токен."""
    from datetime import datetime, timezone
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
