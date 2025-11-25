"""
Тесты для кэширования истории чата с реальным Redis.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from types import SimpleNamespace

from app.chat_history.services.chat_history_service import ChatHistoryService
from app.utils.redis_cache import cache_set, cache_get, key_chat_history, TTL_CHAT_HISTORY


@pytest_asyncio.fixture
async def mock_db():
    """Создает мок базы данных."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest_asyncio.fixture
def sample_messages():
    """Создает примеры сообщений."""
    now = datetime.utcnow()
    return [
        SimpleNamespace(
            id=1,
            user_id=123,
            character_name="anna",
            session_id="session1",
            message_type="user",
            message_content="Hello",
            created_at=now,
            image_url=None,
            image_filename=None,
        ),
        SimpleNamespace(
            id=2,
            user_id=123,
            character_name="anna",
            session_id="session1",
            message_type="character",
            message_content="Hi there!",
            created_at=now,
            image_url=None,
            image_filename=None,
        ),
    ]


@pytest.mark.asyncio
async def test_get_chat_history_from_cache(redis_client, mock_db, sample_messages):
    """Тест получения истории чата из кэша."""
    service = ChatHistoryService(mock_db)
    
    cached_history = [
        {
            "type": msg.message_type,
            "content": msg.message_content,
            "timestamp": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in sample_messages
    ]

    cache_key = key_chat_history(123, "anna", "session1")
    await cache_set(cache_key, cached_history, ttl_seconds=TTL_CHAT_HISTORY)
    
    with patch.object(service, 'can_save_history', return_value=True):
        history = await service.get_chat_history(123, "anna", "session1")
        
        assert len(history) == len(sample_messages)
        assert history[0]["type"] == "user"
        mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_chat_history_from_db(redis_client, mock_db, sample_messages):
    """Тест получения истории чата из БД и сохранения в кэш."""
    service = ChatHistoryService(mock_db)
    
    with patch.object(service, 'can_save_history', return_value=True):
        mock_result = MagicMock()
        mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=sample_messages)))
        mock_db.execute.return_value = mock_result
        
        history = await service.get_chat_history(123, "anna", "session1")
        
        assert len(history) == len(sample_messages)
        
        cached = await cache_get(key_chat_history(123, "anna", "session1"))
        assert cached is not None
        assert cached[0]["type"] == "user"


@pytest.mark.asyncio
async def test_cache_invalidation_on_save_message(redis_client, mock_db):
    """Тест инвалидации кэша при сохранении сообщения."""
    service = ChatHistoryService(mock_db)
    user_id = 123
    character_name = "anna"
    session_id = "session1"
    
    # Мокаем проверку прав
    cache_key = key_chat_history(user_id, character_name, session_id)
    await cache_set(cache_key, [{"type": "user", "content": "cached"}], ttl_seconds=TTL_CHAT_HISTORY)

    with patch.object(service, 'can_save_history', return_value=True):
        # Мокаем успешное сохранение
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        # Мокаем создание объекта ChatHistory без проблем с SQLAlchemy
        with patch('app.chat_history.services.chat_history_service.ChatHistory') as mock_chat_history:
            mock_chat_history.return_value = MagicMock()
            
            result = await service.save_message(
                user_id, character_name, session_id,
                "user", "Test message"
            )
            
            assert result is True
            assert await cache_get(cache_key) is None

