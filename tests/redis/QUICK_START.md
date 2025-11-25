# Быстрый старт тестов Redis

## ✅ Виртуальное окружение активировано

Виртуальное окружение `venv_10` активировано.

## 🚀 Запуск тестов

### Все тесты Redis:
```bash
python -m pytest tests/redis/ -v
```

### Конкретный файл:
```bash
python -m pytest tests/redis/test_redis_cache.py -v
```

### Конкретный тест:
```bash
python -m pytest tests/redis/test_redis_cache.py::test_key_generators -v
```

### С покрытием кода:
```bash
python -m pytest tests/redis/ --cov=app.utils.redis_cache --cov-report=html -v
```

## 📝 Требования

- Запущенный Redis сервер. Рекомендуемый способ – `docker-compose up redis -d`.
- Переменная окружения `REDIS_URL` (или `TEST_REDIS_URL`) должна указывать на тестовую базу, напр. `redis://localhost:6379/15`.
- Установлены зависимости `redis>=5.0.0` и `hiredis>=2.2.0`.

Проверка:
```bash
python -c "import redis.asyncio; print('Redis OK')"
```

## 🔧 Устранение проблем

Если тесты не запускаются из-за импорта, попробуйте:

```bash
# Переустановите redis
pip uninstall redis -y
pip install redis>=5.0.1 hiredis>=2.2.0

# Очистите кэш Python
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null

# Запустите тесты снова
python -m pytest tests/redis/ -v
```

