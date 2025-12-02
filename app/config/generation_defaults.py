"""
Настройки по умолчанию для генерации изображений Stable Diffusion.
"""

from typing import Dict, Any
import os
import time

# Основные параметры генерации по умолчанию
DEFAULT_GENERATION_PARAMS = {
    "sampler_name": "DPM++ 2M Karras",  # Быстрее чем Euler при том же качестве
    "steps": 20,
    "width": 768,
    "height": 1344,
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
    
    # !!! ЗДЕСЬ МЕНЯЕМ НА TRUE, ЧТОБЫ РАБОТАЛО !!!
    "use_adetailer": True, 

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
            "enabled": True  # Важная для качества
        },
        {
            "name": "MysticalPlantPenetratorILLUST.safetensors",
            "weight": 0.25,
            "enabled": False  # ОТКЛЮЧЕНА для скорости
        },
        {
            "name": "Detailed-Eye-V1.0-000013.safetensors",
            "weight": 1.0,
            "enabled": True  # Важная для глаз
        },
        {
            "name": "Dramatic Lighting Slider",
            "weight": 1.5,
            "enabled": False  # ОТКЛЮЧЕНА для скорости
        },
        {
            "name": "Semi-realism_illustrious.safetensors",
            "weight": 0.7,
            "enabled": True  # Важная для стиля
        },
        {
            "name": "kms_in the dark_IL-000003.safetensors",
            "weight": 0.5,
            "enabled": False  # ОТКЛЮЧЕНА для скорости
        },
    ],
    "clip_skip": 2,
    "seed": -1,
}


# Параметры для ADetailer (ЛИЦО - ИСПОЛЬЗУЕТСЯ)
ADETAILER_FACE_PARAMS = {
    "ad_model": "face_yolov8n.pt",
    "ad_steps": 5,  # Уменьшено до 5 для максимальной скорости
    "ad_denoising_strength": 0.35,  # Уменьшено для скорости
    "ad_cfg_scale": 4,
    "ad_mask_blur": 2,  # Уменьшено для скорости
    "ad_inpaint_only_masked": True,
    "ad_inpaint_only_masked_padding": 16,  # Уменьшено для скорости
    "ad_confidence": 0.3,  # Увеличено для меньшего количества ложных срабатываний
    "ad_dilate_erode": 1,  # Уменьшено для скорости
    "ad_prompt": (
        "clean line art, symmetrical eyes, "
        "glossy eyes, sharp anime details, perfect anime face"
    ),
    "ad_negative_prompt": (
        "deformed face, wonky eyes, double irises, "
        "bad symmetry, lowres, blurry"
    )
}

# Параметры для ADetailer (РУКИ - НЕ ИСПОЛЬЗУЕТСЯ, НО ОСТАВЛЕНО В КОДЕ)
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


def get_adetailer_params(
    face_params: Dict[str, Any] = None,
    hand_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Получить параметры для ADetailer.
    
    Классическая структура для WebUI API
    """
    # Если нет параметров, возвращаем пустую конфигурацию
    if not face_params and not hand_params:
        return {}
    
    # Формируем args как список словарей
    args = [True]  # Первый элемент - включить ADetailer
    
    # Добавляем параметры для face detection
    if face_params:
        args.append(face_params)
    
    # Добавляем параметры для hand detection
    if hand_params:
        args.append(hand_params)
    
    adetailer_config = {
        "ADetailer": {
            "args": args
        }
    }

    return adetailer_config


def get_generation_params(
    preset: str = "default",
    custom_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Получить параметры генерации по умолчанию.
    """
    base_params = DEFAULT_GENERATION_PARAMS.copy()
    
    # Проверяем флаг включения (теперь он True по умолчанию)
    if base_params.get("use_adetailer", False):
        print(">> [DEBUG] ADetailer ВКЛЮЧАЕТСЯ (Только лицо)") # Отладочное сообщение
        
        # Передаем ТОЛЬКО лицо (Hand=None)
        adetailer_config = get_adetailer_params(ADETAILER_FACE_PARAMS, None)
        
        base_params["alwayson_scripts"].update(adetailer_config)
        
        # Флаги для API WebUI, чтобы он понял, что расширение активно
        base_params["adetailer_enable"] = True
        
    else:
        print(">> [DEBUG] ADetailer ВЫКЛЮЧЕН")
        if "ADetailer" in base_params["alwayson_scripts"]:
            del base_params["alwayson_scripts"]["ADetailer"]
        base_params["adetailer_enable"] = False

    if custom_params:
        base_params.update(custom_params)

    return base_params


def get_fallback_values() -> Dict[str, Any]:
    """
    Получить fallback значения из DEFAULT_GENERATION_PARAMS.
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
    """
    from app.config.default_prompts import get_default_positive_prompts, get_default_negative_prompts
    
    return {
        "positive_prompt": get_default_positive_prompts(),
        "negative_prompt": get_default_negative_prompts()
    }


def should_use_adetailer(prompt: str, negative_prompt: str = "") -> bool:
    """
    Логика авто-определения (оставляем для совместимости, но сейчас включено принудительно)
    """
    face_keywords = [
        "face", "faces", "portrait", "head", "heads", "facial", "1girl", "1boy", "person"
    ]
    full_text = f"{prompt} {negative_prompt}".lower()
    return any(keyword in full_text for keyword in face_keywords)


def get_generation_params_with_smart_adetailer(
    preset: str = "default",
    custom_params: Dict[str, Any] = None,
    prompt: str = "",
    negative_prompt: str = "",
    force_adetailer: bool = None
) -> Dict[str, Any]:
    """
    Получить параметры генерации.
    """
    base_params = get_generation_params(preset, custom_params)
    
    # Если хотим умную логику, можно раскомментировать. 
    # Но сейчас работает то, что задано в get_generation_params (всегда вкл).
    
    return base_params

def diagnose_adetailer_delay():
    # ... (код диагностики оставляем без изменений или убираем, если не нужен) ...
    return {}