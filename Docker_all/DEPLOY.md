# Переменные окружения для Production деплоя

## 📦 Миграция данных на Production

### Вариант 1: Автоматическая миграция (рекомендуется)

Используйте скрипт `migrate_to_production.py` для автоматической миграции данных:

```bash
# Установите переменные окружения
export PROD_SERVER_HOST=your-server.com
export PROD_SERVER_USER=root
export PROD_POSTGRES_DB=art_generation
export PROD_POSTGRES_USER=postgres
export PROD_POSTGRES_PASSWORD=your_password

# Запустите миграцию
cd Docker_all
python migrate_to_production.py
```

Скрипт автоматически:
1. Экспортирует данные из локальной БД
2. Загружает дамп на production сервер через SCP
3. Импортирует данные в Docker контейнер на сервере
4. Очищает временные файлы

**Требования:**
- SSH доступ к серверу
- `scp` и `ssh` установлены локально
- Docker контейнер `art_generation_postgres` запущен на сервере

### Вариант 2: Ручная миграция

1. **Экспорт данных локально:**
```bash
cd Docker_all
python migrate_data_to_docker.py  # Создаст дамп локально
# Или вручную:
pg_dump -h localhost -U postgres -d art_generate_db --data-only --no-owner --no-privileges > dump.sql
```

2. **Загрузка на сервер:**
```bash
scp dump.sql user@your-server.com:/tmp/
```

3. **Импорт на сервере:**
```bash
ssh user@your-server.com
cd /path/to/Docker_all
docker cp /tmp/dump.sql art_generation_postgres:/tmp/dump.sql
docker exec -e PGPASSWORD=postgres art_generation_postgres psql -U postgres -d art_generation -f /tmp/dump.sql
docker exec art_generation_postgres rm -f /tmp/dump.sql
rm /tmp/dump.sql
```

### Вариант 3: Прямое подключение к production БД

Если production БД доступна напрямую (не через Docker):

```bash
# Экспорт из локальной БД
pg_dump -h localhost -U postgres -d art_generate_db --data-only --no-owner --no-privileges > dump.sql

# Импорт в production БД
PGPASSWORD=prod_password psql -h prod-server.com -U postgres -d art_generation < dump.sql
```

---

## ⚠️ Что нужно изменить для вашего домена

**Если ваш домен `mysite.ru`, измените следующие переменные:**

1. **FRONTEND_URL** → `https://mysite.ru` (или `http://mysite.ru` если без SSL)
2. **BASE_URL** → `https://api.mysite.ru` (или `https://mysite.ru` если API на том же домене)
3. **GOOGLE_REDIRECT_URI** → `https://api.mysite.ru/api/v1/auth/google/callback/` (если используете Google OAuth)
4. **SECRET_KEY** → сгенерируйте случайную строку минимум 32 символа

**Пример для домена `mysite.ru`:**
```env
FRONTEND_URL=https://mysite.ru
BASE_URL=https://api.mysite.ru
GOOGLE_REDIRECT_URI=https://api.mysite.ru/api/v1/auth/google/callback/
SECRET_KEY=ваша-случайная-строка-минимум-32-символа-для-production
```

---

## 🔐 Безопасность (ОБЯЗАТЕЛЬНО!)

```env
SECRET_KEY=your-super-secret-key-change-this-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## 🗄️ База данных PostgreSQL

```env
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_strong_postgres_password
POSTGRES_DB=art_generation
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://your_postgres_user:your_strong_postgres_password@postgres:5432/art_generation
```

## 🔴 Redis

```env
REDIS_URL=redis://redis:6379/0
REDIS_PORT=6379
```

## 🌐 Домены и URL

**ВАЖНО: Замените `yourdomain.com` на ваш реальный домен!**

Пример для домена `mysite.ru`:
```env
FRONTEND_URL=https://mysite.ru
BASE_URL=https://api.mysite.ru
APP_TITLE=Art Generation
```

Или если фронтенд и API на одном домене:
```env
FRONTEND_URL=https://mysite.ru
BASE_URL=https://mysite.ru
APP_TITLE=Art Generation
```

## 🤖 OpenRouter API (для чат-бота)

```env
OPENROUTER_KEY=sk-or-v1-your-openrouter-api-key
```

## 🎨 RunPod API (для генерации изображений)

```env
RUNPOD_API_KEY=your-runpod-api-key
RUNPOD_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run
RUNPOD_URL_2=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID_2/run
```

## ☁️ Yandex Cloud Storage (для хранения изображений)

```env
YANDEX_BUCKET_NAME=your-bucket-name
YANDEX_ACCESS_KEY=your-access-key
YANDEX_SECRET_KEY=your-secret-key
YANDEX_ENDPOINT_URL=https://storage.yandexcloud.net
```

## 🔄 Replicate API (опционально)

```env
REPLICATE_API_TOKEN=your-replicate-api-token
REPLICATE_MODEL=your-model-name
```

## 🔐 Google OAuth (опционально)

**ВАЖНО: Замените `yourdomain.com` на ваш реальный домен!**

Пример для домена `mysite.ru`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.mysite.ru/api/v1/auth/google/callback/
```

## 📧 Telegram бот (опционально)

```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

## 🌸 Flower (мониторинг Celery)

```env
FLOWER_USER=admin
FLOWER_PASSWORD=your_strong_password_here
FLOWER_PORT=6099
```

## 🚀 Порты

```env
BACKEND_PORT=8000
FRONTEND_PORT=80
```
