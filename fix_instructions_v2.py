import asyncio
import logging
import re
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users
from app.database.db import DATABASE_URL
from app.services.translation_service import translate_text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOILERPLATE_START = "IMPORTANT: Always end your answers"

async def fix_instructions_v2():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(CharacterDB))
        characters = result.scalars().all()
        
        updated_count = 0
        
        for char in characters:
            instr = char.instructions_en or char.instructions_ru
            
            if not instr:
                continue

            # Check if it has Cyrillic
            has_cyrillic = bool(re.search(r'[а-яА-ЯёЁ]', instr))
            
            if has_cyrillic:
                logger.info(f"Processing character: {char.name}")
                
                # Split boilerplate
                parts = instr.split(BOILERPLATE_START)
                user_part = parts[0].strip()
                boilerplate = BOILERPLATE_START + parts[1] if len(parts) > 1 else ""
                
                if user_part:
                    # Translate user part
                    logger.info(f"Translating user part: {user_part[:50]}...")
                    translated_user_part = await translate_text(user_part, source='auto', target='en')
                    logger.info(f"Translated to: {translated_user_part[:50]}...")
                else:
                    translated_user_part = ""
                
                # Reassemble
                final_instr = f"{translated_user_part}\n\n{boilerplate}".strip()
                
                if final_instr != char.instructions_en:
                    char.instructions_en = final_instr
                    session.add(char)
                    updated_count += 1
                    logger.info(f"Updated instructions_en for {char.name}")
        
        if updated_count > 0:
            await session.commit()
            logger.info(f"Successfully updated {updated_count} characters.")
        else:
            logger.info("No characters needed fixing.")

if __name__ == "__main__":
    asyncio.run(fix_instructions_v2())
