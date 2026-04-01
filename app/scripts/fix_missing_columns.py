import asyncio
import logging
from sqlalchemy import text
from app.database.db import async_session_maker

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_columns():
    """
    Скрипт для проверки и добавления недостающих колонок в таблицу users.
    Помогает, если Alembic миграции по какой-то причине не применились корректно на VPS.
    """
    async with async_session_maker() as session:
        try:
            # Проверяем наличие колонки has_welcome_discount
            # Используем системный запрос для PostgreSQL
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='has_welcome_discount';
            """)
            result = await session.execute(check_query)
            column_exists = result.scalar() is not None
            
            if column_exists:
                logger.info("✅ Колонка 'has_welcome_discount' уже существует.")
            else:
                logger.warning("⚠️ Колонка 'has_welcome_discount' отсутствует, добавляем...")
                # Добавляем колонки напрямую через SQL
                # server_default гарантирует, что существующие записи получат значение
                add_queries = [
                    "ALTER TABLE users ADD COLUMN has_welcome_discount BOOLEAN DEFAULT FALSE NOT NULL;",
                    "ALTER TABLE users ADD COLUMN welcome_discount_used BOOLEAN DEFAULT FALSE NOT NULL;"
                ]
                
                for query in add_queries:
                    await session.execute(text(query))
                
                await session.commit()
                logger.info("✅ Колонки 'has_welcome_discount' и 'welcome_discount_used' успешно добавлены.")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при исправлении колонок: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(fix_columns())
