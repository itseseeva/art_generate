"""
Модель комментариев к персонажам.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, String, Integer, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from app.database.db import Base


class CharacterComment(Base):
    """Модель комментария к персонажу."""
    __tablename__ = "character_comments"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    character_name = Column(String, nullable=False, index=True)  # Имя персонажа
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)  # Текст комментария
    is_edited = Column(Boolean, default=False, nullable=False)  # Был ли комментарий отредактирован
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=True
    )

    # Связь с пользователем
    user = relationship("Users", backref="character_comments")

