"""
Тесты для проверки полного цикла сохранения и поиска промпта.
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


@pytest_asyncio.fixture
async def memory_session() -> AsyncIterator[AsyncSession]:
    """Создает временную in-memory БД для проверки полного цикла промптов."""
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


async def _save_prompt_like_celery(
    session: AsyncSession,
    user_id: int,
    character_name: str,
    prompt: str,
    image_url: str
) -> None:
    """Сохраняет промпт так же, как это делает Celery task."""
    from sqlalchemy import select
    
    # Нормализуем URL (убираем query параметры и фрагменты)
    normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
    
    # Проверяем, не существует ли уже запись с таким URL
    existing_query = select(ChatHistory).where(
        ChatHistory.user_id == user_id,
        ChatHistory.image_url == normalized_url
    ).order_by(ChatHistory.created_at.desc()).limit(1)
    existing_result = await session.execute(existing_query)
    existing = existing_result.scalars().first()
    
    if existing:
        # Обновляем существующую запись
        existing.message_content = prompt
        existing.character_name = character_name
    else:
        # Создаем новую запись
        chat_message = ChatHistory(
            user_id=user_id,
            character_name=character_name,
            session_id="photo_generation",
            message_type="user",
            message_content=prompt,
            image_url=normalized_url,  # Сохраняем нормализованный URL
            image_filename=None
        )
        session.add(chat_message)
    
    await session.flush()
    await session.commit()


@pytest.mark.asyncio
async def test_full_cycle_save_and_find_prompt(memory_session: AsyncSession) -> None:
    """Проверяем полный цикл: сохраняем промпт и находим его."""
    user = await _create_user(memory_session, "test@example.com")
    
    image_url = "https://jfpohpdofnhd.storage.yandexcloud.net/generated_images/test_char/generated_123.png"
    prompt_text = "beautiful girl, high quality, detailed"
    character_name = "test_char"
    
    # Сохраняем промпт (как это делает Celery)
    await _save_prompt_like_celery(
        memory_session,
        user.id,
        character_name,
        prompt_text,
        image_url
    )
    
    # Ищем промпт (как это делает API endpoint)
    response = await get_prompt_by_image(
        image_url,
        db=memory_session,
        current_user=user,
    )
    
    assert response["success"] is True, f"Промпт не найден! Ответ: {response}"
    assert response["prompt"] == prompt_text, f"Промпт не совпадает! Ожидалось: '{prompt_text}', получено: '{response.get('prompt')}'"
    assert response["character_name"] == character_name


@pytest.mark.asyncio
async def test_full_cycle_with_url_params(memory_session: AsyncSession) -> None:
    """Проверяем, что промпт находится даже если URL имеет query параметры."""
    user = await _create_user(memory_session, "test2@example.com")
    
    # Сохраняем с чистым URL
    clean_url = "https://example.com/generated_456.png"
    prompt_text = "test prompt with params"
    character_name = "test_char2"
    
    await _save_prompt_like_celery(
        memory_session,
        user.id,
        character_name,
        prompt_text,
        clean_url
    )
    
    # Ищем с URL с параметрами
    url_with_params = "https://example.com/generated_456.png?param=value&other=test"
    response = await get_prompt_by_image(
        url_with_params,
        db=memory_session,
        current_user=user,
    )
    
    assert response["success"] is True
    assert response["prompt"] == prompt_text


@pytest.mark.asyncio
async def test_full_cycle_multiple_users(memory_session: AsyncSession) -> None:
    """Проверяем, что промпт находится у правильного пользователя."""
    user1 = await _create_user(memory_session, "user1@example.com")
    user2 = await _create_user(memory_session, "user2@example.com")
    
    image_url = "https://example.com/shared_image.png"
    
    # Сохраняем промпт для user1
    await _save_prompt_like_celery(
        memory_session,
        user1.id,
        "char1",
        "prompt from user1",
        image_url
    )
    
    # Сохраняем промпт для user2
    await _save_prompt_like_celery(
        memory_session,
        user2.id,
        "char2",
        "prompt from user2",
        image_url
    )
    
    # user1 должен найти свой промпт
    response1 = await get_prompt_by_image(
        image_url,
        db=memory_session,
        current_user=user1,
    )
    assert response1["success"] is True
    assert response1["prompt"] == "prompt from user1"
    
    # user2 должен найти свой промпт
    response2 = await get_prompt_by_image(
        image_url,
        db=memory_session,
        current_user=user2,
    )
    assert response2["success"] is True
    assert response2["prompt"] == "prompt from user2"

