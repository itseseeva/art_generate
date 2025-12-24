#!/bin/bash
set -e

# Подтягиваем переменные
DB_HOST="art_generation_postgres"
DB_NAME="${POSTGRES_DB:-art_generate_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASS="${POSTGRES_PASSWORD:-Kohkau11999}"

echo "=== Запуск entrypoint скрипта ==="

# 1. Ждем базу
echo "Ожидание PostgreSQL ($DB_HOST:5432)..."
until nc -z $DB_HOST 5432; do
  sleep 2
done
echo "✓ PostgreSQL доступен!"

# 2. Умная миграция
# Проверяем, есть ли таблица users. Если есть - значит ты уже залил данные.
TABLE_EXISTS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT to_regclass('public.users');" | xargs)

if [ "$TABLE_EXISTS" != "" ] && [ "$TABLE_EXISTS" != "None" ]; then
    echo "⚠ Данные уже в базе (мигрированы). Пропускаю создание таблиц."
    alembic stamp head
else
    echo "--- База пуста. Применяю миграции Alembic ---"
    alembic upgrade head
fi

# 3. ЗАПУСК (используем exec, чтобы процесс не завершался)
echo "--- Запуск бэкенда ---"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000