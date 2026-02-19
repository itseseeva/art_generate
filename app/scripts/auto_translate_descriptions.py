"""
Скрипт для автоматического перевода описаний персонажей на английский.
Запускается один раз при старте приложения.
"""
import asyncio
import sys
import re
from pathlib import Path

# Добавляем корневую директорию в PYTHONPATH
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import select, update
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
from deep_translator import GoogleTranslator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def translate_with_retry(text: str, max_attempts: int = 3) -> str:
    """
    Переводит текст с русского на английский с повторными попытками.
    
    Args:
        text: Текст для перевода
        max_attempts: Максимальное количество попыток
        
    Returns:
        Переведенный текст
    """
    if not text or not text.strip():
        return ""
    
    # Проверяем, есть ли кириллица
    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
    if not has_cyrillic:
        return text
    
    translator = GoogleTranslator(source='ru', target='en')
    last_error = None
    
    for attempt in range(max_attempts):
        try:
            result = translator.translate(text)
            return result
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            is_retryable = (
                "connection" in err_str
                or "timeout" in err_str
                or "network" in err_str
                or "remote end" in err_str
            )
            
            if is_retryable and attempt < max_attempts - 1:
                delay = 1.0 * (attempt + 1)
                logger.warning(f"Сетевой сбой (попытка {attempt + 1}/{max_attempts}), повтор через {delay:.0f}s")
                await asyncio.sleep(delay)
            else:
                if is_retryable and attempt == max_attempts - 1:
                    logger.error(f"Не удалось перевести после {max_attempts} попыток: {e}")
                    return text  # Возвращаем оригинал
                raise  # Пробрасываем не-сетевые ошибки или последнюю сетевую ошибку если не возвращаем текст
    
    return text


async def auto_translate_descriptions():
    """
    Автоматически переводит описания всех персонажей на английский.
    Запускается только для персонажей без английского описания.
    """
    logger.info("=" * 80)
    logger.info("🌍 Автоматический перевод описаний персонажей (RU → EN)")
    logger.info("=" * 80)
    
    async with async_session_maker() as db:
        try:
            # Получаем персонажей без английского описания
            query = select(CharacterDB).where(
                CharacterDB.description.isnot(None),
                CharacterDB.description_en.is_(None)
            )
            
            result = await db.execute(query)
            characters = result.scalars().all()
            
            total = len(characters)
            
            if total == 0:
                logger.info("✓ Все персонажи уже имеют английские описания!")
                return
            
            logger.info(f"📝 Найдено персонажей для перевода: {total}")
            
            translated_count = 0
            failed_count = 0
            
            for i, character in enumerate(characters, 1):
                try:
                    logger.info(f"[{i}/{total}] Перевод: {character.name} (ID: {character.id})")
                    
                    # Переводим описание
                    translated_desc = await translate_with_retry(character.description)
                    
                    if translated_desc and translated_desc != character.description:
                        # Обновляем в БД
                        await db.execute(
                            update(CharacterDB)
                            .where(CharacterDB.id == character.id)
                            .values(description_en=translated_desc)
                        )
                        translated_count += 1
                        logger.info(f"  ✓ Переведено: {translated_desc[:60]}...")
                    else:
                        logger.warning(f"  ⚠ Перевод не удался, пропускаем")
                        failed_count += 1
                    
                    # Небольшая задержка между запросами
                    if i < total:
                        await asyncio.sleep(0.3)
                    
                except Exception as e:
                    logger.error(f"  ✗ Ошибка: {e}")
                    failed_count += 1
                    continue
            
            # Сохраняем все изменения
            await db.commit()
            
            logger.info("=" * 80)
            logger.info(f"✓ Перевод завершен!")
            logger.info(f"  Успешно: {translated_count}")
            logger.info(f"  Ошибок: {failed_count}")
            logger.info("=" * 80)
            
        except Exception as e:
            logger.error(f"Критическая ошибка: {e}")
            await db.rollback()
            raise


def run_translation():
    """Синхронная обертка для запуска из main.py"""
    try:
        asyncio.run(auto_translate_descriptions())
    except Exception as e:
        logger.error(f"Ошибка запуска перевода: {e}")


if __name__ == "__main__":
    asyncio.run(auto_translate_descriptions())
