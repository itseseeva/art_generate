# Art Generation Platform

Платформа для создания ИИ-персонажей, общения с ними и генерации фотореалистичных изображений.

## Возможности

- 🎨 **Генерация изображений** через Stable Diffusion WebUI Forge
- 💬 **Чат с ИИ персонажами** через Text Generation WebUI
- 👤 **Создание персонажей** с уникальной внешностью и характером
- 📸 **Фотореалистичные изображения** с автоматическим улучшением лиц (ADetailer)
- 💰 **Система монет и подписок**
- 🖼️ **Платные альбомы** с приватными фото

## Технологии

**Backend:**
- FastAPI (Python 3.10)
- PostgreSQL / SQLite
- Redis (кэширование)
- Celery (фоновые задачи)
- SQLAlchemy 2.0

**Frontend:**
- React + TypeScript
- Vite
- Styled Components
- Nginx (production)

**AI/ML:**
- Stable Diffusion WebUI Forge (SDXL)
- Text Generation WebUI
- ADetailer (улучшение лиц)
- PyTorch + CUDA

## Быстрый старт (Development)

### 1. Backend

```bash
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5175
```

### 3. Stable Diffusion WebUI

```bash
cd stable-diffusion-webui-forge-main
./webui-forge-sdxl.bat  # Windows
```

### 4. OpenRouter API

Настройте переменную окружения `OPENROUTER_KEY` в файле `.env`:

```bash
OPENROUTER_KEY=your_api_key_here
```

## Production Deploy (Docker)

### Требования

- **NVIDIA GPU** (минимум 8 GB VRAM, рекомендуется 12+ GB)
- **NVIDIA Docker** (nvidia-docker2)
- **60+ GB** дискового пространства
- **16+ GB RAM**

### Установка

```bash
# 1. Установите NVIDIA Docker
# См. DEPLOY.md для инструкций

# 2. Настройте .env файл
cp .env.example .env
# Отредактируйте .env (API ключи, пароли и т.д.)

# 3. Проверка готовности
python check_deploy.py

# 4. Запуск (первая сборка ~30-60 минут!)
docker-compose build
docker-compose up -d

# 5. Проверка статуса
docker-compose ps
docker-compose logs -f
```

### После запуска

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000/docs
- **SD WebUI**: http://localhost:7860

⏱️ **Время запуска**: ~3-7 минут (загрузка моделей в GPU)

## Тестирование

### Тест генерации 10 изображений

```bash
python tests/generation_test/test_generate_10_images.py
```

Фото сохранятся в `tests/generation_test/`

## Структура проекта

```
project_A/
├── app/                           # Backend (FastAPI)
│   ├── main.py                    # Главный файл API
│   ├── config/                    # Конфигурация
│   ├── services/                  # Бизнес-логика
│   ├── routers/                   # API роуты
│   └── database/                  # БД модели
├── frontend/                      # Frontend (React)
│   ├── src/
│   │   ├── components/            # React компоненты
│   │   └── App.tsx                # Главный компонент
│   └── package.json
├── stable-diffusion-webui-forge-main/  # SD WebUI
│   └── models/                    # Модели (не в Git)
├── tests/                         # Тесты
├── docker-compose.yml             # Docker оркестрация
├── Dockerfile                     # Backend образ
├── Dockerfile.frontend            # Frontend образ
├── Dockerfile.sd-webui            # SD WebUI образ
└── DEPLOY.md                      # Подробный гайд по деплою
```

## Документация

- **DEPLOY.md** - Полное руководство по деплою
- **API Docs** - http://localhost:8000/docs (после запуска)

## Мониторинг

```bash
# Статус контейнеров
docker-compose ps

# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f sd-webui
docker-compose logs -f text-webui

# Использование ресурсов
docker stats
```

## Остановка

```bash
# Остановка всех сервисов
docker-compose down

# Остановка с удалением volumes
docker-compose down -v
```

## Лицензия

Proprietary
