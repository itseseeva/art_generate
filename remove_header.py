import os
import re

components_dir = r'c:\project_A\frontend\src\components'
exclude_files = ['GlobalHeader.tsx', 'App.tsx', 'HistoryPage.tsx', 'MainPage.tsx']

def remove_global_header(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove import
    new_content = re.sub(r"import\s+\{\s*GlobalHeader\s*\}\s+from\s+['\"]\.?/GlobalHeader['\"];?\n?", "", content)
    
    # Remove usage <GlobalHeader ... />
    # Matches <GlobalHeader ... /> spanning multiple lines
    new_content = re.sub(r"\s*<GlobalHeader[\s\S]*?/>", "", new_content)
    
    if content != new_content:
        print(f"Modifying {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
    else:
        print(f"No changes in {file_path}")

for filename in os.listdir(components_dir):
    if filename.endswith('.tsx') and filename not in exclude_files:
        remove_global_header(os.path.join(components_dir, filename))
