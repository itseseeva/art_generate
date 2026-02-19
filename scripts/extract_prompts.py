
import re
import json
import os

path = r"c:\project_A\frontend\src\components\EditCharacterPage.tsx"
output_path = r"c:\project_A\scripts\prompts_ru.json"

if not os.path.exists(path):
    print(f"File not found: {path}")
    exit(1)

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

def extract_array(name):
    pattern = r"const " + name + r" = \[(.*?)\];"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"Array {name} not found")
        return []
    
    array_content = match.group(1)
    
    # Check if it's an object array (has { and })
    if "{" in array_content:
        items = []
        # Regex to find { label: "...", value: "..." }
        # Only matches standard format with double quotes
        obj_pattern = r'\{\s*label:\s*"(.*?)",\s*value:\s*"(.*?)"\s*\}'
        matches = re.findall(obj_pattern, array_content, re.DOTALL)
        for label, value in matches:
             items.append({"label": label, "value": value})
        return items
    else:
        # String array
        # Regex to match "..."
        str_pattern = r'"(.*?)"'
        matches = re.findall(str_pattern, array_content, re.DOTALL)
        return matches

personality_keys = [
    "passionate", "dominant", "submissive", "playful", "innocent", 
    "experienced", "jealous", "seductive", "nympho", "perverted", 
    "femmeFatale", "shy", "aggressive", "vulgar", "manipulative", 
    "lover", "mistress", "slave", "insatiable", "fantasy"
]

situation_keys = [
    "night", "office", "train", "doctor", "teacher", "massage", "elevator",
    "beach", "gym", "neighbor", "cleaning", "photoshoot", "cabin", "club",
    "fantasy", "lab", "library", "castle", "home", "meeting", "springs", "sauna"
]

appearance_keys = [
    "blonde", "redhead", "brunette", "gothic", "sporty", "elf", "cyberpunk",
    "asian", "curvy", "student", "femmeFatale", "neighbor", "nurse",
    "catwoman", "succubus", "angel", "secretary", "beach", "steampunk",
    "princess", "nympho", "domina", "slave"
]

location_keys = [
    "bedroom", "beach", "penthouse", "springs", "office", "mansion", "plane",
    "cabin", "sauna", "space", "dressing", "yacht", "dungeon", "greenhouse",
    "roof", "library", "train", "tent", "studio", "throne", "club", "garage",
    "elevator", "kitchen"
]

instruction_keys = [
    "frank", "dirty", "hints", "descriptive", "flirt", "passionate", "experienced", 
    "whisper", "loud", "explicit", "dominant", "submissive", "advice", "jokes", 
    "aggressive", "direct", "greedy", "innocent", "perverted", "prostitute"
]

def process_category(name, keys):
    items = extract_array(name)
    result = {}
    print(f"Extracted {len(items)} items for {name}")
    for i, item in enumerate(items):
        if i >= len(keys):
            break
        key = keys[i]
        result[key] = item
    return result

prompts = {
    "personality": process_category("PERSONALITY_PROMPTS", personality_keys),
    "situation": process_category("SITUATION_PROMPTS", situation_keys),
    "appearance": process_category("APPEARANCE_PROMPTS", appearance_keys),
    "location": process_category("LOCATION_PROMPTS", location_keys),
    "instructions": process_category("INSTRUCTION_PROMPTS", instruction_keys)
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(prompts, f, ensure_ascii=False, indent=4)

print(f"Written to {output_path}")
