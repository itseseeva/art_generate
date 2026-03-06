import sys

path = r"c:\project_A\frontend\src\components\EditCharacterPage.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'hasDefaultInstructions' in line:
            print(f"FOUND AT {i+1}")
            for j in range(max(0, i-5), min(i+15, len(lines))):
                print(f"{j+1}: {lines[j].rstrip()}")
            print("-" * 40)
