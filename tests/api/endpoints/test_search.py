import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.chat_bot.models.models import CharacterDB
from app.models.user import Users

@pytest.mark.asyncio
async def test_search_endpoint(client: AsyncClient, db_session: AsyncSession):
    # Create test character
    character = CharacterDB(
        name="TestSearchChar",
        display_name="Test Display Name",
        description="Test Description",
        is_nsfw=False
    )
    db_session.add(character)
    await db_session.commit()
    await db_session.refresh(character)

    # Create test user
    user = Users(
        email="testsearch@example.com",
        username="TestSearchUser",
        password_hash="hash",
        coins=100
    )
    db_session.add(user)
    await db_session.commit()

    # Search for character
    response = await client.get("/api/v1/search/", params={"q": "TestSearch", "limit": 10})
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) >= 1
    found_char = next((item for item in data if item['type'] == 'character' and item['name'] == "TestSearchChar"), None)
    assert found_char is not None
    assert found_char['display_name'] == "Test Display Name"
    
    # Search for user
    found_user = next((item for item in data if item['type'] == 'user' and item['name'] == "TestSearchUser"), None)
    # Note: User search might depend on exact match or ilike, which should work for "TestSearch" vs "TestSearchUser"
    assert found_user is not None
    assert found_user['name'] == "TestSearchUser"

    # Search with limit
    response_limit = await client.get("/api/v1/search/", params={"q": "Test", "limit": 1})
    assert response_limit.status_code == 200
    data_limit = response_limit.json()
    assert len(data_limit) == 1
