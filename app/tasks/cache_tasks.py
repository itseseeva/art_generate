"""
Задачи для работы с кэшем
"""
import logging
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовая задача с callback'ами для логирования"""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"[CELERY] Cache задача {task_id} успешно завершена")

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"[CELERY] Cache задача {task_id} завершилась с ошибкой: {exc}")


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name="app.tasks.cache_tasks.clear_cache_task",
    max_retries=3,
    default_retry_delay=60
)
def clear_cache_task(self):
    """
    Очищает весь кэш в Redis.
    Запускается автоматически каждый день в 00:00.
    """
    try:
        import redis
        import os
        from urllib.parse import urlparse
        
        # Получаем URL Redis
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        # Автозамена redis:// на localhost:// для локалки
        if "://redis:" in redis_url:
            redis_url = redis_url.replace("://redis:", "://localhost:")
        
        # Парсим URL
        if redis_url.startswith("redis://"):
            url_for_parse = redis_url.replace("redis://", "http://", 1)
        else:
            url_for_parse = f"http://{redis_url}"
        
        parsed = urlparse(url_for_parse)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        db = 0
        if parsed.path:
            db_str = parsed.path.lstrip("/").split("/")[0]
            if db_str:
                try:
                    db = int(db_str)
                except ValueError:
                    db = 0
        
        # Подключаемся к Redis
        r = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        
        # Получаем все ключи приложения (кроме Celery)
        all_keys = r.keys("*")
        app_keys = [k for k in all_keys if not k.startswith("celery-task-meta-")]
        
        if app_keys:
            deleted = r.delete(*app_keys)
            logger.info(f"[CACHE] Очищено {deleted} ключей кэша")
            logger.info(f"[CACHE] Очищенные типы: characters, subscription, user, prompts")
        else:
            logger.info("[CACHE] Кэш уже пустой")
        
        return {
            "success": True,
            "deleted_keys": len(app_keys),
            "message": "Cache cleared successfully"
        }
        
    except Exception as exc:
        logger.error(f"[CACHE] Ошибка очистки кэша: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(
    base=CallbackTask,
    bind=True,
    name="app.tasks.cache_tasks.clear_characters_cache_task",
    max_retries=3,
    default_retry_delay=60
)
def clear_characters_cache_task(self):
    """
    Очищает только кэш персонажей.
    Более мягкая очистка - не трогает подписки и пользователей.
    """
    try:
        import redis
        import os
        from urllib.parse import urlparse
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        if "://redis:" in redis_url:
            redis_url = redis_url.replace("://redis:", "://localhost:")
        
        if redis_url.startswith("redis://"):
            url_for_parse = redis_url.replace("redis://", "http://", 1)
        else:
            url_for_parse = f"http://{redis_url}"
        
        parsed = urlparse(url_for_parse)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        db = 0
        if parsed.path:
            db_str = parsed.path.lstrip("/").split("/")[0]
            if db_str:
                try:
                    db = int(db_str)
                except ValueError:
                    db = 0
        
        r = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        
        # Очищаем только кэш персонажей
        character_keys = r.keys("characters:*")
        
        if character_keys:
            deleted = r.delete(*character_keys)
            logger.info(f"[CACHE] Очищено {deleted} ключей персонажей")
        else:
            logger.info("[CACHE] Кэш персонажей уже пустой")
        
        return {
            "success": True,
            "deleted_keys": len(character_keys),
            "message": "Characters cache cleared"
        }
        
    except Exception as exc:
        logger.error(f"[CACHE] Ошибка очистки кэша персонажей: {exc}")
        raise self.retry(exc=exc, countdown=60)

