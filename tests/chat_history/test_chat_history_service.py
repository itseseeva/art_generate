import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from app.chat_history.services.chat_history_service import ChatHistoryService
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from datetime import datetime

@pytest.fixture
def chat_history_service(db_session):
    return ChatHistoryService(db_session)

@pytest.mark.asyncio
async def test_can_save_history_active_subscription(chat_history_service):
    """Test can_save_history returns True for active subscription."""
    user_id = 1
    
    # Mock SubscriptionService.get_user_subscription
    with patch.object(chat_history_service.subscription_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub:
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.is_active = True
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_get_sub.return_value = mock_sub
        
        result = await chat_history_service.can_save_history(user_id)
        assert result is True

@pytest.mark.asyncio
async def test_can_save_history_no_subscription(chat_history_service):
    """Test can_save_history returns False if no subscription."""
    user_id = 1
    
    with patch.object(chat_history_service.subscription_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub:
        mock_get_sub.return_value = None
        
        result = await chat_history_service.can_save_history(user_id)
        assert result is False

@pytest.mark.asyncio
async def test_save_message_success(chat_history_service, db_session):
    """Test save_message successfully saves to DB and clears cache."""
    user_id = 1
    character_name = "TestChar"
    session_id = "session123"
    message_type = "user"
    content = "Hello"
    
    # Mock can_save_history to True
    with patch.object(chat_history_service, 'can_save_history', new_callable=AsyncMock) as mock_can_save:
        mock_can_save.return_value = True
        
        # Mock DB operations on the session attached to the service
        with patch.object(chat_history_service.db, 'execute', new_callable=AsyncMock) as mock_execute, \
             patch.object(chat_history_service.db, 'commit', new_callable=AsyncMock) as mock_commit, \
             patch("app.chat_history.services.chat_history_service.cache_delete", new_callable=AsyncMock) as mock_cache_del:
            
            result = await chat_history_service.save_message(
                user_id, character_name, session_id, message_type, content
            )
            
            assert result is True
            assert mock_execute.called
            assert mock_commit.called
            # Verify cache invalidation called
            assert mock_cache_del.call_count >= 1

@pytest.mark.asyncio
async def test_get_chat_history_from_cache(chat_history_service):
    """Test get_chat_history returns cached data if available."""
    user_id = 1
    character_name = "TestChar"
    session_id = "session123"
    
    cached_data = [{"content": "Cached Hello", "type": "user"}]
    
    with patch("app.chat_history.services.chat_history_service.cache_get", new_callable=AsyncMock) as mock_cache_get, \
         patch.object(chat_history_service, 'can_save_history', new_callable=AsyncMock) as mock_can_save:
        
        mock_can_save.return_value = True
        mock_cache_get.return_value = cached_data
        
        result = await chat_history_service.get_chat_history(user_id, character_name, session_id)
        assert result == cached_data
        
@pytest.mark.asyncio
async def test_get_chat_history_db_fallback(chat_history_service, db_session):
    """Test get_chat_history fetches from DB if cache miss."""
    user_id = 1
    character_name = "TestChar"
    session_id = "session123"
    
    with patch("app.chat_history.services.chat_history_service.cache_get", new_callable=AsyncMock) as mock_cache_get, \
         patch("app.chat_history.services.chat_history_service.cache_set", new_callable=AsyncMock) as mock_cache_set, \
         patch.object(chat_history_service, 'can_save_history', new_callable=AsyncMock) as mock_can_save:
        
        mock_can_save.return_value = True
        mock_cache_get.return_value = None
        
        # We need to mock DB execution result
        # This is hard with raw SQL or complex selects without inserting data.
        # For unit test, we can mock db_session.execute
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [] # Empty history
        
        # We have to patch the session attached to service
        with patch.object(chat_history_service.db, 'execute', new_callable=AsyncMock) as mock_db_exec:
             mock_db_exec.return_value = mock_result
             
             result = await chat_history_service.get_chat_history(user_id, character_name, session_id)
             
             assert isinstance(result, list)
             assert mock_cache_set.called

@pytest.mark.asyncio
async def test_clear_all_chat_history_success(chat_history_service, db_session):
    """Test clear_all_chat_history deletes everything and clears cache."""
    user_id = 1
    
    with patch.object(chat_history_service.db, 'execute', new_callable=AsyncMock) as mock_execute, \
         patch.object(chat_history_service.db, 'commit', new_callable=AsyncMock) as mock_commit, \
         patch("app.utils.redis_cache.cache_delete", new_callable=AsyncMock) as mock_cache_del:
        
        # Mocking find sessions
        mock_sessions_result = MagicMock()
        mock_sessions_result.scalars.return_value.all.return_value = []
        mock_execute.return_value = mock_sessions_result
        
        result = await chat_history_service.clear_all_chat_history(user_id)
        
        assert result is True
        assert mock_execute.called
        assert mock_commit.called
        assert mock_cache_del.called

@pytest.mark.asyncio
async def test_get_history_stats_success(chat_history_service, db_session):
    """Test get_history_stats returns correct totals."""
    user_id = 1
    
    with patch.object(chat_history_service, 'can_save_history', new_callable=AsyncMock) as mock_can_save, \
         patch.object(chat_history_service.db, 'execute', new_callable=AsyncMock) as mock_execute:
        
        mock_can_save.return_value = True
        
        # Mock first execute (messages)
        mock_msg_result = MagicMock()
        mock_msg_result.scalars.return_value.all.return_value = [1, 2, 3] # 3 messages
        
        # Mock second execute (characters)
        mock_char_result = MagicMock()
        mock_char_result.fetchall.return_value = [("Char1",), ("Char2",)] # 2 characters
        
        mock_execute.side_effect = [mock_msg_result, mock_char_result]
        
        stats = await chat_history_service.get_history_stats(user_id)
        
        assert stats["can_save_history"] is True
        assert stats["total_messages"] == 3
        assert stats["characters_count"] == 2

@pytest.mark.asyncio
async def test_get_user_characters_with_history_cache_hit(chat_history_service):
    """Test get_user_characters_with_history returns data from cache."""
    user_id = 1
    cached_data = [{"id": 1, "name": "Char1"}]
    
    with patch("app.utils.redis_cache.cache_get", new_callable=AsyncMock) as mock_cache_get:
        mock_cache_get.return_value = cached_data
        
        result = await chat_history_service.get_user_characters_with_history(user_id)
        assert result == cached_data

@pytest.mark.asyncio
async def test_get_user_characters_with_history_no_subscription(chat_history_service):
    """Test returns empty list if no subscription."""
    user_id = 1
    
    with patch("app.utils.redis_cache.cache_get", new_callable=AsyncMock) as mock_cache_get, \
         patch.object(chat_history_service.subscription_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub:
        
        mock_cache_get.return_value = None
        mock_get_sub.return_value = None
        
        result = await chat_history_service.get_user_characters_with_history(user_id)
        assert result == []

@pytest.mark.asyncio
async def test_get_user_characters_with_history_db_success(chat_history_service):
    """Test get_user_characters_with_history fetches from DB and merges data."""
    user_id = 1
    
    with patch("app.utils.redis_cache.cache_get", new_callable=AsyncMock) as mock_cache_get, \
         patch("app.utils.redis_cache.cache_set", new_callable=AsyncMock) as mock_cache_set, \
         patch.object(chat_history_service.subscription_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub, \
         patch.object(chat_history_service.db, 'execute', new_callable=AsyncMock) as mock_execute:
        
        mock_cache_get.return_value = None
        
        mock_sub = MagicMock()
        mock_sub.subscription_type.value = "standard"
        mock_sub.is_active = True
        mock_get_sub.return_value = mock_sub
        
        from datetime import datetime
        now = datetime.now()
        
        # 1. ChatSession check (test_sessions)
        res1 = MagicMock()
        res1.scalars.return_value.all.return_value = []
        
        # 2. Users.username fetch
        res2 = MagicMock()
        res2.first.return_value = ("testuser",)
        
        # 3. Main query (Characters from ChatSession)
        res3 = MagicMock()
        res3.fetchall.return_value = [("Char1", 1, now, 5, now)]
        
        # 4. Diagnostic total messages
        res4 = MagicMock()
        res4.scalar.return_value = 5
        
        # 5. Diagnostic image gen count
        res5 = MagicMock()
        res5.scalar.return_value = 0
        
        # 6. Sample messages loop (for Char1)
        res6 = MagicMock()
        res6.fetchall.return_value = [("Hello", "user", now)]
        
        # 7. Real message check (for Char1)
        res7 = MagicMock()
        res7.scalar.return_value = 5
        
        # 8. ChatHistory fetch
        res8 = MagicMock()
        res8.fetchall.return_value = []
        
        # 9. ChatHistory image diagnostic fetch
        res9 = MagicMock()
        res9.fetchall.return_value = []

        # 10. UserGallery fetch
        res10 = MagicMock()
        res10.fetchall.return_value = []
        
        # 11. ChatSession ids for assistant images
        res11 = MagicMock()
        res11.fetchall.return_value = []
        
        # 12. ChatHistory image result (history_image_result)
        res12 = MagicMock()
        res12.fetchall.return_value = []
        
        mock_execute.side_effect = [res1, res2, res3, res4, res5, res6, res7, res8, res9, res10, res11, res12]

        # Also mock _get_last_image_url
        with patch.object(chat_history_service, '_get_last_image_url', new_callable=AsyncMock) as mock_get_img:
            mock_get_img.return_value = "http://example.com/img.png"
            
            result = await chat_history_service.get_user_characters_with_history(user_id)
            
            assert len(result) == 1
            assert result[0]["name"] == "Char1"
            assert result[0]["last_image_url"] == "http://example.com/img.png"
            assert mock_cache_set.called

