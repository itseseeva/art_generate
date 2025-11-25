"""
Фикстуры для интеграционных тестов Redis.
"""
import os
import pytest
import pytest_asyncio

TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/15")


@pytest_asyncio.fixture
async def redis_client():
    """
    Возвращает реальный Redis клиент для тестов.
    Перед каждым тестом очищает базу, после — закрывает соединение.
    Также временно подменяет глобальный клиент в app.utils.redis_cache.
    """
    # Проверяем доступность Redis при выполнении фикстуры
    try:
        import redis.asyncio as aioredis
    except ImportError as e:
        pytest.skip(f"Redis модуль недоступен. Установите: pip install redis>=5.0.0. Ошибка: {e}")
    
    # Создаем отдельный клиент для тестов, не используя singleton
    try:
        client = await aioredis.from_url(
            TEST_REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        # Проверяем подключение
        await client.ping()
    except Exception as e:
        import traceback
        pytest.skip(f"Redis недоступен по адресу {TEST_REDIS_URL}: {e}")

    # Временно подменяем глобальный клиент для функций кэширования
    from app.utils import redis_cache
    old_client = redis_cache._redis_client
    redis_cache._redis_client = client
    
    # Очищаем базу перед тестом
    await client.flushdb()
    
    yield client
    
    # Очищаем базу после теста
    await client.flushdb()
    await client.aclose()
    
    # Восстанавливаем глобальный клиент
    redis_cache._redis_client = old_client

