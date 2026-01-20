import subprocess
import json
import base64
import os

# Название твоего образа
IMAGE_NAME = "runpod-tts-fish:v2"

def test_local():
    # Эмулируем запрос: используем файл из папки test_voices
    payload = {
        "input": {
            "text": "Тестовая фраза для проверки локального голоса.",
            "local_test_file": "female_test.mp3"
        }
    }

    print(f"🐳 Запускаем тест образа: {IMAGE_NAME}")
    
    cmd = [
        "docker", "run", "--rm", "--gpus", "all",
        "-v", f"{os.getcwd()}/test_voices:/src/test_voices", # Прокидываем папку для теста
        IMAGE_NAME,
        "python", "handler.py", "--test_input", json.dumps(payload)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if "error" in result.stdout.lower() or result.returncode != 0:
        print("❌ ОШИБКА:")
        print(result.stderr)
        print(result.stdout)
        return

    try:
        response = json.loads(result.stdout)
        audio_data = response["audio_base64"].split(",")[1]
        with open("result_local.wav", "wb") as f:
            f.write(base64.b64decode(audio_data))
        print("✅ УСПЕХ! Файл сохранен: result_local.wav")
    except Exception as e:
        print(f"⚠️ Не удалось обработать ответ: {e}")
        print(result.stdout)

if __name__ == "__main__":
    test_local()