"""
Скрипт для создания круглого аватара из изображения.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

# Добавляем корневую директорию в путь
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def create_round_avatar(input_path: str, output_path: str, size: int = 512):
    """
    Создает круглое изображение из исходного.
    
    Args:
        input_path: Путь к исходному изображению
        output_path: Путь для сохранения круглого изображения
        size: Размер выходного изображения (квадрат)
    """
    # Открываем исходное изображение
    img = Image.open(input_path)
    
    # Конвертируем в RGB если нужно
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Обрезаем до квадрата (центрируем)
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) // 2
    top = (height - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    
    img_cropped = img.crop((left, top, right, bottom))
    
    # Изменяем размер до нужного
    img_resized = img_cropped.resize((size, size), Image.Resampling.LANCZOS)
    
    # Создаем маску для круглой формы
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Применяем маску
    output = Image.new('RGB', (size, size), (255, 255, 255))
    output.paste(img_resized, (0, 0))
    output.putalpha(mask)
    
    # Сохраняем как PNG с прозрачностью
    output.save(output_path, 'PNG', optimize=True)
    
    print(f"Created round avatar: {output_path} ({size}x{size})")


if __name__ == "__main__":
    input_file = project_root / "frontend" / "public" / "site-avatar.jpg"
    output_file = project_root / "frontend" / "public" / "site-avatar.jpg"
    
    if not input_file.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    create_round_avatar(str(input_file), str(output_file), size=512)
    print("Done!")