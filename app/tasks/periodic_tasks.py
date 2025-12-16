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
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(cleanup())
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

