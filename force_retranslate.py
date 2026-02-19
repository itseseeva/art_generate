"""
Скрипт для ПРИНУДИТЕЛЬНОГО перевода всех персонажей (даже если translations уже существуют).
Используйте это если старые переводы неполные.

Usage:
    cd c:/project_A
    python force_retranslate.py
"""
import asyncio
import sys
from pathlib import Path

# Добавляем путь к проекту
sys.path.insert(0, str(Path(__file__).parent))

from app.database.db import async_session_maker
from app.services.translation_service import auto_translate_and_save_character
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
import logging

# ВАЖНО: Импортируем ВСЕ модели чтобы избежать ошибок SQLAlchemy
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users  # Нужен для relationships

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def force_retranslate_all():
    """ПРИНУДИТЕЛЬНО переводит ВСЕ персонажи, даже если переводы уже есть."""
    async with async_session_maker() as db:
        # Получаем ВСЕ персонажи
        result = await db.execute(
            select(CharacterDB).order_by(CharacterDB.id)
        )
        characters = result.scalars().all()
        
        total = len(characters)
        logger.info(f"Найдено {total} персонажей для ПРИНУДИТЕЛЬНОГО перевода")
        
        translated_count = 0
        error_count = 0
        
        for idx, character in enumerate(characters, 1):
            try:
                logger.info(f"[{idx}/{total}] ПРИНУДИТЕЛЬНО переводим {character.id}: {character.display_name}")
                
                # ОЧИЩАЕМ старый перевод
                if character.translations and 'en' in character.translations:
                    character.translations.pop('en', None)
                    flag_modified(character, 'translations')
                    await db.commit()
                    await db.refresh(character)
                
                # Переводим и сохраняем
                was_translated = await auto_translate_and_save_character(
                    character, db, target_lang='en'
                )
                
                if was_translated:
                    translated_count += 1
                    logger.info(f"✓ Персонаж {character.id} переведен")
                else:
                    logger.warning(f"⚠ Персонаж {character.id} - перевод не выполнен")
                
                # Небольшая задержка чтобы не перегружать Google Translate
                await asyncio.sleep(0.3)
                
            except Exception as e:
                error_count += 1
                logger.error(f"✗ Ошибка при переводе {character.id}: {e}")
                continue
        
        logger.info("=" * 80)
        logger.info(f"ИТОГО:")
        logger.info(f"  Всего персонажей: {total}")
        logger.info(f"  Переведено: {translated_count}")
        logger.info(f"  Ошибок: {error_count}")
        logger.info("=" * 80)


if __name__ == "__main__":
    print("🔄 ПРИНУДИТЕЛЬНЫЙ перевод всех персонажей...")
    print("⚠️  Это перезапишет ВСЕ существующие переводы!")
    print("⏱  Это может занять 5-10 минут...")
    print()
    
    asyncio.run(force_retranslate_all())
    
    print()
    print("✅ Готово! Все персонажи переведены заново.")
