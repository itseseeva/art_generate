"""
Роутеры для аутентификации.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Body, Query
from sqlalchemy import select, update, func, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
import traceback
import os
from pathlib import Path
import uuid
import shutil
import asyncio
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, 
    TokenResponse, RefreshTokenRequest, Message,
    TipCreatorRequest, TipCreatorResponse, TipMessageResponse, SetUsernameRequest,
    UpdateUsernameRequest, RequestEmailChangeRequest, ConfirmEmailChangeRequest,
    RequestPasswordChangeRequest, VerifyPasswordChangeCodeRequest, ConfirmPasswordChangeRequest,
    RequestPasswordChangeWithOldPasswordRequest, ConfirmPasswordChangeWithCodeRequest,
    UserPhotoResponse, UserGalleryResponse, AddPhotoToGalleryRequest, UnlockUserGalleryRequest,
    ConfirmRegistrationRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from app.database.db_depends import get_db
from app.models.user import Users, RefreshToken, EmailVerificationCode
from app.models.chat_history import ChatHistory
from app.models.user_gallery import UserGallery
from app.models.user_gallery_unlock import UserGalleryUnlock
from app.models.subscription import UserSubscription, SubscriptionType
from app.chat_bot.models.models import TipMessage
from app.auth.utils import (
    hash_password, verify_password, hash_token, 
    create_refresh_token, get_token_expiry, generate_verification_code, send_verification_email,
    send_password_reset_email
)
from app.auth.rate_limiter import get_rate_limiter, RateLimiter
from app.auth.dependencies import get_current_user
from app.services.subscription_service import SubscriptionService
from app.services.profit_activate import emit_profile_update
from app.tasks.email_tasks import send_email_task
import jwt
import time
import logging

logger = logging.getLogger(__name__)

auth_router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа

# Импорты для работы с Redis кэшем
from app.utils.redis_cache import (
    cache_set_json, cache_get_json, cache_delete,
    key_registration_data, key_password_change_data
)
REFRESH_TOKEN_EXPIRE_DAYS = 30  # Увеличиваем до 30 дней


def create_jwt_token(data: dict, expires_delta: timedelta) -> str:
    """Creates JWT token with specified expiration time."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def activate_free_subscription(user_id: int, db: AsyncSession) -> None:
    """Активирует бесплатную подписку Free для нового пользователя."""
    try:
        print(f"[DEBUG] Активация бесплатной подписки Free для пользователя {user_id}")
        subscription_service = SubscriptionService(db)
        await subscription_service.create_subscription(user_id, "free")
        print(f"[OK] Подписка Free успешно активирована для пользователя {user_id}")
    except Exception as e:
        print(f"[ERROR] Ошибка активации подписки Free для пользователя {user_id}: {e}")
        await db.rollback()
        # Не прерываем регистрацию из-за ошибки подписки


