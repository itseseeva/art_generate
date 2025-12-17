"""
RunPod Progress Tracker - отслеживание прогресса генерации в реальном времени.

Этот модуль предоставляет функцию для отправки задачи в RunPod и отслеживания
прогресса генерации с извлечением процентов из ответов API.

Основные функции:
- submit_and_track_progress(): Асинхронная функция для отправки и отслеживания
- submit_and_track_progress_sync(): Синхронная версия (обертка над async)
- extract_progress_from_response(): Извлечение процента из ответа API

Пример использования:
    ```python
    import asyncio
    from app.services.runpod_progress_tracker import submit_and_track_progress
    
    async def main():
        def on_progress(percent: int):
            print(f"Прогресс: {percent}%")
        
        result = await submit_and_track_progress(
            api_key="your-api-key",
            endpoint_id="your-endpoint-id",
            payload={"input": {"prompt": "test"}},
            progress_callback=on_progress
        )
        print(f"Результат: {result['output']}")
    
    asyncio.run(main())
    ```
"""
import os
import time
import asyncio
import re
from typing import Optional, Dict, Any, Callable
import httpx
from loguru import logger


# Константы
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
DEFAULT_POLL_INTERVAL = 2  # Опрос каждые 2 секунды
DEFAULT_TIMEOUT = 300  # 5 минут максимум
REQUEST_TIMEOUT = 30  # Таймаут для HTTP запросов


def extract_progress_from_response(status_response: Dict[str, Any]) -> Optional[int]:
    """
    Извлекает процент прогресса из ответа RunPod API.
    
    Когда handler вызывает `runpod.serverless.progress_update(job, "90%")`,
    RunPod API возвращает прогресс в поле "output" как строку "90%".
    
    Args:
        status_response: JSON ответ от RunPod API
        
    Returns:
        Процент прогресса (0-100) или None, если не найден
    """
    # Логирование структуры ответа удалено для уменьшения шума в логах
    
    # 1. Проверяем поле "progress" напрямую (согласно документации RunPod)
    progress = status_response.get("progress")
    if progress is not None:
        logger.debug(f"[PROGRESS] Найдено поле progress: {progress} (тип: {type(progress)})")
        if isinstance(progress, (int, float)):
            percent = min(100, max(0, int(progress)))
            logger.info(f"[PROGRESS] ✓ Извлечен прогресс из progress (число): {percent}%")
            return percent
        elif isinstance(progress, str):
            # Ищем паттерн "90%" в строке прогресса
            match = re.search(r'(\d+)%', progress)
            if match:
                percent = int(match.group(1))
                percent = min(100, max(0, percent))
                logger.info(f"[PROGRESS] ✓ Извлечен прогресс из progress (строка): {percent}%")
                return percent
            else:
                logger.debug(f"[PROGRESS] progress является строкой, но не содержит процент: '{progress}'")
    
    # 2. Проверяем поле "status" (может содержать "50%" или "IN_PROGRESS 50%")
    status = status_response.get("status", "")
    if isinstance(status, str):
        # Ищем процент в строке статуса
        match = re.search(r'(\d+)%', status)
        if match:
            return min(100, max(0, int(match.group(1))))
    
    # 3. Проверяем вложенные поля в "output"
    output = status_response.get("output", {})
    if isinstance(output, dict):
        # Проверяем output.progress
        output_progress = output.get("progress")
        if output_progress is not None:
            if isinstance(output_progress, (int, float)):
                return min(100, max(0, int(output_progress)))
            elif isinstance(output_progress, str):
                # Ищем паттерн "Progress: 90%" или просто "90%"
                match = re.search(
                    r'Progress:\s*(\d+)%|(\d+)%',
                    output_progress,
                    re.IGNORECASE
                )
                if match:
                    percent = int(match.group(1) or match.group(2))
                    return min(100, max(0, percent))
        
        # Проверяем output.message (может содержать "Progress: 90%")
        output_message = output.get("message")
        if isinstance(output_message, str):
            # Ищем паттерн "Progress: 90%" или просто "90%"
            match = re.search(
                r'Progress:\s*(\d+)%|(\d+)%',
                output_message,
                re.IGNORECASE
            )
            if match:
                percent = int(match.group(1) or match.group(2))
                return min(100, max(0, percent))
    
    # 3.5. Проверяем output как строку напрямую (RunPod возвращает "90%" в output)
    # Это самый частый случай - когда worker вызывает progress_update(job, "90%")
    # RunPod API возвращает прогресс в поле output как строку "90%" при статусе IN_PROGRESS
    if isinstance(output, str):
        # Ищем паттерн "Progress: 90%" или просто "90%"
        match = re.search(
            r'Progress:\s*(\d+)%|(\d+)%',
            output,
            re.IGNORECASE
        )
        if match:
            percent = int(match.group(1) or match.group(2))
            logger.info(f"[PROGRESS] ✓ Извлечен прогресс из output (строка): {percent}%")
            return min(100, max(0, percent))
        else:
            logger.debug(f"[PROGRESS] output является строкой, но не содержит процент: '{output}'")
    
    # 4. Проверяем поле "stream"
    
    # 4. Проверяем поле "stream"
    stream = status_response.get("stream")
    if isinstance(stream, dict):
        stream_progress = stream.get("progress")
        if stream_progress is not None:
            if isinstance(stream_progress, (int, float)):
                return min(100, max(0, int(stream_progress)))
            elif isinstance(stream_progress, str):
                match = re.search(r'(\d+)%?', stream_progress)
                if match:
                    return min(100, max(0, int(match.group(1))))
    
    # 5. Проверяем другие возможные поля
    for key in ["progress_percent", "completion", "percent"]:
        value = status_response.get(key)
        if value is not None:
            if isinstance(value, (int, float)):
                return min(100, max(0, int(value)))
            elif isinstance(value, str):
                match = re.search(r'(\d+)%?', value)
                if match:
                    return min(100, max(0, int(match.group(1))))
    
    return None


