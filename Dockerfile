# Multi-stage build для бэкенда (FastAPI)
FROM python:3.10-slim as backend

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости (БЕЗ torch!)
COPY requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

# Копируем код приложения
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# Создаём необходимые директории
RUN mkdir -p /app/logs /app/data /app/avatars /app/outputs/generated

# Expose порт для FastAPI
EXPOSE 8000

# Команда запуска
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

