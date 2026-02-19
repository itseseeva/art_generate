import asyncio
import logging
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

async def fix_instructions():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(CharacterDB))
        characters = result.scalars().all()
        
        updated_count = 0
        
        for char in characters:
            if not char.instructions_en and char.instructions_ru:
                logger.info(f"Fixing instructions for character: {char.name}")
                try:
                    translated = await translate_text(char.instructions_ru, source='auto', target='en')
                    if translated:
                        char.instructions_en = translated
                        session.add(char)
                        updated_count += 1
                        logger.info(f"Updated instructions_en for {char.name}")
                except Exception as e:
                    logger.error(f"Failed to translate for {char.name}: {e}")
        
        if updated_count > 0:
            await session.commit()
            logger.info(f"Successfully updated {updated_count} characters.")
        else:
            logger.info("No characters needed fixing.")

if __name__ == "__main__":
    asyncio.run(fix_instructions())
