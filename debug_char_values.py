import requests
import json
import sys

# Force encoding to utf-8
sys.stdout.reconfigure(encoding='utf-8')

try:
    response = requests.get('http://localhost:8001/api/v1/characters/', timeout=5)
    if response.status_code == 200:
        data = response.json()
        target_char = None
        target_char = None
        for char in data:
            # Check for partial match or exact match
            name = char.get('name', '').lower()
            if 'мариночка' in name or 'marinochka' in name:
                target_char = char
                break
        
        if not target_char and len(data) > 0:
            print("Target character not found, showing first available.")
            target_char = data[0]

        if target_char:
            print(f"--- Character: {target_char.get('name')} ---")
            print(f"prompt length: {len(target_char.get('prompt', '') or '')}")
            print(f"situation_ru: {target_char.get('situation_ru')}")
            print(f"situation_en: {target_char.get('situation_en')}")
            print(f"appearance_ru: {target_char.get('appearance_ru')}")
            print(f"appearance_en: {target_char.get('appearance_en')}")
            print(f"location_ru: {target_char.get('location_ru')}")
            print(f"location_en: {target_char.get('location_en')}")
            print(f"character_appearance: {target_char.get('character_appearance')}")
            print(f"location: {target_char.get('location')}")
        else:
            print("No characters found.")
except Exception as e:
    print(f"Error: {e}")
