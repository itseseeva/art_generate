"""
Модуль для сохранения сгенерированных изображений.
"""
import os
from datetime import datetime
from pathlib import Path
from typing import Union, Optional
import base64
from PIL import Image
import io
from app.config.paths import IMAGES_DIR
import logging
import traceback
from io import BytesIO

logger = logging.getLogger(__name__)

def ensure_images_dir() -> Path:
    """
    Создает директорию для сохранения изображений, если она не существует.
    
    Returns:
        Path: Путь к директории с изображениями
    """
    try:
        logger.info(f"Создаю директорию для изображений: {IMAGES_DIR}")
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Директория создана/существует: {IMAGES_DIR}")
        logger.info(f"Абсолютный путь: {IMAGES_DIR.absolute()}")
        logger.info(f"Права на запись: {os.access(IMAGES_DIR, os.W_OK)}")
        return IMAGES_DIR
    except Exception as e:
        logger.error(f"Ошибка при создании директории: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

import asyncio

def _save_image_sync(image_data: Union[str, bytes, Image.Image], prefix: str = "image") -> str:
    """
    Синхронная версия сохранения изображения.
    """
    try:
        # Создаем директорию если её нет
        ensure_images_dir()
        
        # Генерируем имя файла
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.png"
        filepath = IMAGES_DIR / filename
        
        logger.info(f"Начинаю сохранение изображения в {filepath}")
        logger.info(f"Абсолютный путь: {filepath.absolute()}")
        
        # Конвертируем входные данные в bytes если нужно
        if isinstance(image_data, str):
            logger.info(f"Получена base64 строка длиной {len(image_data)}")
            try:
                image_bytes = base64.b64decode(image_data)
                logger.info(f"Декодировано {len(image_bytes)} байт из base64")
            except Exception as e:
                logger.error(f"Ошибка декодирования base64: {str(e)}")
                raise
        elif isinstance(image_data, Image.Image):
            logger.info("Получен объект PIL.Image")
            buffer = BytesIO()
            image_data.save(buffer, format="PNG")
            image_bytes = buffer.getvalue()
            logger.info(f"Конвертировано в {len(image_bytes)} байт")
        else:
            logger.info(f"Получены байты длиной {len(image_data)}")
            image_bytes = image_data
            
        # Сохраняем файл
        try:
            with open(filepath, "wb") as f:
                f.write(image_bytes)
            logger.info(f"Файл успешно создан: {filepath}")
            logger.info(f"Размер файла: {os.path.getsize(filepath)} байт")
            
            # Проверяем, что файл действительно создан
            if not os.path.exists(filepath):
                logger.error(f"Файл не был создан: {filepath}")
                raise IOError("Файл не был создан")
                
            return str(filepath)
        except Exception as e:
            logger.error(f"Ошибка при записи файла: {str(e)}")
            raise
            
    except Exception as e:
        logger.error(f"Ошибка при сохранении изображения: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

async def save_image(image_data: Union[str, bytes, Image.Image], prefix: str = "image") -> str:
    """
    Сохраняет изображение в директорию images асинхронно.
    
    Args:
        image_data: Изображение в формате base64 строки, bytes или PIL.Image
        prefix: Префикс для имени файла
        
    Returns:
        str: Путь к сохраненному файлу
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _save_image_sync, image_data, prefix)

def save_image_sync_deprecated(image_data: Union[str, bytes, Image.Image], prefix: str = "image") -> str:
    """
    Deprecated: Используйте save_image (async) или _save_image_sync (internal sync).
    Сохраняет совместимость для старого кода.
    """
    return _save_image_sync(image_data, prefix)

async def save_image_cloud_only(
    image_data: Union[str, bytes, Image.Image], 
    prefix: str = "image",
    character_name: Optional[str] = None
) -> dict:
    """
    Сохраняет изображение только в Yandex Cloud Storage без локального сохранения.
    
    Args:
        image_data: Изображение в формате base64 строки, bytes или PIL.Image
        prefix: Префикс для имени файла
        character_name: Имя персонажа для организации файлов
        
    Returns:
        dict: Словарь с URL файла в облаке
    """
    try:
        from app.services.yandex_storage import get_yandex_storage_service, transliterate_cyrillic_to_ascii
        
        # Получаем сервис с ленивой инициализацией
        service = get_yandex_storage_service()
        
        # Определяем папку в облаке с транслитерацией
        folder = "generated_images"
        if character_name:
            character_name_ascii = transliterate_cyrillic_to_ascii(character_name)
            folder = f"generated_images/{character_name_ascii}"
        
        # Конвертируем входные данные в bytes если нужно
        if isinstance(image_data, str):
            import base64
            image_bytes = base64.b64decode(image_data)
        elif isinstance(image_data, Image.Image):
            buffer = BytesIO()
            image_data.save(buffer, format="PNG")
            image_bytes = buffer.getvalue()
        else:
            image_bytes = image_data
        
        # Формируем имя файла с расширением .webp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.webp"
        
        # Загружаем в облако (автоматически конвертируется в WebP в upload_file)
        cloud_url = await service.upload_file(
            file_data=image_bytes,
            object_key=f"{folder}/{filename}",
            content_type='image/webp',
            metadata={
                "character_name": character_name_ascii if character_name else "unknown",  # Используем только ASCII
                "character_original": character_name or "unknown",  # Оригинальное имя в метаданных
                "prefix": prefix,
                "generated_at": datetime.now().isoformat(),
                "source": "stable_diffusion_generation"
            },
            convert_to_webp=True
        )
        
        logger.info(f"Изображение загружено в облако: {cloud_url}")
        
        return {
            "cloud_url": cloud_url,
            "filename": filename,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Ошибка при загрузке изображения в облако: {str(e)}")
        return {
            "cloud_url": None,
            "filename": None,
            "success": False,
            "error": str(e)
        }

async def save_base64_image(base64_string: str, prefix: str = "generated") -> str:
    """
    Сохраняет изображение из base64 строки.
    
    Args:
        base64_string: Base64 строка с изображением
        prefix: Префикс для имени файла
        
    Returns:
        str: Путь к сохраненному файлу
    """
    return await save_image(base64_string, prefix=prefix) 