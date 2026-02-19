import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_api():
    # TEST LIST ENDPOINT
    url = "http://127.0.0.1:8001/api/v1/characters/?skip=0&limit=100" 
    try:
        resp = requests.get(url)
        if resp.status_code != 200:
            logger.error(f"Error: {resp.status_code} - {resp.text}")
            return
            
        data = resp.json()
        
        # Data should be a list or paginated object
        # If it's paginated, it might be data['items'] or similar, or just a list.
        # Based on previous code, it seems to be a list.
        if isinstance(data, dict) and 'items' in data:
            chars = data['items']
        elif isinstance(data, list):
            chars = data
        else:
            logger.error(f"Unknown response format: {type(data)}")
            return

        # Find our character 283
        target_char = next((c for c in chars if c.get('id') == 283), None)
        
        if not target_char:
             # Try finding by name "Мария"
             target_char = next((c for c in chars if "Мария" in c.get('name', '')), None)
             
        if not target_char:
            logger.error("Character 283 (or Мария) not found in list!")
            return
            
        logger.info(f"Found char: {target_char.get('name')} (ID: {target_char.get('id')})")
        
        translations = target_char.get('translations', {})
        logger.info(f"List Endpoint Translations: {translations}")
        
        if 'en' in translations:
             logger.info(f"EN Situation in LIST: {translations['en'].get('situation', '')[:50]}...")
        else:
             logger.warning("No 'en' translations in LIST endpoint!")
             
    except Exception as e:
        logger.error(f"Failed to connect: {e}")

    except Exception as e:
        logger.error(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_api()
