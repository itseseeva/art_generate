import re
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Copying the function from app/services/translation_service.py to test it in isolation
def extract_from_english_prompt(prompt: str) -> dict:
    """
    Extracts fields from an English prompt using standard headers.
    Used after translating the entire prompt to English.
    """
    if not prompt:
        return {}
        
    field_patterns = {
        'personality': [
            r'(?:\*\*|##)?\s*Personality(?: and Character)?(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Role-playing Situation|Instructions|Response Style)|###|$)',
        ],
        'situation': [
            r'(?:\*\*|##)?\s*(?:Role-playing )?Situation(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Instructions|Response Style|Personality)|###|$)',
        ],
        'appearance': [
            r'(?:\*\*|##)?\s*Appearance(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Location|Personality|Role-playing|Instructions)|###|$)',
        ],
        'location': [
            r'(?:\*\*|##)?\s*Location(?:\*\*|:)?\s*:?\s*(.+?)(?=\n\n|\n(?:\*\*|##)?\s*(?:Personality|Role-playing|Instructions)|###|$)',
        ]
    }
    
    result = {}
    for key, patterns in field_patterns.items():
        for pattern in patterns:
            try:
                match = re.search(pattern, prompt, re.DOTALL | re.IGNORECASE)
                if match:
                    val = match.group(1).strip()
                    if val:
                        result[key] = val
                        break
            except Exception:
                continue
    return result

# Sample English Prompt (Simulating what Google Translate would output from Russian)
sample_prompt = """
Name: Dasha

Personality and Character:
Dasha is a cheerful and energetic girl. She loves to dance and construct things.
She is always positive.

Role-playing Situation:
You meet Dasha at a construction site where she is dancing with a shovel.
She invites you to join her.

Appearance:
She wears blue overalls and a yellow hard hat. Her hair is blonde.

Location:
A busy construction site in Moscow.

Instructions:
Always stay in character.
"""

def test_extraction():
    logger.info("Testing extraction logic...")
    extracted = extract_from_english_prompt(sample_prompt)
    
    expected = {
        'personality': "Dasha is a cheerful and energetic girl. She loves to dance and construct things.\nShe is always positive.",
        'situation': "You meet Dasha at a construction site where she is dancing with a shovel.\nShe invites you to join her.",
        'appearance': "She wears blue overalls and a yellow hard hat. Her hair is blonde.",
        'location': "A busy construction site in Moscow."
    }
    
    failed = False
    for key, val in expected.items():
        if extracted.get(key) != val:
            logger.error(f"Mismatch for {key}:\nExpected: {val}\nGot: {extracted.get(key)}")
            failed = True
        else:
            logger.info(f"✓ {key} extracted correctly")
            
    if not failed:
        logger.info("All tests passed!")
    else:
        logger.info("Some tests failed.")

if __name__ == "__main__":
    test_extraction()
