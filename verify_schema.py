import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path.cwd()))

try:
    from app.chat_bot.schemas.chat import CharacterInDB
    field = CharacterInDB.model_fields['translations']
    print(f"Annotation: {field.annotation}")
    
    # Test validation
    data = {
        "id": 1,
        "name": "Test",
        "prompt": "Test prompt",
        "translations": {
            "en": {
                "tags": ["Tag1", "Tag2"],
                "name": "Test English"
            }
        }
    }
    # Create minimal valid object
    # CharacterInDB requires id, name, prompt.
    obj = CharacterInDB(**data)
    print("Validation successful!")
except Exception as e:
    print(f"Validation failed: {e}")
