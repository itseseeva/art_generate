"""
Настройки по умолчанию для генерации изображений.
"""

from typing import Dict, Any

# ========================================
# Универсальные параметры генерации
# ========================================

DEFAULT_GENERATION_PARAMS = {
    "sampler_name": "Euler",
    "steps": 30,
    # SDXL требует минимум 1024x1024, используем портретный формат 832x1216
    "width": 832,
    "height": 1216,
    "scheduler": "Euler A",
    "cfg_scale": 4,
    "seed": -1,
    
    # LoRA модели для использования в генерации
    "lora_models": [
        {
            "name": "EasyNegativeV2",
            "weight": 0.7,
            "enabled": True
        },
        {
            "name": "DetailedEyes_V3",
            "weight": 0.6,
            "enabled": True
        },
        {
            "name": "Dramatic Lighting Slider",
            "weight": 0.5,
            "enabled": True
        },
        {
            "name": "Semi-realism_illustrious",
            "weight": 0.5,
            "enabled": True
        },
    ],
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

