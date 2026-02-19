import asyncio
import sys
from pathlib import Path
import json

# Add project path
sys.path.insert(0, str(Path(__file__).parent))

from app.database.db import async_session_maker
# Import Users BEFORE models that depend on it
from app.models.user import Users
from app.chat_bot.models.models import CharacterDB, CharacterAvailableTag
from sqlalchemy import select, or_

async def inspect_character():
    async with async_session_maker() as db:
        # Search for Maria
        result = await db.execute(
            select(CharacterDB).where(
                or_(
                    CharacterDB.name.ilike('%Мария%'),
                    CharacterDB.name.ilike('%Maria%'),
                    CharacterDB.display_name.ilike('%Мария%')
                )
            )
        )
        characters = result.scalars().all()
        
        print(f"Found {len(characters)} characters.")
        
        for char in characters:
            print(f"\n--- Character ID: {char.id} Name: {char.name} Display: {char.display_name} ---")
            print(f"Description (RU): {char.description[:100] if char.description else 'None'}...")
            print(f"Greeting: {char.greeting[:100] if hasattr(char, 'greeting') else 'No greeting attr'}...")
            
            translations = char.translations or {}
            print(f"Translations keys: {translations.keys()}")
            
            if 'en' in translations:
                en = translations['en']
                print(f"EN Name: {en.get('name')}")
                print(f"EN Description: {en.get('description')[:100] if en.get('description') else 'None'}...")
                print(f"EN Personality: {en.get('personality')[:100] if en.get('personality') else 'None'}...")
                print(f"EN Situation: {en.get('situation')[:100] if en.get('situation') else 'None'}...")
                print(f"EN Instructions: {en.get('instructions')}") # Should be present?
                
            print(f"Tags: {char.tags}")

if __name__ == "__main__":
    asyncio.run(inspect_character())
