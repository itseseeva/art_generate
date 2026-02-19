import requests
import json
import sys

# Force encoding to utf-8 for console output to avoid charmap errors on Windows
sys.stdout.reconfigure(encoding='utf-8')

try:
    print("Fetching characters...")
    response = requests.get('http://localhost:8001/api/v1/characters/', timeout=5)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Got {len(data)} characters.")
        
        target_char = None
        for char in data:
            if char.get('name', '').lower() == 'maria':
                target_char = char
                break
        
        if not target_char and len(data) > 0:
            target_char = data[0]
            print(f"Maria not found, using {target_char.get('name')} instead.")
            
        if target_char:
            print(f"--- Character: {target_char.get('name')} ---")
            prompt = target_char.get('prompt')
            raw_prompt = target_char.get('raw', {}).get('prompt') if target_char.get('raw') else None
            
            final_prompt = prompt or raw_prompt
            
            if final_prompt:
                print("Prompt Content (First 500 chars):")
                print(final_prompt[:500])
                print("\n--- End of Prompt Snippet ---")
                
                # Debug regex potential
                print("\nChecking for Situation markers:")
                markers = ["Role-playing Situation", "Situation", "Scenario", "Roleplay", "Ролевая ситуация", "Ситуация"]
                for m in markers:
                    if m.lower() in final_prompt.lower():
                        print(f"Found marker: '{m}'")
            else:
                print("Prompt is None or Empty")
                
            print(f"Raw Data Keys: {list(target_char.keys())}")
            if target_char.get('translations'):
                print(f"Translations: {target_char.get('translations').keys()}")
        else:
            print("No characters found in list.")
            
    else:
        print(f"Failed to fetch characters: {response.status_code}")

except Exception as e:
    print(f"Script Error: {e}")
