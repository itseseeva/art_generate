"""
Скрипт для очистки кэша персонажей из Redis.
Использование: python clear_characters_cache.py
"""
import asyncio
import sys
import os

# Добавляем корневую директорию проекта в путь
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.utils.redis_cache import cache_delete_pattern, get_redis_client, close_redis_client


async def clear_characters_cache():
    """Очищает весь кэш персонажей из Redis."""
    print("Очистка кэша персонажей...")
    
    try:
        # Очищаем все паттерны кэша персонажей
        patterns = [
            "characters:list:*",
            "character:*",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await cache_delete_pattern(pattern, timeout=10.0)
            total_deleted += deleted
            print(f"  Удалено ключей по паттерну '{pattern}': {deleted}")
        
        print(f"\n✓ Всего удалено ключей: {total_deleted}")
        print("✓ Кэш персонажей очищен успешно!")
        
    except Exception as e:
        print(f"✗ Ошибка при очистке кэша: {e}")
        return False
    finally:
        await close_redis_client()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(clear_characters_cache())
    sys.exit(0 if success else 1)
