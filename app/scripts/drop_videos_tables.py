"""
Скрипт для удаления таблиц videos и video_snapshots из БД.
"""

import asyncio
import sys
import os
import io

# Настройка кодировки для Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Добавляем путь к проекту
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

os.chdir(project_root)

from sqlalchemy import text
from app.database.db import engine


async def drop_videos_tables():
    """Удаляет таблицы videos и video_snapshots с CASCADE."""
    async with engine.begin() as conn:
        try:
            # Сначала удаляем таблицу video_snapshots (зависимая таблица)
            print("Удаление таблицы video_snapshots...")
            await conn.execute(text("DROP TABLE IF EXISTS video_snapshots CASCADE"))
            print("✓ Таблица video_snapshots удалена")
            
            # Затем удаляем таблицу videos
            print("Удаление таблицы videos...")
            await conn.execute(text("DROP TABLE IF EXISTS videos CASCADE"))
            print("✓ Таблица videos удалена")
            
            print("\nВсе таблицы успешно удалены!")
        except Exception as e:
            print(f"Ошибка при удалении таблиц: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(drop_videos_tables())
