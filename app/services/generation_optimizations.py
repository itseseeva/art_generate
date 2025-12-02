"""
Оптимизации для ускорения генерации изображений без изменения параметров.
"""

import asyncio
from typing import Dict, Any, Optional
import httpx
from loguru import logger


class GenerationOptimizer:
    """
    Класс для оптимизации процесса генерации изображений.
    """
    
    def __init__(self, api_url: str):
        self.api_url = api_url
        # Переиспользуемый HTTP клиент с keep-alive соединениями
        self._client: Optional[httpx.AsyncClient] = None
        self._client_lock = asyncio.Lock()
    
    async def get_client(self) -> httpx.AsyncClient:
        """
        Получить переиспользуемый HTTP клиент.
        Использование одного клиента ускоряет запросы за счет keep-alive соединений.
        """
        if self._client is None:
            async with self._client_lock:
                if self._client is None:
                    # Используем более агрессивные таймауты для быстрой обработки ошибок
                    # но достаточные для генерации
                    self._client = httpx.AsyncClient(
                        timeout=httpx.Timeout(
                            connect=5.0,  # Быстрое обнаружение недоступности
                            read=300.0,   # Достаточно для генерации
                            write=10.0,   # Быстрая отправка запроса
                            pool=5.0      # Быстрое получение соединения из пула
                        ),
                        limits=httpx.Limits(
                            max_keepalive_connections=5,  # Переиспользование соединений
                            max_connections=10,
                            keepalive_expiry=30.0  # Держим соединения открытыми 30 сек
                        ),
                        http2=False  # HTTP/1.1 обычно быстрее для локальных запросов
                    )
        return self._client
    
    async def close(self):
        """Закрыть HTTP клиент"""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    def optimize_request_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Оптимизирует параметры запроса для ускорения генерации.
        Не изменяет качество, только оптимизирует структуру данных.
        
        Args:
            params: Параметры запроса
            
        Returns:
            Оптимизированные параметры
        """
        optimized = params.copy()
        
        # Убираем пустые значения для уменьшения размера запроса
        optimized = {k: v for k, v in optimized.items() if v is not None and v != ""}
        
        # Оптимизируем структуру LoRA моделей - убираем disabled
        if "lora_models" in optimized and isinstance(optimized["lora_models"], list):
            optimized["lora_models"] = [
                lora for lora in optimized["lora_models"] 
                if lora.get("enabled", False)
            ]
        
        # Убираем пустые alwayson_scripts
        if "alwayson_scripts" in optimized:
            if not optimized["alwayson_scripts"] or optimized["alwayson_scripts"] == {}:
                optimized.pop("alwayson_scripts", None)
        
        return optimized
    
    async def prewarm_connection(self):
        """
        Предварительный прогрев соединения с WebUI.
        Ускоряет первый запрос за счет установления соединения заранее.
        """
        try:
            client = await self.get_client()
            # Легкий запрос для установления соединения
            await client.get(f"{self.api_url}/sdapi/v1/progress", timeout=2.0)
            logger.debug("WebUI connection prewarmed")
        except Exception as e:
            logger.debug(f"Prewarm failed (non-critical): {e}")
    
    @staticmethod
    def optimize_image_saving(image_data: str, index: int) -> tuple[str, int]:
        """
        Оптимизирует процесс сохранения изображения.
        
        Args:
            image_data: Base64 строка изображения
            index: Индекс изображения
            
        Returns:
            Оптимизированные данные
        """
        # Можно добавить сжатие или другие оптимизации здесь
        # Пока просто возвращаем как есть
        return image_data, index


async def optimize_generation_flow(
    api_url: str,
    request_params: Dict[str, Any],
    use_prewarm: bool = True
) -> Dict[str, Any]:
    """
    Оптимизирует весь процесс генерации.
    
    Args:
        api_url: URL WebUI API
        request_params: Параметры запроса
        use_prewarm: Использовать ли предварительный прогрев соединения
        
    Returns:
        Оптимизированные параметры запроса
    """
    optimizer = GenerationOptimizer(api_url)
    
    # Предварительный прогрев соединения (опционально)
    if use_prewarm:
        await optimizer.prewarm_connection()
    
    # Оптимизация параметров запроса
    optimized_params = optimizer.optimize_request_params(request_params)
    
    return optimized_params, optimizer


def get_fast_sampler_config() -> Dict[str, Any]:
    """
    Возвращает конфигурацию для быстрого сэмплера.
    DPM++ 2M Karras обычно быстрее чем Euler при том же качестве.
    
    Returns:
        Словарь с параметрами быстрого сэмплера
    """
    return {
        "sampler_name": "DPM++ 2M Karras",  # Быстрее чем Euler
        "scheduler": "karras",  # Уже используется
    }


def optimize_batch_processing(batch_size: int, n_iter: int) -> tuple[int, int]:
    """
    Оптимизирует параметры батч-обработки для максимальной скорости.
    
    Args:
        batch_size: Размер батча
        n_iter: Количество итераций
        
    Returns:
        Оптимизированные batch_size и n_iter
    """
    # Для максимальной скорости лучше использовать batch_size > 1 вместо n_iter > 1
    # batch_size обрабатывает изображения параллельно в одном запросе
    if n_iter > 1 and batch_size == 1:
        # Перераспределяем: лучше batch_size=2, n_iter=1 чем batch_size=1, n_iter=2
        optimized_batch = min(n_iter, 4)  # Максимум 4 для стабильности
        optimized_iter = 1
        return optimized_batch, optimized_iter
    
    return batch_size, n_iter

