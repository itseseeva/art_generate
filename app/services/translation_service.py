import logging
from deep_translator import GoogleTranslator
import asyncio
from typing import Dict, Any, Optional
import re

logger = logging.getLogger(__name__)

async def translate_text(text: str, source: str = 'auto', target: str = 'en') -> str:
    """
    Translates text from source language to target language.
    """
    if not text:
        return ""
        
    try:
        # Run in executor to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        translator = GoogleTranslator(source=source, target=target)
        translated = await loop.run_in_executor(None, translator.translate, text)
        return translated
    except Exception as e:
        logger.error(f"Translation error ({source}->{target}): {e}")
        return text

def detect_language(text: str) -> str:
    """
    Simple language detection based on character set.
    Returns 'ru' or 'en'. Default 'en'.
    """
    if not text:
        return 'en'
        
    # Check for Cyrillic characters
    if re.search(r'[а-яА-ЯёЁ]', text):
        return 'ru'
    
    return 'en'

async def translate_character_fields(
    character_data: Dict[str, Any], 
    target_lang: str
) -> Dict[str, str]:
    """
    Translates specific character fields (name, description, etc.) to target language.
    Returns a dictionary of translated fields.
    """
    fields_to_translate = ['name', 'description', 'prompt', 'situation', 'instructions', 'firstMessage', 'personality', 'style', 'appearance', 'location']
    translated_data = {}
    
    source_lang = detect_language(character_data.get('name', '') + character_data.get('description', ''))
    
    # If source and target are the same, no need to translate (or we could, but it's redundant)
    if source_lang == target_lang:
        logger.info(f"Source language {source_lang} matches target {target_lang}, skipping translation")
        return {}
        
    logger.info(f"Translating character from {source_lang} to {target_lang}")
    
    for field in fields_to_translate:
        original_text = character_data.get(field)
        if original_text:
            translated_text = await translate_text(original_text, source=source_lang, target=target_lang)
            translated_data[field] = translated_text
            
    return translated_data


def extract_from_prompt(prompt: str) -> Dict[str, str]:
    """
    Извлекает поля из промпта персонажа (Appearance, Location, Personality, Situation).
    Поддерживает английские и русские заголовки.
    """
    if not prompt:
        return {}
        
    # Patterns to try for each field (in order of preference)
    # Patterns to try for each field (in order of preference)
    # Support markdown bold (**Header**:), markdown headers (## Header), and plain text
    field_patterns = {
        'personality': [
            r'(?:\*\*|##)?\s*Personality and Character(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Role-playing Situation|Instructions|Response Style|Lik|Dislik)|###|$)',
            r'(?:\*\*|##)?\s*Личность и Характер(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Ролевая Ситуация|Инструкции|Стиль Ответа|Лайк|Дизлайк)|###|$)',
            r'(?:\*\*|##)?\s*Personality(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Role-playing Situation|Instructions|Response Style)|###|$)',
            r'(?:\*\*|##)?\s*Личность(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Ролевая Ситуация|Инструкции|Стиль Ответа)|###|$)',
            r'(?:\*\*|##)?\s*Характер(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Ролевая Ситуация|Инструкции|Стиль Ответа)|###|$)',
        ],
        'situation': [
            r'(?:\*\*|##)?\s*Role-playing Situation(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Instructions|Response Style|Personality)|###|$)',
            r'(?:\*\*|##)?\s*Ролевая Ситуация(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Инструкции|Стиль Ответа|Личность)|###|$)',
            r'(?:\*\*|##)?\s*Situation(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Instructions|Response Style)|###|$)',
            r'(?:\*\*|##)?\s*Ситуация(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Инструкции|Стиль Ответа)|###|$)',
            r'(?:\*\*|##)?\s*Обстоятельства(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Инструкции|Стиль Ответа)|###|$)',
        ],
        'appearance': [
            r'(?:\*\*|##)?\s*Appearance(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Location|Personality|Role-playing|Instructions)|###|$)',
            r'(?:\*\*|##)?\s*Внешность(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Местоположение|Личность|Ролевая|Инструкции)|###|$)',
            r'(?:\*\*|##)?\s*Облик(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Местоположение|Личность|Ролевая|Инструкции)|###|$)',
        ],
        'location': [
            r'(?:\*\*|##)?\s*Location(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Personality|Role-playing|Instructions)|###|$)',
            r'(?:\*\*|##)?\s*Местоположение(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Личность|Ролевая|Инструкции)|###|$)',
            r'(?:\*\*|##)?\s*Локация(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Личность|Ролевая|Инструкции)|###|$)',
            r'(?:\*\*|##)?\s*Место(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Личность|Ролевая|Инструкции)|###|$)',
        ]
    }
    
    result = {}
    for key, patterns in field_patterns.items():
        found = False
        for pattern in patterns:
            try:
                match = re.search(pattern, prompt, re.DOTALL | re.IGNORECASE)
                if match:
                    val = match.group(1).strip()
                    # Если захватили слишком много (например до конца файла), но есть явные маркеры начала следующей секции,
                    # которые не попали в lookahead из-за сложности regex
                    # Попробуем почистить.
                    if val:
                        result[key] = val
                        found = True
                        break
            except Exception as e:
                logger.warning(f"Error in regex pattern {pattern}: {e}")
                continue
        
        # Fallback for 'situation': if not found, assume remainder of description or prompt if checking strictly?
        # No, dangerous.
    
    return result


