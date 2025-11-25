"""
Тесты для базового модуля Redis кэширования с реальным сервером.
"""
import json
import uuid
import os
import pytest

from app.utils.redis_cache import (
    get_redis_client, close_redis_client,
    cache_get, cache_set, cache_delete, cache_delete_pattern, cache_exists,
    key_subscription, key_subscription_stats, key_user, key_user_coins,
    key_characters_list, key_character, key_character_photos, key_character_main_photos,
    key_generation_settings, key_generation_fallback, key_prompts_default,
    key_chat_history, key_chat_status,
    TTL_SUBSCRIPTION, TTL_CHARACTERS_LIST, TTL_USER
)


def _unique_key(prefix: str = "test") -> str:
    return f"{prefix}:{uuid.uuid4()}"


@pytest.mark.asyncio
async def test_get_redis_client_success(redis_client):
    """Тест успешного подключения к Redis."""
    client = await get_redis_client()
    assert client is redis_client
    assert await client.ping() == True


@pytest.mark.asyncio
async def test_get_redis_client_failure(monkeypatch):
    """Тест обработки ошибки подключения к Redis без моков."""
    from app.utils import redis_cache
    
    bad_url = "redis://127.0.0.1:6390/15"
    original_url = os.getenv("REDIS_URL", "")
    
    # Закрываем и сбрасываем существующий клиент
    try:
        await redis_cache.close_redis_client()
    except Exception:
        pass  # Игнорируем ошибки закрытия
    
    # Сбрасываем глобальную переменную
    redis_cache._redis_client = None
    
    # Устанавливаем плохой URL
    monkeypatch.setenv("REDIS_URL", bad_url)
    
    # Пытаемся подключиться - должно вернуть None из-за таймаута
    client = await redis_cache.get_redis_client()
    assert client is None, "Клиент должен быть None при недоступном Redis"

    # Возвращаем корректный URL для последующих тестов
    if original_url:
        monkeypatch.setenv("REDIS_URL", original_url)
    else:
        monkeypatch.delenv("REDIS_URL", raising=False)
    
    # Сбрасываем клиент для следующих тестов
    redis_cache._redis_client = None


@pytest.mark.asyncio
async def test_cache_set_get(redis_client):
    """Тест сохранения и получения значения из кэша."""
    test_key = _unique_key("cache:setget")
    test_value = {"test": "data", "number": 123}

    result = await cache_set(test_key, test_value, ttl_seconds=60)
    assert result is True

    cached_value = await cache_get(test_key)
    assert cached_value == test_value
    assert await redis_client.ttl(test_key) > 0


@pytest.mark.asyncio
async def test_cache_get_none(redis_client):
    """Тест получения несуществующего ключа."""
    test_key = _unique_key("cache:none")
    result = await cache_get(test_key)
    assert result is None


@pytest.mark.asyncio
async def test_cache_delete(redis_client):
    """Тест удаления ключа из кэша."""
    test_key = _unique_key("cache:delete")
    await redis_client.set(test_key, "value")

    result = await cache_delete(test_key)
    assert result is True
    assert await redis_client.get(test_key) is None


@pytest.mark.asyncio
async def test_cache_delete_pattern(redis_client):
    """Тест удаления ключей по паттерну."""
    pattern = _unique_key("pattern")
    keys = [f"{pattern}:{i}" for i in range(3)]
    for key in keys:
        await redis_client.set(key, f"value:{key}")

    deleted_count = await cache_delete_pattern(f"{pattern}:*")
    assert deleted_count == len(keys)
    # Проверяем каждый ключ отдельно
    for key in keys:
        value = await redis_client.get(key)
        assert value is None


@pytest.mark.asyncio
async def test_cache_exists(redis_client):
    """Тест проверки существования ключа."""
    test_key = _unique_key("cache:exists")
    await redis_client.set(test_key, "value")

    result = await cache_exists(test_key)
    assert result is True


@pytest.mark.asyncio
async def test_cache_exists_false(redis_client):
    """Тест проверки несуществующего ключа."""
    test_key = _unique_key("cache:not_exists")
    result = await cache_exists(test_key)
    assert result is False


def test_key_generators():
    """Тест генераторов ключей кэша."""
    assert key_subscription(123) == "subscription:user:123"
    assert key_subscription_stats(456) == "subscription:stats:456"
    assert key_user("test@example.com") == "user:email:test@example.com"
    assert key_user_coins(789) == "user:coins:789"
    assert key_characters_list() == "characters:list"
    assert key_character("anna") == "character:anna"
    assert key_character_photos(1) == "character:photos:1"
    assert key_character_main_photos(2) == "character:main_photos:2"
    assert key_generation_settings() == "generation:settings"
    assert key_generation_fallback() == "generation:fallback"
    assert key_prompts_default() == "prompts:default"
    assert key_chat_history(1, "anna", "session123") == "chat:history:1:anna:session123"
    assert key_chat_status() == "chat:status"


@pytest.mark.asyncio
async def test_cache_set_without_ttl(redis_client):
    """Тест сохранения без TTL."""
    test_key = _unique_key("cache:no_ttl")
    test_value = "test_value"

    result = await cache_set(test_key, test_value)
    assert result is True
    assert await redis_client.ttl(test_key) == -1


@pytest.mark.asyncio
async def test_cache_get_json_decode_error(redis_client):
    """Тест обработки ошибки декодирования JSON."""
    test_key = _unique_key("cache:raw")
    invalid_json = "not a valid json"
    await redis_client.set(test_key, invalid_json)

    result = await cache_get(test_key)
    assert result == invalid_json


@pytest.mark.asyncio
async def test_cache_set_dict_serialization(redis_client):
    """Тест сериализации словаря при сохранении."""
    test_key = _unique_key("cache:dict")
    test_value = {"key": "value", "number": 42}

    await cache_set(test_key, test_value, ttl_seconds=60)
    stored = await redis_client.get(test_key)
    assert stored == json.dumps(test_value, ensure_ascii=False, default=str)


@pytest.mark.asyncio
async def test_close_redis_client(redis_client):
    """Тест закрытия соединения с Redis."""
    original_client = await get_redis_client()
    await close_redis_client()
    new_client = await get_redis_client()

    assert original_client is not None
    assert new_client is not None
    assert original_client is not new_client

