
import asyncio
import os
import sys

# Добавляем корневую директорию проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select, update
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterAvailableTag, CharacterDB
from slugify import slugify

async def rename_tag():
    old_name = "незнакомец"
    new_name = "незнакомка"
    new_slug = slugify(new_name)
    
    async with async_session_maker() as db:
        # 1. Сначала ищем и переименовываем в доступных тегах
        tag_result = await db.execute(
            select(CharacterAvailableTag).where(CharacterAvailableTag.name == old_name)
        )
        tag = tag_result.scalars().first()
        
        if tag:
            print(f"Нашел тег {old_name}. Переименовываю в {new_name}...")
            tag.name = new_name
            tag.slug = new_slug
        else:
            print(f"Тег {old_name} не найден в CharacterAvailableTag. Проверяю существование {new_name}...")
            # Если тега "незнакомка" тоже нет, создаем его
            new_tag_result = await db.execute(
                select(CharacterAvailableTag).where(CharacterAvailableTag.name == new_name)
            )
            if not new_tag_result.scalars().first():
                print(f"Создаю новый тег {new_name}...")
                db.add(CharacterAvailableTag(name=new_name, slug=new_slug))

        # 2. Обновляем всех персонажей, у которых есть этот тег в JSON поле tags
        chars_result = await db.execute(select(CharacterDB))
        all_chars = chars_result.scalars().all()
        
        updated_count = 0
        for char in all_chars:
            if char.tags and isinstance(char.tags, list) and old_name in char.tags:
                new_tags = [new_name if t == old_name else t for t in char.tags]
                # Также убеждаемся, что нет дублей
                char.tags = list(set(new_tags))
                updated_count += 1
                print(f"Обновлен персонаж {char.name}")
        
        await db.commit()
        print(f"Готово! Переименован тег в таблице и обновлено {updated_count} персонажей.")

if __name__ == "__main__":
    asyncio.run(rename_tag())
