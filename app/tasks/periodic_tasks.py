"""
Периодические задачи Celery для обслуживания системы.
"""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовый класс для задач с callback."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"[CELERY] Периодическая задача {task_id} завершена успешно")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"[CELERY] Периодическая задача {task_id} завершилась с ошибкой: {exc}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.periodic_tasks.cleanup_old_data_task"
)
def cleanup_old_data_task(self) -> Dict[str, Any]:
    """
    Очистка старых данных из базы данных.
    Удаляет:
    - Истекшие refresh tokens (старше 30 дней)
    - Старые email verification codes (старше 7 дней)
    - Старые записи истории чата (опционально, по настройкам)
    
    Returns:
        Dict с результатами очистки
    """
    try:
        import asyncio
        from app.database.db import async_session_maker
        from app.models.user import RefreshToken, EmailVerificationCode
        from sqlalchemy import select, delete
        from datetime import datetime, timezone
        
        async def cleanup():
            async with async_session_maker() as db:
                cleanup_stats = {
                    "refresh_tokens": 0,
                    "verification_codes": 0,
                    "errors": []
                }
                
                try:
                    # Очистка истекших refresh tokens
                    cutoff_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
                    result = await db.execute(
                        delete(RefreshToken).where(RefreshToken.expires_at < cutoff_date)
                    )
                    cleanup_stats["refresh_tokens"] = result.rowcount
                    logger.info(f"[CLEANUP] Удалено {result.rowcount} истекших refresh tokens")
                    
                    # Очистка старых verification codes
                    codes_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
                    result = await db.execute(
                        delete(EmailVerificationCode).where(
                            EmailVerificationCode.expires_at < codes_cutoff
                        )
                    )
                    cleanup_stats["verification_codes"] = result.rowcount
                    logger.info(f"[CLEANUP] Удалено {result.rowcount} старых verification codes")
                    
                    await db.commit()
                    
                except Exception as e:
                    await db.rollback()
                    cleanup_stats["errors"].append(str(e))
                    logger.error(f"[CLEANUP] Ошибка очистки: {e}")
                    raise
                
                return cleanup_stats
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            cleanup_stats = loop.run_until_complete(cleanup())
        finally:
            loop.close()
        
        logger.info(f"[CLEANUP] Очистка завершена: {cleanup_stats}")
        return {
            "success": True,
            "stats": cleanup_stats
        }
        
    except Exception as exc:
        logger.error(f"[CLEANUP] Критическая ошибка очистки: {exc}")
        return {
            "success": False,
            "error": str(exc)
        }


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.periodic_tasks.clear_expired_cache_task"
)
def clear_expired_cache_task(self) -> Dict[str, Any]:
    """
    Очистка истекших ключей кэша из Redis.
    
    Returns:
        Dict с результатами очистки
    """
    try:
        import asyncio
        from app.utils.redis_cache import get_redis_client
        
        async def clear_cache():
            redis_client = await get_redis_client()
            if not redis_client:
                logger.warning("[CLEANUP] Redis недоступен, пропускаем очистку кэша")
                return {"cleared": 0}
            
            # Redis автоматически удаляет истекшие ключи при доступе
            # Но можно явно проверить и удалить старые ключи
            cleared = 0
            
            # Очищаем старые ключи rate limiting (старше 1 часа)
            try:
                keys = await redis_client.keys("rate_limit:*")
                for key in keys:
                    ttl = await redis_client.ttl(key)
                    if ttl == -1:  # Ключ без TTL
                        await redis_client.delete(key)
                        cleared += 1
            except Exception as e:
                logger.warning(f"[CLEANUP] Ошибка очистки rate_limit ключей: {e}")
            
            return {"cleared": cleared}
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(clear_cache())
        finally:
            loop.close()
        
        logger.info(f"[CLEANUP] Очищено {result.get('cleared', 0)} истекших ключей кэша")
        return {
            "success": True,
            "cleared": result.get("cleared", 0)
        }
        
    except Exception as exc:
        logger.error(f"[CLEANUP] Ошибка очистки кэша: {exc}")
        return {
            "success": False,
            "error": str(exc)
        }


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.periodic_tasks.transfer_expired_subscription_credits_task"
)
def transfer_expired_subscription_credits_task(self) -> Dict[str, Any]:
    """
    Переводит остатки кредитов истекших подписок на баланс пользователей.
    Выполняется ежедневно для обработки истекших подписок.
    
    Returns:
        Dict с результатами обработки
    """
    try:
        import asyncio
        from app.database.db import async_session_maker
        from app.models.subscription import UserSubscription, SubscriptionStatus
        from app.models.user import Users
        from sqlalchemy import select
        
        async def transfer_credits():
            async with async_session_maker() as db:
                stats = {
                    "processed": 0,
                    "credits_transferred": 0,
                    "errors": []
                }
                
                try:
                    # Находим истекшие подписки со статусом ACTIVE
                    now = datetime.utcnow()
                    query = select(UserSubscription).where(
                        UserSubscription.status == SubscriptionStatus.ACTIVE,
                        UserSubscription.expires_at < now
                    )
                    result = await db.execute(query)
                    expired_subscriptions = result.scalars().all()
                    
                    for subscription in expired_subscriptions:
                        try:
                            # Вычисляем остатки кредитов
                            credits_remaining = max(0, subscription.monthly_credits - subscription.used_credits)
                            
                            if credits_remaining > 0:
                                # Получаем пользователя
                                user_query = select(Users).where(Users.id == subscription.user_id)
                                user_result = await db.execute(user_query)
                                user = user_result.scalars().first()
                                
                                if user:
                                    # Переводим кредиты на баланс
                                    old_balance = user.coins
                                    user.coins += credits_remaining
                                    
                                    # Записываем историю баланса
                                    try:
                                        from app.utils.balance_history import record_balance_change
                                        await record_balance_change(
                                            db=db,
                                            user_id=user.id,
                                            amount=credits_remaining,
                                            reason=f"Остатки кредитов истекшей подписки {subscription.subscription_type.value.upper()} переведены на баланс"
                                        )
                                    except Exception as e:
                                        logger.warning(f"Не удалось записать историю баланса для user_id={user.id}: {e}")
                                    
                                    # Устанавливаем статус EXPIRED
                                    subscription.status = SubscriptionStatus.EXPIRED
                                    subscription.used_credits = subscription.monthly_credits  # Сбрасываем остатки
                                    
                                    stats["processed"] += 1
                                    stats["credits_transferred"] += credits_remaining
                                    
                                    logger.info(
                                        f"[EXPIRED SUBSCRIPTION] user_id={user.id}, "
                                        f"credits_transferred={credits_remaining}, "
                                        f"balance: {old_balance} -> {user.coins}"
                                    )
                        except Exception as e:
                            error_msg = f"Ошибка обработки подписки user_id={subscription.user_id}: {e}"
                            stats["errors"].append(error_msg)
                            logger.error(error_msg)
                    
                    await db.commit()
                    
                except Exception as e:
                    await db.rollback()
                    stats["errors"].append(str(e))
                    logger.error(f"[EXPIRED SUBSCRIPTION] Ошибка обработки: {e}")
                    raise
                
                return stats
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            stats = loop.run_until_complete(transfer_credits())
        finally:
            loop.close()
        
        logger.info(f"[EXPIRED SUBSCRIPTION] Обработка завершена: {stats}")
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as exc:
        logger.error(f"[EXPIRED SUBSCRIPTION] Критическая ошибка: {exc}")
        return {
            "success": False,
            "error": str(exc)
        }


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.periodic_tasks.cleanup_old_voices_task"
)
def cleanup_old_voices_task(self) -> Dict[str, Any]:
    """
    Очистка старых аудиофайлов из app/voices/.
    Удаляет только временные preview файлы старше 3-х дней, которые НЕ связаны с UserVoice.
    НЕ удаляет файлы, которые используются в БД (preview_url в UserVoice).
    """
    try:
        import asyncio
        from app.config.paths import VOICES_DIR
        from app.database.db import async_session_maker
        from app.models.user_voice import UserVoice
        from sqlalchemy import select
        import os
        import time
        
        async def cleanup():
            stats = {"deleted": 0, "skipped": 0, "errors": []}
            
            if not VOICES_DIR.exists():
                return {"success": True, "deleted": 0, "skipped": 0}
            
            # Получаем список всех preview_url из БД, которые используются
            async with async_session_maker() as db:
                result = await db.execute(
                    select(UserVoice.preview_url).where(UserVoice.preview_url.isnot(None))
                )
                used_preview_urls = {row[0] for row in result.all() if row[0]}
                
                # Извлекаем имена файлов из URL (например, /voices/preview_xxx.mp3 -> preview_xxx.mp3)
                used_filenames = set()
                for url in used_preview_urls:
                    if url:
                        # Извлекаем имя файла из URL
                        filename = os.path.basename(url)
                        if filename:
                            used_filenames.add(filename)
            
            now = time.time()
            retention_period = 3 * 24 * 60 * 60  # 3 дня в секундах
            
            # Обрабатываем только preview файлы (начинаются с preview_)
            for file_path in VOICES_DIR.glob("preview_*.mp3"):
                try:
                    if file_path.is_file():
                        filename = file_path.name
                        
                        # Пропускаем файлы, которые используются в БД
                        if filename in used_filenames:
                            stats["skipped"] += 1
                            continue
                        
                        # Проверяем возраст файла
                        file_age = now - file_path.stat().st_mtime
                        if file_age > retention_period:
                            file_path.unlink()
                            stats["deleted"] += 1
                            logger.debug(f"[CLEANUP] Удален старый preview файл: {filename}")
                except Exception as e:
                    stats["errors"].append(f"Ошибка при удалении {file_path}: {e}")
                    logger.warning(f"[CLEANUP] Ошибка при удалении {file_path}: {e}")
            
            logger.info(f"[CLEANUP] Удалено {stats['deleted']} старых preview файлов, пропущено {stats['skipped']} используемых файлов")
            return {
                "success": True,
                "stats": stats
            }
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(cleanup())
            return result
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"[CLEANUP] Ошибка в задаче очистки голосов: {e}", exc_info=True)
        return {
            "success": False, 
            "error": str(e)
        }
