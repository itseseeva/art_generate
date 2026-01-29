# Используем базовый образ с CUDA
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Отключаем интерактивные вопросы при установке
ENV DEBIAN_FRONTEND=noninteractive
# Чтобы логи Python сразу летели в консоль
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# 1. --- УСТАНОВКА СИСТЕМНЫХ ЗАВИСИМОСТЕЙ ---
# ВАЖНО: ln -s создает команду 'python', которой не хватает tini
RUN apt-get update && apt-get install -y \
    git wget curl \
    python3 python3-pip python3-venv \
    tini \
    libgl1 libglib2.0-0 \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# 2. --- Лёгкие зависимости без torch (чтобы не тянуть CUDA 12 и не переполнять слой) ---
COPY requirements1.txt .
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --no-cache-dir \
        "huggingface-hub==0.23.4" omegaconf einops "numpy<2.0.0" cog "runpod==0.9.10" \
        "Pillow>=10.0.0" scipy "boto3>=1.34.0" "python-dotenv>=1.0.0"

# 3. --- PyTorch с CUDA 11.8 отдельным слоем (меньше нагрузка на overlay, меньше Errno 74) ---
RUN python3 -m pip install --no-cache-dir \
    torch torchvision torchaudio \
    --extra-index-url https://download.pytorch.org/whl/cu118

# 4. --- Остальные ML-зависимости (xformers, diffusers, compel, peft) ---
RUN python3 -m pip install --no-cache-dir \
    xformers accelerate safetensors diffusers transformers "compel==2.0.2" "peft>=0.10.0"

# Мы копируем папку weights отдельно.с
# Если ты меняешь только код в handler.py, этот гигантский слой
# НЕ БУДЕТ пересобираться заново. Docker возьмет его из кэша.
COPY weights/ /src/weights/

# 6. --- КОПИРОВАНИЕ КОДА ПРОЕКТА ---
# Копируем все остальное (handler.py, predict.py).
# Этот шаг выполняется быстро при изменении кода.
COPY . .

# Настройка окружения NVIDIA
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Запуск через tini (init-процесс)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-u", "handler.py"]