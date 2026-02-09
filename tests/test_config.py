"""
Тестовая конфигурация для переопределения настроек в тестовом окружении.
"""
import os
from typing import Optional


class TestConfig:
    """Конфигурация для тестового окружения."""
    
    # База данных
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Kohkau11999@localhost:5432/art_generate_test_db"
    
    # Redis (используем fakeredis)
    REDIS_URL: str = "redis://localhost:6379/1"  # Отдельная БД для тестов
    
    # Отключаем внешние сервисы в тестах
    TELEGRAM_BOT_ENABLED: bool = False
    
    # Тестовые API ключи
    RUNPOD_API_KEY: str = os.getenv("RUNPOD_API_KEY", "test-api-key")
    OPENROUTER_KEY: str = os.getenv("OPENROUTER_KEY", "test-openrouter-key")
    
    # Тестовые URL
    RUNPOD_URL: str = "https://api.runpod.ai/v2/test/run"
    RUNPOD_URL_2: str = "https://api.runpod.ai/v2/test2/run"
    RUNPOD_URL_3: str = "https://api.runpod.ai/v2/test3/run"
    
    # JWT
    SECRET_KEY: str = "test-secret-key-for-testing-only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Yandex Storage (мок)
    YANDEX_BUCKET_NAME: str = "test-bucket"
    YANDEX_ACCESS_KEY: str = "test-access-key"
    YANDEX_SECRET_KEY: str = "test-secret-key"
    YANDEX_ENDPOINT_URL: str = "https://storage.yandexcloud.net"
    
    # Email (отключаем в тестах)
    EMAIL_HOST: str = "smtp.test.com"
    EMAIL_PORT: int = 2525
    EMAIL_USE_TLS: bool = False
    EMAIL_HOST_USER: str = "test@test.com"
    EMAIL_HOST_PASSWORD: str = "test-password"
    
    # Домены
    FRONTEND_URL: str = "http://localhost:5175"
    BASE_URL: str = "http://localhost:8000"
    DOMAIN: str = "http://localhost:8000"


# Экземпляр конфигурации
test_config = TestConfig()
