"""
Скрипт для заполнения поля country для существующих пользователей.
Определяет страну по сохраненному registration_ip.
"""
import asyncio
import sys
from pathlib import Path

# Устанавливаем UTF-8 кодировку для вывода
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from app.database.db import async_session_maker
from app.models.user import Users
from app.utils.geo_utils import get_country_by_ip
from sqlalchemy import select
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fill_countries():
    """
    Заполняет поле country для пользователей, у которых оно пустое,
    но есть registration_ip.
    """
    async with async_session_maker() as db:
        try:
            # Находим пользователей без страны, но с IP
            result = await db.execute(
                select(Users).where(
                    Users.country.is_(None),
                    Users.registration_ip.isnot(None)
                )
            )
            users = result.scalars().all()
            
            if not users:
                print("Нет пользователей для обработки (все имеют страну или нет IP)")
                return
            
            print(f"Найдено {len(users)} пользователей для обработки")
            
            updated_count = 0
            failed_count = 0
            
            for user in users:
                try:
                    print(f"Обработка пользователя {user.email} (IP: {user.registration_ip})")
                    
                    country = await get_country_by_ip(user.registration_ip)
                    
                    if country:
                        user.country = country
                        updated_count += 1
                        print(f"  ✓ Установлена страна: {country}")
                    else:
                        failed_count += 1
                        print(f"  ✗ Не удалось определить страну")
                    
                    # Коммитим после каждого пользователя, чтобы не потерять прогресс
                    await db.commit()
                    
                    # Небольшая задержка, чтобы не перегружать API геолокации
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    failed_count += 1
                    print(f"  ✗ Ошибка: {e}")
                    await db.rollback()
                    continue
            
            print(f"\n{'='*50}")
            print(f"Обработка завершена:")
            print(f"  Успешно обновлено: {updated_count}")
            print(f"  Не удалось определить: {failed_count}")
            print(f"{'='*50}")
            
            return True
            
        except Exception as e:
            print(f"Критическая ошибка: {e}")
            await db.rollback()
            return False


if __name__ == "__main__":
    print("Запуск скрипта заполнения стран для существующих пользователей...")
    print("Это может занять некоторое время...\n")
    
    success = asyncio.run(fill_countries())
    sys.exit(0 if success else 1)
