"""
Скрипт для регистрации тега 'Аниме' и установки его SEO-описания в базе данных.
"""
import asyncio
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from app.database.db import async_session_maker
from app.models.user import Users
from app.chat_bot.models.models import CharacterAvailableTag
from slugify import slugify
from sqlalchemy import select, or_

TAG_NAME = "Аниме"
TAG_DESCRIPTION = "Твои любимые герои аниме оживают в Cherry Lust. Погрузись в миры популярных тайтлов, общайся с вайфу и кунами на русском языке без цензуры. ИИ чат с персонажами аниме 18+ — это возможность переписать сюжет или создать свою уникальную историю в стиле японской анимации бесплатно."

async def setup_anime_tag():
    async with async_session_maker() as db:
        try:
            expected_slug = slugify(TAG_NAME)
            
            # Проверяем, существует ли уже такой тег
            result = await db.execute(
                select(CharacterAvailableTag).where(
                    or_(
                        CharacterAvailableTag.name == TAG_NAME,
                        CharacterAvailableTag.slug == expected_slug
                    )
                )
            )
            tag = result.scalar_one_or_none()
            
            if not tag:
                # Создаем новый тег
                tag = CharacterAvailableTag(
                    name=TAG_NAME,
                    slug=expected_slug,
                    seo_description=TAG_DESCRIPTION
                )
                db.add(tag)
                print(f"[SETUP_TAG] Создан тег: {TAG_NAME}")
            else:
                # Обновляем описание существующего тега
                tag.name = TAG_NAME
                tag.slug = expected_slug
                tag.seo_description = TAG_DESCRIPTION
                print(f"[SETUP_TAG] Обновлено описание для существующего тега: {TAG_NAME}")
                
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            print(f"[SETUP_TAG] Ошибка при настройке тега: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    asyncio.run(setup_anime_tag())
