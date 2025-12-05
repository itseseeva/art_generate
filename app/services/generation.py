import sys
import copy
import json
import time
import traceback
import threading
import queue
import asyncio
from typing import Any, Dict
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import httpx
import torch
from loguru import logger
from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS

from app.schemas.generation import GenerationSettings, GenerationResponse
from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
from app.config.default_prompts import (
    get_default_negative_prompts, 
    get_default_positive_prompts
)
from app.utils.generation_stats import generation_stats
from app.utils.image_saver import save_image, save_image_cloud_only
from app.config.paths import IMAGES_DIR
from app.config.cuda_config import optimize_memory, get_gpu_memory_info
from app.utils.memory_utils import health_check
from app.services.generation_optimizations import (
    GenerationOptimizer,
    optimize_generation_flow,
    get_fast_sampler_config,
    optimize_batch_processing
)


# Добавляем корень проекта в путь для импорта
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def get_default_generation_params() -> Dict[str, Any]:
    """
    Получить дефолтные параметры генерации из конфига.
    
    Returns:
        Dict[str, Any]: Словарь с дефолтными параметрами
    """
    # Создаем глубокую копию, чтобы не изменять оригинал
    return copy.deepcopy(DEFAULT_GENERATION_PARAMS)

class GenerationService:
    """
    Сервис для взаимодействия с Stable Diffusion WebUI через API.
    Используется для генерации изображений по заданным параметрам.
    """
    def __init__(self, api_url: str) -> None:
        """
        :param api_url: URL Stable Diffusion WebUI API
        """
        self.api_url = api_url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.output_dir = IMAGES_DIR
        self.output_dir.mkdir(exist_ok=True)
        
        # Оптимизатор для ускорения генерации
        self.optimizer = GenerationOptimizer(api_url)
        
        # Создаем очередь для логов
        self.log_queue = queue.Queue()
        self.log_thread = threading.Thread(target=self._process_logs, daemon=True)
        self.log_thread.start()
        
        # Создаем пул потоков для сохранения изображений
        self.save_executor = ThreadPoolExecutor(max_workers=2)
        
        # Кэш отключен для экономии памяти
        self._result_cache = {}
        self._cache_size = 0  # Отключено кэширование

    def _process_logs(self):
        """Обработка логов в отдельном потоке"""
        while True:
            try:
                log_entry = self.log_queue.get()
                if log_entry is None:
                    break
                level, message = log_entry
                logger.log(level, message)
            except Exception as e:
                logger.error(f"Ошибка в потоке логирования: {str(e)}")

    def _log(self, level: str, message: str):
        """Добавляет сообщение в очередь логов"""
        self.log_queue.put((level, message))

    def _update_cache(self, key: str, value: Any):
        """Обновляет кэш результатов"""
        if len(self._result_cache) >= self._cache_size:
            # Удаляем самый старый элемент
            self._result_cache.pop(next(iter(self._result_cache)))
        self._result_cache[key] = value

    async def generate(self, settings: GenerationSettings) -> GenerationResponse:
        """Генерация изображения с заданными параметрами"""
        start_time = time.time()
        try:
            # Кэш отключен для экономии памяти
            # cache_key = f"{settings.dict()}"
            # if cache_key in self._result_cache:
            #     self._log("INFO", "Используем кэшированный результат")
            #     return self._result_cache[cache_key]

            # ОПТИМИЗАЦИЯ: Убрано optimize_memory() и get_gpu_memory_info()
            # Эти вызовы замедляют генерацию на 1-2 секунды
            # GPU память управляется автоматически через PyTorch
            
            # Очищаем промпт от переносов строк и несуществующих LoRA
            from app.config.default_prompts import clean_prompt, remove_missing_loras
            settings.prompt = clean_prompt(settings.prompt)
            settings.prompt = remove_missing_loras(settings.prompt)
            if settings.negative_prompt:
                settings.negative_prompt = clean_prompt(settings.negative_prompt)
            
            # Добавляем дефолтные промпты ПЕРЕД формированием параметров
            original_prompt = settings.prompt
            original_negative_prompt = settings.negative_prompt
            
            if settings.use_default_prompts:
                self._log("INFO", "Добавляем дефолтные промпты к пользовательским")
                from app.config.default_prompts import get_enhanced_prompts
                
                enhanced_positive, enhanced_negative = get_enhanced_prompts(
                    settings.prompt, 
                    use_defaults=True
                )
                settings.prompt = enhanced_positive
                settings.negative_prompt = enhanced_negative
                
                self._log("INFO", f"Промпт ДО: {original_prompt[:100]}...")
                self._log("INFO", f"Промпт ПОСЛЕ: {settings.prompt[:100]}...")
            
            # Получаем негативный промпт
            negative_prompt = settings.get_negative_prompt()
            
            # Формируем параметры запроса (используем get_generation_params для включения ADetailer)
            from app.config.generation_defaults import get_generation_params
            request_params = get_generation_params()  # Это включает ADetailer в alwayson_scripts!
            self._log("INFO", f"Default params: steps={request_params.get('steps')}, cfg_scale={request_params.get('cfg_scale')}")
            self._log("INFO", f"ADetailer в alwayson_scripts: {'ADetailer' in request_params.get('alwayson_scripts', {})}")
            
            # Обновляем параметры из настроек пользователя
            user_params = settings.dict()
            self._log("INFO", f"User params: steps={user_params.get('steps')}, cfg_scale={user_params.get('cfg_scale')}")
            
            for key, value in user_params.items():
                if key != "negative_prompt":
                    request_params[key] = value
            
            request_params["negative_prompt"] = negative_prompt
            self._log("INFO", f"Final params: steps={request_params.get('steps')}, cfg_scale={request_params.get('cfg_scale')}")
            self._log("INFO", f"Hires.fix params: enable_hr={request_params.get('enable_hr')}, hr_upscaler={request_params.get('hr_upscaler')}")
            self._log("INFO", f"Full request_params keys: {list(request_params.keys())}")
            self._log("INFO", f"All hr_* params: {[(k, v) for k, v in request_params.items() if k.startswith('hr_')]}")
            
            # Удаляем параметры, которые не поддерживаются WebUI
            request_params.pop("hr_second_pass_steps", None)
            request_params.pop("use_adetailer", None)
            request_params.pop("override_settings", None)
            request_params.pop("override_settings_restore_afterwards", None)
            request_params.pop("script_args", None)
            request_params.pop("use_default_prompts", None)
            request_params.pop("character", None)
            request_params.pop("use_vae", None)
            request_params.pop("vae_model", None)
            
            if not request_params.get("scheduler") or request_params["scheduler"] == "Automatic":
                request_params["scheduler"] = "Karras"
            
            # Оптимизация: используем более быстрый сэмплер если не указан явно
            if request_params.get("sampler_name") == "Euler":
                fast_config = get_fast_sampler_config()
                request_params["sampler_name"] = fast_config["sampler_name"]
                logger.info(f"[OPTIMIZE] Используем быстрый сэмплер: {fast_config['sampler_name']}")
            
            # Оптимизация батч-обработки
            batch_size = request_params.get("batch_size", 1)
            n_iter = request_params.get("n_iter", 1)
            optimized_batch, optimized_iter = optimize_batch_processing(batch_size, n_iter)
            if optimized_batch != batch_size or optimized_iter != n_iter:
                request_params["batch_size"] = optimized_batch
                request_params["n_iter"] = optimized_iter
                logger.info(f"[OPTIMIZE] Оптимизирована батч-обработка: batch_size={optimized_batch}, n_iter={optimized_iter}")
            
            seed = request_params.get("seed", -1)
            n_samples = request_params.get("n_samples", "NOT_SET")
            self._log("INFO", f"Используемый seed: {seed}, n_samples: {n_samples}")
            
            # Фильтруем параметры - убираем те, которые могут вызывать ошибки
            filtered_params = {}
            safe_params = [
                "prompt", "negative_prompt", "steps", "width", "height", "cfg_scale", 
                "sampler_name", "scheduler", "seed", "batch_size", "n_iter", "n_samples",
                "save_grid", "enable_hr", "denoising_strength", "hr_scale", "hr_upscaler",
                "hr_prompt", "hr_negative_prompt", "restore_faces", "clip_skip",
                "alwayson_scripts", "lora_models", "send_images", "save_images"
            ]
            
            for key, value in request_params.items():
                if key in safe_params:
                    filtered_params[key] = value
                else:
                    self._log("WARNING", f"Пропускаем параметр {key}={value} (не поддерживается WebUI)")
            
            # Оптимизация параметров запроса (убирает пустые значения, оптимизирует структуру)
            filtered_params = self.optimizer.optimize_request_params(filtered_params)
            
            # ДЕТАЛЬНОЕ логирование ADetailer конфигурации
            if "alwayson_scripts" in filtered_params and "ADetailer" in filtered_params["alwayson_scripts"]:
                adetailer_config = filtered_params["alwayson_scripts"]["ADetailer"]
                adetailer_args = adetailer_config.get("args", [])
                logger.info(f"[GENERATE] ========== ADETAILER КОНФИГУРАЦИЯ ==========")
                logger.info(f"[GENERATE] Количество элементов в args: {len(adetailer_args)}")
                for i, arg in enumerate(adetailer_args):
                    if isinstance(arg, bool):
                        logger.info(f"[GENERATE] args[{i}]: {arg} (bool)")
                    elif isinstance(arg, dict):
                        logger.info(f"[GENERATE] args[{i}] (словарь конфига):")
                        logger.info(f"[GENERATE]   >>> МОДЕЛЬ: {arg.get('ad_model')} <<<")
                        logger.info(f"[GENERATE]   - ad_steps: {arg.get('ad_steps')}")
                        logger.info(f"[GENERATE]   - ad_use_steps: {arg.get('ad_use_steps')}")
                        logger.info(f"[GENERATE]   - ad_cfg_scale: {arg.get('ad_cfg_scale')}")
                        logger.info(f"[GENERATE]   - ad_use_cfg_scale: {arg.get('ad_use_cfg_scale')}")
                        logger.info(f"[GENERATE]   - ad_denoising_strength: {arg.get('ad_denoising_strength')}")
                        logger.info(f"[GENERATE]   - ad_prompt: {arg.get('ad_prompt', '')[:50]}...")
                        logger.info(f"[GENERATE]   - is_api: {arg.get('is_api')}")
                    else:
                        logger.info(f"[GENERATE] args[{i}]: {arg} ({type(arg).__name__})")
                logger.info(f"[GENERATE] =============================================")
            
            # Логируем полный запрос перед отправкой (прямое логирование для немедленного вывода)
            logger.info(f"[GENERATE] Отправляем запрос в WebUI: {self.api_url}/sdapi/v1/txt2img")
            self._log("INFO", f"Отправляем запрос в WebUI: {self.api_url}/sdapi/v1/txt2img")
            self._log("INFO", f"Отфильтрованные параметры запроса: {json.dumps(filtered_params, indent=2)}")
            
            # Проверяем готовность WebUI перед запросом (быстрая проверка)
            logger.info(f"[GENERATE] Проверяем готовность WebUI...")
            try:
                is_ready = await health_check(self.api_url)
                if not is_ready:
                    logger.warning(f"[GENERATE] WebUI может быть не готов, но продолжаем запрос...")
                else:
                    logger.info(f"[GENERATE] WebUI готов к работе")
            except Exception as health_error:
                logger.warning(f"[GENERATE] Не удалось проверить готовность WebUI: {str(health_error)}, продолжаем запрос...")
            
            # Отправляем запрос к API используя оптимизированный клиент
            logger.info(f"[GENERATE] Отправляем POST запрос к WebUI...")
            result = None
            try:
                # Используем переиспользуемый клиент для ускорения (keep-alive соединения)
                client = await self.optimizer.get_client()
                response = await client.post(
                    f"{self.api_url}/sdapi/v1/txt2img",
                    json=filtered_params
                )
                logger.info(f"[GENERATE] Получен ответ от WebUI, статус: {response.status_code}")
                response.raise_for_status()
                logger.info(f"[GENERATE] Парсим JSON ответ...")
                result = response.json()
                logger.info(f"[GENERATE] JSON ответ успешно распарсен")
            except httpx.TimeoutException as e:
                logger.error(f"[GENERATE] Таймаут при запросе к WebUI: {str(e)}")
                self._log("ERROR", f"Таймаут при запросе к WebUI: {str(e)}")
                raise Exception(f"Таймаут при генерации изображения. WebUI не ответил за 300 секунд. Возможно, сервис еще не готов или перегружен.")
            except httpx.ConnectError as e:
                logger.error(f"[GENERATE] Ошибка подключения к WebUI: {str(e)}")
                self._log("ERROR", f"Ошибка подключения к WebUI: {str(e)}")
                raise Exception(f"Не удалось подключиться к WebUI по адресу {self.api_url}. Убедитесь, что сервис запущен и доступен.")
            except httpx.HTTPStatusError as e:
                logger.error(f"[GENERATE] HTTP ошибка от WebUI: {e.response.status_code} - {e.response.text[:200]}")
                self._log("ERROR", f"HTTP ошибка от WebUI: {e.response.status_code}")
                raise Exception(f"WebUI вернул ошибку {e.response.status_code}: {e.response.text[:200]}")
            
            # Проверяем, что result был получен
            if result is None:
                logger.error(f"[GENERATE] КРИТИЧЕСКАЯ ОШИБКА: result равен None после запроса к WebUI")
                raise Exception("Не удалось получить результат от WebUI")
            
            # Используем результат как есть
            processed_result = result
            logger.info(f"[GENERATE] Получен результат от WebUI, количество изображений: {len(processed_result.get('images', []))}")
            
            # Получаем информацию о сиде
            info = processed_result.get("info", "{}")
            try:
                info_dict = json.loads(info)
                actual_seed = info_dict.get("seed", -1)
                logger.info(f"[GENERATE] Seed из результата: {actual_seed}")
            except Exception as e:
                logger.warning(f"[GENERATE] Не удалось распарсить info: {str(e)}")
                actual_seed = -1
            
            # Возвращаем изображения сразу, сохранение в облако делаем в фоне
            images = processed_result.get("images", [])
            logger.info(f"[GENERATE] Получено {len(images)} изображений")
            
            # Запускаем фоновое сохранение в Celery (не блокируем ответ)
            # ОТКЛЮЧЕНО для локальной разработки - Redis недоступен
            # Раскомментируй когда Redis будет работать
            """
            from app.tasks.generation_tasks import save_images_to_cloud_task
            
            try:
                # Запускаем задачу асинхронно (не ждем результата)
                save_task = save_images_to_cloud_task.apply_async(
                    args=[images, actual_seed, None],  # character_name=None
                    queue='low_priority'  # Низкий приоритет для сохранения
                )
                logger.info(f"[GENERATE] Фоновое сохранение запущено (task_id={save_task.id})")
            except Exception as e:
                logger.warning(f"[GENERATE] Не удалось запустить фоновое сохранение: {e}")
            """
            self._log("INFO", "[GENERATE] Фоновое сохранение отключено (Redis недоступен)")
            
            # Для совместимости с существующим кодом возвращаем пустой список
            # Реальные URL будут получены из фоновой задачи
            cloud_urls = []
            
            # Создаем ответ
            logger.info(f"[GENERATE] Создаем GenerationResponse...")
            generation_response = GenerationResponse.from_api_response(processed_result)
            generation_response.saved_paths = []  # Больше не сохраняем локально
            generation_response.cloud_urls = cloud_urls
            generation_response.seed = actual_seed
            logger.info(f"[GENERATE] GenerationResponse создан успешно")
            
            # Обновляем статистику
            execution_time = time.time() - start_time
            await self.update_generation_stats(settings, generation_response, execution_time)
            
            # Кэш отключен для экономии памяти
            # self._update_cache(cache_key, generation_response)
            
            # ОПТИМИЗАЦИЯ: Убрано optimize_memory() и get_gpu_memory_info() после генерации
            # Эти вызовы замедляли ответ на 3-5 секунд
            # GPU память управляется автоматически
            
            return generation_response
            
        except Exception as e:
            self._log("ERROR", f"Ошибка при генерации: {str(e)}")
            self._log("ERROR", f"Traceback: {traceback.format_exc()}")
            raise
    
    async def close(self):
        """Закрыть ресурсы сервиса"""
        await self.optimizer.close()
        if hasattr(self.client, 'aclose'):
            await self.client.aclose()

    async def update_generation_stats(self, settings: GenerationSettings, generation_response: GenerationResponse, execution_time: float):
        """Обновляет статистику генерации"""
        try:
            
            # Формируем параметры для статистики
            params = settings.dict()
            
            # Получаем информацию из результата
            info = generation_response.info
            if isinstance(info, str):
                try:
                    info_dict = json.loads(info)
                except:
                    info_dict = {}
            else:
                info_dict = info or {}
            
            # Обновляем параметры из результата
            # Используем реальные настройки, которые были отправлены, а не ответ API
            params.update({
                "sampler_name": settings.sampler_name or info_dict.get("sampler_name", "unknown"),
                "steps": settings.steps or DEFAULT_GENERATION_PARAMS.get("steps", 10),
                "width": settings.width or int(info_dict.get("width", 0)),
                "height": settings.height or int(info_dict.get("height", 0)),
                "cfg_scale": settings.cfg_scale or float(info_dict.get("cfg_scale", 0)),
                "scheduler": settings.scheduler or info_dict.get("scheduler", "unknown"),
                "seed": generation_response.seed,
                "model": info_dict.get("model", "unknown"),
                "hr_scale": settings.hr_scale or float(info_dict.get("hr_scale", 0)),
                "denoising_strength": settings.denoising_strength or float(info_dict.get("denoising_strength", 0)),
                "clip_skip": settings.clip_skip or int(info_dict.get("clip_skip", 0)),
                "batch_size": settings.batch_size or int(info_dict.get("batch_size", 0)),
                "n_iter": settings.n_iter or int(info_dict.get("n_iter", 0)),
                "n_samples": 1,  # Принудительно один сэмпл
                "restore_faces": settings.restore_faces or bool(info_dict.get("restore_faces", False)),
                "hr_upscaler": settings.hr_upscaler or info_dict.get("hr_upscaler", "unknown")
            })
            
            # Логируем значения для отладки
            self._log("INFO", f"[STATS] Settings steps: {settings.steps}, API info steps: {info_dict.get('steps')}, Final steps: {params['steps']}")
            self._log("INFO", f"[STATS] Settings sampler: {settings.sampler_name}, API info sampler: {info_dict.get('sampler_name')}, Final sampler: {params['sampler_name']}")
            
            # Формируем результат для статистики
            result = {
                "seed": generation_response.seed,
                "info": generation_response.info,
                "width": settings.width or int(info_dict.get("width", 0)),
                "height": settings.height or int(info_dict.get("height", 0)),
                "sampler_name": info_dict.get("sampler_name", ""),
                "cfg_scale": info_dict.get("cfg_scale", 0),
                "steps": DEFAULT_GENERATION_PARAMS.get("steps", 10),
                "batch_size": info_dict.get("batch_size", 0),
                "restore_faces": info_dict.get("restore_faces", False),
                "face_restoration_model": info_dict.get("face_restoration_model", ""),
                "sd_model_hash": info_dict.get("sd_model_hash", ""),
                "denoising_strength": info_dict.get("denoising_strength", 0),
                "clip_skip": info_dict.get("clip_skip", 0)
            }
            
            # Формируем detailed информацию для статистики
            detailed_info = {
                "saved_paths": generation_response.saved_paths,
                "status": "success",
                "service": "GenerationService",
                "seed": generation_response.seed,
                "model": info_dict.get("model", "unknown")
            }
            
            # Добавляем в статистику
            generation_stats.add_generation(params, execution_time, result, detailed_info)
            self._log("INFO", f"Статистика генерации обновлена")
            
        except Exception as e:
            self._log("ERROR", f"Ошибка при обновлении статистики: {str(e)}")
            logger.error(f"Ошибка при обновлении статистики: {str(e)}") 