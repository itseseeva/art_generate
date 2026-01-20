import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.orm import declarative_base

load_dotenv(override=True)

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_DB = os.getenv("POSTGRES_DB")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

def _build_database_url() -> str:
    """Формирует корректный DATABASE_URL. Если порт не задан, не включаем его."""
    # Приоритет готовому URL из окружения
    env_url = os.getenv("DATABASE_URL") or os.getenv("ASYNC_DATABASE_URL")
    if env_url:
        return env_url

    if not POSTGRES_USER or not POSTGRES_PASSWORD or not POSTGRES_DB or not DB_HOST:
        raise RuntimeError(
            "Отсутствуют переменные окружения для БД: "
            "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_HOST (и опционально DB_PORT)"
        )

    host_part = DB_HOST
    if DB_PORT and DB_PORT.isdigit():
        host_part = f"{DB_HOST}:{DB_PORT}"
    # Если DB_PORT отсутствует или некорректная — не добавляем

    return f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{host_part}/{POSTGRES_DB}"

# URL подключения к базе данных
DATABASE_URL = _build_database_url()

# Определяем тип БД для правильной настройки connect_args
is_sqlite = DATABASE_URL.startswith("sqlite")
is_postgres = DATABASE_URL.startswith("postgresql")

# Настройки connect_args в зависимости от типа БД
connect_args = {}
if is_postgres:
    # Дополнительные настройки для asyncpg (PostgreSQL)
    connect_args = {
        "command_timeout": 30,  # Уменьшаем таймаут команды
        "server_settings": {
            "jit": "off"
        }
    }
# Для SQLite используем пустой словарь, так как он не поддерживает command_timeout

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,  # Отключаем echo для производительности
    # Оптимизированные настройки пула соединений для 100+ одновременных пользователей
    pool_size=30 if not is_sqlite else 1,  # Увеличен базовый пул (SQLite не поддерживает пул)
    max_overflow=70 if not is_sqlite else 0,  # Увеличен overflow (итого до 100 соединений)
    pool_timeout=10,  # Увеличен таймаут ожидания соединения из пула
    pool_pre_ping=True,  # Проверяем соединения перед использованием
    pool_recycle=1800,  # Переиспользуем соединения каждые 30 минут (было 5 минут)
    # Настройки для правильной работы с Unicode
    # Всегда передаем словарь (пустой для SQLite, с настройками для PostgreSQL)
    connect_args=connect_args
)

async_session_maker = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)

Base = declarative_base()

# Dependency
