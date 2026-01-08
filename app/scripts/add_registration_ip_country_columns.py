"""
Скрипт для добавления столбцов registration_ip и country в таблицу users.
Выполняется напрямую через SQL, если миграция еще не применена.
"""
import asyncio
import sys
import os

# Добавляем корневую директорию проекта в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.db import engine
from sqlalchemy import text


async def add_columns():
    """Добавляет столбцы registration_ip и country в таблицу users."""
    async with engine.begin() as conn:
        try:
            # Проверяем, существует ли столбец registration_ip
            check_registration_ip = await conn.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='registration_ip'
                """)
            )
            has_registration_ip = check_registration_ip.fetchone() is not None
            
            # Проверяем, существует ли столбец country
            check_country = await conn.execute(
                text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='country'
                """)
            )
            has_country = check_country.fetchone() is not None
            
            # Добавляем registration_ip, если его нет
            if not has_registration_ip:
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN registration_ip VARCHAR(255)")
                )
                print("✓ Столбец registration_ip добавлен")
            else:
                print("✓ Столбец registration_ip уже существует")
            
            # Добавляем country, если его нет
            if not has_country:
                await conn.execute(
                    text("ALTER TABLE users ADD COLUMN country VARCHAR(100)")
                )
                print("✓ Столбец country добавлен")
            else:
                print("✓ Столбец country уже существует")
            
            print("\n✓ Миграция выполнена успешно!")
            
        except Exception as e:
            print(f"✗ Ошибка при выполнении миграции: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(add_columns())
