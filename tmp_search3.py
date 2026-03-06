import sys
import os

def search_backend():
    b = r"c:\project_A\app"
    for root, dirs, files in os.walk(b):
        for f in files:
            if f.endswith('.py'):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as file:
                        for i, line in enumerate(file):
                            lo = line.lower()
                            if 'instructions' in lo or 'prompt' in lo:
                                if len(line) > 50 and 'default' in lo:
                                    print(f"{f}:{i+1} : {line.strip()[:100]}")
                            if 'ты ' in lo or 'в роли' in lo or 'you are ' in lo:
                                print(f"P-{f}:{i+1} : {line.strip()[:100]}")
                except Exception:
                    pass

search_backend()
