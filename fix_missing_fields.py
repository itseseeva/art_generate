import asyncio
import sys
import re
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Import Users model first to ensure it's registered in SQLAlchemy
# This fixes "InvalidRequestError: ... expression 'Users' failed to locate a name"
from app.models import Users  

from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
from app.services.translation_service import auto_translate_and_save_character
from sqlalchemy import select
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_cyrillic(text):
    if not text: return False
    return bool(re.search('[а-яА-Я]', text))

async def fix_translations():
    async with async_session_maker() as db:
        result = await db.execute(select(CharacterDB))
        characters = result.scalars().all()
        
        count = 0
        for char in characters:
            needs_update = False
            # Ensure translations is a dict
            if not char.translations:
                 char.translations = {}
                 
            trans = char.translations.get('en', {})
            
            # Check for missing keys or empty values in core fields
            # We don't check for cyrillic strictly because some names/terms might be cyrillic, 
            # but appearance/location should be mostly English.
            # If 'appearance' is missing, it falls back to Russian in frontend, so we must fix missing keys.
            
            fields_to_check = ['appearance', 'location', 'personality', 'situation']
            
            for field in fields_to_check:
                val = trans.get(field)
                # If value is missing/empty, OR if it has significant Cyrillic content (e.g. > 50%? No, just any for now)
                # Actually, if it is completely missing, we definitely need update.
                if not val:
                    logger.info(f"Character {char.id} ({char.name}): Field '{field}' is MISSING/EMPTY.")
                    needs_update = True
                    break
                
                # If it is present but looks like untranslated Russian
                if is_cyrillic(val):
                     logger.info(f"Character {char.id} ({char.name}): Field '{field}' contains Cyrillic.")
                     needs_update = True
                     break

            if needs_update:
                logger.info(f"Re-translating character {char.id}...")
                await auto_translate_and_save_character(char, db, 'en', force=True)
                count += 1
                
        logger.info(f"Fixed {count} characters.")

if __name__ == "__main__":
    asyncio.run(fix_translations())
