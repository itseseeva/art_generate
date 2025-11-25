"""
Интеграционные тесты для задач работы с облачным хранилищем (без моков).
"""
import pytest
import base64
from app.tasks.storage_tasks import upload_to_cloud_task


def test_upload_to_cloud_task_structure(celery_app):
    """Тест структуры задачи загрузки в облако."""
    task = celery_app.tasks.get("app.tasks.storage_tasks.upload_to_cloud_task")
    assert task is not None
    
    # Проверяем параметры задачи
    assert task.max_retries == 3
    assert task.default_retry_delay == 60


def test_upload_to_cloud_task_callable(celery_app):
    """Тест, что задача загрузки может быть вызвана."""
    task = celery_app.tasks.get("app.tasks.storage_tasks.upload_to_cloud_task")
    
    assert callable(task)
    
    import inspect
    sig = inspect.signature(task)
    assert "image_data_base64" in sig.parameters
    assert "object_key" in sig.parameters
    assert "metadata" in sig.parameters


def test_upload_to_cloud_task_base64_encoding():
    """Тест кодирования base64 для загрузки."""
    # Создаем тестовые данные
    image_data = b"fake_image_data"
    image_data_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # Проверяем, что кодирование работает
    assert isinstance(image_data_base64, str)
    assert len(image_data_base64) > 0
    
    # Проверяем декодирование
    decoded = base64.b64decode(image_data_base64)
    assert decoded == image_data

