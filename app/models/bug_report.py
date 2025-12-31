"""
Модель баг-репортов.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, String, Integer, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.db import Base
import enum


class BugStatus(str, enum.Enum):
    """Статусы баг-репорта."""
    PENDING = "На проверке"
    IN_PROGRESS = "В разработке"
    COMPLETED = "Завершено"


class BugReport(Base):
    """Модель баг-репорта."""
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    title = Column(String(500), nullable=False)  # Название проблемы
    description = Column(Text, nullable=False)  # Описание проблемы
    location = Column(String(500), nullable=True)  # Где происходит проблема
    status = Column(SQLEnum(BugStatus), default=BugStatus.PENDING, nullable=False)  # Статус баг-репорта
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )

    # Связь с пользователем
    user = relationship("Users", backref="bug_reports")
    # Связь с комментариями
    comments = relationship("BugComment", back_populates="bug_report", cascade="all, delete-orphan", order_by="BugComment.created_at")


class BugComment(Base):
    """Модель комментария к баг-репорту."""
    __tablename__ = "bug_comments"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    bug_report_id = Column(Integer, ForeignKey("bug_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    content = Column(Text, nullable=False)  # Текст комментария
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )

    # Связи
    bug_report = relationship("BugReport", back_populates="comments")
    user = relationship("Users", backref="bug_comments")

