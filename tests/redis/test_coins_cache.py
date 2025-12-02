"""
Тесты для кэширования монет пользователя с реальным Redis.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from app.services.coins_service import CoinsService
from app.utils.redis_cache import (
    cache_get, cache_set, key_user_coins,
    TTL_USER_COINS
)


@pytest_asyncio.fixture
async def mock_db():
    """Создает мок базы данных."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_get_user_coins_from_cache(redis_client, mock_db):
    """Тест получения монет из кэша."""
    service = CoinsService(mock_db)
    user_id = 123
    cached_coins = 500

    await cache_set(
        key_user_coins(user_id),
        cached_coins,
        ttl_seconds=TTL_USER_COINS
    )

    coins = await service.get_user_coins(user_id)

    assert coins == cached_coins
    mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_user_coins_from_db(redis_client, mock_db):
    """Тест получения монет из БД и сохранения в кэш."""
    service = CoinsService(mock_db)
    user_id = 123
    db_coins = 500

    # CoinsService использует .scalars().first(), а не .scalar_one_or_none()
    mock_scalars = MagicMock()
    mock_scalars.first = MagicMock(return_value=db_coins)
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=mock_scalars)
    mock_db.execute.return_value = mock_result

    coins = await service.get_user_coins(user_id)

    assert coins == db_coins
    cached = await cache_get(key_user_coins(user_id))
    assert cached == db_coins


@pytest.mark.asyncio
async def test_cache_invalidation_on_spend_coins(redis_client, mock_db):
    """Тест инвалидации кэша при трате монет."""
    service = CoinsService(mock_db)
    user_id = 123
    amount = 50

    mock_db.execute.return_value = MagicMock()
    await cache_set(key_user_coins(user_id), 500)

    result = await service.spend_coins(user_id, amount, commit=True)

    assert result is True
    assert await cache_get(key_user_coins(user_id)) is None


@pytest.mark.asyncio
async def test_cache_invalidation_on_add_coins(redis_client, mock_db):
    """Тест инвалидации кэша при добавлении монет."""
    service = CoinsService(mock_db)
    user_id = 123
    amount = 100

    mock_db.execute.return_value = MagicMock()
    await cache_set(key_user_coins(user_id), 500)

    result = await service.add_coins(user_id, amount, commit=True)

    assert result is True
    assert await cache_get(key_user_coins(user_id)) is None

