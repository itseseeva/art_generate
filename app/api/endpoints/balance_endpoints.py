"""
API эндпоинты для работы с историей баланса пользователя.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.models.balance_history import BalanceHistory
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/v1/balance", tags=["Balance"])


class BalanceHistoryItem(BaseModel):
    """Элемент истории баланса."""
    id: int
    amount: int
    balance_before: int
    balance_after: int
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceHistoryResponse(BaseModel):
    """Ответ с историей баланса."""
    history: List[BalanceHistoryItem]
    total: int


@router.get("/history", response_model=BalanceHistoryResponse)
async def get_balance_history(
    skip: int = 0,
    limit: int = 1000,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получает историю изменений баланса пользователя.
    """
    try:
        # Получаем историю баланса для текущего пользователя
        result = await db.execute(
            select(BalanceHistory)
            .where(BalanceHistory.user_id == current_user.id)
            .order_by(desc(BalanceHistory.created_at))
            .offset(skip)
            .limit(limit)
        )
        history_items = result.scalars().all()

        # Получаем общее количество записей
        from sqlalchemy import func
        count_result = await db.execute(
            select(func.count(BalanceHistory.id))
            .where(BalanceHistory.user_id == current_user.id)
        )
        total = count_result.scalar_one() or 0

        return BalanceHistoryResponse(
            history=[BalanceHistoryItem(
                id=item.id,
                amount=item.amount,
                balance_before=item.balance_before,
                balance_after=item.balance_after,
                reason=item.reason,
                created_at=item.created_at
            ) for item in history_items],
            total=total
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения истории баланса: {str(e)}"
        )

