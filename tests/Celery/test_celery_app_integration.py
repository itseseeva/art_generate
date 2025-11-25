"""
Интеграционные тесты для конфигурации Celery приложения (без моков).
"""
import pytest
from celery import Celery


def test_celery_app_import():
    """Тест импорта Celery приложения."""
    from app.celery_app import celery_app
    
    assert celery_app is not None
    assert isinstance(celery_app, Celery)
    assert celery_app.main == "art_generation"


@pytest.mark.asyncio
async def test_celery_app_redis_connection(celery_app, redis_client):
    """Тест подключения Celery к Redis."""
    # Проверяем, что Redis доступен
    result = await redis_client.ping()
    assert result is True

    # Проверяем, что Celery может использовать Redis
    assert celery_app.conf.broker_url is not None
    assert celery_app.conf.result_backend is not None


def test_celery_app_config(celery_app):
    """Тест конфигурации Celery приложения."""
    assert celery_app.conf.broker_connection_retry_on_startup is True
    assert celery_app.conf.task_track_started is True
    assert celery_app.conf.task_time_limit == 600
    assert celery_app.conf.task_soft_time_limit == 540
    assert celery_app.conf.task_acks_late is True
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_celery_app_task_registration(celery_app):
    """Тест регистрации задач в Celery."""
    registered_tasks = list(celery_app.tasks.keys())
    
    # Проверяем, что задачи зарегистрированы
    assert "app.tasks.generation_tasks.generate_image_task" in registered_tasks
    assert "app.tasks.email_tasks.send_email_task" in registered_tasks
    assert "app.tasks.storage_tasks.upload_to_cloud_task" in registered_tasks
    assert "app.tasks.generation_tasks.save_chat_history_task" in registered_tasks

