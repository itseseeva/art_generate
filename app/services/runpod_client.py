"""
Асинхронный клиент для работы с RunPod API.
Использует HTTPX для неблокирующих операций.
"""
import os
import time
import asyncio
import re
from typing import Optional, Dict, Any
import httpx
from dotenv import load_dotenv
from loguru import logger


def clean_prompt(prompt: str) -> str:
    """
    Очищает промпт от недопустимых символов, которые могут сломать JSON парсинг.
    Удаляет управляющие символы (control characters), кроме пробелов и переносов строк.
    
    Args:
        prompt: Исходный промпт
        
    Returns:
        Очищенный промпт
    """
    if not prompt:
        return prompt
    
    # Удаляем управляющие символы (control characters), кроме пробелов, табуляции и переносов строк
    # \x00-\x08: NULL, SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS
    # \x0B: Vertical Tab
    # \x0C: Form Feed (это тот самый символ, который вызывает ошибку!)
    # \x0E-\x1F: другие управляющие символы
    # Оставляем: \x09 (TAB), \x0A (LF), \x0D (CR), \x20-\x7E (печатные символы)
    cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', prompt)
    
    # Также удаляем другие проблемные символы Unicode
    # Удаляем zero-width spaces и другие невидимые символы
    cleaned = re.sub(r'[\u200B-\u200D\uFEFF]', '', cleaned)
    
    # Нормализуем множественные пробелы
    cleaned = re.sub(r' +', ' ', cleaned)
    
    # Убираем пробелы в начале и конце
    cleaned = cleaned.strip()
    
    return cleaned

from app.config.default_prompts import (
    get_default_positive_prompts,
    get_default_negative_prompts,
    get_enhanced_prompts
)
from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS

# Загружаем переменные окружения
load_dotenv()

# Константы для подключения к RunPod
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
RUNPOD_URL = os.getenv("RUNPOD_URL")  # Модель "Больше аниме" (OneObsession/anime) - должен заканчиваться на '/run' или '/runsync'
RUNPOD_URL_2 = os.getenv("RUNPOD_URL_2")  # Модель "Больше реализма" (PerfectDeliberate/anime-realism) - должен заканчиваться на '/run' или '/runsync'

# Извлекаем базовый URL и ENDPOINT_ID из RUNPOD_URL (дефолтная модель)
# Формат: https://api.runpod.ai/v2/{ENDPOINT_ID}/run
if RUNPOD_URL:
    # Убираем '/run' или '/runsync' с конца
    RUNPOD_URL_BASE = RUNPOD_URL.rstrip('/').replace('/run', '').replace('/runsync', '')
    # Извлекаем ENDPOINT_ID
    ENDPOINT_ID = RUNPOD_URL_BASE.split('/')[-1] if '/' in RUNPOD_URL_BASE else None
else:
    RUNPOD_URL_BASE = None
    ENDPOINT_ID = None

# Извлекаем базовый URL и ENDPOINT_ID из RUNPOD_URL_2 (новая модель)
if RUNPOD_URL_2:
    # Убираем '/run' или '/runsync' с конца
    RUNPOD_URL_BASE_2 = RUNPOD_URL_2.rstrip('/').replace('/run', '').replace('/runsync', '')
    # Извлекаем ENDPOINT_ID
    ENDPOINT_ID_2 = RUNPOD_URL_BASE_2.split('/')[-1] if '/' in RUNPOD_URL_BASE_2 else None
else:
    RUNPOD_URL_BASE_2 = None
    ENDPOINT_ID_2 = None

# Таймауты
DEFAULT_TIMEOUT = 300  # 5 минут
POLL_INTERVAL = 5  # Опрос каждые 5 секунд
REQUEST_TIMEOUT = 30  # Таймаут для HTTP запросов


