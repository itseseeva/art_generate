# =========================================================
# Wan2.1 I2V RunPod Worker
# GPU: L40S (48GB) / A100 / H100
# =========================================================

FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# 1. Системные зависимости
RUN apt-get update && apt-get install -y \
    git wget curl \
    python3 python3-pip \
    tini \
    ffmpeg \
    libgl1 libglib2.0-0 \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# 2. PyTorch с CUDA 12.1
RUN pip install --upgrade pip && \
    pip install \
        torch==2.5.1 torchvision torchaudio \
        --index-url https://download.pytorch.org/whl/cu124

# 3. diffusers + зависимости
RUN pip install \
    "diffusers[torch]>=0.31.0" \
    "transformers>=4.48.0" \
    accelerate \
    safetensors \
    sentencepiece \
    imageio \
    imageio-ffmpeg \
    opencv-python-headless \
    huggingface_hub

# 4. Остальные зависимости
COPY requirements.txt .
RUN pip install -r requirements.txt



# 6. Копируем веса (кэшируется Docker'ом)
COPY weights/ /src/weights/

# 7. Копируем код
COPY handler.py predict.py ./

ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-u", "handler.py"]
