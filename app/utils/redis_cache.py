"""
Модуль для работы с Redis кэшированием.
"""
import json
import logging
from typing import Optional, Any, Dict, List
from datetime import timedelta
import os
import asyncio

# Импорт redis.asyncio с обработкой ошибок
try:
    import redis.asyncio as aioredis
    from redis.asyncio import Redis
    REDIS_AVAILABLE = True
except ImportError:
    # Для случаев, когда redis не установлен или старая версия
    try:
        # Попытка импорта из старой версии aioredis
        import aioredis
        from aioredis import Redis
        REDIS_AVAILABLE = True
    except ImportError:
        aioredis = None
        Redis = None
        REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Глобальный клиент Redis
_redis_client: Optional[Redis] = None


async def get_redis_client() -> Optional[Redis]:
    """
    Получает клиент Redis (singleton с connection pooling).
    
    Best practices:
    - Использует connection pooling для эффективного переиспользования соединений
    - Настроены оптимальные таймауты для production
    - Health check для автоматического восстановления соединений
    """
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is None:
        try:
            # Приоритет: REDIS_LOCAL (для локалки) -> REDIS_URL (для Docker) -> дефолт
            redis_url = os.getenv("REDIS_LOCAL") or os.getenv("REDIS_URL", "redis://localhost:6379/0")
            
            # ФИКС для локальной разработки: если hostname "redis" - заменяем на "localhost"
            # Это нужно когда .env настроен для Docker (redis://redis:6379), но backend запущен локально
            if "://redis:" in redis_url:
                redis_url = redis_url.replace("://redis:", "://localhost:")
                logger.info(f"[REDIS] Заменён Docker hostname 'redis' на 'localhost' для локальной разработки")
            
            # Оптимизированная конфигурация с connection pooling
            _redis_client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                # Таймауты для Windows Docker Desktop (сеть через Hyper-V медленнее)
                socket_connect_timeout=3,  # Подключение через Docker может быть медленным
                socket_timeout=3,  # Таймаут операций
                socket_keepalive=True,  # Keep-alive для долгих соединений
                socket_keepalive_options={},  # Опции keep-alive
                retry_on_timeout=True,  # Повтор при таймауте
                health_check_interval=30,  # Проверка здоровья каждые 30 секунд
                # Connection pooling для эффективного переиспользования
                max_connections=50,  # Максимум соединений в пуле
                retry_on_error=[ConnectionError, TimeoutError],  # Повтор при ошибках
            )
            try:
                await asyncio.wait_for(_redis_client.ping(), timeout=5.0)
                logger.info("[OK] Redis подключен успешно с connection pooling")
            except (asyncio.TimeoutError, Exception) as e:
                logger.warning(f"[WARNING] Redis недоступен: {e}. Кэширование отключено.")
                if _redis_client:
                    try:
                        await _redis_client.aclose()
                    except Exception:
                        pass
                _redis_client = None
                return None
        except Exception as e:
            logger.warning(f"[WARNING] Redis недоступен: {e}. Кэширование отключено.")
            _redis_client = None
            return None
    
    return _redis_client