async def start_generation(
    client: httpx.AsyncClient,
    user_prompt: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    steps: Optional[int] = None,
    cfg_scale: Optional[float] = None,
    seed: Optional[int] = None,
    sampler_name: Optional[str] = None,
    scheduler: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    use_enhanced_prompts: bool = True,
    lora_scale: Optional[float] = None,
    model: Optional[str] = "anime-realism"
) -> str:
    """
    Отправляет запрос на RunPod Endpoint и возвращает Job ID.
    
    Args:
        client: Асинхронный HTTP клиент
        user_prompt: Промпт пользователя
        width: Ширина изображения
        height: Высота изображения
        steps: Количество шагов
        cfg_scale: CFG Scale
        seed: Сид для генерации
        sampler_name: Название сэмплера
        scheduler: Планировщик
        negative_prompt: Негативный промпт
        use_enhanced_prompts: Использовать ли дефолтные промпты
        model: Модель для генерации ('anime' или 'anime-realism')
        
    Returns:
        Tuple[Job ID, base_url]: Job ID для отслеживания статуса и базовый URL для проверки статуса
        
    Raises:
        ValueError: Если не установлены RUNPOD_API_KEY или нужный RUNPOD_URL
        httpx.HTTPError: При ошибках сетевого запроса
    """
    if not RUNPOD_API_KEY:
        raise ValueError("RUNPOD_API_KEY не установлен в переменных окружения")
    
    # Определяем какой URL использовать на основе модели
    # anime -> RUNPOD_URL (OneObsession, "Больше аниме")
    # anime-realism -> RUNPOD_URL_2 (PerfectDeliberate, "Больше реализма")
    if model == "anime-realism":
        runpod_url = RUNPOD_URL_2
        runpod_url_base = RUNPOD_URL_BASE_2
        if not RUNPOD_URL_2:
            raise ValueError("RUNPOD_URL_2 не установлен в переменных окружения (требуется для модели 'anime-realism' / 'Больше реализма')")
    else:  # anime или дефолт
        runpod_url = RUNPOD_URL
        runpod_url_base = RUNPOD_URL_BASE
        if not RUNPOD_URL:
            raise ValueError("RUNPOD_URL не установлен в переменных окружения (требуется для модели 'anime' / 'Больше аниме')")
    
    # Обрабатываем промпты
    if use_enhanced_prompts:
        enhanced_positive, enhanced_negative = get_enhanced_prompts(user_prompt)
        final_prompt = enhanced_positive
        final_negative = negative_prompt if negative_prompt else enhanced_negative
    else:
        final_prompt = user_prompt
        final_negative = negative_prompt if negative_prompt else get_default_negative_prompts()
    
    # Очищаем промпты от недопустимых символов перед отправкой в RunPod
    final_prompt = clean_prompt(final_prompt)
    final_negative = clean_prompt(final_negative) if final_negative else final_negative
    
    logger.debug(f"[RUNPOD] Очищенный промпт: {final_prompt[:200]}...")
    logger.debug(f"[RUNPOD] Очищенный негативный промпт: {final_negative[:200] if final_negative else 'None'}...")
    
    # Маппинг пользовательских имен моделей на внутренние имена для RunPod
    MODEL_MAPPING = {
        "anime": "one_obsession",
        "anime-realism": "perfect_deliberate"
    }
    internal_model = MODEL_MAPPING.get(model or "anime-realism", "perfect_deliberate")
    
    # Берём параметры из дефолтов, если не указаны
    params = {
        "prompt": final_prompt,
        "negative_prompt": final_negative,
        "width": width or DEFAULT_GENERATION_PARAMS["width"],
        "height": height or DEFAULT_GENERATION_PARAMS["height"],
        "steps": steps or DEFAULT_GENERATION_PARAMS["steps"],
        "cfg_scale": cfg_scale or DEFAULT_GENERATION_PARAMS["cfg_scale"],
        "sampler_name": sampler_name or DEFAULT_GENERATION_PARAMS["sampler_name"],
        "scheduler": scheduler or DEFAULT_GENERATION_PARAMS["scheduler"],
        "seed": seed if seed is not None else DEFAULT_GENERATION_PARAMS["seed"],
        "lora_scale": lora_scale if lora_scale is not None else DEFAULT_GENERATION_PARAMS["lora_scale"],
        "model": internal_model,  # Внутреннее имя модели для RunPod
        "return_type": "url"  # Важно: возвращаем URL, а не Base64
    }
    
    # Заголовки авторизации
    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Формируем payload для RunPod API
    payload = {
        "input": params
    }
    
    logger.info(f"[RUNPOD] Отправка запроса на генерацию: {user_prompt[:100]}...")
    logger.debug(f"[RUNPOD] Параметры: {params}")
    
    try:
        logger.info(f"[RUNPOD] Используется URL: {runpod_url} (модель: {model})")
        response = await client.post(
            runpod_url,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        
        result = response.json()
        job_id = result.get("id")
        
        if not job_id:
            raise ValueError(f"RunPod API не вернул Job ID: {result}")
        
        logger.info(f"[RUNPOD] Задача создана: {job_id} (модель: {model})")
        return job_id, runpod_url_base
        
    except httpx.HTTPStatusError as e:
        logger.error(f"[RUNPOD] HTTP ошибка: {e.response.status_code} - {e.response.text}")
        raise
    except httpx.RequestError as e:
        logger.error(f"[RUNPOD] Сетевая ошибка: {e}")
        raise
    except Exception as e:
        logger.error(f"[RUNPOD] Неожиданная ошибка при старте генерации: {e}")
        raise


async def check_status(
    client: httpx.AsyncClient,
    job_id: str,
    runpod_url_base: Optional[str] = None
) -> Dict[str, Any]:
    """
    Опрашивает статус задачи по Job ID.
    
    Args:
        client: Асинхронный HTTP клиент
        job_id: ID задачи
        runpod_url_base: Базовый URL для проверки статуса (если не указан, используется дефолтный RUNPOD_URL_BASE)
        
    Returns:
        JSON-ответ от RunPod API со статусом
        
    Raises:
        ValueError: Если не установлены необходимые переменные
        httpx.HTTPError: При ошибках сетевого запроса
    """
    if not RUNPOD_API_KEY:
        raise ValueError("RUNPOD_API_KEY не установлен в переменных окружения")
    
    # Используем переданный базовый URL или дефолтный
    base_url = runpod_url_base or RUNPOD_URL_BASE
    if not base_url:
        raise ValueError("Базовый URL не может быть вычислен. Убедитесь, что установлен RUNPOD_URL или RUNPOD_URL_2")
    
    # Формируем URL для проверки статуса
    status_url = f"{base_url}/status/{job_id}"
    
    logger.info(f"[RUNPOD] Проверка статуса job_id={job_id} на URL: {status_url}")
    logger.info(f"[RUNPOD] Используемый base_url: {base_url} (переданный: {runpod_url_base}, дефолтный: {RUNPOD_URL_BASE})")
    
    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = await client.get(
            status_url,
            headers=headers,
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        
        result = response.json()
        return result
        
    except httpx.HTTPStatusError as e:
        # Если получили 404 и есть альтернативный endpoint, пробуем его
        if e.response.status_code == 404 and runpod_url_base:
            logger.warning(f"[RUNPOD] Job не найден на {base_url}, пробуем альтернативный endpoint...")
            # Пробуем другой endpoint
            alternative_base = RUNPOD_URL_BASE_2 if base_url == RUNPOD_URL_BASE else RUNPOD_URL_BASE
            if alternative_base:
                alternative_url = f"{alternative_base}/status/{job_id}"
                logger.info(f"[RUNPOD] Пробуем альтернативный URL: {alternative_url}")
                try:
                    alt_response = await client.get(
                        alternative_url,
                        headers=headers,
                        timeout=REQUEST_TIMEOUT
                    )
                    alt_response.raise_for_status()
                    result = alt_response.json()
                    logger.info(f"[RUNPOD] ✓ Job найден на альтернативном endpoint!")
                    return result
                except Exception as alt_error:
                    logger.error(f"[RUNPOD] Альтернативный endpoint также не помог: {alt_error}")
        
        logger.error(f"[RUNPOD] HTTP ошибка при проверке статуса: {e.response.status_code} - {e.response.text}")
        raise
    except httpx.RequestError as e:
        logger.error(f"[RUNPOD] Сетевая ошибка при проверке статуса: {e}")
        raise
    except Exception as e:
        logger.error(f"[RUNPOD] Неожиданная ошибка при проверке статуса: {e}")
        raise


async def generate_image_async(
    user_prompt: str,
    width: Optional[int] = None,
    height: Optional[int] = None,
    steps: Optional[int] = None,
    cfg_scale: Optional[float] = None,
    seed: Optional[int] = None,
    sampler_name: Optional[str] = None,
    scheduler: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    use_enhanced_prompts: bool = True,
    lora_scale: Optional[float] = None,
    model: Optional[str] = "anime-realism",
    timeout: int = DEFAULT_TIMEOUT
) -> str:
    """
    Главная функция для асинхронной генерации изображения через RunPod.
    
    Алгоритм:
    1. Запускает задачу генерации и получает Job ID
    2. В цикле опрашивает статус каждые 5 секунд
    3. При успехе возвращает публичный URL изображения
    4. При ошибке или таймауте выбрасывает исключение
    
    Args:
        user_prompt: Промпт пользователя
        width: Ширина изображения
        height: Высота изображения
        steps: Количество шагов
        cfg_scale: CFG Scale
        seed: Сид для генерации
        sampler_name: Название сэмплера
        scheduler: Планировщик
        negative_prompt: Негативный промпт
        use_enhanced_prompts: Использовать ли дефолтные промпты
        timeout: Максимальное время ожидания в секундах
        
    Returns:
        Публичный URL сгенерированного изображения
        
    Raises:
        TimeoutError: Если генерация превысила timeout
        RuntimeError: Если задача завершилась с ошибкой или была отменена
        ValueError: Если не установлены необходимые переменные окружения
    """
    start_time = time.time()
    
    async with httpx.AsyncClient() as client:
        # Шаг 1: Запускаем генерацию
        try:
            job_id, runpod_url_base = await start_generation(
                client=client,
                user_prompt=user_prompt,
                width=width,
                height=height,
                steps=steps,
                cfg_scale=cfg_scale,
                seed=seed,
                sampler_name=sampler_name,
                scheduler=scheduler,
                negative_prompt=negative_prompt,
                use_enhanced_prompts=use_enhanced_prompts,
                lora_scale=lora_scale,
                model=model
            )
        except Exception as e:
            logger.error(f"[RUNPOD] Ошибка при запуске генерации: {e}")
            raise RuntimeError(f"Не удалось запустить генерацию: {e}")
        
        # Шаг 2: Опрос статуса в цикле
        logger.info(f"[RUNPOD] Начинаю опрос статуса задачи {job_id}")
        
        while True:
            # Проверяем таймаут
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout:
                logger.error(f"[RUNPOD] Превышен таймаут ({timeout}s) для задачи {job_id}")
                raise TimeoutError(f"Генерация превысила максимальное время ожидания {timeout} секунд")
            
            # Ждём перед следующим запросом
            await asyncio.sleep(POLL_INTERVAL)
            
            # Проверяем статус
            try:
                status_response = await check_status(client, job_id, runpod_url_base)
            except Exception as e:
                logger.error(f"[RUNPOD] Ошибка при проверке статуса {job_id}: {e}")
                # Не выбрасываем исключение, пробуем ещё раз
                continue
            
            status = status_response.get("status")
            logger.debug(f"[RUNPOD] Статус задачи {job_id}: {status}")
            
            # Обрабатываем различные статусы
            if status == "COMPLETED":
                # Извлекаем результат
                output = status_response.get("output", {})
                
                # Проверяем наличие image_url (если S3 настроен)
                image_url = output.get("image_url")
                
                if image_url:
                    logger.success(f"[RUNPOD] Генерация завершена: {image_url}")
                    return image_url
                
                # Fallback: если S3 не настроен, RunPod возвращает Base64
                image_base64 = output.get("image")
                
                if image_base64:
                    logger.warning(f"[RUNPOD] S3 не настроен, получен Base64. Загружаем в Yandex S3...")
                    
                    # Сохраняем Base64 в Yandex S3
                    try:
                        import base64
                        import io
                        import uuid
                        import boto3
                        import os
                        
                        # Убираем префикс data:image/png;base64, если есть
                        if image_base64.startswith('data:image'):
                            image_base64 = image_base64.split(',', 1)[1]
                        
                        # Декодируем Base64 в bytes
                        image_bytes = base64.b64decode(image_base64)
                        
                        # Загружаем в Yandex S3
                        s3_client = boto3.client(
                            's3',
                            endpoint_url=os.getenv('YANDEX_ENDPOINT_URL', 'https://storage.yandexcloud.net'),
                            aws_access_key_id=os.getenv('YANDEX_ACCESS_KEY'),
                            aws_secret_access_key=os.getenv('YANDEX_SECRET_KEY')
                        )
                        
                        bucket_name = os.getenv('YANDEX_BUCKET_NAME')
                        if not bucket_name:
                            raise ValueError("YANDEX_BUCKET_NAME не установлен")
                        
                        # Генерируем уникальное имя файла
                        filename = f"runpod_{uuid.uuid4()}.png"
                        
                        # Загружаем в S3
                        s3_client.put_object(
                            Bucket=bucket_name,
                            Key=filename,
                            Body=image_bytes,
                            ContentType='image/png',
                            ACL='public-read'
                        )
                        
                        # Формируем публичный URL
                        public_url = f"https://{bucket_name}.storage.yandexcloud.net/{filename}"
                        
                        logger.success(f"[RUNPOD] Base64 загружен в S3: {public_url}")
                        return public_url
                        
                    except Exception as s3_error:
                        logger.error(f"[RUNPOD] Ошибка загрузки Base64 в S3: {s3_error}")
                        # НЕЛЬЗЯ возвращать Base64 - база данных не примет такую длинную строку
                        raise RuntimeError(f"RunPod вернул Base64, но не удалось загрузить в S3: {s3_error}. "
                                         f"Настрой YANDEX_BUCKET_NAME, YANDEX_ACCESS_KEY, YANDEX_SECRET_KEY в переменных окружения "
                                         f"или добавь их на RunPod endpoint.")
                
                # Если нет ни URL, ни Base64
                raise RuntimeError(f"RunPod вернул статус COMPLETED, но не вернул ни image_url, ни image: {output}")
            
            elif status == "FAILED":
                error = status_response.get("error", "Unknown error")
                logger.error(f"[RUNPOD] Задача {job_id} завершилась с ошибкой: {error}")
                raise RuntimeError(f"RunPod генерация завершилась с ошибкой: {error}")
            
            elif status == "CANCELLED":
                logger.error(f"[RUNPOD] Задача {job_id} была отменена")
                raise RuntimeError("RunPod генерация была отменена")
            
            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                # Задача всё ещё выполняется, продолжаем ожидание
                logger.debug(f"[RUNPOD] Задача {job_id} в процессе выполнения...")
                continue
            
            else:
                # Неизвестный статус
                logger.warning(f"[RUNPOD] Неизвестный статус {status} для задачи {job_id}")
                continue


# ========================================
# Пример использования
# ========================================

async def main():
    """
    Простой пример вызова асинхронной функции генерации.
    """
    try:
        # Пример промпта
        test_prompt = "beautiful anime girl, long blue hair, detailed eyes, smile"
        
        logger.info("Начинаю тестовую генерацию...")
        
        # Вызываем асинхронную функцию генерации
        image_url = await generate_image_async(
            user_prompt=test_prompt,
            width=832,
            height=1216,
            steps=30,
            timeout=300
        )
        
        logger.success(f"Генерация успешна! URL: {image_url}")
        return image_url
        
    except TimeoutError as e:
        logger.error(f"Таймаут генерации: {e}")
        raise
    except RuntimeError as e:
        logger.error(f"Ошибка генерации: {e}")
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка: {e}")
        raise


if __name__ == "__main__":
    # Запуск примера через asyncio.run()
    asyncio.run(main())

