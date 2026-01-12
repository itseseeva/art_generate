#!/usr/bin/env python3
"""
Скрипт для миграции метаданных платных альбомов из JSON файлов в базу данных.

Использование:
    python scripts/migrate_paid_album_metadata_to_db.py
"""

import asyncio
import json
import sys
from pathlib import Path

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from sqlalchemy import select
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB, PaidAlbumPhoto


async def migrate_metadata_files_to_db():
    """Мигрирует метаданные из JSON файлов в базу данных."""
    metadata_dir = project_root / "paid_gallery" / "metadata"
    
    if not metadata_dir.exists():
        print(f"Директория {metadata_dir} не найдена. Нет данных для миграции.")
        return
    
    json_files = list(metadata_dir.glob("*.json"))
    
    if not json_files:
        print("JSON файлы не найдены. Нет данных для миграции.")
        return
    
    print(f"Найдено {len(json_files)} JSON файлов для миграции.")
    
    async with async_session_maker() as db:
        migrated = 0
        skipped = 0
        errors = 0
        
        for json_file in json_files:
            try:
                # Читаем JSON файл
                with json_file.open("r", encoding="utf-8") as f:
                    photos_data = json.load(f)
                
                if not isinstance(photos_data, list):
                    print(f"⚠️  Пропущен {json_file.name}: не является списком")
                    skipped += 1
                    continue
                
                # Получаем имя персонажа из имени файла (убираем расширение)
                character_slug = json_file.stem
                
                # Ищем персонажа в БД по slug или имени
                # Пробуем разные варианты имени
                character = None
                search_names = [
                    character_slug,
                    character_slug.replace("_", " "),
                    character_slug.replace("-", " "),
                ]
                
                for search_name in search_names:
                    result = await db.execute(
                        select(CharacterDB).where(CharacterDB.name.ilike(search_name))
                    )
                    character = result.scalar_one_or_none()
                    if character:
                        break
                
                if not character:
                    print(f"⚠️  Пропущен {json_file.name}: персонаж '{character_slug}' не найден в БД")
                    skipped += 1
                    continue
                
                # Проверяем, есть ли уже данные в БД
                existing_result = await db.execute(
                    select(PaidAlbumPhoto).where(PaidAlbumPhoto.character_id == character.id)
                )
                existing_photos = existing_result.scalars().all()
                
                if existing_photos:
                    print(f"⏭️  Пропущен {json_file.name}: данные для персонажа '{character.name}' уже есть в БД ({len(existing_photos)} фото)")
                    skipped += 1
                    continue
                
                # Добавляем фотографии в БД
                added_count = 0
                for photo_data in photos_data:
                    photo_id = photo_data.get("id")
                    photo_url = photo_data.get("url")
                    
                    if not photo_id or not photo_url:
                        continue
                    
                    # Проверяем, нет ли уже такой фотографии
                    existing_result = await db.execute(
                        select(PaidAlbumPhoto).where(
                            PaidAlbumPhoto.character_id == character.id,
                            PaidAlbumPhoto.photo_id == photo_id
                        )
                    )
                    if existing_result.scalar_one_or_none():
                        continue
                    
                    db.add(
                        PaidAlbumPhoto(
                            character_id=character.id,
                            photo_id=photo_id,
                            photo_url=photo_url,
                        )
                    )
                    added_count += 1
                
                if added_count > 0:
                    await db.commit()
                    print(f"OK: Migrated {json_file.name}: {added_count} photos for character '{character.name}'")
                    migrated += 1
                else:
                    print(f"WARNING: Skipped {json_file.name}: no valid photos")
                    skipped += 1
                    
            except Exception as e:
                print(f"ERROR: Error migrating {json_file.name}: {e}")
                import traceback
                print(traceback.format_exc())
                errors += 1
                await db.rollback()
        
        print(f"\n{'='*50}")
        print(f"Migration completed:")
        print(f"  Successfully migrated: {migrated}")
        print(f"  Skipped: {skipped}")
        print(f"  Errors: {errors}")
        print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(migrate_metadata_files_to_db())
