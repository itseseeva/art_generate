import pytest
import asyncio
import sys
import os

# Ensure the project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from httpx import AsyncClient
from app.database.db import async_session_maker
from app.chat_bot.models.models import CharacterDB
# Import ImageGenerationHistory to find real images if possible
from app.models.image_generation_history import ImageGenerationHistory

@pytest.mark.asyncio
async def test_chicken_prompts_live():
    """
    Live integration test to verify multilingual prompts for the 'Chicken' character.
    This test connects to the REAL database and hits the LOCAL running server.
    """
    
    # 1. Find the "Chicken" character in the DB
    character_name = None
    image_url_to_test = None
    
    async with async_session_maker() as session:
        # Try English "Chicken" or Russian "Курица"
        stmt = select(CharacterDB).where(
            (CharacterDB.name.ilike('%Chicken%')) | 
            (CharacterDB.name.ilike('%Курица%'))
        )
        char = (await session.execute(stmt)).scalars().first()
        
        if not char:
            pytest.skip("Character 'Chicken' or 'Курица' not found in database. Cannot proceed with test.")
            return

        print(f"Found Character: {char.name} (ID: {char.id})")
        character_name = char.name
        
        # 2. Try to find a real image in history for this character
        # This is better than a dummy URL because it tests the primary lookup path
        stmt_img = select(ImageGenerationHistory).where(
            ImageGenerationHistory.character_name == character_name,
            ImageGenerationHistory.image_url.is_not(None)
        ).order_by(ImageGenerationHistory.created_at.desc())
        
        img_record = (await session.execute(stmt_img)).scalars().first()
        
        if img_record:
            image_url_to_test = img_record.image_url
            print(f"Found history image URL: {image_url_to_test}")
        else:
            # Fallback to avatar if available, or a dummy URL
            # The endpoint has logic to handle /media/ urls or fallback by name
            image_url_to_test = char.avatar_path or "http://test.com/dummy_chicken.png"
            print(f"No history image found. Using fallback URL: {image_url_to_test}")

    # 3. Request the API
    # Assuming server is running on localhost:8001 as per logs
    base_url = "http://localhost:8001"
    
    async with AsyncClient(base_url=base_url, timeout=10.0) as ac:
        print(f"Requesting GET {base_url}/api/v1/chat-history/prompt-by-image")
        params = {
            "image_url": image_url_to_test,
            "character_name": character_name
        }
        
        try:
            response = await ac.get("/api/v1/chat-history/prompt-by-image", params=params)
        except Exception as e:
            pytest.fail(f"Failed to connect to backend server at {base_url}. Is it running? Error: {e}")
            
        print(f"Response status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response error: {response.text}")
            
        assert response.status_code == 200, f"API returned {response.status_code}"
        
        data = response.json()
        assert data["success"] is True, "API reported failure"
        
        # 4. Verify Multilingual Prompts
        print("\n=== API Response Data ===")
        print(f"Prompt (Legacy): {data.get('prompt')}")
        print(f"Prompt EN: {data.get('prompt_en')}")
        print(f"Prompt RU: {data.get('prompt_ru')}")
        
        # Check that keys exist
        assert "prompt_en" in data, "Response missing 'prompt_en'"
        assert "prompt_ru" in data, "Response missing 'prompt_ru'"
        
        # We don't assert that they are not None, because they *might* be None if not translated yet,
        # but the keys must be present.
        # Ideally, we want to see text.
        
        if data.get('prompt_en'):
            print("✅ English prompt found.")
        else:
            print("⚠️ English prompt is empty/null.")
            
        if data.get('prompt_ru'):
            print("✅ Russian prompt found.")
        else:
            print("⚠️ Russian prompt is empty/null.")

