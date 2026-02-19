"""
Скрипт для массового перевода всех персонажей в БД.
Запускается ОДИН РАЗ для заполнения translations.

Usage:
    cd c:/project_A
    python translate_all_characters.py
"""
import asyncio
import sys
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, str(Path(__file__).parent))

from app.database.db import async_session_maker
from app.services.translation_service import auto_translate_and_save_character
from sqlalchemy import select
import logging

# ВАЖНО: Импортируем ВСЕ модели чтобы избежать ошибок SQLAlchemy
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users  # Нужен для relationships

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def translate_all_characters():
    """Переводит ВСЕ персонажи из БД на английский и сохраняет."""
    async with async_session_maker() as db:
        # Получаем ВСЕ персонажи
        result = await db.execute(
            select(CharacterDB).order_by(CharacterDB.id)
        )
        characters = result.scalars().all()
        
        total = len(characters)
        logger.info(f"Найдено {total} персонажей для перевода")
        
        translated_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, character in enumerate(characters, 1):
            try:
                # Проверяем, есть ли уже перевод
                if character.translations and character.translations.get('en'):
                    logger.info(f"[{idx}/{total}] Пропускаем {character.id} ({character.display_name}) - уже переведен")
                    skipped_count += 1
                    continue
                
                logger.info(f"[{idx}/{total}] Переводим {character.id}: {character.display_name}")
                
                # Переводим и сохраняем
                was_translated = await auto_translate_and_save_character(
                    character, db, target_lang='en'
                )
                
                if was_translated:
                    translated_count += 1
                    logger.info(f"✓ Персонаж {character.id} переведен")
                else:
                    skipped_count += 1
                
                # Небольшая задержка чтобы не перегружать Google Translate
                await asyncio.sleep(0.2)
                
            except Exception as e:
                error_count += 1
                logger.error(f"✗ Ошибка при переводе {character.id}: {e}")
                continue
        
        logger.info("=" * 80)
        logger.info(f"ИТОГО:")
        logger.info(f"  Всего персонажей: {total}")
        logger.info(f"  Переведено: {translated_count}")
        logger.info(f"  Пропущено (уже переведены): {skipped_count}")
        logger.info(f"  Ошибок: {error_count}")
        logger.info("=" * 80)


if __name__ == "__main__":
    print("Начинаем массовый перевод персонажей...")
    print("Это может занять несколько минут...")
    print()
    
    asyncio.run(translate_all_characters())
    
    print()
    print("Готово! Проверьте БД:")
    print("  SELECT id, display_name, translations->'en'->>'name' as en_name")
    print("  FROM characters")
    print("  WHERE translations IS NOT NULL")
    print("  LIMIT 10;")
