from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# Импортируем модели для автогенерации
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.database.db import Base
    from app.chat_bot.models.models import (
        CharacterDB, ChatMessageDB, FavoriteCharacter,
        PaidAlbumPhoto, CharacterMainPhoto, TipMessage
    )
    from app.models.user import Users, RefreshToken, EmailVerificationCode
    from app.models.subscription import UserSubscription
    from app.models.payment_transaction import PaymentTransaction
    from app.models.image_generation_history import ImageGenerationHistory
    from app.models.balance_history import BalanceHistory
    target_metadata = Base.metadata
except Exception as e:
    # Avoid non-ASCII output to prevent Windows encoding issues
    print(f"Model import error: {e}")
    target_metadata = None


def include_object(object, name, type_, reflected, compare_to):
    """
    Исключаем таблицы videos и video_snapshots из миграций,
    так как они не определены в моделях, но используются в БД.
    """
    if type_ == "table" and name in ("videos", "video_snapshots"):
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Используем DATABASE_URL из переменных окружения, если доступен
    url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Используем DATABASE_URL из переменных окружения, если доступен
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Преобразуем asyncpg URL в синхронный для Alembic
        if "asyncpg" in database_url:
            database_url = database_url.replace("+asyncpg", "")
        from sqlalchemy import create_engine
        connectable = create_engine(
            database_url,
            poolclass=pool.NullPool,
        )
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_object=include_object
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
