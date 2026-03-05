#!/bin/bash
# Startup скрипт для Docker контейнера
# Выполняет миграции и переводы при первом запуске

echo "🚀 Starting backend initialization..."

# Выполняем алембик миграции
echo "📦 Running database migrations..."
alembic upgrade head

# Переводим имена существующих персонажей (идемпотентный скрипт — безопасно запускать каждый раз)
echo "🌐 Translating character names (one-time backfill for missing name_ru/name_en)..."
python -m app.scripts.translate_character_names || echo "⚠️  translate_character_names finished with warnings (non-fatal)"

# Запускаем uvicorn
echo "🎯 Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
