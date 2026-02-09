import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app
from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.chat_bot.models.models import CharacterDB, PaidAlbumUnlock, PaidAlbumPhoto
from datetime import datetime

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_user():
    user = MagicMock(spec=Users)
    user.id = 1
    user.email = "test@example.com"
    user.is_admin = False
    return user

@pytest.mark.asyncio
async def test_list_unlocked_albums_success(mock_db, mock_user):
    """Test listing unlocked albums for a user."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
        
    async def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    mock_unlock = MagicMock(spec=PaidAlbumUnlock)
    mock_unlock.character_name = "Test Character"
    mock_unlock.character_slug = "test-character"
    mock_unlock.unlocked_at = datetime.utcnow()
    
    res = MagicMock()
    res.scalars.return_value.all.return_value = [mock_unlock]
    mock_db.execute.return_value = res
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/paid-gallery/unlocked/")
        
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["character"] == "Test Character"
    
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_paid_album_status_unlocked_by_subscription(mock_db, mock_user):
    """Test standard user has access to gallery via subscription."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
    async def override_get_current_user_optional():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional
    
    # Mock character search
    char = MagicMock(spec=CharacterDB)
    char.id = 10
    char.name = "Aya"
    char.user_id = 2 # Not owner
    
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    mock_db.execute.return_value = char_res
    
    # Mock SubscriptionService source
    with patch("app.services.subscription_service.SubscriptionService", new_callable=MagicMock) as mock_sub_service_class:
        mock_sub_service = mock_sub_service_class.return_value
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.is_active = True
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_sub_service.get_user_subscription = AsyncMock(return_value=mock_sub)
        
        # Mock _is_album_unlocked
        with patch("app.routers.gallery._is_album_unlocked", new_callable=AsyncMock) as mock_is_unlocked:
            mock_is_unlocked.return_value = False
            
            # Mock photos count
            with patch("app.routers.gallery._get_paid_album_photos_count", new_callable=AsyncMock) as mock_count:
                mock_count.return_value = 5
                
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                    response = await ac.get("/api/v1/paid-gallery/aya/status/")
                    
                assert response.status_code == 200
                data = response.json()
                assert data["unlocked"] is True
                assert data["photos_count"] == 5

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_unlock_paid_gallery_forbidden_for_free(mock_db, mock_user):
    """Test free user cannot unlock gallery."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
    async def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    # Mock character
    char = MagicMock(spec=CharacterDB)
    char.name = "Aya"
    char.user_id = 2
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    mock_db.execute.return_value = char_res
    
    # Mock SubscriptionService source
    with patch("app.services.subscription_service.SubscriptionService", new_callable=MagicMock) as mock_sub_service_class:
        mock_sub_service = mock_sub_service_class.return_value
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.is_active = True
        mock_sub.subscription_type = SubscriptionType.FREE
        mock_sub_service.get_user_subscription = AsyncMock(return_value=mock_sub)
        
        # Mock _is_album_unlocked
        with patch("app.routers.gallery._is_album_unlocked", new_callable=AsyncMock) as mock_is_unlocked:
            mock_is_unlocked.return_value = False
            
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.post("/api/v1/paid-gallery/unlock/", json={"character_name": "Aya"})
                
            assert response.status_code == 403
            assert "Standard или Premium" in response.json()["detail"]

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_unlock_paid_gallery_success_standard(mock_db, mock_user):
    """Test standard user can unlock gallery."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
    async def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    # Mock character
    char = MagicMock(spec=CharacterDB)
    char.name = "Aya"
    char.user_id = 2
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    mock_db.execute.return_value = char_res
    
    # Mock SubscriptionService source -> STANDARD
    with patch("app.services.subscription_service.SubscriptionService", new_callable=MagicMock) as mock_sub_service_class:
        mock_sub_service = mock_sub_service_class.return_value
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.is_active = True
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_sub_service.get_user_subscription = AsyncMock(return_value=mock_sub)
        
        # Mock _is_album_unlocked -> False
        with patch("app.routers.gallery._is_album_unlocked", new_callable=AsyncMock) as mock_is_unlocked:
            mock_is_unlocked.return_value = False
            
            # Mock _get_paid_album_photos_count -> 5
            with patch("app.routers.gallery._get_paid_album_photos_count", new_callable=AsyncMock) as mock_count:
                mock_count.return_value = 5
                
                # Mock CoinsService
                with patch("app.routers.gallery.CoinsService", new_callable=MagicMock) as mock_coins_class:
                    mock_coins_class.return_value.get_user_coins = AsyncMock(return_value=100)
                    
                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                        response = await ac.post("/api/v1/paid-gallery/unlock/", json={"character_name": "Aya"})
                        
                    assert response.status_code == 200
                    assert response.json()["unlocked"] is True
                    assert mock_db.add.called # Added PaidAlbumUnlock

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_list_paid_gallery_access_denied_for_free(mock_db, mock_user):
    """Test free user without unlock cannot list gallery."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
    async def override_get_current_user():
        return mock_user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    char = MagicMock(spec=CharacterDB)
    char.name = "Aya"
    char.user_id = 2
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    mock_db.execute.return_value = char_res
    
    # Mock _is_album_unlocked -> False
    with patch("app.routers.gallery._is_album_unlocked", new_callable=AsyncMock) as mock_is_unlocked:
        mock_is_unlocked.return_value = False
        
        # Mock Subscription -> FREE
        with patch("app.services.subscription_service.SubscriptionService", new_callable=MagicMock) as mock_sub_service_class:
            mock_sub_service = mock_sub_service_class.return_value
            mock_sub = MagicMock(spec=UserSubscription)
            mock_sub.is_active = True
            mock_sub.subscription_type = SubscriptionType.FREE
            mock_sub_service.get_user_subscription = AsyncMock(return_value=mock_sub)
            
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.get("/api/v1/paid-gallery/aya")
                
            assert response.status_code == 403
            assert "разблокируйте" in response.json()["detail"]

    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_save_paid_gallery_photos_forbidden_for_non_owner(mock_db, mock_user):
    """Test non-owner cannot save photos to gallery."""
    from httpx import ASGITransport
    
    async def override_get_db():
        yield mock_db
    async def override_get_current_user():
        return mock_user
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    char = MagicMock(spec=CharacterDB)
    char.name = "Aya"
    char.user_id = 2 # Current user is 1
    char_res = MagicMock()
    char_res.scalar_one_or_none.return_value = char
    mock_db.execute.return_value = char_res
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/paid-gallery/aya/photos", json={"photos": []})
        
    assert response.status_code == 403
    assert "только создатель" in response.json()["detail"]

    app.dependency_overrides.clear()
