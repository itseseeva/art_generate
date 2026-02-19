import asyncio
import os
import sys
import re

# Add project root to python path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users
from app.services.translation_service import detect_language, translate_text
from app.config.settings import settings

DATABASE_URL = settings.DATABASE_URL

# Setup DB connection
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def repair_character_data():
    db = SessionLocal()
    try:
        # Get all characters
        characters = db.query(CharacterDB).all()
        print(f"Found {len(characters)} characters. Checking for mixed language data...")
        
        fixed_count = 0
        
        for char in characters:
            needs_save = False
            
            # Check Personality (RU field has English?)
            if char.personality_ru and detect_language(char.personality_ru) == 'en':
                print(f"[{char.name}] Fixing Personality: RU has English text -> Moving to EN")
                char.personality_en = char.personality_ru
                char.personality_ru = await translate_text(char.personality_en, source='en', target='ru')
                needs_save = True

            # Check Appearance (RU field has English?)
            if char.appearance_ru and detect_language(char.appearance_ru) == 'en':
                print(f"[{char.name}] Fixing Appearance: RU has English text -> Moving to EN")
                char.appearance_en = char.appearance_ru
                char.appearance_ru = await translate_text(char.appearance_en, source='en', target='ru')
                needs_save = True

            # Check Location (RU field has English?)
            if char.location_ru and detect_language(char.location_ru) == 'en':
                print(f"[{char.name}] Fixing Location: RU has English text -> Moving to EN")
                char.location_en = char.location_ru
                char.location_ru = await translate_text(char.location_en, source='en', target='ru')
                needs_save = True

            # Check Situation (RU field has English?)
            if char.situation_ru and detect_language(char.situation_ru) == 'en':
                print(f"[{char.name}] Fixing Situation: RU has English text -> Moving to EN")
                char.situation_en = char.situation_ru
                char.situation_ru = await translate_text(char.situation_en, source='en', target='ru')
                needs_save = True

            if needs_save:
                db.add(char)
                fixed_count += 1
        
        if fixed_count > 0:
            db.commit()
            print(f"Successfully repaired {fixed_count} characters.")
        else:
            print("No characters needed repair.")

    except Exception as e:
        print(f"Error repairing data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(repair_character_data())
