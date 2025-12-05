# 🚀 Деплой на VPS

## Как это работает

При выполнении `docker compose build` на VPS автоматически скачается:
- **PyTorch + CUDA** (~10 GB) - библиотеки для GPU
- **SD модель oneObsession_v18** (~6.6 GB) - основная модель для генерации
- **LoRA модели** (~400 MB) - Semi-realism, kms_in_the_dark
- **ADetailer модель** (~6 MB) - для улучшения лиц
- **LLM модель Mistral-7B** (~4 GB) - для чата с ИИ
- **Python/Node библиотеки** (~5 GB) - FastAPI, React и т.д.
- **SD WebUI + Text WebUI** (~3 GB) - клонируются из GitHub

**ИТОГО: ~35-40 GB скачается автоматически**

## Что загружать на VPS

**Только исходный код (~50-200 MB):**
- Папки: `app/`, `frontend/`, `alembic/`
- Файлы: `docker-compose.yml`, все `Dockerfile*`, `.env`, `requirements-backend.txt`, `nginx.conf`
- Конфиги SD (опционально): `stable-diffusion-webui-forge-main/config.json`, `ui-config.json`

**Модели НЕ нужны - они скачаются автоматически!**

## Инструкция деплоя

### 1. На локальной машине

```bash
# Упаковать проект БЕЗ моделей и node_modules
tar -czf project_A.tar.gz \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.git' \
  --exclude='stable-diffusion-webui-forge-main/models/*' \
  project_A/

# Загрузить на VPS (~50-200 MB)
scp project_A.tar.gz user@your-vps-ip:/home/user/
```

### 2. На VPS сервере

#### Шаг 1: Проверить требования

```bash
# GPU (ОБЯЗАТЕЛЬНО!)
nvidia-smi
# Должна показать GPU с 12+ GB VRAM

# Docker
docker --version
# Версия 20.10+

# Docker Compose
docker compose version
# Версия 2.0+

# NVIDIA Docker
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
# Должна показать GPU

# Место на диске
df -h
# Свободно минимум 80 GB (40 GB скачается + запас)
```

#### Шаг 2: Распаковать проект

```bash
cd /home/user
tar -xzf project_A.tar.gz
cd project_A

# Проверить .env
cat .env
# Должны быть заполнены: SECRET_KEY, YANDEX_CLOUD_*, REDIS_URL, и т.д.
```

#### Шаг 3: Собрать образы (1-2 ЧАСА!)

```bash
# Запустить билд (модели скачаются автоматически!)
docker compose build

# Следить за процессом (опционально, в другом терминале):
# docker compose build --progress=plain
```

**Время билда по сервисам:**
- `sd-webui`: ~40-60 мин (PyTorch + SD модели 10 GB)
- `text-webui`: ~30-40 мин (PyTorch + LLM модель 4 GB)
- `backend`: ~5-10 мин
- `frontend`: ~10-15 мин
- `celery`: ~5 мин

#### Шаг 4: Запустить

```bash
# Запустить все сервисы
docker compose up -d

# Проверить статус (все должны быть "Up" и "healthy")
docker compose ps

# Смотреть логи
docker compose logs -f
```

#### Шаг 5: Проверить работоспособность

```bash
# Проверить каждый сервис
curl http://localhost:7860/              # SD WebUI
curl http://localhost:5000/api/v1/model  # Text WebUI
curl http://localhost:8000/test-ping-simple   # Backend
curl http://localhost/                   # Frontend

# Открыть в браузере
http://your-vps-ip/
```

## Мониторинг и управление

```bash
# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend
docker compose logs -f sd-webui

# Использование GPU
watch -n 1 nvidia-smi

# Использование ресурсов
docker stats

# Перезапустить сервис
docker compose restart sd-webui
docker compose restart backend

# Остановить всё
docker compose down

# Запустить снова
docker compose up -d
```

## Возможные проблемы

### ❌ "No NVIDIA GPU devices"
**Причина:** Нет GPU или не установлены драйверы  
**Решение:** Арендовать VPS с GPU, установить nvidia-driver-535

### ❌ "CUDA out of memory"
**Причина:** Мало VRAM  
**Решение:** VPS с GPU минимум 12 GB VRAM

### ❌ "Could not select device driver"
**Причина:** NVIDIA Docker не установлен  
**Решение:**
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

### ❌ "No space left on device"
**Причина:** Мало места  
**Решение:** VPS минимум 80 GB SSD

### ❌ "Checkpoint not found"
**Причина:** Модель не скачалась при билде  
**Решение:**
```bash
# Зайти в контейнер
docker exec -it art_generation_sd_webui bash

# Проверить модели
ls -lh /app/webui/models/Stable-diffusion/

# Если пусто - скачать вручную
cd /app/webui/models/Stable-diffusion
wget -O oneObsession_v18.safetensors \
  "https://civitai.com/api/download/models/319927"

# Выйти и перезапустить
exit
docker compose restart sd-webui
```

### ❌ Frontend показывает "Cannot connect to backend"
**Причина:** Backend не запустился  
**Решение:**
```bash
# Проверить логи backend
docker compose logs backend

# Проверить что backend запущен
docker compose ps backend

# Перезапустить
docker compose restart backend
```

### ❌ Долго билдится (>3 часов)
**Причина:** Медленный интернет на VPS  
**Решение:** Подождать или скачать модели вручную (смотри выше)

## Обновление проекта

```bash
# 1. Загрузить новую версию
scp project_A_v2.tar.gz user@vps:/home/user/

# 2. Остановить сервисы
docker compose down

# 3. Сделать бэкап БД
cp app.db app.db.backup

# 4. Распаковать новую версию
tar -xzf project_A_v2.tar.gz

# 5. Вернуть БД
cp app.db.backup project_A/app.db

# 6. Пересобрать и запустить
cd project_A
docker compose build
docker compose up -d
```

## Пересборка отдельных сервисов

Если изменили только код backend или frontend, не нужно пересобирать всё:

```bash
# Только backend (быстро, ~5 мин)
docker compose build backend
docker compose up -d backend

# Только frontend (быстро, ~10 мин)
docker compose build frontend
docker compose up -d frontend

# Только celery
docker compose build celery_worker
docker compose up -d celery_worker

# SD или Text WebUI пересобирать долго (~1 час), делайте только если нужно
docker compose build sd-webui
docker compose up -d sd-webui
```

## Повторные билды

Благодаря кэшу Docker, повторные билды быстрые (~5-10 минут), так как:
- Модели уже скачаны (в слоях образа)
- PyTorch уже установлен
- Библиотеки уже установлены

Docker пересоберёт только изменённые слои!

## Требования к VPS

**Минимум:**
- GPU: 12 GB VRAM (NVIDIA)
- CPU: 4 ядра
- RAM: 16 GB
- Диск: 80 GB SSD
- Ubuntu 20.04+ с Docker + NVIDIA Docker

**Рекомендуется:**
- GPU: 16-24 GB VRAM
- CPU: 8 ядер
- RAM: 32 GB
- Диск: 150 GB SSD

**Примеры провайдеров:**
- AWS: p3.2xlarge (Tesla V100)
- Paperspace: GPU+ машины
- Vast.ai: RTX 4090/3090
- Lambda Labs: GPU Cloud
