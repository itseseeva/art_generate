"""
Скрипт для однократного заполнения name_ru / name_en у всех существующих персонажей.
Запускается автоматически при старте backend-контейнера (если поля пустые).

Использование:
    python -m app.scripts.translate_character_names
    # или напрямую:
    cd /app && python app/scripts/translate_character_names.py
"""
import asyncio
import logging
import sys
import os

# Добавляем корень проекта в sys.path чтобы импорты работали при прямом запуске
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


async def translate_all_names():
    """Переводит name_ru/name_en для всех персонажей у которых эти поля пустые."""
    from app.database.db import async_session_maker
    from app.chat_bot.models.models import CharacterDB
    # ВАЖНО: импортируем Users чтобы SQLAlchemy мог разрешить все relationships
    # (TipMessage.sender/receiver ссылается на 'Users', иначе - KeyError)
    from app.models.user import Users  # noqa: F401
    from app.services.translation_service import (
        auto_translate_and_save_character,
        detect_language,
    )
    from sqlalchemy import select, or_

    async with async_session_maker() as session:
        # Выбираем персонажей у которых нет хотябы одного из переводов имени
        result = await session.execute(
            select(CharacterDB).where(
                or_(
                    CharacterDB.name_ru.is_(None),
                    CharacterDB.name_en.is_(None),
                )
            ).order_by(CharacterDB.id)
        )
        characters = result.scalars().all()

    total = len(characters)
    logger.info(f"[translate_names] Найдено {total} персонажей без перевода имени")

    if total == 0:
        logger.info("[translate_names] Все персонажи уже переведены, ничего не делаем")
        return

    success = 0
    failed = 0
    skipped = 0

    for i, char in enumerate(characters, 1):
        try:
            # Открываем новую сессию для каждого персонажа чтобы не держать большую транзакцию
            async with async_session_maker() as session:
                fresh = await session.get(CharacterDB, char.id)
                if not fresh:
                    skipped += 1
                    continue

                # Определяем язык по имени + display_name
                source_text = fresh.display_name or fresh.name or ""
                source_lang = detect_language(source_text)

                changed = False

                # --- Переводим на EN ---
                if not fresh.name_en:
                    was_translated = await auto_translate_and_save_character(
                        fresh, session, target_lang='en'
                    )
                    if was_translated:
                        changed = True

                # --- Переводим на RU ---
                if not fresh.name_ru:
                    was_translated = await auto_translate_and_save_character(
                        fresh, session, target_lang='ru'
                    )
                    if was_translated:
                        changed = True

                if changed:
                    success += 1
                    logger.info(
                        f"[{i}/{total}] ✓ {fresh.name!r:20s} → RU={fresh.name_ru!r:20s} EN={fresh.name_en!r}"
                    )
                else:
                    skipped += 1
                    logger.debug(f"[{i}/{total}] SKIP {fresh.name!r} (поля уже заполнены)")

        except Exception as e:
            failed += 1
            logger.error(f"[{i}/{total}] ✗ {char.name!r}: {e}")
            # Не останавливаемся — продолжаем с остальными
            await asyncio.sleep(1)  # Небольшая пауза при ошибке

        # Небольшая пауза чтобы не перегружать Google Translate API
        if i % 10 == 0:
            logger.info(f"  Прогресс: {i}/{total} (success={success}, failed={failed}, skipped={skipped})")
            await asyncio.sleep(2)

    logger.info(
        f"[translate_names] Готово: переведено={success}, пропущено={skipped}, ошибок={failed} из {total}"
    )


if __name__ == "__main__":
    asyncio.run(translate_all_names())
