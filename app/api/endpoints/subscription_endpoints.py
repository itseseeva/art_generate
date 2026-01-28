"""
API эндпоинты для управления подписками.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.services.subscription_service import SubscriptionService
from app.schemas.subscription import (
    SubscriptionStatsResponse, 
    SubscriptionActivateRequest, 
    SubscriptionActivateResponse,
    SubscriptionInfoResponse
)
from app.config.credit_packages import get_all_packages

router = APIRouter()


@router.get("/stats/", response_model=Dict[str, Any])
async def get_subscription_stats(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает статистику подписки пользователя.
    """
    try:
        service = SubscriptionService(db)
        stats = await service.get_subscription_stats(current_user.id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статистики подписки: {str(e)}"
        )


@router.post("/activate/", response_model=SubscriptionActivateResponse)
async def activate_subscription(
    request: SubscriptionActivateRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Активирует подписку для пользователя.
    """
    print(f"🔍 DEBUG: Начало активации подписки для пользователя {current_user.id}")
    try:
        print(f"🔍 DEBUG: Получен запрос на активацию подписки: {request.subscription_type}")
        service = SubscriptionService(db)
        
        # Поддерживаем только стандартную и премиальную подписки
        if request.subscription_type.lower() not in ["standard", "premium"]:
            print(f"[ERROR] DEBUG: Неподдерживаемый тип подписки: {request.subscription_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только подписки типа 'standard' и 'premium'"
            )
        
        print(f"[OK] DEBUG: Тип подписки поддерживается: {request.subscription_type}")
        
        subscription = await service.create_subscription(current_user.id, request.subscription_type)
        
        # Формируем сообщение в зависимости от типа подписки
        if request.subscription_type.lower() == "standard":
            message = "Подписка Standard успешно активирована! Вы получили 2000 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото)."
        else:  # premium
            message = "Подписка Premium успешно активирована! Вы получили 6000 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото)."
        
        return SubscriptionActivateResponse(
            success=True,
            message=message,
            subscription=SubscriptionStatsResponse(
                subscription_type=subscription.subscription_type.value,
                status=subscription.status.value,
                monthly_credits=subscription.monthly_credits,
                monthly_photos=subscription.monthly_photos,
                used_credits=subscription.used_credits,
                used_photos=subscription.used_photos,
                credits_remaining=subscription.credits_remaining,
                photos_remaining=subscription.photos_remaining,
                days_left=subscription.days_until_expiry,
                is_active=subscription.is_active,
                expires_at=subscription.expires_at,
                last_reset_at=subscription.last_reset_at
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка активации подписки: {str(e)}"
        )


@router.get("/info/", response_model=SubscriptionInfoResponse)
async def get_subscription_info(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает полную информацию о подписке пользователя.
    """
    try:
        service = SubscriptionService(db)
        subscription_info = await service.get_subscription_info(current_user.id)
        
        if not subscription_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подписка не найдена"
            )
        
        return subscription_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения информации о подписке: {str(e)}"
        )


@router.get("/check/message/")
async def check_message_permission(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Проверяет, может ли пользователь отправить сообщение.
    """
    try:
        service = SubscriptionService(db)
        can_send = await service.can_user_send_message(current_user.id)
        
        return {
            "can_send_message": can_send,
            "user_id": current_user.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка проверки разрешения: {str(e)}"
        )


@router.get("/check/photo/")
async def check_photo_permission(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Проверяет, может ли пользователь сгенерировать фото.
    """
    try:
        service = SubscriptionService(db)
        can_generate = await service.can_user_generate_photo(current_user.id)
        
        return {
            "can_generate_photo": can_generate,
            "user_id": current_user.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка проверки разрешения: {str(e)}"
        )


@router.get("/credit-packages/")
async def get_credit_packages():
    """
    Получает список доступных пакетов для разовой докупки кредитов.
    """
    try:
        packages = get_all_packages()
        return {
            "success": True,
            "packages": packages
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения пакетов: {str(e)}"
        )