@auth_router.post("/auth/register/", response_model=Message)
async def create_user(
    user: UserCreate, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Начинает регистрацию нового пользователя. Сохраняет данные во временное хранилище
    и отправляет код верификации на email. Пользователь будет создан только после
    подтверждения кода через /auth/confirm-registration/.

    Parameters:
    - user: Data for registering a new user.
    - request: Request object для получения IP адреса.

    Returns:
    - Message: Сообщение об успешной отправке кода.
    """
    # Получаем IP адрес клиента
    from app.utils.geo_utils import get_client_ip
    client_ip = get_client_ip(request)
    
    # Log registration start
    logger.info(f"Starting registration for email: {user.email}, IP: {client_ip}")
    print(f"Starting registration for email: {user.email}, IP: {client_ip}")
    
    # Check if user already exists
    result = await db.execute(select(Users).filter(Users.email == user.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Check if username already exists
    username_result = await db.execute(select(Users).filter(Users.username == user.username))
    existing_username = username_result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    # Hash password
    hashed_password = hash_password(user.password)
    
    # Generate new verification code (всегда новый код при повторной регистрации)
    verification_code = generate_verification_code()
    
    # КРИТИЧНО: fingerprint_id обязателен для защиты от множественных регистраций
    if not user.fingerprint_id:
        logger.warning(f"Registration without fingerprint_id blocked for email: {user.email}")
        raise HTTPException(
            status_code=400,
            detail="fingerprint_id обязателен для регистрации"
        )
    
    # Проверяем, использовался ли этот fingerprint_id для регистрации (ЛЮБОЙ тип подписки)
    # Для IP адресов в списке исключений пропускаем проверку fingerprint_id
    allowed_ips = ['127.0.0.1', 'localhost', '::1', '77.73.133.2']
    if client_ip not in allowed_ips:
        fingerprint_result = await db.execute(
            select(Users).filter(Users.fingerprint_id == user.fingerprint_id).limit(1)
        )
        existing_fingerprint_user = fingerprint_result.scalars().first()
        if existing_fingerprint_user:
            logger.warning(
                f"Registration blocked: fingerprint_id {user.fingerprint_id} "
                f"already used by user {existing_fingerprint_user.email}, IP: {client_ip}"
            )
            raise HTTPException(
                status_code=403,
                detail="С этого устройства уже зарегистрирован аккаунт. Нельзя регистрировать несколько аккаунтов с одного устройства."
            )
    
    # BEST PRACTICE: Проверяем IP-адрес - не более 1 регистрации с одного IP
    # Это защищает от регистрации через разные браузеры/инкогнито с одного компьютера
    # IP адреса в списке исключений могут создавать неограниченное количество аккаунтов
    if client_ip and client_ip not in ['127.0.0.1', 'localhost', '::1', '77.73.133.2']:
        ip_result = await db.execute(
            select(Users).filter(Users.registration_ip == client_ip).limit(1)
        )
        existing_ip_user = ip_result.scalars().first()
        if existing_ip_user:
            logger.warning(
                f"Registration blocked: IP {client_ip} already used by user {existing_ip_user.email}, "
                f"attempted registration: {user.email}, fingerprint: {user.fingerprint_id}"
            )
            raise HTTPException(
                status_code=403,
                detail="Нельзя регистрировать новый аккаунт."
            )
    
    # Сохраняем данные регистрации во временное хранилище (Redis)
    # Если данные уже есть - они будут перезаписаны новым кодом
    registration_data = {
        "email": user.email,
        "username": user.username,
        "password_hash": hashed_password,
        "verification_code": verification_code,
        "fingerprint_id": user.fingerprint_id,
        "registration_ip": client_ip
    }
    
    # Сохраняем в Redis на 1 час (3600 секунд)
    # Если данные уже есть - они будут обновлены с новым кодом
    cache_key = key_registration_data(user.email)
    logger.info(f"[REGISTRATION] Saving registration data to Redis, email: {user.email}, key: {cache_key}")
    save_result = await cache_set_json(cache_key, registration_data, ttl_seconds=3600, timeout=2.0)
    
    if not save_result:
        logger.error(f"[REGISTRATION] Failed to save registration data to Redis for email: {user.email}, key: {cache_key}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка сохранения данных регистрации. Попробуйте позже."
        )
    
    # Проверяем, что данные действительно сохранились
    verify_data = await cache_get_json(cache_key)
    if not verify_data:
        logger.error(f"[REGISTRATION] Registration data saved but cannot be retrieved from Redis for email: {user.email}, key: {cache_key}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка сохранения данных регистрации. Попробуйте позже."
        )
    
    logger.info(f"[REGISTRATION] Registration data saved and verified in Redis for email: {user.email}, key: {cache_key}, code: {verification_code}")
    
    # Send verification email через Celery (не блокируем ответ)
    # Код уже сохранён в Redis, поэтому пользователь может ввести код
    # даже если email ещё не отправился
    # Celery автоматически перезапустит задачу при ошибках (до 3 попыток)
    try:
        send_email_task.delay(user.email, verification_code)
        logger.info(f"[REGISTRATION] Email task queued for {user.email}")
        print(f"Verification email task queued for {user.email} (new code generated)")
    except Exception as e:
        # Если Celery недоступен, логируем ошибку, но не блокируем регистрацию
        logger.warning(f"[REGISTRATION] Failed to queue email task for {user.email}: {e}")
        print(f"Warning: Email task not queued for {user.email}, but code is saved in Redis")
    
    return Message(message="Verification code sent to email")


@auth_router.post("/auth/confirm-registration/", response_model=TokenResponse)
async def confirm_registration(
    confirm_data: ConfirmRegistrationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждает регистрацию пользователя с помощью кода верификации.
    Создает пользователя в базе данных только после успешной проверки кода.

    Parameters:
    - confirm_data: Email и код верификации.

    Returns:
    - TokenResponse: Access и refresh токены.
    """
    logger.info(f"Confirming registration for email: {confirm_data.email}")
    
    try:
        # Получаем данные регистрации из временного хранилища
        cache_key = key_registration_data(confirm_data.email)
        logger.info(f"[REGISTRATION] Attempting to get registration data from Redis, key: {cache_key}")
        # Увеличиваем таймаут для критичной операции чтения данных регистрации
        registration_data = await cache_get_json(cache_key, timeout=2.0)
        
        if not registration_data:
            logger.warning(f"[REGISTRATION] Registration data not found in Redis for email: {confirm_data.email}, key: {cache_key}")
            raise HTTPException(
                status_code=400,
                detail="Registration data not found or expired. Please register again."
            )
        
        logger.info(f"[REGISTRATION] Registration data found in Redis for email: {confirm_data.email}")
        
        # Проверяем код верификации
        if registration_data.get("verification_code") != confirm_data.verification_code:
            raise HTTPException(
                status_code=400,
                detail="Invalid verification code"
            )
        
        # Обновляем fingerprint_id из запроса подтверждения (если он был передан)
        fingerprint_id = confirm_data.fingerprint_id or registration_data.get("fingerprint_id")
        if fingerprint_id:
            registration_data["fingerprint_id"] = fingerprint_id
        
        # КРИТИЧНО: fingerprint_id обязателен перед созданием пользователя
        if not fingerprint_id:
            logger.warning(f"Registration confirmation without fingerprint_id blocked for email: {confirm_data.email}")
            await cache_delete(cache_key)
            raise HTTPException(
                status_code=400,
                detail="fingerprint_id обязателен для регистрации"
            )
        
        # Получаем IP адрес - приоритет у сохраненного IP из registration_data
        # Если не сохранен, получаем из текущего запроса
        saved_ip = registration_data.get("registration_ip")
        from app.utils.geo_utils import get_client_ip
        current_ip = get_client_ip(request)
        
        # Используем сохраненный IP (с этапа регистрации), если есть
        # Иначе используем текущий IP
        client_ip = saved_ip or current_ip
        
        # Проверяем, использовался ли этот fingerprint_id для регистрации (ЛЮБОЙ тип подписки)
        # Для IP адресов в списке исключений пропускаем проверку fingerprint_id
        allowed_ips = ['127.0.0.1', 'localhost', '::1', '77.73.133.2']
        if client_ip not in allowed_ips:
            fingerprint_result = await db.execute(
                select(Users).filter(Users.fingerprint_id == fingerprint_id).limit(1)
            )
            existing_fingerprint_user = fingerprint_result.scalars().first()
            if existing_fingerprint_user:
                await cache_delete(cache_key)
                logger.warning(
                    f"Registration confirmation blocked: fingerprint_id {fingerprint_id} "
                    f"already used by user {existing_fingerprint_user.email}, IP: {client_ip}"
                )
                raise HTTPException(
                    status_code=403,
                    detail="С этого устройства уже зарегистрирован аккаунт. Нельзя регистрировать несколько аккаунтов с одного устройства."
                )
        
        # BEST PRACTICE: Проверяем IP-адрес перед созданием пользователя
        # Это защищает от регистрации через разные браузеры/инкогнито с одного компьютера
        # Проверяем как сохраненный IP, так и текущий IP из запроса
        # IP адреса в списке исключений могут создавать неограниченное количество аккаунтов
        ips_to_check = [ip for ip in [saved_ip, current_ip] if ip and ip not in ['127.0.0.1', 'localhost', '::1', '77.73.133.2']]
        for ip_to_check in set(ips_to_check):  # set для уникальности
            ip_result = await db.execute(
                select(Users).filter(Users.registration_ip == ip_to_check).limit(1)
            )
            existing_ip_user = ip_result.scalars().first()
            if existing_ip_user:
                await cache_delete(cache_key)
                logger.warning(
                    f"Registration confirmation blocked: IP {ip_to_check} already used by user {existing_ip_user.email}, "
                    f"attempted registration: {confirm_data.email}, fingerprint: {fingerprint_id}, "
                    f"saved_ip: {saved_ip}, current_ip: {current_ip}"
                )
                raise HTTPException(
                    status_code=403,
                    detail="Нельзя регистрировать новый аккаунт."
                )
        
        # Проверяем, не создан ли уже пользователь (на случай параллельных запросов)
        result = await db.execute(select(Users).filter(Users.email == confirm_data.email).limit(1))
        existing_user = result.scalars().first()
        if existing_user:
            # Пользователь уже создан, удаляем временные данные и выполняем логин
            await cache_delete(cache_key)
            # Создаем токены для существующего пользователя
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_jwt_token(
                data={"sub": existing_user.email},
                expires_delta=access_token_expires
            )
            refresh_token = create_refresh_token()
            
            # Сохраняем refresh token
            db_refresh_token = RefreshToken(
                user_id=existing_user.id,
                token_hash=hash_token(refresh_token),
                expires_at=get_token_expiry(days=REFRESH_TOKEN_EXPIRE_DAYS)
            )
            db.add(db_refresh_token)
            await db.commit()
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer"
            )
        
        # IP адрес уже получен выше, используем его для сохранения
        
        # Определяем страну по IP адресу
        # Ошибка определения страны не должна прерывать регистрацию
        from app.utils.geo_utils import get_country_by_ip
        country = None
        if client_ip:
            try:
                country = await get_country_by_ip(client_ip)
                logger.info(
                    f"[REGISTRATION] User {registration_data['email']} "
                    f"registering from IP: {client_ip}, country: {country or 'Unknown'}"
                )
            except Exception as geo_error:
                # Логируем ошибку, но не прерываем регистрацию
                logger.warning(
                    f"[REGISTRATION] Failed to determine country for IP {client_ip}: {geo_error}. "
                    f"Continuing registration without country."
                )
        
        # Создаем нового пользователя
        db_user = Users(
            email=registration_data["email"],
            username=registration_data["username"],
            password_hash=registration_data["password_hash"],
            fingerprint_id=fingerprint_id,
            registration_ip=client_ip,
            country=country,
            is_active=True,
            is_verified=True  # Пользователь верифицирован после подтверждения кода
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        # Активируем бесплатную подписку Free для нового пользователя
        await activate_free_subscription(db_user.id, db)
        
        # Удаляем временные данные из Redis
        await cache_delete(cache_key)
        
        # Создаем токены
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_jwt_token(
            data={"sub": db_user.email},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token()
        
        # Сохраняем refresh token
        db_refresh_token = RefreshToken(
            user_id=db_user.id,
            token_hash=hash_token(refresh_token),
            expires_at=get_token_expiry(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(db_refresh_token)
        await db.commit()
        
        logger.info(f"User {db_user.email} registered and verified successfully")
        print(f"User {db_user.email} registered and verified successfully")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration confirmation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Registration confirmation failed: {str(e)}")


@auth_router.post("/auth/login/", response_model=TokenResponse)
async def login_user(
    user_credentials: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Authenticates user and returns tokens.

    Parameters:
    - user_credentials: User login credentials.
    - request: Request object (для определения IP).
    - db: Database session.
    - rate_limiter: Rate limiter instance.

    Returns:
    - TokenResponse: Access and refresh tokens.
    """
    logger.info(f"Login attempt for email: {user_credentials.email}")
    try:
        # Rate limiting
        if not rate_limiter.is_allowed(user_credentials.email):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
    
        # Find user
        result = await db.execute(select(Users).filter(Users.email == user_credentials.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(user_credentials.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )
    
        if not user.is_active:
            raise HTTPException(
                status_code=400,
                detail="Inactive user"
            )
        
        if not user.is_verified and not user_credentials.verification_code:
            raise HTTPException(
                status_code=400,
                detail="Подтвердите email: проверьте почту и введите код из письма"
            )
    
        # Check verification code if provided
        if user_credentials.verification_code:
            result = await db.execute(select(EmailVerificationCode).filter(
                EmailVerificationCode.user_id == user.id,
                EmailVerificationCode.code == user_credentials.verification_code,
                EmailVerificationCode.code_type == "email_verification",
                EmailVerificationCode.is_used == False,
                EmailVerificationCode.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
            ))
            verification = result.scalar_one_or_none()
            
            if not verification:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid or expired verification code"
                )
            
            # Mark verification code as used
            verification.is_used = True
            user.is_verified = True
        
        # Если у пользователя нет страны или IP, пытаемся определить при логине
        geo_data_updated = False
        if not user.country or not user.registration_ip:
            try:
                from app.utils.geo_utils import get_client_ip, get_country_by_ip
                client_ip = get_client_ip(request)
                
                if client_ip:
                    # Сохраняем IP если его нет
                    if not user.registration_ip:
                        user.registration_ip = client_ip
                        geo_data_updated = True
                        logger.info(f"[LOGIN] Saved IP for existing user {user.email}: {client_ip}")
                    
                    # Определяем страну если её нет
                    if not user.country:
                        try:
                            country = await get_country_by_ip(client_ip)
                            if country:
                                user.country = country
                                geo_data_updated = True
                                logger.info(f"[LOGIN] Determined country for user {user.email}: {country}")
                        except Exception as geo_error:
                            # Логируем ошибку, но не прерываем вход
                            logger.warning(f"[LOGIN] Failed to determine country for IP {client_ip}: {geo_error}. Continuing login.")
            except Exception as e:
                logger.warning(f"[LOGIN] Failed to update geo data for user {user.email}: {e}")
                # Не прерываем логин из-за ошибки геолокации
        
        # Коммитим если были изменения (верификация или гео-данные)
        if user_credentials.verification_code or geo_data_updated:
            await db.commit()
    
        # Create tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_jwt_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
    
        refresh_token = create_refresh_token()
        refresh_token_hash = hash_token(refresh_token)
        refresh_expires = get_token_expiry(REFRESH_TOKEN_EXPIRE_DAYS)
    
        # Save refresh token
        db_refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=refresh_expires
        )
        db.add(db_refresh_token)
        await db.commit()
    
        # Проверяем и активируем бесплатную подписку Free, если её нет
        try:
            subscription_service = SubscriptionService(db)
            existing_subscription = await subscription_service.get_user_subscription(user.id)
            if not existing_subscription:
                logger.info(f"[DEBUG] У пользователя {user.email} нет подписки, активируем Free")
                await subscription_service.create_subscription(user.id, "free")
                logger.info(f"[OK] Подписка Free активирована для пользователя {user.email}")
        except Exception as e:
            logger.error(f"[ERROR] Ошибка проверки/активации подписки для пользователя {user.email}: {e}")
            import traceback
            logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
    
        logger.info(f"User {user.email} logged in successfully")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Ошибка при логине пользователя {user_credentials.email}: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@auth_router.post("/auth/refresh/", response_model=TokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refreshes access token using refresh token.

    Parameters:
    - refresh_request: Refresh token request.
    - db: Database session.

    Returns:
    - TokenResponse: New access and refresh tokens.
    """
    refresh_token_hash = hash_token(refresh_request.refresh_token)
    
    # Find refresh token
    result = await db.execute(select(RefreshToken).filter(
        RefreshToken.token_hash == refresh_token_hash,
        RefreshToken.is_active == True,
        RefreshToken.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
    ))
    db_refresh_token = result.scalar_one_or_none()
    
    if not db_refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )
    
    # Get user
    result = await db.execute(select(Users).filter(Users.id == db_refresh_token.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )
    
    # Deactivate old refresh token
    db_refresh_token.is_active = False
    
    # Create new tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_jwt_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    new_refresh_token = create_refresh_token()
    new_refresh_token_hash = hash_token(new_refresh_token)
    refresh_expires = get_token_expiry(REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Save new refresh token
    new_db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token_hash,
        expires_at=refresh_expires
    )
    db.add(new_db_refresh_token)
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@auth_router.post("/auth/logout/", response_model=Message)
async def logout_user(
    refresh_request: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Logs out user by deactivating refresh token.

    Parameters:
    - refresh_request: Refresh token request (опционально). Если не передан, просто возвращаем успех.
    - db: Database session.

    Returns:
    - Message: Logout confirmation.
    """
    # Если refresh_token передан, деактивируем его
    if refresh_request and refresh_request.refresh_token:
        refresh_token_hash = hash_token(refresh_request.refresh_token)
        
        # Find and deactivate refresh token
        result = await db.execute(select(RefreshToken).filter(
            RefreshToken.token_hash == refresh_token_hash,
            RefreshToken.is_active == True
        ))
        db_refresh_token = result.scalar_one_or_none()
        
        if db_refresh_token:
            db_refresh_token.is_active = False
            await db.commit()
    
    return Message(message="Successfully logged out")


@auth_router.get("/auth/me/", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user information.

    Parameters:
    - current_user: Current authenticated user.
    - db: Database session.

    Returns:
    - UserResponse: Current user information.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        
        # Загружаем пользователя с подпиской явно
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.services.profit_activate import ProfitActivateService
        
        stmt = select(Users).options(selectinload(Users.subscription)).filter(Users.id == current_user.id)
        result = await db.execute(stmt)
        user_with_subscription = result.scalar_one_or_none()
        
        # КРИТИЧНО: Используем актуальные данные из БД, а не из кэша
        # Это гарантирует, что is_admin всегда актуален
        if user_with_subscription:
            current_user = user_with_subscription
        
        # КРИТИЧНО: Используем ProfitActivateService.get_user_subscription() для получения актуальной подписки
        # Это гарантирует, что используется самая последняя подписка (если их несколько)
        # и правильная логика кэширования
        subscription_info = None
        service = ProfitActivateService(db)
        subscription = await service.get_user_subscription(current_user.id)
        
        if subscription:
            subscription_info = {
                "subscription_type": subscription.subscription_type.value,
                "status": subscription.status.value,
                "monthly_credits": subscription.monthly_credits,
                "monthly_photos": subscription.monthly_photos,
                "max_message_length": subscription.max_message_length,
                "used_credits": subscription.used_credits,
                "used_photos": subscription.used_photos,
                "activated_at": subscription.activated_at,
                "expires_at": subscription.expires_at
            }
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            avatar_url=current_user.avatar_url,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin if current_user.is_admin is not None else False,
            coins=current_user.coins,
            created_at=current_user.created_at,
            subscription=subscription_info,
            country=current_user.country
        )
    except Exception as e:
        # Если есть ошибка с подпиской, возвращаем пользователя без подписки
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            avatar_url=current_user.avatar_url,
            is_active=current_user.is_active,
            is_admin=current_user.is_admin if current_user.is_admin is not None else False,
            coins=current_user.coins,
            created_at=current_user.created_at,
            subscription=None,
            country=current_user.country
        )


@auth_router.get("/auth/coins/")
async def get_user_coins(current_user: Users = Depends(get_current_user)):
    """Получить количество монет пользователя."""
    return {"coins": current_user.coins}


@auth_router.post("/auth/coins/add/")
async def add_coins(
    amount: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Добавить монеты пользователю (для админов или тестирования)."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    old_balance = current_user.coins
    current_user.coins += amount
    await db.flush()
    
    # Записываем историю баланса
    try:
        from app.utils.balance_history import record_balance_change
        await record_balance_change(
            db=db,
            user_id=current_user.id,
            amount=amount,
            reason="Пополнение баланса через API"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Не удалось записать историю баланса: {e}")
    
    await db.commit()
    await db.refresh(current_user)
    await emit_profile_update(current_user.id, db)
    
    return {"coins": current_user.coins, "added": amount}


@auth_router.post("/auth/coins/spend/")
async def spend_coins(
    amount: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Потратить монеты пользователя."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if current_user.coins < amount:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    old_balance = current_user.coins
    current_user.coins -= amount
    await db.flush()
    
    # Записываем историю баланса
    try:
        from app.utils.balance_history import record_balance_change
        await record_balance_change(
            db=db,
            user_id=current_user.id,
            amount=-amount,
            reason="Списание баланса через API"
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Не удалось записать историю баланса: {e}")
    
    await db.commit()
    await db.refresh(current_user)
    await emit_profile_update(current_user.id, db)
    
    return {"coins": current_user.coins, "spent": amount}


@auth_router.post("/auth/coins/tip-creator/", response_model=TipCreatorResponse)
async def tip_character_creator(
    tip_request: TipCreatorRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Поблагодарить создателя персонажа, отправив ему кредиты.
    
    Проверки безопасности:
    - Нельзя отправить кредиты себе
    - Проверка баланса отправителя
    - Лимит на количество кредитов (1-1000)
    - Проверка существования персонажа и его создателя
    """
    # Валидация количества
    if tip_request.amount <= 0:
        raise HTTPException(status_code=400, detail="Количество кредитов должно быть положительным")
    
    if tip_request.amount > 1000:
        raise HTTPException(status_code=400, detail="Максимум 1000 кредитов за один раз")
    
    # Проверка баланса отправителя
    if current_user.coins < tip_request.amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Недостаточно кредитов. У вас: {current_user.coins}, требуется: {tip_request.amount}"
        )
    
    # Найти персонажа
    from app.chat_bot.models.models import CharacterDB
    result = await db.execute(
        select(CharacterDB).where(CharacterDB.name.ilike(tip_request.character_name))
    )
    character = result.scalar_one_or_none()
    
    if not character:
        raise HTTPException(status_code=404, detail=f"Персонаж '{tip_request.character_name}' не найден")
    
    # Логирование для отладки
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[DEBUG] Персонаж '{character.name}' имеет user_id: {character.user_id}")
    
    # Если персонаж системный (без user_id), кредиты уходят в систему (не возвращаем их)
    creator = None
    if character.user_id:
        # Получить создателя персонажа
        result = await db.execute(
            select(Users).where(Users.id == character.user_id)
        )
        creator = result.scalar_one_or_none()
        
        logger.info(f"[DEBUG] Найден создатель: {creator.email if creator else 'НЕ НАЙДЕН'}")
        
        if not creator:
            raise HTTPException(status_code=404, detail=f"Создатель персонажа не найден (user_id: {character.user_id})")
        
        # ЗАЩИТА: Нельзя отправить кредиты себе (кроме админов)
        is_admin = getattr(current_user, 'is_admin', False)
        logger.info(f"[DEBUG] Текущий пользователь: {current_user.email} (ID: {current_user.id})")
        logger.info(f"[DEBUG] Создатель персонажа: {creator.email} (ID: {creator.id})")
        logger.info(f"[DEBUG] Текущий пользователь admin: {is_admin}")
        logger.info(f"[DEBUG] Проверка: creator.id ({creator.id}) == current_user.id ({current_user.id}): {creator.id == current_user.id}")
        
        if creator.id == current_user.id and not is_admin:
            logger.warning(f"[BLOCKED] Пользователь {current_user.email} пытается отправить кредиты своему персонажу - ЗАБЛОКИРОВАНО")
            raise HTTPException(
                status_code=400, 
                detail="Вы не можете отправить кредиты своему персонажу"
            )
        
        if creator.id == current_user.id and is_admin:
            logger.info(f"[DEBUG] Админ {current_user.email} отправляет кредиты себе - разрешено")
        
        logger.info(f"[DEBUG] Баланс создателя ДО: {creator.coins}")
    
    
    # Выполнить транзакцию
    try:
        from sqlalchemy import update as sqlalchemy_update
        
        logger.info(f"[TIP] Баланс отправителя ДО: {current_user.coins}")
        logger.info(f"[TIP] СПИСЫВАЕМ {tip_request.amount} кредитов у отправителя {current_user.email} (ID: {current_user.id})")
        
        # Сохраняем ID для использования в транзакции
        sender_id = current_user.id
        creator_id = creator.id if creator else None
        
        # Обновляем баланс отправителя через UPDATE
        await db.execute(
            sqlalchemy_update(Users)
            .where(Users.id == sender_id)
            .values(coins=Users.coins - tip_request.amount)
        )
        logger.info(f"[TIP] Баланс отправителя обновлен (списано {tip_request.amount})")
        
        # Если есть создатель - добавить кредиты ему
        if creator_id:
            await db.execute(
                sqlalchemy_update(Users)
                .where(Users.id == creator_id)
                .values(coins=Users.coins + tip_request.amount)
            )
            logger.info(f"[TIP] Баланс создателя обновлен (начислено {tip_request.amount})")
        else:
            logger.info(f"[TIP] Системный персонаж - кредиты сгорают")
        
        # Сохраняем сообщение благодарности в той же транзакции
        if creator:
            tip_message = TipMessage(
                sender_id=sender_id,
                receiver_id=creator_id,
                character_id=character.id,
                character_name=character.display_name or character.name,
                amount=tip_request.amount,
                message=tip_request.message if tip_request.message else None,
                is_read=False
            )
            db.add(tip_message)
            logger.info(f"[TIP MESSAGE] Сообщение добавлено в транзакцию")
        
        # Записываем историю баланса для отправителя
        try:
            from app.utils.balance_history import record_balance_change
            await record_balance_change(
                db=db,
                user_id=sender_id,
                amount=-tip_request.amount,
                reason=f"Чаевые создателю персонажа '{character.display_name or character.name}'"
            )
        except Exception as e:
            logger.warning(f"Не удалось записать историю баланса для отправителя: {e}")
        
        # Записываем историю баланса для получателя (если есть)
        if creator_id:
            try:
                from app.utils.balance_history import record_balance_change
                await record_balance_change(
                    db=db,
                    user_id=creator_id,
                    amount=tip_request.amount,
                    reason=f"Чаевые от пользователя за персонажа '{character.display_name or character.name}'"
                )
            except Exception as e:
                logger.warning(f"Не удалось записать историю баланса для получателя: {e}")
        
        # Один commit для всей транзакции
            await db.commit()
        logger.info(f"[TIP] Транзакция закоммичена")
        
        # Получаем обновлённые данные из БД ПОСЛЕ commit
        result = await db.execute(
            select(Users).where(Users.id == sender_id)
        )
        updated_sender = result.scalar_one()
        logger.info(f"[TIP] Отправитель обновлен из БД, баланс: {updated_sender.coins}")
        
        updated_creator = None
        if creator_id:
            result = await db.execute(
                select(Users).where(Users.id == creator_id)
            )
            updated_creator = result.scalar_one()
            logger.info(f"[TIP] Создатель обновлен из БД, баланс: {updated_creator.coins}")
        
        # Инвалидируем кэш пользователей
        from app.utils.redis_cache import cache_delete, key_user, key_user_coins
        await cache_delete(key_user(updated_sender.email))
        await cache_delete(key_user_coins(updated_sender.id))
        if updated_creator:
            await cache_delete(key_user(updated_creator.email))
            await cache_delete(key_user_coins(updated_creator.id))
        
        await emit_profile_update(updated_sender.id, db)
        if updated_creator:
            await emit_profile_update(updated_creator.id, db)
        
        if updated_creator:
            # Проверяем, отправил ли админ кредиты себе
            is_self_tip = updated_creator.id == sender_id
            is_admin = getattr(updated_sender, 'is_admin', False)
            
            if is_self_tip and is_admin:
                logger.info(
                    f"[TIP ADMIN] Админ {updated_sender.email} (ID: {updated_sender.id}) "
                    f"отправил себе {tip_request.amount} кредитов "
                    f"за персонажа '{character.name}'. "
                    f"Баланс теперь: {updated_creator.coins}"
                )
                message = f"[ADMIN] Вы отправили себе {tip_request.amount} кредитов за персонажа '{character.display_name or character.name}'!"
            else:
                logger.info(
                    f"[TIP] Пользователь {updated_sender.email} (ID: {updated_sender.id}) "
                    f"отправил {tip_request.amount} кредитов "
                    f"создателю {updated_creator.email} (ID: {updated_creator.id}) "
                    f"за персонажа '{character.name}'. "
                    f"Баланс создателя теперь: {updated_creator.coins}"
                )
                message = f"Вы успешно отправили {tip_request.amount} кредитов создателю персонажа '{character.display_name or character.name}'!"
        else:
            logger.info(
                f"[TIP] Пользователь {updated_sender.email} (ID: {updated_sender.id}) "
                f"отправил {tip_request.amount} кредитов "
                f"системе за персонажа '{character.name}' (системный персонаж)"
            )
            message = f"Спасибо за поддержку! Вы отправили {tip_request.amount} кредитов за персонажа '{character.display_name or character.name}'."
        
        response_data = TipCreatorResponse(
            success=True,
            message=message,
            sender_coins_remaining=updated_sender.coins,
            receiver_coins_total=updated_creator.coins if updated_creator else 0,
            creator_email=updated_creator.email if updated_creator else "Системный персонаж"
        )
        logger.info(f"[TIP] Возвращаем ответ: sender_coins_remaining={updated_sender.coins}, receiver_coins_total={updated_creator.coins if updated_creator else 0}")
        return response_data
        
    except Exception as e:
        await db.rollback()
        logger.error(f"[ERROR] Ошибка при отправке кредитов: {e}")
        logger.error(f"[ERROR] Трейсбек: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail="Произошла ошибка при отправке кредитов. Пожалуйста, попробуйте позже."
        )


@auth_router.get("/auth/tip-messages/", response_model=List[TipMessageResponse])
async def get_tip_messages(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить все сообщения благодарности для текущего пользователя (создателя персонажей).
    """
    from app.chat_bot.models.models import TipMessage
    from sqlalchemy import desc
    
    result = await db.execute(
        select(TipMessage)
        .where(TipMessage.receiver_id == current_user.id)
        .order_by(desc(TipMessage.created_at))
    )
    tip_messages = result.scalars().all()
    
    messages = []
    for tip_msg in tip_messages:
        # Получаем информацию об отправителе
        sender_result = await db.execute(
            select(Users).where(Users.id == tip_msg.sender_id)
        )
        sender = sender_result.scalar_one_or_none()
        
        messages.append(TipMessageResponse(
            id=tip_msg.id,
            sender_id=tip_msg.sender_id,
            sender_email=sender.email if sender else "Unknown",
            sender_username=sender.username if sender else None,
            sender_avatar_url=sender.avatar_url if sender else None,
            character_id=tip_msg.character_id,
            character_name=tip_msg.character_name,
            amount=tip_msg.amount,
            message=tip_msg.message,
            is_read=tip_msg.is_read,
            created_at=tip_msg.created_at
        ))
    
    return messages


@auth_router.get("/auth/tip-messages/unread-count/")
async def get_unread_tip_messages_count(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получить количество непрочитанных сообщений благодарности для текущего пользователя.
    """
    from app.chat_bot.models.models import TipMessage
    
    result = await db.execute(
        select(func.count(TipMessage.id))
        .where(
            TipMessage.receiver_id == current_user.id,
            TipMessage.is_read.is_(False)
        )
    )
    count = result.scalar() or 0
    
    return {"unread_count": count}


@auth_router.post("/auth/tip-messages/{message_id}/read/")
async def mark_tip_message_read(
    message_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Отметить сообщение благодарности как прочитанное.
    """
    from app.chat_bot.models.models import TipMessage
    
    result = await db.execute(
        select(TipMessage).where(
            TipMessage.id == message_id,
            TipMessage.receiver_id == current_user.id
        )
    )
    tip_message = result.scalar_one_or_none()
    
    if not tip_message:
        raise HTTPException(status_code=404, detail="Сообщение не найдено")
    
    tip_message.is_read = True
    await db.commit()
    
    return {"success": True, "message": "Сообщение отмечено как прочитанное"}


@auth_router.post("/auth/avatar/")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Загружает аватар пользователя в Yandex Cloud Storage."""
    logger = logging.getLogger(__name__)
    
    # Проверяем тип файла
    if not avatar.content_type or not avatar.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")
    
    try:
        logger.info(f"[AVATAR] Начало загрузки аватара для пользователя {current_user.id} ({current_user.email})")
        
        # Читаем содержимое файла
        content = await avatar.read()
        if not content:
            raise HTTPException(status_code=400, detail="Пустой файл")
        
        logger.info(f"[AVATAR] Файл прочитан, размер: {len(content)} байт, тип: {avatar.content_type}")
        
        # Генерируем уникальное имя файла
        file_extension = Path(avatar.filename).suffix if avatar.filename else '.jpg'
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex}{file_extension}"
        object_key = f"user_avatars/{unique_filename}"
        
        logger.info(f"[AVATAR] Сгенерировано имя файла: {unique_filename}, object_key: {object_key}")
        
        # Удаляем старый аватар из облака, если есть
        old_cloud_url = None
        if current_user.avatar_url and current_user.avatar_url.startswith('http'):
            # Если это URL облака, извлекаем object_key и удаляем
            old_cloud_url = current_user.avatar_url
            logger.info(f"[AVATAR] Найден старый аватар: {old_cloud_url}")
            try:
                from app.services.yandex_storage import get_yandex_storage_service
                service = get_yandex_storage_service()
                # Извлекаем object_key из URL
                # Формат: https://bucket-name.storage.yandexcloud.net/path/to/file
                if '.storage.yandexcloud.net/' in old_cloud_url:
                    old_object_key = old_cloud_url.split('.storage.yandexcloud.net/')[-1]
                    logger.info(f"[AVATAR] Удаление старого аватара из облака: {old_object_key}")
                    deleted = await service.delete_file(old_object_key)
                    if deleted:
                        logger.info(f"[OK] Старый аватар удален из облака: {old_object_key}")
                    else:
                        logger.warning(f"[WARNING] Не удалось удалить старый аватар: {old_object_key}")
            except Exception as e:
                logger.warning(f"[WARNING] Не удалось удалить старый аватар из облака: {e}")
        
        # Загружаем файл в Yandex Cloud Storage
        logger.info(f"[AVATAR] Начало загрузки в Yandex Cloud Storage...")
        try:
            from app.services.yandex_storage import get_yandex_storage_service
            service = get_yandex_storage_service()
            cloud_url = await service.upload_file(
                file_data=content,
                object_key=object_key,
                content_type=avatar.content_type or "image/jpeg",
                metadata={
                    "user_id": str(current_user.id),
                    "user_email": current_user.email,
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "source": "user_avatar_upload",
                },
            )
            logger.info(f"[OK] Аватар успешно загружен в облако: {cloud_url}")
        except Exception as upload_error:
            logger.error(f"[ERROR] Ошибка загрузки в облако: {upload_error}", exc_info=True)
            raise HTTPException(status_code=500, detail="Не удалось загрузить файл в облачное хранилище")
        
        # Обновляем URL аватара в БД используя UPDATE напрямую
        logger.info(f"[AVATAR] Обновление URL аватара в БД...")
        stmt = (
            update(Users)
            .where(Users.id == current_user.id)
            .values(avatar_url=cloud_url)
        )
        await db.execute(stmt)
        await db.commit()
        logger.info(f"[OK] URL аватара обновлен в БД: {cloud_url}")
        
        # Инвалидируем кэш пользователя
        from app.utils.redis_cache import cache_delete, key_user
        await cache_delete(key_user(current_user.email))
        logger.info(f"[OK] Кэш пользователя инвалидирован")
        
        # Отправляем обновление профиля через WebSocket
        try:
            await emit_profile_update(current_user.id, db)
            logger.info(f"[OK] Обновление профиля отправлено через WebSocket")
        except Exception as ws_error:
            logger.warning(f"[WARNING] Не удалось отправить обновление через WebSocket: {ws_error}")
        
        logger.info(f"[OK] Аватар полностью загружен для пользователя {current_user.email}: {cloud_url}")
        return {
            "avatar_url": cloud_url,
            "message": "Аватар успешно загружен"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"[ERROR] Ошибка при загрузке аватара: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка при загрузке аватара: {str(e)}")


@auth_router.post("/auth/set-username/", response_model=UserResponse)
async def set_username(
    username_request: SetUsernameRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Устанавливает username для пользователя (используется после OAuth).
    
    Parameters:
    - username_request: Данные с username.
    
    Returns:
    - UserResponse: Обновленный пользователь.
    """
    # Проверяем, что у пользователя еще нет username
    if current_user.username:
        raise HTTPException(
            status_code=400,
            detail="Username already set"
        )
    
    # Проверяем, не занят ли username
    username_result = await db.execute(select(Users).filter(Users.username == username_request.username))
    existing_username = username_result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    # Загружаем пользователя из текущей сессии для обновления
    from sqlalchemy.orm import selectinload
    user_result = await db.execute(
        select(Users)
        .options(selectinload(Users.subscription))
        .filter(Users.id == current_user.id)
    )
    db_user = user_result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Устанавливаем username
    db_user.username = username_request.username
    await db.commit()
    await db.refresh(db_user)
    
    # Инвалидируем кэш пользователя
    from app.utils.redis_cache import cache_delete, key_user
    await cache_delete(key_user(db_user.email))
    
    # Отправляем обновление профиля через WebSocket
    try:
        await emit_profile_update(db_user.id, db)
    except Exception as ws_error:
        logger.warning(f"[WARNING] Не удалось отправить обновление через WebSocket: {ws_error}")
    
    # Получаем информацию о подписке
    subscription_info = None
    if db_user.subscription:
        subscription_info = {
            "subscription_type": db_user.subscription.subscription_type.value,
            "status": db_user.subscription.status.value,
        }
    
    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        username=db_user.username,
        avatar_url=db_user.avatar_url,
        is_active=db_user.is_active,
        created_at=db_user.created_at,
        subscription=subscription_info
    )


@auth_router.put("/auth/update-username/", response_model=UserResponse)
async def update_username(
    username_request: UpdateUsernameRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновляет username пользователя.
    
    Parameters:
    - username_request: Новый username.
    
    Returns:
    - UserResponse: Обновленный пользователь.
    """
    # Проверяем, не занят ли username
    username_result = await db.execute(select(Users).filter(Users.username == username_request.username))
    existing_username = username_result.scalar_one_or_none()
    if existing_username and existing_username.id != current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    # Обновляем username
    await db.execute(
        update(Users)
        .where(Users.id == current_user.id)
        .values(username=username_request.username)
    )
    await db.commit()
    
    # Перезагружаем пользователя из БД для получения актуальных данных
    result = await db.execute(select(Users).filter(Users.id == current_user.id))
    updated_user = result.scalar_one()
    
    # Инвалидируем кэш пользователя
    from app.utils.redis_cache import cache_delete, key_user
    await cache_delete(key_user(updated_user.email))
    
    # Отправляем обновление профиля через WebSocket
    try:
        await emit_profile_update(updated_user.id, db)
    except Exception as ws_error:
        logger.warning(f"[WARNING] Не удалось отправить обновление через WebSocket: {ws_error}")
    
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        username=updated_user.username,
        avatar_url=updated_user.avatar_url,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at
    )


@auth_router.post("/auth/request-email-change/", response_model=Message)
async def request_email_change(
    email_request: RequestEmailChangeRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Запрашивает код верификации для смены email.
    
    Parameters:
    - email_request: Новый email.
    
    Returns:
    - Message: Подтверждение отправки кода.
    """
    # Проверяем, не занят ли новый email
    result = await db.execute(select(Users).filter(Users.email == email_request.new_email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Генерируем код верификации
    verification_code = generate_verification_code()
    expires_at = get_token_expiry(days=1)  # Code expires in 1 day
    
    # Удаляем старые коды для смены email этого пользователя
    await db.execute(
        update(EmailVerificationCode)
        .where(EmailVerificationCode.user_id == current_user.id)
        .where(EmailVerificationCode.code_type == "email_change")
        .values(is_used=True)
    )
    
    # Сохраняем новый код верификации
    verification = EmailVerificationCode(
        user_id=current_user.id,
        code=verification_code,
        expires_at=expires_at,
        code_type="email_change",
        extra_data={"new_email": email_request.new_email}
    )
    db.add(verification)
    await db.commit()
    
    # Отправляем код на новый email
    await send_verification_email(email_request.new_email, verification_code)
    
    return Message(message="Verification code sent to new email")


@auth_router.post("/auth/confirm-email-change/", response_model=UserResponse)
async def confirm_email_change(
    confirm_request: ConfirmEmailChangeRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждает смену email с помощью кода верификации.
    
    Parameters:
    - confirm_request: Новый email и код верификации.
    
    Returns:
    - UserResponse: Обновленный пользователь.
    """
    # Проверяем код верификации
    result = await db.execute(
        select(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.code == confirm_request.verification_code,
            EmailVerificationCode.code_type == "email_change",
            EmailVerificationCode.is_used == False,
            EmailVerificationCode.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
        )
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code"
        )
    
    # Проверяем, что новый email совпадает с сохраненным в extra_data
    extra_data = verification.extra_data or {}
    if extra_data.get("new_email") != confirm_request.new_email:
        raise HTTPException(
            status_code=400,
            detail="Email mismatch"
        )
    
    # Проверяем, не занят ли новый email
    email_result = await db.execute(select(Users).filter(Users.email == confirm_request.new_email))
    existing_user = email_result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Обновляем email
    old_email = current_user.email
    current_user.email = confirm_request.new_email
    current_user.is_verified = True  # Новый email считается верифицированным
    verification.is_used = True
    await db.commit()
    await db.refresh(current_user)
    
    # Инвалидируем кэш старого и нового email
    from app.utils.redis_cache import cache_delete, key_user
    await cache_delete(key_user(old_email))
    await cache_delete(key_user(current_user.email))
    
    # Отправляем обновление профиля через WebSocket
    try:
        await emit_profile_update(current_user.id, db)
    except Exception as ws_error:
        logger.warning(f"[WARNING] Не удалось отправить обновление через WebSocket: {ws_error}")
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@auth_router.post("/auth/request-password-change/", response_model=Message)
async def request_password_change(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Запрашивает код верификации для смены пароля.
    
    Returns:
    - Message: Подтверждение отправки кода.
    """
    # Генерируем код верификации
    verification_code = generate_verification_code()
    expires_at = get_token_expiry(days=1)  # Code expires in 1 day
    
    # Удаляем старые коды для смены пароля этого пользователя
    await db.execute(
        update(EmailVerificationCode)
        .where(EmailVerificationCode.user_id == current_user.id)
        .where(EmailVerificationCode.code_type == "password_change")
        .values(is_used=True)
    )
    
    # Сохраняем новый код верификации
    verification = EmailVerificationCode(
        user_id=current_user.id,
        code=verification_code,
        expires_at=expires_at,
        code_type="password_change"
    )
    db.add(verification)
    await db.commit()
    
    # Отправляем код на текущий email
    await send_verification_email(current_user.email, verification_code)
    
    return Message(message="Verification code sent to email")


@auth_router.post("/auth/verify-password-change-code/", response_model=Message)
async def verify_password_change_code(
    verify_request: VerifyPasswordChangeCodeRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Проверяет код верификации для смены пароля.
    
    Parameters:
    - verify_request: Код верификации.
    
    Returns:
    - Message: Подтверждение проверки кода.
    """
    # Проверяем код верификации
    result = await db.execute(
        select(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.code == verify_request.verification_code,
            EmailVerificationCode.code_type == "password_change",
            EmailVerificationCode.is_used == False,
            EmailVerificationCode.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
        )
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code"
        )
    
    # Помечаем код как проверенный (но еще не использованный)
    if not verification.extra_data:
        verification.extra_data = {}
    verification.extra_data["verified"] = True
    await db.commit()
    
    return Message(message="Verification code verified. You can now change your password.")


@auth_router.post("/auth/request-password-change-with-old/", response_model=Message)
async def request_password_change_with_old(
    request: RequestPasswordChangeWithOldPasswordRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Запрашивает смену пароля с проверкой старого пароля.
    Проверяет старый пароль, новый пароль и повтор, затем отправляет код на email.
    
    Parameters:
    - request: Старый пароль, новый пароль и повтор нового пароля.
    
    Returns:
    - Message: Подтверждение отправки кода.
    """
    # Проверяем старый пароль
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Incorrect old password"
        )
    
    # Проверяем, что новый пароль и повтор совпадают
    if request.new_password != request.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New password and confirmation do not match"
        )
    
    # Проверяем, что новый пароль отличается от старого
    if verify_password(request.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from old password"
        )
    
    # Генерируем код верификации
    verification_code = generate_verification_code()
    
    # Хешируем новый пароль
    new_password_hash = hash_password(request.new_password)
    
    # Сохраняем данные во временное хранилище (Redis)
    password_change_data = {
        "user_id": current_user.id,
        "new_password_hash": new_password_hash,
        "verification_code": verification_code
    }
    
    # Сохраняем в Redis на 1 час (3600 секунд)
    cache_key = key_password_change_data(current_user.id)
    await cache_set_json(cache_key, password_change_data, ttl_seconds=3600)
    
    # Отправляем код на email
    await send_verification_email(current_user.email, verification_code)
    
    return Message(message="Verification code sent to email")


@auth_router.post("/auth/confirm-password-change-with-code/", response_model=Message)
async def confirm_password_change_with_code(
    confirm_request: ConfirmPasswordChangeWithCodeRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждает смену пароля с помощью кода верификации.
    
    Parameters:
    - confirm_request: Код верификации.
    
    Returns:
    - Message: Подтверждение смены пароля.
    """
    # Получаем данные из временного хранилища
    cache_key = key_password_change_data(current_user.id)
    password_change_data = await cache_get_json(cache_key)
    
    if not password_change_data:
        raise HTTPException(
            status_code=400,
            detail="Password change data not found or expired. Please request password change again."
        )
    
    # Проверяем код верификации
    if password_change_data.get("verification_code") != confirm_request.verification_code:
        raise HTTPException(
            status_code=400,
            detail="Invalid verification code"
        )
    
    # Перезагружаем пользователя из базы данных в текущей сессии
    result = await db.execute(select(Users).filter(Users.id == current_user.id))
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Обновляем пароль
    db_user.password_hash = password_change_data["new_password_hash"]
    await db.commit()
    
    # Удаляем временные данные из Redis
    await cache_delete(cache_key)
    
    # Инвалидируем кэш пользователя
    from app.utils.redis_cache import key_user
    await cache_delete(key_user(current_user.email))
    
    print(f"Password changed successfully for user {db_user.id} ({db_user.email})")
    
    return Message(message="Password changed successfully")


@auth_router.post("/auth/confirm-password-change/", response_model=Message)
async def confirm_password_change(
    confirm_request: ConfirmPasswordChangeRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Подтверждает смену пароля (код уже проверен).
    
    Parameters:
    - confirm_request: Новый пароль.
    
    Returns:
    - Message: Подтверждение смены пароля.
    """
    # Ищем проверенный код верификации
    result = await db.execute(
        select(EmailVerificationCode)
        .filter(
            EmailVerificationCode.user_id == current_user.id,
            EmailVerificationCode.code_type == "password_change",
            EmailVerificationCode.is_used == False,
            EmailVerificationCode.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
        )
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=400,
            detail="No verification code found. Please request a new code."
        )
    
    # Проверяем, что код был проверен
    extra_data = verification.extra_data or {}
    if not extra_data.get("verified"):
        raise HTTPException(
            status_code=400,
            detail="Verification code not verified. Please verify the code first."
        )
    
    # Хешируем новый пароль
    hashed_password = hash_password(confirm_request.new_password)
    
    # Обновляем пароль
    current_user.password_hash = hashed_password
    verification.is_used = True
    await db.commit()
    
    # Инвалидируем кэш пользователя
    from app.utils.redis_cache import cache_delete, key_user
    await cache_delete(key_user(current_user.email))
    
    return Message(message="Password changed successfully")


@auth_router.post("/auth/forgot-password/", response_model=Message)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Отправляет код восстановления пароля на email пользователя.
    Не требует авторизации.
    
    Parameters:
    - request: Email пользователя.
    - db: Database session.
    - rate_limiter: Rate limiter instance.
    
    Returns:
    - Message: Сообщение об успешной отправке кода.
    """
    try:
        # Rate limiting
        if not rate_limiter.is_allowed(request.email):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        # Находим пользователя по email
        result = await db.execute(select(Users).filter(Users.email == request.email))
        user = result.scalar_one_or_none()
        
        # Для безопасности не сообщаем, существует ли пользователь
        if not user:
            # Возвращаем успешный ответ даже если пользователь не найден
            # Это предотвращает перебор email адресов
            return Message(message="If the email exists, a password reset code has been sent")
        
        if not user.is_active:
            return Message(message="If the email exists, a password reset code has been sent")
        
        # Генерируем код верификации
        verification_code = generate_verification_code()
        expires_at = get_token_expiry(days=1)  # Код действителен 1 день
        
        # Удаляем старые коды восстановления пароля для этого пользователя
        await db.execute(
            update(EmailVerificationCode)
            .where(EmailVerificationCode.user_id == user.id)
            .where(EmailVerificationCode.code_type == "password_reset")
            .values(is_used=True)
        )
        
        # Сохраняем новый код верификации
        verification = EmailVerificationCode(
            user_id=user.id,
            code=verification_code,
            expires_at=expires_at,
            code_type="password_reset"
        )
        db.add(verification)
        await db.commit()
        
        # Отправляем код на email
        await send_password_reset_email(user.email, verification_code)
        
        logger.info(f"Password reset code sent to {user.email}")
        
        return Message(message="If the email exists, a password reset code has been sent")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Ошибка при отправке кода восстановления пароля для {request.email}: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        # Возвращаем общий ответ для безопасности
        return Message(message="If the email exists, a password reset code has been sent")


@auth_router.post("/auth/reset-password/", response_model=Message)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Сбрасывает пароль пользователя с помощью кода верификации.
    Не требует авторизации.
    
    Parameters:
    - request: Email, код верификации и новый пароль.
    - db: Database session.
    - rate_limiter: Rate limiter instance.
    
    Returns:
    - Message: Сообщение об успешном сбросе пароля.
    """
    try:
        # Rate limiting
        if not rate_limiter.is_allowed(request.email):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        # Находим пользователя по email
        result = await db.execute(select(Users).filter(Users.email == request.email))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=400,
                detail="User account is inactive"
            )
        
        # Проверяем код верификации
        verification_result = await db.execute(
            select(EmailVerificationCode)
            .filter(
                EmailVerificationCode.user_id == user.id,
                EmailVerificationCode.code == request.verification_code,
                EmailVerificationCode.code_type == "password_reset",
                EmailVerificationCode.is_used == False,
                EmailVerificationCode.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)
            )
        )
        verification = verification_result.scalar_one_or_none()
        
        if not verification:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired verification code"
            )
        
        # Хешируем новый пароль
        hashed_password = hash_password(request.new_password)
        
        # Обновляем пароль
        user.password_hash = hashed_password
        verification.is_used = True
        await db.commit()
        
        # Инвалидируем кэш пользователя
        from app.utils.redis_cache import cache_delete, key_user
        await cache_delete(key_user(user.email))
        
        logger.info(f"Password reset successfully for user {user.id} ({user.email})")
        
        return Message(message="Password reset successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Ошибка при сбросе пароля для {request.email}: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@auth_router.post("/auth/unlock-user-gallery/", response_model=Message)
async def unlock_user_gallery(
    request: UnlockUserGalleryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Открывает доступ к галерее фото пользователя за 500 кредитов.
    Доступно только для подписок STANDARD и PREMIUM.
    
    Parameters:
    - request: Запрос с user_id пользователя, галерею которого нужно открыть
    
    Returns:
    - Message: Подтверждение открытия галереи.
    """
    GALLERY_UNLOCK_COST = 500
    target_user_id = request.user_id
    
    # Если открываем свою галерею - ничего не делаем (она уже доступна)
    if target_user_id == current_user.id:
        return Message(message="Ваша галерея уже доступна")
    
    # Проверяем подписку - только STANDARD и PREMIUM могут открывать галереи
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    if not subscription:
        logger.warning(f"[GALLERY] Пользователь {current_user.id} не имеет подписки")
        raise HTTPException(
            status_code=403,
            detail="Для разблокировки галереи необходима подписка STANDARD или PREMIUM"
        )
    
    if not subscription.is_active:
        logger.warning(f"[GALLERY] Подписка пользователя {current_user.id} неактивна: {subscription.status}")
        raise HTTPException(
            status_code=403,
            detail="Для разблокировки галереи необходима активная подписка STANDARD или PREMIUM"
        )
    
    # Получаем тип подписки - subscription_type это enum SubscriptionType, его value уже в нижнем регистре
    subscription_type_str = subscription.subscription_type.value
    logger.info(f"[GALLERY] Проверка подписки пользователя {current_user.id}: type={subscription_type_str}, active={subscription.is_active}, status={subscription.status}")
    if subscription_type_str not in ['standard', 'premium']:
        logger.warning(f"[GALLERY] Неподдерживаемый тип подписки: {subscription_type_str}")
        raise HTTPException(
            status_code=403,
            detail="Для разблокировки галереи необходима подписка STANDARD или PREMIUM"
        )
    
    # Проверяем, не была ли галерея уже разблокирована
    existing_unlock = await db.execute(
        select(UserGalleryUnlock)
        .filter(
            UserGalleryUnlock.unlocker_id == current_user.id,
            UserGalleryUnlock.target_user_id == target_user_id
        )
    )
    if existing_unlock.scalar_one_or_none():
        # Галерея уже разблокирована, не списываем кредиты
        return Message(message="Галерея уже была разблокирована ранее")
    
    # Для PREMIUM подписки галереи бесплатны
    is_premium = subscription_type_str == 'premium'
    
    if not is_premium:
        # Для STANDARD проверяем баланс и списываем кредиты
        from app.services.coins_service import CoinsService
        coins_service = CoinsService(db)
        
        if not await coins_service.can_user_afford(current_user.id, GALLERY_UNLOCK_COST):
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно кредитов. Нужно {GALLERY_UNLOCK_COST} кредитов для открытия галереи."
            )
        
        # Списываем кредиты
        success = await coins_service.spend_coins(current_user.id, GALLERY_UNLOCK_COST, commit=False)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Не удалось списать кредиты"
            )
        
        # Записываем историю баланса
        try:
            from app.utils.balance_history import record_balance_change
            await record_balance_change(
                db=db,
                user_id=current_user.id,
                amount=-GALLERY_UNLOCK_COST,
                reason=f"Разблокировка галереи пользователя (ID: {target_user_id})"
            )
        except Exception as e:
            logger.warning(f"Не удалось записать историю баланса: {e}")
    
    # Сохраняем информацию о разблокировке
    unlock_record = UserGalleryUnlock(
        unlocker_id=current_user.id,
        target_user_id=target_user_id
    )
    db.add(unlock_record)
    
    await db.commit()
    
    # Инвалидируем кэш пользователя и баланс
    from app.utils.redis_cache import cache_delete, key_user, key_user_coins
    await cache_delete(key_user(current_user.email))
    await cache_delete(key_user_coins(current_user.id))
    
    # Отправляем событие обновления профиля
    from app.services.profit_activate import emit_profile_update
    try:
        await emit_profile_update(current_user.id, db)
    except Exception as ws_error:
        logger.warning(f"[WARNING] Не удалось отправить обновление через WebSocket: {ws_error}")
    
    # Получаем финальный баланс после коммита
    from app.services.coins_service import CoinsService
    coins_service = CoinsService(db)
    final_balance = await coins_service.get_user_coins(current_user.id) or 0
    
    logger.info(f"[GALLERY_UNLOCK] Пользователь {current_user.id} разблокировал галерею пользователя {target_user_id}, баланс: {final_balance}")
    
    # Возвращаем сообщение с балансом в detail для совместимости
    return Message(message=f"Галерея успешно открыта. Баланс: {final_balance}")


@auth_router.get("/auth/user-gallery/", response_model=UserGalleryResponse)
async def get_user_gallery(
    limit: int = 20,
    offset: int = 0,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает фото из "Моей галереи" пользователя с пагинацией.
    
    Args:
        limit: Количество фото для возврата (по умолчанию 20)
        offset: Смещение для пагинации (по умолчанию 0)
    
    Returns:
    - UserGalleryResponse: Список фото из галереи пользователя с пагинацией.
    """
    try:
        # Получаем общее количество фото для подсчета total
        total_result = await db.execute(
            select(func.count(UserGallery.id))
            .filter(UserGallery.user_id == current_user.id)
        )
        total = total_result.scalar_one() or 0
        
        # Получаем фото с пагинацией
        result = await db.execute(
            select(UserGallery)
            .filter(UserGallery.user_id == current_user.id)
            .order_by(UserGallery.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        gallery_photos = result.scalars().all()
        
        # Формируем список фото
        photos = []
        for photo in gallery_photos:
            photos.append(UserPhotoResponse(
                id=photo.id,
                image_url=photo.image_url,
                image_filename=photo.image_filename,
                character_name=photo.character_name or "",
                created_at=photo.created_at.isoformat() if photo.created_at else ""
            ))
        
        return UserGalleryResponse(
            photos=photos,
            total=total
        )
    except Exception as e:
        # Если таблица не существует или другая ошибка, возвращаем пустой список
        logger.warning(f"[WARNING] Ошибка при получении галереи пользователя {current_user.id}: {e}")
        return UserGalleryResponse(
            photos=[],
            total=0
        )


@auth_router.get("/auth/user-generated-photos/{user_id}/", response_model=UserGalleryResponse)
async def get_user_generated_photos(
    user_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает фото из галереи пользователя (UserGallery) с пагинацией.
    Используется для платной страницы "Открыть X сгенерированные фото".

    Если открываем чужую галерею - возвращаем фото только если галерея разблокирована.

    Returns:
    - UserGalleryResponse: Список фото с пагинацией и общим количеством.
    """
    try:
        logger.info(f"[USER_GALLERY] Запрос фото пользователя {user_id} от пользователя {current_user.id}, limit={limit}, offset={offset}")
        
        # Если открываем чужую галерею - проверяем разблокировку
        if user_id != current_user.id:
            unlock_check = await db.execute(
                select(UserGalleryUnlock)
                .filter(
                    UserGalleryUnlock.unlocker_id == current_user.id,
                    UserGalleryUnlock.target_user_id == user_id
                )
            )
            is_unlocked = unlock_check.scalar_one_or_none() is not None
            
            if not is_unlocked:
                logger.warning(f"[USER_GALLERY] Попытка доступа к незаблокированной галерее: пользователь {current_user.id} пытается открыть галерею {user_id}")
                raise HTTPException(
                    status_code=403,
                    detail="Галерея не разблокирована. Сначала разблокируйте галерею за 500 кредитов."
                )
            logger.info(f"[USER_GALLERY] Галерея разблокирована, доступ разрешен")
        
        # Общее количество фото
        total_result = await db.execute(
            select(func.count(UserGallery.id)).filter(UserGallery.user_id == user_id)
        )
        total = total_result.scalar_one() or 0

        # Получаем фото с пагинацией
        result = await db.execute(
            select(UserGallery)
            .filter(UserGallery.user_id == user_id)
            .order_by(UserGallery.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        gallery_photos = result.scalars().all()
        logger.info(f"[USER_GALLERY] Найдено {len(gallery_photos)} фото для пользователя {user_id} (total={total})")
        
        # Формируем список фото
        photos = []
        for photo in gallery_photos:
            photos.append(UserPhotoResponse(
                id=photo.id,
                image_url=photo.image_url,
                image_filename=photo.image_filename,
                character_name=photo.character_name or "",
                created_at=photo.created_at.isoformat() if photo.created_at else ""
            ))
        
        logger.info(f"[USER_GALLERY] Возвращаем {len(photos)} фото для пользователя {user_id} (total={total})")
        return UserGalleryResponse(
            photos=photos,
            total=total
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"[WARNING] Ошибка при получении фото из галереи пользователя {user_id}: {e}")
        return UserGalleryResponse(
            photos=[],
            total=0
        )


@auth_router.get("/auth/users/{user_id}/", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Получает информацию о пользователе по ID.
    
    Parameters:
    - user_id: ID пользователя
    
    Returns:
    - UserResponse: Информация о пользователе
    """
    try:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Users)
            .options(selectinload(Users.subscription))
            .filter(Users.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail="Пользователь не найден"
            )
        
        logger.info(f"[GET_USER_BY_ID] User {user_id}: username={user.username}, email={user.email}")
        
        # Получаем информацию о подписке
        subscription_info = None
        if user.subscription:
            subscription_info = {
                "subscription_type": user.subscription.subscription_type.value,
                "status": user.subscription.status.value,
            }
        
        response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_admin=user.is_admin,
            coins=user.coins,
            created_at=user.created_at,
            subscription=subscription_info
        )
        
        logger.info(f"[GET_USER_BY_ID] Response for user {user_id}: username={response.username}, email={response.email}")
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении пользователя {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения информации о пользователе: {str(e)}"
        )


@auth_router.post("/auth/user-gallery/add/", response_model=Message)
async def add_photo_to_gallery(
    request: AddPhotoToGalleryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Добавляет фото в "Мою галерею" пользователя.
    
    Returns:
    - Message: Подтверждение добавления фото.
    """
    try:
        # Проверяем существование таблицы и обрабатываем ошибку если таблицы нет
        try:
            # Проверяем, нет ли уже этого фото в галереи
            existing = await db.execute(
                select(UserGallery)
                .filter(
                    UserGallery.user_id == current_user.id,
                    UserGallery.image_url == request.image_url
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail="Это фото уже добавлено в вашу галерею"
                )
        except Exception as table_error:
            # Если таблица не существует, возвращаем понятную ошибку
            if 'user_gallery' in str(table_error).lower() or 'does not exist' in str(table_error).lower():
                logger.error(f"[ERROR] Таблица user_gallery не существует. Нужно выполнить миграцию: {table_error}")
                raise HTTPException(
                    status_code=500,
                    detail="Таблица галереи не создана. Выполните миграцию: python -m alembic upgrade head"
                )
            raise
        
        # Добавляем фото в галерею
        gallery_photo = UserGallery(
            user_id=current_user.id,
            image_url=request.image_url,
            character_name=request.character_name,
            image_filename=None  # Можно добавить позже если нужно
        )
        db.add(gallery_photo)
        await db.commit()
        
        # КРИТИЧЕСКИ ВАЖНО: Сохраняем фото в историю чата
        # Это нужно чтобы фото отображалось в истории персонажа
        if request.character_name:
            try:
                from app.chat_bot.models.models import CharacterDB
                from app.services.subscription_service import SubscriptionService
                
                # Получаем данные персонажа
                result = await db.execute(
                    select(CharacterDB).where(CharacterDB.name.ilike(request.character_name))
                )
                character_db = result.scalar_one_or_none()
                
                if character_db:
                    character_data = {
                        "name": character_db.name,
                        "prompt": character_db.prompt,
                        "id": character_db.id
                    }
                    
                    # Получаем тип подписки для сохранения истории
                    subscription_service = SubscriptionService(db)
                    subscription = await subscription_service.get_user_subscription(current_user.id)
                    subscription_type = subscription.subscription_type.value.lower() if subscription else "free"
                    
                    # Сохраняем историю: пользователь запросил генерацию фото, ассистент вернул фото
                    user_message = "Генерация изображения"
                    assistant_response = ""  # Пустой ответ, только фото
                    
                    # КРИТИЧЕСКИ ВАЖНО: Сохраняем историю СРАЗУ, а не в фоне
                    # Используем await чтобы гарантировать сохранение
                    try:
                        # Импортируем функцию через ленивый импорт, избегая циклических импортов
                        # Используем прямой импорт только внутри try-except
                        import importlib
                        main_module = importlib.import_module('app.main')
                        process_chat_history_storage = getattr(main_module, 'process_chat_history_storage', None)
                        
                        if process_chat_history_storage:
                            await process_chat_history_storage(
                                subscription_type=subscription_type,
                                user_id=str(current_user.id),
                                character_data=character_data,
                                message=user_message,
                                response=assistant_response,
                                image_url=request.image_url,
                                image_filename=None
                            )
                            logger.info(f"[GALLERY] История чата сохранена для фото {request.image_url} и персонажа {request.character_name}")
                        else:
                            logger.warning(f"[GALLERY] Функция process_chat_history_storage не найдена в app.main")
                    except ImportError as import_err:
                        # Если не удалось импортировать, логируем, но не блокируем добавление в галерею
                        logger.warning(f"[GALLERY] Не удалось импортировать process_chat_history_storage: {import_err}")
                        import traceback
                        logger.warning(f"[GALLERY] Import traceback: {traceback.format_exc()}")
                    except Exception as save_error:
                        # Логируем ошибку, но не блокируем добавление в галерею
                        logger.error(f"[GALLERY] Ошибка сохранения истории: {save_error}")
                        import traceback
                        logger.error(f"[GALLERY] Traceback: {traceback.format_exc()}")
                else:
                    logger.warning(f"[GALLERY] Персонаж {request.character_name} не найден, история не сохранена")
            except Exception as history_error:
                # Не блокируем добавление в галерею если не удалось сохранить историю
                logger.warning(f"[GALLERY] Не удалось сохранить историю чата: {history_error}")
                import traceback
                logger.warning(f"[GALLERY] Traceback: {traceback.format_exc()}")
        
        # Инвалидируем кэш пользователя
        from app.utils.redis_cache import cache_delete, key_user
        await cache_delete(key_user(current_user.email))
        
        logger.info(f"[GALLERY] Фото добавлено в галерею пользователя {current_user.id}")
        return Message(message="Фото успешно добавлено в галерею")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"[ERROR] Ошибка при добавлении фото в галерею: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось добавить фото в галерею: {str(e)}"
        )


@auth_router.delete("/auth/user-gallery/{photo_id}/", response_model=Message)
async def delete_photo_from_gallery(
    photo_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удаляет фото из "Моей галереи" пользователя.
    
    Parameters:
    - photo_id: ID фото для удаления
    
    Returns:
    - Message: Подтверждение удаления фото.
    """
    try:
        # Проверяем, существует ли фото и принадлежит ли оно текущему пользователю
        result = await db.execute(
            select(UserGallery)
            .filter(
                UserGallery.id == photo_id,
                UserGallery.user_id == current_user.id
            )
        )
        gallery_photo = result.scalar_one_or_none()
        
        if not gallery_photo:
            raise HTTPException(
                status_code=404,
                detail="Фото не найдено или у вас нет прав на его удаление"
            )
        
        # Удаляем фото
        await db.execute(
            delete(UserGallery)
            .where(UserGallery.id == photo_id)
            .where(UserGallery.user_id == current_user.id)
        )
        await db.commit()
        
        logger.info(f"[GALLERY] Фото {photo_id} удалено из галереи пользователя {current_user.id}")
        return Message(message="Фото успешно удалено из галереи")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"[GALLERY] Ошибка удаления фото из галереи: {e}")
        import traceback
        logger.error(f"[GALLERY] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при удалении фото из галереи: {str(e)}"
        )


@auth_router.get("/auth/profile-stats/")
async def get_profile_stats(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает расширенную статистику профиля пользователя:
    - Количество созданных персонажей
    - Количество сообщений в чате
    - Дата регистрации
    """
    try:
        from app.chat_bot.models.models import CharacterDB, ChatMessageDB, ChatSession
        from app.models.chat_history import ChatHistory
        
        # Количество созданных персонажей
        characters_count_result = await db.execute(
            select(func.count(CharacterDB.id))
            .where(CharacterDB.user_id == current_user.id)
        )
        characters_count = characters_count_result.scalar_one_or_none() or 0
        
        # Количество сообщений берем из поля total_messages_sent (не уменьшается при удалении истории)
        messages_count = current_user.total_messages_sent or 0
        
        return {
            "characters_count": characters_count,
            "messages_count": messages_count,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    except Exception as e:
        logger.error(f"[ERROR] Ошибка получения статистики профиля: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось получить статистику профиля: {str(e)}"
        )


@auth_router.get("/auth/balance-history/")
async def get_balance_history(
    skip: int = 0,
    limit: int = 1000,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает историю изменений баланса пользователя.
    """
    try:
        from app.models.balance_history import BalanceHistory
        
        # Получаем историю баланса для текущего пользователя
        result = await db.execute(
            select(BalanceHistory)
            .where(BalanceHistory.user_id == current_user.id)
            .order_by(desc(BalanceHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        history_items = result.scalars().all()

        # Получаем общее количество записей
        count_result = await db.execute(
            select(func.count(BalanceHistory.id))
            .where(BalanceHistory.user_id == current_user.id)
        )
        total = count_result.scalar_one() or 0

        return {
            "history": [
                {
                    "id": item.id,
                    "amount": item.amount,
                    "balance_before": item.balance_before,
                    "balance_after": item.balance_after,
                    "reason": item.reason,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                }
                for item in history_items
            ],
            "total": total
        }
    except Exception as e:
        logger.error(f"[ERROR] Ошибка получения истории баланса: {e}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения истории баланса: {str(e)}"
        )