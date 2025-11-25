# Celery для фоновых задач

## Описание

Проект использует Celery для выполнения долгих операций в фоновом режиме:
- Генерация изображений (30-300 секунд)
- Загрузка в облако
- Отправка email
- Сохранение истории чата

## Установка

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Запуск Redis

```bash
docker-compose up -d redis
```

Или локально:
```bash
redis-server
```

## Запуск Celery Worker

### Вариант 1: Через Docker Compose (рекомендуется)

```bash
docker-compose up -d celery_worker
```

### Вариант 2: Локально (Windows)

```bash
start_celery_worker.bat
```

### Вариант 3: Локально (Linux/Mac)

```bash
chmod +x start_celery_worker.sh
./start_celery_worker.sh
```

### Вариант 4: Вручную

```bash
celery -A app.celery_app worker --loglevel=info --concurrency=2 --queues=high_priority,normal_priority,low_priority
```

## Использование API

### 1. Генерация изображения

**Запрос:**
```bash
POST /api/v1/generate-image/
{
  "prompt": "beautiful landscape",
  "character": "anna",
  "steps": 35
}
```

**Ответ:**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "PENDING",
  "message": "Задача генерации изображения создана",
  "status_url": "/api/v1/generation-status/abc123-def456-ghi789"
}
```

### 2. Проверка статуса генерации

**Запрос:**
```bash
GET /api/v1/generation-status/{task_id}
```

**Ответ (в процессе):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "PROGRESS",
  "message": "Загрузка изображения в облако",
  "progress": 70
}
```

**Ответ (завершено):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "SUCCESS",
  "message": "Генерация завершена успешно",
  "result": {
    "success": true,
    "image_url": "https://storage.yandexcloud.net/...",
    "cloud_url": "https://storage.yandexcloud.net/...",
    "filename": "generated_1234567890.png",
    "character": "anna"
  }
}
```

**Ответ (ошибка):**
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "FAILURE",
  "message": "Ошибка при генерации изображения",
  "error": "Описание ошибки"
}
```

## Очереди задач

- **high_priority** - генерация изображений для Premium пользователей
- **normal_priority** - обычная генерация изображений
- **low_priority** - загрузка в облако, email, история чата

## Мониторинг

### Flower (веб-интерфейс для мониторинга Celery)

```bash
celery -A app.celery_app flower
```

Откройте в браузере: http://localhost:5555

### Проверка статуса worker

```bash
celery -A app.celery_app inspect active
```

### Список зарегистрированных задач

```bash
celery -A app.celery_app inspect registered
```

## Переменные окружения

```env
REDIS_URL=redis://localhost:6379/0
APP_SD_API_URL=http://127.0.0.1:7860
APP_DATABASE_URL=sqlite+aiosqlite:///./sql_app.db
```

## Устранение проблем

### Worker не запускается

1. Проверьте, что Redis запущен:
```bash
redis-cli ping
```

2. Проверьте переменную окружения `REDIS_URL`

3. Проверьте логи:
```bash
docker-compose logs celery_worker
```

### Задачи не выполняются

1. Проверьте, что worker запущен:
```bash
celery -A app.celery_app inspect ping
```

2. Проверьте очереди:
```bash
celery -A app.celery_app inspect active_queues
```

### Ошибки подключения к Redis

Убедитесь, что Redis доступен по адресу из `REDIS_URL`:
- Для Docker: `redis://redis:6379/0`
- Для локального: `redis://localhost:6379/0`

## Производительность

- **Concurrency**: 2 воркера (можно увеличить в docker-compose.yml)
- **Retry**: 3 попытки с задержкой 60 секунд
- **Timeout**: 10 минут на задачу
- **Результаты**: хранятся 1 час в Redis

