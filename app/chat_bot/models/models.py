"""
SQLAlchemy models for chatbot.
"""
from sqlalchemy import Column, Integer, String, JSON, DateTime, Text, TypeDecorator, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.db import Base
import json


class UTF8JSON(TypeDecorator):
    """Custom JSON type with UTF-8 encoding support."""
    impl = JSON
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.loads(json.dumps(value, ensure_ascii=False))
        return value
    
    def process_result_value(self, value, dialect):
        return value


class UTF8Text(TypeDecorator):
    """Custom Text type with UTF-8 encoding support."""
    impl = Text
    
    def process_bind_param(self, value, dialect):
        """Обрабатывает значение перед сохранением в БД."""
        if value is None:
            return None
        if isinstance(value, str):
            # Убеждаемся, что строка правильно закодирована
            try:
                # Проверяем, что строка может быть закодирована в UTF-8
                value.encode('utf-8')
                return value
            except UnicodeEncodeError:
                # Если не может быть закодирована, заменяем проблемные символы
                return value.encode('utf-8', errors='replace').decode('utf-8')
        return str(value)
    
    def process_result_value(self, value, dialect):
        """Обрабатывает значение после получения из БД."""
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return str(value)
    
    def load_dialect_impl(self, dialect):
        """Загружает реализацию для конкретного диалекта."""
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(Text())
        else:
            return dialect.type_descriptor(Text())


class CharacterAvailableTag(Base):
    """Доступные теги для персонажей (админы могут добавлять)."""
    __tablename__ = "character_available_tags"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)


class CharacterDB(Base):
    """Character model with unified prompt in Alpaca format."""
    __tablename__ = "characters"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    display_name = Column(String(200), nullable=True, default=None)  # Display name
    description = Column(UTF8Text, nullable=True, default=None)  # Character description
    prompt = Column(UTF8Text, nullable=False)
    character_appearance = Column(UTF8Text, nullable=True, default=None)
    location = Column(UTF8Text, nullable=True, default=None)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # User relationship
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # Creation time
    main_photos = Column(UTF8Text, nullable=True, default=None)  # JSON string with main photo IDs
    is_nsfw = Column(Boolean, nullable=False, server_default='1')
    voice_url = Column(String(500), nullable=True, default=None)  # URL для образца голоса (TTS)
    voice_id = Column(String(100), nullable=True, default=None)  # ID голоса из папки default_character_voices
    tags = Column(JSON, nullable=True, default=list)  # Список тегов (имена из character_available_tags)
    # face_image removed (IP-Adapter removed)


class PaidAlbumUnlock(Base):
    """Информация о разблокированных платных альбомах пользователей."""

    __tablename__ = "paid_album_unlocks"
    __table_args__ = (
        UniqueConstraint("user_id", "character_slug", name="uq_paid_album_unlock_user_character"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_name = Column(String(200), nullable=False)
    character_slug = Column(String(200), nullable=False, index=True)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())


class CharacterMainPhoto(Base):
    """Главные фотографии персонажа."""

    __tablename__ = "character_main_photos"
    __table_args__ = (
        UniqueConstraint("character_id", "photo_id", name="uq_character_main_photo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id = Column(String(255), nullable=False)
    photo_url = Column(UTF8Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaidAlbumPhoto(Base):
    """Фотографии платного альбома персонажа (только метаданные: URL и ID)."""

    __tablename__ = "paid_album_photos"
    __table_args__ = (
        UniqueConstraint("character_id", "photo_id", name="uq_paid_album_photo"),
    )

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id = Column(String(255), nullable=False)
    photo_url = Column(UTF8Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    """Chat session: one user/character and series of messages."""
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(64), nullable=True, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    character = relationship("CharacterDB")
    messages = relationship("ChatMessageDB", back_populates="session", cascade="all, delete-orphan")


class ChatMessageDB(Base):
    """Сообщение чата, привязанное к сессии."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String(32), nullable=False)  # 'user' | 'assistant'
    content = Column(UTF8Text, nullable=False)
    audio_url = Column(String(500), nullable=True)  # URL аудио файла TTS, если есть
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


class FavoriteCharacter(Base):
    """Избранные персонажи пользователя."""
    __tablename__ = "favorite_characters"
    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_favorite_character_user_character"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    character = relationship("CharacterDB")


class TipMessage(Base):
    """Сообщения благодарности от пользователей создателям персонажей."""
    __tablename__ = "tip_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    character_name = Column(String(200), nullable=False)
    amount = Column(Integer, nullable=False)
    message = Column(UTF8Text, nullable=True)
    is_read = Column(Boolean, nullable=False, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("Users", foreign_keys=[sender_id])
    receiver = relationship("Users", foreign_keys=[receiver_id])
    character = relationship("CharacterDB")


class CharacterRating(Base):
    """Лайки и дизлайки персонажей от пользователей."""
    __tablename__ = "character_ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "character_id", name="uq_character_rating_user_character"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(Integer, ForeignKey("characters.id", ondelete="CASCADE"), nullable=False, index=True)
    is_like = Column(Boolean, nullable=False)  # True для лайка, False для дизлайка
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    character = relationship("CharacterDB")