FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Установка системных утилит
RUN apt-get update && apt-get install -y \
    python3-pip python3-dev ffmpeg git curl \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# 1. Установка PyTorch через официальный индекс (с увеличенным таймаутом)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir \
    --default-timeout=1000 \
    torch==2.1.0 torchaudio==2.1.0 \
    --extra-index-url https://download.pytorch.org/whl/cu121

# 2. Установка Fish Speech напрямую (это исправит ModuleNotFoundError)
RUN pip install --no-cache-dir git+https://github.com/fishaudio/fish-speech.git@v1.4.0

# 3. Установка остальных зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Копируем код и веса
COPY weights/ /src/weights/
COPY . .

RUN mkdir -p /src/test_voices

CMD ["python", "-u", "handler.py"]