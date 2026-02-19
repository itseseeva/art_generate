import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users  # Needed for relationship resolution
from app.database.db import DATABASE_URL

async def inspect():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(select(CharacterDB).limit(5))
        characters = result.scalars().all()
        
        for char in characters:
            print(f"--- Character: {char.name} (ID: {char.id}) ---")
            if char.translations and isinstance(char.translations, dict):
                en = char.translations.get('en', {})
                print(f"Keys in 'en' translation: {list(en.keys())}")
                print(f"Value of 'instructions': {en.get('instructions')}")
                print(f"Value of 'Instructions': {en.get('Instructions')}") # Check case sensitivity
            else:
                print("No translations found.")

if __name__ == "__main__":
    asyncio.run(inspect())
