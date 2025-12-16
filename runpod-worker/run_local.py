import subprocess
import os
import re
import base64
import sys
import json

# === НАСТРОЙКИ ===
IMAGE_NAME = "ihnupfidi/one-obsession-runpod:v9" 
TEST_FILE = "test_input.json"

def create_test_file():
    """Создает файл test_input.json, если его нет"""
    if not os.path.exists(TEST_FILE):
        data = {
            "input": {
                "prompt": "masterpiece, best quality, 1girl, smiling, space background",
                "width": 512, 
                "height": 768,
                "num_inference_steps": 20,
                "guidance_scale": 7.0
            }
        }
        with open(TEST_FILE, "w") as f:
            json.dump(data, f, indent=4)
        print(f"📝 Создан тестовый файл: {TEST_FILE}")
    return os.path.abspath(TEST_FILE)

def test_docker():
    # 1. Готовим файл
    input_path = create_test_file()

    # Читаем JSON в строку
    with open(input_path, "r", encoding="utf-8") as f:
        json_content = f.read()

    print(f"🐳 Запускаем ЛОКАЛЬНЫЙ образ: {IMAGE_NAME}")
    print("⏳ Ждем генерацию...")

    # 2. Формируем команду
    cmd = [
        "docker", "run", "--rm", 
        "--gpus", "all",
        IMAGE_NAME,
        "python", "-u", "handler.py", "--test_input", json_content
    ]

    try:
        # ЗАПУСКАЕМ С ЯВНОЙ КОДИРОВКОЙ UTF-8
        # errors='replace' заменит неизвестные символы на знак вопроса, чтобы не крашилось
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            encoding='utf-8', 
            errors='replace'
        )
    except Exception as e:
        print(f"❌ Ошибка запуска Docker: {e}")
        return

    # 3. Выводим логи
    print("\n" + "="*20 + " ЛОГИ КОНТЕЙНЕРА " + "="*20)
    # Собираем вывод безопасно
    std_out = result.stdout if result.stdout else ""
    std_err = result.stderr if result.stderr else ""
    
    print(std_err) 
    print(std_out)
    print("="*60 + "\n")

    # 4. Ищем картинку
    full_output = std_out + std_err
    match = re.search(r'"image":\s*"(data:image/[^;]+;base64,[^"]+)"', full_output)

    if match:
        data_uri = match.group(1)
        header, encoded = data_uri.split(",", 1)
        
        try:
            image_data = base64.b64decode(encoded)
            output_filename = "result_local.png"
            
            with open(output_filename, "wb") as f:
                f.write(image_data)
            
            print(f"✅ УСПЕХ! Картинка сохранена как: {output_filename}")
            print(f"   Размер файла: {len(image_data)/1024:.2f} KB")
        except Exception as e:
            print(f"⚠️ Ошибка при сохранении картинки: {e}")
    else:
        print("❌ Картинка не найдена в ответе.")
        print("Ищи ошибку (Traceback) в логах выше.")

if __name__ == "__main__":
    test_docker()