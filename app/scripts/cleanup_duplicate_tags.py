"""
Скрипт для удаления дубликатов тегов у персонажей в базе данных.
"""
import asyncio
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
from sqlalchemy import select

async def cleanup_duplicate_tags():
    async with async_session_maker() as db:
        try:
            # Получаем всех персонажей
            result = await db.execute(select(CharacterDB))
            characters = result.scalars().all()
            
            updated_count = 0
            for char in characters:
                if char.tags and isinstance(char.tags, list):
                    original_tags = char.tags
                    # Удаляем дубликаты с сохранением порядка (через dict.fromkeys)
                    unique_tags = list(dict.fromkeys(original_tags))
                    
                    if len(unique_tags) < len(original_tags):
                        char.tags = unique_tags
                        updated_count += 1
                        print(f"[CLEANUP] У персонажа '{char.name}' (ID: {char.id}) удалено {len(original_tags) - len(unique_tags)} дубликатов")
            
            if updated_count > 0:
                await db.commit()
                print(f"[CLEANUP] Успешно обновлено персонажей: {updated_count}")
                
                # Очищаем кэш
                try:
                    from app.utils.redis_cache import cache_delete_pattern
                    await cache_delete_pattern("characters:list:*")
                    print("[CLEANUP] Кэш персонажей очищен")
                except Exception as cache_error:
                    print(f"[CLEANUP] Предупреждение: не удалось очистить кэш: {cache_error}")
            else:
                print("[CLEANUP] Дубликатов не найдено")
                
            return True
        except Exception as e:
            await db.rollback()
            print(f"[CLEANUP] Ошибка при очистке тегов: {e}")
            return False

if __name__ == "__main__":
    print("[CLEANUP] Начало очистки дубликатов тегов")
    asyncio.run(cleanup_duplicate_tags())
    print("[CLEANUP] Очистка завершена")
