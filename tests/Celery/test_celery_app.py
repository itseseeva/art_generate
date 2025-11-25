"""
Тесты для конфигурации Celery приложения (интеграционные, без моков).
"""
import pytest
from celery import Celery


def test_celery_app_import():
    """Тест импорта Celery приложения."""
    from app.celery_app import celery_app
    
    assert celery_app is not None
    assert isinstance(celery_app, Celery)
    assert celery_app.main == "art_generation"


def test_celery_app_config(celery_app):
    """Тест конфигурации Celery приложения."""
    assert celery_app.conf.broker_connection_retry_on_startup is True
    assert celery_app.conf.task_track_started is True
    assert celery_app.conf.task_time_limit == 600
    assert celery_app.conf.task_soft_time_limit == 540
    assert celery_app.conf.task_acks_late is True
    assert celery_app.conf.worker_prefetch_multiplier == 1


def test_celery_app_queues(celery_app):
    """Тест настройки очередей."""
    assert celery_app.conf.task_default_queue == "normal_priority"
    assert celery_app.conf.task_default_exchange == "tasks"
    assert celery_app.conf.task_default_exchange_type == "direct"


def test_celery_app_task_routes(celery_app):
    """Тест маршрутизации задач по очередям."""
    routes = celery_app.conf.task_routes
    
    assert "app.tasks.generation_tasks.generate_image_task" in routes
    assert routes["app.tasks.generation_tasks.generate_image_task"]["queue"] == "high_priority"
    
    assert "app.tasks.storage_tasks.upload_to_cloud_task" in routes
    assert routes["app.tasks.storage_tasks.upload_to_cloud_task"]["queue"] == "normal_priority"
    
    assert "app.tasks.email_tasks.send_email_task" in routes
    assert routes["app.tasks.email_tasks.send_email_task"]["queue"] == "low_priority"


def test_celery_app_retry_config(celery_app):
    """Тест настройки retry."""
    assert celery_app.conf.task_default_retry_delay == 60
    assert celery_app.conf.task_max_retries == 3


def test_celery_app_serialization(celery_app):
    """Тест настройки сериализации."""
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.accept_content == ["json"]
    assert celery_app.conf.result_serializer == "json"


def test_celery_app_includes(celery_app):
    """Тест включенных модулей с задачами."""
    includes = celery_app.conf.include
    
    assert "app.tasks.generation_tasks" in includes
    assert "app.tasks.email_tasks" in includes
    assert "app.tasks.storage_tasks" in includes

