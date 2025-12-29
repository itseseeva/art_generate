"""
Скрипт для сброса версии Alembic в базе данных.
Используется когда нужно начать миграции заново.
"""
import asyncio
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.database.db import engine
from app.utils.logger import logger


async def reset_alembic_version():
    """
    Удаляет таблицу alembic_version или очищает её содержимое.
    Это позволяет начать миграции заново.
    """
    try:
        logger.info("[ALEMBIC] Сброс версии миграций...")
        async with engine.begin() as conn:
            # Проверяем, существует ли таблица
            result = await conn.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'alembic_version'
                    )
                """)
            )
            table_exists = result.scalar()
            
            if table_exists:
                # Удаляем все записи из таблицы
                await conn.execute(text("DELETE FROM alembic_version"))
                logger.info("[ALEMBIC] Таблица alembic_version очищена")
            else:
                logger.info("[ALEMBIC] Таблица alembic_version не существует")
        
        logger.info("[ALEMBIC] Версия миграций успешно сброшена!")
        return True
    except Exception as e:
        logger.error(f"[ALEMBIC] Ошибка сброса версии миграций: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(reset_alembic_version())
    sys.exit(0 if success else 1)

