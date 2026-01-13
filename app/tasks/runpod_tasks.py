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
    
    # Мы будем управлять повторами вручную в методе задачи для большего контроля
    max_retries = 2
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при неудачном выполнении задачи."""
        logger.error(f"[RUNPOD TASK] Задача {task_id} окончательно завершилась с ошибкой: {exc}")
        # При окончательной ошибке списывать монеты мы уже списали в начале
        super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_success(self, retval, task_id, args, kwargs):
        """Вызывается при успешном выполнении задачи."""
        logger.success(f"[RUNPOD TASK] Задача {task_id} успешно завершена")
        super().on_success(retval, task_id, args, kwargs)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при повторной попытке выполнения задачи."""
        logger.warning(f"[RUNPOD TASK] Задача {task_id} будет повторена (попытка {self.request.retries + 1}) из-за: {exc}")
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
    """
    task_id = self.request.id
    current_retry = self.request.retries
    logger.info(f"[RUNPOD TASK] Запуск задачи {task_id} (попытка {current_retry})")
    
    def update_celery_progress(progress_str):
        try:
            percent = int(progress_str.replace('%', '').strip())
            self.update_state(
                state='PROGRESS',
                meta={
                    'status': 'generating',
                    'progress': percent,
                    'message': f"Generating: {percent}%"
                }
            )
        except:
            pass
    
    try:
        import time
        start_time = time.time()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
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
                    progress_callback=update_celery_progress
                )
            )
        finally:
            loop.close()
        
        execution_time = int(time.time() - start_time)
        
        return {
            "success": True,
            "image_url": image_url,
            "prompt": user_prompt,
            "task_id": task_id,
            "width": width,
            "height": height,
            "steps": steps,
            "cfg_scale": cfg_scale,
            "seed": seed,
            "progress": 100,
            "generation_time": execution_time
        }
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[RUNPOD TASK] Ошибка в задаче {task_id}: {error_msg}")
        
        # Проверяем, является ли это ошибкой отмены генерации
        from app.services.runpod_client import GenerationCancelledError
        if isinstance(e, GenerationCancelledError):
            # Для отмененных задач не делаем retry - просто завершаем с ошибкой
            logger.warning(f"[RUNPOD TASK] Задача {task_id} была отменена, retry не выполняется")
            self.update_state(
                state='FAILURE',
                meta={
                    'status': 'cancelled',
                    'error': error_msg,
                    'message': 'Генерация была отменена пользователем'
                }
            )
            raise RuntimeError(f"Генерация была отменена: {error_msg}")
        
        # Если это ошибка CUDA out of memory, мы можем попробовать еще раз через паузу,
        # но если это последняя попытка, нужно отдать детальную ошибку
        is_oom = "CUDA out of memory" in error_msg
        
        if current_retry < self.max_retries:
            # Обновляем состояние перед ретраем, чтобы фронтенд видел ошибку
            self.update_state(
                state='RETRY',
                meta={
                    'status': 'retrying',
                    'error': error_msg,
                    'message': f"Ошибка: {error_msg}. Повторная попытка..."
                }
            )
            # Для OOM делаем паузу побольше, чтобы память успела очиститься
            countdown = 10 if not is_oom else 30
            raise self.retry(exc=e, countdown=countdown)
        else:
            # Если попытки исчерпаны, пробрасываем ошибку дальше
            # Celery установит состояние FAILURE
            raise RuntimeError(f"Генерация не удалась после {self.max_retries + 1} попыток. Последняя ошибка: {error_msg}")


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

