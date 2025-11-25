# Инструкция по запуску тестов Redis

## Проблема с импортом redis.asyncio

Если вы видите ошибку `ModuleNotFoundError: No module named 'redis.asyncio'` при запуске тестов, это может быть связано с тем, что pytest использует системный Python вместо виртуального окружения.

## Решение

### 1. Убедитесь, что виртуальное окружение активировано:

```bash
# Windows (Git Bash)
source venv_10/Scripts/activate

# Windows (CMD)
venv_10\Scripts\activate.bat

# Linux/Mac
source venv_10/bin/activate
```

### 2. Проверьте, что redis установлен в venv:

```bash
python -c "import redis; print(redis.__version__)"
python -c "import redis.asyncio; print('OK')"
```

### 3. Запустите тесты:

```bash
# Все тесты Redis
python -m pytest tests/redis/ -v

# Конкретный тест
python -m pytest tests/redis/test_redis_cache.py::test_key_generators -v

# С покрытием
python -m pytest tests/redis/ --cov=app.utils.redis_cache -v
```

### 4. Если проблема сохраняется:

Попробуйте использовать прямой путь к Python из venv:

```bash
# Windows
venv_10\Scripts\python.exe -m pytest tests/redis/ -v

# Linux/Mac  
venv_10/bin/python -m pytest tests/redis/ -v
```

## Альтернативное решение

Если проблема с импортом сохраняется, можно временно использовать моки для всех тестов, не требуя реального Redis:

Все тесты уже используют моки, поэтому они должны работать без реального Redis сервера.

