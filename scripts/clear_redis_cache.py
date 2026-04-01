#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clear Redis cache for characters.
Run: python clear_redis_cache.py
"""
import asyncio
import sys
import io

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

async def clear_cache():
    """Clear all character cache in Redis."""
    try:
        from app.utils.redis_cache import cache_delete_pattern, cache_delete, key_characters_list
        
        print("Clearing character cache...")
        
        # Clear all character caches
        await cache_delete(key_characters_list())
        print("- Main character list cleared")
        
        await cache_delete_pattern('characters:list:*')
        print("- All character list variants cleared")
        
        await cache_delete_pattern('character:*')
        print("- All individual character caches cleared")
        
        print("\nCharacter cache successfully cleared!")
        print("Reload the page in browser to update.")
        
    except Exception as e:
        print(f"Error clearing cache: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(clear_cache())