async def submit_and_track_progress(
    api_key: str,
    endpoint_id: str,
    payload: Dict[str, Any],
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    timeout: int = DEFAULT_TIMEOUT,
    progress_callback: Optional[Callable[[int], None]] = None
) -> Dict[str, Any]:
    """
    Отправляет задачу в RunPod и отслеживает прогресс в реальном времени.
    
    Args:
        api_key: RunPod API ключ
        endpoint_id: ID endpoint'а RunPod (или полный URL)
        payload: Payload для отправки (должен содержать "input")
        poll_interval: Интервал опроса статуса в секундах (по умолчанию 2)
        timeout: Максимальное время ожидания в секундах (по умолчанию 300)
        progress_callback: Опциональная функция для вызова при обновлении прогресса
        
    Returns:
        Финальный результат задачи со статусом "COMPLETED"
        
    Raises:
        ValueError: Если не указаны необходимые параметры
        TimeoutError: Если задача превысила timeout
        RuntimeError: Если задача завершилась с ошибкой
    """
    if not api_key:
        raise ValueError("RUNPOD_API_KEY не указан")
    if not endpoint_id:
        raise ValueError("endpoint_id не указан")
    if not payload:
        raise ValueError("payload не может быть пустым")
    
    # Определяем URL для отправки задачи
    if endpoint_id.startswith("http"):
        # Если передан полный URL
        run_url = endpoint_id if endpoint_id.endswith("/run") or endpoint_id.endswith("/runsync") else f"{endpoint_id}/run"
        # Извлекаем базовый URL для проверки статуса
        base_url = endpoint_id.rstrip('/').replace('/run', '').replace('/runsync', '')
    else:
        # Если передан только endpoint_id
        run_url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
        base_url = f"https://api.runpod.ai/v2/{endpoint_id}"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    start_time = time.time()
    last_progress = None
    
    async with httpx.AsyncClient() as client:
        # Шаг 1: Отправляем задачу
        logger.info(f"[RUNPOD PROGRESS] Отправка задачи на {run_url}")
        try:
            response = await client.post(
                run_url,
                json=payload,
                headers=headers,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            result = response.json()
            job_id = result.get("id")
            
            if not job_id:
                raise ValueError(f"RunPod API не вернул Job ID: {result}")
            
            logger.info(f"[RUNPOD PROGRESS] Задача создана: {job_id}")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"[RUNPOD PROGRESS] HTTP ошибка при отправке: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Не удалось отправить задачу: {e.response.status_code}")
        except Exception as e:
            logger.error(f"[RUNPOD PROGRESS] Ошибка при отправке задачи: {e}")
            raise RuntimeError(f"Не удалось отправить задачу: {e}")
        
        # Шаг 2: Опрашиваем статус в цикле
        logger.info(f"[RUNPOD PROGRESS] Начинаю отслеживание прогресса для задачи {job_id}")
        
        while True:
            # Проверяем timeout
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout:
                raise TimeoutError(f"Задача превысила максимальное время ожидания {timeout} секунд")
            
            # Ждём перед следующим запросом
            await asyncio.sleep(poll_interval)
            
            # Проверяем статус
            status_url = f"{base_url}/status/{job_id}"
            try:
                response = await client.get(
                    status_url,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT
                )
                response.raise_for_status()
                status_response = response.json()
                
            except httpx.HTTPStatusError as e:
                logger.warning(f"[RUNPOD PROGRESS] HTTP ошибка при проверке статуса: {e.response.status_code}")
                # Продолжаем опрос при временных ошибках
                continue
            except Exception as e:
                logger.warning(f"[RUNPOD PROGRESS] Ошибка при проверке статуса: {e}")
                continue
            
            status = status_response.get("status", "").upper()
            
            # Извлекаем прогресс
            progress = extract_progress_from_response(status_response)
            
            # Вызываем callback если прогресс изменился
            if progress is not None and progress != last_progress:
                last_progress = progress
                logger.info(f"[RUNPOD PROGRESS] Прогресс: {progress}%")
                if progress_callback:
                    try:
                        progress_callback(progress)
                    except Exception as e:
                        logger.warning(f"[RUNPOD PROGRESS] Ошибка в progress_callback: {e}")
            
            # Обрабатываем различные статусы
            if status == "COMPLETED":
                output = status_response.get("output", {})
                logger.success(f"[RUNPOD PROGRESS] Задача {job_id} завершена успешно")
                return {
                    "status": "COMPLETED",
                    "job_id": job_id,
                    "output": output,
                    "full_response": status_response
                }
            
            elif status == "FAILED":
                error = status_response.get("error", "Unknown error")
                logger.error(f"[RUNPOD PROGRESS] Задача {job_id} завершилась с ошибкой: {error}")
                raise RuntimeError(f"RunPod задача завершилась с ошибкой: {error}")
            
            elif status == "CANCELLED":
                logger.error(f"[RUNPOD PROGRESS] Задача {job_id} была отменена")
                raise RuntimeError("RunPod задача была отменена")
            
            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                # Задача всё ещё выполняется, продолжаем ожидание
                if progress is not None:
                    logger.debug(f"[RUNPOD PROGRESS] Задача {job_id} в процессе: {progress}%")
                else:
                    logger.debug(f"[RUNPOD PROGRESS] Задача {job_id} в процессе (прогресс неизвестен)")
                continue
            
            else:
                # Неизвестный статус
                logger.warning(f"[RUNPOD PROGRESS] Неизвестный статус {status} для задачи {job_id}")
                continue


