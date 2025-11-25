"""
Утилиты для валидации имен персонажей.
"""

import re
from typing import Tuple


def validate_character_name(name: str) -> Tuple[bool, str]:
    """
    Валидирует имя персонажа на соответствие требованиям.
    
    Args:
        name: Имя персонажа для проверки
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not name:
        return False, "Character name cannot be empty"
    
    if len(name.strip()) == 0:
        return False, "Character name cannot consist only of spaces"
    
    # Проверяем длину
    if len(name) < 2:
        return False, "Character name must contain at least 2 characters"
    
    if len(name) > 50:
        return False, "Character name cannot be longer than 50 characters"
    
    # Проверяем, что имя содержит только буквы (английские и русские),
    # цифры, пробелы, дефисы и подчеркивания
    # Разрешаем кириллицу (а-я, А-Я, ё), латиницу (a-z, A-Z),
    # цифры, пробелы, дефисы и подчеркивания
    if not re.match(r'^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$', name):
        return False, (
            "Character name can only contain letters "
            "(English and Russian), numbers, spaces, hyphens and underscores"
        )
    
    # Проверяем, что имя не начинается и не заканчивается пробелом
    if name != name.strip():
        return False, "Character name cannot start or end with spaces"
    
    # Проверяем, что имя содержит хотя бы одну букву (английскую или русскую)
    if not re.search(r'[a-zA-Zа-яА-ЯёЁ]', name):
        return False, "Character name must contain at least one letter"
    
    return True, ""


def sanitize_character_name(name: str) -> str:
    """
    Очищает имя персонажа, оставляя только допустимые символы.
    
    Args:
        name: Исходное имя персонажа
        
    Returns:
        str: Очищенное имя персонажа
    """
    if not name:
        return ""
    
    # Оставляем только буквы (английские и русские), цифры,
    # пробелы, дефисы и подчеркивания
    cleaned = re.sub(r'[^a-zA-Zа-яА-ЯёЁ0-9\s\-_]', '', name)
    
    # Убираем множественные пробелы
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Убираем пробелы в начале и конце
    cleaned = cleaned.strip()
    
    return cleaned


def get_character_name_suggestions(invalid_name: str) -> list[str]:
    """
    Предлагает варианты исправления имени персонажа.
    
    Args:
        invalid_name: Некорректное имя персонажа
        
    Returns:
        list[str]: Список предложений
    """
    suggestions = []
    
    # Очищаем имя
    cleaned = sanitize_character_name(invalid_name)
    if cleaned and cleaned != invalid_name:
        suggestions.append(cleaned)
    
    # Предлагаем транслитерацию для кириллицы
    cyrillic_to_latin = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    }
    
    transliterated = ""
    for char in invalid_name:
        if '\u0400' <= char <= '\u04FF':  # Кириллические символы
            transliterated += cyrillic_to_latin.get(char, char)
        elif char.isalnum() or char in ' -_':
            transliterated += char
        else:
            transliterated += '_'
    
    # Очищаем результат транслитерации
    transliterated = re.sub(r'_+', '_', transliterated).strip('_')
    transliterated = re.sub(r'\s+', ' ', transliterated).strip()
    
    if transliterated and transliterated != invalid_name:
        suggestions.append(transliterated.lower())
    
    # Предлагаем популярные английские имена
    popular_names = ['anna', 'caitlin', 'sarah', 'emma', 'olivia', 'sophia', 'ava', 'isabella', 'charlotte', 'mia']
    suggestions.extend(popular_names[:3])  # Добавляем первые 3 популярных имени
    
    return suggestions[:5]  # Возвращаем максимум 5 предложений
