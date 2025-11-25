from typing import AsyncGenerator
import logging

from app.database.db import async_session_maker
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Получает сессию БД с защитой от зависаний."""
    # Используем async_session_maker как context manager
    # pool_timeout уже настроен в db.py на 5 секунд
    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Ошибка в сессии БД: {e}")
            raise
