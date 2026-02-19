#!/bin/bash
# Startup скрипт для Docker контейнера
# Выполняет миграции и переводы при первом запуске

echo "🚀 Starting backend initialization..."

# Выполняем алембик миграции
echo "📦 Running database migrations..."
alembic upgrade head

# Проверяем, нужно ли выполнять переводы
# Проверяем наличие файла-метки что переводы уже выполнены
TRANSLATIONS_DONE_FILE="/app/.translations_done"

if [ ! -f "$TRANSLATIONS_DONE_FILE" ]; then
    echo "🌍 Running automatic translations (first time)..."
    python force_retranslate.py
    
    # Создаем файл-метку чтобы не выполнять переводы при каждом перезапуске
    touch "$TRANSLATIONS_DONE_FILE"
    echo "✅ Translations completed and marked as done"
else
    echo "⏭️  Translations already done, skipping..."
fi

# Запускаем uvicorn
echo "🎯 Starting uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
