
import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionType

# Mock the module-level dependencies that might require external services
with patch("app.chat_bot.api.character_endpoints.YandexCloudStorageService") as MockStorage:
    MockStorage.return_value.generate_presigned_url.return_value = "https://test-storage.url/file.mp3"

@pytest.mark.asyncio
async def test_get_available_voices_unauthorized(client: AsyncClient):
    """Test getting voices without authentication."""
    response = await client.get("/api/v1/characters/available-voices")
    # Depending on auth requirements, this might be 200 (if public) or 401
    # Looking at the code: get_current_user_optional is used, so it should be allowed
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)  # The endpoint returns a list directly

@pytest.mark.asyncio
async def test_get_available_voices_authorized(
    client: AsyncClient, 
    test_user_free: Users, 
    auth_headers_free: dict
):
    """Test getting voices with authentication."""
    response = await client.get(
        "/api/v1/characters/available-voices", 
        headers=auth_headers_free
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_character_not_found(
    client: AsyncClient,
    auth_headers_free: dict
):
    """Test getting a non-existent character."""
    response = await client.get(
        "/api/v1/characters/999999",
        headers=auth_headers_free
    )

@pytest.mark.asyncio
async def test_create_character_success(
    client: AsyncClient,
    test_user_standard: Users,
    auth_headers_standard: dict
):
    """Test successful character creation."""
    # Mock the charging service to avoid coin/subscription checks
    with patch("app.chat_bot.api.character_endpoints.charge_for_character_creation", new_callable=AsyncMock) as mock_charge:
        mock_charge.return_value = None
        
        payload = {
            "name": "Test Character",
            "personality": "Friendly and helpful.",
            "situation": "Meeting in a cafe.",
            "instructions": "Be polite.",
            "is_nsfw": False,
            "voice_id": "Даша.mp3"
        }
        
        response = await client.post(
            "/api/v1/characters/create/",
            json=payload,
            headers=auth_headers_standard
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["id"] is not None
        assert data["user_id"] == test_user_standard.id
        # Since payload is English, it should populate _en fields
        assert data["personality_en"] == payload["personality"]
        assert data["situation_en"] == payload["situation"]
        assert data["instructions_en"] == payload["instructions"]

@pytest.mark.asyncio
async def test_get_character_details(
    client: AsyncClient,
    test_user_standard: Users,
    auth_headers_standard: dict,
    db_session: AsyncSession
):
    """Test getting character details."""
    # Create a character directly in DB
    # Create a character directly in DB
    from app.chat_bot.models.models import CharacterDB
    character = CharacterDB(
        name="Existing Char",
        description="Desc",
        user_id=test_user_standard.id
    )
    db_session.add(character)
    await db_session.commit()
    await db_session.refresh(character)
    
    response = await client.get(
        f"/api/v1/characters/{character.id}",
        headers=auth_headers_standard
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == character.id
    assert data["name"] == "Existing Char"

@pytest.mark.asyncio
async def test_update_character(
    client: AsyncClient,
    test_user_standard: Users,
    auth_headers_standard: dict,
    db_session: AsyncSession
):
    """Test updating a character."""
    # Create a character directly in DB
    from app.chat_bot.models.models import CharacterDB
    character = CharacterDB(
        name="Update Me",
        description="Desc",
        user_id=test_user_standard.id
    )
    db_session.add(character)
    await db_session.commit()
    await db_session.refresh(character)
    
    # Mock charging for edit if applicable
    with patch("app.chat_bot.api.character_endpoints.CoinsService.can_user_afford") as mock_afford, \
         patch("app.chat_bot.api.character_endpoints.CoinsService.spend_coins") as mock_spend:
        
        mock_afford.return_value = True
        mock_spend.return_value = True

        payload = {
            "name": "Updated Name",
            "personality": "New Personality",
            "situation": "New Situation",
            "instructions": "New Instructions",
            "is_nsfw": False
        }
        
        response = await client.put(
            f"/api/v1/characters/{character.name}/user-edit",
            json=payload,
            headers=auth_headers_standard
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        # Check specific fields instead of prompt
        # Assuming EN input leads to EN fields
        assert data.get("personality_en") == "New Personality"

@pytest.mark.asyncio
async def test_delete_character(
    client: AsyncClient,
    test_user_standard: Users,
    auth_headers_standard: dict,
    db_session: AsyncSession
):
    """Test deleting a character."""
    # Create a character directly in DB
    from app.chat_bot.models.models import CharacterDB
    character = CharacterDB(
        name="Delete Me",
        description="Desc",
        user_id=test_user_standard.id
    )
    db_session.add(character)
    await db_session.commit()
    await db_session.refresh(character)
    
    response = await client.delete(
        f"/api/v1/characters/{character.id}",
        headers=auth_headers_standard
    )
    
    assert response.status_code == 200
    
    # Verify deletion
    result = await db_session.get(CharacterDB, character.id)
    assert result is None


