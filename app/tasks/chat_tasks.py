"""
Celery задачи для работы с чатом.
"""

import logging
from typing import Optional, Dict, Any
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовый класс для задач с callback."""
    
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"[CELERY] Chat задача {task_id} завершена успешно")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"[CELERY] Chat задача {task_id} завершилась с ошибкой: {exc}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.chat_tasks.save_chat_history_async_task",
    max_retries=3,
    default_retry_delay=60
)
def save_chat_history_async_task(
    self,
    user_id: Optional[str],
    character_data: Optional[Dict[str, Any]],
    message: str,
    response: str,
    image_url: Optional[str] = None,
    image_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Асинхронная задача Celery для сохранения истории чата в фоне.
    
    Args:
        self: Экземпляр задачи
        user_id: ID пользователя
        character_data: Данные персонажа
        message: Сообщение пользователя
        response: Ответ ассистента
        image_url: URL изображения (опционально)
        image_filename: Имя файла изображения (опционально)
        
    Returns:
        Dict с результатом сохранения
    """
    try:
        import asyncio
        from app.main import _write_chat_history
        
        # Запускаем асинхронную функцию в новом event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(
                _write_chat_history(
                    user_id=user_id,
                    character_data=character_data,
                    message=message,
                    response=response,
                    image_url=image_url,
                    image_filename=image_filename
                )
            )
            
            logger.info(f"[CELERY] История чата сохранена для user_id={user_id}, character={character_data.get('name') if character_data else None}")
            
            return {
                "success": True,
                "user_id": user_id,
                "character": character_data.get("name") if character_data else None
            }
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"[CELERY] Ошибка сохранения истории чата: {exc}")
        if self.request.retries < self.max_retries:
            logger.warning(f"[CELERY] Повтор сохранения истории ({self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc, countdown=60)
        else:
            logger.error(f"[CELERY] Превышен лимит попыток сохранения истории")
            return {
                "success": False,
                "error": str(exc)
            }

