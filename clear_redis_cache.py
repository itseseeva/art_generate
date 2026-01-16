#!/usr/bin/env python3
"""
Скрипт для очистки кэша Redis персонажей.
Запустить на VPS сервере: python clear_redis_cache.py
"""
import asyncio
import sys

async def clear_cache():
    """Очищает весь кэш персонажей в Redis."""
    try:
        from app.utils.redis_cache import cache_delete_pattern, cache_delete, key_characters_list
        
        print("Очистка кэша персонажей...")
        
        # Очищаем весь кэш персонажей
        await cache_delete(key_characters_list())
        print("- Очищен основной список персонажей")
        
        await cache_delete_pattern('characters:list:*')
        print("- Очищены все варианты списка персонажей")
        
        await cache_delete_pattern('character:*')
        print("- Очищены все кэши отдельных персонажей")
        
        print("\nКэш персонажей успешно очищен!")
        print("Перезагрузите страницу в браузере для обновления.")
        
    except Exception as e:
        print(f"Ошибка при очистке кэша: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(clear_cache())
