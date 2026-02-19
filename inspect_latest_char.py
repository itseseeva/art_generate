import asyncio
import os
import sys
from sqlalchemy import create_engine, select, desc
from sqlalchemy.orm import sessionmaker

# Add project root to python path to import app modules
sys.path.append(os.getcwd())

from app.chat_bot.models.models import CharacterDB, Base
from app.config import DATABASE_URL

async def inspect_latest_character():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get the latest character by ID (descending)
        latest_char = db.query(CharacterDB).order_by(desc(CharacterDB.id)).first()
        
        if latest_char:
            print(f"--- Latest Character ID: {latest_char.id} ---")
            print(f"Name: {latest_char.name}")
            print(f"Personality (RU): {latest_char.personality_ru[:50]}..." if latest_char.personality_ru else "Personality (RU): None")
            print(f"Appearance (RU): {latest_char.appearance_ru}")
            print(f"Appearance (EN): {latest_char.appearance_en}")
            print(f"Location (RU): {latest_char.location_ru}")
            print(f"Location (EN): {latest_char.location_en}")
            print(f"Source Lang Detected (Implicit): {'RU' if latest_char.personality_ru else 'EN'}")
        else:
            print("No characters found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(inspect_latest_character())
