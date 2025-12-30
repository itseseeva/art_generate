from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.db import Base


class ChatHistory(Base):
    """Модель для сохранения истории чата по персонажам."""
    __tablename__ = "chat_history"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    character_name = Column(String(100), nullable=False, index=True)
    session_id = Column(String(100), nullable=False, index=True)  # ID сессии чата
    message_type = Column(String(20), nullable=False)  # 'user' или 'assistant'
    message_content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)  # URL изображения, если есть
    image_filename = Column(String(200), nullable=True)  # Имя файла изображения
    generation_time = Column(Integer, nullable=True)  # Время генерации изображения в секундах
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связь с пользователем
    user = relationship("Users")
