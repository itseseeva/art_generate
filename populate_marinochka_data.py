import asyncio
import logging
import sys
from sqlalchemy import select
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
from app.services.translation_service import translate_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def populate_data():
    async with async_session_maker() as db:
        # Find characters that need migration (e.g. have appearance but no appearance_ru)
        # For now, let's target "Мариночка" specifically as requested, or generally all.
        # Let's target all characters that have appearance but are missing translations.
        
        stmt = select(CharacterDB)
        result = await db.execute(stmt)
        characters = result.scalars().all()
        
        for char in characters:
            logger.info(f"Checking character: {char.name}")
            
            updated = False
            
            # 1. Appearance
            if char.character_appearance:
                # If RU is missing, translate from EN (assuming character_appearance is source)
                # But wait, character_appearance might be EN.
                if not char.appearance_en:
                    char.appearance_en = char.character_appearance
                    updated = True
                    
                if not char.appearance_ru:
                    logger.info(f"Translating appearance for {char.name}...")
                    try:
                        translated = await translate_text(char.character_appearance, target='ru')
                        char.appearance_ru = translated
                        updated = True
                        logger.info(f"  -> {translated[:50]}...")
                    except Exception as e:
                        logger.error(f"Failed to translate appearance: {e}")

            # 2. Location
            if char.location:
                if not char.location_en:
                    char.location_en = char.location
                    updated = True
                    
                if not char.location_ru:
                    logger.info(f"Translating location for {char.name}...")
                    try:
                        translated = await translate_text(char.location, target='ru')
                        char.location_ru = translated
                        updated = True
                        logger.info(f"  -> {translated[:50]}...")
                    except Exception as e:
                        logger.error(f"Failed to translate location: {e}")
            
            if updated:
                db.add(char)
                await db.commit()
                await db.refresh(char)
                logger.info(f"Saved updates for {char.name}")
            else:
                logger.info(f"No updates needed for {char.name}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(populate_data())
