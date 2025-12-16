# RunPod API Integration - Настройка

## Описание

Интеграция с RunPod API для асинхронной генерации изображений через Celery.

## Архитектура

1. **`app/services/runpod_client.py`** - Асинхронный клиент для работы с RunPod API
2. **`app/tasks/runpod_tasks.py`** - Celery задачи для фоновой генерации
3. **Redis** - Брокер сообщений и хранилище результатов для Celery

## Требования

- Python 3.11+
- Redis
- RunPod аккаунт и API ключ

## Установка зависимостей

```bash
pip install httpx celery redis python-dotenv loguru
```

## Настройка переменных окружения

Добавь в свой `.env` файл:

```env
# RunPod API Configuration
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_URL=https://api.runpod.ai/v2/your_endpoint_id/run

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Yandex S3 Configuration (для сохранения изображений)
YANDEX_BUCKET_NAME=your_bucket_name
YANDEX_ACCESS_KEY=your_access_key
YANDEX_SECRET_KEY=your_secret_key
YANDEX_ENDPOINT_URL=https://storage.yandexcloud.net
```

### Как получить RunPod учётные данные:

1. Зарегистрируйся на [RunPod](https://www.runpod.io/)
2. Перейди в [Settings → API Keys](https://www.runpod.io/console/user/settings)
3. Создай новый API ключ
4. Создай Serverless Endpoint с нужной моделью
5. Скопируй Endpoint URL (должен заканчиваться на `/run`)

## Запуск Celery Worker

### В Docker (рекомендуется):

```bash
docker compose -f docker-compose.local.yml up
```

### Локально:

```bash
# Запуск Redis
redis-server

# Запуск Celery Worker
celery -A app.celery_app worker --loglevel=info --concurrency=2

# Запуск Celery Beat (планировщик)
celery -A app.celery_app beat --loglevel=info
```

## Использование

### 1. Прямой вызов асинхронной функции

```python
import asyncio
from app.services.runpod_client import generate_image_async

async def main():
    image_url = await generate_image_async(
        user_prompt="beautiful anime girl, detailed eyes",
        width=832,
        height=1216,
        steps=30,
        timeout=300
    )
    print(f"Image URL: {image_url}")

asyncio.run(main())
```

### 2. Через Celery задачу (рекомендуется для production)

```python
from app.tasks.runpod_tasks import generate_image_runpod_task

# Асинхронный вызов (не блокирует)
task = generate_image_runpod_task.delay(
    user_prompt="beautiful anime girl, detailed eyes",
    width=832,
    height=1216,
    steps=30
)

# Получить ID задачи
task_id = task.id
print(f"Task ID: {task_id}")

# Проверить статус
status = task.status  # PENDING, STARTED, SUCCESS, FAILURE

# Дождаться результата (блокирует!)
result = task.get(timeout=300)
print(f"Image URL: {result['image_url']}")
```

### 3. Пакетная генерация

```python
from app.tasks.runpod_tasks import generate_image_batch_task

# Генерация нескольких изображений
prompts = [
    "anime girl with blue hair",
    "anime girl with red hair",
    "anime girl with green hair"
]

task = generate_image_batch_task.delay(
    prompts=prompts,
    width=832,
    height=1216,
    steps=30
)

result = task.get(timeout=900)  # 15 минут на 3 изображения
print(f"Successful: {result['successful']}/{result['total']}")
```

### 4. Тестирование подключения

```python
from app.tasks.runpod_tasks import test_runpod_connection_task

task = test_runpod_connection_task.delay()
result = task.get(timeout=300)

if result['success']:
    print("✅ RunPod API работает корректно!")
else:
    print(f"❌ Ошибка: {result['message']}")
```

## API Endpoints (пример интеграции с FastAPI)

```python
from fastapi import APIRouter, BackgroundTasks
from app.tasks.runpod_tasks import generate_image_runpod_task

router = APIRouter()

@router.post("/generate")
async def generate_image_endpoint(prompt: str):
    """Запускает генерацию изображения в фоне"""
    task = generate_image_runpod_task.delay(user_prompt=prompt)
    return {
        "task_id": task.id,
        "status": "pending",
        "message": "Image generation started"
    }

@router.get("/status/{task_id}")
async def check_generation_status(task_id: str):
    """Проверяет статус генерации"""
    from celery.result import AsyncResult
    task = AsyncResult(task_id)
    
    if task.ready():
        result = task.result
        return {
            "status": "completed",
            "result": result
        }
    else:
        return {
            "status": task.status.lower(),
            "task_id": task_id
        }
```

## Параметры генерации

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `user_prompt` | str | - | Промпт пользователя (обязательно) |
| `width` | int | 832 | Ширина изображения |
| `height` | int | 1216 | Высота изображения |
| `steps` | int | 30 | Количество шагов диффузии |
| `cfg_scale` | float | 4.0 | CFG Scale (насколько точно следовать промпту) |
| `seed` | int | -1 | Сид для воспроизводимости (-1 = случайный) |
| `sampler_name` | str | "Euler" | Название сэмплера |
| `scheduler` | str | "Euler A" | Планировщик |
| `negative_prompt` | str | auto | Негативный промпт |
| `use_enhanced_prompts` | bool | True | Добавлять ли дефолтные промпты |
| `timeout` | int | 300 | Таймаут в секундах |

## Обработка ошибок

```python
from celery.exceptions import TimeoutError, Retry

try:
    result = task.get(timeout=300)
    print(f"Success: {result['image_url']}")
except TimeoutError:
    print("Generation timeout exceeded")
except Exception as e:
    print(f"Error: {e}")
```

## Мониторинг

### Flower (Web UI для Celery)

```bash
celery -A app.celery_app flower --port=5555
```

Открой http://localhost:5555 для просмотра задач.

### Логи

Все операции логируются через `loguru`:
- `[RUNPOD]` - клиент RunPod API
- `[RUNPOD TASK]` - Celery задачи
- `[RUNPOD BATCH]` - пакетная генерация

## Производительность

- **Одна генерация**: ~20-60 секунд (зависит от модели и количества шагов)
- **Retry**: автоматический повтор 3 раза с задержкой 60 секунд
- **Таймаут**: 300 секунд по умолчанию
- **Очередь**: `high_priority` для RunPod задач

## Troubleshooting

### Ошибка: "RUNPOD_API_KEY не установлен"

Убедись, что файл `.env` загружен и содержит корректный API ключ.

### Ошибка: "Connection refused"

Проверь, что Redis запущен:
```bash
redis-cli ping
# Должен вернуть: PONG
```

### Ошибка: "Task timeout"

Увеличь параметр `timeout` или уменьши `steps` для более быстрой генерации.

### Задача застряла в статусе PENDING

```bash
# Очистка очередей
celery -A app.celery_app purge
```

## Дополнительно

- Результаты хранятся в Redis 1 час
- Максимум 3 автоматических повтора при ошибках
- Worker перезапускается после 50 задач (предотвращение утечек памяти)
- Поддержка graceful shutdown

