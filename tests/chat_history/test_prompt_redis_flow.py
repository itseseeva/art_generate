"""
Тесты для проверки сохранения промпта через Redis (без Celery).
"""
from typing import AsyncIterator
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.api.endpoints.chat_history import get_prompt_by_image
from app.database.db import Base
from app.models.chat_history import ChatHistory
from app.models.user import Users
from app.utils.redis_cache import cache_set, cache_get, cache_delete
from app.utils.prompt_saver import save_prompt_to_history


@pytest_asyncio.fixture
async def memory_session() -> AsyncIterator[AsyncSession]:
    """Создает временную in-memory БД для проверки сохранения промптов через Redis."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(
        engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


async def _create_user(session: AsyncSession, email: str) -> Users:
    """Создает тестового пользователя."""
    user = Users(
        email=email,
        password_hash="hash",
        is_active=True,
        coins=1000,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_prompt_saved_via_redis_flow(memory_session: AsyncSession) -> None:
    """Проверяем полный цикл: сохранение промпта в Redis, затем в БД, затем поиск."""
    user = await _create_user(memory_session, "test@example.com")
    
    task_id = "test_task_123"
    image_url = "https://example.com/generated_789.png"
    prompt_text = "test prompt via redis"
    character_name = "test_char"
    
    # Шаг 1: Сохраняем промпт в Redis (как это делает generate_image)
    prompt_data = {
        "user_id": user.id,
        "character_name": character_name,
        "original_user_prompt": prompt_text
    }
    await cache_set(f"prompt:{task_id}", prompt_data, ttl_seconds=300)
    
    # Проверяем, что промпт сохранен в Redis
    cached_data = await cache_get(f"prompt:{task_id}")
    assert cached_data is not None, "Промпт должен быть в Redis"
    assert cached_data["user_id"] == user.id
    assert cached_data["original_user_prompt"] == prompt_text
    
    # Шаг 2: Сохраняем промпт в БД (как это делает get_generation_status)
    await save_prompt_to_history(
        memory_session,
        user.id,
        character_name,
        prompt_text,
        image_url
    )
    
    # Шаг 3: Удаляем промпт из Redis (как это делает get_generation_status)
    await cache_delete(f"prompt:{task_id}")
    
    # Проверяем, что промпт удален из Redis
    cached_data_after = await cache_get(f"prompt:{task_id}")
    assert cached_data_after is None, "Промпт должен быть удален из Redis"
    
    # Шаг 4: Ищем промпт в БД (как это делает get_prompt_by_image)
    response = await get_prompt_by_image(
        image_url,
        db=memory_session,
        current_user=user,
    )
    
    assert response["success"] is True, f"Промпт не найден! Ответ: {response}"
    assert response["prompt"] == prompt_text, f"Промпт не совпадает! Ожидалось: '{prompt_text}', получено: '{response.get('prompt')}'"
    assert response["character_name"] == character_name

