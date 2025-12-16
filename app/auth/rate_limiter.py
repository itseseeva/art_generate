"""
Rate limiter для ограничения частоты запросов.
Поддерживает как in-memory (для совместимости), так и Redis-based (для распределенных систем).
"""

import time
import asyncio
from typing import Dict, Optional
from fastapi import HTTPException, Request


class RateLimiter:
    """
    Rate limiter на основе времени (in-memory).
    Используется как fallback если Redis недоступен.
    """
    
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, key: str) -> bool:
        """Проверяет, разрешен ли запрос (синхронный метод для совместимости)."""
        now = time.time()
        
        # Очищаем старые запросы
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < self.window_seconds
            ]
        else:
            self.requests[key] = []
        
        # Проверяем лимит
        if len(self.requests[key]) >= self.max_requests:
            return False
        
        # Добавляем текущий запрос
        self.requests[key].append(now)
        return True
    
    async def is_allowed_async(self, key: str) -> bool:
        """
        Асинхронная проверка с использованием Redis если доступен.
        Fallback на in-memory если Redis недоступен.
        """
        try:
            from app.utils.redis_rate_limiter import RedisRateLimiter
            
            # Пытаемся использовать Redis-based rate limiter
            redis_limiter = RedisRateLimiter(
                max_requests=self.max_requests,
                window_seconds=self.window_seconds
            )
            return await redis_limiter.is_allowed(key)
        except Exception:
            # Fallback на in-memory
            return self.is_allowed(key)


# Глобальный экземпляр rate limiter
rate_limiter = RateLimiter(max_requests=10, window_seconds=60)


def get_rate_limiter() -> RateLimiter:
    """Получить экземпляр rate limiter."""
    return rate_limiter
