"""
Тесты для кэширования данных пользователя с реальным Redis.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from types import SimpleNamespace

from app.auth.dependencies import get_current_user
from app.utils.redis_cache import cache_set, cache_get, key_user, TTL_USER


@pytest_asyncio.fixture
async def mock_db():
    """Создает мок базы данных."""
    db = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest_asyncio.fixture
def sample_user():
    """Создает пример пользователя (словарь для избежания проблем с SQLAlchemy)."""
    return {
        "id": 1,
        "email": "test@example.com",
        "password_hash": "hashed_password",
        "is_active": True,
        "coins": 100
    }


@pytest.mark.asyncio
async def test_get_current_user_from_cache(redis_client, mock_db, sample_user):
    """Тест получения пользователя из кэша."""
    # Мокаем JWT токен
    mock_credentials = MagicMock()
    mock_credentials.credentials = "valid_token"

    await cache_set(
        key_user(sample_user["email"]),
        sample_user,
        ttl_seconds=TTL_USER
    )

    # Создаем мок для Users, чтобы избежать проблем с SQLAlchemy
    from types import SimpleNamespace
    mock_user_cls = lambda **kwargs: SimpleNamespace(**kwargs)
    
    with patch("app.auth.dependencies.jwt.decode", return_value={"sub": sample_user["email"]}):
        with patch("app.auth.dependencies.Users", mock_user_cls):
            user = await get_current_user(mock_credentials, mock_db)

    assert user is not None
    assert user.email == sample_user["email"]
    assert user.id == sample_user["id"]
    mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_current_user_from_db(redis_client, mock_db, sample_user):
    """Тест получения пользователя из БД и сохранения в кэш."""
    # Добавляем username в sample_user для совместимости с get_current_user
    db_user = SimpleNamespace(**{**sample_user, "username": "testuser"})

    # Мокаем JWT токен
    mock_credentials = MagicMock()
    mock_credentials.credentials = "valid_token"
    
    with patch('app.auth.dependencies.jwt.decode', return_value={"sub": sample_user["email"]}):
        # get_current_user использует .scalar_one_or_none()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=db_user)
        mock_db.execute.return_value = mock_result
        
        user = await get_current_user(mock_credentials, mock_db)
        
        assert user is not None
        assert user.email == sample_user["email"]

        cached = await cache_get(key_user(sample_user["email"]))
        assert cached is not None
        assert cached["email"] == sample_user["email"]

