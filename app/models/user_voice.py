"""
Модель пользовательских голосов.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, String, DateTime, Integer
from sqlalchemy.orm import relationship
from app.database.db import Base


class UserVoice(Base):
    """Модель пользовательского голоса."""
    __tablename__ = "user_voices"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    voice_name = Column(String(200), nullable=False, default="Мой Голос")
    voice_url = Column(String(500), nullable=False)  # URL к файлу голоса
    preview_url = Column(String(500), nullable=True)  # URL к превью голоса
    photo_url = Column(String(500), nullable=True)  # URL к фото голоса
    is_public = Column(Integer, nullable=False, default=0)  # 0 - приватный, 1 - общедоступный
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False
    )

    user = relationship("Users", back_populates="user_voices")
