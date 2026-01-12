"""
API endpoints для работы с RunPod генерацией изображений через Celery.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from celery.result import AsyncResult
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import get_db
from app.tasks.runpod_tasks import (
    generate_image_runpod_task,
    generate_image_batch_task,
    test_runpod_connection_task
)
from app.auth.dependencies import get_current_user_optional
from app.models.user import Users


router = APIRouter(prefix="/runpod", tags=["RunPod Generation"])


# ========================================
# Pydantic Models
# ========================================

class GenerationRequest(BaseModel):
    """Запрос на генерацию изображения"""
    prompt: str = Field(..., description="Промпт для генерации", min_length=1, max_length=2000)
    width: Optional[int] = Field(None, description="Ширина изображения", ge=512, le=2048)
    height: Optional[int] = Field(None, description="Высота изображения", ge=512, le=2048)
    steps: Optional[int] = Field(None, description="Количество шагов", ge=1, le=150)
    cfg_scale: Optional[float] = Field(None, description="CFG Scale", ge=1.0, le=20.0)
    seed: Optional[int] = Field(None, description="Сид для воспроизводимости")
    sampler_name: Optional[str] = Field(None, description="Название сэмплера")
    scheduler: Optional[str] = Field(None, description="Планировщик")
    negative_prompt: Optional[str] = Field(None, description="Негативный промпт")
    use_enhanced_prompts: bool = Field(True, description="Добавлять ли дефолтные промпты")


class BatchGenerationRequest(BaseModel):
    """Запрос на пакетную генерацию"""
    prompts: list[str] = Field(..., description="Список промптов", min_items=1, max_items=10)
    width: Optional[int] = Field(None, ge=512, le=2048)
    height: Optional[int] = Field(None, ge=512, le=2048)
    steps: Optional[int] = Field(None, ge=1, le=150)
    cfg_scale: Optional[float] = Field(None, ge=1.0, le=20.0)
    sampler_name: Optional[str] = None
    scheduler: Optional[str] = None
    negative_prompt: Optional[str] = None
    use_enhanced_prompts: bool = True


class TaskResponse(BaseModel):
    """Ответ с информацией о задаче"""
    task_id: str = Field(..., description="ID задачи Celery")
    status: str = Field(..., description="Статус задачи")
    message: str = Field(..., description="Информационное сообщение")


class TaskStatusResponse(BaseModel):
    """Ответ со статусом задачи"""
    task_id: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None


# ========================================
# Endpoints
# ========================================

@router.post("/generate", response_model=TaskResponse)
async def start_image_generation(
    request: GenerationRequest,
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Запускает генерацию изображения через RunPod в фоновом режиме.
    
    Возвращает task_id для отслеживания прогресса через /status/{task_id}.
    """
    try:
        logger.info(f"[RUNPOD API] Пользователь {current_user.id if current_user else 'guest'} запросил генерацию: {request.prompt[:100]}")
        
        # Определяем приоритет задачи
        task_priority = 5  # Нормальный приоритет по умолчанию
        
        if current_user:
            from app.services.profit_activate import ProfitActivateService
            from app.models.subscription import SubscriptionType
            
            sub_service = ProfitActivateService(db)
            subscription = await sub_service.get_user_subscription(current_user.id)
            
            if subscription and subscription.is_active:
                if subscription.subscription_type == SubscriptionType.PREMIUM:
                    task_priority = 1  # Самый высокий приоритет для Premium (в Celery: меньше = выше)
                    logger.info(f"[PRIORITY] Установлен приоритет 1 (высокий) для PREMIUM пользователя {current_user.id}")
                elif subscription.subscription_type == SubscriptionType.STANDARD:
                    task_priority = 3  # Средний приоритет для Standard
                    logger.info(f"[PRIORITY] Установлен приоритет 3 (средний) для STANDARD пользователя {current_user.id}")

        # Запускаем Celery задачу с указанием приоритета
        task = generate_image_runpod_task.apply_async(
            kwargs={
                "user_prompt": request.prompt,
                "width": request.width,
                "height": request.height,
                "steps": request.steps,
                "cfg_scale": request.cfg_scale,
                "seed": request.seed,
                "sampler_name": request.sampler_name,
                "scheduler": request.scheduler,
                "negative_prompt": request.negative_prompt,
                "use_enhanced_prompts": request.use_enhanced_prompts
            },
            priority=task_priority
        )
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message=f"Image generation started (priority: {task_priority}). Use /status/{{task_id}} to check progress."
        )
        
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка запуска генерации: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start generation: {str(e)}")


