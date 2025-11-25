# Stable Diffusion API + Chat Bot

API для генерации изображений на Stable Diffusion и чат-бот с кастомными персонажами на MythoMax L2 13B.
Проект представляет собой развлекательный NFST контент где пользователь общаеться с заранее прописаным персонажем(модель для Role PLay - Gryphe-MythoMax-L2-13b.Q4_K_S) и может запрашивать фото с этим персонажем через Stable Diffusion

## Основные фичи

### Генерация изображений
- Stable Diffusion с Face Detailer, LoRA, add_detail, realisticVisionV60B1_v51HyperVAE
- text-generation-webui-Gryphe-MythoMax-L2-13b.Q4_K_S
- Параметры: шаги, CFG scale, seed, negative prompt
- Batch генерация и оптимизированные сэмплеры
- LoRA адаптации - загрузка и применение кастомных стилей
- add_detail - автоматическое добавление деталей
- Batch processing - генерация нескольких изображений одновременно

### Чат-бот с персонажами
- **Role Play система** - полноценные диалоги с кастомными персонажами
- **Alpaca формат** - оптимизированные промпты для MythoMax
- **Context memory** - сохранение истории и контекста диалогов
- **Streaming responses** - потоковые ответы в реальном времени
- **Character switching** - переключение между персонажами
- **Image generation in chat** - генерация изображений прямо в чате

# основные промты для Stable Diffusion в файлах app\config\generation_defaults.py, app\config\default_prompts.py
# Настройки для text-generation-webui в папке app\chat_bot\config\chat_config\


### Система
- Асинхронный FastAPI backend с Uvicorn
- JWT аутентификация
- PostgreSQL с SQLAlchemy 2.0 и Alembic миграциями
- CI/CD, Docker, логирование, мониторинг

## Технологии

- **Python 3.13, FastAPI, Uvicorn, Pydantic v2**
- **Stable Diffusion WebUI-realisticVisionV60B1_v51HyperVAE, text-generation-webui-Gryphe-MythoMax-L2-13b.Q4_K_S**
- **PostgreSQL + asyncpg, SQLAlchemy 2.0**
- **JWT, bcrypt, python-jose**
- **Pillow, NumPy, Face Detailer, LoRA**
- **Loguru, psutil, GPUtil, tenacity**
- **Pytest, black, mypy**


