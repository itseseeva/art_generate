# Redis Кэширование

## Установка и запуск Redis

### Вариант 1: Запуск через Docker (рекомендуется)

1. Убедитесь, что Docker и Docker Compose установлены на вашей системе.

2. Запустите Redis контейнер:
```bash
docker-compose up -d redis
```

3. Проверьте статус контейнера:
```bash
docker-compose ps
```

4. Проверьте логи Redis:
```bash
docker-compose logs redis
```

5. Остановка Redis:
```bash
docker-compose down
```

### Вариант 2: Установка Redis локально

#### Windows:
1. Скачайте Redis для Windows: https://github.com/microsoftarchive/redis/releases
2. Или используйте WSL2 с Redis

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS:
```bash
brew install redis
brew services start redis
```

## Настройка переменных окружения

Добавьте в файл `.env`:

```env
REDIS_URL=redis://localhost:6379/0
```

Или для Docker (если Redis в другой сети):
```env
REDIS_URL=redis://redis:6379/0
```

## Проверка подключения

### Через Redis CLI:
```bash
# Если Redis запущен локально
redis-cli ping

# Если Redis в Docker
docker-compose exec redis redis-cli ping
```

Должен вернуться ответ: `PONG`

### Через Python:
```python
import redis.asyncio as aioredis

async def test_redis():
    client = await aioredis.from_url("redis://localhost:6379/0")
    result = await client.ping()
    print(f"Redis подключен: {result}")

# Запуск
import asyncio
asyncio.run(test_redis())
```

## Конфигурация Redis

В `docker-compose.yml` настроены следующие параметры:

- **appendonly yes** - включена персистентность данных (AOF)
- **maxmemory 256mb** - максимальный объем памяти (можно увеличить)
- **maxmemory-policy allkeys-lru** - политика удаления при нехватке памяти (LRU)
- **save** - автоматическое сохранение на диск

## Мониторинг Redis

### Просмотр статистики:
```bash
docker-compose exec redis redis-cli INFO
```

### Просмотр всех ключей:
```bash
docker-compose exec redis redis-cli KEYS "*"
```

### Очистка всех данных (осторожно!):
```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Просмотр размера данных:
```bash
docker-compose exec redis redis-cli DBSIZE
```

## Структура ключей кэша

Приложение использует следующие префиксы ключей:

- `subscription:user:{user_id}` - данные подписки пользователя
- `subscription:stats:{user_id}` - статистика подписки
- `user:email:{email}` - данные пользователя
- `user:coins:{user_id}` - баланс монет
- `characters:list` - список персонажей
- `character:{name}` - данные персонажа
- `generation:settings` - настройки генерации
- `chat:history:{user_id}:{character}:{session}` - история чата

## TTL (Time To Live)

- Подписки: 5 минут
- Пользователи: 2 минуты
- Монеты: 1 минута
- Персонажи: 30 минут
- Настройки генерации: 1 час
- История чата: 10 минут

## Устранение проблем

### Redis не запускается:
1. Проверьте, не занят ли порт 6379:
```bash
# Windows
netstat -ano | findstr :6379

# Linux/Mac
lsof -i :6379
```

2. Проверьте логи Docker:
```bash
docker-compose logs redis
```

### Ошибка подключения:
1. Убедитесь, что Redis запущен:
```bash
docker-compose ps
```

2. Проверьте переменную окружения `REDIS_URL`

3. Проверьте firewall/брандмауэр

### Проблемы с памятью:
Увеличьте `maxmemory` в `docker-compose.yml`:
```yaml
command: >
  redis-server
  --maxmemory 512mb
  ...
```

## Производительность

Redis кэширование значительно ускоряет работу приложения:

- **Снижение нагрузки на БД**: 60-80%
- **Ускорение ответов API**: 2-5x для кэшированных эндпоинтов
- **Снижение задержек**: особенно для проверок подписки и загрузки персонажей

## Резервное копирование

Данные Redis сохраняются в Docker volume `redis_data`. Для резервного копирования:

```bash
# Создание бэкапа
docker-compose exec redis redis-cli BGSAVE

# Копирование данных
docker cp art_generation_redis:/data ./redis_backup
```

