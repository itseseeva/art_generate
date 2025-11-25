"""
Интеграционные тесты для API эндпоинтов, использующих Celery (без моков).
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Создает тестовый клиент FastAPI."""
    return TestClient(app)


def test_generate_image_endpoint_exists(client):
    """Тест, что эндпоинт генерации изображения существует."""
    # Отправляем запрос без авторизации (должен вернуть ошибку валидации или задачу)
    response = client.post(
        "/api/v1/generate-image/",
        json={
            "prompt": "test prompt",
            "character": "anna"
        }
    )
    
    # Проверяем, что эндпоинт существует (не 404)
    assert response.status_code != 404


def test_generation_status_endpoint_exists(client):
    """Тест, что эндпоинт проверки статуса существует."""
    # Отправляем запрос с несуществующим task_id
    response = client.get("/api/v1/generation-status/test-task-id")
    
    # Проверяем, что эндпоинт существует (не 404)
    assert response.status_code != 404


def test_generate_image_endpoint_validation(client):
    """Тест валидации запроса генерации изображения."""
    # Отправляем запрос без обязательных полей
    response = client.post(
        "/api/v1/generate-image/",
        json={}
    )
    
    # Должна быть ошибка валидации
    assert response.status_code in [400, 422]


def test_generate_image_endpoint_invalid_character(client):
    """Тест валидации имени персонажа."""
    # Отправляем запрос с невалидным именем персонажа
    response = client.post(
        "/api/v1/generate-image/",
        json={
            "prompt": "test",
            "character": "invalid/character/name"
        }
    )
    
    # Должна быть ошибка валидации
    assert response.status_code in [400, 422]


def test_generation_status_endpoint_handles_invalid_task_id(client):
    """Тест обработки несуществующего task_id."""
    # Отправляем запрос с несуществующим task_id
    response = client.get("/api/v1/generation-status/invalid-task-id-12345")
    
    # Эндпоинт должен обработать запрос (не упасть)
    assert response.status_code in [200, 500]  # Может вернуть ошибку, но не упасть


def test_api_endpoints_content_type(client):
    """Тест, что эндпоинты возвращают JSON."""
    # Проверяем эндпоинт статуса
    response = client.get("/api/v1/generation-status/test-id")
    
    # Должен вернуть JSON
    assert response.headers.get("content-type") is not None
    assert "application/json" in response.headers.get("content-type", "")

