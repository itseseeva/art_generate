"""
Оптимизированный HTTP клиент с connection pooling для высокой нагрузки.
"""
import httpx
from typing import Optional


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
            # Создаем limits для connection pooling
            limits = httpx.Limits(
                max_keepalive_connections=50,  # Максимум keep-alive соединений
                max_connections=100,  # Максимум всего соединений
                keepalive_expiry=30.0,  # Время жизни keep-alive соединения
            )
            
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    timeout=60.0,  # Общий таймаут
                    connect=10.0,  # Таймаут подключения
                    read=60.0,  # Таймаут чтения
                    write=60.0,  # Таймаут записи
                    pool=5.0,  # Таймаут получения соединения из пула
                ),
                limits=limits,
                follow_redirects=True,
                trust_env=False,
                http2=True,  # Включаем HTTP/2 для лучшей производительности
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
