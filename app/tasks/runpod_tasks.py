"""
Celery задачи для генерации изображений через RunPod API.
Используются для фоновой обработки запросов генерации.
"""
import asyncio
from typing import Optional, Dict, Any
from celery import Task
from loguru import logger

from app.celery_app import celery_app
from app.services.runpod_client import generate_image_async


class RunPodGenerationTask(Task):
    """
    Базовый класс для задач генерации через RunPod.
    Обрабатывает ошибки и логирование.
    """
    
    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3, "countdown": 60}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при неудачном выполнении задачи."""
        logger.error(f"[RUNPOD TASK] Задача {task_id} завершилась с ошибкой: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_success(self, retval, task_id, args, kwargs):
        """Вызывается при успешном выполнении задачи."""
        logger.success(f"[RUNPOD TASK] Задача {task_id} успешно завершена")
        super().on_success(retval, task_id, args, kwargs)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при повторной попытке выполнения задачи."""
        logger.warning(f"[RUNPOD TASK] Задача {task_id} будет повторена из-за: {exc}")
        super().on_retry(exc, task_id, args, kwargs, einfo)


@celery_app.task(
    bind=True,
    base=RunPodGenerationTask,
    name="app.tasks.runpod_tasks.generate_image_runpod_task"
)
def generate_image_runpod_task(
    self,
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
    timeout: int = 300,
    model: Optional[str] = "anime-realism",
    lora_scale: Optional[float] = None
) -> Dict[str, Any]:
    """
    Celery задача для генерации изображения через RunPod API.
    
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
        Dict с результатами:
        {
            "success": True,
            "image_url": "https://...",
            "prompt": "...",
            "task_id": "..."
        }
        
    Raises:
        Exception: При ошибках генерации (будет автоматически обработано retry)
    """
    task_id = self.request.id
    logger.info(f"[RUNPOD TASK] Запуск задачи {task_id} с промптом: {user_prompt[:100]}...")
    
    # Функция, которая будет обновлять статус задачи в Redis/Celery
    def update_celery_progress(progress_str):
        # Парсим "30%" -> 30
        try:
            percent = int(progress_str.replace('%', '').strip())
            self.update_state(
                state='PROGRESS',  # Специальный статус
                meta={
                    'status': 'generating',
                    'progress': percent,
                    'message': f"Generating: {percent}%"
                }
            )
        except:
            pass
    
    try:
        # Создаём новый event loop для этой задачи
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Запускаем асинхронную генерацию
            image_url = loop.run_until_complete(
                generate_image_async(
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
                    timeout=timeout,
                    model=model,
                    lora_scale=lora_scale,
                    progress_callback=update_celery_progress  # <--- ПЕРЕДАЕМ КОЛЛБЕК
                )
            )
        finally:
            loop.close()
        
        result = {
            "success": True,
            "image_url": image_url,
            "prompt": user_prompt,
            "task_id": task_id,
            "width": width,
            "height": height,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "seed": seed,
            "progress": 100  # Финал
        }
        
        logger.success(f"[RUNPOD TASK] Задача {task_id} завершена успешно: {image_url}")
        return result
        
    except TimeoutError as e:
        logger.error(f"[RUNPOD TASK] Таймаут для задачи {task_id}: {e}")
        raise self.retry(exc=e, countdown=120)  # Повторная попытка через 2 минуты
        
    except Exception as e:
        logger.error(f"[RUNPOD TASK] Ошибка в задаче {task_id}: {e}")
        raise  # Позволяем autoretry обработать ошибку


