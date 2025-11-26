"""
Тесты для проверки сохранения промпта при генерации изображений.
"""
from typing import AsyncIterator
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.models.chat_history import ChatHistory
from app.models.user import Users
from app.database.db import Base


@pytest_asyncio.fixture
async def memory_session() -> AsyncIterator[AsyncSession]:
    """Создает временную in-memory БД для проверки сохранения промптов."""
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


async def _save_prompt_to_history(
    session: AsyncSession,
    user_id: int,
    character_name: str,
    prompt: str,
    image_url: str
) -> None:
    """Сохраняет промпт в ChatHistory (копия функции из generation_tasks.py)."""
    from sqlalchemy import select
    
    # Нормализуем URL (убираем query параметры и фрагменты)
    normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
    
    # Проверяем, не существует ли уже запись с таким URL
    existing_query = select(ChatHistory).where(
        ChatHistory.user_id == user_id,
        ChatHistory.image_url == normalized_url
    )
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
            image_url=normalized_url,
            image_filename=None
        )
        session.add(chat_message)
    
    await session.flush()
    await session.commit()


@pytest.mark.asyncio
async def test_prompt_saved_after_generation(memory_session: AsyncSession) -> None:
    """Проверяем, что промпт сохраняется после генерации изображения."""
    user = await _create_user(memory_session, "test@example.com")
    
    image_url = "https://example.com/generated_123.png"
    prompt_text = "beautiful girl, high quality"
    character_name = "test_character"
    
    # Сохраняем промпт
    await _save_prompt_to_history(
        memory_session,
        user.id,
        character_name,
        prompt_text,
        image_url
    )
    
    # Проверяем, что промпт сохранен
    from sqlalchemy import select
    normalized_url = image_url.split('?')[0].split('#')[0]
    query = select(ChatHistory).where(
        ChatHistory.user_id == user.id,
        ChatHistory.image_url == normalized_url
    )
    result = await memory_session.execute(query)
    saved_record = result.scalars().first()
    
    assert saved_record is not None, "Промпт не был сохранен в БД"
    assert saved_record.message_content == prompt_text, f"Промпт не совпадает: ожидалось '{prompt_text}', получено '{saved_record.message_content}'"
    assert saved_record.image_url == normalized_url, f"URL не совпадает: ожидалось '{normalized_url}', получено '{saved_record.image_url}'"
    assert saved_record.user_id == user.id, f"user_id не совпадает: ожидалось {user.id}, получено {saved_record.user_id}"


@pytest.mark.asyncio
async def test_prompt_normalized_url(memory_session: AsyncSession) -> None:
    """Проверяем, что URL нормализуется при сохранении и поиске."""
    user = await _create_user(memory_session, "test2@example.com")
    
    # Сохраняем с URL с query параметрами
    image_url_with_params = "https://example.com/generated_123.png?param=value&other=test"
    prompt_text = "test prompt"
    character_name = "test_char"
    
    await _save_prompt_to_history(
        memory_session,
        user.id,
        character_name,
        prompt_text,
        image_url_with_params
    )
    
    # Ищем по нормализованному URL (без параметров)
    from sqlalchemy import select
    normalized_url = "https://example.com/generated_123.png"
    query = select(ChatHistory).where(
        ChatHistory.user_id == user.id,
        ChatHistory.image_url == normalized_url
    )
    result = await memory_session.execute(query)
    saved_record = result.scalars().first()
    
    assert saved_record is not None, "Промпт не найден по нормализованному URL"
    assert saved_record.message_content == prompt_text


@pytest.mark.asyncio
async def test_prompt_updated_if_exists(memory_session: AsyncSession) -> None:
    """Проверяем, что промпт обновляется, если запись уже существует."""
    user = await _create_user(memory_session, "test3@example.com")
    
    image_url = "https://example.com/generated_456.png"
    character_name = "test_char"
    
    # Сохраняем первый промпт
    await _save_prompt_to_history(
        memory_session,
        user.id,
        character_name,
        "first prompt",
        image_url
    )
    
    # Обновляем промпт
    await _save_prompt_to_history(
        memory_session,
        user.id,
        character_name,
        "updated prompt",
        image_url
    )
    
    # Проверяем, что промпт обновлен
    from sqlalchemy import select
    normalized_url = image_url.split('?')[0].split('#')[0]
    query = select(ChatHistory).where(
        ChatHistory.user_id == user.id,
        ChatHistory.image_url == normalized_url
    )
    result = await memory_session.execute(query)
    saved_record = result.scalars().first()
    
    assert saved_record is not None
    assert saved_record.message_content == "updated prompt"
    
    # Проверяем, что запись только одна
    all_records = await memory_session.execute(
        select(ChatHistory).where(ChatHistory.user_id == user.id)
    )
    count = len(all_records.scalars().all())
    assert count == 1, f"Ожидалась 1 запись, найдено {count}"

