"""
Задачи Celery для отправки email.
"""
import logging
from typing import Dict, Any
from celery import Task
from app.celery_app import celery_app
from app.mail_service.sender import EmailSender

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовый класс для задач с колбэками."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Вызывается при успешном выполнении задачи."""
        logger.info(f"[CELERY] Email задача {task_id} выполнена успешно")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при ошибке выполнения задачи."""
        logger.error(f"[CELERY] Email задача {task_id} завершилась с ошибкой: {exc}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.email_tasks.send_email_task"
)
def send_email_task(
    self,
    to_email: str,
    verification_code: str
) -> Dict[str, Any]:
    """
    Задача Celery для отправки email с кодом верификации.
    
    Args:
        self: Экземпляр задачи
        to_email: Email получателя
        verification_code: Код верификации
        
    Returns:
        Dict с результатом отправки
    """
    try:
        email_sender = EmailSender()
        success = email_sender.send_verification_email(to_email, verification_code)
        
        if success:
            return {"success": True, "message": f"Email отправлен на {to_email}"}
        else:
            return {"success": False, "message": f"Не удалось отправить email на {to_email}"}
    except Exception as exc:
        logger.error(f"[CELERY] Ошибка отправки email: {exc}")
        raise self.retry(exc=exc, countdown=60)

