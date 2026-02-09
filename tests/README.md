# Тестирование Бэкенда

Комплексная система тестирования для проекта Candy Girls Chat с использованием pytest.

## Установка Зависимостей

```bash
# Активируйте виртуальное окружение
venv\Scripts\activate  # Windows

# Установите зависимости
pip install -r requirements.txt
```

## Структура Тестов

```
tests/
├── conftest.py                    # Общие фикстуры
├── test_config.py                 # Тестовая конфигурация
├── test_image_generation.py       # Тесты RunPod API
├── test_subscriptions.py          # Тесты подписок
├── test_redis.py                  # Тесты Redis
└── test_celery.py                 # Тесты Celery
```

## Запуск Тестов

### Все тесты

```bash
pytest
```

### Только unit тесты (без внешних API)

```bash
pytest -m "unit"
```

### Только integration тесты

```bash
pytest -m "integration"
```

### Тесты конкретного модуля

```bash
# Тесты генерации изображений
pytest tests/test_image_generation.py

# Тесты подписок
pytest tests/test_subscriptions.py

# Тесты Redis
pytest tests/test_redis.py

# Тесты Celery
pytest tests/test_celery.py
```

### Конкретный тест

```bash
pytest tests/test_subscriptions.py::test_premium_subscription_privileges
```

### С покрытием кода

```bash
pytest --cov=app --cov-report=html
```

После выполнения откройте `htmlcov/index.html` в браузере для просмотра отчета.

### Параллельное выполнение (быстрее)

```bash
pytest -n auto
```

### Пропуск медленных тестов

```bash
pytest -m "not slow"
```

### Пропуск тестов требующих RunPod API

```bash
pytest -m "not runpod"
```

## Маркеры Тестов

- `unit` - Unit тесты (без внешних зависимостей)
- `integration` - Интеграционные тесты
- `slow` - Медленные тесты (> 10 секунд)
- `runpod` - Тесты требующие RunPod API
- `redis` - Тесты требующие Redis
- `celery` - Тесты требующие Celery
- `db` - Тесты требующие БД

## Переменные Окружения для Тестов

Создайте файл `.env.test` (опционально):

```env
# Тестовая БД
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/art_generate_test_db

# Redis
REDIS_URL=redis://localhost:6379/1

# RunPod (для integration тестов)
RUNPOD_API_KEY=your_test_api_key
RUNPOD_URL=https://api.runpod.ai/v2/test/run
RUNPOD_URL_2=https://api.runpod.ai/v2/test2/run
```

## Создание Тестовой БД

```bash
# PostgreSQL
createdb art_generate_test_db
```

Или через SQL:

```sql
CREATE DATABASE art_generate_test_db;
```

## Примеры Использования

### Запуск тестов перед коммитом

```bash
# Быстрые unit тесты
pytest -m "unit" -v

# Если прошли, запускаем integration
pytest -m "integration" -v
```

### CI/CD Pipeline

```bash
# Полный прогон с покрытием
pytest --cov=app --cov-report=term-missing --cov-fail-under=70
```

### Отладка конкретного теста

```bash
# С подробным выводом
pytest tests/test_subscriptions.py::test_subscription_limits_accumulation -vv -s
```

## Troubleshooting

### Ошибка подключения к БД

Убедитесь что PostgreSQL запущен и тестовая БД создана:

```bash
psql -U postgres -c "CREATE DATABASE art_generate_test_db;"
```

### Ошибка подключения к Redis

Убедитесь что Redis запущен:

```bash
redis-cli ping
# Должно вернуть: PONG
```

Или используйте fakeredis (уже включен в тесты).

### Тесты RunPod падают

Проверьте что `RUNPOD_API_KEY` установлен:

```bash
echo $RUNPOD_API_KEY
```

Или пропустите эти тесты:

```bash
pytest -m "not runpod"
```

## Дополнительные Команды

### Список всех тестов

```bash
pytest --collect-only
```

### Запуск с подробным выводом

```bash
pytest -vv
```

### Остановка на первой ошибке

```bash
pytest -x
```

### Показать локальные переменные при ошибке

```bash
pytest -l
```

### Запуск последних упавших тестов

```bash
pytest --lf
```

## Рекомендации

1. **Перед коммитом**: Запускайте `pytest -m "unit"` для быстрой проверки
2. **Перед пуш**: Запускайте `pytest` для полной проверки
3. **Перед деплоем**: Запускайте `pytest -m "integration"` для проверки критических путей
4. **Регулярно**: Проверяйте покрытие кода `pytest --cov=app`

## Структура Фикстур

### conftest.py

- `test_engine` - Тестовый движок БД
- `db_session` - Сессия БД для каждого теста
- `client` - HTTP клиент FastAPI
- `fake_redis` - Мок Redis
- `test_user_free` - Пользователь с FREE подпиской
- `test_user_standard` - Пользователь с STANDARD подпиской
- `test_user_premium` - Пользователь с PREMIUM подпиской
- `auth_headers_*` - Заголовки авторизации

## Покрытие Кода

Цель: минимум 70% покрытия кода.

Текущее покрытие можно посмотреть:

```bash
pytest --cov=app --cov-report=term-missing
```

Критические модули должны иметь > 80% покрытия:
- `app/services/runpod_client.py`
- `app/models/subscription.py`
- `app/services/subscription_service.py`
