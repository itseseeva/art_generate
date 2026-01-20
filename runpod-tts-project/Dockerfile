FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV PYDANTIC_DISABLE_PLUGINS=1

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

# 2. Правильная настройка путей
ENV PYTHONPATH="/src:/opt/fish-speech"

# 3. Устанавливаем остальные зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Скачиваем веса
RUN huggingface-cli download None1145/Fish-Speech-1.5-Base --local-dir /src/weights/v1.5
COPY . .

RUN mkdir -p /src/test_voices

CMD ["python", "-u", "handler.py"]