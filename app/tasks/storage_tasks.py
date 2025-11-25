"""
Задачи Celery для работы с облачным хранилищем.
"""
import logging
from typing import Dict, Any, Optional
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовый класс для задач с колбэками."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Вызывается при успешном выполнении задачи."""
        logger.info(f"[CELERY] Storage задача {task_id} выполнена успешно")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при ошибке выполнения задачи."""
        logger.error(f"[CELERY] Storage задача {task_id} завершилась с ошибкой: {exc}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.storage_tasks.upload_to_cloud_task"
)
def upload_to_cloud_task(
    self,
    image_data_base64: str,
    object_key: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Задача Celery для загрузки изображения в облако.
    
    Args:
        self: Экземпляр задачи
        image_data_base64: Base64 строка с изображением
        object_key: Ключ объекта в бакете
        metadata: Дополнительные метаданные
        
    Returns:
        Dict с URL загруженного файла
    """
    import asyncio
    import base64
    
    try:
        # Ленивый импорт - импортируем только при выполнении задачи
        from app.services.yandex_storage import get_yandex_storage_service
        
        # Декодируем base64
        image_bytes = base64.b64decode(image_data_base64)
        
        # Загружаем в облако
        service = get_yandex_storage_service()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            cloud_url = loop.run_until_complete(
                service.upload_file(
                    file_data=image_bytes,
                    object_key=object_key,
                    content_type='image/png',
                    metadata=metadata or {}
                )
            )
            
            return {
                "success": True,
                "cloud_url": cloud_url,
                "object_key": object_key
            }
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"[CELERY] Ошибка загрузки в облако: {exc}")
        raise self.retry(exc=exc, countdown=60)

