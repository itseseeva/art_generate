"""
Модель истории баланса пользователя.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, String, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from app.database.db import Base


class BalanceHistory(Base):
    """Модель истории изменений баланса пользователя."""
    __tablename__ = "balance_history"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    amount = Column(Integer, nullable=False)  # Сумма изменения (может быть отрицательной для списаний)
    balance_before = Column(Integer, nullable=False)  # Баланс до изменения
    balance_after = Column(Integer, nullable=False)  # Баланс после изменения
    reason = Column(Text, nullable=False)  # Причина изменения (например, "Редактирование персонажа", "Генерация фото")
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
        index=True
    )

    user = relationship("Users", backref="balance_history")

    def __repr__(self):
        return f"<BalanceHistory(id={self.id}, user_id={self.user_id}, amount={self.amount}, reason='{self.reason}')>"