async def close_redis_client():
    """Закрывает соединение с Redis."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("[OK] Redis соединение закрыто")


async def cache_get(key: str, timeout: float = 2.0) -> Optional[Any]:
    """
    Получает значение из кэша с таймаутом.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах (по умолчанию 2 секунды)
        
    Returns:
        Значение из кэша или None
    """
    try:
        client = await get_redis_client()
        if not client:
            logger.debug(f"[REDIS] Клиент недоступен для чтения ключа: {key}")
            return None
        
        # Добавляем таймаут для Redis запроса
        try:
            logger.debug(f"[REDIS GET] Чтение ключа: {key}")
            value = await asyncio.wait_for(client.get(key), timeout=timeout)
            if value is None:
                logger.debug(f"[REDIS GET] Ключ не найден: {key}")
                return None
            logger.debug(f"[REDIS GET] ✓ Найден ключ: {key}")
        except asyncio.TimeoutError:
            logger.warning(f"[REDIS GET] ⏱ Таймаут чтения ключа: {key} (>{timeout}с)")
            return None
        except Exception as e:
            logger.warning(f"[REDIS GET] ✗ Ошибка чтения ключа {key}: {e}")
            return None
        
        # Пытаемся распарсить JSON
        try:
            parsed = json.loads(value)
            logger.debug(f"[REDIS GET] JSON распарсен для ключа: {key}")
            return parsed
        except (json.JSONDecodeError, TypeError):
            logger.debug(f"[REDIS GET] Возвращаем значение как строку: {key}")
            return value
    except Exception as e:
        logger.error(f"[REDIS GET] ✗ Критическая ошибка чтения {key}: {e}")
        return None


async def cache_set(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
    ttl_seconds: Optional[int] = None,
    timeout: float = 2.0
) -> bool:
    """
    Сохраняет значение в кэш с таймаутом.
    
    Args:
        key: Ключ кэша
        value: Значение для сохранения
        ttl: TTL в секундах (устаревший параметр, используйте ttl_seconds)
        ttl_seconds: TTL в секундах
        timeout: Таймаут в секундах (по умолчанию 2 секунды)
        
    Returns:
        True если успешно, False иначе
    """
    try:
        client = await get_redis_client()
        if not client:
            logger.debug(f"[REDIS] Клиент недоступен для записи ключа: {key}")
            return False
        
        # Сериализуем значение
        if isinstance(value, (dict, list)):
            serialized_value = json.dumps(value, ensure_ascii=False, default=str)
            value_type = "JSON"
        else:
            serialized_value = str(value)
            value_type = "STRING"
        
        # Используем ttl_seconds если указан, иначе ttl
        expire_seconds = ttl_seconds if ttl_seconds is not None else ttl
        
        # Добавляем таймаут для Redis запроса
        try:
            logger.debug(f"[REDIS SET] Запись ключа: {key} (тип: {value_type}, TTL: {expire_seconds}с)")
            if expire_seconds:
                await asyncio.wait_for(
                    client.setex(key, expire_seconds, serialized_value),
                    timeout=timeout
                )
            else:
                await asyncio.wait_for(
                    client.set(key, serialized_value),
                    timeout=timeout
                )
            logger.debug(f"[REDIS SET] ✓ Сохранен ключ: {key}")
            return True
        except asyncio.TimeoutError:
            logger.warning(f"[REDIS SET] ⏱ Таймаут записи ключа: {key} (>{timeout}с)")
            return False
        except Exception as e:
            logger.warning(f"[REDIS SET] ✗ Ошибка записи ключа {key}: {e}")
            return False
        
    except Exception as e:
        logger.error(f"[REDIS SET] ✗ Критическая ошибка записи {key}: {e}")
        return False


async def cache_delete(key: str, timeout: float = 2.0) -> bool:
    """
    Удаляет значение из кэша с таймаутом.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах (по умолчанию 2 секунды)
        
    Returns:
        True если успешно, False иначе
    """
    try:
        client = await get_redis_client()
        if not client:
            logger.debug(f"[REDIS] Клиент недоступен для удаления ключа: {key}")
            return False
        
        try:
            logger.debug(f"[REDIS DEL] Удаление ключа: {key}")
            deleted_count = await asyncio.wait_for(client.delete(key), timeout=timeout)
            if deleted_count > 0:
                logger.debug(f"[REDIS DEL] ✓ Удален ключ: {key}")
            else:
                logger.debug(f"[REDIS DEL] Ключ не существовал: {key}")
            return True
        except asyncio.TimeoutError:
            logger.warning(f"[REDIS DEL] ⏱ Таймаут удаления ключа: {key} (>{timeout}с)")
            return False
        except Exception as e:
            logger.warning(f"[REDIS DEL] ✗ Ошибка удаления ключа {key}: {e}")
            return False
        
    except Exception as e:
        logger.error(f"[REDIS DEL] ✗ Критическая ошибка удаления {key}: {e}")
        return False


async def cache_delete_pattern(pattern: str, timeout: float = 5.0) -> int:
    """
    Удаляет все ключи по паттерну с таймаутом.
    
    Args:
        pattern: Паттерн для поиска ключей (например, "subscription:user:*")
        timeout: Таймаут в секундах (по умолчанию 5 секунд)
        
    Returns:
        Количество удаленных ключей
    """
    try:
        client = await get_redis_client()
        if not client:
            logger.debug(f"[REDIS] Клиент недоступен для удаления по паттерну: {pattern}")
            return 0
        
        deleted = 0
        try:
            logger.info(f"[REDIS DEL PATTERN] Начинаем удаление по паттерну: {pattern}")
            async def delete_keys():
                nonlocal deleted
                async for key in client.scan_iter(match=pattern):
                    await client.delete(key)
                    deleted += 1
                    if deleted % 10 == 0:  # Логируем каждые 10 удалений
                        logger.debug(f"[REDIS DEL PATTERN] Удалено {deleted} ключей...")
                    if deleted > 1000:  # Защита от бесконечного цикла
                        logger.warning(f"[REDIS DEL PATTERN] Достигнут лимит 1000 ключей")
                        break
            
            await asyncio.wait_for(delete_keys(), timeout=timeout)
            logger.info(f"[REDIS DEL PATTERN] ✓ Удалено {deleted} ключей по паттерну: {pattern}")
        except asyncio.TimeoutError:
            logger.warning(f"[REDIS DEL PATTERN] ⏱ Таймаут удаления по паттерну {pattern} (>{timeout}с), удалено {deleted} ключей")
        
        return deleted
    except Exception as e:
        logger.error(f"[REDIS DEL PATTERN] ✗ Ошибка удаления по паттерну {pattern}: {e}")
        return 0


async def cache_exists(key: str, timeout: float = 2.0) -> bool:
    """
    Проверяет существование ключа в кэше с таймаутом.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах (по умолчанию 2 секунды)
        
    Returns:
        True если ключ существует, False иначе
    """
    try:
        client = await get_redis_client()
        if not client:
            return False
        
        try:
            result = await asyncio.wait_for(client.exists(key), timeout=timeout)
            return result > 0
        except asyncio.TimeoutError:
            logger.warning(f"[WARNING] Таймаут проверки существования ключа {key} (>{timeout}с)")
            return False
    except Exception as e:
        logger.error(f"[ERROR] Ошибка проверки существования ключа {key}: {e}")
        return False


# Константы для TTL (в секундах)
TTL_SUBSCRIPTION = 300  # 5 минут
TTL_SUBSCRIPTION_STATS = 300  # 5 минут
TTL_USER = 120  # 2 минуты
TTL_USER_COINS = 60  # 1 минута
TTL_CHARACTERS_LIST = 86400  # 24 часа (обновляется при создании/редактировании)
TTL_CHARACTER = 86400  # 24 часа (обновляется при редактировании)
TTL_CHARACTER_PHOTOS = 86400  # 24 часа (обновляется при генерации фото)
TTL_GENERATION_SETTINGS = 3600  # 1 час
TTL_GENERATION_FALLBACK = 3600  # 1 час
TTL_PROMPTS_DEFAULT = 3600  # 1 час
TTL_CHAT_HISTORY = 600  # 10 минут
TTL_CHAT_STATUS = 30  # 30 секунд
TTL_USER_CHARACTERS = 300  # 5 минут


# Функции для генерации ключей кэша
def key_subscription(user_id: int) -> str:
    """Генерирует ключ для подписки пользователя."""
    return f"subscription:user:{user_id}"


def key_subscription_stats(user_id: int) -> str:
    """Генерирует ключ для статистики подписки."""
    return f"subscription:stats:{user_id}"


def key_user(email: str) -> str:
    """Генерирует ключ для данных пользователя по email."""
    return f"user:email:{email}"


def key_user_coins(user_id: int) -> str:
    """Генерирует ключ для баланса монет пользователя."""
    return f"user:coins:{user_id}"


def key_characters_list() -> str:
    """Генерирует ключ для списка персонажей."""
    return "characters:list"


def key_registration_data(email: str) -> str:
    """Генерирует ключ для временных данных регистрации."""
    return f"registration:data:{email}"


def key_password_change_data(user_id: int) -> str:
    """Генерирует ключ для временных данных смены пароля."""
    return f"password_change:data:{user_id}"


async def cache_set_json(
    key: str,
    value: Any,
    ttl_seconds: Optional[int] = None,
    timeout: float = 2.0
) -> bool:
    """
    Сохраняет JSON объект в кэш.
    
    Args:
        key: Ключ кэша
        value: Значение для сохранения (будет сериализовано в JSON)
        ttl_seconds: TTL в секундах
        timeout: Таймаут в секундах
        
    Returns:
        True если успешно, False иначе
    """
    try:
        serialized_value = json.dumps(value, ensure_ascii=False, default=str)
        return await cache_set(key, serialized_value, ttl_seconds=ttl_seconds, timeout=timeout)
    except Exception as e:
        logger.error(f"[ERROR] Ошибка сохранения JSON в кэш {key}: {e}")
        return False


async def cache_get_json(
    key: str,
    timeout: float = 2.0
) -> Optional[Any]:
    """
    Получает JSON объект из кэша.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах
        
    Returns:
        Распарсенный JSON объект или None
    """
    try:
        value = await cache_get(key, timeout=timeout)
        if value is None:
            return None
        
        # Если уже dict/list, возвращаем как есть
        if isinstance(value, (dict, list)):
            return value
        
        # Пытаемся распарсить JSON
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    except Exception as e:
        logger.error(f"[ERROR] Ошибка получения JSON из кэша {key}: {e}")
        return None


def key_character(name: str) -> str:
    """Генерирует ключ для данных персонажа."""
    return f"character:{name.lower()}"


def key_character_photos(character_id: int) -> str:
    """Генерирует ключ для фотографий персонажа."""
    return f"character:photos:{character_id}"


def key_character_main_photos(character_id: int) -> str:
    """Генерирует ключ для главных фотографий персонажа."""
    return f"character:main_photos:{character_id}"


def key_generation_settings() -> str:
    """Генерирует ключ для настроек генерации."""
    return "generation:settings"


def key_generation_fallback() -> str:
    """Генерирует ключ для fallback настроек."""
    return "generation:fallback"


def key_prompts_default() -> str:
    """Генерирует ключ для промптов по умолчанию."""
    return "prompts:default"


def key_chat_history(user_id: int, character_name: str, session_id: str) -> str:
    """Генерирует ключ для истории чата."""
    return f"chat:history:{user_id}:{character_name.lower()}:{session_id}"


def key_chat_status() -> str:
    """Генерирует ключ для статуса чат-бота."""
    return "chat:status"


def key_user_characters(user_id: int) -> str:
    """Генерирует ключ для списка персонажей пользователя с историей."""
    return f"user:characters:{user_id}"

