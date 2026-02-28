"""
Скрипт для обеспечения существования поля description_en перед его удалением в alembic
"""
import asyncio
import sys
from pathlib import Path
import logging

project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.database.db import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    logger.info("Проверка и создание временных колонок перед миграциями...")
    async with async_session_maker() as session:
        try:
            # Проверяем, существует ли поле description_en
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'characters' 
                  AND column_name = 'description_en';
            """)
            result = await session.execute(check_query)
            exists = result.fetchone()
            
            if not exists:
                logger.info("Поле description_en не существует. Создаем временное поле для миграции 63b9d2f6ad0e...")
                alter_query = text("""
                    ALTER TABLE characters 
                    ADD COLUMN description_en TEXT;
                """)
                await session.execute(alter_query)
                
            # Проверяем, существует ли поле translations
            check_query_trans = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'characters' 
                  AND column_name = 'translations';
            """)
            result_trans = await session.execute(check_query_trans)
            exists_trans = result_trans.fetchone()
            
            if not exists_trans:
                logger.info("Поле translations не существует. Создаем временное поле для миграции...")
                alter_query_trans = text("""
                    ALTER TABLE characters 
                    ADD COLUMN translations JSON;
                """)
                await session.execute(alter_query_trans)
            
            await session.commit()
            logger.info("Подготовка колонок завершена.")
        except Exception as e:
            logger.error(f"Ошибка при подготовке колонок: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(main())
