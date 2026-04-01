import asyncio
import os
import sys
from pathlib import Path

# Добавляем корень проекта в sys.path
repo_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(repo_root))

from sqlalchemy import text
from app.database.db import engine, async_session_maker
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users # Нужен для разрешения связей в TipMessage
from slugify import slugify

async def add_slug_column():
    print("Checking database for 'slug' column in 'characters' table...")
    async with engine.begin() as conn:
        # Проверяем существование колонки (для PostgreSQL)
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='characters' AND column_name='slug'"
        ))
        column_exists = result.fetchone() is not None
        
        if not column_exists:
            print("Adding 'slug' column to 'characters' table...")
            await conn.execute(text("ALTER TABLE characters ADD COLUMN slug VARCHAR(100)"))
            await conn.execute(text("CREATE INDEX ix_characters_slug ON characters (slug)"))
            print("Column 'slug' added successfully.")
        else:
            print("Column 'slug' already exists.")

async def populate_slugs():
    print("Populating slugs for existing characters...")
    async with async_session_maker() as session:
        from sqlalchemy import select
        result = await session.execute(select(CharacterDB))
        characters = result.scalars().all()
        
        for char in characters:
            if not char.slug:
                char.slug = slugify(char.name)
                print(f"Generated slug for {char.name}: {char.slug}")
        
        await session.commit()
    print("Slugs populated successfully.")

async def main():
    try:
        await add_slug_column()
        await populate_slugs()
        print("Database update completed.")
    except Exception as e:
        print(f"Error updating database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
