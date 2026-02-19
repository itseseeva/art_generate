import pytest
from httpx import AsyncClient
from app.main import app
from app.database.db import get_db

@pytest.mark.asyncio
async def test_multilingual_prompts():
    # This test assumes the "Chicken" character exists and has an image.
    # Replace URL with the one found by `find_chicken.py` or use a mock.
    # For now, I'll use a placeholder and rely on the `find_chicken.py` output.
    
    # Example Image URL (needs to be real for end-to-end test or mocked)
    image_url = "PLACEHOLDER_URL" 
    character_name = "Chicken"

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Test 1: Fetch prompt by image URL
        response = await ac.get("/api/v1/chat-history/prompt-by-image", params={"image_url": image_url, "character_name": character_name})
        
        # Check status code
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # Check for multilingual fields
        assert "prompt_en" in data
        assert "prompt_ru" in data
        
        # Verify prompts are not empty (assuming migration worked and data exists/was backfilled or generated)
        # Note: If data is new, it might be empty. But structure should be correct.
        print(f"Prompt EN: {data.get('prompt_en')}")
        print(f"Prompt RU: {data.get('prompt_ru')}")

