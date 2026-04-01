import asyncio
import logging
import sys
from pathlib import Path

# Добавляем корень проекта в sys.path для корректного импорта моделей
project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from sqlalchemy import text, select, inspect
from app.database.db import async_session_maker
from slugify import slugify

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_users_columns(session):
    """Исправление колонок в таблице users"""
    logger.info("🔍 Проверка таблицы 'users'...")
    inspector = await session.run_sync(lambda conn: inspect(conn))
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'has_welcome_discount' not in columns:
        logger.warning("⚠️ Колонка 'has_welcome_discount' отсутствует, добавляем...")
        await session.execute(text("ALTER TABLE users ADD COLUMN has_welcome_discount BOOLEAN DEFAULT FALSE NOT NULL;"))
        logger.info("✅ Колонка 'has_welcome_discount' добавлена.")
    
    if 'welcome_discount_used' not in columns:
        logger.warning("⚠️ Колонка 'welcome_discount_used' отсутствует, добавляем...")
        await session.execute(text("ALTER TABLE users ADD COLUMN welcome_discount_used BOOLEAN DEFAULT FALSE NOT NULL;"))
        logger.info("✅ Колонка 'welcome_discount_used' добавлена.")

async def fix_characters_columns(session):
    """Исправление колонок в таблице characters"""
    logger.info("🔍 Проверка таблицы 'characters'...")
    inspector = await session.run_sync(lambda conn: inspect(conn))
    columns = [col['name'] for col in inspector.get_columns('characters')]
    
    if 'slug' not in columns:
        logger.warning("⚠️ Колонка 'slug' отсутствует, добавляем...")
        await session.execute(text("ALTER TABLE characters ADD COLUMN slug VARCHAR(100);"))
        logger.info("✅ Колонка 'slug' добавлена.")
    
    # Проверка индекса
    indexes = inspector.get_indexes('characters')
    index_names = [idx['name'] for idx in indexes]
    if 'ix_characters_slug' not in index_names:
        logger.warning("⚠️ Индекс 'ix_characters_slug' отсутствует, создаем...")
        try:
            await session.execute(text("CREATE INDEX ix_characters_slug ON characters (slug);"))
            logger.info("✅ Индекс 'ix_characters_slug' создан.")
        except Exception as e:
            logger.info(f"ℹ️ Не удалось создать индекс (возможно уже есть): {e}")

    # Заполняем пустые слаги
    from app.chat_bot.models.models import CharacterDB
    char_result = await session.execute(select(CharacterDB))
    characters = char_result.scalars().all()
    updated = 0
    for char in characters:
        if not char.slug:
            char.slug = slugify(char.name or f"character_{char.id}")
            updated += 1
    
    if updated > 0:
        await session.commit()
        logger.info(f"✅ Обновлено слагов: {updated}")
    else:
        logger.info("✅ Все персонажи имеют слаги.")

async def fix_all():
    """Главная функция исправления БД"""
    logger.info("🚀 Запуск процесса исправления БД (fallback)...")
    async with async_session_maker() as session:
        try:
            await fix_users_columns(session)
            await fix_characters_columns(session)
            await session.commit()
            logger.info("✨ Все исправления БД успешно завершены.")
        except Exception as e:
            logger.error(f"❌ Критическая ошибка при исправлении БД: {e}")
            await session.rollback()
            # Информативно выводим ошибку, но не прерываем запуск контейнера,
            # так как это fallback скрипт (в docker-compose стоит || true)

if __name__ == "__main__":
    asyncio.run(fix_all())
