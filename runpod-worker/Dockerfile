# Используем базовый образ с CUDA
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

# Отключаем интерактивные вопросы при установке
ENV DEBIAN_FRONTEND=noninteractive
# Чтобы логи Python сразу летели в консоль
ENV PYTHONUNBUFFERED=1

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

# 2. --- УСТАНОВКА PYTHON БИБЛИОТЕК (Кэшируется) ---
COPY requirements1.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements1.txt

# PyTorch с CUDA 11.8 - используем extra-index-url
RUN pip install --no-cache-dir \
        torch torchvision torchaudio \
        --extra-index-url https://download.pytorch.org/whl/cu118 \
    && pip install --no-cache-dir xformers \
    && pip install --no-cache-dir accelerate safetensors diffusers transformers

# 3. --- КОПИРОВАНИЕ МОДЕЛИ (ЭТОТ СЛОЙ КЭШИРУЕТСЯ!) ---
# Мы копируем папку weights отдельно.
# Если ты меняешь только код в handler.py, этот гигантский слой
# НЕ БУДЕТ пересобираться заново. Docker возьмет его из кэша.
COPY weights/ /src/weights/

# 4. --- КОПИРОВАНИЕ КОДА ПРОЕКТА ---
# Копируем все остальное (handler.py, predict.py).
# Этот шаг выполняется быстро при изменении кода.
COPY . .

# Настройка окружения NVIDIA
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Запуск через tini (init-процесс)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-u", "handler.py"]