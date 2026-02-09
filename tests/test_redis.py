"""
Тесты для Redis кеша.
Проверяет подключение, операции с данными, TTL, инвалидацию кеша.
"""
import pytest
import asyncio
from fakeredis import aioredis as fakeredis


# ============================================================================
# Тесты подключения
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_connection(fake_redis):
    """Тест подключения к Redis."""
    # Проверяем что можем выполнить ping
    result = await fake_redis.ping()
    assert result is True


# ============================================================================
# Тесты базовых операций
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_set_get(fake_redis):
    """Тест сохранения и получения данных."""
    # Сохраняем данные
    await fake_redis.set("test_key", "test_value")
    
    # Получаем данные
    value = await fake_redis.get("test_key")
    
    assert value == "test_value"


@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_set_get_json(fake_redis):
    """Тест сохранения и получения JSON данных."""
    import json
    
    test_data = {
        "name": "Test Character",
        "personality": "Friendly",
        "age": 25
    }
    
    # Сохраняем JSON
    await fake_redis.set("character:1", json.dumps(test_data))
    
    # Получаем и парсим JSON
    value = await fake_redis.get("character:1")
    parsed_data = json.loads(value)
    
    assert parsed_data == test_data
    assert parsed_data["name"] == "Test Character"


# ============================================================================
# Тесты TTL (время жизни)
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_ttl(fake_redis):
    """Тест времени жизни ключей."""
    # Сохраняем с TTL 2 секунды
    await fake_redis.setex("temp_key", 2, "temp_value")
    
    # Проверяем что ключ существует
    value = await fake_redis.get("temp_key")
    assert value == "temp_value"
    
    # Проверяем TTL
    ttl = await fake_redis.ttl("temp_key")
    assert ttl > 0 and ttl <= 2
    
    # Ждем истечения TTL
    await asyncio.sleep(3)
    
    # Проверяем что ключ удален
    value = await fake_redis.get("temp_key")
    assert value is None


# ============================================================================
# Тесты удаления
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_delete(fake_redis):
    """Тест удаления ключей."""
    # Создаем ключ
    await fake_redis.set("delete_me", "value")
    
    # Проверяем что существует
    assert await fake_redis.exists("delete_me") == 1
    
    # Удаляем
    await fake_redis.delete("delete_me")
    
    # Проверяем что удален
    assert await fake_redis.exists("delete_me") == 0


# ============================================================================
# Тесты пакетных операций
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_pipeline(fake_redis):
    """Тест пакетных операций через pipeline."""
    # Создаем pipeline
    pipe = fake_redis.pipeline()
    
    # Добавляем операции
    pipe.set("key1", "value1")
    pipe.set("key2", "value2")
    pipe.set("key3", "value3")
    
    # Выполняем все операции
    await pipe.execute()
    
    # Проверяем результаты
    assert await fake_redis.get("key1") == "value1"
    assert await fake_redis.get("key2") == "value2"
    assert await fake_redis.get("key3") == "value3"


# ============================================================================
# Тесты инвалидации кеша
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_cache_invalidation(fake_redis):
    """Тест инвалидации кеша."""
    # Кешируем данные персонажа
    await fake_redis.set("character:1", '{"name": "Old Name"}')
    
    # Проверяем что в кеше
    cached = await fake_redis.get("character:1")
    assert "Old Name" in cached
    
    # Инвалидируем кеш (удаляем)
    await fake_redis.delete("character:1")
    
    # Проверяем что кеш очищен
    cached = await fake_redis.get("character:1")
    assert cached is None


@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_cache_invalidation_pattern(fake_redis):
    """Тест инвалидации кеша по паттерну."""
    # Создаем несколько ключей с паттерном
    await fake_redis.set("character:1", "data1")
    await fake_redis.set("character:2", "data2")
    await fake_redis.set("character:3", "data3")
    await fake_redis.set("user:1", "user_data")
    
    # Находим все ключи персонажей
    keys = []
    async for key in fake_redis.scan_iter(match="character:*"):
        keys.append(key)
    
    # Удаляем все ключи персонажей
    if keys:
        await fake_redis.delete(*keys)
    
    # Проверяем что персонажи удалены
    assert await fake_redis.get("character:1") is None
    assert await fake_redis.get("character:2") is None
    assert await fake_redis.get("character:3") is None
    
    # Проверяем что пользователь остался
    assert await fake_redis.get("user:1") == "user_data"


# ============================================================================
# Тесты конкурентного доступа
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_redis_concurrent_access(fake_redis):
    """Тест конкурентного доступа к Redis."""
    
    async def increment_counter(redis_client, key, times):
        """Увеличивает счетчик несколько раз."""
        for _ in range(times):
            await redis_client.incr(key)
    
    # Инициализируем счетчик
    await fake_redis.set("counter", 0)
    
    # Запускаем 10 конкурентных задач, каждая увеличивает счетчик 10 раз
    tasks = [increment_counter(fake_redis, "counter", 10) for _ in range(10)]
    await asyncio.gather(*tasks)
    
    # Проверяем что счетчик = 100 (10 задач * 10 инкрементов)
    counter = await fake_redis.get("counter")
    assert int(counter) == 100


# ============================================================================
# Тесты кеширования персонажей
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_character_cache_hit(fake_redis):
    """Тест попадания в кеш персонажей."""
    import json
    
    character_data = {
        "id": 1,
        "name": "Test Character",
        "personality": "Friendly",
        "scenario": "Test scenario"
    }
    
    # Кешируем персонажа
    cache_key = "character:1"
    await fake_redis.setex(cache_key, 300, json.dumps(character_data))
    
    # Проверяем попадание в кеш
    cached = await fake_redis.get(cache_key)
    assert cached is not None
    
    parsed = json.loads(cached)
    assert parsed["name"] == "Test Character"


@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_character_cache_miss(fake_redis):
    """Тест промаха кеша персонажей."""
    # Пытаемся получить несуществующий ключ
    cached = await fake_redis.get("character:999")
    
    assert cached is None


# ============================================================================
# Тесты производительности
# ============================================================================

@pytest.mark.unit
@pytest.mark.redis
@pytest.mark.asyncio
async def test_cache_performance(fake_redis):
    """Тест производительности кеша."""
    import time
    
    # Сохраняем 1000 ключей
    start_time = time.time()
    
    pipe = fake_redis.pipeline()
    for i in range(1000):
        pipe.set(f"perf_test:{i}", f"value_{i}")
    await pipe.execute()
    
    write_time = time.time() - start_time
    
    # Читаем 1000 ключей
    start_time = time.time()
    
    pipe = fake_redis.pipeline()
    for i in range(1000):
        pipe.get(f"perf_test:{i}")
    results = await pipe.execute()
    
    read_time = time.time() - start_time
    
    # Проверяем что операции быстрые (< 1 секунды)
    assert write_time < 1.0, f"Write took {write_time}s"
    assert read_time < 1.0, f"Read took {read_time}s"
    
    # Проверяем что все данные прочитаны
    assert len(results) == 1000
    assert results[0] == "value_0"
    assert results[999] == "value_999"
