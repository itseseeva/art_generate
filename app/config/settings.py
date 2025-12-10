"""
Общие настройки приложения.
"""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
from dotenv import load_dotenv

# Загружаем .env файл перед созданием Settings
# Это гарантирует, что переменные окружения будут доступны
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
else:
    # Пробуем загрузить из корня проекта
    root_env = Path(__file__).parent.parent.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=True)
    else:
        # Пробуем загрузить из текущей директории
        load_dotenv(override=True)


class Settings(BaseSettings):
    """Основные настройки приложения."""
    
    # --- API настройки ---
    API_HOST: str = Field(default="0.0.0.0", description="Хост для API")
    API_PORT: int = Field(default=8000, description="Порт для API")
    
    # --- Пути к файлам ---
    BASE_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent, description="Базовый путь проекта")
    OUTPUT_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "outputs", description="Директория для выходных файлов")
    LORA_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "loras", description="Директория для LoRA моделей")
    DATA_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "app" / "data", description="Директория данных")
    LOGS_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "app" / "logs", description="Директория логов")
    IMAGES_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "app" / "images", description="Директория изображений")
    TEMP_DIR: Path = Field(default_factory=lambda: Path(__file__).parent.parent.parent.parent / "temp", description="Директория временных файлов")
    
    # --- Настройки Stable Diffusion ---
    MODEL_NAME: str = Field(default="counterfeitV30_v30.safetensors", description="Название модели Stable Diffusion")
    VAE_NAME: Optional[str] = Field(default=None, description="Название VAE модели")
    LORA_NAME: Optional[str] = Field(default=None, description="Название LoRA модели")
    
    # --- Параметры генерации Stable Diffusion по умолчанию ---
    DEFAULT_STEPS: int = Field(default=35, description="Количество шагов генерации")
    DEFAULT_CFG_SCALE: float = Field(default=7.0, description="CFG Scale")
    DEFAULT_WIDTH: int = Field(default=512, description="Ширина изображения")
    DEFAULT_HEIGHT: int = Field(default=853, description="Высота изображения")
    DEFAULT_SAMPLER: str = Field(default="DPM++ 2M Karras", description="Сэмплер по умолчанию")
    
    # --- API URLs для Stable Diffusion ---
    SD_API_URL: str = Field(default="http://127.0.0.1:7860", description="URL для Stable Diffusion WebUI API")
    WEBUI_URL: str = Field(default="http://127.0.0.1:7860", description="URL для Stable Diffusion WebUI")
    SD_API_TIMEOUT: float = Field(default=600.0, description="Таймаут для API запросов в секундах")
    
    # --- Default Prompts ---
    USE_DEFAULT_PROMPTS: bool = Field(default=True, description="Использовать дефолтные промпты")
    DEFAULT_PROMPTS_WEIGHT: float = Field(default=1.0, description="Вес дефолтных промптов")
    
    # --- Database ---
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./sql_app.db", description="URL базы данных")
    POSTGRES_DB: str = Field(default="art_generate_db", description="Название PostgreSQL базы")
    POSTGRES_USER: str = Field(default="postgres", description="Пользователь PostgreSQL")
    POSTGRES_PASSWORD: str = Field(default="Kohkau11999", description="Пароль PostgreSQL")
    DB_HOST: str = Field(default="localhost", description="Хост базы данных")
    DB_PORT: str = Field(default="5432", description="Порт базы данных")
    
    # --- Security ---
    SECRET_KEY: str = Field(default="your-super-secret-key-here", description="Секретный ключ")
    ALGORITHM: str = Field(default="HS256", description="Алгоритм шифрования")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24, description="Время жизни токена в минутах")
    
    # --- Frontend ---
    FRONTEND_URL: str = Field(
        default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5175"),
        description="Базовый URL фронтенда"
    )
    
    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = Field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_ID", ""), description="Google OAuth Client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default_factory=lambda: os.getenv("GOOGLE_CLIENT_SECRET", ""), description="Google OAuth Client Secret")
    GOOGLE_REDIRECT_URI: str = Field(default_factory=lambda: os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback/"), description="Google OAuth Redirect URI")
    
    # --- Hugging Face ---
    HUGGINGFACE_TOKEN: str = Field(default="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", description="Токен Hugging Face")
    
    # --- Performance ---
    MAX_WORKERS: int = Field(default=4, description="Максимальное количество воркеров")
    
    # --- LLAMA API ---
    LLAMA_API_URL: str = Field(default="http://localhost:8000", description="URL для LLAMA API")
    
    model_config = ConfigDict(
        env_prefix="APP_",
        case_sensitive=False,
        protected_namespaces=()
    )

def get_settings() -> Settings:
    """Получить экземпляр настроек."""
    return Settings()


# Создаем глобальный экземпляр настроек
settings = get_settings()
