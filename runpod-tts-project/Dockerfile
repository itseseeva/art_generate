FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Установка системных утилит, ffmpeg и git (нужен для установки из requirements)
RUN apt-get update && apt-get install -y \
    python3-pip python3-dev ffmpeg git curl \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Обновляем pip и устанавливаем PyTorch
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir \
    --default-timeout=1000 \
    torch==2.1.0 \
    torchaudio==2.1.0 \
    --extra-index-url https://download.pytorch.org/whl/cu121

# Устанавливаем зависимости из нашего файла
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем веса модели и код (убедись, что папка weights/v1.5/ на месте)
COPY weights/ /src/weights/
COPY . .

# Папка для локальных аудио-тестов
RUN mkdir -p /src/test_voices

CMD ["python", "-u", "handler.py"]