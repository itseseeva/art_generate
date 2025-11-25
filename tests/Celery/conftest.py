"""
Фикстуры для интеграционных тестов Celery (без моков).
"""
import os
import pytest
import pytest_asyncio
from celery import Celery
from celery.result import AsyncResult
import asyncio

# Используем тестовую базу Redis для Celery
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/15")


@pytest.fixture(scope="session")
def celery_app():
    """
    Создает тестовый экземпляр Celery приложения.
    Использует отдельную базу Redis для тестов.
    Выполняет задачи синхронно для тестирования.
    """
    from app.celery_app import celery_app
    
    # Переопределяем брокер и backend для тестов
    celery_app.conf.update(
        broker_url=TEST_REDIS_URL,
        result_backend=TEST_REDIS_URL,
        task_always_eager=True,  # Выполняем задачи синхронно для тестов
        task_eager_propagates=True,
        task_store_eager_result=True,
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
    )
    
    return celery_app


@pytest_asyncio.fixture
async def redis_client():
    """
    Возвращает реальный Redis клиент для тестов.
    Очищает базу перед и после каждого теста.
    """
    try:
        import redis.asyncio as aioredis
    except ImportError as e:
        pytest.skip(f"Redis модуль недоступен: {e}")
    
    try:
        client = await aioredis.from_url(
            TEST_REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        await client.ping()
    except Exception as e:
        pytest.skip(f"Redis недоступен по адресу {TEST_REDIS_URL}: {e}")
    
    # Очищаем базу перед тестом
    await client.flushdb()
    
    yield client
    
    # Очищаем базу после теста
    await client.flushdb()
    await client.aclose()


@pytest.fixture
def generation_settings():
    """Создает реальные настройки генерации для тестов."""
    return {
        "prompt": "test prompt",
        "negative_prompt": "test negative",
        "use_default_prompts": True,
        "character": "anna",
        "steps": 35,
        "width": 512,
        "height": 853,
        "cfg_scale": 7.0,
        "sampler_name": "DPM++ 2M Karras",
        "seed": None,
    }


@pytest_asyncio.fixture
async def test_db_session():
    """Создает тестовую in-memory сессию базы данных."""
    from sqlalchemy.ext.asyncio import (
        AsyncSession,
        async_sessionmaker,
        create_async_engine,
    )
    from app.database.db import Base
    
    # Импортируем все модели, чтобы они были зарегистрированы в Base.metadata
    from app.models.user import Users, RefreshToken, EmailVerificationCode
    from app.models.subscription import UserSubscription
    from app.models.chat_history import ChatHistory
    # Импортируем другие модели, если они есть
    try:
        from app.models.user_gallery import UserGallery
        from app.models.user_gallery_unlock import UserGalleryUnlock
    except ImportError:
        pass
    
    # Создаем in-memory БД для тестов
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    
    # Создаем все таблицы - используем begin() для транзакции
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    SessionLocal = async_sessionmaker(
        engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
    
    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(test_db_session):
    """Создает тестового пользователя с монетами и подпиской."""
    from app.models.user import Users
    from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
    from datetime import datetime, timedelta
    
    # Создаем пользователя
    user = Users(
        email="test_celery@example.com",
        username="test_celery_user",
        password_hash="test_hash",
        coins=100,  # Достаточно монет для теста
        is_active=True,
        is_verified=True
    )
    test_db_session.add(user)
    await test_db_session.flush()
    
    # Создаем подписку
    subscription = UserSubscription(
        user_id=user.id,
        subscription_type=SubscriptionType.STANDARD,
        status=SubscriptionStatus.ACTIVE,
        monthly_credits=200,
        monthly_photos=20,
        used_credits=0,
        used_photos=0,
        activated_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30),
        last_reset_at=datetime.utcnow()
    )
    test_db_session.add(subscription)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    
    yield user
    
    # Очистка после теста
    try:
        await test_db_session.delete(subscription)
        await test_db_session.delete(user)
        await test_db_session.commit()
    except Exception:
        await test_db_session.rollback()


@pytest.fixture
def test_user_id(test_user):
    """Возвращает ID тестового пользователя."""
    return test_user.id

