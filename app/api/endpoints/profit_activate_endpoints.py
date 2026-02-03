"""
API эндпоинты для активации подписок с исправленной логикой.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.services.profit_activate import ProfitActivateService
from app.schemas.subscription import (
    SubscriptionStatsResponse, 
    SubscriptionActivateRequest, 
    SubscriptionActivateResponse,
    SubscriptionInfoResponse
)

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
        service = ProfitActivateService(db)
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
    try:
        service = ProfitActivateService(db)
        
        # Поддерживаем только standard и premium подписки
        if request.subscription_type.lower() not in ["standard", "premium"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только подписки типа 'standard' и 'premium'"
            )
        
        subscription = await service.activate_subscription(current_user.id, request.subscription_type)
        
        # Формируем сообщение в зависимости от типа подписки
        if request.subscription_type.lower() == "standard":
            message = "Подписка Standard активирована! 2000 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото) и возможность создавать персонажей!"
        else:  # premium
            message = "Подписка Premium активирована! 6000 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото) и приоритет в очереди!"
        
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
                last_reset_at=subscription.last_reset_at,
                # Новые лимиты
                images_limit=subscription.images_limit,
                images_used=subscription.images_used,
                voice_limit=subscription.voice_limit,
                voice_used=subscription.voice_used
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
        service = ProfitActivateService(db)
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
        service = ProfitActivateService(db)
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
        service = ProfitActivateService(db)
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