@router.post("/generate/batch", response_model=TaskResponse)
async def start_batch_generation(
    request: BatchGenerationRequest,
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Запускает пакетную генерацию изображений.
    
    Максимум 10 промптов за раз.
    """
    try:
        logger.info(f"[RUNPOD API] Пакетная генерация для {len(request.prompts)} промптов")
        
        # Определяем приоритет задачи
        task_priority = 5
        if current_user:
            from app.services.profit_activate import ProfitActivateService
            from app.models.subscription import SubscriptionType
            
            sub_service = ProfitActivateService(db)
            subscription = await sub_service.get_user_subscription(current_user.id)
            
            if subscription and subscription.is_active:
                if subscription.subscription_type == SubscriptionType.PREMIUM:
                    task_priority = 1  # Самый высокий приоритет для Premium (в Celery: меньше = выше)
                elif subscription.subscription_type == SubscriptionType.STANDARD:
                    task_priority = 3  # Средний приоритет для Standard

        task = generate_image_batch_task.apply_async(
            kwargs={
                "prompts": request.prompts,
                "width": request.width,
                "height": request.height,
                "steps": request.steps,
                "cfg_scale": request.cfg_scale,
                "sampler_name": request.sampler_name,
                "scheduler": request.scheduler,
                "negative_prompt": request.negative_prompt,
                "use_enhanced_prompts": request.use_enhanced_prompts
            },
            priority=task_priority
        )
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message=f"Batch generation started (priority: {task_priority}) for {len(request.prompts)} prompts."
        )
        
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка пакетной генерации: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def check_task_status(task_id: str):
    """
    Проверяет статус задачи генерации по task_id.
    
    Статусы:
    - PENDING: Задача в очереди
    - STARTED: Задача выполняется
    - PROGRESS: Задача выполняется с прогрессом (generating)
    - SUCCESS: Задача завершена успешно
    - FAILURE: Задача завершилась с ошибкой
    - RETRY: Задача будет повторена
    """
    try:
        task = AsyncResult(task_id)
        
        # Если задача в состоянии PROGRESS (промежуточный результат)
        if task.state == 'PROGRESS':
            # Возвращаем промежуточный результат из meta
            return TaskStatusResponse(
                task_id=task_id,
                status="generating",  # Можно использовать кастомный статус для фронта
                result=task.info  # Тут будет {'progress': 30, 'status': 'generating', 'message': 'Generating: 30%'}
            )
        
        # Если задача завершена
        if task.ready():
            if task.successful():
                result = task.result
                return TaskStatusResponse(
                    task_id=task_id,
                    status="success",
                    result=result
                )
            else:
                # Задача завершилась с ошибкой
                error = str(task.info) if task.info else "Unknown error"
                return TaskStatusResponse(
                    task_id=task_id,
                    status="failed",
                    error=error
                )
        else:
            # PENDING или STARTED (но еще без прогресса)
            return TaskStatusResponse(
                task_id=task_id,
                status=task.status.lower(),
                result={"progress": 0} if task.status == 'PENDING' or task.status == 'STARTED' else None
            )
            
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка проверки статуса {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cancel/{task_id}")
async def cancel_task(task_id: str):
    """
    Отменяет задачу генерации.
    
    Примечание: Если задача уже выполняется на RunPod, она может не отмениться мгновенно.
    """
    try:
        task = AsyncResult(task_id)
        task.revoke(terminate=True)
        
        logger.info(f"[RUNPOD API] Задача {task_id} отменена")
        return {
            "task_id": task_id,
            "status": "cancelled",
            "message": "Task cancellation requested"
        }
        
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка отмены задачи {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_runpod_connection():
    """
    Тестирует подключение к RunPod API.
    
    Запускает простую генерацию и проверяет, работает ли всё корректно.
    """
    try:
        task = test_runpod_connection_task.delay()
        
        return TaskResponse(
            task_id=task.id,
            status="pending",
            message="Testing RunPod connection. Use /status/{task_id} to check result."
        )
        
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка тестирования: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/stats")
async def get_queue_stats():
    """
    Возвращает статистику очередей Celery.
    
    Показывает количество активных, зарезервированных и запланированных задач.
    """
    try:
        from app.celery_app import celery_app
        
        inspect = celery_app.control.inspect()
        
        # Получаем статистику
        active = inspect.active() or {}
        reserved = inspect.reserved() or {}
        scheduled = inspect.scheduled() or {}
        
        # Подсчитываем задачи
        stats = {
            "active_tasks": sum(len(tasks) for tasks in active.values()),
            "reserved_tasks": sum(len(tasks) for tasks in reserved.values()),
            "scheduled_tasks": sum(len(tasks) for tasks in scheduled.values()),
            "workers": list(active.keys()) if active else []
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"[RUNPOD API] Ошибка получения статистики: {e}")
        raise HTTPException(status_code=500, detail=str(e))

