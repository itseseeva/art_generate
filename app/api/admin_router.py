"""
Роутер для административных эндпоинтов.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta, timezone
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


@admin_router.get("/users")
@admin_router.get("/users/")
async def get_users_list(
    current_user: Users = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = None
) -> Dict[str, Any]:
    """
    Получает список всех пользователей с основной информацией.
    
    Parameters:
    - skip: Количество пользователей для пропуска (пагинация)
    - limit: Максимальное количество пользователей в ответе
    - search: Поиск по email или username
    """
    try:
        from sqlalchemy.orm import selectinload
        
        # Базовый запрос
        query = select(Users).options(selectinload(Users.subscription))
        
        # Поиск
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Users.email.ilike(search_pattern),
                    Users.username.ilike(search_pattern)
                )
            )
        
        # Сортировка по дате создания (новые сначала)
        query = query.order_by(Users.created_at.desc())
        
        # Подсчет общего количества
        count_query = select(func.count(Users.id))
        if search:
            search_pattern = f"%{search}%"
            count_query = count_query.where(
                or_(
                    Users.email.ilike(search_pattern),
                    Users.username.ilike(search_pattern)
                )
            )
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Получаем пользователей с пагинацией
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        users = result.scalars().all()
        
        users_list = []
        for user in users:
            subscription_info = None
            if user.subscription:
                subscription_info = {
                    "type": user.subscription.subscription_type.value,
                    "status": user.subscription.status.value,
                    "used_credits": user.subscription.used_credits,
                    "used_photos": user.subscription.used_photos,
                    "monthly_credits": user.subscription.monthly_credits,
                    "monthly_photos": user.subscription.monthly_photos
                }
            
            # Статистика чатов
            try:
                from app.chat_bot.models.models import ChatSession, ChatMessageDB
                user_id_str = str(user.id)
                
                # Проверяем, есть ли у пользователя чат-сессии
                chat_sessions_result = await db.execute(
                    select(func.count(ChatSession.id)).where(
                        or_(
                            ChatSession.user_id == user_id_str,
                            func.trim(ChatSession.user_id) == user_id_str
                        )
                    )
                )
                chat_sessions_count = chat_sessions_result.scalar() or 0
                
                # Подсчитываем общее количество сообщений пользователя
                total_chat_messages = 0
                if chat_sessions_count > 0:
                    # Получаем все session_id для этого пользователя
                    sessions_result = await db.execute(
                        select(ChatSession.id).where(
                            or_(
                                ChatSession.user_id == user_id_str,
                                func.trim(ChatSession.user_id) == user_id_str
                            )
                        )
                    )
                    session_ids = [row[0] for row in sessions_result.all()]
                    
                    if session_ids:
                        messages_result = await db.execute(
                            select(func.count(ChatMessageDB.id)).where(
                                ChatMessageDB.session_id.in_(session_ids),
                                ChatMessageDB.role == "user"
                            )
                        )
                        total_chat_messages = messages_result.scalar() or 0
            except Exception as chat_error:
                logger.warning(f"[ADMIN] Ошибка получения статистики чата для user_id={user.id}: {chat_error}")
                chat_sessions_count = 0
                total_chat_messages = 0
            
            has_subscription = subscription_info is not None and subscription_info.get("type") != "free"
            has_chat = chat_sessions_count > 0
            
            users_list.append({
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "is_admin": user.is_admin,
                "coins": user.coins,
                "country": user.country,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "total_messages_sent": user.total_messages_sent,
                "subscription": subscription_info,
                "has_subscription": has_subscription,
                "has_chat": has_chat,
                "chat_sessions_count": chat_sessions_count,
                "total_chat_messages": total_chat_messages
            })
        
        return {
            "users": users_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"[ADMIN] Ошибка получения списка пользователей: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения списка пользователей: {str(e)}"
        )


@admin_router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    current_user: Users = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Получает детальную информацию о пользователе.
    """
    try:
        from sqlalchemy.orm import selectinload
        from app.models.chat_history import ChatHistory
        from app.models.image_generation_history import ImageGenerationHistory
        from app.chat_bot.models.models import CharacterDB
        
        # Получаем пользователя с подпиской
        stmt = select(Users).options(selectinload(Users.subscription)).filter(Users.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Статистика сообщений
        try:
            messages_result = await db.execute(
                select(func.count(ChatHistory.id)).where(ChatHistory.user_id == user_id)
            )
            total_messages = messages_result.scalar() or 0
        except Exception as e:
            logger.warning(f"[ADMIN] Error counting total messages: {e}")
            total_messages = 0
        
        # Сообщения за последние 24 часа
        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        try:
            messages_24h_result = await db.execute(
                select(func.count(ChatHistory.id))
                .where(ChatHistory.user_id == user_id, ChatHistory.created_at >= last_24h)
            )
            messages_24h = messages_24h_result.scalar() or 0
        except Exception as e:
            logger.warning(f"[ADMIN] Error counting messages 24h: {e}")
            messages_24h = 0
        
        # Последнее сообщение
        try:
            last_message_result = await db.execute(
                select(ChatHistory.created_at)
                .where(ChatHistory.user_id == user_id)
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            last_message_date = last_message_result.scalar_one_or_none()
        except Exception as e:
            logger.warning(f"[ADMIN] Error getting last message: {e}")
            last_message_date = None
        
        # Статистика генерации изображений
        try:
            images_result = await db.execute(
                select(func.count(ImageGenerationHistory.id))
                .where(ImageGenerationHistory.user_id == user_id)
            )
            total_images = images_result.scalar() or 0
        except Exception as e:
            logger.warning(f"[ADMIN] Error counting images: {e}")
            total_images = 0
        
        # Изображения за последние 24 часа
        try:
            images_24h_result = await db.execute(
                select(func.count(ImageGenerationHistory.id))
                .where(ImageGenerationHistory.user_id == user_id, ImageGenerationHistory.created_at >= last_24h)
            )
            images_24h = images_24h_result.scalar() or 0
        except Exception as e:
            logger.warning(f"[ADMIN] Error counting images 24h: {e}")
            images_24h = 0
        
        # Созданные персонажи
        try:
            characters_result = await db.execute(
                select(func.count(CharacterDB.id))
                .where(CharacterDB.creator_id == user_id)
            )
            total_characters = characters_result.scalar() or 0
        except Exception as e:
            logger.warning(f"[ADMIN] Error counting characters: {e}")
            total_characters = 0
        
        # Информация о подписке
        subscription_info = None
        if user.subscription:
            subscription_info = {
                "type": user.subscription.subscription_type.value,
                "status": user.subscription.status.value,
                "monthly_credits": user.subscription.monthly_credits,
                "monthly_photos": user.subscription.monthly_photos,
                "used_credits": user.subscription.used_credits,
                "used_photos": user.subscription.used_photos,
                "max_message_length": user.subscription.max_message_length,
                "activated_at": user.subscription.activated_at.isoformat() if user.subscription.activated_at else None,
                "expires_at": user.subscription.expires_at.isoformat() if user.subscription.expires_at else None
            }
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "is_admin": user.is_admin,
                "coins": user.coins,
                "country": user.country,
                "registration_ip": user.registration_ip,
                "fingerprint_id": user.fingerprint_id,
                "total_messages_sent": user.total_messages_sent,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "subscription": subscription_info,
            "activity": {
                "total_messages": total_messages,
                "messages_24h": messages_24h,
                "last_message_at": last_message_date.isoformat() if last_message_date else None,
                "total_images": total_images,
                "images_24h": images_24h,
                "total_characters": total_characters
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Ошибка получения информации о пользователе {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения информации о пользователе: {str(e)}"
        )


@admin_router.post("/reset-stats")
@admin_router.post("/reset-stats/")
async def reset_stats(
    current_user: Users = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Сбрасывает статистику (обнуляет счетчики) без удаления данных.
    Обновляет даты создания записей и статусы подписок, чтобы все счетчики стали 0.
    """
    try:
        logger.warning(
            f"[ADMIN RESET] Админ {current_user.email} запустил сброс статистики"
        )
        
        from sqlalchemy import text, update
        from datetime import datetime, timedelta
        
        # Используем datetime без timezone, так как в БД TIMESTAMP WITHOUT TIME ZONE
        # Устанавливаем дату в прошлом (100 дней назад), чтобы все записи не попадали
        # в фильтры "за последние 24 часа/7 дней", что сбросит счетчики в 0
        past_date = datetime.utcnow() - timedelta(days=100)
        
        results = {}
        
        # 1. Обновляем created_at у всех пользователей (кроме админов) на прошлую дату
        # Это сбросит счетчики "новые пользователи за 24ч/7д" в 0
        users_updated = await db.execute(
            update(Users)
            .where(Users.is_admin == False)
            .values(created_at=past_date)
        )
        results['users'] = users_updated.rowcount
        
        # 2. Обновляем created_at у всех сообщений чата на прошлую дату
        # Это сбросит счетчик "активные пользователи за 24ч" в 0
        try:
            from app.models.chat_history import ChatHistory
            messages_updated = await db.execute(
                update(ChatHistory)
                .values(created_at=past_date)
            )
            results['messages'] = messages_updated.rowcount
        except Exception as e:
            logger.warning(f"[ADMIN RESET] Ошибка обновления дат сообщений: {e}")
            results['messages'] = 0
        
        # 3. Обновляем created_at у всех изображений на прошлую дату
        try:
            from app.models.image_generation_history import ImageGenerationHistory
            images_updated = await db.execute(
                update(ImageGenerationHistory)
                .values(created_at=past_date)
            )
            results['images'] = images_updated.rowcount
        except Exception as e:
            logger.warning(f"[ADMIN RESET] Ошибка обновления дат изображений: {e}")
            results['images'] = 0
        
        # 4. Устанавливаем статус всех подписок (кроме админов) в INACTIVE
        # Это обнулит счетчики FREE/STANDARD/PREMIUM подписок
        try:
            from app.models.subscription import UserSubscription, SubscriptionStatus
            
            # Получаем ID всех пользователей кроме админов
            admin_ids_result = await db.execute(
                select(Users.id).where(Users.is_admin == True)
            )
            admin_ids = [row[0] for row in admin_ids_result.all()]
            
            if admin_ids:
                # Обновляем подписки всех пользователей, кроме админов
                subscriptions_updated = await db.execute(
                    update(UserSubscription)
                    .where(~UserSubscription.user_id.in_(admin_ids))
                    .values(status=SubscriptionStatus.INACTIVE)
                )
                results['subscriptions'] = subscriptions_updated.rowcount
            else:
                # Если нет админов, обновляем все подписки
                subscriptions_updated = await db.execute(
                    update(UserSubscription)
                    .values(status=SubscriptionStatus.INACTIVE)
                )
                results['subscriptions'] = subscriptions_updated.rowcount
        except Exception as e:
            logger.warning(f"[ADMIN RESET] Ошибка обновления статусов подписок: {e}")
            results['subscriptions'] = 0
        
        # 5. Обнуляем монеты у всех пользователей (кроме админов)
        # Это обнулит счетчик "Монет в системе"
        try:
            coins_updated = await db.execute(
                update(Users)
                .where(Users.is_admin == False)
                .values(coins=0)
            )
            results['coins'] = coins_updated.rowcount
        except Exception as e:
            logger.warning(f"[ADMIN RESET] Ошибка обнуления монет: {e}")
            results['coins'] = 0
        
        await db.commit()
        
        logger.info(
            f"[ADMIN RESET] Статистика сброшена: обновлено {results['users']} пользователей, "
            f"{results['messages']} сообщений, {results['images']} изображений, "
            f"{results['subscriptions']} подписок, {results['coins']} пользователей с монетами"
        )
        
        return {
            "success": True,
            "message": f"Статистика сброшена. Обновлено: {results['users']} пользователей, "
                      f"{results['messages']} сообщений, {results['images']} изображений, "
                      f"{results['subscriptions']} подписок, {results['coins']} пользователей с монетами",
            "updated_users": results['users'],
            "updated_messages": results['messages'],
            "updated_images": results['images'],
            "updated_subscriptions": results['subscriptions'],
            "updated_coins": results['coins']
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
