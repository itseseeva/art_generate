import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users  # Needed for relationship resolution
from app.database.db import DATABASE_URL

async def verify():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(select(CharacterDB))
        for char in result.scalars().all():
            print(f"Name: {char.name}")
            print(f"Instructions RU: {char.instructions_ru}")
            print(f"Instructions EN: {char.instructions_en}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(verify())
