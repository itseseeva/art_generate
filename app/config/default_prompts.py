"""
Модуль с дефолтными промптами для улучшения качества генерации.
ИСПРАВЛЕНО: Убраны противоречивые промпты, добавлены промпты против коллажей
"""

DEFAULT_POSITIVE_PROMPTS = [
    "full body",
    "large expressive eyes",
    "detailed eyes",
    "clean lines",
    "smooth skin",
    "perfect hands",
    "detailed realistic hair",
    "detailed realistic face",
    "detailed realistic body",
    "detailed realistic hands",
    "detailed realistic feet",
    "detailed realistic legs",
    "detailed realistic tits",
    "realistic lighting",
    "dramatic lighting",
    "cinematic lighting",
    "volumetric lighting",
    "backlit",
    "side lighting",
    "side lit",
    "light particles",
    "light rays",
    "haze",
    "fog",
    "high resolution",
    "masterpiece",
    "best quality",
    "concept art",
    "artwork",
    "bold outlines",
    "impressionistic",
    "phosphorescent dust particles floating in the air",
    "semi-realistic",
    "lazypos",
    "raw",
    "((photorealistic))",
    "((realistic shade))",
    "very aesthetic",
    "depth of field",
    "highres",
    "absurdres",
    "newst-ai",
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
    'furry',
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