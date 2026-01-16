#!/usr/bin/env python3
"""
Скрипт для проверки персонажа "Холодная госпожа офиса" в БД.
Запустить на VPS из корня проекта: python3 app/diagnose_character.py
Диагностика проблем с загрузкой персонажа из БД.
"""
import asyncio
import sys
from pathlib import Path

# Добавляем корень проекта в sys.path для импортов
script_dir = Path(__file__).parent
project_root = script_dir.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

async def check_character():
    """Проверяет персонажа в БД."""
    try:
        from app.database.db import async_session_maker
        from app.chat_bot.models.models import CharacterDB
        from sqlalchemy import select
        from urllib.parse import unquote
        
        async with async_session_maker() as db:
            # Ищем персонажа по ID 5
            result = await db.execute(
                select(CharacterDB).where(CharacterDB.id == 5)
            )
            char = result.scalar_one_or_none()
            
            if char:
                print(f"Найден персонаж по ID 5:")
                print(f"  ID: {char.id}")
                print(f"  Name: '{char.name}'")
                print(f"  Name length: {len(char.name)}")
                print(f"  Name repr: {repr(char.name)}")
                print(f"  Display name: '{char.display_name}'")
                print(f"  User ID: {char.user_id}")
                print(f"  Main photos: {char.main_photos}")
                print()
                
                # Проверяем поиск по имени с ilike
                search_name = "Холодная госпожа офиса"
                decoded_name = unquote(search_name)
                
                print(f"Поиск по имени '{decoded_name}':")
                result2 = await db.execute(
                    select(CharacterDB).where(CharacterDB.name.ilike(decoded_name))
                )
                char2 = result2.scalar_one_or_none()
                
                if char2:
                    print(f"  Найден! ID: {char2.id}")
                else:
                    print(f"  НЕ НАЙДЕН через ilike!")
                    
                    # Пробуем точное совпадение
                    result3 = await db.execute(
                        select(CharacterDB).where(CharacterDB.name == decoded_name)
                    )
                    char3 = result3.scalar_one_or_none()
                    
                    if char3:
                        print(f"  Найден через == ! ID: {char3.id}")
                    else:
                        print(f"  НЕ НАЙДЕН и через ==")
                        
                        # Ищем все персонажи с похожим именем
                        result4 = await db.execute(
                            select(CharacterDB).where(CharacterDB.name.like("%Холодная%"))
                        )
                        similar = result4.scalars().all()
                        
                        print(f"\nПерсонажи с 'Холодная' в имени:")
                        for s in similar:
                            print(f"  ID {s.id}: '{s.name}' (repr: {repr(s.name)})")
            else:
                print("Персонаж с ID 5 не найден!")
                
    except Exception as e:
        print(f"Ошибка: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(check_character())