@celery_app.task(
    bind=True,
    base=RunPodGenerationTask,
    name="app.tasks.runpod_tasks.generate_image_batch_task"
)
def generate_image_batch_task(
    self,
    prompts: list[str],
    width: Optional[int] = None,
    height: Optional[int] = None,
    steps: Optional[int] = None,
    cfg_scale: Optional[float] = None,
    sampler_name: Optional[str] = None,
    scheduler: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    use_enhanced_prompts: bool = True,
    timeout_per_image: int = 300
) -> Dict[str, Any]:
    """
    Celery задача для пакетной генерации изображений через RunPod API.
    
    Args:
        prompts: Список промптов для генерации
        width: Ширина изображения
        height: Высота изображения
        steps: Количество шагов
        cfg_scale: CFG Scale
        sampler_name: Название сэмплера
        scheduler: Планировщик
        negative_prompt: Негативный промпт
        use_enhanced_prompts: Использовать ли дефолтные промпты
        timeout_per_image: Таймаут на одно изображение
        
    Returns:
        Dict с результатами:
        {
            "success": True,
            "results": [
                {"prompt": "...", "image_url": "...", "success": True},
                ...
            ],
            "total": 5,
            "successful": 4,
            "failed": 1
        }
    """
    task_id = self.request.id
    logger.info(f"[RUNPOD BATCH] Запуск пакетной генерации {task_id} для {len(prompts)} промптов")
    
    results = []
    successful = 0
    failed = 0
    
    for i, prompt in enumerate(prompts):
        logger.info(f"[RUNPOD BATCH] Обработка {i+1}/{len(prompts)}: {prompt[:50]}...")
        
        try:
            # Создаём отдельную задачу для каждого промпта
            result = generate_image_runpod_task.apply_async(
                kwargs={
                    "user_prompt": prompt,
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "sampler_name": sampler_name,
                    "scheduler": scheduler,
                    "negative_prompt": negative_prompt,
                    "use_enhanced_prompts": use_enhanced_prompts,
                    "timeout": timeout_per_image
                }
            )
            
            # Ждём результата (синхронно)
            task_result = result.get(timeout=timeout_per_image + 60)
            
            results.append({
                "prompt": prompt,
                "image_url": task_result.get("image_url"),
                "success": True
            })
            successful += 1
            
        except Exception as e:
            logger.error(f"[RUNPOD BATCH] Ошибка для промпта '{prompt[:50]}': {e}")
            results.append({
                "prompt": prompt,
                "image_url": None,
                "success": False,
                "error": str(e)
            })
            failed += 1
    
    batch_result = {
        "success": True,
        "results": results,
        "total": len(prompts),
        "successful": successful,
        "failed": failed,
        "task_id": task_id
    }
    
    logger.info(f"[RUNPOD BATCH] Пакетная генерация {task_id} завершена: {successful}/{len(prompts)} успешно")
    return batch_result


@celery_app.task(
    bind=True,
    name="app.tasks.runpod_tasks.test_runpod_connection_task"
)
def test_runpod_connection_task(self) -> Dict[str, Any]:
    """
    Тестовая задача для проверки подключения к RunPod API.
    
    Returns:
        Dict с результатами теста:
        {
            "success": True/False,
            "message": "...",
            "endpoint_configured": True/False
        }
    """
    import os
    
    task_id = self.request.id
    logger.info(f"[RUNPOD TEST] Запуск тестовой задачи {task_id}")
    
    # Проверяем переменные окружения
    api_key = os.getenv("RUNPOD_API_KEY")
    url = os.getenv("RUNPOD_URL")
    
    if not api_key:
        return {
            "success": False,
            "message": "RUNPOD_API_KEY не установлен",
            "endpoint_configured": False
        }
    
    if not url:
        return {
            "success": False,
            "message": "RUNPOD_URL не установлен",
            "endpoint_configured": False
        }
    
    # Пробуем выполнить тестовую генерацию
    try:
        test_prompt = "test image"
        
        result = generate_image_runpod_task.apply_async(
            kwargs={
                "user_prompt": test_prompt,
                "width": 832,
                "height": 1216,
                "steps": 20,  # Меньше шагов для теста
                "timeout": 180
            }
        )
        
        # Ждём результата
        task_result = result.get(timeout=240)
        
        return {
            "success": True,
            "message": "RunPod API работает корректно",
            "endpoint_configured": True,
            "test_image_url": task_result.get("image_url")
        }
        
    except Exception as e:
        logger.error(f"[RUNPOD TEST] Ошибка тестирования: {e}")
        return {
            "success": False,
            "message": f"Ошибка подключения к RunPod: {str(e)}",
            "endpoint_configured": True  # Переменные есть, но подключение не работает
        }

