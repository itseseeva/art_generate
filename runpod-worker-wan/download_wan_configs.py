import os
import sys

try:
    from huggingface_hub import snapshot_download
except ImportError:
    print("Библиотека huggingface_hub не установлена.")
    print("Выполните: pip install huggingface-hub")
    sys.exit(1)

# Используем модель именно в формате Diffusers!
model_id = "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"
download_dir = os.path.join(os.path.dirname(__file__), "weights", "wan_i2v")

print(f"--- НАЧАЛО СКАЧИВАНИЯ ---")
print(f"Модель: {model_id}")
print(f"Куда:   {download_dir}")
print("Это может занять время (около 30 ГБ)...")

try:
    snapshot_download(
        repo_id=model_id,
        # Нам нужны ВСЕ файлы для работы воркера
        local_dir=download_dir,
        local_dir_use_symlinks=False,
        resume_download=True
    )
    print("\n--- ГОТОВО! ---")
    print(f"Все веса скачаны в {download_dir}. Теперь можно собирать Docker-образ.")
except Exception as e:
    print(f"\nОшибка при скачивании: {e}")
    print("Попробуйте снова или проверьте свободное место на диске.")
