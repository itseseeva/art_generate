# Docker Local - Быстрая локальная разработка

Эта папка содержит оптимизированную конфигурацию Docker для локальной разработки.

## Особенности

- ✅ **Быстрая сборка** - используется оптимизированный `.dockerignore`, исключающий большие директории
- ✅ **Только необходимые сервисы** - Redis и Celery (без backend)
- ✅ **Оптимизированный контекст сборки** - передается только необходимый код

## Запуск

**Важно:** запускайте обязательно из папки `docker_local`, иначе Redis и Celery окажутся в разных сетях и появится ошибка `Error -2 connecting to redis:6379. Name or service not known`.

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

## Ошибка "error reading from server: EOF" при сборке

Если при `docker compose up --build` появляется:

```
failed to prepare ... error reading from server: EOF
rpc error: code = Unavailable desc = error reading from server: EOF
```

это обычно проблема Docker BuildKit/демона на Windows. Что сделать по порядку:

1. **Перезапустить Docker Desktop**  
   Правый клик по иконке Docker в трее → Restart. Подождать полного запуска, затем снова:
   ```bash
   cd docker_local
   docker compose up --build
   ```

2. **Собрать без BuildKit (legacy builder):**
   ```bash
   cd docker_local
   DOCKER_BUILDKIT=0 docker compose up --build
   ```

3. **Очистить кэш сборки и пересобрать:**
   ```bash
   docker builder prune -f
   cd docker_local
   docker compose build --no-cache
   docker compose up
   ```

4. **Собрать только Redis и один сервис (проверка):**
   ```bash
   docker compose up -d redis
   docker compose build celery_worker --no-cache
   docker compose up celery_worker
   ```

5. **Если используете WSL2:** в `%USERPROFILE%\.wslconfig` можно увеличить память (например, `memory=4GB`), затем в PowerShell: `wsl --shutdown`, снова открыть терминал и повторить сборку.

## Ошибка "Name or service not known" (Redis)

Если Celery падает с `Error -2 connecting to redis:6379. Name or service not known`:

1. Запускайте контейнеры **из папки docker_local**: `cd docker_local && docker compose up`.
2. Не задавайте в `.env` переменную `REDIS_URL` с хостом `localhost` — в контейнере Redis доступен по имени сервиса `redis`.
3. После смены каталога или compose-файла выполните `docker compose down` и снова `docker compose up`.
4. Убедитесь, что контейнер Redis стартует первым (есть `depends_on: redis: condition: service_healthy`).

## Отличия от docker-compose.local.yml

- Убран backend сервис (запускайте его локально через uvicorn на порту 8001)
- Изменен build context для использования .dockerignore
- Оптимизирован Dockerfile.celery
- Порт 8001 свободен для локального backend
