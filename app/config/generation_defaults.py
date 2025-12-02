"""
Настройки по умолчанию для генерации изображений Stable Diffusion.
"""

from typing import Dict, Any

# Основные параметры генерации по умолчанию
DEFAULT_GENERATION_PARAMS = {
    "sampler_name": "Euler",
    "steps": 20,
    "width": 552,
    "height": 966,
    "scheduler": "karras",
    "cfg_scale": 4,
    "restore_faces": False,
    "batch_size": 1,
    "n_iter": 1,
    "n_samples": 1,
    "save_grid": False,
    "enable_hr": False,
    "denoising_strength": 0.4,
    "hr_scale": 1.5,
    "hr_upscaler": "SwinIR_4x",
    "hr_prompt": "",
    "hr_negative_prompt": "",
    "send_images": True,
    "save_images": False,
    "alwayson_scripts": {},
    "lora_models": [
        {
            "name": "pastel-anime-xl-latest",
            "weight": 0.4,
            "enabled": False
        },
        {
            "name": "DetailedEyes_V3",
            "weight": 0.6,
            "enabled": False
        },
        #LoRA models
        {
            "name": "1.5_perfect hands",
            "weight": 0.9,
            "enabled": False
        },
        {
            "name": "add_detail",
            "weight": 0.5,
            "enabled": False
        },
        {
            "name": "EasyNegativeV2.safetensors",
            "weight": 0.7,
            "enabled": True
        },
        {
            "name": "MysticalPlantPenetratorILLUST.safetensors",
            "weight": 0.25,
            "enabled": True
        },
        {
            "name": "Detailed-Eye-V1.0-000013.safetensors",
            "weight": 1.0,
            "enabled": True
        },
        {
            "name": "Dramatic Lighting Slider",
            "weight": 1.5,
            "enabled": True
        },
        {
            "name": "Semi-realism_illustrious.safetensors",
            "weight": 0.7,
            "enabled": True
        },
        {
            "name": "kms_in the dark_IL-000003.safetensors",
            "weight": 0.5,
            "enabled": True
        },
    ],
    "clip_skip": 2,
    "seed": -1,
}


# Параметры для ADetailer
ADETAILER_FACE_PARAMS = {
    "ad_model": "face_yolov8n.pt",
    "ad_steps": 10,
    "ad_denoising_strength": 0.4,
    "ad_cfg_scale": 4,
    "ad_mask_blur": 3,
    "ad_inpaint_only_masked": True,
    "ad_inpaint_only_masked_padding": 24,
    "ad_confidence": 0.2,
    "ad_dilate_erode": 2,
    "ad_use_steps": True,
    "ad_use_cfg_scale": True,
    "ad_prompt": (
        "clean line art, symmetrical eyes, "
        "glossy eyes, sharp anime details, perfect anime face"
    ),
    "ad_negative_prompt": (
        "deformed face, wonky eyes, double irises, "
        "bad symmetry, lowres, blurry"
    )
}

ADETAILER_HAND_PARAMS = {
    "ad_model": "hand_yolov9c.pt",
    "ad_steps": 10,
    "ad_denoising_strength": 0.4,
    "ad_cfg_scale": 4,
    "ad_mask_blur": 4,
    "ad_inpaint_only_masked": True,
    "ad_inpaint_only_masked_padding": 32,
    "ad_confidence": 0.3,
    "ad_dilate_erode": 4,
    "ad_use_steps": True,
    "ad_use_cfg_scale": True,
    "ad_prompt": "perfect hands, detailed fingers, natural hand anatomy",
    "ad_negative_prompt": "deformed hands, extra fingers, missing fingers, bad anatomy, mutated hands, ugly hands"
}



