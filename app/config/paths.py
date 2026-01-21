"""
Конфигурация путей для приложения.
"""

from pathlib import Path
from typing import Dict, Any

# Базовый путь проекта
BASE_DIR = Path(__file__).parent.parent.parent

# Основные директории
OUTPUT_DIR = BASE_DIR / "outputs"
LORA_DIR = BASE_DIR / "loras"
DATA_DIR = BASE_DIR / "app" / "data"
LOGS_DIR = BASE_DIR / "app" / "logs"
IMAGES_DIR = BASE_DIR / "app" / "images"
VOICES_DIR = BASE_DIR / "app" / "voices"
DEFAULT_CHARACTER_VOICES_DIR = BASE_DIR / "app" / "default_character_voices"
USER_VOICES_DIR = BASE_DIR / "app" / "user_voices"
TEMP_DIR = BASE_DIR / "temp"
CACHE_DIR = BASE_DIR / "cache"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

# Пути для Stable Diffusion
SD_WEBUI_DIR = BASE_DIR / "stable-diffusion-webui"
SD_MODELS_DIR = SD_WEBUI_DIR / "models" / "Stable-diffusion"
SD_VAE_DIR = SD_WEBUI_DIR / "models" / "VAE"
SD_EMBEDDINGS_DIR = SD_WEBUI_DIR / "embeddings"
SD_SCRIPTS_DIR = SD_WEBUI_DIR / "scripts"

# Пути для text-generation-webui удалены

# Пути для пользователей
USERS_DIR = BASE_DIR / "users"
USERS_IMAGES_DIR = USERS_DIR / "images"
USERS_LOGS_DIR = USERS_DIR / "logs"

# Пути для чат-бота
CHAT_BOT_DIR = BASE_DIR / "app" / "chat_bot"
CHAT_BOT_DATA_DIR = CHAT_BOT_DIR / "data"
CHARACTERS_DIR = CHAT_BOT_DATA_DIR / "characters"

# Пути для API
API_DIR = BASE_DIR / "app" / "api"
ENDPOINTS_DIR = API_DIR / "endpoints"

# Пути для сервисов
SERVICES_DIR = BASE_DIR / "app" / "services"
UTILS_DIR = BASE_DIR / "app" / "utils"

# Пути для конфигурации
CONFIG_DIR = BASE_DIR / "app" / "config"
AUTH_DIR = BASE_DIR / "app" / "auth"
CORE_DIR = BASE_DIR / "app" / "core"
DATABASE_DIR = BASE_DIR / "app" / "database"

# Пути для статических файлов
STATIC_DIR = BASE_DIR / "app" / "static"
STATIC_IMAGES_DIR = STATIC_DIR / "images"
STATIC_CSS_DIR = STATIC_DIR / "css"
STATIC_JS_DIR = STATIC_DIR / "js"

# Пути для тестов
TESTS_DIR = BASE_DIR / "tests"
TRASH_DIR = BASE_DIR / "trash"

# Пути для виртуального окружения
VENV_DIR = BASE_DIR / "venv"

# Пути для alembic
ALEMBIC_DIR = BASE_DIR / "alembic"
ALEMBIC_VERSIONS_DIR = ALEMBIC_DIR / "versions"

def get_paths() -> Dict[str, Path]:
    """
    Получить все пути в виде словаря.
    
    Returns:
        Словарь с путями
    """
    return {
        "BASE_DIR": BASE_DIR,
        "OUTPUT_DIR": OUTPUT_DIR,
        "LORA_DIR": LORA_DIR,
        "DATA_DIR": DATA_DIR,
        "LOGS_DIR": LOGS_DIR,
        "IMAGES_DIR": IMAGES_DIR,
        "VOICES_DIR": VOICES_DIR,
        "DEFAULT_CHARACTER_VOICES_DIR": DEFAULT_CHARACTER_VOICES_DIR,
        "USER_VOICES_DIR": USER_VOICES_DIR,
        "TEMP_DIR": TEMP_DIR,
        "CACHE_DIR": CACHE_DIR,
        "MODELS_DIR": MODELS_DIR,
        "REPORTS_DIR": REPORTS_DIR,
        "SD_WEBUI_DIR": SD_WEBUI_DIR,
        "SD_MODELS_DIR": SD_MODELS_DIR,
        "SD_VAE_DIR": SD_VAE_DIR,
        "SD_EMBEDDINGS_DIR": SD_EMBEDDINGS_DIR,
        "SD_SCRIPTS_DIR": SD_SCRIPTS_DIR,

        "USERS_DIR": USERS_DIR,
        "USERS_IMAGES_DIR": USERS_IMAGES_DIR,
        "USERS_LOGS_DIR": USERS_LOGS_DIR,
        "CHAT_BOT_DIR": CHAT_BOT_DIR,
        "CHAT_BOT_DATA_DIR": CHAT_BOT_DATA_DIR,
        "CHARACTERS_DIR": CHARACTERS_DIR,
        "API_DIR": API_DIR,
        "ENDPOINTS_DIR": ENDPOINTS_DIR,
        "SERVICES_DIR": SERVICES_DIR,
        "UTILS_DIR": UTILS_DIR,
        "CONFIG_DIR": CONFIG_DIR,
        "AUTH_DIR": AUTH_DIR,
        "CORE_DIR": CORE_DIR,
        "DATABASE_DIR": DATABASE_DIR,
        "STATIC_DIR": STATIC_DIR,
        "STATIC_IMAGES_DIR": STATIC_IMAGES_DIR,
        "STATIC_CSS_DIR": STATIC_CSS_DIR,
        "STATIC_JS_DIR": STATIC_JS_DIR,
        "TESTS_DIR": TESTS_DIR,
        "TRASH_DIR": TRASH_DIR,
        "VENV_DIR": VENV_DIR,
        "ALEMBIC_DIR": ALEMBIC_DIR,
        "ALEMBIC_VERSIONS_DIR": ALEMBIC_VERSIONS_DIR,
    }

def create_directories() -> None:
    """
    Создать все необходимые директории.
    """
    paths = get_paths()
    for path in paths.values():
        if path.is_file():
            continue
        path.mkdir(parents=True, exist_ok=True)

def get_relative_path(absolute_path: Path) -> str:
    """
    Получить относительный путь от базовой директории.
    
    Args:
        absolute_path: Абсолютный путь
        
    Returns:
        Относительный путь в виде строки
    """
    try:
        return str(absolute_path.relative_to(BASE_DIR))
    except ValueError:
        return str(absolute_path)

def get_absolute_path(relative_path: str) -> Path:
    """
    Получить абсолютный путь из относительного.
    
    Args:
        relative_path: Относительный путь
        
    Returns:
        Абсолютный путь
    """
    return BASE_DIR / relative_path
