"""
Настройки специально для модели deepseek/deepseek-chat-v3-0324.
DeepSeek V3 - это современная модель с высокой скоростью и отличным пониманием контекста.
"""

from typing import Dict, Any

DEEPSEEK_CONFIG = {
    # --- Параметры генерации ---
    # DeepSeek рекомендует температуру 1.3 для general conversation
    # (с учетом внутреннего маппинга API temp 1.3 = model temp ~0.4)
    "temperature": 1.3,
    "top_p": 0.95,
    "top_k": 50,
    
    # Min P для фильтрации низкокачественных токенов
    "min_p": 0.05,
    
    # Штраф за повторения (умеренный)
    "repetition_penalty": 1.05,
    
    # Presence и frequency penalty
    "presence_penalty": 0.0,
    "frequency_penalty": 0.0,
    
    # --- Лимиты ---
    "max_tokens": 800,  # Длина одного ответа
    # Контекст управляется через подписку: 8000 для STANDARD, 16000 для PREMIUM
    # DeepSeek v3 технически поддерживает до 64k, но ограничиваем тарифным планом
    
    # --- Инструкции ---
    # DeepSeek хорошо понимает системные инструкции
    "system_suffix": "\n\nStay in character. Write engaging, descriptive responses. Describe actions in asterisks *like this*. Focus on natural dialogue and emotional depth.",
    
    # Стоп-токены - DeepSeek использует стандартные
    "stop": []
}

def get_deepseek_overrides() -> Dict[str, Any]:
    """
    Возвращает словарь с параметрами для переопределения стандартных настроек.
    """
    return {
        "temperature": DEEPSEEK_CONFIG["temperature"],
        "top_p": DEEPSEEK_CONFIG["top_p"],
        "top_k": DEEPSEEK_CONFIG["top_k"],
        "min_p": DEEPSEEK_CONFIG["min_p"],
        "repetition_penalty": DEEPSEEK_CONFIG["repetition_penalty"],
        "presence_penalty": DEEPSEEK_CONFIG["presence_penalty"],
        "frequency_penalty": DEEPSEEK_CONFIG["frequency_penalty"],
        "stop": DEEPSEEK_CONFIG["stop"]
    }
