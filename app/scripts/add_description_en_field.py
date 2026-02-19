"""
Скрипт для добавления поля description_en в локальную БД
"""
import asyncio
from sqlalchemy import text
from app.database.db import async_session_maker


async def add_description_en_column():
    """Добавляет поле description_en в таблицу characters"""
    async with async_session_maker() as session:
        try:
            # Проверяем, существует ли поле
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'characters' 
                  AND column_name = 'description_en';
            """)
            result = await session.execute(check_query)
            exists = result.fetchone()
            
            if exists:
                print("✓ Поле description_en уже существует")
                return
            
            # Добавляем поле
            alter_query = text("""
                ALTER TABLE characters 
                ADD COLUMN description_en TEXT;
            """)
            await session.execute(alter_query)
            await session.commit()
            
            print("✓ Поле description_en успешно добавлено!")
            
        except Exception as e:
            print(f"✗ Ошибка: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(add_description_en_column())
