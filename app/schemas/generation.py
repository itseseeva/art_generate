from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any, Union, Literal
import sys
from pathlib import Path

# Добавляем корень проекта в путь для импорта
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.config.default_prompts import get_default_negative_prompts
from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
import base64
from PIL import Image
from io import BytesIO


"""
GenerationSettings — активно используется в эндпоинтах и сервисах.
GenerationResponse — используется для возврата результата генерации.
FaceRefinementSettings — используется в эндпоинте /refine-face.
GenerationRequest — используется в некоторых роутерах.
GenerationOverrideParams — используется как часть структуры параметров (например, в FaceRefinementSettings.override_params).
ModelInfo — может быть полезен для описания моделей, но прямого использования в коде не найдено (возможно, используется для расширения API или в будущем).
"""


class GenerationSettings(BaseModel):
    """Настройки для генерации изображения"""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "girl with big tits and big ass in ripped shorts looks at camera and touches her breasts",
                "seed": -1  # -1 для случайного сида
            }
        }
    )
    prompt: str = Field(..., description="Промпт для генерации")
    negative_prompt: Optional[str] = Field(None, description="Негативный промпт")
    seed: Optional[int] = Field(None, description="Seed для генерации")
    steps: int = Field(default=DEFAULT_GENERATION_PARAMS.get("steps"), description="Количество шагов")
    model: Optional[Literal["anime", "anime-realism", "realism"]] = Field(default="anime-realism", description="Модель для генерации: 'anime', 'anime-realism' или 'realism'")
    
    def __init__(self, **data):
        super().__init__(**data)
        # ОТЛАДКА: логируем откуда берется steps
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🚨 GenerationSettings создан с steps={self.steps} (default={DEFAULT_GENERATION_PARAMS.get('steps')})")
    width: int = Field(default=DEFAULT_GENERATION_PARAMS.get("width"), description="Ширина изображения")
    height: int = Field(default=DEFAULT_GENERATION_PARAMS.get("height"), description="Высота изображения")
    cfg_scale: float = Field(default=DEFAULT_GENERATION_PARAMS.get("cfg_scale"), description="CFG Scale")
    sampler_name: str = Field(default=DEFAULT_GENERATION_PARAMS.get("sampler_name"), description="Название сэмплера")
    scheduler: Optional[str] = Field(None, description="Название планировщика")
    enable_hr: bool = Field(default=False, description="Включить high-res fix")
    hr_scale: Optional[float] = Field(default=None, description="Масштаб high-res fix")
    hr_upscaler: Optional[str] = Field(default=None, description="Апскейлер для high-res fix")
    denoising_strength: Optional[float] = Field(default=None, description="Сила денойзинга")
    restore_faces: bool = Field(default=False, description="Восстановление лиц")
    batch_size: Optional[int] = Field(default=None, description="Размер батча")
    n_iter: Optional[int] = Field(default=None, description="Количество итераций")
    clip_skip: Optional[int] = Field(None, description="Clip Skip")
    save_grid: Optional[bool] = Field(None, description="Сохранять сетку изображений")
    use_default_prompts: bool = Field(default=True, description="Использовать дефолтные промпты для улучшения качества")
    
    # IP-Adapter удален
    
    def get_negative_prompt(self) -> str:
        """Получает негативный промпт с дефолтными значениями"""
        if not self.use_default_prompts:
            return self.negative_prompt or ""
            
        default_negative = get_default_negative_prompts()
        if not self.negative_prompt:
            return default_negative
            
        return f"{self.negative_prompt}, {default_negative}"


