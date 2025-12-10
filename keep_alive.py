import os
import asyncio
import httpx
import logging
from typing import Optional

# Настройка логирования
logger = logging.getLogger(__name__)

# URL сервера (можно задать через переменную окружения)
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
API_ENDPOINT = f"{BASE_URL}/api/v1/generate-image/"

# Интервал между запросами (10 минут = 600 секунд)
# Увеличен для избежания rate limit при ограниченном балансе Replicate
INTERVAL_SECONDS = 600

# Счетчик сгенерированных картинок
_generated_count = 0
_count_lock: Optional[asyncio.Lock] = None
_stop_task: Optional[asyncio.Task] = None
_client: Optional[httpx.AsyncClient] = None


def _get_count_lock() -> asyncio.Lock:
    """Получает или создает lock для счетчика"""
    global _count_lock
    if _count_lock is None:
        _count_lock = asyncio.Lock()
    return _count_lock


async def get_generated_count() -> int:
    """Возвращает количество сгенерированных картинок"""
    lock = _get_count_lock()
    async with lock:
        return _generated_count


async def increment_generated_count():
    """Увеличивает счетчик сгенерированных картинок"""
    global _generated_count
    lock = _get_count_lock()
    async with lock:
        _generated_count += 1


async def get_client() -> httpx.AsyncClient:
    """Получает или создает переиспользуемый HTTP клиент"""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=5.0,
                read=120.0,  # Таймаут 2 минуты для генерации
                write=10.0,
                pool=5.0
            ),
            limits=httpx.Limits(
                max_keepalive_connections=5,
                max_connections=10,
                keepalive_expiry=30.0
            )
        )
    return _client


async def close_client():
    """Закрывает HTTP клиент"""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def generate_image():
    """
    Асинхронно запускает генерацию изображения на сервере
    для поддержания его в активном состоянии.
    Использует минимальные параметры для быстрой и дешевой генерации.
    """
    logger.info("keep_alive - Запуск генерации для поддержания сервера...")

    try:
        client = await get_client()

        # Минимальные параметры для быстрой генерации
        payload = {
            "prompt": "a dot",  # Минимальный промпт
            "width": 512,       # Минимальный размер
            "height": 512,
            "steps": 1,         # 1 шаг для экономии времени
            "cfg_scale": 7.0,
            # Отключаем дефолтные промпты для скорости
            "use_default_prompts": False,
            "character": None  # Не используем персонажа
        }

        # Отправляем асинхронный POST запрос
        response = await client.post(
            API_ENDPOINT,
            json=payload
        )

        # Проверяем статус ответа
        if response.status_code == 200:
            result = response.json()
            await increment_generated_count()
            count = await get_generated_count()
            logger.info(
                f"keep_alive - Генерация успешна! "
                f"Сгенерировано картинок: {count}"
            )
            if "image_url" in result:
                image_url = result.get('image_url', 'N/A')
                logger.debug(f"keep_alive - Изображение: {image_url}")
        elif response.status_code == 429:
            # Rate limit - слишком много запросов
            error_text = response.text[:200]
            logger.warning(
                f"keep_alive - Rate limit (HTTP 429). "
                f"Превышен лимит запросов к Replicate API. "
                f"Следующая попытка через {INTERVAL_SECONDS} секунд. "
                f"Детали: {error_text}"
            )
        elif response.status_code == 404:
            # Ресурс не найден (например, модель не настроена)
            error_text = response.text[:200]
            logger.warning(
                f"keep_alive - Ресурс не найден (HTTP 404). "
                f"Возможно, модель Replicate не настроена. "
                f"Детали: {error_text}"
            )
        elif response.status_code >= 500:
            # Серверная ошибка
            error_text = response.text[:200]
            status_code = response.status_code
            logger.error(
                f"keep_alive - Серверная ошибка (HTTP {status_code}). "
                f"Сервер вернул ошибку при генерации. "
                f"Детали: {error_text}"
            )
        else:
            # Другие ошибки клиента (400, 401, 403 и т.д.)
            error_text = response.text[:200]
            logger.warning(
                f"keep_alive - Ошибка клиента (HTTP {response.status_code}). "
                f"Детали: {error_text}"
            )

    except httpx.TimeoutException:
        logger.warning(
            "keep_alive - Таймаут запроса "
            "(сервер может быть перегружен)"
        )
    except httpx.ConnectError:
        logger.warning(
            f"keep_alive - Ошибка подключения к серверу: {BASE_URL}"
        )
    except Exception as e:
        logger.error(f"keep_alive - Ошибка генерации: {e}")


async def run_keep_alive_loop():
    """
    Асинхронный цикл keep_alive, который не блокирует event loop.
    Запускается как asyncio task в основном event loop приложения.
    """
    logger.info("keep_alive - Скрипт запущен")
    logger.info(f"keep_alive - Сервер: {BASE_URL}")
    minutes = INTERVAL_SECONDS // 60
    logger.info(
        f"keep_alive - Интервал: {INTERVAL_SECONDS} секунд ({minutes} минут)"
    )

    try:
        while True:
            await generate_image()
            # Асинхронное ожидание, не блокирует event loop
            await asyncio.sleep(INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("keep_alive - Скрипт остановлен")
        await close_client()
        raise


async def start_keep_alive_task() -> asyncio.Task:
    """
    Запускает keep_alive как asyncio task.
    Возвращает task для возможности его отмены.

    Returns:
        asyncio.Task: Задача keep_alive
    """
    global _stop_task
    _stop_task = asyncio.create_task(run_keep_alive_loop())
    return _stop_task


async def stop_keep_alive_task():
    """Останавливает keep_alive task"""
    global _stop_task
    if _stop_task and not _stop_task.done():
        _stop_task.cancel()
        try:
            await _stop_task
        except asyncio.CancelledError:
            pass
        _stop_task = None


if __name__ == "__main__":
    # Настройка логирования для запуска из командной строки
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    try:
        asyncio.run(run_keep_alive_loop())
    except KeyboardInterrupt:
        logger.info("keep_alive - Получен сигнал остановки")
