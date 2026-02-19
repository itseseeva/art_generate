import asyncio
import re
import json
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users  # Needed for relationship resolution
from app.database.db import DATABASE_URL  # Ensure this import works in your env

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_characters():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(CharacterDB))
        characters = result.scalars().all()
        
        updated_count = 0
        
        for char in characters:
            logger.info(f"Processing character: {char.name} (ID: {char.id})")
            
            # 1. Parse RU fields from prompt
            prompt = char.prompt or ""
            
            # Extract Personality
            personality_match = re.search(r"Personality and Character:\s*(.*?)\s*(?=Role-playing Situation:|$)", prompt, re.DOTALL)
            personality_ru = personality_match.group(1).strip() if personality_match else None
            
            # Extract Situation
            situation_match = re.search(r"Role-playing Situation:\s*(.*?)\s*(?=Instructions:|$)", prompt, re.DOTALL)
            situation_ru = situation_match.group(1).strip() if situation_match else None
            
            # Extract Instructions (everything after Instructions:)
            instructions_match = re.search(r"Instructions:\s*(.*)", prompt, re.DOTALL)
            instructions_ru = instructions_match.group(1).strip() if instructions_match else None
            
            # 2. Extract EN fields from translations (if valid)
            personality_en = None
            situation_en = None
            instructions_en = None
            
            if char.translations and isinstance(char.translations, dict):
                en_trans = char.translations.get('en')
                if isinstance(en_trans, dict):
                    personality_en = en_trans.get('personality')
                    situation_en = en_trans.get('situation')
                    instructions_en = en_trans.get('instructions')
            
            # Fallback: if description_en exists and no translation, maybe use it? 
            # (User said description_en is not needed, but didn't say map it. We'll stick to translations)

            # Update fields
            char.personality_ru = personality_ru
            char.situation_ru = situation_ru
            char.instructions_ru = instructions_ru
            
            char.personality_en = personality_en
            char.situation_en = situation_en
            char.instructions_en = instructions_en
            
            session.add(char)
            updated_count += 1

        await session.commit()
        logger.info(f"Migration completed. Updated {updated_count} characters.")

if __name__ == "__main__":
    asyncio.run(migrate_characters())
