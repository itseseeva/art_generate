FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Устанавливаем системные зависимости и компилятор
RUN apt-get update && apt-get install -y \
    ffmpeg git curl libsndfile1 \
    build-essential portaudio19-dev python3-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# 1. Клонируем Fish Speech целиком
RUN git clone https://github.com/fishaudio/fish-speech.git /opt/fish-speech && \
    cd /opt/fish-speech && \
    git checkout v1.5.0 && \
    pip install --no-cache-dir -e .

# 2. Правильная настройка путей (исправлено предупреждение PYTHONPATH)
ENV PYTHONPATH="/src:/opt/fish-speech"

# 3. Устанавливаем остальные зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Копируем веса и код
COPY weights/ /src/weights/
COPY . .

RUN mkdir -p /src/test_voices

CMD ["python", "-u", "handler.py"]