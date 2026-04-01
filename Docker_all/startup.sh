#!/bin/bash
# startup.sh - Best Practice Startup Script

# Перехватываем ошибки
set -e

echo "🚀 Starting Backend Initialization..."

# 1. Ожидание доступности базы данных
# Используем имя сервиса из docker-compose
DB_HOST="art_generation_postgres"
DB_PORT=5432

echo "🔍 Waiting for Database ($DB_HOST:$DB_PORT)..."
# Используем таймаут для nc, чтобы не виснуть вечно
while ! nc -z $DB_HOST $DB_PORT; do
  echo "⏳ Postgres is unavailable - sleeping"
  sleep 2
done
echo "✅ Postgres is up!"

# 2. Применение миграций Alembic
# Теперь миграции идемпотентны (безопасны для повторного запуска)
echo "📦 Running database migrations..."
alembic upgrade head || {
    echo "❌ Alembic migrations failed!"
    # В продакшене лучше упасть здесь, чем работать на битой базе
    exit 1
}

# 3. Инициализация данных
# Используем || true, чтобы ошибки в скриптах инициализации не ломали запуск сервера, 
# если данные уже существуют или не критичны.
echo "👤 Initializing admin user..."
python -m app.scripts.init_admin || echo "⚠️ Admin initialization finished with warnings"

echo "🧪 Initializing test user..."
python -m app.scripts.init_test_user || echo "⚠️ Test user initialization finished with warnings"

echo "🏷️ Populating tags..."
python -m app.scripts.populate_tags || echo "⚠️ Tag population finished with warnings"

echo "🎭 Updating character tags..."
python -m app.scripts.update_character_tags || echo "⚠️ Character tags update finished with warnings"

# 4. Запуск основного сервера Gunicorn
# 'exec' заменяет текущий процесс оболочки на Gunicorn, 
# что важно для корректной обработки сигналов Docker (SIGTERM)
echo "🎯 Starting Gunicorn Server..."
exec gunicorn app.main:app \
    --workers 8 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --worker-connections 1000 \
    --timeout 180 \
    --graceful-timeout 30 \
    --keep-alive 5