class GenerationOverrideParams(BaseModel):
    sampling_method: Optional[str] = Field(default=None, description="Метод сэмплирования (например, 'DPM++ 2M')")
    sampling_steps: Optional[int] = Field(default=None, ge=1, le=150, description="Количество шагов сэмплирования (1-150)")
    width: Optional[int] = Field(default=None, ge=64, le=2048, description="Ширина изображения (64-2048)")
    height: Optional[int] = Field(default=None, ge=64, le=2048, description="Высота изображения (64-2048)")
    cfg_scale: Optional[float] = Field(default=None, ge=1.0, le=30.0, description="CFG Scale (1.0-30.0)")
    restore_faces: Optional[bool] = Field(default=None, description="Улучшение лиц")
    enable_hr: Optional[bool] = Field(default=None, description="Включить High-Res Fix")
    denoising_strength: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Сила денойзинга (0.0-1.0)")
    hr_scale: Optional[float] = Field(default=None, ge=1.0, le=4.0, description="Масштаб High-Res Fix (1.0-4.0)")
    hr_upscaler: Optional[str] = Field(default=None, description="Апскейлер для High-Res Fix")
    hr_second_pass_steps: Optional[int] = Field(default=None, ge=0, le=150, description="Шаги второго прохода High-Res Fix")

    @field_validator('width', 'height')
    @classmethod
    def validate_dimensions(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v % 8 != 0:
            raise ValueError("Размеры должны быть кратны 8")
        return v

class GenerationRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "portrait of a beautiful woman, high quality, detailed face, 8k uhd"
            }
        }
    )
    
    prompt: str = Field(..., description="Текст запроса для генерации изображения")

class FaceRefinementSettings(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "portrait of a beautiful woman, high quality, detailed face, 8k uhd",
                "refinement_strength": 0.7,
                "controlnet_preset": "default",
                "override_params": {
                    "sampling_steps": None,
                    "cfg_scale": None
                }
            }
        }
    )
    
    prompt: str = Field(..., description="Текст промпта для генерации")
    negative_prompt: str = Field(default="", description="Негативный промпт")
    refinement_strength: float = Field(default=0.7, ge=0.0, le=1.0, description="Сила улучшения лица (0.0-1.0)")
    controlnet_preset: str = Field(
        default="default",
        description="Пресет настроек ControlNet (default, subtle, strong, face_only)"
    )
    override_params: Optional[Dict[str, Any]] = Field(default=None, description="Дополнительные параметры генерации")

class GenerationResponse(BaseModel):
    """Ответ от API генерации"""
    images: List[str] = Field(..., description="Сгенерированные изображения в base64")
    image_data: Optional[List[bytes]] = Field(default=None, description="Бинарные данные изображений")
    parameters: dict = Field(..., description="Параметры генерации")
    info: str = Field(..., description="Информация о генерации")
    seed: int = Field(..., description="Использованный seed")
    saved_paths: List[str] = Field(default_factory=list, description="Пути к сохраненным изображениям")
    cloud_urls: List[str] = Field(default_factory=list, description="URL изображений в облаке")

    @classmethod
    def from_api_response(cls, response: dict) -> "GenerationResponse":
        """Создает объект ответа из ответа API"""
        info = response.get("info", "{}")
        try:
            info_dict = eval(info)
            seed = info_dict.get("seed", -1)
        except:
            seed = -1
            
        # Конвертируем base64 строки в бинарные данные
        images = response.get("images", [])
        image_data = []
        for img_base64 in images:
            try:
                img_bytes = base64.b64decode(img_base64)
                image_data.append(img_bytes)
            except:
                continue
        
        return cls(
            images=images,
            image_data=image_data,
            parameters=response.get("parameters", {}),
            info=info,
            seed=seed
        )

class ModelInfo(BaseModel):
    title: str = Field(..., description="Название модели")
    model_name: str = Field(..., description="Имя модели")
    hash: str = Field(..., description="Хеш модели")
    sha256: str = Field(..., description="SHA256 хеш модели")
    filename: str = Field(..., description="Имя файла модели")
    config: Optional[str] = Field(default=None, description="Конфигурация модели")
    
    model_config = ConfigDict(protected_namespaces=()) 