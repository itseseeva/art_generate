#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для автоматического перевода описаний персонажей на английский язык.
Использует существующий эндпоинт /api/v1/translate/ru-en для перевода.
"""
import asyncio
import sys
import os
from pathlib import Path

# Добавляем корневую директорию в PYTHONPATH
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def translate_text(text: str, api_url: str = "http://localhost:8000") -> str:
    """
    Переводит текст с русского на английский используя API.
    
    Args:
        text: Текст для перевода
        api_url: URL API сервера
        
    Returns:
        Переведенный текст
    """
    if not text or not text.strip():
        return ""
    
    # Проверяем, есть ли кириллица
    import re
    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
    if not has_cyrillic:
        logger.info(f"Текст уже на английском, пропускаем: {text[:50]}...")
        return text
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{api_url}/api/v1/translate/ru-en",
                json={"text": text}
            )
            response.raise_for_status()
            result = response.json()
            translated = result.get("translated_text", text)
            logger.info(f"Переведено: {text[:50]}... -> {translated[:50]}...")
            return translated
    except Exception as e:
        logger.error(f"Ошибка перевода: {e}")
        # Возвращаем оригинальный текст в случае ошибки
        return text


async def translate_character_descriptions(
    batch_size: int = 10,
    api_url: str = "http://localhost:8000",
    force: bool = False
):
    """
    Переводит описания всех персонажей на английский язык.
    
    Args:
        batch_size: Количество персонажей для обработки за раз
        api_url: URL API сервера
        force: Если True, переводит даже если description_en уже заполнен
    """
    logger.info("=" * 80)
    logger.info("Запуск автоматического перевода описаний персонажей")
    logger.info("=" * 80)
    
    async with async_session_maker() as db:
        try:
            # Получаем персонажей, у которых нет английского описания
            if force:
                query = select(CharacterDB).where(CharacterDB.description.isnot(None))
            else:
                query = select(CharacterDB).where(
                    CharacterDB.description.isnot(None),
                    CharacterDB.description_en.is_(None)
                )
            
            result = await db.execute(query)
            characters = result.scalars().all()
            
            total = len(characters)
            logger.info(f"Найдено персонажей для перевода: {total}")
            
            if total == 0:
                logger.info("Все персонажи уже имеют английские описания!")
                return
            
            # Обрабатываем батчами
            for i in range(0, total, batch_size):
                batch = characters[i:i + batch_size]
                logger.info(f"\nОбработка батча {i // batch_size + 1}/{(total + batch_size - 1) // batch_size}")
                
                for character in batch:
                    try:
                        logger.info(f"Персонаж: {character.name} (ID: {character.id})")
                        
                        # Переводим description
                        if character.description:
                            translated_desc = await translate_text(character.description, api_url)
                            
                            # Обновляем в БД
                            await db.execute(
                                update(CharacterDB)
                                .where(CharacterDB.id == character.id)
                                .values(description_en=translated_desc)
                            )
                            logger.info(f"✓ Описание переведено для {character.name}")
                        else:
                            logger.info(f"⚠ Нет описания для {character.name}")
                        
                        # Небольшая задержка, чтобы не перегружать API
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        logger.error(f"✗ Ошибка обработки {character.name}: {e}")
                        continue
                
                # Коммитим батч
                await db.commit()
                logger.info(f"Батч {i // batch_size + 1} сохранен в БД")
            
            logger.info("\n" + "=" * 80)
            logger.info(f"✓ Перевод завершен! Обработано персонажей: {total}")
            logger.info("=" * 80)
            
        except Exception as e:
            logger.error(f"Критическая ошибка: {e}")
            await db.rollback()
            raise


async def main():
    """Главная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Автоматический перевод описаний персонажей")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Количество персонажей для обработки за раз"
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default=os.getenv("API_URL", "http://localhost:8000"),
        help="URL API сервера"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Переводить даже если description_en уже заполнен"
    )
    
    args = parser.parse_args()
    
    await translate_character_descriptions(
        batch_size=args.batch_size,
        api_url=args.api_url,
        force=args.force
    )


if __name__ == "__main__":
    asyncio.run(main())
