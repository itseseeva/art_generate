"""
Модель для хранения информации о разблокировке галерей пользователей.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, ForeignKey, Integer, DateTime, UniqueConstraint, text
from sqlalchemy.orm import relationship
from app.database.db import Base


class UserGalleryUnlock(Base):
    """Модель для хранения информации о разблокировке галереи пользователя."""
    __tablename__ = "user_gallery_unlock"
    __table_args__ = (
        UniqueConstraint('unlocker_id', 'target_user_id', name='unique_gallery_unlock'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    unlocker_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # Кто разблокировал
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # Чью галерею разблокировали
    unlocked_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )

    # Связи
    unlocker = relationship("Users", foreign_keys=[unlocker_id], backref="unlocked_galleries")
    target_user = relationship("Users", foreign_keys=[target_user_id], backref="gallery_unlocks")

