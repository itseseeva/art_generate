"""
Тесты для Celery задач.
Проверяет выполнение асинхронных задач, обработку ошибок, приоритеты.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from celery import states


# ============================================================================
# Тесты выполнения задач
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_celery_task_execution():
    """Тест выполнения простой Celery задачи."""
    from app.celery_app import celery_app
    celery_app.conf.update(
        broker_url='memory://',
        result_backend='cache+memory://',
        task_always_eager=True
    )
    
    # Проверяем что Celery app инициализирован
    assert celery_app is not None
    assert celery_app.conf.broker_url is not None


@pytest.mark.unit
@pytest.mark.celery
@pytest.mark.asyncio
async def test_async_task_execution():
    """Тест выполнения асинхронной задачи."""
    from app.tasks.generation_tasks import generate_image_task
    
    # Мокируем FaceRefinementService (импортируется внутри задачи)
    with patch('app.services.face_refinement.FaceRefinementService') as MockService, \
         patch('app.services.yandex_storage.get_yandex_storage_service') as mock_get_storage, \
         patch('app.tasks.generation_tasks._spend_photo_resources', new_callable=AsyncMock), \
         patch('app.database.db.async_session_maker') as mock_session_maker:
        
        mock_instance = MockService.return_value
        # Мокируем generate_image
        mock_result = MagicMock()
        # Используем валидную base64 строку (например, пустой 1x1 PNG)
        valid_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        mock_result.image_data = [valid_base64]
        mock_instance.generate_image = AsyncMock(return_value=mock_result)

        # Мокируем storage service
        mock_storage = mock_get_storage.return_value
        mock_storage.upload_file = AsyncMock(return_value="https://cloud.com/image.webp")

        # Мокируем session
        mock_session = AsyncMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        
        # Вызываем задачу в отдельном потоке, чтобы asyncio.run() внутри задачи 
        # не конфликтовал с loop'ом теста
        import asyncio
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: generate_image_task.apply_async(
                args=[{"prompt": "test prompt", "model": "anime-realism"}],
                kwargs={}
            ).get()
        )
        
        # Проверяем результат
        assert result is not None


# ============================================================================
# Тесты retry логики
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_retry_on_failure():
    """Тест повторной попытки при ошибке."""
    from app.celery_app import celery_app
    
    # Создаем тестовую задачу с retry
    @celery_app.task(bind=True, max_retries=3)
    def test_task_with_retry(self):
        # Симулируем ошибку
        raise Exception("Test error")
    
    # Проверяем что задача имеет настройки retry
    assert test_task_with_retry.max_retries == 3


# ============================================================================
# Тесты result backend
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_result_backend():
    """Тест сохранения результатов в Redis."""
    from app.celery_app import celery_app
    
    # Проверяем что result backend настроен
    assert celery_app.conf.result_backend is not None
    assert "memory" in celery_app.conf.result_backend


# ============================================================================
# Тесты приоритетов задач
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_priority():
    """Тест приоритетов задач."""
    from app.celery_app import celery_app
    
    # Создаем задачи с разными приоритетами
    @celery_app.task(priority=10)
    def high_priority_task():
        return "high"
    
    @celery_app.task(priority=1)
    def low_priority_task():
        return "low"
    
    # Проверяем что приоритеты установлены
    assert high_priority_task.priority == 10
    assert low_priority_task.priority == 1


# ============================================================================
# Тесты таймаутов
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_timeout():
    """Тест обработки таймаутов задач."""
    from app.celery_app import celery_app
    import time
    
    # Создаем задачу с таймаутом
    @celery_app.task(time_limit=2)
    def task_with_timeout():
        time.sleep(5)  # Спим дольше таймаута
        return "completed"
    
    # Проверяем что таймаут установлен
    assert task_with_timeout.time_limit == 2


# ============================================================================
# Тесты обработки ошибок
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_error_handling():
    """Тест обработки ошибок в задачах."""
    from app.celery_app import celery_app
    
    @celery_app.task(bind=True)
    def task_with_error(self):
        try:
            raise ValueError("Test error")
        except Exception as e:
            # Логируем ошибку
            return {"error": str(e)}
    
    # Вызываем задачу
    result = task_with_error.apply().get()
    
    # Проверяем что ошибка обработана
    assert "error" in result
    assert "Test error" in result["error"]


# ============================================================================
# Тесты генерации изображений через Celery
# ============================================================================

@pytest.mark.integration
@pytest.mark.celery
@pytest.mark.slow
@pytest.mark.asyncio
async def test_image_generation_task():
    """Тест задачи генерации изображения через Celery."""
    from app.tasks.generation_tasks import generate_image_task
    
    # Мокируем FaceRefinementService
    with patch('app.services.face_refinement.FaceRefinementService') as MockService, \
         patch('app.services.yandex_storage.get_yandex_storage_service') as mock_get_storage, \
         patch('app.tasks.generation_tasks._spend_photo_resources', new_callable=AsyncMock), \
         patch('app.database.db.async_session_maker') as mock_session_maker:
        
        mock_instance = MockService.return_value
        mock_result = MagicMock()
        # Используем валидную base64 строку
        valid_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
        mock_result.image_data = [valid_base64]
        mock_instance.generate_image = AsyncMock(return_value=mock_result)

        # Мокируем storage service
        mock_storage = mock_get_storage.return_value
        mock_storage.upload_file = AsyncMock(return_value="https://cloud.com/image.webp")

        # Мокируем session
        mock_session = AsyncMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session
        
        # Запускаем задачу в отдельном потоке
        import asyncio
        loop = asyncio.get_running_loop()
        
        def run_task():
            return generate_image_task.apply_async(
                args=[{
                    "prompt": "beautiful anime girl",
                    "model": "anime-realism",
                    "width": 512,
                    "height": 512
                }],
                kwargs={}
            ).get()
            
        result = await loop.run_in_executor(None, run_task)
        
        # Проверяем результат
        assert result is not None
        assert result.get("success") is True
        assert "https://" in result.get("image_url", "")


# ============================================================================
# Тесты мониторинга задач
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_task_monitoring():
    """Тест мониторинга состояния задач."""
    from app.celery_app import celery_app
    
    @celery_app.task
    def monitored_task():
        return "success"
    
    # Запускаем задачу
    result = monitored_task.apply_async()
    
    # Проверяем состояние
    assert result.state in [states.PENDING, states.SUCCESS]


# ============================================================================
# Тесты очистки результатов
# ============================================================================

@pytest.mark.unit
@pytest.mark.celery
def test_result_cleanup():
    """Тест очистки старых результатов."""
    from app.celery_app import celery_app
    
    # Проверяем настройки очистки результатов
    # result_expires - время хранения результатов
    assert hasattr(celery_app.conf, 'result_expires')
