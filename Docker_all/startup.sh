#!/bin/bash
# Startup скрипт для Docker контейнера
# Выполняет миграции и переводы при первом запуске

echo "🚀 Starting backend initialization..."

# Выполняем алембик миграции
echo "📦 Running database migrations..."
alembic upgrade head


# Запускаем uvicorn
echo "🎯 Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
