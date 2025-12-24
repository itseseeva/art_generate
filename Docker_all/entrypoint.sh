#!/bin/bash
set -e

# Функция для ожидания доступности порта
wait_for_port() {
    local host=$1
    local port=$2
    echo "Waiting for $host:$port..."
    while ! nc -z $host $port; do
      sleep 1
    done
    echo "$host:$port is available"
}

# Ждем базу и редис
wait_for_port "art_generation_postgres" 5432
wait_for_port "art_generation_redis" 6379

echo "--- Running Database Migrations ---"
# Пытаемся применить миграции
alembic upgrade head

echo "--- Starting Uvicorn Server ---"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000