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
_redis_unavailable: bool = False  # Флаг недоступности Redis


async def get_redis_client() -> Optional[Redis]:
    """
    Получает клиент Redis (singleton с connection pooling).
    
    Best practices:
    - Использует connection pooling для эффективного переиспользования соединений
    - Настроены оптимальные таймауты для production
    - Health check для автоматического восстановления соединений
    """
    global _redis_client, _redis_unavailable
    
    if not REDIS_AVAILABLE or _redis_unavailable:
        return None
    
    if _redis_client is None:
        try:
            # Приоритет: REDIS_URL из settings (читает из .env) -> REDIS_LOCAL -> дефолт
            # Используем settings для чтения из .env файла
            from app.config.settings import settings
            
            # Проверяем переменные окружения напрямую (имеют приоритет)
            env_redis_url = os.getenv('REDIS_URL')
            env_redis_local = os.getenv('REDIS_LOCAL')
            
            # Определяем, запущен ли backend в Docker
            is_docker = os.path.exists('/.dockerenv') or os.getenv('IS_DOCKER') == 'true'
            
            # Используем переменные окружения если они установлены, иначе settings
            if env_redis_url and env_redis_url.strip():
                redis_url = env_redis_url.strip()
            elif env_redis_local and env_redis_local.strip():
                redis_url = env_redis_local.strip()
            else:
                redis_url = settings.REDIS_URL or settings.REDIS_LOCAL or "redis://localhost:6379/0"
            
            # Если в URL указано имя сервиса Docker (redis или art_generation_redis_local), используем его как есть
            # Если мы НЕ в Docker и URL содержит имя сервиса - заменяем на localhost (порт проброшен)
            if not is_docker:
                if "://redis:" in redis_url or "://art_generation_redis_local:" in redis_url:
                    # Заменяем имя сервиса на localhost для локальной разработки
                    redis_url = redis_url.replace("://redis:", "://localhost:").replace("://art_generation_redis_local:", "://localhost:")
                    logger.debug(f"[REDIS] Заменено имя сервиса на localhost для локальной разработки: {redis_url}")
            # Если в Docker и URL содержит localhost - заменяем на имя сервиса
            elif is_docker and ("localhost" in redis_url or "127.0.0.1" in redis_url):
                # Пробуем определить имя сервиса из переменных окружения или используем дефолт
                if "art_generation_redis_local" in str(env_redis_url or env_redis_local):
                    redis_url = redis_url.replace("localhost", "art_generation_redis_local").replace("127.0.0.1", "art_generation_redis_local")
                else:
                    redis_url = redis_url.replace("localhost", "redis").replace("127.0.0.1", "redis")
                logger.debug(f"[REDIS] Заменен localhost на имя сервиса для Docker: {redis_url}")
            
            # Оптимизированная конфигурация с connection pooling
            # Определяем, локальная разработка или Docker
            is_local = "localhost" in redis_url or "127.0.0.1" in redis_url
            # Для локальной разработки увеличиваем таймауты, для Docker - быстрые
            connect_timeout = 3.0 if is_local else 0.5
            socket_timeout = 2.0 if is_local else 0.5
            ping_timeout = 2.0 if is_local else 0.3
            
            _redis_client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                # Таймауты зависят от окружения (локальное или Docker)
                socket_connect_timeout=connect_timeout,  # Таймаут подключения
                socket_timeout=socket_timeout,  # Таймаут операций
                socket_keepalive=True,  # Keep-alive для долгих соединений
                socket_keepalive_options={},  # Опции keep-alive
                retry_on_timeout=False,  # Не повторять при таймауте (быстрый fallback)
                health_check_interval=30,  # Проверка здоровья каждые 30 секунд
                # Connection pooling для эффективного переиспользования
                max_connections=50,  # Максимум соединений в пуле
                retry_on_error=[],  # Не повторять при ошибках (быстрый fallback)
            )
            try:
                # Проверка доступности с таймаутом в зависимости от окружения
                await asyncio.wait_for(_redis_client.ping(), timeout=ping_timeout)
                _redis_unavailable = False
            except asyncio.TimeoutError:
                error_msg = f"Timeout при ping Redis (timeout={ping_timeout}s)"
                if _redis_client:
                    try:
                        await _redis_client.aclose()
                    except Exception:
                        pass
                _redis_client = None
                _redis_unavailable = True
                return None
            except Exception as e:
                error_msg = f"{type(e).__name__}: {str(e)}"
                if _redis_client:
                    try:
                        await _redis_client.aclose()
                    except Exception:
                        pass
                _redis_client = None
                _redis_unavailable = True
                return None
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            _redis_client = None
            _redis_unavailable = True
            return None
    
    return _redis_client


