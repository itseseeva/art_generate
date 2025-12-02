"""
Модуль с дефолтными промптами для улучшения качества генерации.
ИСПРАВЛЕНО: Убраны противоречивые промпты, добавлены промпты против коллажей
"""

DEFAULT_POSITIVE_PROMPTS = [
    "Clean lines",
    "Smooth skin",
    "Perfect hands",
    "Detailed realistic hair",
    "Detailed realistic face",
    "Detailed realistic body",
    "Detailed realistic hands",
    "Detailed realistic feet",
    "Detailed realistic legs",
    "Detailed realistic boobs",
    "Realistic lighting",
    "Dramatic lighting",
    "Cinematic lighting",
    "Volumetric lighting",
    "Hi-Res",
    "Masterpiece",
    "Best quality",
    "Artwork",
    "Semi-Realistic",
    "Lazypos",
    "Raw",
    "((Photorealistic))",
    "((Realistic Tint))",
    "Highly aesthetic",
    "Depth of field",
    "High-Res",
    "Absurdres",
    "Newst-ai"
]


DEFAULT_NEGATIVE_PROMPTS = [
    'poorly_detailed',
    'worst_quality',
    'bad_quality',
    'extra fingers',
    'missing fingers',
    'lowres',
    'low resolution bad anatomy',
    'extra digits',
    'jpeg artifacts',
    'signature',
    'watermark',
    'username',
    'conjoined',
    'deformed fingers',
    'short legs',
    'body diproportion',
    'bad ai-generated',
    'text',
    'halo',
    'multiple views',
    'displeasing',
    'messy composition',
    'clones'
]
# Дополнительные промпты для конкретных ситуаций


# Функция для получения промптов
def get_default_positive_prompts() -> str:
    """Возвращает строку с дефолтными позитивными промптами"""
    return ", ".join(DEFAULT_POSITIVE_PROMPTS)

def get_default_negative_prompts() -> str:
    """Возвращает строку с дефолтными негативными промптами"""
    return ", ".join(DEFAULT_NEGATIVE_PROMPTS)

def get_enhanced_prompts(base_prompt: str, use_defaults: bool = True) -> tuple[str, str]:
    """
    Улучшает базовый промпт, добавляя дефолтные промпты
    
    Args:
        base_prompt: Базовый промпт пользователя
        use_defaults: Использовать ли дефолтные промпты
        
    Returns:
        tuple: (enhanced_positive, enhanced_negative)
    """
    if not use_defaults:
        return base_prompt, ""
    
    # Добавляем дефолтные промпты к базовому
    enhanced_positive = f"{get_default_positive_prompts()}, {base_prompt}"
    enhanced_negative = get_default_negative_prompts()
    
    # Удаляем дубликаты
    enhanced_positive = deduplicate_prompt(enhanced_positive)
    enhanced_negative = deduplicate_prompt(enhanced_negative)
    
    return enhanced_positive, enhanced_negative

def deduplicate_prompt(prompt: str) -> str:
    """
    Удаляет дублирующиеся слова из промпта
    
    Args:
        prompt: Промпт для обработки
        
    Returns:
        Промпт без дубликатов
    """
    if not prompt:
        return prompt
    
    # Разбиваем на слова, убираем пробелы
    words = [word.strip() for word in prompt.split(",") if word.strip()]
    
    # Удаляем дубликаты, сохраняя порядок
    seen = set()
    unique_words = []
    for word in words:
        if word not in seen:
            seen.add(word)
            unique_words.append(word)
    
    return ", ".join(unique_words) 