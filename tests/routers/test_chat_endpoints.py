import pytest
import json
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app
from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user_optional
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.chat_bot.models.models import CharacterDB, ChatSession, ChatMessageDB
from datetime import datetime

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_user():
    user = MagicMock(spec=Users)
    user.id = 1
    user.email = "test@example.com"
    return user

@pytest.mark.asyncio
async def test_get_chat_status_online(mock_db):
    """Test /status endpoint when OpenRouter is online."""
    with patch("app.chat_bot.api.chat_endpoints.openrouter_service", new_callable=AsyncMock) as mock_service:
        mock_service.check_connection.return_value = True
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/v1/chat/status")
            
        assert response.status_code == 200
        assert response.json()["status"] == "online"
        assert response.json()["openrouter_connected"] is True

@pytest.mark.asyncio
async def test_chat_with_character_success(mock_db, mock_user):
    """Test simple chat with a character."""
    from httpx import ASGITransport
    async def override_get_db():
        yield mock_db
    async def override_get_current_user_optional():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional
    
    # Mock character
    char = MagicMock(spec=CharacterDB)
    char.id = 1
    char.name = "Aya"
    char.prompt = "Default prompt"
    char.location = "Somewhere"
    
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    
    # Mock Subscription
    sub = MagicMock(spec=UserSubscription)
    sub.is_active = True
    sub.subscription_type = SubscriptionType.STANDARD
    sub_res = MagicMock()
    sub_res.scalar_one_or_none.return_value = sub
    
    # Mock execute sequences
    def execute_se(q, *args, **kwargs):
        # We can analyze the query to return char or sub or session
        q_str = str(q).lower()
        res = MagicMock()
        if "character" in q_str:
            res.scalar_one_or_none.return_value = char
        elif "subscription" in q_str:
            res.scalar_one_or_none.return_value = sub
        elif "chatsession" in q_str:
            res.scalar_one_or_none.return_value = None
        else:
            res.scalar_one_or_none.return_value = None
            res.scalars.return_value.all.return_value = []
        return res

    mock_db.execute.side_effect = AsyncMock(side_effect=execute_se)
    
    with patch("app.chat_bot.api.chat_endpoints.openrouter_service", new_callable=AsyncMock) as mock_service, \
         patch("app.utils.model_manager.get_active_model", new_callable=AsyncMock) as mock_model_get:
        
        mock_model_get.return_value = "sao10k/l3-euryale-70b"
        mock_service.generate_text.return_value = "Hello from AI"
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/chat/chat", json={
                "character": "Aya",
                "message": "Hi"
            })
            
        if response.status_code != 200:
            print(f"Chat error detail: {response.json()}")
            
        assert response.status_code == 200
        assert response.json()["response"] == "Hello from AI"

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_generate_voice_no_subscription(mock_db, mock_user):
    """Test TTS fails without active subscription."""
    from httpx import ASGITransport
    async def override_get_db():
        yield mock_db
    async def override_get_current_user_optional():
        return mock_user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional

    with patch("app.services.profit_activate.ProfitActivateService", new_callable=MagicMock) as mock_service_class:
        mock_service = mock_service_class.return_value
        mock_service.get_user_subscription = AsyncMock(return_value=None)
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/chat/generate_voice", json={
                "text": "Hello",
                "voice_url": "test.wav"
            })
            
        assert response.status_code == 403
        assert "подписка" in response.json()["detail"]

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_chat_stream_success(mock_db, mock_user):
    """Test streaming chat logic."""
    from httpx import ASGITransport
    async def override_get_db():
        yield mock_db
    async def override_get_current_user_optional():
        return mock_user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional

    char = MagicMock(spec=CharacterDB)
    char.id = 1
    char.name = "Aya"
    char.prompt = "Aya prompt"
    char.location = "Some location"
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = None
    
    sub_res = MagicMock()
    sub_res.scalar_one_or_none.return_value = None # Free
    
    # For stream save logic (L709)
    sub_res_save = MagicMock()
    sub_res_save.scalar_one_or_none.return_value = None
    
    mock_db.execute.side_effect = [char_res, sess_res, sub_res, sub_res_save]

    async def mock_stream(*args, **kwargs):
        yield "Hello "
        yield "World"

    with patch("app.chat_bot.api.chat_endpoints.openrouter_service", new_callable=AsyncMock) as mock_service:
        mock_service.generate_text_stream = mock_stream
        
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/chat/chat/stream", json={
                "character": "Aya",
                "message": "Hi"
            })
            
        if response.status_code != 200:
            print(f"Error detail: {response.json()}")
            
        assert response.status_code == 200
        assert "Hello" in response.text
        assert "World" in response.text

    app.dependency_overrides.clear()
