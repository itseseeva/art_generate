"""
Оптимизированный HTTP клиент с connection pooling для высокой нагрузки.
"""
import httpx
from typing import Optional
from loguru import logger


class AsyncHttpClient:
    """
    Singleton асинхронный HTTP клиент с оптимизированным connection pooling.
    
    Оптимизации для 100+ пользователей:
    - Connection pooling: до 100 соединений
    - HTTP/2 поддержка для мультиплексирования
    - Keep-alive для переиспользования соединений
    - Оптимизированные таймауты
    """
    _client: Optional[httpx.AsyncClient] = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        """
        Получить singleton экземпляр HTTP клиента с connection pooling.
        """
        if cls._client is None:
            # Проверяем наличие поддержки HTTP/2
            try:
                import h2
                http2_support = True
            except ImportError:
                http2_support = False
                logger.warning("Package 'h2' not found. HTTP/2 support disabled, falling back to HTTP/1.1. To enable HTTP/2, install 'httpx[http2]'.")

            # Создаем limits для connection pooling
            limits = httpx.Limits(
                max_keepalive_connections=50,
                max_connections=100,
                keepalive_expiry=30.0,
            )
            
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    timeout=60.0,
                    connect=10.0,
                    read=60.0,
                    write=60.0,
                    pool=5.0,
                ),
                limits=limits,
                follow_redirects=True,
                trust_env=False,
                http2=http2_support,  # Используем HTTP/2 только если пакет h2 доступен
            )
        return cls._client

    @classmethod
    async def close_client(cls):
        """
        Закрыть клиент и освободить ресурсы.
        """
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None


# Глобальный экземпляр для удобства импорта
http_client = AsyncHttpClient
