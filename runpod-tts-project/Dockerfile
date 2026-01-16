# Используем готовый образ с PyTorch
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Системные зависимости
RUN apt-get update && apt-get install -y \
    ffmpeg git curl libsndfile1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# 1. Установка Fish Speech v1.5.0
RUN pip install --no-cache-dir git+https://github.com/fishaudio/fish-speech.git@v1.5.0

# 2. Установка остальных зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Копируем веса и код
COPY weights/ /src/weights/
COPY . .

# Создаем папку для тестов
RUN mkdir -p /src/test_voices

CMD ["python", "-u", "handler.py"]