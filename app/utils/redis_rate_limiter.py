"""
Redis-based rate limiter для распределенных систем.
Использует Redis для хранения счетчиков запросов.
"""

import time
import logging
from typing import Optional
from app.utils.redis_cache import get_redis_client

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Rate limiter на основе Redis для работы в распределенных системах.
    
    Использует sliding window алгоритм для более точного ограничения.
    """
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        """
        Инициализация rate limiter.
        
        Args:
            max_requests: Максимальное количество запросов
            window_seconds: Временное окно в секундах
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def is_allowed(self, key: str) -> bool:
        """
        Проверяет, разрешен ли запрос для данного ключа.
        
        Args:
            key: Уникальный ключ (например, email или IP адрес)
            
        Returns:
            True если запрос разрешен, False если превышен лимит
        """
        try:
            redis_client = await get_redis_client()
            if not redis_client:
                # Если Redis недоступен, разрешаем запрос (fallback)
                logger.warning(f"[RATE_LIMIT] Redis недоступен, разрешаем запрос для {key}")
                return True
            
            now = time.time()
            window_start = now - self.window_seconds
            
            # Ключ для Redis
            redis_key = f"rate_limit:{key}"
            
            # Удаляем старые записи (старше window_seconds)
            await redis_client.zremrangebyscore(redis_key, 0, window_start)
            
            # Подсчитываем количество запросов в текущем окне
            count = await redis_client.zcard(redis_key)
            
            if count >= self.max_requests:
                logger.warning(f"[RATE_LIMIT] Превышен лимит для {key}: {count}/{self.max_requests}")
                return False
            
            # Добавляем текущий запрос
            await redis_client.zadd(redis_key, {str(now): now})
            
            # Устанавливаем TTL для ключа (автоматическая очистка)
            await redis_client.expire(redis_key, self.window_seconds + 10)
            
            return True
            
        except Exception as e:
            logger.error(f"[RATE_LIMIT] Ошибка проверки лимита для {key}: {e}")
            # В случае ошибки разрешаем запрос (fail-open)
            return True
    
    async def get_remaining(self, key: str) -> int:
        """
        Получает количество оставшихся запросов.
        
        Args:
            key: Уникальный ключ
            
        Returns:
            Количество оставшихся запросов
        """
        try:
            redis_client = await get_redis_client()
            if not redis_client:
                return self.max_requests
            
            now = time.time()
            window_start = now - self.window_seconds
            
            redis_key = f"rate_limit:{key}"
            
            # Удаляем старые записи
            await redis_client.zremrangebyscore(redis_key, 0, window_start)
            
            # Подсчитываем количество запросов
            count = await redis_client.zcard(redis_key)
            
            return max(0, self.max_requests - count)
            
        except Exception as e:
            logger.error(f"[RATE_LIMIT] Ошибка получения остатка для {key}: {e}")
            return self.max_requests
    
    async def reset(self, key: str) -> None:
        """
        Сбрасывает счетчик для ключа.
        
        Args:
            key: Уникальный ключ
        """
        try:
            redis_client = await get_redis_client()
            if not redis_client:
                return
            
            redis_key = f"rate_limit:{key}"
            await redis_client.delete(redis_key)
            
        except Exception as e:
            logger.error(f"[RATE_LIMIT] Ошибка сброса для {key}: {e}")

