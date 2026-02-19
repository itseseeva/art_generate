import asyncio
import logging
import sys
import os

# Set up path
sys.path.insert(0, os.getcwd())

from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
# Import Users to ensure registry knows about it
from app.models.user import Users
from sqlalchemy import select
from app.services.translation_service import auto_translate_and_save_character, detect_language

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def debug_character(char_name_part):
    async with async_session_maker() as db:
        # Find character
        query = select(CharacterDB).where(CharacterDB.name.ilike(f"%{char_name_part}%"))
        result = await db.execute(query)
        char = result.scalars().first()
        
        if not char:
            logger.error(f"Character matching '{char_name_part}' not found.")
            return

        logger.info(f"Found character: {char.name} (ID: {char.id})")
        
        # Check current translations
        translations = char.translations or {}
        en_trans = translations.get('en', {})
        
        logger.info(f"Current EN Translations keys: {list(en_trans.keys())}")
        situation = en_trans.get('situation', '')
        logger.info(f"Current Situation (First 100 chars): {situation[:100]}...")
        
        lang = detect_language(situation)
        logger.info(f"Detected language of Situation: {lang}")
        
        if lang == 'ru':
            logger.info("PROBLEM DETECTED: Situation is in Russian but stored in 'en' translation slot!")
        
        # Force translate
        logger.info("Forcing auto_translate_and_save_character...")
        # Note: We need to make sure the function logic forces update if it detects RU
        # Currently it might skip if field is present.
        
        # To test the FIX, we will manually clear the translation and run it.
        # But first let's run it "as is" to see if it skips.
        
        was_updated = await auto_translate_and_save_character(char, db, 'en')
        logger.info(f"auto_translate_and_save_character returned: {was_updated}")
        
        # Reload
        await db.refresh(char)
        new_situation = char.translations.get('en', {}).get('situation', '')
        logger.info(f"New Situation (First 100 chars): {new_situation[:100]}...")
        
        if detect_language(new_situation) == 'ru':
             logger.error("STILL RUSSIAN AFTER UPDATE!")
        else:
             logger.info("SUCCESS! Became English (or empty).")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_character("Мария"))
