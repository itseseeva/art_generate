"""
Celery задачи для перевода персонажей.
"""
import logging
import asyncio
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.translation_tasks.translate_character_names_task",
    max_retries=3,
    default_retry_delay=120,
    queue="low_priority"
)
def translate_character_names_task(self, character_id: int) -> dict:
    """
    Celery задача: переводит имя (и остальные поля) нового персонажа
    на оба языка (ru и en) после создания.
    """
    try:
        # Создаём свежий event loop для каждого вызова задачи
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_translate_character_async(character_id))
            return result
        finally:
            # Даём корутинам время завершиться перед закрытием loop
            try:
                pending = asyncio.all_tasks(loop)
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except Exception:
                pass
            loop.close()
    except Exception as exc:
        logger.error(f"[TRANSLATE_TASK] Ошибка перевода персонажа {character_id}: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=120)
        return {"success": False, "character_id": character_id, "error": str(exc)}


async def _translate_character_async(character_id: int) -> dict:
    """
    Асинхронная часть задачи перевода персонажа.

    ВАЖНО: используем NullPool — каждый вызов задачи создаёт свои соединения
    и не кэширует их в пуле. Это необходимо для Celery, где каждая задача
    запускается в новом event loop, а asyncpg соединения привязаны к loop.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import NullPool
    import os

    # Импортируем Users чтобы SQLAlchemy мог разрешить все relationship
    # (TipMessage.sender/receiver ссылается на 'Users' строкой — без этого KeyError)
    try:
        from app.models.user import Users  # noqa: F401
    except ImportError:
        from app.users.models.users import Users  # noqa: F401

    from app.chat_bot.models.models import CharacterDB
    from app.services.translation_service import auto_translate_and_save_character
    from sqlalchemy import select

    logger.info(f"[TRANSLATE_TASK] Начинаем перевод персонажа id={character_id}")

    # Читаем DATABASE_URL из окружения
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        host = os.environ.get("DB_HOST", "localhost")
        port = os.environ.get("DB_PORT", "5432")
        user = os.environ.get("DB_USER", os.environ.get("POSTGRES_USER", "postgres"))
        password = os.environ.get("DB_PASSWORD", os.environ.get("POSTGRES_PASSWORD", ""))
        db_name = os.environ.get("DB_NAME", os.environ.get("POSTGRES_DB", "postgres"))
        db_url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db_name}"

    # NullPool: не кэшируем соединения между задачами — каждая задача открывает
    # и закрывает своё соединение. Это правильный паттерн для Celery + asyncpg.
    engine = create_async_engine(db_url, poolclass=NullPool, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with async_session() as session:
            result = await session.execute(
                select(CharacterDB).where(CharacterDB.id == character_id)
            )
            character = result.scalar_one_or_none()

            if not character:
                logger.warning(f"[TRANSLATE_TASK] Персонаж id={character_id} не найден")
                return {"success": False, "character_id": character_id, "error": "not found"}

            # Переводим ТОЛЬКО имена, как заявлено в названии задачи (остальные поля не трогаем, чтобы не затереть)
            from app.services.translation_service import translate_text, detect_language
            
            # Определяем исходный язык по имени
            source_name = character.name or ""
            if source_name:
                src_lang = detect_language(source_name)
                
                if src_lang == 'ru':
                    character.name_ru = source_name
                    if not character.name_en:
                        character.name_en = await translate_text(source_name, source='ru', target='en')
                else:
                    character.name_en = source_name
                    if not character.name_ru:
                        character.name_ru = await translate_text(source_name, source='en', target='ru')
                        
                await session.commit()
                await session.refresh(character)
                
                translated_en = bool(character.name_en)
                translated_ru = bool(character.name_ru)
                logger.info(
                    f"[TRANSLATE_TASK] Персонаж id={character_id} ({character.name}): "
                    f"Name EN={character.name_en}, Name RU={character.name_ru}"
                )
            else:
                translated_en = False
                translated_ru = False
                logger.warning(f"[TRANSLATE_TASK] У персонажа id={character_id} пустое имя")

            # Инвалидируем кэш персонажей, чтобы фронтенд получил обновлённые name_ru/name_en
            try:
                from app.utils.redis_cache import cache_delete, cache_delete_pattern, key_characters_list, key_character
                await cache_delete(key_characters_list())
                await cache_delete_pattern("characters:list:*")
                # Также инвалидируем кэш конкретного персонажа
                await cache_delete(key_character(character.name))
                logger.info(f"[TRANSLATE_TASK] Кэш персонажей инвалидирован после перевода id={character_id}")
            except Exception as cache_err:
                logger.warning(f"[TRANSLATE_TASK] Не удалось инвалидировать кэш: {cache_err}")

            return {
                "success": True,
                "character_id": character_id,
                "name": character.name,
                "name_ru": character.name_ru,
                "name_en": character.name_en,
                "translated_en": translated_en,
                "translated_ru": translated_ru,
            }
    finally:
        await engine.dispose()
