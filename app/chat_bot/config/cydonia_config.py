"""
Настройки специально для модели thedrummer/cydonia-24b-v4.1.
Эта модель основана на Mistral-Nemo-12B-2407 и оптимизирована для ролевых игр и сложных инструкций.
"""

from typing import Dict, Any

CYDONIA_CONFIG = {
    # --- Параметры генерации ---
    # Cydonia хорошо работает при умеренной температуре
    "temperature": 0.8,
    "top_p": 0.9,
    "top_k": 50,
    
    # Рекомендуемый Min P для Mistral-основанных моделей
    "min_p": 0.07,
    
    # Штраф за повторения (умеренный)
    "repetition_penalty": 1.05,
    
    # Presence и frequency penalty
    "presence_penalty": 0.0,
    "frequency_penalty": 0.0,
    
    # --- Лимиты ---
    "max_tokens": 800,  # Длина одного ответа
    # Контекст управляется через подписку: 8000 для STANDARD, 16000 для PREMIUM
    
    # --- Инструкции ---
    # Cydonia отлично понимает системные инструкции без специальных префиксов
    "system_suffix": "\n\nStay in character. Write engaging, descriptive responses. Describe actions in asterisks *like this*. Focus on the current atmosphere and emotional depth.",
    
    # Специальные стоп-токены
    "stop": ["<|im_start|>", "<|im_end|>", "</s>"]
}

def get_cydonia_overrides() -> Dict[str, Any]:
    """
    Возвращает словарь с параметрами для переопределения стандартных настроек.
    """
    return {
        "temperature": CYDONIA_CONFIG["temperature"],
        "top_p": CYDONIA_CONFIG["top_p"],
        "top_k": CYDONIA_CONFIG["top_k"],
        "min_p": CYDONIA_CONFIG["min_p"],
        "repetition_penalty": CYDONIA_CONFIG["repetition_penalty"],
        "presence_penalty": CYDONIA_CONFIG["presence_penalty"],
        "frequency_penalty": CYDONIA_CONFIG["frequency_penalty"],
        "stop": CYDONIA_CONFIG["stop"]
    }
