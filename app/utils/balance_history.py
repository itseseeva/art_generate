"""
Утилита для записи истории изменений баланса пользователя.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.balance_history import BalanceHistory
from app.models.user import Users
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)


async def record_balance_change(
    db: AsyncSession,
    user_id: int,
    amount: int,
    reason: str
) -> None:
    """
    Записывает изменение баланса в историю.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        amount: Сумма изменения (может быть отрицательной для списаний)
        reason: Причина изменения (например, "Редактирование персонажа", "Генерация фото")
    """
    try:
        # Получаем текущий баланс пользователя
        result = await db.execute(
            select(Users).where(Users.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"Пользователь {user_id} не найден для записи истории баланса")
            return
        
        balance_before = user.coins - amount  # Баланс до изменения
        balance_after = user.coins  # Баланс после изменения
        
        # Создаем запись в истории
        history_entry = BalanceHistory(
            user_id=user_id,
            amount=amount,
            balance_before=balance_before,
            balance_after=balance_after,
            reason=reason
        )
        
        db.add(history_entry)
        await db.flush()  # Сохраняем без коммита (коммит будет позже)
        
        logger.info(
            f"Записана история баланса для пользователя {user_id}: "
            f"{amount} кредитов, причина: {reason}, баланс: {balance_before} -> {balance_after}"
        )
    except Exception as e:
        logger.error(f"Ошибка записи истории баланса для пользователя {user_id}: {e}", exc_info=True)
        # Не прерываем выполнение, если не удалось записать историю

