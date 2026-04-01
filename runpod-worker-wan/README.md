# Wan2.1 I2V RunPod Worker — README

## Структура папки

```
runpod-worker-wan/
├── handler.py              # RunPod entry point
├── predict.py              # Логика генерации видео
├── requirements.txt        # Python зависимости
├── Dockerfile              # Docker образ
├── weights/                # ← НУЖНО СОЗДАТЬ ВРУЧНУЮ (не в git)
│   ├── wan_i2v/            # Папка с моделью (содержимое из HuggingFace)
│   └── loras/              # NSFW LoRA файлы
└── README.md
```

## Подготовка весов перед сборкой Docker

Модель и LoRA уже скачаны в корне папки. Нужно разложить их по подпапкам:

```bash
# Создаём структуру
mkdir -p weights/wan_i2v
mkdir -p weights/loras

# Перекладываем LoRA
move "Wan2.1_T2V_14B_FusionX_LoRA.safetensors" weights/loras/

# Для основной модели — нужно скачать полный репозиторий с HuggingFace
# (safetensors файл + config + text encoder + vae)
# Используй huggingface-cli:
# pip install huggingface-hub
# huggingface-cli download Wan-AI/Wan2.1-I2V-14B-480P --local-dir weights/wan_i2v
```

## Сборка Docker образа

```bash
cd runpod-worker-wan
docker build -t wan-i2v-worker:latest .
```

## Входные параметры (RunPod job input)

```json
{
  "image": "data:image/jpeg;base64,...",   // ОБЯЗАТЕЛЬНО: base64 или URL
  "prompt": "smooth motion, cinematic",
  "negative_prompt": "blurry, static",
  "width": 832,
  "height": 480,
  "num_frames": 81,                         // 81 = ~5 сек при 16fps
  "num_inference_steps": 20,
  "guidance_scale": 5.0,
  "lora_scale": 0.7,
  "seed": 42,
  "fps": 16,
  "return_type": "url"                      // "url" | "base64" | "file"
}
```

## Выходные данные

```json
{
  "video_url": "https://storage.yandexcloud.net/bucket/animated/abc123.mp4",
  "width": 832,
  "height": 480,
  "num_frames": 81,
  "fps": 16,
  "seed": 42,
  "generation_time": 87.3
}
```

## Требования к GPU

| GPU | VRAM | Скорость (81 frames) |
|-----|------|---------------------|
| L40S | 48GB | ~90-120 сек |
| A100 80GB | 80GB | ~50-70 сек |
| H100 | 80GB | ~30-50 сек |
