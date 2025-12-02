"""
Исправленный сервис для улучшения лиц на сгенерированных изображениях
Устранена проблема дублирования изображений
"""
import httpx
import json
import base64
from io import BytesIO
from PIL import Image
import time
from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
from datetime import datetime
import traceback
from typing import Dict, Any, Optional
import logging
import os
from app.utils.generation_logger import GenerationLogger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.schemas.generation import GenerationSettings, GenerationResponse, FaceRefinementSettings
import sys
from pathlib import Path

# Добавляем корень проекта в путь для импорта
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.config.generation_defaults import get_generation_params
from app.config.default_prompts import get_default_positive_prompts, get_default_negative_prompts
from app.utils.generation_stats import generation_stats
from app.utils.memory_utils import get_memory_usage, unload_sd_memory, clear_gpu_memory, fix_device_conflict

logger = logging.getLogger(__name__)


class FaceRefinementService:
    """Исправленный сервис для улучшения лиц на изображениях"""
    
    def __init__(self, api_url: str):
        """
        :param api_url: URL Stable Diffusion WebUI API
        """
        self.api_url = api_url
        self.output_dir = "outputs/generated"
        os.makedirs(self.output_dir, exist_ok=True)
        # Увеличиваем таймаут до 5 минут
        self.client = httpx.AsyncClient(timeout=300.0)
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 минут
        self.generation_logger = GenerationLogger()
        
        # НОВОЕ: Добавляем счетчик запросов для отладки
        self._request_counter = 0

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def _make_api_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """ИСПРАВЛЕННЫЙ: Выполняет запрос к API с детальным логированием"""
        
        # НОВОЕ: Увеличиваем счетчик запросов
        self._request_counter += 1
        request_id = self._request_counter
        
        logger.info(f"[REQUEST-{request_id}] =========================")
        logger.info(f"[REQUEST-{request_id}] Начинаем API запрос")
        
        try:
            # ИСПРАВЛЕНО: Проверяем критические параметры ПЕРЕД отправкой
            logger.info(f"[REQUEST-{request_id}] КРИТИЧЕСКИЕ ПАРАМЕТРЫ:")
            logger.info(f"[REQUEST-{request_id}] - n_samples: {payload.get('n_samples', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"[REQUEST-{request_id}] - batch_size: {payload.get('batch_size', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"[REQUEST-{request_id}] - n_iter: {payload.get('n_iter', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"[REQUEST-{request_id}] - steps: {payload.get('steps', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"[REQUEST-{request_id}] - sampler_name: {payload.get('sampler_name', 'НЕ УСТАНОВЛЕН')}")
            
            # ИСПРАВЛЕНО: Принудительно устанавливаем правильные значения
            payload["n_samples"] = 1  # ПРИНУДИТЕЛЬНО ТОЛЬКО ОДНО ИЗОБРАЖЕНИЕ
            payload["batch_size"] = 1  # ПРИНУДИТЕЛЬНО ОДИН БАТЧ
            payload["n_iter"] = 1      # ПРИНУДИТЕЛЬНО ОДНА ИТЕРАЦИЯ
            
            logger.info(f"[REQUEST-{request_id}] ПОСЛЕ ПРИНУДИТЕЛЬНОЙ УСТАНОВКИ:")
            logger.info(f"[REQUEST-{request_id}] - n_samples: {payload['n_samples']}")
            logger.info(f"[REQUEST-{request_id}] - batch_size: {payload['batch_size']}")
            logger.info(f"[REQUEST-{request_id}] - n_iter: {payload['n_iter']}")
            
            # НОВОЕ: Детальное логирование ADetailer
            if "alwayson_scripts" in payload and "ADetailer" in payload["alwayson_scripts"]:
                adetailer_config = payload["alwayson_scripts"]["ADetailer"]
                logger.info(f"[REQUEST-{request_id}] ADETAILER КОНФИГУРАЦИЯ:")
                adetailer_args = adetailer_config.get('args', [])
                if len(adetailer_args) > 0:
                    logger.info(f"[REQUEST-{request_id}] - Включен: {adetailer_args[0]}")
                    if len(adetailer_args) > 1 and isinstance(adetailer_args[1], dict):
                        adetailer_settings = adetailer_args[1]
                        logger.info(f"[REQUEST-{request_id}] - Модель: {adetailer_settings.get('ad_model', 'НЕ УСТАНОВЛЕНА')}")
                        logger.info(f"[REQUEST-{request_id}] - Шаги: {adetailer_settings.get('ad_steps', 'НЕ УСТАНОВЛЕНЫ')}")
                        logger.info(f"[REQUEST-{request_id}] - CFG: {adetailer_settings.get('ad_cfg_scale', 'НЕ УСТАНОВЛЕН')}")
                    else:
                        logger.warning(f"[REQUEST-{request_id}] - Неправильная структура ADetailer args: {adetailer_args}")
                else:
                    logger.warning(f"[REQUEST-{request_id}] - ADetailer args пустой")
            
            # ИСПРАВЛЕНО: Удаляем потенциально проблемные параметры
            problematic_params = ['images', 'init_images', 'mask']
            for param in problematic_params:
                if param in payload:
                    logger.warning(f"[REQUEST-{request_id}] Удаляем проблемный параметр: {param}")
                    del payload[param]
            
            # НОВОЕ: Валидация ADetailer конфигурации
            if "alwayson_scripts" in payload and "ADetailer" in payload["alwayson_scripts"]:
                adetailer_config = payload["alwayson_scripts"]["ADetailer"]
                adetailer_args = adetailer_config.get("args", [])
                
                # Проверяем, что первый элемент - boolean (включение/выключение)
                if len(adetailer_args) == 0:
                    logger.warning(f"[REQUEST-{request_id}] ADetailer args пустой, отключаем")
                    del payload["alwayson_scripts"]["ADetailer"]
                elif not isinstance(adetailer_args[0], bool):
                    logger.warning(f"[REQUEST-{request_id}] Первый элемент ADetailer args не boolean: {type(adetailer_args[0])}, исправляем")
                    adetailer_args[0] = True
                    payload["alwayson_scripts"]["ADetailer"]["args"] = adetailer_args
                elif not adetailer_args[0]:
                    logger.info(f"[REQUEST-{request_id}] ADetailer отключен, удаляем из payload")
                    del payload["alwayson_scripts"]["ADetailer"]
                else:
                    logger.info(f"[REQUEST-{request_id}] ADetailer включен, конфигурация валидна")
            
            # Отправляем запрос с временными метками
            import time
            start_time = time.time()
            logger.info(f"[REQUEST-{request_id}] Отправляем HTTP запрос к {self.api_url}/sdapi/v1/txt2img")
            logger.info(f"[REQUEST-{request_id}] Время начала: {start_time}")
            
            # НОВОЕ: Детальное логирование payload для диагностики 422 ошибки
            logger.info(f"[REQUEST-{request_id}] ПОЛНЫЙ PAYLOAD:")
            logger.info(f"[REQUEST-{request_id}] {json.dumps(payload, indent=2, ensure_ascii=False)}")
            
            response = await self.client.post(
                f"{self.api_url}/sdapi/v1/txt2img",
                json=payload
            )
            
            request_time = time.time()
            logger.info(f"[REQUEST-{request_id}] Время завершения запроса: {request_time}")
            logger.info(f"[REQUEST-{request_id}] Время запроса: {request_time - start_time:.2f} сек")
            
            # НОВОЕ: Детальное логирование ошибок 422
            if response.status_code == 422:
                logger.error(f"[REQUEST-{request_id}] [ERROR] ОШИБКА 422: Unprocessable Entity")
                try:
                    error_response = response.json()
                    logger.error(f"[REQUEST-{request_id}] Ответ сервера: {json.dumps(error_response, indent=2, ensure_ascii=False)}")
                except:
                    logger.error(f"[REQUEST-{request_id}] Не удалось распарсить JSON ответ: {response.text}")
            
            response.raise_for_status()
            
            # Получаем ответ API
            response_data = response.json()
            
            # НОВОЕ: Детальный анализ ответа
            images_count = len(response_data.get('images', []))
            logger.info(f"[REQUEST-{request_id}] ОТВЕТ API:")
            logger.info(f"[REQUEST-{request_id}] - Получено изображений: {images_count}")
            logger.info(f"[REQUEST-{request_id}] - Ожидалось изображений: 1")
            
            if images_count != 1:
                logger.error(f"[REQUEST-{request_id}] [ERROR] ПРОБЛЕМА: Получено {images_count} изображений вместо 1!")
                # Логируем info для анализа
                info = response_data.get('info', '{}')
                logger.error(f"[REQUEST-{request_id}] Info из ответа: {info}")
            else:
                logger.info(f"[REQUEST-{request_id}] [OK] Получено корректное количество изображений")
            
            logger.info(f"[REQUEST-{request_id}] =========================")
            return response_data
            
        except httpx.TimeoutException as e:
            logger.warning(f"[REQUEST-{request_id}] Timeout occurred, retrying... Error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"[REQUEST-{request_id}] API request failed: {str(e)}")
            raise

    def _prepare_payload(self, settings: GenerationSettings) -> Dict[str, Any]:
        """
        ИСПРАВЛЕННАЯ: Подготовка параметров запроса с предотвращением дублирования
        """
        logger.info("=== ИСПРАВЛЕННАЯ ПОДГОТОВКА PAYLOAD ===")
        
        # ИСПРАВЛЕНО: Создаем чистую копию базовых настроек
        payload = {}
        
        # Добавляем ВСЕ параметры из настроек по умолчанию
        essential_params = [
            'sampler_name', 'scheduler', 'steps', 'width', 'height', 'cfg_scale',
            'restore_faces', 'enable_hr', 'denoising_strength', 'hr_scale', 
            'hr_upscaler', 'hr_second_pass_steps', 'override_settings',
            'override_settings_restore_afterwards', 'send_images', 'save_images',
            'clip_skip', 'seed', 'eta_noise_seed_delta', 'alwayson_scripts', 
            'lora_models', 'script_args', 'hr_prompt', 'hr_negative_prompt'
        ]
        
        # Получаем настройки по умолчанию
        default_params = get_generation_params("default")
        
        for param in essential_params:
            if param in default_params:
                payload[param] = default_params[param]
        
        logger.info(f"Базовые параметры добавлены: {list(payload.keys())}")
        
        # Детальное логирование важных параметров
        logger.info("=== ДЕТАЛЬНАЯ ПРОВЕРКА НАСТРОЕК ===")
        logger.info(f"Steps: {payload.get('steps', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"CFG Scale: {payload.get('cfg_scale', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"Sampler: {payload.get('sampler_name', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"Hires.fix включен: {'Да' if payload.get('enable_hr', False) else 'Нет'}")
        if payload.get('enable_hr', False):
            logger.info(f"Hires.fix scale: {payload.get('hr_scale', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"Hires.fix upscaler: {payload.get('hr_upscaler', 'НЕ УСТАНОВЛЕН')}")
            logger.info(f"Hires.fix steps: {payload.get('hr_second_pass_steps', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"ENSD: {payload.get('eta_noise_seed_delta', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"Denoising strength: {payload.get('denoising_strength', 'НЕ УСТАНОВЛЕН')}")
        logger.info(f"VAE: {'Отключен' if payload.get('override_settings', {}).get('sd_vae') is None else 'Включен'}")
        logger.info(f"ADetailer включен: {'Да' if 'alwayson_scripts' in payload and 'ADetailer' in payload['alwayson_scripts'] else 'Нет'}")
        logger.info(f"LoRA модели: {'Да' if 'lora_models' in payload else 'Нет'}")
        if 'lora_models' in payload:
            logger.info("=== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ LoRA ===")
            if isinstance(payload['lora_models'], list):
                for i, lora_config in enumerate(payload['lora_models']):
                    logger.info(f"LoRA {i+1}: {lora_config.get('name', 'НЕ УСТАНОВЛЕН')}")
                    logger.info(f"  - weight: {lora_config.get('weight', 'НЕ УСТАНОВЛЕН')}")
            else:
                logger.info(f"LoRA формат неправильный: {type(payload['lora_models'])}")
            logger.info("=================================")
        if 'alwayson_scripts' in payload and 'ADetailer' in payload['alwayson_scripts']:
            adetailer_args = payload['alwayson_scripts']['ADetailer']['args']
            logger.info("=== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ADETAILER ===")
            logger.info(f"ADetailer args count: {len(adetailer_args)}")
            logger.info(f"ADetailer args: {adetailer_args}")
            
            if len(adetailer_args) > 0:
                logger.info(f"ADetailer включен: {adetailer_args[0]}")
                
                # Проверяем конфигурации лиц и рук
                for i, arg in enumerate(adetailer_args[1:], 1):
                    if isinstance(arg, dict):
                        logger.info(f"ADetailer config {i}:")
                        logger.info(f"  - model: {arg.get('ad_model', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - prompt: {arg.get('ad_prompt', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - negative prompt: {arg.get('ad_negative_prompt', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - steps: {arg.get('ad_steps', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - CFG: {arg.get('ad_cfg_scale', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - sampler: {arg.get('ad_sampler_name', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - denoising: {arg.get('ad_denoising_strength', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - confidence: {arg.get('ad_confidence', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - use_steps: {arg.get('ad_use_steps', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - use_cfg_scale: {arg.get('ad_use_cfg_scale', 'НЕ УСТАНОВЛЕН')}")
                        logger.info(f"  - use_sampler: {arg.get('ad_use_sampler', 'НЕ УСТАНОВЛЕН')}")
                    else:
                        logger.warning(f"ADetailer config {i} не является словарем: {type(arg)}")
            else:
                logger.warning("ADetailer: args пустой")
            logger.info("==========================================")
        logger.info("=====================================")
        
        # КРИТИЧЕСКИ ВАЖНО: Устанавливаем параметры для одного изображения
        payload.update({
            "n_samples": 1,     # ТОЛЬКО ОДНО ИЗОБРАЖЕНИЕ
            "batch_size": 1,    # ТОЛЬКО ОДИН БАТЧ  
            "n_iter": 1,        # ТОЛЬКО ОДНА ИТЕРАЦИЯ
            "save_grid": False, # НЕ СОХРАНЯТЬ СЕТКУ
        })
        
        logger.info("КРИТИЧЕСКИЕ параметры установлены:")
        logger.info(f"  n_samples: {payload['n_samples']}")
        logger.info(f"  batch_size: {payload['batch_size']}")
        logger.info(f"  n_iter: {payload['n_iter']}")
        logger.info(f"  save_grid: {payload['save_grid']}")
        
        # Обновляем пользовательскими настройками (НО НЕ КРИТИЧЕСКИМИ)
        # Используем только те значения из settings, которые не None
        settings_dict = settings.dict()
        safe_settings = {}
        for k, v in settings_dict.items():
            if k not in ['n_samples', 'batch_size', 'n_iter', 'save_grid']:
                safe_settings[k] = v
        
        # ИСПРАВЛЕНО: Обновляем параметры из settings, включая критические
        # Теперь пользовательские настройки имеют приоритет над конфигурацией
        for k, v in safe_settings.items():
            if v is not None:  # Обновляем только если значение не None
                payload[k] = v
                logger.info(f"✅ Обновляем параметр {k}={v}")
            elif k in payload:  # Обновляем только существующие параметры
                payload[k] = v
            else:
                payload[k] = v  # Добавляем новые параметры
        
        # ДЕТАЛЬНАЯ ОТЛАДКА ПАРАМЕТРОВ
        logger.info("=== ОТЛАДКА ПАРАМЕТРОВ ===")
        logger.info(f"🔍 DEFAULT_GENERATION_PARAMS['steps']: {DEFAULT_GENERATION_PARAMS.get('steps')}")
        logger.info(f"🔍 settings.steps: {getattr(settings, 'steps', 'НЕТ')}")
        logger.info(f"🔍 payload['steps']: {payload.get('steps')}")
        logger.info("==========================")
        
        logger.info(f"Пользовательские настройки добавлены: {list(safe_settings.keys())}")
        
        # ADetailer уже включен через essential_params
        logger.info("ADetailer и LoRA модели включены через essential_params")
        
        critical_check = {
            "n_samples": payload.get("n_samples"),
            "batch_size": payload.get("batch_size"), 
            "n_iter": payload.get("n_iter"),
            "save_grid": payload.get("save_grid")
        }
        logger.info(f"ФИНАЛЬНАЯ ПРОВЕРКА критических параметров: {critical_check}")
        
        # Проверяем на правильность
        if payload.get("n_samples") != 1:
            logger.error(f"[ERROR] ОШИБКА: n_samples = {payload.get('n_samples')}, должно быть 1!")
            payload["n_samples"] = 1
            
        if payload.get("batch_size") != 1:
            logger.error(f"[ERROR] ОШИБКА: batch_size = {payload.get('batch_size')}, должно быть 1!")
            payload["batch_size"] = 1
            
        if payload.get("n_iter") != 1:
            logger.error(f"[ERROR] ОШИБКА: n_iter = {payload.get('n_iter')}, должно быть 1!")
            payload["n_iter"] = 1
        
        # IP-Adapter удален - используем только ADetailer
        
        logger.info("ФИНАЛЬНЫЙ PAYLOAD готов")
        logger.info("=====================================")
        
        return payload

    async def generate_image(self, settings: GenerationSettings, full_settings_for_logging: dict = None) -> GenerationResponse:
        """ИСПРАВЛЕННАЯ: Генерация изображения с предотвращением дублирования"""
        start_time = time.time()
        logger.info("🎯 НАЧИНАЕМ ГЕНЕРАЦИЮ ИЗОБРАЖЕНИЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)")
        
        # Логируем информацию о модели
        try:
            import sys
            from pathlib import Path
            webui_path = Path(__file__).parent.parent.parent / "stable-diffusion-webui"
            if webui_path.exists():
                sys.path.insert(0, str(webui_path))
                from model_config import get_model_info
                model_info = get_model_info()
                if model_info:
                    logger.info(f"🤖 Используемая модель: {model_info['name']} ({model_info['size_mb']} MB)")
                    if model_info["vae_name"]:
                        logger.info(f"🎨 VAE: {model_info['vae_name']}")
                    else:
                        logger.info("🎨 VAE: Встроенный")
                else:
                    logger.warning("[WARNING] Информация о модели недоступна")
        except ImportError:
            # Модуль model_config не найден - это нормально
            pass
        except Exception as e:
            logger.warning(f"[WARNING] Не удалось получить информацию о модели: {e}")
        
        try:
            # Сохраняем оригинальные промпты пользователя для логирования
            original_prompt = settings.prompt
            original_negative_prompt = settings.negative_prompt
            
            # Добавляем дефолтные промпты если нужно
            if settings.use_default_prompts:
                logger.info("Добавляем дефолтные промпты")
                from app.config.default_prompts import get_enhanced_prompts
                
                enhanced_positive, enhanced_negative = get_enhanced_prompts(
                    settings.prompt, 
                    use_defaults=True
                )
                settings.prompt = enhanced_positive
                settings.negative_prompt = enhanced_negative

            # ИСПРАВЛЕНО: Подготавливаем payload с проверками
            payload = self._prepare_payload(settings)
            logger.info("[OK] Payload подготовлен")
            
            # ИСПРАВЛЕНО: Сохраняем payload для логирования
            self._last_payload = payload
            
            # НОВОЕ: Дополнительная проверка перед отправкой
            if payload.get("n_samples") != 1:
                logger.error(f"[ERROR] КРИТИЧЕСКАЯ ОШИБКА: n_samples = {payload.get('n_samples')}")
                raise ValueError(f"Неправильное значение n_samples: {payload.get('n_samples')}")
            
            # Выполняем запрос к API
            api_response = await self._make_api_request(payload)
            logger.info("[OK] API запрос выполнен")
            
            # НОВОЕ: Проверяем количество изображений в ответе
            received_images = len(api_response.get("images", []))
            if received_images != 1:
                # ИСПРАВЛЕНИЕ: Если получили больше одного изображения, берем только первое
                if received_images > 1:
                    logger.warning("🔧 ИСПРАВЛЯЕМ: Берем только первое изображение")
                    api_response["images"] = [api_response["images"][0]]
                    logger.info("[OK] Оставлено только одно изображение")
            
            # Создаем ответ
            result = GenerationResponse.from_api_response(api_response)
            logger.info("[OK] GenerationResponse создан")
            
            # Записываем статистику
            execution_time = time.time() - start_time
            self._save_generation_stats(settings, api_response, execution_time)
            logger.info(f"[OK] Генерация завершена за {execution_time:.2f} секунд")

            # ОПТИМИЗАЦИЯ: Убрано unload_sd_memory() - замедляет ответ на 2-3 секунды
            # GPU память очищается автоматически между генерациями
            
            # Логируем генерацию
            execution_time = time.time() - start_time
            # ИСПРАВЛЕНО: Всегда используем payload для логирования, так как он содержит правильные значения
            settings_for_logging = getattr(self, '_last_payload', {})
            logger.info(f"🔍 ЛОГИРОВАНИЕ: Используем payload с steps={settings_for_logging.get('steps', 'НЕ НАЙДЕН')}, cfg_scale={settings_for_logging.get('cfg_scale', 'НЕ НАЙДЕН')}")
            # Получаем улучшенные промпты для логирования
            enhanced_prompt = settings_for_logging.get('prompt', settings.prompt)
            enhanced_negative_prompt = settings_for_logging.get('negative_prompt', settings.negative_prompt)
            
            self.generation_logger.log_generation(
                prompt=original_prompt,  # Оригинальный промпт пользователя
                negative_prompt=original_negative_prompt,  # Оригинальный негативный промпт
                character=getattr(settings, 'character', 'unknown'),
                settings=settings_for_logging,
                generation_time=execution_time,
                image_url=result.image_urls[0] if hasattr(result, 'image_urls') and result.image_urls else "",
                success=True,
                enhanced_prompt=enhanced_prompt,  # Улучшенный промпт с дефолтными
                enhanced_negative_prompt=enhanced_negative_prompt  # Улучшенный негативный промпт
            )
            
            return result
            
        except Exception as e:
            logger.error(f"[ERROR] Ошибка в generate_image: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Логируем ошибку генерации
            execution_time = time.time() - start_time
            # ИСПРАВЛЕНО: Всегда используем payload для логирования, так как он содержит правильные значения
            settings_for_logging = getattr(self, '_last_payload', {})
            logger.info(f"🔍 ЛОГИРОВАНИЕ ОШИБКИ: Используем payload с steps={settings_for_logging.get('steps', 'НЕ НАЙДЕН')}, cfg_scale={settings_for_logging.get('cfg_scale', 'НЕ НАЙДЕН')}")
            # Получаем улучшенные промпты для логирования ошибки
            enhanced_prompt = settings_for_logging.get('prompt', settings.prompt)
            enhanced_negative_prompt = settings_for_logging.get('negative_prompt', settings.negative_prompt)
            
            self.generation_logger.log_generation(
                prompt=original_prompt,  # Оригинальный промпт пользователя
                negative_prompt=original_negative_prompt,  # Оригинальный негативный промпт
                character=getattr(settings, 'character', 'unknown'),
                settings=settings_for_logging,
                generation_time=execution_time,
                image_url="",
                success=False,
                error=str(e),
                enhanced_prompt=enhanced_prompt,  # Улучшенный промпт с дефолтными
                enhanced_negative_prompt=enhanced_negative_prompt  # Улучшенный негативный промпт
            )
            
            raise
        finally:
            # Очищаем память в любом случае
            await unload_sd_memory(self.api_url)

    def _save_generation_stats(self, settings: GenerationSettings, result: Dict[str, Any], execution_time: float) -> None:
        """Сохранение статистики генерации (без изменений)"""
        try:
            settings_dict = settings.dict()
            
            # Получаем информацию из результата
            info = result.get("info", {})
            if isinstance(info, str):
                try:
                    import json
                    info = json.loads(info)
                except:
                    info = {}
            
            # Обеспечиваем наличие ключей для статистики
            settings_dict["sampler_name"] = settings.sampler_name or info.get("sampler_name", "unknown")
            settings_dict["steps"] = settings.steps or DEFAULT_GENERATION_PARAMS.get("steps")
            settings_dict["width"] = settings.width or int(info.get("width", 0))
            settings_dict["height"] = settings.height or int(info.get("height", 0))
            settings_dict["cfg_scale"] = settings.cfg_scale or float(info.get("cfg_scale", 0))
            settings_dict["denoising_strength"] = settings.denoising_strength or float(info.get("denoising_strength", 0))
            
            # Добавляем информацию о количестве изображений
            images_list = result.get("images") or []
            if not isinstance(images_list, list):
                images_list = []
            settings_dict["images_generated"] = len(images_list)
            settings_dict["expected_images"] = 1
            
            logger.info(f"Сохраняем статистику: изображений получено {settings_dict['images_generated']}")
            
            detailed_info = {
                "saved_paths": [],
                "status": "success",
                "service": "FaceRefinementService",
                "images_count": settings_dict["images_generated"],
                "request_id": getattr(self, '_request_counter', 0)
            }
            
            generation_stats.add_generation(settings_dict, execution_time, result, detailed_info)
        except Exception as e:
            logger.error(f"Ошибка при сохранении статистики: {str(e)}")

    # Остальные методы без изменений...
    async def close(self):
        """Закрывает клиент"""
        await self.client.aclose()

    async def process_face_refinement(self, settings: FaceRefinementSettings) -> GenerationResponse:
        """Обработка улучшения лица (без изменений)"""
        try:
            logger.info(f"Starting face refinement with settings: {settings.dict()}")
            
            # Получаем настройки по умолчанию
            default_params = get_generation_params("default")
            logger.info(f"🚨 FACE_REFINEMENT: default_params['steps'] = {default_params.get('steps')}")
            logger.info(f"🚨 FACE_REFINEMENT: settings.override_params = {settings.override_params}")
            
            generation_settings = GenerationSettings(
                prompt=settings.prompt,
                negative_prompt=settings.negative_prompt,
                use_default_prompts=True,
                steps=settings.override_params.get("steps", default_params["steps"]),
                cfg_scale=settings.override_params.get("cfg_scale", default_params["cfg_scale"]),
                width=settings.override_params.get("width", default_params["width"]),
                height=settings.override_params.get("height", default_params["height"]),
                restore_faces=True,
                enable_hr=settings.override_params.get("enable_hr", default_params["enable_hr"]),
                denoising_strength=settings.refinement_strength,
                hr_scale=settings.override_params.get("hr_scale", default_params["hr_scale"]),
                hr_upscaler=settings.override_params.get("hr_upscaler", default_params["hr_upscaler"]),
                hr_second_pass_steps=settings.override_params.get("hr_second_pass_steps", default_params["hr_second_pass_steps"])
            )
            
            result = await self.generate_image(generation_settings)
            
            logger.info("Face refinement completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in process_face_refinement: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise 