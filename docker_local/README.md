# Docker Local - Быстрая локальная разработка

Эта папка содержит оптимизированную конфигурацию Docker для локальной разработки.

## Особенности

- ✅ **Быстрая сборка** - используется оптимизированный `.dockerignore`, исключающий большие директории
- ✅ **Только необходимые сервисы** - Redis и Celery (без backend)
- ✅ **Оптимизированный контекст сборки** - передается только необходимый код

## Запуск

Из корня проекта:
```bash
cd docker_local
docker compose up --build
```

Или без пересборки (если образ уже собран):
```bash
cd docker_local
docker compose up
```

## Остановка и очистка

Если возникла ошибка "container name is already in use":
```bash
# Остановить и удалить старые контейнеры
docker compose down

# Или принудительно удалить конкретный контейнер
docker rm -f art_generation_redis_local art_generation_celery_local art_generation_celery_beat_local

# Затем запустить снова
docker compose up --build
```

## Что включено

- **Redis** - очередь задач (порт 6379)
- **Celery Worker** - обработка фоновых задач
- **Celery Beat** - периодические задачи

**Примечание:** Backend API запускайте локально через uvicorn на порту 8001:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 --no-access-log
```

## Порты

- **Redis**: 6379
- **Backend (локально)**: 8001 (запускается вручную через uvicorn)
- **Celery Worker/Beat**: работают внутри Docker, без внешних портов

## Почему быстро?

1. **Оптимизированный .dockerignore** (в корне проекта) - исключает:
   - frontend/ (~300MB)
   - generation_logs/ (~GB)
   - paid_gallery/ (~GB)
   - runpod-worker*/ (~GB)
   - node_modules/ и другие зависимости
   - тесты и документацию

2. **Нет backend сервиса** - собирается только Celery образ

3. **Умное копирование** - копируется только необходимый код Python

## Отличия от docker-compose.local.yml

- Убран backend сервис (запускайте его локально через uvicorn на порту 8001)
- Изменен build context для использования .dockerignore
- Оптимизирован Dockerfile.celery
- Порт 8001 свободен для локального backend
