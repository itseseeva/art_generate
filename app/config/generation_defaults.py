"""
Настройки по умолчанию для генерации изображений.
"""

from typing import Dict, Any

# ========================================
# Универсальные параметры генерации
# ========================================

DEFAULT_GENERATION_PARAMS = {
    "sampler_name": "DPM++ 2M Karras",  # Лучше для semi-realism
    "steps": 28,  # Оптимум для DPM++
    # SDXL требует минимум 1024x1024, используем портретный формат 832x1216
    "width": 832,
    "height": 1216,
    "scheduler": "DPM++ 2M Karras",
    "cfg_scale": 4,  # 3-5 для DPM++
    "seed": 1668578321,
    
    # LoRA: Dramatic Lighting Slider
    # Контролирует интенсивность света и теней
    "lora_scale": 0.5,  # 0.0-1.0, рекомендуется 0.3-0.7
}

def get_generation_params(
    preset: str = "default",
    custom_params: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Получить параметры генерации по умолчанию.
    """
    base_params = DEFAULT_GENERATION_PARAMS.copy()

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
    from app.config.default_prompts import (
        get_default_positive_prompts,
        get_default_negative_prompts
    )
    
    return {
        "positive_prompt": get_default_positive_prompts(),
        "negative_prompt": get_default_negative_prompts()
    }

