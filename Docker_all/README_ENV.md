# Настройка переменных окружения

## Обязательные переменные

Все обязательные переменные должны быть установлены в файле `.env` в папке `Docker_all/`.

### RunPod API

```bash
RUNPOD_API_KEY=your_api_key_here
RUNPOD_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run          # Модель "Аниме"
RUNPOD_URL_2=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID_2/run     # Модель "Аниме реализм"
RUNPOD_URL_3=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID_3/run     # Модель "Реализм" (опционально)
```

### База данных PostgreSQL

```bash
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database
DATABASE_URL=postgresql://your_user:your_password@art_generation_postgres:5432/your_database
```

### Redis

```bash
REDIS_URL=redis://art_generation_redis:6379/0
```

## Опциональные переменные

### RUNPOD_URL_3

Если вы хотите использовать модель "Реализм", добавьте в `.env`:

```bash
RUNPOD_URL_3=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID_3/run
```

**Важно:** Если `RUNPOD_URL_3` не установлен, модель "Реализм" будет недоступна для выбора, и при попытке её использовать будет ошибка.

## Проверка переменных окружения

Для проверки всех переменных окружения запустите:

```bash
cd Docker_all
./check_env.sh
```

## Добавление RUNPOD_URL_3

Если вы получили ошибку о том, что `RUNPOD_URL_3` не установлен:

1. Откройте файл `.env` в папке `Docker_all/`:
   ```bash
   nano Docker_all/.env
   ```

2. Добавьте строку:
   ```bash
   RUNPOD_URL_3=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID_3/run
   ```
   Замените `YOUR_ENDPOINT_ID_3` на ваш реальный endpoint ID из RunPod.

3. Сохраните файл (Ctrl+O, Enter, Ctrl+X в nano).

4. Перезапустите контейнеры:
   ```bash
   docker compose down
   docker compose up -d
   ```

## Проверка после добавления

После добавления переменной проверьте, что она загружается:

```bash
docker compose exec art_generation_backend env | grep RUNPOD_URL_3
```

Должна быть выведена строка с вашим URL.

