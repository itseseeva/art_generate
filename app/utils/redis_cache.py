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
    """Получает клиент Redis (singleton)."""
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is None:
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            _redis_client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
                retry_on_timeout=False,
                health_check_interval=30
            )
            try:
                await asyncio.wait_for(_redis_client.ping(), timeout=1.0)
                logger.info("[OK] Redis подключен успешно")
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


async def cache_get(key: str, timeout: float = 1.0) -> Optional[Any]:
    """
    Получает значение из кэша с таймаутом.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах (по умолчанию 1 секунда)
        
    Returns:
        Значение из кэша или None
    """
    try:
        client = await get_redis_client()
        if not client:
            return None
        
        # Добавляем очень короткий таймаут для Redis запроса
        try:
            value = await asyncio.wait_for(client.get(key), timeout=timeout)
        except (asyncio.TimeoutError, Exception):
            # Молча игнорируем ошибки кэша - не блокируем приложение
            return None
        
        if value is None:
            return None
        
        # Пытаемся распарсить JSON
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    except Exception:
        # Молча игнорируем все ошибки кэша - не блокируем приложение
        return None


async def cache_set(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
    ttl_seconds: Optional[int] = None,
    timeout: float = 1.0
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
            return False
        
        # Сериализуем значение
        if isinstance(value, (dict, list)):
            serialized_value = json.dumps(value, ensure_ascii=False, default=str)
        else:
            serialized_value = str(value)
        
        # Используем ttl_seconds если указан, иначе ttl
        expire_seconds = ttl_seconds if ttl_seconds is not None else ttl
        
        # Добавляем очень короткий таймаут для Redis запроса
        try:
            if expire_seconds:
                await asyncio.wait_for(client.setex(key, expire_seconds, serialized_value), timeout=timeout)
            else:
                await asyncio.wait_for(client.set(key, serialized_value), timeout=timeout)
        except (asyncio.TimeoutError, Exception):
            # Молча игнорируем ошибки кэша - не блокируем приложение
            return False
        
        return True
    except Exception:
        # Молча игнорируем все ошибки кэша - не блокируем приложение
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
            return False
        
        try:
            await asyncio.wait_for(client.delete(key), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(f"[WARNING] Таймаут удаления из кэша {key} (>{timeout}с)")
            return False
        
        return True
    except Exception as e:
        logger.error(f"[ERROR] Ошибка удаления из кэша {key}: {e}")
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
            return 0
        
        deleted = 0
        try:
            async def delete_keys():
                nonlocal deleted
                async for key in client.scan_iter(match=pattern):
                    await client.delete(key)
                    deleted += 1
                    if deleted > 1000:  # Защита от бесконечного цикла
                        break
            
            await asyncio.wait_for(delete_keys(), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(f"[WARNING] Таймаут удаления по паттерну {pattern} (>{timeout}с), удалено {deleted} ключей")
        
        return deleted
    except Exception as e:
        logger.error(f"[ERROR] Ошибка удаления по паттерну {pattern}: {e}")
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
TTL_CHARACTERS_LIST = 1800  # 30 минут
TTL_CHARACTER = 1800  # 30 минут
TTL_CHARACTER_PHOTOS = 1800  # 30 минут
TTL_GENERATION_SETTINGS = 3600  # 1 час
TTL_GENERATION_FALLBACK = 3600  # 1 час
TTL_PROMPTS_DEFAULT = 3600  # 1 час
TTL_CHAT_HISTORY = 600  # 10 минут
TTL_CHAT_STATUS = 30  # 30 секунд


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
    timeout: float = 1.0
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
    timeout: float = 1.0
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