async def close_redis_client():
    """Закрывает соединение с Redis."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


async def cache_get(key: str, timeout: float = 0.3) -> Optional[Any]:
    """
    Получает значение из кэша с таймаутом.
    
    Args:
        key: Ключ кэша
        timeout: Таймаут в секундах (по умолчанию 0.3 секунды для быстрого fallback)
        
    Returns:
        Значение из кэша или None
    """
    global _redis_unavailable
    try:
        # Быстрая проверка: если Redis помечен как недоступный, сразу возвращаем None
        if _redis_unavailable:
            return None
        
        client = await get_redis_client()
        if not client:
            return None
        
        # Добавляем таймаут для Redis запроса
        try:
            value = await asyncio.wait_for(client.get(key), timeout=timeout)
            if value is None:
                return None
        except asyncio.TimeoutError:
            # При таймауте помечаем Redis как недоступный для быстрого fallback в будущем
            _redis_unavailable = True
            return None
        except Exception as e:
            # При ошибке помечаем Redis как недоступный
            _redis_unavailable = True
            return None
        
        # Пытаемся распарсить JSON
        try:
            parsed = json.loads(value)
            return parsed
        except (json.JSONDecodeError, TypeError) as parse_err:
            return value
    except Exception as e:
        return None


async def cache_set(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
    ttl_seconds: Optional[int] = None,
    timeout: float = 0.3
) -> bool:
    """
    Сохраняет значение в кэш с таймаутом.
    
    Args:
        key: Ключ кэша
        value: Значение для сохранения
        ttl: TTL в секундах (устаревший параметр, используйте ttl_seconds)
        ttl_seconds: TTL в секундах (по умолчанию 86400 секунд = 24 часа)
        timeout: Таймаут в секундах (по умолчанию 0.3 секунды для быстрого fallback)
        
    Returns:
        True если успешно, False иначе
    """
    global _redis_unavailable
    try:
        # Быстрая проверка: если Redis помечен как недоступный, сразу возвращаем False
        if _redis_unavailable:
            return False
        
        client = await get_redis_client()
        if not client:
            return False
        
        # Сериализуем значение
        if isinstance(value, (dict, list)):
            serialized_value = json.dumps(value, ensure_ascii=False, default=str)
            value_type = "JSON"
        else:
            serialized_value = str(value)
            value_type = "STRING"
        
        # Используем ttl_seconds если указан, иначе ttl, иначе дефолт 24 часа (86400 секунд)
        expire_seconds = ttl_seconds if ttl_seconds is not None else (ttl if ttl is not None else 86400)
        
        # Добавляем таймаут для Redis запроса
        try:
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
            return True
        except asyncio.TimeoutError:
            # При таймауте помечаем Redis как недоступный для быстрого fallback в будущем
            _redis_unavailable = True
            return False
        except Exception as e:
            # При ошибке помечаем Redis как недоступный
            _redis_unavailable = True
            return False
        
    except Exception as e:
        return False


async def cache_delete(key: str, timeout: float = 0.3) -> bool:
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
            deleted_count = await asyncio.wait_for(client.delete(key), timeout=timeout)
            return deleted_count > 0
        except asyncio.TimeoutError:
            return False
        except Exception as e:
            return False
        
    except Exception as e:
        return False


async def cache_delete_pattern(pattern: str, timeout: float = 0.5) -> int:
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
            pass
        
        return deleted
    except Exception as e:
        return 0


async def cache_exists(key: str, timeout: float = 0.3) -> bool:
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
            return False
    except Exception as e:
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
TTL_CHAT_HISTORY = 86400  # 24 часа (3600 * 24 секунд)
TTL_CHAT_STATUS = 30  # 30 секунд
TTL_USER_CHARACTERS = 300  # 5 минут
TTL_CHARACTER_RATINGS = 600  # 10 минут - рейтинги персонажей
TTL_AVAILABLE_VOICES = 900  # 15 минут - список доступных голосов
TTL_USER_FAVORITES = 180  # 3 минуты - список избранных персонажей пользователя
TTL_IMAGE_METADATA = 86400  # 24 часа - метаданные изображений (промпты)


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


def key_user_subscription(user_id: int) -> str:
    """Генерирует ключ для подписки пользователя (альтернативный формат)."""
    return f"user:subscription:{user_id}"


def key_characters_list() -> str:
    """Генерирует ключ для списка персонажей (версия 2 для поддержки платных альбомов)."""
    return "characters:list:v2"


def key_registration_data(email: str) -> str:
    """Генерирует ключ для временных данных регистрации."""
    # Нормализуем email в нижний регистр для единообразия ключей
    return f"registration:data:{email.lower().strip()}"


def key_password_change_data(user_id: int) -> str:
    """Генерирует ключ для временных данных смены пароля."""
    return f"password_change:data:{user_id}"


async def cache_set_json(
    key: str,
    value: Any,
    ttl_seconds: Optional[int] = None,
    timeout: float = 0.3
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
        logger.error(f"[REDIS] Error in cache_set_json for key {key}: {type(e).__name__}: {str(e)}")
        return False


async def cache_get_json(
    key: str,
    timeout: float = 0.3
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
            logger.debug(f"[REDIS] cache_get_json: No value found for key {key}")
            return None
        
        # Если уже dict/list, возвращаем как есть
        if isinstance(value, (dict, list)):
            return value
        
        # Пытаемся распарсить JSON
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError) as parse_err:
            logger.warning(f"[REDIS] cache_get_json: Failed to parse JSON for key {key}: {parse_err}")
            return value
    except Exception as e:
        logger.error(f"[REDIS] Error in cache_get_json for key {key}: {type(e).__name__}: {str(e)}")
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


def key_character_ratings(character_id: int, user_id: Optional[int] = None) -> str:
    """Генерирует ключ для рейтингов персонажа."""
    if user_id:
        return f"character:ratings:{character_id}:user:{user_id}"
    return f"character:ratings:{character_id}"


def key_available_voices(user_id: Optional[int] = None) -> str:
    """Генерирует ключ для списка доступных голосов."""
    if user_id:
        return f"voices:available:user:{user_id}"
    return "voices:available:public"


def key_user_favorites(user_id: int) -> str:
    """Генерирует ключ для списка избранных персонажей пользователя."""
    return f"user:favorites:{user_id}"


def key_image_metadata(image_url: str) -> str:
    """Генерирует ключ для метаданных изображения (промпт и т.д.)."""
    import hashlib
    # Используем хэш URL для создания короткого ключа
    url_hash = hashlib.md5(image_url.encode('utf-8')).hexdigest()
    return f"image:metadata:{url_hash}"

