"""
Настройки по умолчанию для генерации изображений Stable Diffusion.
"""

from typing import Dict, Any
import os
import time

# ========================================
# SDXL (oneObsession_v18) - Параметры для WebUI Forge
# ========================================
# Оптимизированные параметры для быстрой генерации на RTX 3060
# ВАЖНО: Для SDXL используем 25-30 steps и CFG 5-7
# ========================================

DEFAULT_GENERATION_PARAMS = {
    "sampler_name": "Euler",
    "steps": 24,  # Чуть поднял шаги для качества (25 маловато, 28-30 лучше)
    "width": 768,
    "height": 1344,
    "scheduler": "karras",
    "cfg_scale": 4,
    
    # !!! ИСПРАВЛЕНИЕ 1: Выключаем встроенную улучшалку (она портит аниме) !!!
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
    
    # !!! ИСПРАВЛЕНИЕ 2: ADetailer !!!
    # Включаем с пустыми args - WebUI использует дефолтные настройки
    "use_adetailer": True, 

    "alwayson_scripts": {},
    
    "lora_models": [
        # АКТИВНЫЕ LoRA (файлы загружены в models/Lora/)
        {
            "name": "EasyNegativeV2.safetensors",
            "weight": 0.7,
            "enabled": True
        },
        {
            "name": "DetailedEyes_V3.safetensors",
            "weight": 0.6,
            "enabled": True
        },
        {
            "name": "Dramatic Lighting Slider.safetensors",
            "weight": 0.5,
            "enabled": True
        },
        {
            "name": "Semi-realism_illustrious.safetensors",
            "weight": 0.7,
            "enabled": True
        },
        # ОТКЛЮЧЁННЫЕ LoRA (файлов нет)
        {
            "name": "pastel-anime-xl-latest",
            "weight": 0.4,
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
            "name": "MysticalPlantPenetratorILLUST.safetensors",
            "weight": 0.25,
            "enabled": False
        },
        {
            "name": "Detailed-Eye-V1.0-000013.safetensors",
            "weight": 0.8,
            "enabled": False
        },
        {
            "name": "kms_in the dark_IL-000003.safetensors",
            "weight": 0.5,
            "enabled": False
        },
    ],
    "clip_skip": 2,
    "seed": -1,
}

# ========================================
# ADetailer параметры (ИСПОЛЬЗУЕТСЯ)
# ========================================
ADETAILER_FACE_PARAMS = {
    # Правильная конфигурация согласно ADetailerArgs из args.py
    "ad_model": "mediapipe_face_mesh_eyes_only",
    "ad_model_classes": "",
    "ad_tab_enable": True,
    "ad_prompt": "detailed beautiful eyes, detailed iris",
    "ad_negative_prompt": "deformed eyes, blurry, bad anatomy, double pupil",
    "ad_confidence": 0.3,
    "ad_mask_filter_method": "Area",
    "ad_mask_k": 0,  # ПРАВИЛЬНОЕ название (НЕ ad_mask_k_largest!)
    "ad_mask_min_ratio": 0.0,
    "ad_mask_max_ratio": 1.0,
    "ad_dilate_erode": 4,
    "ad_x_offset": 0,
    "ad_y_offset": 0,
    "ad_mask_merge_invert": "None",
    "ad_mask_blur": 4,
    "ad_denoising_strength": 0.5,  # Увеличено для более сильной обработки
    "ad_inpaint_only_masked": True,
    "ad_inpaint_only_masked_padding": 32,
    "ad_use_inpaint_width_height": False,
    "ad_inpaint_width": 768,
    "ad_inpaint_height": 768,
    "ad_use_steps": True,  # Принудительно используем кастомные шаги
    "ad_steps": 10,  # Количество шагов для обработки глаз
    "ad_use_cfg_scale": True,
    "ad_cfg_scale": 4,
    "ad_use_checkpoint": False,
    "ad_checkpoint": None,
    "ad_use_vae": False,
    "ad_vae": None,
    "ad_use_sampler": False,
    "ad_sampler": "DPM++ 2M Karras",
    "ad_scheduler": "Use same scheduler",
    "ad_use_noise_multiplier": False,
    "ad_noise_multiplier": 1.0,
    "ad_use_clip_skip": False,
    "ad_clip_skip": 1,
    "ad_restore_face": False,
    "ad_controlnet_model": "None",
    "ad_controlnet_module": "None",
    "ad_controlnet_weight": 1.0,
    "ad_controlnet_guidance_start": 0.0,
    "ad_controlnet_guidance_end": 1.0,
    "is_api": True,  # ← КРИТИЧЕСКИ важно для API!
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
    Передаем ADetailer с двумя конфигами: первый включен, второй ОТКЛЮЧЕН
    Это предотвращает автоматическое добавление дефолтного face_yolov8n
    """
    # Если нет параметров, возвращаем пустую конфигурацию
    if not face_params and not hand_params:
        return {}
    
    args = [True]  # Включить ADetailer
    
    # Первый детектор - mediapipe (ВКЛЮЧЕН)
    if face_params:
        args.append(face_params)
    
    # Второй детектор - полный конфиг с ad_model="None" (ОТКЛЮЧЕН)
    # Копируем структуру первого детектора, но с ad_model="None"
    disabled_config = face_params.copy() if face_params else {}
    disabled_config["ad_model"] = "None"
    args.append(disabled_config)
    
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
    
    # Проверяем флаг включения ADetailer
    if base_params.get("use_adetailer", False):
        print(">> [DEBUG] ADetailer ВКЛЮЧАЕТСЯ (mediapipe_face_mesh_eyes_only)")
        
        # Передаем конфиг с mediapipe
        adetailer_config = get_adetailer_params(ADETAILER_FACE_PARAMS, None)
        
        base_params["alwayson_scripts"].update(adetailer_config)
        base_params["adetailer_enable"] = True
    else:
        print(">> [DEBUG] ADetailer ВЫКЛЮЧЕН")
        if "ADetailer" in base_params["alwayson_scripts"]:
            del base_params["alwayson_scripts"]["ADetailer"]
        base_params["adetailer_enable"] = False
    
    # Удаляем use_adetailer из параметров (не нужен в запросе)
    base_params.pop("use_adetailer", None)

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