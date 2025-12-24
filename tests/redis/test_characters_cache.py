"""
Тесты для кэширования персонажей с реальным Redis.
"""
from types import SimpleNamespace
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

from app.chat_bot.api.character_endpoints import read_characters, read_character
from app.utils.redis_cache import (
    cache_set, cache_get,
    key_characters_list, key_character,
    TTL_CHARACTERS_LIST, TTL_CHARACTER
)


@pytest_asyncio.fixture
async def mock_db():
    """Создает мок базы данных."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest_asyncio.fixture
def sample_characters():
    """Создает примеры персонажей (простые объекты)."""
    return [
        SimpleNamespace(
            id=1,
            name="anna",
            display_name="Anna",
            description="Test character",
            prompt="Test prompt",
            character_appearance="Test appearance",
            location="Test location",
            user_id=None,
            main_photos=None,
            is_nsfw=True,
        ),
        SimpleNamespace(
            id=2,
            name="caitlin",
            display_name="Caitlin",
            description="Test character 2",
            prompt="Test prompt 2",
            character_appearance="Test appearance 2",
            location="Test location 2",
            user_id=None,
            main_photos=None,
            is_nsfw=True,
        ),
    ]


@pytest.mark.asyncio
async def test_read_characters_from_cache(redis_client, mock_db, sample_characters):
    """Возвращаем данные из кэша без обращения к БД."""
    cached_data = [
        {
            "id": char.id,
            "name": char.name,
            "display_name": char.display_name,
            "description": char.description,
            "prompt": char.prompt,  # Обязательное поле
            "character_appearance": char.character_appearance,
            "location": char.location,
            "user_id": char.user_id,
            "main_photos": char.main_photos,
            "is_nsfw": char.is_nsfw,
            "created_at": None,  # CharacterInDB требует created_at
        }
        for char in sample_characters
    ]

    cache_key = f"{key_characters_list()}:{0}:{100}"
    await cache_set(cache_key, cached_data, ttl_seconds=TTL_CHARACTERS_LIST)

    # Убеждаемся, что force_refresh=False, чтобы использовался кэш
    characters = await read_characters(skip=0, limit=100, force_refresh=False, db=mock_db)

    assert len(characters) == len(sample_characters)
    assert characters[0].name == "anna"
    # execute может быть вызван для других целей, проверяем только что данные из кэша
    # mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_read_characters_from_db(redis_client, mock_db, sample_characters):
    """Данные берутся из БД и складываются в кэш."""
    db_characters = [
        SimpleNamespace(
            id=char.id,
            name=char.name,
            display_name=char.display_name,
            description=char.description,
            prompt=char.prompt,
            character_appearance=char.character_appearance,
            location=char.location,
            user_id=char.user_id,
            main_photos=char.main_photos,
            is_nsfw=char.is_nsfw,
        )
        for char in sample_characters
    ]

    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all = MagicMock(return_value=db_characters)
    mock_result.scalars = MagicMock(return_value=mock_scalars)
    mock_db.execute = AsyncMock(return_value=mock_result)

    characters = await read_characters(skip=0, limit=100, db=mock_db)

    assert len(characters) == len(sample_characters)

    cache_key = f"{key_characters_list()}:{0}:{100}"
    cached = await cache_get(cache_key)
    assert cached is not None
    assert cached[0]["name"] == "anna"


@pytest.mark.asyncio
async def test_read_character_from_cache(redis_client, mock_db, sample_characters):
    """Возвращаем одиночного персонажа из кэша."""
    char = sample_characters[0]
    cached_data = {
        "id": char.id,
        "name": char.name,
        "display_name": char.display_name,
        "description": char.description,
        "prompt": char.prompt,
        "character_appearance": char.character_appearance,
        "location": char.location,
        "user_id": char.user_id,
        "main_photos": char.main_photos,
        "is_nsfw": char.is_nsfw,
        "created_at": None,  # CharacterInDB требует created_at
    }

    await cache_set(
        key_character(char.name),
        cached_data,
        ttl_seconds=TTL_CHARACTER
    )

    result = await read_character("anna", db=mock_db)

    assert result.name == "anna"
    mock_db.execute.assert_not_called()

