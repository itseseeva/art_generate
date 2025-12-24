#!/bin/bash
set -e

# Используем значения из окружения или дефолты
DB_HOST="art_generation_postgres"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-art_generate_db}"

echo "=== Запуск entrypoint скрипта ==="

# 1. Ждем базу
echo "Ожидание базы $DB_HOST:5432..."
until nc -z $DB_HOST 5432; do
  sleep 2
done
echo "✓ База доступна!"

# 2. Применяем миграции
echo "--- Применяем миграции Alembic ---"
alembic upgrade head || echo "⚠ Миграции уже применены или возникла ошибка"

echo "--- Запуск сервера ---"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000