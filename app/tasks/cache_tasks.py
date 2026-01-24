"""
Задачи для работы с кэшем
"""
import logging
import os

from celery import Task
import redis

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


def _get_redis_url_for_celery() -> str:
    """
    Возвращает Redis URL с учётом окружения (Docker / локальная разработка).
    В Docker НЕ заменяем имена сервисов на localhost — иначе Celery не достучится до Redis.
    """
    redis_url = os.getenv("REDIS_URL") or os.getenv("REDIS_LOCAL") or "redis://localhost:6379/0"
    redis_url = (redis_url or "").strip() or "redis://localhost:6379/0"

    is_docker = os.path.exists("/.dockerenv") or os.getenv("IS_DOCKER", "").lower() == "true"

    if is_docker:
        # В Docker: оставляем имя сервиса (redis, art_generation_redis_local). localhost заменяем на сервис.
        if "localhost" in redis_url or "127.0.0.1" in redis_url:
            if "art_generation_redis_local" in (os.getenv("REDIS_URL") or os.getenv("REDIS_LOCAL") or ""):
                redis_url = redis_url.replace("localhost", "art_generation_redis_local").replace(
                    "127.0.0.1", "art_generation_redis_local"
                )
            else:
                redis_url = redis_url.replace("localhost", "redis").replace("127.0.0.1", "redis")
    else:
        # Не в Docker: заменяем имена сервисов на localhost (порт проброшен).
        if "://redis:" in redis_url or "://art_generation_redis_local:" in redis_url:
            redis_url = redis_url.replace("://redis:", "://localhost:").replace(
                "://art_generation_redis_local:", "://localhost:"
            )

    return redis_url


def _redis_client_from_url(redis_url: str, decode_responses: bool = True) -> redis.Redis:
    """
    Создаёт синхронный Redis-клиент из URL (поддерживает пароль в URL).
    """
    return redis.from_url(redis_url, decode_responses=decode_responses)


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
        redis_url = _get_redis_url_for_celery()
        r = _redis_client_from_url(redis_url)
        
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
        redis_url = _get_redis_url_for_celery()
        r = _redis_client_from_url(redis_url)
        
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