def submit_and_track_progress_sync(
    api_key: str,
    endpoint_id: str,
    payload: Dict[str, Any],
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    timeout: int = DEFAULT_TIMEOUT,
    progress_callback: Optional[Callable[[int], None]] = None
) -> Dict[str, Any]:
    """
    Синхронная версия submit_and_track_progress.
    
    Использует asyncio.run() для запуска асинхронной функции.
    Полезно для скриптов, которые не используют async/await.
    
    Args:
        api_key: RunPod API ключ
        endpoint_id: ID endpoint'а RunPod (или полный URL)
        payload: Payload для отправки (должен содержать "input")
        poll_interval: Интервал опроса статуса в секундах (по умолчанию 2)
        timeout: Максимальное время ожидания в секундах (по умолчанию 300)
        progress_callback: Опциональная функция для вызова при обновлении прогресса
        
    Returns:
        Финальный результат задачи со статусом "COMPLETED"
    """
    return asyncio.run(
        submit_and_track_progress(
            api_key=api_key,
            endpoint_id=endpoint_id,
            payload=payload,
            poll_interval=poll_interval,
            timeout=timeout,
            progress_callback=progress_callback
        )
    )


# ========================================
# Пример использования
# ========================================

async def example_usage():
    """
    Пример использования функции отслеживания прогресса (асинхронная версия).
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    api_key = os.getenv("RUNPOD_API_KEY")
    endpoint_id = os.getenv("RUNPOD_URL")  # Или просто endpoint ID
    
    if not api_key or not endpoint_id:
        print("Установите RUNPOD_API_KEY и RUNPOD_URL в переменных окружения")
        return
    
    # Пример payload
    payload = {
        "input": {
            "prompt": "beautiful anime girl, detailed",
            "width": 832,
            "height": 1216,
            "steps": 30
        }
    }
    
    # Callback для отображения прогресса
    def on_progress(percent: int):
        print(f"Прогресс: {percent}%")
    
    try:
        result = await submit_and_track_progress(
            api_key=api_key,
            endpoint_id=endpoint_id,
            payload=payload,
            poll_interval=2,
            timeout=300,
            progress_callback=on_progress
        )
        
        print(f"\n✓ Задача завершена!")
        print(f"Job ID: {result['job_id']}")
        print(f"Output: {result.get('output', {})}")
        
    except TimeoutError as e:
        print(f"✗ Таймаут: {e}")
    except RuntimeError as e:
        print(f"✗ Ошибка: {e}")
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")


def example_usage_sync():
    """
    Пример использования функции отслеживания прогресса (синхронная версия).
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    api_key = os.getenv("RUNPOD_API_KEY")
    endpoint_id = os.getenv("RUNPOD_URL")  # Или просто endpoint ID
    
    if not api_key or not endpoint_id:
        print("Установите RUNPOD_API_KEY и RUNPOD_URL в переменных окружения")
        return
    
    # Пример payload
    payload = {
        "input": {
            "prompt": "beautiful anime girl, detailed",
            "width": 832,
            "height": 1216,
            "steps": 30
        }
    }
    
    # Callback для отображения прогресса
    def on_progress(percent: int):
        print(f"Прогресс: {percent}%")
    
    try:
        result = submit_and_track_progress_sync(
            api_key=api_key,
            endpoint_id=endpoint_id,
            payload=payload,
            poll_interval=2,
            timeout=300,
            progress_callback=on_progress
        )
        
        print(f"\n✓ Задача завершена!")
        print(f"Job ID: {result['job_id']}")
        print(f"Output: {result.get('output', {})}")
        
    except TimeoutError as e:
        print(f"✗ Таймаут: {e}")
    except RuntimeError as e:
        print(f"✗ Ошибка: {e}")
    except Exception as e:
        print(f"✗ Неожиданная ошибка: {e}")


if __name__ == "__main__":
    # Можно использовать как async, так и sync версию
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "sync":
        example_usage_sync()
    else:
        asyncio.run(example_usage())
