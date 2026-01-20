# Инструкция по применению оптимизаций

## 🚀 Быстрый старт

### Шаг 1: Остановить текущие контейнеры
```bash
cd Docker_all
docker-compose down
```

### Шаг 2: Пересобрать образы (если нужно)
```bash
docker-compose build --no-cache
```

### Шаг 3: Запустить с новой конфигурацией
```bash
docker-compose up -d
```

### Шаг 4: Проверить статус
```bash
docker-compose ps
docker logs art_generation_backend --tail 50
docker logs art_generation_celery --tail 50
```

---

## 📋 Что было изменено

### Файлы с изменениями:
1. ✅ `nginx-docker.conf` - увеличены таймауты, добавлен rate limiting
2. ✅ `Docker_all/docker-compose.yml` - увеличены workers
3. ✅ `app/database/db.py` - оптимизирован connection pool
4. ✅ `app/utils/http_client.py` - добавлен connection pooling

### Новые файлы:
1. ✅ `OPTIMIZATION_REPORT.md` - детальный отчет по оптимизации
2. ✅ `DEPLOYMENT_INSTRUCTIONS.md` - эта инструкция

---

## ⚙️ Настройки после развертывания

### 1. Проверить PostgreSQL connections
```bash
docker exec -it art_generation_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"
```
Должно быть < 100 соединений

### 2. Проверить Redis connections
```bash
docker exec -it art_generation_redis redis-cli -a $REDIS_PASSWORD INFO clients
```
Должно быть < 50 соединений

### 3. Проверить Celery workers
```bash
docker exec -it art_generation_celery celery -A app.celery_app inspect active
```
Должно показать 12 воркеров

### 4. Проверить Gunicorn workers
```bash
docker exec -it art_generation_backend ps aux | grep gunicorn
```
Должно показать 8 воркеров + 1 master процесс

---

## 🧪 Тестирование

### Простой тест доступности
```bash
curl -I http://localhost/api/v1/health
```
Должен вернуть `200 OK`

### Тест генерации изображения
```bash
curl -X POST http://localhost/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "test", "width": 512, "height": 512}'
```

### Нагрузочное тестирование (опционально)
```bash
# Установить Apache Bench
apt-get install apache2-utils

# Тест: 100 запросов, 10 одновременно
ab -n 100 -c 10 http://localhost/api/v1/characters
```

---

## 📊 Мониторинг

### Проверка логов в реальном времени
```bash
# Backend
docker logs -f art_generation_backend

# Celery
docker logs -f art_generation_celery

# Nginx
docker logs -f art_generation_frontend
```

### Проверка ресурсов
```bash
docker stats
```

### Проверка очереди Celery
```bash
docker exec -it art_generation_celery celery -A app.celery_app inspect stats
```

---

## 🔧 Откат изменений (если что-то пошло не так)

### Вариант 1: Откат через git
```bash
git checkout HEAD -- nginx-docker.conf
git checkout HEAD -- Docker_all/docker-compose.yml
git checkout HEAD -- app/database/db.py
git checkout HEAD -- app/utils/http_client.py
docker-compose down
docker-compose up -d
```

### Вариант 2: Ручной откат настроек

#### nginx-docker.conf
Вернуть таймауты:
```nginx
proxy_read_timeout 60s;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
```

Удалить rate limiting:
```nginx
# Удалить эти строки
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
limit_req zone=api_limit burst=40 nodelay;
```

#### docker-compose.yml
Вернуть workers:
```yaml
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Вернуть Celery concurrency:
```yaml
--concurrency=8
```

#### app/database/db.py
Вернуть pool settings:
```python
pool_size=20 if not is_sqlite else 1,
max_overflow=40 if not is_sqlite else 0,
pool_timeout=5,
pool_recycle=300,
```

---

## ⚠️ Важные замечания

1. **Перезапуск контейнеров**: При изменении `docker-compose.yml` нужен полный перезапуск
2. **Nginx конфигурация**: Изменения применяются автоматически (volume mount)
3. **Python код**: Изменения применяются автоматически (volume mount)
4. **Бэкап БД**: Рекомендуется сделать бэкап перед применением изменений

### Бэкап PostgreSQL
```bash
docker exec -t art_generation_postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из бэкапа
```bash
docker exec -i art_generation_postgres psql -U $POSTGRES_USER $POSTGRES_DB < backup_20260120_123456.sql
```

---

## 📈 Ожидаемые результаты

После применения оптимизаций:

✅ **Response time**: Без изменений (< 200ms для API)  
✅ **Throughput**: +100% (в 2 раза больше запросов/сек)  
✅ **Concurrent users**: 100-150 пользователей одновременно  
✅ **Error rate**: < 1% (меньше таймаутов)  
✅ **Stability**: Стабильная работа под нагрузкой  

---

## 🆘 Troubleshooting

### Проблема: 502 Bad Gateway
**Причина**: Backend не отвечает  
**Решение**:
```bash
docker logs art_generation_backend --tail 100
docker restart art_generation_backend
```

### Проблема: 504 Gateway Timeout
**Причина**: Операция занимает > 180 секунд  
**Решение**: Увеличить таймауты в `nginx-docker.conf` (текущий лимит: 3 минуты)

### Проблема: Too many connections (PostgreSQL)
**Причина**: Превышен лимит соединений  
**Решение**:
```bash
# Проверить текущие соединения
docker exec -it art_generation_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT count(*) FROM pg_stat_activity;"

# Убить idle соединения
docker exec -it art_generation_postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"
```

### Проблема: Redis connection timeout
**Причина**: Redis перегружен  
**Решение**:
```bash
# Проверить статус
docker exec -it art_generation_redis redis-cli -a $REDIS_PASSWORD INFO stats

# Очистить кэш (осторожно!)
docker exec -it art_generation_redis redis-cli -a $REDIS_PASSWORD FLUSHDB
```

### Проблема: Celery workers не запускаются
**Причина**: Ошибка в коде или конфигурации  
**Решение**:
```bash
docker logs art_generation_celery --tail 100
docker restart art_generation_celery
```

---

## 📞 Контакты и поддержка

При возникновении проблем:
1. Проверить логи всех сервисов
2. Проверить метрики ресурсов (`docker stats`)
3. Проверить сетевое соединение между контейнерами
4. Обратиться к `OPTIMIZATION_REPORT.md` для деталей

---

## ✅ Чек-лист развертывания

- [ ] Сделан бэкап БД
- [ ] Остановлены текущие контейнеры
- [ ] Применены изменения в файлах
- [ ] Пересобраны образы (если нужно)
- [ ] Запущены новые контейнеры
- [ ] Проверены логи всех сервисов
- [ ] Проверена доступность API
- [ ] Проверено количество workers
- [ ] Проверены соединения к БД и Redis
- [ ] Проведено базовое тестирование
- [ ] Настроен мониторинг (рекомендуется)

---

**Дата создания**: 2026-01-20  
**Версия**: 1.0  
**Статус**: Готово к применению
