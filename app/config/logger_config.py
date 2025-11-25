"""
Конфигурация логгера.
"""
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional

class LoggerConfig(BaseSettings):
    """Настройки логгера."""
    
    # Telegram настройки
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    
    # Настройки логирования
    LOG_LEVEL: str = "ERROR"
    LOG_FILE: str = "logs/app.log"
    MAX_MESSAGE_LENGTH: int = 4000
    
    # Настройки ротации логов
    LOG_ROTATION: str = "1 day"
    LOG_RETENTION: str = "7 days"
    
    # Настройки Telegram бота
    TELEGRAM_BOT_ENABLED: bool = False  # По умолчанию отключаем бота
    TELEGRAM_BOT_TIMEOUT: float = 30.0  # Таймаут для запросов к Telegram API
    TELEGRAM_BOT_RETRY_COUNT: int = 3   # Количество попыток отправки сообщения
    
    # Дополнительные настройки (из .env)
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_db: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[str] = None
    app_host: Optional[str] = None
    app_port: Optional[str] = None
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"  # Разрешаем дополнительные поля
    ) 