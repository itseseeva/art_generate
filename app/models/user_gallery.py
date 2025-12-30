"""
Модель для хранения фото в галерее пользователя.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, String, DateTime, Integer, Text, text
from sqlalchemy.orm import relationship
from app.database.db import Base


class UserGallery(Base):
    """Модель для хранения фото в галерее пользователя."""
    __tablename__ = "user_gallery"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)  # URL изображения
    image_filename = Column(String(200), nullable=True)  # Имя файла изображения
    character_name = Column(String(100), nullable=True)  # Имя персонажа, с которым было сгенерировано фото
    description = Column(Text, nullable=True)  # Описание фото (опционально)
    created_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )

    # Связь с пользователем
    user = relationship("Users", backref="gallery_photos")

