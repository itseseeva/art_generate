"""
Утилиты для фильтрации сообщений перед отправкой в текстовую модель.
"""

import re
from typing import Optional


def is_image_generation_prompt(content: str) -> bool:
    """
    Определяет, является ли сообщение промптом для генерации изображения.
    
    Промпты для генерации изображений обычно:
    - Очень длинные (более 200 символов)
    - Содержат много ключевых слов через запятую
    - Содержат специфичные теги в скобках: (1girl), (masterpiece), и т.д.
    - Содержат описания визуальных элементов: eyes, hair, body, и т.д.
    - Не содержат обычного текста диалога
    
    Args:
        content: Содержимое сообщения
        
    Returns:
        True если это промпт для генерации изображения, False иначе
    """
    if not content or len(content.strip()) < 50:
        return False
    
    content_lower = content.lower()
    
    # Проверяем длину - промпты для изображений обычно очень длинные
    if len(content) < 200:
        return False
    
    # Проверяем наличие специфичных тегов Stable Diffusion
    sd_tags = [
        r'\(1girl\)', r'\(1boy\)', r'\(masterpiece\)', r'\(best quality\)',
        r'\(high detail\)', r'\(ultra.*hd\)', r'\(8k\)', r'\(photorealistic\)',
        r'\(cinematic.*lighting\)', r'\(depth of field\)', r'\(blurred.*background\)',
        r'\(impressionism\)', r'\(realistic\)', r'\(aesthetic\)',
        r'large breasts', r'breasts', r'pussy', r'vagina', r'penis',
        r'eyes', r'hair', r'body', r'waist', r'legs', r'arms',
        r'expression', r'pose', r'clothing', r'jewelry',
        r'outdoors', r'indoor', r'background', r'lighting',
        r'snow', r'winter', r'summer', r'field', r'tree',
        r'citrine', r'elf ears', r'choker', r'makeup',
        r'goth', r'bow', r'eyelashes'
    ]
    
    tag_count = sum(1 for tag in sd_tags if re.search(tag, content_lower, re.IGNORECASE))
    
    # Если найдено много тегов (более 5), это скорее всего промпт для изображения
    if tag_count >= 5:
        return True
    
    # Проверяем структуру - промпты обычно содержат много запятых и скобок
    comma_count = content.count(',')
    paren_count = content.count('(') + content.count(')')
    
    # Если очень много запятых (более 10) и скобок (более 5), это промпт
    if comma_count >= 10 and paren_count >= 5:
        return True
    
    # Проверяем соотношение длины к количеству слов
    # Промпты обычно очень длинные, но содержат относительно мало уникальных слов
    words = content.split()
    unique_words = len(set(word.lower().strip('(),[]{}') for word in words))
    
    # Если длина большая, но уникальных слов относительно мало, это промпт
    if len(content) > 500 and unique_words < len(words) * 0.3:
        return True
    
    # Проверяем наличие специфичных паттернов промптов
    prompt_patterns = [
        r'^\s*[a-z_]+(?:\s*,\s*[a-z_]+)+',  # Много ключевых слов через запятую в начале
        r'\([^)]+:\d+\.\d+\)',  # Веса в скобках: (word:1.5)
        r'\[.*\]',  # Квадратные скобки для негативных промптов
    ]
    
    pattern_matches = sum(1 for pattern in prompt_patterns if re.search(pattern, content, re.IGNORECASE))
    
    # Если найдено несколько паттернов, это промпт
    if pattern_matches >= 2:
        return True
    
    return False


def should_include_message_in_context(content: Optional[str], role: str) -> bool:
    """
    Определяет, должно ли сообщение быть включено в контекст для текстовой модели.
    
    Args:
        content: Содержимое сообщения
        role: Роль сообщения (user/assistant)
        
    Returns:
        True если сообщение должно быть включено, False иначе
    """
    if not content:
        return False
    
    # Пропускаем промпты для генерации изображений
    if is_image_generation_prompt(content):
        return False
    
    # Пропускаем сообщения, которые содержат только ссылку на изображение
    if role == "assistant" and content.strip().startswith("[image:") and content.strip().endswith("]"):
        # Это сообщение только с изображением, без текста - пропускаем
        return False
    
    # Пропускаем очень короткие сообщения (менее 3 символов)
    if len(content.strip()) < 3:
        return False
    
    return True

