import runpod
import os
import base64
import requests
import uuid
from predict import FishPredictor

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = FishPredictor()
        _predictor.setup()
    return _predictor

def download_file(url, dest):
    """Скачивание референс-голоса из Yandex Storage или по прямой ссылке"""
    print(f"Downloading reference voice from: {url}")
    response = requests.get(url, timeout=15, stream=True)
    response.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk: f.write(chunk)
    return dest

def handler(job):
    job_input = job.get("input", {})
    text = job_input.get("text", "Привет, я готова к общению.")
    
    # Источники голоса: Ссылка, Base64 или локальный файл для теста
    voice_url = job_input.get("voice_url")
    custom_audio_b64 = job_input.get("custom_audio")
    local_test_file = job_input.get("local_test_file")
    
    ref_path = f"/tmp/{uuid.uuid4()}.wav"

    try:
        # 1. Готовим файл-образец
        if custom_audio_b64:
            with open(ref_path, "wb") as f:
                f.write(base64.b64decode(custom_audio_b64))
        elif voice_url:
            download_file(voice_url, ref_path)
        elif local_test_file:
            ref_path = f"/src/test_voices/{local_test_file}"
        else:
            return {"error": "No reference voice provided"}

        # 2. Вызываем модель
        predictor = get_predictor()
        out_wav = predictor.predict(text, ref_path)
        
        # 3. Кодируем результат в Base64 для отправки на сайт
        with open(out_wav, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        return {
            "audio_base64": f"data:audio/wav;base64,{audio_b64}",
            "status": "success"
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        # Удаляем временные файлы для чистоты системы
        if (voice_url or custom_audio_b64) and os.path.exists(ref_path):
            os.remove(ref_path)

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})