"""
Центральный файл с фикстурами для тестов.
Содержит общие фикстуры для всех тестов проекта.
"""
import os
import sys
from typing import AsyncGenerator, Generator
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from fakeredis import aioredis as fakeredis
import redis.asyncio as redis

# Добавляем корневую директорию проекта в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.database.db import Base
from app.database.db_depends import get_db
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.auth.dependencies import create_jwt_token
from datetime import timedelta





# Тестовая база данных
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:Kohkau11999@localhost:5432/art_generate_test_db"


@pytest.fixture(scope="session")
def event_loop():
    """Создание event loop для всей сессии тестов."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Создание тестового движка БД."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )
    
    # Создаем все таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Очищаем после тестов
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Создание сессии БД для каждого теста."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Создание тестового HTTP клиента FastAPI."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def fake_redis() -> AsyncGenerator:
    """Создание мок Redis для тестов."""
    fake_redis_client = fakeredis.FakeRedis(decode_responses=True)
    yield fake_redis_client
    await fake_redis_client.flushall()
    await fake_redis_client.close()


# ============================================================================
# Фикстуры для создания тестовых пользователей
# ============================================================================

@pytest.fixture
async def test_user_free(db_session: AsyncSession):
    """Создание тестового пользователя с FREE подпиской."""
    # Получаем класс Users из реестра вместо импорта
    Users = Base.registry._class_registry.data['Users']
    
    from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
    from passlib.context import CryptContext
    from datetime import datetime, timedelta
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = Users(
        email="free_user@test.com",
        username="free_user",
        password=pwd_context.hash("testpassword123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Создаем FREE подписку
    subscription = UserSubscription(
        user_id=user.id,
        subscription_type=SubscriptionType.FREE,
        status=SubscriptionStatus.ACTIVE,
        monthly_messages=10,
        images_limit=5,
        voice_limit=0,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db_session.add(subscription)
    await db_session.commit()
    
    return user



@pytest.fixture
async def test_user_standard(db_session: AsyncSession):
    """Создание тестового пользователя с STANDARD подпиской."""
    Users = Base.registry._class_registry.data['Users']
    
    from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
    from passlib.context import CryptContext
    from datetime import datetime, timedelta
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = Users(
        email="standard_user@test.com",
        username="standard_user",
        password=pwd_context.hash("testpassword123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Создаем STANDARD подписку
    subscription = UserSubscription(
        user_id=user.id,
        subscription_type=SubscriptionType.STANDARD,
        status=SubscriptionStatus.ACTIVE,
        monthly_messages=0,  # Безлимитные сообщения
        images_limit=50,
        voice_limit=30,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db_session.add(subscription)
    await db_session.commit()
    
    return user


@pytest.fixture
async def test_user_premium(db_session: AsyncSession):
    """Создание тестового пользователя с PREMIUM подпиской."""
    Users = Base.registry._class_registry.data['Users']
    
    from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
    from passlib.context import CryptContext
    from datetime import datetime, timedelta
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = Users(
        email="premium_user@test.com",
        username="premium_user",
        password=pwd_context.hash("testpassword123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Создаем PREMIUM подписку
    subscription = UserSubscription(
        user_id=user.id,
        subscription_type=SubscriptionType.PREMIUM,
        status=SubscriptionStatus.ACTIVE,
        monthly_messages=0,  # Безлимитные сообщения
        images_limit=200,
        voice_limit=100,
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db_session.add(subscription)
    await db_session.commit()
    
    return user


# ============================================================================
# Фикстуры для аутентификации
# ============================================================================

@pytest.fixture
def auth_headers_free(test_user_free) -> dict:
    """Создание заголовков авторизации для FREE пользователя."""
    token = create_jwt_token({"sub": test_user_free.email}, expires_delta=timedelta(hours=24))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_standard(test_user_standard) -> dict:
    """Создание заголовков авторизации для STANDARD пользователя."""
    token = create_jwt_token({"sub": test_user_standard.email}, expires_delta=timedelta(hours=24))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_premium(test_user_premium) -> dict:
    """Создание заголовков авторизации для PREMIUM пользователя."""
    token = create_jwt_token({"sub": test_user_premium.email}, expires_delta=timedelta(hours=24))
    return {"Authorization": f"Bearer {token}"}



# ============================================================================
# Фикстуры для мокирования внешних сервисов
# ============================================================================

@pytest.fixture
def mock_runpod_response():
    """Мок ответа от RunPod API."""
    return {
        "id": "test-job-id-123",
        "status": "COMPLETED",
        "output": {
            "image_url": "https://test-storage.com/test-image.png",
            "seed": 12345,
        }
    }


@pytest.fixture
def mock_openrouter_response():
    """Мок ответа от OpenRouter API."""
    return {
        "id": "chatcmpl-test-123",
        "object": "chat.completion",
        "created": 1234567890,
        "model": "sao10k/l3-euryale-70b",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Привет! Это тестовый ответ от AI."
                },
                "finish_reason": "stop"
            }
        ]
    }


@pytest.fixture
def mock_yandex_storage_url():
    """Мок URL для Yandex Storage."""
    return "https://storage.yandexcloud.net/test-bucket/test-file.png"
