"""
Тесты для генерации изображений через RunPod API.
Проверяет доступность моделей, успешную генерацию, обработку ошибок.
"""
import pytest
import httpx
import responses
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.runpod_client import (
    start_generation,
    check_status,
    generate_image_async,
    GenerationCancelledError,
    clean_prompt,
)


# ============================================================================
# Unit тесты
# ============================================================================

@pytest.mark.unit
def test_clean_prompt():
    """Тест очистки промпта от недопустимых символов."""
    # Промпт с управляющими символами
    dirty_prompt = "beautiful girl\x0C with\x00 flowers\x1F"
    clean = clean_prompt(dirty_prompt)
    
    assert "\x0C" not in clean
    assert "\x00" not in clean
    assert "\x1F" not in clean
    assert "beautiful girl" in clean
    assert "flowers" in clean


@pytest.mark.unit
def test_clean_prompt_unicode():
    """Тест очистки промпта от невидимых Unicode символов."""
    dirty_prompt = "test\u200Bprompt\uFEFF"
    clean = clean_prompt(dirty_prompt)
    
    assert "\u200B" not in clean
    assert "\uFEFF" not in clean
    assert "testprompt" in clean


# ============================================================================
# Integration тесты - RunPod API
# ============================================================================

@pytest.mark.integration
@pytest.mark.runpod
@pytest.mark.asyncio
async def test_runpod_model_1_availability():
    """
    Тест доступности первой модели RunPod (anime).
    Отправляет реальный запрос к RunPod API.
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    runpod_url = os.getenv("RUNPOD_URL")
    runpod_api_key = os.getenv("RUNPOD_API_KEY")
    
    if not runpod_url or not runpod_api_key:
        pytest.skip("RUNPOD_URL или RUNPOD_API_KEY не установлены")
    
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {runpod_api_key}",
            "Content-Type": "application/json"
        }
        
        # Простой тестовый запрос
        payload = {
            "input": {
                "prompt": "test",
                "width": 512,
                "height": 512,
                "steps": 1,
            }
        }
        
        try:
            response = await client.post(
                runpod_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            # Проверяем что API доступен (200 или 202)
            assert response.status_code in [200, 202], f"Модель 1 недоступна: {response.status_code}"
            
            result = response.json()
            assert "id" in result, "Ответ не содержит job ID"
            
            print(f"✓ Модель 1 (anime) доступна, job_id: {result['id']}")
            
        except httpx.HTTPError as e:
            pytest.fail(f"Ошибка подключения к модели 1: {e}")


@pytest.mark.integration
@pytest.mark.runpod
@pytest.mark.asyncio
async def test_runpod_model_2_availability():
    """
    Тест доступности второй модели RunPod (anime-realism).
    Отправляет реальный запрос к RunPod API.
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    runpod_url_2 = os.getenv("RUNPOD_URL_2")
    runpod_api_key = os.getenv("RUNPOD_API_KEY")
    
    if not runpod_url_2 or not runpod_api_key:
        pytest.skip("RUNPOD_URL_2 или RUNPOD_API_KEY не установлены")
    
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {runpod_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": {
                "prompt": "test",
                "width": 512,
                "height": 512,
                "steps": 1,
            }
        }
        
        try:
            response = await client.post(
                runpod_url_2,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            assert response.status_code in [200, 202], f"Модель 2 недоступна: {response.status_code}"
            
            result = response.json()
            assert "id" in result, "Ответ не содержит job ID"
            
            print(f"✓ Модель 2 (anime-realism) доступна, job_id: {result['id']}")
            
        except httpx.HTTPError as e:
            pytest.fail(f"Ошибка подключения к модели 2: {e}")


@pytest.mark.integration
@pytest.mark.runpod
@pytest.mark.slow
@pytest.mark.asyncio
async def test_successful_image_generation():
    """
    Тест успешной генерации изображения.
    ВНИМАНИЕ: Этот тест отправляет реальный запрос и может занять 20-60 секунд!
    """
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    if not os.getenv("RUNPOD_API_KEY"):
        pytest.skip("RUNPOD_API_KEY не установлен")
    
    try:
        # Генерируем изображение с минимальными параметрами
        image_url = await generate_image_async(
            user_prompt="simple test image",
            width=512,
            height=512,
            steps=10,  # Минимум шагов для ускорения
            model="anime-realism",
            timeout=120,  # 2 минуты
        )
        
        # Проверяем что получили URL
        assert image_url is not None
        assert isinstance(image_url, str)
        assert len(image_url) > 0
        assert image_url.startswith("http"), f"Неверный формат URL: {image_url}"
        
        print(f"✓ Изображение успешно сгенерировано: {image_url}")
        
    except TimeoutError:
        pytest.fail("Генерация превысила таймаут")
    except Exception as e:
        pytest.fail(f"Ошибка генерации: {e}")


# ============================================================================
# Unit тесты с моками
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_start_generation_success(mock_runpod_response):
    """Тест успешного запуска генерации с моком."""
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.POST,
            "https://api.runpod.ai/v2/test/run",
            json={"id": "test-job-123"},
            status=200
        )
        
        async with httpx.AsyncClient() as client:
            with patch.dict('os.environ', {
                'RUNPOD_API_KEY': 'test-key',
                'RUNPOD_URL_2': 'https://api.runpod.ai/v2/test/run'
            }):
                # Перезагружаем модуль для применения новых env переменных
                import importlib
                import app.services.runpod_client as runpod_module
                importlib.reload(runpod_module)
                
                job_id, base_url = await runpod_module.start_generation(
                    client=client,
                    user_prompt="test prompt",
                    model="anime-realism"
                )
                
                assert job_id == "test-job-123"
                assert base_url is not None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_generation_timeout():
    """Тест обработки таймаута генерации."""
    with patch('app.services.runpod_client.start_generation') as mock_start:
        with patch('app.services.runpod_client.check_status') as mock_status:
            # Мок возвращает job_id
            mock_start.return_value = ("test-job-123", "https://api.runpod.ai/v2/test")
            
            # Мок всегда возвращает IN_PROGRESS
            mock_status.return_value = {"status": "IN_PROGRESS"}
            
            with pytest.raises(TimeoutError):
                await generate_image_async(
                    user_prompt="test",
                    timeout=1  # 1 секунда - гарантированный таймаут
                )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_generation_failed_status():
    """Тест обработки статуса FAILED."""
    with patch('app.services.runpod_client.start_generation') as mock_start:
        with patch('app.services.runpod_client.check_status') as mock_status:
            mock_start.return_value = ("test-job-123", "https://api.runpod.ai/v2/test")
            
            # Мок возвращает FAILED
            mock_status.return_value = {
                "status": "FAILED",
                "error": "Out of memory"
            }
            
            with pytest.raises(RuntimeError, match="Out of memory"):
                await generate_image_async(
                    user_prompt="test",
                    timeout=10
                )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_generation_cancelled():
    """Тест обработки отмененной генерации."""
    with patch('app.services.runpod_client.start_generation') as mock_start:
        with patch('app.services.runpod_client.check_status') as mock_status:
            mock_start.return_value = ("test-job-123", "https://api.runpod.ai/v2/test")
            
            # Мок возвращает CANCELLED
            mock_status.return_value = {"status": "CANCELLED"}
            
            with pytest.raises(GenerationCancelledError):
                await generate_image_async(
                    user_prompt="test",
                    timeout=10
                )


