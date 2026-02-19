
import pytest
from httpx import AsyncClient
from app.models.subscription import SubscriptionType, SubscriptionStatus

@pytest.mark.asyncio
async def test_get_subscription_stats_unauthorized(client: AsyncClient):
    """Test accessing stats without auth returns 401."""
    response = await client.get("/api/v1/subscription/stats/")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_subscription_stats_authorized(client: AsyncClient, test_user_token):
    """Test accessing stats with auth returns 200 and correct structure."""
    response = await client.get(
        "/api/v1/subscription/stats/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "subscription_type" in data
    assert "status" in data
    assert "images_limit" in data
    assert "images_remaining" in data

@pytest.mark.asyncio
async def test_activate_subscription_invalid_type(client: AsyncClient, test_user_token):
    """Test activating invalid subscription type returns 400."""
    response = await client.post(
        "/api/v1/subscription/activate/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"subscription_type": "invalid_type"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_activate_subscription_standard_success(client: AsyncClient, test_user_token):
    """Test activating standard subscription successfully."""
    # Note: validation of payment/coins likely happens in service or is mocked here?
    # The endpoint simply calls service.create_subscription.
    # We should rely on the test database state where user might need permissions or coins if logic exists?
    # In SubscriptionService.create_subscription there are no coin checks, it just creates it.
    
    response = await client.post(
        "/api/v1/subscription/activate/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"subscription_type": "standard"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["subscription"]["subscription_type"] == "standard"
    assert data["subscription"]["images_limit"] == 100

@pytest.mark.asyncio
async def test_get_subscription_info(client: AsyncClient, test_user_token, db_session):
    """Test getting full subscription info."""
    # First activate a subscription
    await client.post(
        "/api/v1/subscription/activate/",
        headers={"Authorization": f"Bearer {test_user_token}"},
        json={"subscription_type": "standard"}
    )
    
    response = await client.get(
        "/api/v1/subscription/info/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["subscription_type"] == "standard"
    assert data["is_active"] is True

@pytest.mark.asyncio
async def test_check_permissions(client: AsyncClient, test_user_token):
    """Test check permission endpoints."""
    # Photo permission
    resp_photo = await client.get(
        "/api/v1/subscription/check/photo/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp_photo.status_code == 200
    assert "can_generate_photo" in resp_photo.json()
    
    # Message permission
    resp_msg = await client.get(
        "/api/v1/subscription/check/message/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert resp_msg.status_code == 200
    assert "can_send_message" in resp_msg.json()

@pytest.mark.asyncio
async def test_credit_packages_disabled(client: AsyncClient, test_user_token):
    """Test that credit packages endpoint returns disabled message."""
    response = await client.get(
        "/api/v1/subscription/credit-packages/",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "отключена" in data["message"] or "deprecated" in str(data)
