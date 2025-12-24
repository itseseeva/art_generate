#!/bin/bash
set -e

echo "=== Запуск entrypoint скрипта ==="

# Ждём готовности PostgreSQL
# Определяем хост PostgreSQL из DATABASE_URL или используем DB_HOST
if [ -n "$DATABASE_URL" ]; then
  # Парсим DATABASE_URL: postgresql://user:pass@host:port/db
  # Удаляем префикс postgresql:// или postgresql+asyncpg://
  URL_WITHOUT_PROTOCOL=$(echo "$DATABASE_URL" | sed 's|^.*://||')
  # Извлекаем хост и порт: user:pass@host:port/db
  DB_HOST=$(echo "$URL_WITHOUT_PROTOCOL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo "$URL_WITHOUT_PROTOCOL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  # Извлекаем пользователя: user:pass@ -> user
  DB_USER=$(echo "$URL_WITHOUT_PROTOCOL" | sed -n 's/\([^:]*\):.*@.*/\1/p')
  # Извлекаем базу данных: /db или /db?
  DB_NAME=$(echo "$URL_WITHOUT_PROTOCOL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
else
  # Используем переменные из .env
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_USER=${POSTGRES_USER:-postgres}
  DB_NAME=${POSTGRES_DB:-art_generation}
fi

# Отладочный вывод для диагностики
if [ "${DEBUG:-false}" = "true" ]; then
  echo "DEBUG: DATABASE_URL=$DATABASE_URL"
  echo "DEBUG: Parsed - Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER, DB: $DB_NAME"
fi

echo "Ожидание готовности PostgreSQL (host: ${DB_HOST}, port: ${DB_PORT})..."
# Пытаемся подключиться к PostgreSQL с таймаутом (максимум 30 секунд)
TIMEOUT=30
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    echo "✓ PostgreSQL готов"
    break
  fi
  echo "PostgreSQL ещё не готов, ждём... (${ELAPSED}/${TIMEOUT}с)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

# Если после таймаута PostgreSQL все еще не готов, выводим предупреждение, но продолжаем
if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "⚠ Предупреждение: PostgreSQL не доступен после ${TIMEOUT} секунд ожидания (host: ${DB_HOST}:${DB_PORT})"
  echo "⚠ Продолжаем запуск, но миграции могут не выполниться"
fi

# Выполняем миграции Alembic
echo "Выполнение миграций Alembic..."
cd /app
alembic upgrade head || echo "⚠ Предупреждение: некоторые миграции могли быть пропущены (таблицы уже существуют)"
echo "✓ Миграции выполнены"

# Создаём недостающие таблицы через SQLAlchemy (на случай, если миграции не создали все таблицы)
echo "Проверка и создание недостающих таблиц..."
python3 -c "
from app.database.db import Base
from app.chat_bot.models.models import (
    CharacterDB, ChatSession, ChatMessageDB, CharacterMainPhoto,
    PaidAlbumPhoto, FavoriteCharacter, TipMessage
)
from app.models.user import Users
from sqlalchemy import create_engine
import os

db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/art_generation')
if '+asyncpg' in db_url:
    db_url = db_url.replace('+asyncpg', '')

try:
    engine = create_engine(db_url)
    # Создаём все таблицы, которых нет
    Base.metadata.create_all(engine, checkfirst=True)
    print('✓ Все таблицы проверены и созданы при необходимости')
except Exception as e:
    print(f'⚠ Предупреждение при создании таблиц: {e}')
" || echo "⚠ Предупреждение: не удалось создать некоторые таблицы"

# Проверяем, нужно ли выполнять миграцию данных
if [ "${AUTO_MIGRATE_DATA:-false}" = "true" ] && [ -f "/app/Docker_all/migrate_data_to_docker.py" ]; then
    echo "Проверка необходимости миграции данных..."
    # Проверяем, есть ли данные в таблице characters
    CHARACTER_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM characters" 2>/dev/null || echo "0")
    if [ "$CHARACTER_COUNT" -eq "0" ] || [ -z "$CHARACTER_COUNT" ]; then
        echo "База данных пустая, запуск миграции данных..."
        cd /app/Docker_all
        python3 migrate_data_to_docker.py || echo "⚠ Миграция данных пропущена (локальная БД недоступна или уже выполнена)"
        
        # Синхронизируем последовательности после миграции данных
        echo "Синхронизация последовательностей после миграции данных..."
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" << 'SQL_EOF' || echo "⚠ Предупреждение: не удалось синхронизировать некоторые последовательности"
SELECT setval('refresh_tokens_id_seq', COALESCE((SELECT MAX(id) FROM refresh_tokens), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('characters_id_seq', COALESCE((SELECT MAX(id) FROM characters), 1), true);
SELECT setval('chat_history_id_seq', COALESCE((SELECT MAX(id) FROM chat_history), 1), true);
SELECT setval('image_generation_history_id_seq', COALESCE((SELECT MAX(id) FROM image_generation_history), 1), true);
SELECT setval('user_gallery_id_seq', COALESCE((SELECT MAX(id) FROM user_gallery), 1), true);
SELECT setval('balance_history_id_seq', COALESCE((SELECT MAX(id) FROM balance_history), 1), true);
SELECT setval('payment_transactions_id_seq', COALESCE((SELECT MAX(id) FROM payment_transactions), 1), true);
SELECT setval('user_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM user_subscriptions), 1), true);
SELECT setval('character_comments_id_seq', COALESCE((SELECT MAX(id) FROM character_comments), 1), true);
SELECT setval('email_verification_codes_id_seq', COALESCE((SELECT MAX(id) FROM email_verification_codes), 1), true);
SELECT setval('chat_sessions_id_seq', COALESCE((SELECT MAX(id) FROM chat_sessions), 1), true);
SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 1), true);
SELECT setval('character_main_photos_id_seq', COALESCE((SELECT MAX(id) FROM character_main_photos), 1), true);
SELECT setval('paid_album_photos_id_seq', COALESCE((SELECT MAX(id) FROM paid_album_photos), 1), true);
SELECT setval('favorite_characters_id_seq', COALESCE((SELECT MAX(id) FROM favorite_characters), 1), true);
SELECT setval('tip_messages_id_seq', COALESCE((SELECT MAX(id) FROM tip_messages), 1), true);
SELECT setval('user_gallery_unlock_id_seq', COALESCE((SELECT MAX(id) FROM user_gallery_unlock), 1), true);
SQL_EOF
        echo "✓ Последовательности синхронизированы"
    else
        echo "✓ База данных уже содержит данные, миграция не требуется"
    fi
fi

# Всегда синхронизируем последовательности (на случай, если данные были добавлены вручную)
echo "Проверка синхронизации последовательностей..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" << 'SQL_EOF' 2>/dev/null || true
SELECT setval('refresh_tokens_id_seq', COALESCE((SELECT MAX(id) FROM refresh_tokens), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('characters_id_seq', COALESCE((SELECT MAX(id) FROM characters), 1), true);
SELECT setval('chat_history_id_seq', COALESCE((SELECT MAX(id) FROM chat_history), 1), true);
SELECT setval('image_generation_history_id_seq', COALESCE((SELECT MAX(id) FROM image_generation_history), 1), true);
SELECT setval('user_gallery_id_seq', COALESCE((SELECT MAX(id) FROM user_gallery), 1), true);
SELECT setval('balance_history_id_seq', COALESCE((SELECT MAX(id) FROM balance_history), 1), true);
SELECT setval('payment_transactions_id_seq', COALESCE((SELECT MAX(id) FROM payment_transactions), 1), true);
SELECT setval('user_subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM user_subscriptions), 1), true);
SELECT setval('character_comments_id_seq', COALESCE((SELECT MAX(id) FROM character_comments), 1), true);
SELECT setval('email_verification_codes_id_seq', COALESCE((SELECT MAX(id) FROM email_verification_codes), 1), true);
SELECT setval('chat_sessions_id_seq', COALESCE((SELECT MAX(id) FROM chat_sessions), 1), true);
SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 1), true);
SELECT setval('character_main_photos_id_seq', COALESCE((SELECT MAX(id) FROM character_main_photos), 1), true);
SELECT setval('paid_album_photos_id_seq', COALESCE((SELECT MAX(id) FROM paid_album_photos), 1), true);
SELECT setval('favorite_characters_id_seq', COALESCE((SELECT MAX(id) FROM favorite_characters), 1), true);
SELECT setval('tip_messages_id_seq', COALESCE((SELECT MAX(id) FROM tip_messages), 1), true);
SELECT setval('user_gallery_unlock_id_seq', COALESCE((SELECT MAX(id) FROM user_gallery_unlock), 1), true);
SQL_EOF
echo "✓ Последовательности проверены"

# Запускаем приложение
echo "Запуск приложения..."
exec "$@"

