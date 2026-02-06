"""
Скрипт для обновления тегов персонажей:
- Добавляет тег "пользовательские" всем персонажам, кроме созданных пользователем eseeva228@gmail.com
- Добавляет тег "Original" всем персонажам, созданным пользователем eseeva228@gmail.com
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
from app.chat_bot.models.models import CharacterDB, CharacterAvailableTag
from slugify import slugify
from sqlalchemy import select, update, or_
from app.utils.redis_cache import cache_delete_pattern


TARGET_EMAIL = "eseeva228@gmail.com"
TAG_USER_CREATED = "Пользовательские"
TAG_ORIGINAL = "Original"
TAG_USER_CREATED_OLD = "User created"  # устаревший тег, удаляем при миграции


async def ensure_tags_exist(db) -> bool:
    """
    Убеждается, что теги "пользовательские" и "Original" существуют в character_available_tags.
    """
    try:
        for tag_name in [TAG_USER_CREATED, TAG_ORIGINAL]:
            expected_slug = slugify(tag_name)
            
            result = await db.execute(
                select(CharacterAvailableTag).where(
                    or_(
                        CharacterAvailableTag.name == tag_name,
                        CharacterAvailableTag.slug == expected_slug
                    )
                )
            )
            existing_tag = result.scalar_one_or_none()

            if not existing_tag:
                # Создаем тег
                new_tag = CharacterAvailableTag(name=tag_name, slug=expected_slug)
                db.add(new_tag)
                print(f"[UPDATE_TAGS] Создан тег: {tag_name}")
            else:
                print(f"[UPDATE_TAGS] Тег уже существует: {existing_tag.name} (slug: {existing_tag.slug})")

        await db.commit()
        return True
    except Exception as e:
        await db.rollback()
        print(f"[UPDATE_TAGS] Ошибка при создании тегов: {e}", file=sys.stderr)
        return False


async def update_character_tags() -> bool:
    """
    Обновляет теги персонажей согласно правилам:
    - Персонажи НЕ от eseeva228@gmail.com получают тег "пользовательские"
    - Персонажи от eseeva228@gmail.com получают тег "Original"
    """
    async with async_session_maker() as db:
        try:
            # Убеждаемся, что нужные теги существуют
            if not await ensure_tags_exist(db):
                return False

            # Находим пользователя по email
            result = await db.execute(
                select(Users).where(Users.email == TARGET_EMAIL)
            )
            target_user = result.scalar_one_or_none()

            if not target_user:
                print(f"[UPDATE_TAGS] Пользователь с email {TARGET_EMAIL} не найден")
                return False

            target_user_id = target_user.id
            print(f"[UPDATE_TAGS] Найден пользователь: {TARGET_EMAIL} (ID: {target_user_id})")

            # Получаем всех персонажей
            characters_result = await db.execute(select(CharacterDB))
            characters = characters_result.scalars().all()

            if not characters:
                print("[UPDATE_TAGS] Персонажи не найдены")
                return False

            print(f"[UPDATE_TAGS] Найдено персонажей: {len(characters)}")

            updated_count = 0
            user_created_count = 0
            original_count = 0

            for char in characters:
                current_tags = char.tags if isinstance(char.tags, list) else []
                tags_set = set(current_tags)
                original_tags_count = len(tags_set)
                updated = False

                if char.user_id == target_user_id:
                    # Персонаж от целевого пользователя - добавляем "Original"
                    if TAG_ORIGINAL not in tags_set:
                        tags_set.add(TAG_ORIGINAL)
                        updated = True
                        original_count += 1
                    # Убираем "пользовательские" и устаревший "User created" если есть
                    if TAG_USER_CREATED in tags_set:
                        tags_set.remove(TAG_USER_CREATED)
                        updated = True
                    if TAG_USER_CREATED_OLD in tags_set:
                        tags_set.discard(TAG_USER_CREATED_OLD)
                        updated = True
                else:
                    # Персонаж от другого пользователя - добавляем "пользовательские"
                    if TAG_USER_CREATED not in tags_set:
                        tags_set.add(TAG_USER_CREATED)
                        updated = True
                        user_created_count += 1
                    # Убираем устаревший "User created" при миграции
                    if TAG_USER_CREATED_OLD in tags_set:
                        tags_set.discard(TAG_USER_CREATED_OLD)
                        updated = True
                    # Убираем "Original" если он есть
                    if TAG_ORIGINAL in tags_set:
                        tags_set.remove(TAG_ORIGINAL)
                        updated = True

                if updated:
                    char.tags = list(tags_set)
                    updated_count += 1
                    print(
                        f"[UPDATE_TAGS] Обновлен персонаж '{char.name}' (ID: {char.id}): "
                        f"теги {original_tags_count} -> {len(tags_set)} "
                        f"({', '.join(sorted(tags_set))})"
                    )

            if updated_count > 0:
                await db.commit()
                print(f"[UPDATE_TAGS] Успешно обновлено персонажей: {updated_count}")
                print(f"[UPDATE_TAGS] Добавлено 'пользовательские': {user_created_count}")
                print(f"[UPDATE_TAGS] Добавлено 'Original': {original_count}")

                # Очищаем кэш персонажей
                try:
                    await cache_delete_pattern("characters:list:*")
                    print("[UPDATE_TAGS] Кэш персонажей очищен")
                except Exception as cache_error:
                    print(f"[UPDATE_TAGS] Предупреждение: не удалось очистить кэш: {cache_error}")
            else:
                print("[UPDATE_TAGS] Нет персонажей для обновления")

            return True

        except Exception as e:
            await db.rollback()
            print(f"[UPDATE_TAGS] Ошибка обновления тегов: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return False


async def main():
    """Главная функция для запуска из командной строки."""
    print(f"[UPDATE_TAGS] Начало обновления тегов персонажей")
    print(f"[UPDATE_TAGS] Целевой email: {TARGET_EMAIL}")
    success = await update_character_tags()
    if success:
        print("[UPDATE_TAGS] Обновление завершено успешно")
    else:
        print("[UPDATE_TAGS] Обновление завершено с ошибками")
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
