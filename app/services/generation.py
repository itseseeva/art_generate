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

            # Оптимизируем память перед генерацией
            optimize_memory()
            
            # Получаем информацию о памяти GPU
            memory_info = get_gpu_memory_info()
            if memory_info:
                self._log("INFO", f"GPU Memory before generation: {memory_info}")
            
            # Получаем негативный промпт
            negative_prompt = settings.get_negative_prompt()
            
            # Формируем параметры запроса
            request_params = get_default_generation_params()
            self._log("INFO", f"Default params: steps={request_params.get('steps')}, cfg_scale={request_params.get('cfg_scale')}")
            
            # Обновляем параметры из настроек пользователя
            user_params = settings.dict()
            self._log("INFO", f"User params: steps={user_params.get('steps')}, cfg_scale={user_params.get('cfg_scale')}")
            
            for key, value in user_params.items():
                if key != "negative_prompt":
                    request_params[key] = value
            
            request_params["negative_prompt"] = negative_prompt
            self._log("INFO", f"Final params: steps={request_params.get('steps')}, cfg_scale={request_params.get('cfg_scale')}")
            self._log("INFO", f"Hires.fix params: enable_hr={request_params.get('enable_hr')}, hr_second_pass_steps={request_params.get('hr_second_pass_steps')}, hr_upscaler={request_params.get('hr_upscaler')}")
            self._log("INFO", f"Full request_params keys: {list(request_params.keys())}")
            self._log("INFO", f"All hr_* params: {[(k, v) for k, v in request_params.items() if k.startswith('hr_')]}")
            
            # Используем hr_second_pass_steps из настроек
            if request_params.get("hr_upscaler") == "SwinIR_4x":
                self._log("INFO", f"Используем hr_second_pass_steps из настроек для SwinIR")
            
            # Обработка VAE настроек
            if settings.use_vae is not None:
                # Пользователь хочет контролировать VAE
                if settings.use_vae:
                    # Включить VAE
                    vae_model = settings.vae_model or VAE_SETTINGS["model"]
                    if "override_settings" not in request_params:
                        request_params["override_settings"] = {}
                    request_params["override_settings"]["sd_vae"] = vae_model
                    request_params["override_settings"]["sd_vae_overrides_per_model_preferences"] = True
                else:
                    # Отключить VAE
                    if "override_settings" not in request_params:
                        request_params["override_settings"] = {}
                    request_params["override_settings"]["sd_vae"] = None
                    request_params["override_settings"]["sd_vae_overrides_per_model_preferences"] = False
            

            
            if not request_params.get("scheduler") or request_params["scheduler"] == "Automatic":
                request_params["scheduler"] = "Karras"
            
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
            
            # Логируем полный запрос перед отправкой
            self._log("INFO", f"Отправляем запрос в WebUI: {self.api_url}/sdapi/v1/txt2img")
            self._log("INFO", f"Отфильтрованные параметры запроса: {json.dumps(filtered_params, indent=2)}")
            
            # Отправляем запрос к API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/sdapi/v1/txt2img",
                    json=filtered_params,
                    timeout=300.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Синхронизируем CUDA перед сохранением
                if torch.cuda.is_available():
                    torch.cuda.synchronize()
                
                # Используем результат как есть
                processed_result = result
                
                # Получаем информацию о сиде
                info = processed_result.get("info", "{}")
                try:
                    info_dict = json.loads(info)
                    actual_seed = info_dict.get("seed", -1)
                except Exception:
                    actual_seed = -1
                
                # Сохраняем изображения только в облако
                cloud_urls = []
                images = processed_result.get("images", [])
                
                async def save_image_task(image_data, index):
                    try:
                        prefix = f"gen_{actual_seed}_{index}"
                        # Используем новую функцию только для облака
                        result = await save_image_cloud_only(
                            image_data=image_data, 
                            prefix=prefix,
                            character_name=getattr(settings, 'character', None)
                        )
                        return result
                    except Exception as e:
                        self._log("ERROR", f"Ошибка при сохранении изображения {index}: {str(e)}")
                        return None
                
                # Запускаем сохранение асинхронно
                save_tasks = []
                for i, image_base64 in enumerate(images):
                    if image_base64:
                        save_tasks.append(save_image_task(image_base64, i))
                
                # Собираем результаты
                if save_tasks:
                    results = await asyncio.gather(*save_tasks, return_exceptions=True)
                    for result in results:
                        if isinstance(result, Exception):
                            self._log("ERROR", f"Ошибка при сохранении изображения: {str(result)}")
                        elif result and result.get("success"):
                            if result.get("cloud_url"):
                                cloud_urls.append(result["cloud_url"])
                
                # Создаем ответ
                generation_response = GenerationResponse.from_api_response(processed_result)
                generation_response.saved_paths = []  # Больше не сохраняем локально
                generation_response.cloud_urls = cloud_urls
                generation_response.seed = actual_seed
                
                # Обновляем статистику
                execution_time = time.time() - start_time
                await self.update_generation_stats(settings, generation_response, execution_time)
                
                # Кэш отключен для экономии памяти
                # self._update_cache(cache_key, generation_response)
                
                # Оптимизируем память после генерации
                optimize_memory()
                
                # Получаем информацию о памяти GPU после генерации
                memory_info = get_gpu_memory_info()
                if memory_info:
                    self._log("INFO", f"GPU Memory after generation: {memory_info}")
                
                return generation_response
                
        except Exception as e:
            self._log("ERROR", f"Ошибка при генерации: {str(e)}")
            self._log("ERROR", f"Traceback: {traceback.format_exc()}")
            raise

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
                "width": generation_response.width,
                "height": generation_response.height,
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