"""
Модель для хранения транзакций платежей (идемпотентность).
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index
from sqlalchemy.sql import func
from app.database.db import Base


class PaymentTransaction(Base):
    """Модель транзакции платежа для предотвращения дубликатов."""

    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(
        String(255), nullable=False, unique=True, index=True
    )
    payment_type = Column(String(50), nullable=False)  # "subscription" или "topup"
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(String(50), nullable=False)
    currency = Column(String(10), nullable=False, default="RUB")
    label = Column(String(500), nullable=True)
    package_id = Column(String(50), nullable=True)  # Для topup
    subscription_type = Column(String(50), nullable=True)  # Для subscription
    processed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    processed_at = Column(DateTime, nullable=True)

    # Индекс для быстрого поиска по operation_id
    __table_args__ = (
        Index('idx_operation_id', 'operation_id', unique=True),
        Index('idx_user_processed', 'user_id', 'processed'),
    )

    def __repr__(self):
        return (
            f"<PaymentTransaction(operation_id={self.operation_id}, "
            f"user_id={self.user_id}, processed={self.processed})>"
        )
