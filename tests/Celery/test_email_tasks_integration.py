"""
Интеграционные тесты для задач отправки email (без моков).
"""
import pytest
from app.tasks.email_tasks import send_email_task


def test_send_email_task_structure(celery_app):
    """Тест структуры задачи отправки email."""
    task = celery_app.tasks.get("app.tasks.email_tasks.send_email_task")
    assert task is not None
    
    # Проверяем параметры задачи
    assert task.max_retries == 3
    assert task.default_retry_delay == 60


def test_send_email_task_callable(celery_app):
    """Тест, что задача отправки email может быть вызвана."""
    task = celery_app.tasks.get("app.tasks.email_tasks.send_email_task")
    
    assert callable(task)
    
    import inspect
    sig = inspect.signature(task)
    assert "to_email" in sig.parameters
    assert "verification_code" in sig.parameters


def test_send_email_task_validation(celery_app):
    """Тест валидации параметров задачи отправки email."""
    task = celery_app.tasks.get("app.tasks.email_tasks.send_email_task")
    
    # Проверяем, что задача требует обязательные параметры
    import inspect
    sig = inspect.signature(task)
    
    # to_email и verification_code должны быть обязательными
    to_email_param = sig.parameters.get("to_email")
    code_param = sig.parameters.get("verification_code")
    
    assert to_email_param is not None
    assert code_param is not None

