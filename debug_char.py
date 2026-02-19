import requests
import json

try:
    # Try to fetch 'Maria' as seen in the logs, or just list characters
    response = requests.get('http://localhost:8001/api/v1/characters/maria', headers={'Authorization': 'Bearer local_test_token_if_needed'}) 
    # If auth is needed this might fail, but let's try public endpoint or list first
    
    if response.status_code != 200:
        print(f"Failed to fetch Maria: {response.status_code}")
        response = requests.get('http://localhost:8001/api/v1/characters/')
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            char_data = data[0] # Take first character
        else:
            char_data = data

        print("Character Name:", char_data.get('name'))
        print("Prompt start:", char_data.get('prompt', '')[:100])
        print("Raw Prompt start:", char_data.get('raw', {}).get('prompt', '')[:100] if char_data.get('raw') else "No raw")
        
        prompt = char_data.get('prompt') or char_data.get('raw', {}).get('prompt') or ""
        print("\nFULL PROMPT:\n", prompt)
    else:
        print("Failed to fetch characters:", response.status_code, response.text)

except Exception as e:
    print("Error:", e)
