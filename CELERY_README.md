# Celery - Асинхронные задачи

## Описание

Celery используется для выполнения долгих операций в фоновом режиме, чтобы не блокировать основной FastAPI сервер.

## Архитектура

- **Брокер**: Redis (очередь задач)
- **Backend**: Redis (хранение результатов)
- **Worker**: Отдельный Docker контейнер для выполнения задач

## Задачи

### 1. Генерация изображений (`app.tasks.generation_tasks`)

- **`generate_image_task`** - Генерация изображения через Stable Diffusion
  - Очередь: `high_priority` (настроено в `task_routes`)
  - Таймаут: 10 минут (`task_time_limit: 600` в celery_app.py, может быть переопределено в docker-compose)
  - Retry: 3 попытки с задержкой 60 секунд

- **`save_chat_history_task`** - Сохранение истории чата
  - Очередь: `low_priority`

### 2. Отправка email (`app.tasks.email_tasks`)

- **`send_email_task`** - Отправка email (верификация и другие)
  - Очередь: `low_priority`

### 3. Работа с облачным хранилищем (`app.tasks.storage_tasks`)

- **`upload_to_cloud_task`** - Загрузка файла в Yandex Cloud Storage
  - Очередь: `normal_priority`

## Очереди

- **`high_priority`** - Высокоприоритетные задачи (генерация изображений)
- **`normal_priority`** - Обычные задачи (загрузка файлов в облако)
- **`low_priority`** - Низкоприоритетные задачи (email, сохранение истории)

Маршрутизация задач настроена в `app/celery_app.py` в секции `task_routes`.

## Запуск

### Docker Compose (рекомендуется)

```bash
docker-compose up celery_worker
```

Worker автоматически запускается вместе с Redis при старте `docker-compose up`.

### Локально (для разработки)

```bash
# Убедитесь, что Redis запущен
redis-server

# Запустите worker
celery -A app.celery_app worker --loglevel=info --concurrency=2 --queues=high_priority,normal_priority,low_priority
```

## Конфигурация

### Переменные окружения

- `REDIS_URL` - URL подключения к Redis (по умолчанию: `redis://localhost:6379/0`)
- `APP_SD_API_URL` - URL API Stable Diffusion WebUI
- `APP_DATABASE_URL` - URL подключения к базе данных
- `DATABASE_URL` - Альтернативный URL БД (приоритет над APP_DATABASE_URL)
- `CELERY_WORKER_CONCURRENCY` - Количество параллельных задач (по умолчанию: 2)

### Настройки в `app/celery_app.py`

- `task_time_limit`: 600 секунд (10 минут) - максимальное время выполнения задачи
- `task_soft_time_limit`: 540 секунд (9 минут) - мягкий лимит (выбрасывает исключение)
- `worker_prefetch_multiplier`: 1 (worker берет только одну задачу за раз)
- `worker_max_tasks_per_child`: 50 (перезапуск worker после 50 задач для освобождения памяти)
- `result_expires`: 3600 секунд (1 час хранения результатов в Redis)
- `task_acks_late`: True (подтверждение задачи только после успешного выполнения)
- `task_track_started`: True (отслеживание начала выполнения задачи)
- `task_max_retries`: 3 (максимальное количество повторов при ошибке)
- `task_default_retry_delay`: 60 секунд (задержка перед повтором)

## Использование в коде

### Отправка задачи

```python
from app.tasks.generation_tasks import generate_image_task

# Асинхронная отправка задачи
task = generate_image_task.delay(
    settings_dict=settings_dict,
    user_id=user_id,
    character_name=character_name
)

# Получить task_id
task_id = task.id
```

### Проверка статуса задачи

```python
from celery.result import AsyncResult
from app.celery_app import celery_app

result = AsyncResult(task_id, app=celery_app)

if result.ready():
    if result.successful():
        data = result.get()
    else:
        error = result.info
else:
    # Задача еще выполняется
    state = result.state
    meta = result.info  # Прогресс выполнения
```

### API эндпоинты

- `POST /api/v1/generate-image/` - Запуск генерации изображения
  - Возвращает `task_id` для отслеживания статуса

- `GET /api/v1/generation-status/{task_id}` - Проверка статуса задачи
  - Возвращает статус, прогресс и результат (если готов)

## Мониторинг

### Flower (опционально)

Flower - веб-интерфейс для мониторинга Celery:

```bash
celery -A app.celery_app flower
```

Доступ: http://localhost:5555

## Тестирование

Все тесты находятся в `tests/celery/`:

```bash
# Запустить все тесты Celery
pytest tests/celery/ -v

# Запустить конкретный тест
pytest tests/celery/test_generation_tasks_integration.py::test_spend_photo_resources_function -v
```

### Типы тестов

- **Интеграционные тесты** - без моков, используют реальный Redis и in-memory БД
- **Unit тесты** - проверка структуры и конфигурации задач

## Структура файлов

```
app/
├── celery_app.py              # Конфигурация Celery
└── tasks/
    ├── __init__.py
    ├── generation_tasks.py    # Задачи генерации изображений
    ├── email_tasks.py         # Задачи отправки email
    └── storage_tasks.py       # Задачи работы с хранилищем

tests/
└── celery/
    ├── conftest.py            # Фикстуры для тестов
    ├── test_celery_app.py
    ├── test_celery_app_integration.py
    ├── test_generation_tasks_integration.py
    ├── test_email_tasks_integration.py
    ├── test_storage_tasks_integration.py
    └── test_api_endpoints_integration.py
```

## Troubleshooting

### Worker не запускается

1. Проверьте, что Redis запущен: `redis-cli ping` (должен вернуть `PONG`)
2. Проверьте переменные окружения в `docker-compose.yml`
3. Проверьте логи: `docker-compose logs celery_worker`

### Задачи не выполняются

1. Убедитесь, что worker запущен и подключен к правильному Redis
2. Проверьте логи worker: `docker-compose logs -f celery_worker`
3. Проверьте, что задачи отправляются в правильную очередь

### Ошибки подключения к БД

Убедитесь, что в `docker-compose.yml` для `celery_worker` установлены:
- `DATABASE_URL` или
- `APP_DATABASE_URL`

## Производительность

- **Concurrency**: 2 параллельных задачи (настраивается через `CELERY_WORKER_CONCURRENCY` в docker-compose)
- **Prefetch**: 1 (worker берет только одну задачу за раз)
- **Max tasks per child**: 50 (перезапуск worker после 50 задач для освобождения памяти)

Для увеличения производительности:
1. Увеличьте `CELERY_WORKER_CONCURRENCY`
2. Запустите несколько worker контейнеров
3. Используйте разные очереди для разных типов задач

