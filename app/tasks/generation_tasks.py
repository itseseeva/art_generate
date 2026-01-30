"""
Задачи Celery для генерации изображений.
"""
import asyncio
import logging
import json
import time
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Базовый класс для задач с колбэками."""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Вызывается при успешном выполнении задачи."""
        # Убираем логирование успешных задач для уменьшения логов
        pass
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при ошибке выполнения задачи."""
        # Логируем только строковое представление исключения для избежания проблем с сериализацией
        error_msg = str(exc) if exc else "Неизвестная ошибка"
        logger.error(f"[CELERY] Задача {task_id} завершилась с ошибкой: {error_msg}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Вызывается при повторной попытке выполнения задачи."""
        error_msg = str(exc) if exc else "Неизвестная ошибка"
        logger.info(f"[CELERY] Повторная попытка задачи {task_id}: {error_msg}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.generation_tasks.generate_image_task"
)
def generate_image_task(
    self,
    settings_dict: Dict[str, Any],
    user_id: Optional[int] = None,
    character_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Задача Celery для генерации изображения.
    
    Args:
        self: Экземпляр задачи (bind=True)
        settings_dict: Словарь с настройками генерации
        user_id: ID пользователя (опционально)
        character_name: Имя персонажа (опционально)
        
    Returns:
        Dict с результатами генерации: {
            "success": bool,
            "image_url": str,
            "cloud_url": str,
            "filename": str,
            "error": str (если была ошибка)
        }
    """
    task_id = self.request.id
    
    logger.info(f"[CELERY TASK] ========================================")
    logger.info(f"[CELERY TASK] Начало выполнения задачи генерации")
    logger.info(f"[CELERY TASK] Task ID: {task_id}")
    logger.info(f"[CELERY TASK] User ID: {user_id}, Character: {character_name}")
    logger.info(f"[CELERY TASK] ========================================")
    
    try:
        # Ленивый импорт - импортируем только при выполнении задачи
        logger.debug(f"[CELERY TASK] Импортируем зависимости...")
        from app.services.face_refinement import FaceRefinementService
        from app.schemas.generation import GenerationSettings
        from app.config.settings import settings
        from app.services.yandex_storage import get_yandex_storage_service, transliterate_cyrillic_to_ascii
        from app.database.db import async_session_maker
        from app.models.chat_history import ChatHistory
        from app.services.profit_activate import ProfitActivateService
        from app.services.coins_service import CoinsService
        logger.debug(f"[CELERY TASK] ✓ Зависимости импортированы")
        
        # Обновляем статус задачи
        logger.info(f"[CELERY TASK] Обновляем статус: PROGRESS (10%)")
        self.update_state(
            state="PROGRESS",
            meta={"status": "Подготовка параметров генерации", "progress": 10}
        )
        
        # Создаем настройки генерации из словаря
        logger.debug(f"[CELERY TASK] Создаем GenerationSettings из словаря...")
        generation_settings = GenerationSettings(**settings_dict)
        logger.info(f"[CELERY TASK] ✓ Настройки созданы: steps={generation_settings.steps}, cfg={generation_settings.cfg_scale}")
        
        # Получаем настройки для логирования
        full_settings_for_logging = settings_dict.copy()
        
        # Обновляем статус и сохраняем метаданные для сохранения промпта
        logger.info(f"[CELERY TASK] Обновляем статус: PROGRESS (30%)")
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "Запуск генерации изображения",
                "progress": 30,
                "user_id": user_id,
                "character_name": character_name,
                "original_user_prompt": settings_dict.get("original_user_prompt", "")
            }
        )
        logger.debug(f"[CELERY TASK] Промпт (первые 100 символов): {settings_dict.get('prompt', '')[:100]}...")
        
        # Создаем сервис для генерации
        face_refinement_service = FaceRefinementService(settings.SD_API_URL)
        
        async def run_generation_flow():
            # Генерируем изображение
            logger.info(f"[CELERY TASK] ========================================")
            logger.info(f"[CELERY TASK] Запуск генерации через Stable Diffusion WebUI")
            logger.info(f"[CELERY TASK] ========================================")
            
            generation_start = time.time()
            result = await face_refinement_service.generate_image(generation_settings, full_settings_for_logging)
            generation_time = time.time() - generation_start
            
            logger.info(f"[CELERY TASK] ========================================")
            logger.info(f"[CELERY TASK] ✓ Генерация завершена за {generation_time:.2f}с")
            logger.info(f"[CELERY TASK] ========================================")
            
            if not result or not getattr(result, "image_data", None):
                raise Exception("Сервис генерации не вернул изображение")
            
            if len(result.image_data) == 0 or result.image_data[0] is None:
                raise Exception("Не удалось получить данные изображения от сервиса генерации")
            
            logger.warning(f"[CELERY] Изображение получено, начинаем загрузку в облако (task_id={task_id})")
            
            # Обновляем статус
            self.update_state(
                state="PROGRESS",
                meta={"status": "Загрузка изображения в облако", "progress": 70}
            )
            
            image_data = result.image_data[0]
            
            # Проверяем тип данных и конвертируем в bytes если нужно
            if isinstance(image_data, bytes):
                image_bytes = image_data
            elif isinstance(image_data, str):
                import base64
                image_bytes = base64.b64decode(image_data)
            else:
                from io import BytesIO
                from PIL import Image
                if isinstance(image_data, Image.Image):
                    buffer = BytesIO()
                    image_data.save(buffer, format="PNG")
                    image_bytes = buffer.getvalue()
                else:
                    raise ValueError(f"Неподдерживаемый тип данных изображения: {type(image_data)}")
            
            if not image_bytes or len(image_bytes) == 0:
                raise ValueError("Получены пустые данные изображения")
            
            # Определяем имя персонажа и транслитерируем его для URL
            character_name_ascii = transliterate_cyrillic_to_ascii(character_name or "character")
            filename = f"generated_{int(time.time())}.webp"
            
            service = get_yandex_storage_service()
            object_key = f"generated_images/{character_name_ascii}/{filename}"
            
            upload_start = time.time()
            cloud_url = await service.upload_file(
                file_data=image_bytes,
                object_key=object_key,
                content_type='image/webp',
                metadata={
                    "character_name": character_name_ascii,
                    "generated_at": datetime.now().isoformat(),
                    "source": "api_generation",
                    "task_id": task_id
                },
                convert_to_webp=True
            )
            upload_time = time.time() - upload_start
            
            logger.info(f"[CELERY TASK] ========================================")
            logger.info(f"[CELERY TASK] ✓ Изображение загружено за {upload_time:.2f}с")
            logger.info(f"[CELERY TASK] Cloud URL: {cloud_url}")
            logger.info(f"[CELERY TASK] ========================================")
            
            # Обновляем статус
            self.update_state(
                state="PROGRESS",
                meta={"status": "Сохранение в базу данных", "progress": 90}
            )
            
            # Тратим монеты и лимиты подписки за генерацию фото (если пользователь авторизован)
            if user_id is not None:
                try:
                    await _spend_photo_resources(user_id)
                except Exception as e:
                    logger.error(f"[CELERY] Ошибка при трате ресурсов для пользователя {user_id}: {e}")
            
            return {
                "success": True,
                "image_url": cloud_url,
                "cloud_url": cloud_url,
                "filename": filename,
                "character": character_name,
                "task_id": task_id,
                "generation_time": round(generation_time, 2) if generation_time else None
            }

        result_dict = asyncio.run(run_generation_flow())
        return result_dict
            
    except Exception as exc:
        error_message = str(exc)
        exc_type = type(exc).__name__
        logger.error(f"[CELERY] Ошибка генерации изображения (task_id={task_id}): {error_message} (тип: {exc_type})")
        
        # Не повторяем задачу для ошибок загрузки в облако, конфигурации и ошибок API - это постоянные ошибки
        # Retry имеет смысл только для временных ошибок (сеть, таймауты)
        from botocore.exceptions import ClientError
        
        # Проверяем тип исключения и его сообщение
        is_permanent_error = False
        
        # Проверяем тип исключения
        try:
            from httpx import HTTPStatusError
            if isinstance(exc, HTTPStatusError):
                is_permanent_error = True
                # Для HTTPStatusError проверяем код статуса
                if hasattr(exc, 'response') and exc.response is not None:
                    status_code = exc.response.status_code
                    if status_code >= 400:  # 4xx и 5xx ошибки - постоянные
                        is_permanent_error = True
        except ImportError:
            pass
        
        # Проверяем сообщение об ошибке
        if not is_permanent_error:
            is_permanent_error = (
                isinstance(exc, ClientError) or
                "BadRequest" in error_message or
                "PutObject" in error_message or
                "YANDEX-KEY" in error_message or
                "недопустимое значение" in error_message or
                "500 Internal Server Error" in error_message or
                "Server error" in error_message or
                "HTTPStatusError" in exc_type
            )
        
        if is_permanent_error:
            # Формируем понятное сообщение об ошибке для пользователя
            user_friendly_error = error_message
            if "500 Internal Server Error" in error_message or "Server error" in error_message:
                user_friendly_error = "Ошибка сервера генерации изображений. Попробуйте позже."
            elif "BadRequest" in error_message:
                user_friendly_error = "Ошибка запроса к серверу генерации. Проверьте параметры."
            
            logger.error(f"[CELERY] Постоянная ошибка - не повторяем задачу. Ошибка: {error_message}")
            # Возвращаем ошибку без retry
            try:
                self.update_state(
                    state="FAILURE",
                    meta={
                        "status": f"Ошибка: {user_friendly_error}",
                        "progress": 0,
                        "error": user_friendly_error,
                        "error_type": exc_type,
                        "exc_type": exc_type,
                        "exc_message": error_message
                    }
                )
            except Exception as state_error:
                logger.error(f"[CELERY] Не удалось обновить статус задачи {task_id}: {state_error}")
            
            return {
                "success": False,
                "error": user_friendly_error,
                "error_type": exc_type,
                "task_id": task_id
            }
        
        # Для других ошибок (сеть, таймауты) - повторяем задачу
        if self.request.retries < self.max_retries:
            logger.warning(f"[CELERY] Повтор задачи {task_id} ({self.request.retries + 1}/{self.max_retries}): {error_message[:100]}")
            # Используем retry с передачей исключения для правильной сериализации
            raise self.retry(countdown=60, exc=exc)
        else:
            # Если превышен лимит попыток, обновляем состояние с ошибкой
            logger.error(f"[CELERY] Превышен лимит попыток для задачи {task_id}")
            try:
                # Только при финальной ошибке обновляем состояние с правильным форматом
                self.update_state(
                    state="FAILURE",
                    meta={
                        "status": f"Ошибка: {error_message}",
                        "progress": 0,
                        "error": error_message,
                        "error_type": exc_type,
                        "exc_type": exc_type,  # Явно указываем exc_type для правильной десериализации
                        "exc_message": error_message
                    }
                )
            except Exception as state_error:
                logger.error(f"[CELERY] Не удалось обновить статус задачи {task_id}: {state_error}")
            
            # Возвращаем ошибку в правильном формате
            return {
                "success": False,
                "error": error_message,
                "error_type": exc_type,
                "task_id": task_id
            }


async def _spend_photo_resources(user_id: int) -> None:
    """
    Списывает ресурсы за генерацию фото в зависимости от типа подписки.
    - FREE: списывает только лимит генераций (used_photos), БЕЗ списания монет
    - STANDARD/PREMIUM: списывает монеты (10 кредитов)
    """
    # Ленивый импорт
    from app.database.db import engine
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    
    # Создаем новую сессию БД для текущего event loop
    # Это необходимо, так как в Celery worker может быть другой event loop
    async_session_factory = async_sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    async with async_session_factory() as db_session:
        # Ленивый импорт
        from app.services.coins_service import CoinsService
        from app.services.profit_activate import ProfitActivateService
        
        coins_service = CoinsService(db_session)
        subscription_service = ProfitActivateService(db_session)
        
        try:
            # Получаем подписку пользователя для проверки типа
            subscription = await subscription_service.get_user_subscription(user_id)
            
            if not subscription:
                logger.error(f"[CELERY] Подписка не найдена для пользователя {user_id}")
                return
            
            subscription_type = subscription.subscription_type.value
            logger.info(f"[CELERY] Списание ресурсов для user_id={user_id}, subscription_type={subscription_type}")
            
            # Для FREE: списываем только лимит генераций, БЕЗ монет
            if subscription_type == "free":
                photo_spent = await subscription_service.use_photo_generation(user_id, commit=False)
                if not photo_spent:
                    logger.error(f"[CELERY] FREE: Недостаточно лимита генераций для пользователя {user_id}")
                    await db_session.rollback()
                    return
                logger.info(f"[CELERY] FREE: Списан лимит генераций для user_id={user_id} (монеты НЕ списаны)")
            
            # Для STANDARD/PREMIUM: списываем монеты
            else:
                coins_spent = await coins_service.spend_coins(user_id, 10, commit=False)
                if not coins_spent:
                    logger.error(f"[CELERY] {subscription_type.upper()}: Не удалось списать монеты для пользователя {user_id}")
                    await db_session.rollback()
                    return
                
                # Записываем историю баланса
                try:
                    from app.utils.balance_history import record_balance_change
                    await record_balance_change(
                        db=db_session,
                        user_id=user_id,
                        amount=-10,
                        reason=f"Генерация фото для персонажа (Celery)"
                    )
                except Exception as e:
                    logger.warning(f"Не удалось записать историю баланса: {e}")
                
                logger.info(f"[CELERY] {subscription_type.upper()}: Списано 10 монет для user_id={user_id}")
            
            await db_session.commit()
            
            # Инвалидируем кэш stats после изменения used_photos или coins
            from app.utils.redis_cache import cache_delete, key_subscription, key_subscription_stats
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
            
            logger.info(f"[CELERY] Ресурсы успешно списаны для user_id={user_id}")
        except Exception as exc:
            await db_session.rollback()
            logger.error(f"[CELERY] Ошибка списания ресурсов за генерацию фото: {exc}")
            raise


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name="app.tasks.generation_tasks.save_chat_history_task"
)
def save_chat_history_task(
    self,
    user_id: Optional[str],
    character_data: Dict[str, Any],
    message: str,
    response: str,
    image_url: Optional[str] = None,
    image_filename: Optional[str] = None
) -> Dict[str, Any]:
    """
    Задача Celery для сохранения истории чата в фоне.
    
    Args:
        self: Экземпляр задачи
        user_id: ID пользователя
        character_data: Данные персонажа
        message: Сообщение пользователя
        response: Ответ ассистента
        image_url: URL изображения (опционально)
        image_filename: Имя файла изображения (опционально)
        
    Returns:
        Dict с результатом сохранения
    """
    try:
        # Ленивый импорт - импортируем только при выполнении
        from app.main import _write_chat_history
        
        async def run_save():
            return await _write_chat_history(
                user_id=user_id,
                character_data=character_data,
                message=message,
                response=response,
                image_url=image_url,
                image_filename=image_filename
            )

        asyncio.run(run_save())
        return {"success": True, "message": "История чата сохранена"}
    except Exception as exc:
        logger.error(f"[CELERY] Ошибка сохранения истории чата: {exc}")
        return {"success": False, "error": str(exc)}


@celery_app.task(
    bind=True,
    base=CallbackTask,
    max_retries=3,
    default_retry_delay=10,
    name="app.tasks.generation_tasks.save_images_to_cloud_task"
)
def save_images_to_cloud_task(
    self,
    images_base64: List[str],
    seed: int = -1,
    character_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Фоновая задача для сохранения изображений в облако.
    Не блокирует основной процесс генерации.
    
    Args:
        images_base64: Список изображений в формате base64
        seed: Seed для генерации (для имени файла)
        character_name: Имя персонажа
    
    Returns:
        Dict с результатами сохранения
    """
    task_id = self.request.id
    logger.info(f"[CLOUD SAVE] Начинаем фоновое сохранение {len(images_base64)} изображений (task_id={task_id})")
    
    try:
        from app.services.yandex_storage import get_yandex_storage_service, transliterate_cyrillic_to_ascii
        
        # Получаем сервис
        service = get_yandex_storage_service()
        
        # Определяем папку
        folder = "generated_images"
        if character_name:
            character_name_ascii = transliterate_cyrillic_to_ascii(character_name)
            folder = f"generated_images/{character_name_ascii}"
        
        async def run_cloud_saves():
            cloud_urls = []
            for i, image_base64 in enumerate(images_base64):
                try:
                    # Декодируем base64
                    image_bytes = base64.b64decode(image_base64)
                    
                    # Формируем имя файла с расширением .webp
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"gen_{seed}_{i}_{timestamp}.webp"
                    object_key = f"{folder}/{filename}"
                    
                    # Загружаем в облако асинхронно (автоматически конвертируется в WebP)
                    cloud_url = await service.upload_file(
                        file_data=image_bytes,
                        object_key=object_key,
                        content_type='image/webp',
                        metadata={
                            "character_name": character_name_ascii if character_name else "unknown",
                            "character_original": character_name or "unknown",
                            "seed": str(seed),
                            "index": str(i),
                            "generated_at": datetime.now().isoformat(),
                            "source": "background_save"
                        },
                        convert_to_webp=True
                    )
                    
                    cloud_urls.append(cloud_url)
                    logger.info(f"[CLOUD SAVE] Изображение {i} сохранено: {cloud_url}")
                    
                except Exception as img_error:
                    logger.error(f"[CLOUD SAVE] Ошибка сохранения изображения {i}: {img_error}")
                    cloud_urls.append(None)
            return cloud_urls

        cloud_urls = asyncio.run(run_cloud_saves())
        
        logger.info(f"[CLOUD SAVE] Завершено. Успешно сохранено: {len([u for u in cloud_urls if u])}/{len(images_base64)}")
        
        return {
            "success": True,
            "cloud_urls": cloud_urls,
            "total": len(images_base64),
            "saved": len([u for u in cloud_urls if u])
        }
            
    except Exception as exc:
        logger.error(f"[CLOUD SAVE] Критическая ошибка: {exc}")
        import traceback
        logger.error(f"[CLOUD SAVE] Traceback: {traceback.format_exc()}")
        raise self.retry(exc=exc, countdown=10)

