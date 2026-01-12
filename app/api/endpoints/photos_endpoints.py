from fastapi import APIRouter
import os
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/v1/characters/photos")
async def get_character_photos():
    """Получить список фотографий для всех персонажей - динамически из папок"""
    try:
        photos_dir = Path("paid_gallery/main_photos")
        character_photos = {}
        
        if not photos_dir.exists():
            logger.warning(f"Директория {photos_dir} не существует")
            return character_photos
        
        # Проходим по всем папкам персонажей
        for character_dir in photos_dir.iterdir():
            if character_dir.is_dir():
                character_name = character_dir.name
                photos = []
                
                # Получаем все PNG файлы в папке персонажа
                for photo_file in character_dir.glob("*.png"):
                    photos.append(f"/paid_gallery/main_photos/{character_name}/{photo_file.name}")
                
                # Сортируем фотографии по имени файла
                photos.sort()
                if photos:  # Добавляем только если есть фото
                    character_photos[character_name] = photos
        
        logger.debug(f"Загружено фото для {len(character_photos)} персонажей")
        return character_photos
    except Exception as e:
        logger.error(f"Ошибка загрузки фото персонажей: {e}", exc_info=True)
        return {}

@router.post("/api/v1/characters/photos/update")
async def update_character_photos():
    """Обновляет JSON файл с фотографиями персонажей"""
    photos_dir = Path("paid_gallery/main_photos")
    character_photos = {}
    
    if photos_dir.exists():
        # Проходим по всем папкам персонажей
        for character_dir in photos_dir.iterdir():
            if character_dir.is_dir():
                character_name = character_dir.name
                photos = []
                
                # Получаем все PNG файлы в папке персонажа
                for photo_file in character_dir.glob("*.png"):
                    photos.append(f"/paid_gallery/main_photos/{character_name}/{photo_file.name}")
                
                # Сортируем фотографии по имени файла
                photos.sort()
                character_photos[character_name] = photos
    
    # Сохраняем в JSON файл
    output_file = Path("frontend/public/character-photos.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(character_photos, f, ensure_ascii=False, indent=2)
    
    return {"message": f"Обновлено {len(character_photos)} персонажей", "characters": character_photos}
