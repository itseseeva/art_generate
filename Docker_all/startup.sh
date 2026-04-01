#!/bin/bash
# Startup скрипт для Docker контейнера
# Выполняет миграции и инициализацию при старте

set -e

echo "🚀 Starting backend initialization..."

# Ожидание готовности базы данных (если nc доступен)
if command -v nc >/dev/null 2>&1; then
    echo "🔍 Checking database connectivity..."
    while ! nc -z $POSTGRES_HOST 5432; do
      sleep 0.1
    done
    echo "✅ Database is reachable."
fi

# 1. Проверка и применение миграций
echo "📦 Running database migrations (alembic)..."
alembic upgrade head || {
    echo "⚠️  Alembic migration failed, checking if columns already exist..."
}

# 2. Форсированное исправление колонок (fallback)
echo "🔧 Running fallback column fix (ensuring has_welcome_discount exists)..."
python -m app.scripts.fix_missing_columns || echo "⚠️ Fallback fix failed or wasn't needed"

# 3. Инициализация данных
echo "👤 Initializing admin user..."
python -m app.scripts.init_admin || echo "⚠️  init_admin finished with warnings"

echo "🧪 Initializing test user..."
python -m app.scripts.init_test_user || echo "⚠️  init_test_user finished with warnings"

echo "🏷️  Populating tags..."
python -m app.scripts.populate_tags || echo "⚠️  populate_tags finished with warnings"

echo "🎭 Updating character tags..."
python -m app.scripts.update_character_tags || echo "⚠️  update_character_tags finished with warnings"

# Скрипт перевода персонажей опционален
echo "🌐 Translating character names (if needed)..."
python -m app.scripts.translate_character_names || echo "⚠️  translate_character_names finished with warnings (non-fatal)"

# 4. Запуск сервера
echo "🎯 Starting gunicorn server..."
# Используем exec чтобы gunicorn стал основным процессом (PID 1)
exec gunicorn app.main:app \
    --workers 8 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --worker-connections 1000 \
    --timeout 180 \
    --graceful-timeout 30 \
    --keep-alive 5