def extract_from_english_prompt(prompt: str) -> Dict[str, str]:
    """
    Extracts fields from an English prompt using standard headers.
    Used after translating the entire prompt to English.
    """
    if not prompt:
        return {}
        
    field_patterns = {
        'personality': [
            r'(?:\*\*|##)?\s*Personality(?: and Character)?(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Role-playing Situation|Instructions|Response Style)|###|$)',
        ],
        'situation': [
            r'(?:\*\*|##)?\s*(?:Role-playing )?Situation(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Instructions|Response Style|Personality)|###|$)',
        ],
        'appearance': [
            r'(?:\*\*|##)?\s*Appearance(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Location|Personality|Role-playing|Instructions)|###|$)',
        ],
        'location': [
            r'(?:\*\*|##)?\s*Location(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Personality|Role-playing|Instructions)|###|$)',
        ]
    }
    
    result = {}
    for key, patterns in field_patterns.items():
        for pattern in patterns:
            try:
                match = re.search(pattern, prompt, re.DOTALL | re.IGNORECASE)
                if match:
                    val = match.group(1).strip()
                    if val:
                        result[key] = val
                        break
            except Exception:
                continue
    return result

async def auto_translate_and_save_character(character, db, target_lang: str = 'en', force: bool = False):
    """
    Automatically translates character fields using 'Translate Fields' strategy.
    Translates personality, situation, and instructions individually.
    """
    try:
        # Check if we really need to translate
        if not force:
            missing_fields = False
            if target_lang == 'en':
                # Check main fields
                if not character.situation_en or not character.personality_en:
                    missing_fields = True
                # Check optional fields: if source exists but target doesn't
                # Note: character.character_appearance/location are legacy/common fields that might hold the source text
                if (character.character_appearance or character.appearance_ru) and not character.appearance_en:
                    missing_fields = True
                if (character.location or character.location_ru) and not character.location_en:
                    missing_fields = True
            elif target_lang == 'ru':
                if not character.situation_ru or not character.personality_ru:
                    missing_fields = True
                if (character.character_appearance or character.appearance_en) and not character.appearance_ru:
                    missing_fields = True
                if (character.location or character.location_en) and not character.location_ru:
                    missing_fields = True
            
            if not missing_fields:
                # logger.info(f"Skipping translation for {character.id}, all fields present in {target_lang}")
                return False
        
        logger.info(f"[AUTO-TRANSLATE] Processing character {character.id} ({character.name}) -> {target_lang} (Force={force})")
        
        # Determine source data
        source_lang = 'ru' if target_lang == 'en' else 'en'
        
        source_style = ""
        source_appearance = ""
        source_location = ""
        
        if source_lang == 'ru':
            source_personality = character.personality_ru
            source_situation = character.situation_ru
            source_instructions = character.instructions_ru
            source_style = character.style_ru
            source_appearance = character.appearance_ru or character.character_appearance # Fallback to common if empty
            source_location = character.location_ru or character.location
        else: # source is EN
            source_personality = character.personality_en
            source_situation = character.situation_en
            source_instructions = character.instructions_en
            source_style = character.style_en
            source_appearance = character.appearance_en or character.character_appearance
            source_location = character.location_en or character.location
            
        # Translate Fields
        trans_personality = ""
        trans_situation = ""
        trans_instructions = ""
        trans_style = ""
        trans_appearance = ""
        trans_location = ""
        
        if source_personality:
            trans_personality = await translate_text(source_personality, source=source_lang, target=target_lang)
        if source_situation:
            trans_situation = await translate_text(source_situation, source=source_lang, target=target_lang)
        if source_instructions:
            trans_instructions = await translate_text(source_instructions, source=source_lang, target=target_lang)
        if source_style:
            trans_style = await translate_text(source_style, source=source_lang, target=target_lang)
        if source_appearance:
            trans_appearance = await translate_text(source_appearance, source=source_lang, target=target_lang)
        if source_location:
            trans_location = await translate_text(source_location, source=source_lang, target=target_lang)
            
        # Translate Name/Description/Tags (Common)
        fields_to_translate = {
            'name': character.display_name or character.name,
            'description': character.description or "",
        }
        final_common = {}
        for field, text in fields_to_translate.items():
            if text:
                final_common[field] = await translate_text(text, source='auto', target=target_lang)
            else:
                final_common[field] = ""
                
        # Tags
        translated_tags = []
        if character.tags:
            for tag in character.tags:
                try:
                    tag_str = tag if isinstance(tag, str) else str(tag)
                    if isinstance(tag, dict) and 'name' in tag:
                         tag_str = tag['name']
                    trans_tag = await translate_text(tag_str, target=target_lang)
                    translated_tags.append(trans_tag)
                except Exception:
                    translated_tags.append(str(tag))

        # Save to DB
        if target_lang == 'en':
            character.personality_en = trans_personality
            character.situation_en = trans_situation
            character.instructions_en = trans_instructions
            character.style_en = trans_style
            character.appearance_en = trans_appearance
            character.location_en = trans_location
            # We don't overwrite name/description as they are usually shared or specific columns?
            # description is RU only in model? "description = Column(UTF8Text... RU)"
            # There is no description_en anymore.
        elif target_lang == 'ru':
            character.personality_ru = trans_personality
            character.situation_ru = trans_situation
            character.instructions_ru = trans_instructions
            character.style_ru = trans_style
            character.appearance_ru = trans_appearance
            character.location_ru = trans_location
        
        await db.commit()
        await db.refresh(character)
        
        logger.info(f"[AUTO-TRANSLATE] ✓ Character {character.id} translated to {target_lang}")
        return True
        
    except Exception as e:
        logger.error(f"[AUTO-TRANSLATE] Error processing {character.id}: {e}", exc_info=True)
        await db.rollback()
        return False
