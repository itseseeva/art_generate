"""
Общие фикстуры для всех тестов.
"""
import pytest
import pytest_asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Настройка тестового окружения."""
    # Устанавливаем переменные окружения для тестов
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
    os.environ.setdefault("SECRET_KEY", "test-secret-key")
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
    
    yield
    
    # Очистка после тестов
    pass


@pytest_asyncio.fixture
async def mock_db_session():
    """Создает мок сессии базы данных."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    db.flush = AsyncMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db

