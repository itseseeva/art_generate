# Docker Setup для Art Generation

Этот каталог содержит все необходимые Docker файлы для запуска всего приложения в контейнерах.

## Структура

- `Dockerfile.backend` - образ для FastAPI бэкенда
- `Dockerfile.frontend` - образ для React фронтенда
- `Dockerfile.celery` - образ для Celery worker и beat
- `docker-compose.yml` - конфигурация для всех сервисов
- `nginx.conf` - конфигурация Nginx для фронтенда
- `requirements.txt` - очищенные Python зависимости
- `.dockerignore.backend` - исключения для бэкенда
- `.dockerignore.frontend` - исключения для фронтенда

## Сервисы

1. **postgres** - PostgreSQL база данных (данные сохраняются в volume `postgres_data`)
2. **redis** - Redis для кэширования и очередей (данные сохраняются в volume `redis_data`)
3. **backend** - FastAPI приложение
4. **celery_worker** - Celery worker для фоновых задач
5. **celery_beat** - Celery beat для периодических задач
6. **flower** - Мониторинг Celery (опционально)
7. **frontend** - React приложение через Nginx

**Важно:** Все данные БД и Redis сохраняются в Docker volumes и не теряются при перезапуске контейнеров.

## Использование

### 1. Подготовка

**Важно:** Убедитесь, что файлы `requirements-docker.txt` и `nginx-docker.conf` существуют в корне проекта. 
Если вы обновили файлы в `Docker_all/`, скопируйте их в корень:

```bash
cp Docker_all/requirements.txt requirements-docker.txt
cp Docker_all/nginx.conf nginx-docker.conf
```

Создайте файл `.env` в корне проекта с необходимыми переменными окружения:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=art_generation
POSTGRES_PORT=5432

REDIS_URL=redis://redis:6379/0
REDIS_PORT=6379

BACKEND_PORT=8000
FRONTEND_PORT=80
FLOWER_PORT=5555

SECRET_KEY=your_secret_key
DATABASE_URL=postgresql+asyncpg://postgres:your_password@postgres:5432/art_generation

# Другие переменные окружения...
```

### 2. Миграция данных из локальной БД в Docker

Если у вас есть данные в локальной базе данных, которые нужно перенести в Docker:

**Вариант 1: Python скрипт (рекомендуется, кроссплатформенный)**
```bash
cd Docker_all
python migrate_data_to_docker.py
```

**Вариант 2: PowerShell (Windows)**
```powershell
cd Docker_all
.\migrate_data_to_docker.ps1
```

**Вариант 3: Bash (Linux/Mac/WSL)**
```bash
cd Docker_all
./migrate_data_to_docker.sh
```

**Важно:** Перед миграцией убедитесь, что:
- Docker контейнер `art_generation_postgres` запущен (`docker-compose up -d postgres`)
- У вас установлен `pg_dump` (PostgreSQL client tools)
- Переменные окружения для локальной БД настроены в `.env` или системе

Скрипт автоматически:
1. Экспортирует все данные из локальной БД
2. Импортирует их в Docker контейнер
3. Очистит временные файлы

**Примечание:** Данные сохраняются в Docker volume `postgres_data` и не теряются при перезапуске контейнеров.

### 3. Запуск

#### Вариант А: Запуск всего приложения в Docker (Рекомендуется для VPS)
Из директории `Docker_all`:

```bash
docker-compose up -d
```

#### Вариант Б: Запуск только БД и Redis в Docker (Рекомендуется для локальной разработки)
Если вы хотите запускать код Python вручную (через venv), но вам нужны рабочие PostgreSQL и Redis:

```bash
cd Docker_all
docker-compose -f docker-compose.local.yml up -d
```
Это запустит Postgres на порту 5432 и Redis на порту 6379 на вашем `localhost`.

### 4. Остановка

```bash
docker-compose down
```

### 5. Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f frontend
```

### 6. Пересборка образов

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Порты

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8000
- **Flower**: http://localhost:5555
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Миграции базы данных

После первого запуска выполните миграции:

```bash
docker-compose exec backend alembic upgrade head
```

## Примечания

- Все данные PostgreSQL и Redis сохраняются в Docker volumes
- Для production рекомендуется использовать внешние базы данных
- Настройте правильные переменные окружения для production
- Убедитесь, что все необходимые секреты указаны в `.env`

## .dockerignore файлы

Файлы `.dockerignore.backend` и `.dockerignore.frontend` находятся в папке `Docker_all`. 
Для их использования скопируйте их в корень проекта:

```bash
# Для бэкенда и Celery
cp Docker_all/.dockerignore.backend .dockerignore

# Для фронтенда (если нужен отдельный .dockerignore)
cp Docker_all/.dockerignore.frontend .dockerignore
```

Или создайте `.dockerignore` в корне проекта на основе этих файлов.