@pytest.mark.unit
@pytest.mark.asyncio
async def test_generation_completed_with_url():
    """Тест успешной генерации с получением URL."""
    with patch('app.services.runpod_client.start_generation') as mock_start:
        with patch('app.services.runpod_client.check_status') as mock_status:
            mock_start.return_value = ("test-job-123", "https://api.runpod.ai/v2/test")
            
            # Мок возвращает COMPLETED с URL
            mock_status.return_value = {
                "status": "COMPLETED",
                "output": {
                    "image_url": "https://storage.example.com/test-image.png",
                    "seed": 12345
                }
            }
            
            result = await generate_image_async(
                user_prompt="test",
                timeout=10
            )
            
            assert result == "https://storage.example.com/test-image.png"


@pytest.mark.unit
def test_missing_api_key():
    """Тест обработки отсутствующего API ключа."""
    with patch.dict('os.environ', {}, clear=True):
        # Перезагружаем модуль
        import importlib
        import app.services.runpod_client as runpod_module
        importlib.reload(runpod_module)
        
        with pytest.raises(ValueError, match="RUNPOD_API_KEY"):
            async def test():
                async with httpx.AsyncClient() as client:
                    await runpod_module.start_generation(
                        client=client,
                        user_prompt="test",
                        model="anime"
                    )
            
            import asyncio
            asyncio.run(test())


# ============================================================================
# Тесты retry логики
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_retry_on_network_error():
    """Тест повторной попытки при сетевой ошибке."""
    with patch('app.services.runpod_client.start_generation') as mock_start:
        with patch('app.services.runpod_client.check_status') as mock_status:
            mock_start.return_value = ("test-job-123", "https://api.runpod.ai/v2/test")
            
            # Первые 2 вызова - ошибка, третий - успех
            mock_status.side_effect = [
                httpx.RequestError("Network error"),
                httpx.RequestError("Network error"),
                {
                    "status": "COMPLETED",
                    "output": {"image_url": "https://test.com/image.png"}
                }
            ]
            
            result = await generate_image_async(
                user_prompt="test",
                timeout=30
            )
            
            assert result == "https://test.com/image.png"
            # Проверяем что было 3 попытки
            assert mock_status.call_count == 3
