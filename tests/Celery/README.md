# Интеграционные тесты для Celery (без моков)

## Описание

Интеграционные тесты для проверки работы Celery задач и API эндпоинтов без использования моков.
Тесты используют реальные компоненты: Redis, базу данных, Celery задачи.

## Структура тестов

- `test_celery_app.py` - тесты конфигурации Celery
- `test_celery_app_integration.py` - интеграционные тесты конфигурации с Redis
- `test_generation_tasks_integration.py` - интеграционные тесты задач генерации
- `test_email_tasks_integration.py` - интеграционные тесты задач email
- `test_storage_tasks_integration.py` - интеграционные тесты задач storage
- `test_api_endpoints_integration.py` - интеграционные тесты API эндпоинтов

## Запуск тестов

### Все тесты Celery

```bash
pytest tests/celery/ -v
```

### Конкретный файл тестов

```bash
pytest tests/celery/test_generation_tasks_integration.py -v
```

### Конкретный тест

```bash
pytest tests/celery/test_celery_app_integration.py::test_celery_app_redis_connection -v
```

## Требования

- **Redis должен быть запущен** (для тестов используется база 15)
- Все зависимости из `requirements.txt` должны быть установлены
- Для полных интеграционных тестов может потребоваться доступ к БД

## Переменные окружения

```env
TEST_REDIS_URL=redis://localhost:6379/15
```

## Особенности

- **Без моков** - тесты используют реальные компоненты
- **task_always_eager=True** - задачи выполняются синхронно для тестирования
- **Изолированная база Redis** - используется база 15, которая очищается перед/после тестов
- **Реальные проверки** - тесты проверяют реальную работу компонентов

## Примечания

- Тесты с реальной БД помечены как `pytest.skip` и требуют настройки
- Для тестов API используется `TestClient` из FastAPI
- Все асинхронные операции выполняются реально через `asyncio`

