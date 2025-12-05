"""
Модуль с дефолтными промптами для улучшения качества генерации.

========================================
FLUX.1 Schnell - Упрощенные промпты
========================================
FLUX понимает естественный язык и рисует детали идеально.
Сложные промпты не требуются и могут замедлить генерацию.
========================================
"""

__all__ = ['DEFAULT_POSITIVE_PROMPTS', 'DEFAULT_NEGATIVE_PROMPTS', 'get_default_positive_prompts', 
           'get_default_negative_prompts', 'get_enhanced_prompts', 'clean_prompt', 'deduplicate_prompt', 
           'get_lora_string', 'remove_missing_loras']

DEFAULT_POSITIVE_PROMPTS = [
    "Clean lines",
    "Perfect hands",
    "Detailed realistic hair",
    "Detailed realistic face",
    "Detailed realistic body",
    "Detailed realistic hands",
    "Detailed realistic feet",
    "Detailed realistic legs",
    "Detailed realistic boobs",
    "Detailed realistic eyes",
    "Realistic lighting",
    "Dramatic lighting",
    "perfect eyes",
    "beautiful iris",
    "symmetrical face",
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
    Улучшает базовый промпт, добавляя дефолтные промпты и LoRA
    
    Args:
        base_prompt: Базовый промпт пользователя (идёт первым!)
        use_defaults: Использовать ли дефолтные промпты
        
    Returns:
        tuple: (enhanced_positive, enhanced_negative)
    """
    if not use_defaults:
        return base_prompt, ""
    
    # Проверяем, есть ли уже LoRA теги в промпте пользователя
    has_lora = '<lora:' in base_prompt.lower()
    
    # ПРОМПТ ПОЛЬЗОВАТЕЛЯ ИДЁТ ПЕРВЫМ, потом дефолтные
    enhanced_positive = f"{base_prompt}, {get_default_positive_prompts()}"
    
    # Добавляем наши LoRA ТОЛЬКО если в промпте их ещё нет
    if not has_lora:
        lora_string = get_lora_string()
        if lora_string:
            enhanced_positive = f"{enhanced_positive}, {lora_string}"
    
    enhanced_negative = get_default_negative_prompts()
    
    # Удаляем дубликаты
    enhanced_positive = deduplicate_prompt(enhanced_positive)
    enhanced_negative = deduplicate_prompt(enhanced_negative)
    
    return enhanced_positive, enhanced_negative

def clean_prompt(prompt: str) -> str:
    """
    Очищает промпт от переносов строк и лишних символов
    
    Args:
        prompt: Промпт для очистки
        
    Returns:
        Очищенный промпт
    """
    if not prompt:
        return prompt
    
    # Заменяем \n на запятые
    prompt = prompt.replace('\n', ', ')
    
    # Заменяем множественные запятые на одну
    prompt = ', '.join([part.strip() for part in prompt.split(',') if part.strip()])
    
    return prompt

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
    
    # Сначала очищаем от \n
    prompt = clean_prompt(prompt)
    
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

def get_lora_string() -> str:
    """
    Формирует строку с LoRA моделями для добавления в промпт
    
    Returns:
        Строка с LoRA в формате <lora:name:weight>
    """
    from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
    
    lora_models = DEFAULT_GENERATION_PARAMS.get("lora_models", [])
    lora_parts = []
    
    for lora in lora_models:
        if lora.get("enabled", False):
            name = lora.get("name", "")
            weight = lora.get("weight", 1.0)
            
            # Убираем расширение .safetensors из имени для промпта
            clean_name = name.replace(".safetensors", "")
            
            lora_parts.append(f"<lora:{clean_name}:{weight}>")
    
    return " ".join(lora_parts)

def remove_missing_loras(prompt: str) -> str:
    """
    Удаляет из промпта LoRA теги для которых нет файлов
    
    Args:
        prompt: Промпт с возможными LoRA тегами
        
    Returns:
        Промпт только с существующими LoRA
    """
    import re
    from pathlib import Path
    
    # Список существующих LoRA файлов
    lora_dir = Path("stable-diffusion-webui-forge-main/models/Lora")
    if not lora_dir.exists():
        # Если папка не существует, удаляем все LoRA теги
        return re.sub(r'<lora:[^>]+>', '', prompt)
    
    existing_loras = {f.stem.lower(): f.name for f in lora_dir.glob("*.safetensors")}
    
    # Находим все LoRA теги в промпте
    lora_pattern = r'<lora:([^:]+):([^>]+)>'
    
    def check_lora(match):
        lora_name = match.group(1).strip()
        weight = match.group(2).strip()
        
        # Проверяем существование файла (без учёта регистра)
        if lora_name.lower() in existing_loras:
            return match.group(0)  # Оставляем тег
        else:
            return ''  # Удаляем тег
    
    # Заменяем LoRA теги
    cleaned_prompt = re.sub(lora_pattern, check_lora, prompt)
    
    # Убираем множественные пробелы и запятые
    cleaned_prompt = re.sub(r'\s+', ' ', cleaned_prompt)
    cleaned_prompt = re.sub(r',\s*,', ',', cleaned_prompt)
    cleaned_prompt = cleaned_prompt.strip()
    
    return cleaned_prompt 