def get_generation_params(
    preset: str = "default",
    custom_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Получить параметры генерации по умолчанию.

    Args:
        preset: Предустановка параметров ("default", "anime", "realistic")
        custom_params: Дополнительные параметры для переопределения

    Returns:
        Словарь с параметрами генерации
    """
    # ИСПРАВЛЕНО: Всегда используем DEFAULT_GENERATION_PARAMS
    base_params = DEFAULT_GENERATION_PARAMS.copy()
    
    # Включаем/выключаем ADetailer по флагу в конфигурации
    if base_params.get("use_adetailer", True):
        adetailer_config = get_adetailer_params(ADETAILER_FACE_PARAMS, ADETAILER_HAND_PARAMS)
        base_params["alwayson_scripts"].update(adetailer_config)
        base_params["adetailer_enable"] = True
        base_params["adetailer_preload_models"] = True
        base_params["adetailer_debug"] = True
        base_params["adetailer_logging"] = True
    else:
        if "ADetailer" in base_params["alwayson_scripts"]:
            del base_params["alwayson_scripts"]["ADetailer"]
        base_params["adetailer_enable"] = False
        base_params["adetailer_preload_models"] = False
        base_params["adetailer_debug"] = False
        base_params["adetailer_logging"] = False

    if custom_params:
        base_params.update(custom_params)

    return base_params



def get_fallback_values() -> Dict[str, Any]:
    """
    Получить fallback значения из DEFAULT_GENERATION_PARAMS.
    
    Returns:
        Словарь с fallback значениями для API
    """
    from app.config.default_prompts import get_default_negative_prompts
    
    return {
        "steps": DEFAULT_GENERATION_PARAMS["steps"],
        "width": DEFAULT_GENERATION_PARAMS["width"],
        "height": DEFAULT_GENERATION_PARAMS["height"],
        "cfg_scale": DEFAULT_GENERATION_PARAMS["cfg_scale"],
        "sampler_name": DEFAULT_GENERATION_PARAMS["sampler_name"],
        "negative_prompt": get_default_negative_prompts()
    }


def get_prompts_from_defaults() -> Dict[str, str]:
    """
    Получить промпты из default_prompts.py.
    
    Returns:
        Словарь с позитивными и негативными промптами
    """
    from app.config.default_prompts import get_default_positive_prompts, get_default_negative_prompts
    
    return {
        "positive_prompt": get_default_positive_prompts(),
        "negative_prompt": get_default_negative_prompts()
    }




def get_adetailer_params(
    face_params: Dict[str, Any] = None,
    hand_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Получить параметры для ADetailer.

    Args:
        face_params: Параметры для обработки лиц
        hand_params: Параметры для обработки рук

    Returns:
        Словарь с параметрами ADetailer
    """
    adetailer_config = {
        "ADetailer": {
            "args": [True]  # ИСПРАВЛЕНО: Первый элемент должен быть True для включения ADetailer
        }
    }

    if face_params:
        adetailer_config["ADetailer"]["args"].append(face_params)

    if hand_params:
        adetailer_config["ADetailer"]["args"].append(hand_params)

    return adetailer_config


def should_use_adetailer(prompt: str, negative_prompt: str = "") -> bool:
    """
    Определить, нужен ли ADetailer на основе промпта.
    
    Args:
        prompt: Позитивный промпт
        negative_prompt: Негативный промпт
        
    Returns:
        True если нужен ADetailer, False иначе
    """
    # Ключевые слова, указывающие на наличие лиц, рук, глаз
    face_keywords = [
        "face", "faces", "portrait", "head", "heads", "facial", "facial features",
        "eyes", "eye", "eyebrows", "eyelashes", "pupils", "iris", "eyelid",
        "nose", "nostrils", "mouth", "lips", "teeth", "tongue", "chin", "cheeks",
        "forehead", "temple", "ear", "ears", "facial expression", "smile", "frown",
        "1girl", "1boy", "1man", "1woman", "person", "people", "character"
    ]
    
    hand_keywords = [
        "hands", "hand", "fingers", "finger", "thumb", "palm", "wrist", "knuckles",
        "nail", "nails", "fingertips", "hand gesture", "pointing", "holding",
        "grasping", "touching", "reaching", "clapping", "waving"
    ]
    
    # Объединяем промпты для анализа
    full_text = f"{prompt} {negative_prompt}".lower()
    
    # Проверяем наличие ключевых слов
    has_face_keywords = any(keyword in full_text for keyword in face_keywords)
    has_hand_keywords = any(keyword in full_text for keyword in hand_keywords)
    
    # ADetailer нужен если есть лица ИЛИ руки
    return has_face_keywords or has_hand_keywords


def get_generation_params_with_smart_adetailer(
    preset: str = "default",
    custom_params: Dict[str, Any] = None,
    prompt: str = "",
    negative_prompt: str = "",
    force_adetailer: bool = None
) -> Dict[str, Any]:
    """
    Получить параметры генерации с умным определением необходимости ADetailer.
    
    Args:
        preset: Предустановка параметров
        custom_params: Дополнительные параметры
        prompt: Позитивный промпт для анализа
        negative_prompt: Негативный промпт для анализа
        force_adetailer: Принудительно включить/выключить ADetailer (None = автоопределение)
    
    Returns:
        Словарь с параметрами генерации
    """
    base_params = get_generation_params(preset, custom_params)
    
    # Определяем необходимость ADetailer
    if force_adetailer is not None:
        enable_adetailer = force_adetailer
    else:
        enable_adetailer = should_use_adetailer(prompt, negative_prompt)
    
    if enable_adetailer:
        adetailer_config = get_adetailer_params(ADETAILER_FACE_PARAMS, ADETAILER_HAND_PARAMS)
        base_params["alwayson_scripts"].update(adetailer_config)
        base_params["use_adetailer"] = True
    else:
        base_params["use_adetailer"] = False
    
    return base_params


def get_generation_params_with_adetailer(
    preset: str = "default",
    custom_params: Dict[str, Any] = None,
    enable_adetailer: bool = False
) -> Dict[str, Any]:
    """
    Получить параметры генерации с опциональным ADetailer (устаревшая функция).
    
    Args:
        preset: Предустановка параметров
        custom_params: Дополнительные параметры
        enable_adetailer: Включить ли ADetailer (по умолчанию False)
    
    Returns:
        Словарь с параметрами генерации
    """
    base_params = get_generation_params(preset, custom_params)
    
    if enable_adetailer:
        adetailer_config = get_adetailer_params(ADETAILER_FACE_PARAMS, ADETAILER_HAND_PARAMS)
        base_params["alwayson_scripts"].update(adetailer_config)
    
    return base_params


def diagnose_adetailer_delay():
    """
    Диагностика задержек ADetailer.
    
    Returns:
        Словарь с диагностической информацией
    """
    import time
    import os
    
    diagnosis = {
        "timestamp": time.time(),
        "models_exist": {},
        "model_sizes": {},
        "recommendations": []
    }
    
    # Проверяем наличие моделей ADetailer
    models_path = "stable-diffusion-webui/models/adetailer"
    if os.path.exists(models_path):
        for model_file in ["face_yolov8n.pt", "hand_yolov9c.pt"]:
            model_path = os.path.join(models_path, model_file)
            diagnosis["models_exist"][model_file] = os.path.exists(model_path)
            
            if os.path.exists(model_path):
                size = os.path.getsize(model_path)
                diagnosis["model_sizes"][model_file] = f"{size / (1024*1024):.1f} MB"
    
    # Рекомендации
    if not all(diagnosis["models_exist"].values()):
        diagnosis["recommendations"].append("Загрузите недостающие модели ADetailer")
    
    large_models = [s for s in diagnosis["model_sizes"].values() if float(s.split()[0]) > 100]
    if large_models:
        diagnosis["recommendations"].append("Модели ADetailer слишком большие - рассмотрите более легкие версии")
    
    diagnosis["recommendations"].append("Включите предзагрузку моделей в настройках WebUI")
    diagnosis["recommendations"].append("Увеличьте VRAM для кэширования моделей")
    
    return diagnosis
