from typing import AsyncGenerator
import logging

from app.database.db import async_session_maker
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Получает сессию БД с защитой от зависаний."""
    # Используем async_session_maker как context manager
    # pool_timeout уже настроен в db.py на 5 секунд
    async with async_session_maker() as session:
        try:
            yield session
        except HTTPException as http_ex:
            # HTTPException с кодами 4xx - это ожидаемые ошибки бизнес-логики
            # Не логируем их как ERROR, чтобы не отправлять в Telegram
            await session.rollback()
            if 400 <= http_ex.status_code < 500:
                # Клиентские ошибки (4xx) - логируем как warning
                logger.debug(f"HTTPException в сессии БД (клиентская ошибка): {http_ex.status_code}: {http_ex.detail}")
            else:
                # Серверные ошибки (5xx) - логируем как error
                logger.error(f"HTTPException в сессии БД (серверная ошибка): {http_ex.status_code}: {http_ex.detail}")
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Ошибка в сессии БД: {e}")
            raise
