"""
Роутер для административных эндпоинтов.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.database.db_depends import get_db
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.auth.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def require_admin(current_user: Users = Depends(get_current_user)) -> Users:
    """Проверяет, что пользователь является администратором."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Доступ запрещен. Только для администраторов."
        )
    return current_user


@admin_router.get("/stats")
@admin_router.get("/stats/")
async def get_admin_stats(
    current_user: Users = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Получает детальную статистику для администратора:
    - Общая статистика пользователей
    - Статистика по подпискам
    - Регистрации по странам
    - Активность пользователей
    - Статистика контента
    """
    try:
        logger.info(f"[ADMIN STATS] Запрос статистики от админа {current_user.email}")
        
        # Общее количество пользователей
        total_users_result = await db.execute(
            select(func.count(Users.id))
        )
        total_users = total_users_result.scalar() or 0

        # Новые пользователи за последние 24 часа
        last_24h = datetime.utcnow() - timedelta(hours=24)
        new_users_24h_result = await db.execute(
            select(func.count(Users.id)).where(Users.created_at >= last_24h)
        )
        new_users_24h = new_users_24h_result.scalar() or 0

        # Новые пользователи за последние 7 дней
        last_7d = datetime.utcnow() - timedelta(days=7)
        new_users_7d_result = await db.execute(
            select(func.count(Users.id)).where(Users.created_at >= last_7d)
        )
        new_users_7d = new_users_7d_result.scalar() or 0

        # Статистика по подпискам
        # FREE подписки
        free_subs_result = await db.execute(
            select(func.count(UserSubscription.id)).where(
                and_(
                    UserSubscription.subscription_type == SubscriptionType.FREE,
                    UserSubscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        free_subscriptions = free_subs_result.scalar() or 0

        # STANDARD подписки
        standard_subs_result = await db.execute(
            select(func.count(UserSubscription.id)).where(
                and_(
                    UserSubscription.subscription_type == SubscriptionType.STANDARD,
                    UserSubscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        standard_subscriptions = standard_subs_result.scalar() or 0

        # PREMIUM подписки
        premium_subs_result = await db.execute(
            select(func.count(UserSubscription.id)).where(
                and_(
                    UserSubscription.subscription_type == SubscriptionType.PREMIUM,
                    UserSubscription.status == SubscriptionStatus.ACTIVE
                )
            )
        )
        premium_subscriptions = premium_subs_result.scalar() or 0

        # Всего платных подписок
        paid_subscriptions = standard_subscriptions + premium_subscriptions

        # Регистрации по странам
        registrations_by_country: List[Dict[str, Any]] = []
        country_stats_result = await db.execute(
            select(
                Users.country,
                func.count(Users.id).label('count')
            )
            .where(Users.country.isnot(None))
            .group_by(Users.country)
            .order_by(func.count(Users.id).desc())
        )
        for row in country_stats_result:
            registrations_by_country.append({
                "country": row.country,
                "count": row.count
            })

        # Статистика контента
        # Количество персонажей
        try:
            from app.chat_bot.models.models import CharacterDB
            characters_result = await db.execute(
                select(func.count(CharacterDB.id))
            )
            total_characters = characters_result.scalar() or 0
        except Exception:
            total_characters = 0

        # Количество сгенерированных изображений
        try:
            from app.models.image_generation_history import ImageGenerationHistory
            images_result = await db.execute(
                select(func.count(ImageGenerationHistory.id))
            )
            total_images = images_result.scalar() or 0
        except Exception:
            total_images = 0

        # Количество сообщений в чате
        try:
            from app.models.chat_history import ChatHistory
            messages_result = await db.execute(
                select(func.count(ChatHistory.id))
            )
            total_messages = messages_result.scalar() or 0
        except Exception:
            total_messages = 0

        # Активные пользователи (отправляли сообщения за последние 24 часа)
        try:
            active_users_result = await db.execute(
                select(func.count(func.distinct(ChatHistory.user_id)))
                .where(ChatHistory.created_at >= last_24h)
            )
            active_users_24h = active_users_result.scalar() or 0
        except Exception:
            active_users_24h = 0

        # Общее количество монет в системе
        total_coins_result = await db.execute(
            select(func.sum(Users.coins))
        )
        total_coins = total_coins_result.scalar() or 0

        return {
            "total_visits": total_users,
            "new_registrations": total_users,
            "new_users_24h": new_users_24h,
            "new_users_7d": new_users_7d,
            "subscriptions_purchased": paid_subscriptions,
            "subscriptions": {
                "free": free_subscriptions,
                "standard": standard_subscriptions,
                "premium": premium_subscriptions,
                "total_paid": paid_subscriptions
            },
            "registrations_by_country": registrations_by_country,
            "content": {
                "total_characters": total_characters,
                "total_images": total_images,
                "total_messages": total_messages
            },
            "activity": {
                "active_users_24h": active_users_24h
            },
            "economy": {
                "total_coins": total_coins
            }
        }
    except Exception as e:
        logger.error(
            f"[ADMIN STATS] Ошибка получения статистики: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения статистики: {str(e)}"
        )


@admin_router.post("/reset-stats")
@admin_router.post("/reset-stats/")
async def reset_stats(
    current_user: Users = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    ОПАСНАЯ ОПЕРАЦИЯ: Удаляет всех пользователей и связанные данные.
    Используйте только для очистки тестовых данных перед продакшеном.
    """
    try:
        logger.warning(
            f"[ADMIN RESET] Админ {current_user.email} запустил сброс статистики"
        )
        
        # Удаляем всех пользователей кроме админов
        # Cascade удалит все связанные данные (подписки, сообщения и т.д.)
        result = await db.execute(
            select(Users).where(Users.is_admin == False)
        )
        users_to_delete = result.scalars().all()
        
        deleted_count = len(users_to_delete)
        
        for user in users_to_delete:
            await db.delete(user)
        
        await db.commit()
        
        logger.info(
            f"[ADMIN RESET] Удалено {deleted_count} пользователей (админы сохранены)"
        )
        
        return {
            "success": True,
            "deleted_users": deleted_count,
            "message": f"Удалено {deleted_count} пользователей (админы сохранены)"
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            f"[ADMIN RESET] Ошибка сброса статистики: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка сброса статистики: {str(e)}"
        )
