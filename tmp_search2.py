import sys
import os

def search_dir(d):
    for root, dirs, files in os.walk(d):
        for f in files:
            if f.endswith(('tsx', 'ts', 'jsx', 'js')):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        for i, line in enumerate(file):
                            if 'Ты ' in line or 'Веди себя' in line or 'Действуй' in line or 'ты ' in line.lower() and ('prompt' in line.lower() or 'instruction' in line.lower() or 'personality' in line.lower()):
                                if len(line) > 50:
                                    print(f"{path}:{i+1} : {line.strip()[:100]}")
                except Exception:
                    pass

search_dir(r"c:\project_A\frontend\src")
