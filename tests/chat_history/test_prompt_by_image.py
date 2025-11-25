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
    """Создает временную in-memory БД для проверки эндпоинта промптов."""
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
    user = Users(
        email=email,
        password_hash="hash",
        is_active=True,
        coins=0,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _add_chat_history(
    session: AsyncSession,
    user_id: int,
    image_url: str,
    prompt_text: str,
    character_name: str = "test_promt",
) -> None:
    entry = ChatHistory(
        user_id=user_id,
        character_name=character_name,
        session_id="session",
        message_type="user",
        message_content=prompt_text,
        image_url=image_url,
    )
    session.add(entry)
    await session.commit()


@pytest.mark.asyncio
async def test_prompt_by_image_prioritizes_current_user(
    memory_session: AsyncSession,
) -> None:
    """Проверяем, что берется промпт текущего пользователя."""
    user = await _create_user(memory_session, "owner@example.com")
    foreign_user = await _create_user(memory_session, "other@example.com")

    target_url = "https://example.com/shared.png"
    await _add_chat_history(
        memory_session,
        foreign_user.id,
        target_url,
        "foreign_prompt",
    )
    await _add_chat_history(
        memory_session,
        user.id,
        target_url,
        "owner_prompt",
    )

    response = await get_prompt_by_image(
        target_url,
        db=memory_session,
        current_user=user,
    )

    assert response["success"] is True
    assert response["prompt"] == "owner_prompt"


@pytest.mark.asyncio
async def test_prompt_by_image_returns_expected_presets(
    memory_session: AsyncSession,
) -> None:
    """Проверяем, что разные страницы получают свои промпты."""
    owner = await _create_user(memory_session, "pages@example.com")
    fixtures = [
        ("https://example.com/main-photo.png", "test_promt_001"),
        ("https://example.com/paid-album.png", "test_album_promt_001"),
        ("https://example.com/chat-image.png", "test_album_promt_001"),
    ]

    for url, prompt_text in fixtures:
        await _add_chat_history(memory_session, owner.id, url, prompt_text)

    for url, expected_prompt in fixtures:
        response = await get_prompt_by_image(
            url,
            db=memory_session,
            current_user=owner,
        )
        assert response["success"] is True
        assert response["prompt"] == expected_prompt


@pytest.mark.asyncio
async def test_prompt_by_image_falls_back_to_foreign_history(
    memory_session: AsyncSession,
) -> None:
    """Даже если у пользователя нет фото, промпт ищется среди всех."""
    owner = await _create_user(memory_session, "source@example.com")
    viewer = await _create_user(memory_session, "viewer@example.com")
    image_url = "https://example.com/shared-image.png"
    await _add_chat_history(memory_session, owner.id, image_url, "shared_prompt")

    response = await get_prompt_by_image(
        image_url,
        db=memory_session,
        current_user=viewer,
    )

    assert response["success"] is True
    assert response["prompt"] == "shared_prompt"
