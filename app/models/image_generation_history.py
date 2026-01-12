"""
Модель для истории генераций изображений в чате.
Простая таблица для надежного сохранения всех сгенерированных изображений.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.database.db import Base


class ImageGenerationHistory(Base):
    """
    История генераций изображений в чате.
    
    Best practices:
    - Простая структура без сложных связей
    - Все необходимые данные в одной таблице
    - Индексы для быстрого поиска
    - Автоматическое время создания
    """
    __tablename__ = "image_generation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    character_name = Column(String(100), nullable=False, index=True)
    prompt = Column(Text, nullable=True)  # Промпт пользователя
    admin_prompt = Column(Text, nullable=True)  # Промпт админа (приоритетный)
    image_url = Column(String(1000), nullable=False)  # URL изображения (обязательно)
    generation_time = Column(Integer, nullable=True)  # Время генерации в секундах
    task_id = Column(String(100), nullable=True, index=True)  # ID задачи генерации
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Индексы для быстрого поиска
    __table_args__ = (
        Index('idx_user_character_created', 'user_id', 'character_name', 'created_at'),
        Index('idx_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self):
        return (
            f"<ImageGenerationHistory(id={self.id}, user_id={self.user_id}, "
            f"character={self.character_name}, image_url={self.image_url[:50]}...)>"
        )
