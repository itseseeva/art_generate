from typing import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.db import Base
from app.models.user import Users
from app.chat_bot.models.models import CharacterDB, CharacterMainPhoto
from app.routers.gallery import PaidAlbumUnlockRequest, _get_character_by_slug, _is_album_unlocked, unlock_paid_gallery
from app.chat_bot.api.character_endpoints import set_main_photos


@pytest_asyncio.fixture
async def memory_session() -> AsyncIterator[AsyncSession]:
    """Создает отдельную in-memory БД для теста."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with SessionLocal() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_character_by_slug(memory_session: AsyncSession) -> None:
    """Проверяем, что персонаж корректно ищется по слагу."""
    character = CharacterDB(
        name="Мария",
        prompt="Test prompt",
        character_appearance="appearance",
    )
    memory_session.add(character)
    await memory_session.commit()

    result = await _get_character_by_slug(memory_session, "мария")
    assert result is not None
    assert result.name == "Мария"


@pytest.mark.asyncio
async def test_unlock_paid_album_spends_coins(memory_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> None:
    """Разблокировка альбома списывает 200 кредитов и создает запись."""
    user = Users(email="user@example.com", password_hash="hash", coins=500, is_active=True)
    memory_session.add(user)
    await memory_session.commit()
    await memory_session.refresh(user)

    character = CharacterDB(name="Alice", prompt="Prompt for Alice")
    memory_session.add(character)
    await memory_session.commit()
    await memory_session.refresh(character)

    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    response = await unlock_paid_gallery(
        PaidAlbumUnlockRequest(character_name=character.name),
        db=memory_session,
        current_user=user,
    )

    await memory_session.refresh(user)
    assert user.coins == 300
    assert response.unlocked is True
    assert response.coins == 300

    unlocked = await _is_album_unlocked(memory_session, user.id, "alice")
    assert unlocked is True


@pytest.mark.asyncio
async def test_owner_unlocks_without_payment(memory_session: AsyncSession) -> None:
    """Создатель персонажа получает доступ к альбому без списания монет."""
    user = Users(email="owner@example.com", password_hash="hash", coins=150, is_active=True)
    memory_session.add(user)
    await memory_session.commit()
    await memory_session.refresh(user)

    character = CharacterDB(name="OwnerChar", prompt="Prompt", user_id=user.id)
    memory_session.add(character)
    await memory_session.commit()
    await memory_session.refresh(user)
    await memory_session.refresh(character)

    response = await unlock_paid_gallery(
        PaidAlbumUnlockRequest(character_name=character.name),
        db=memory_session,
        current_user=user,
    )

    await memory_session.refresh(user)
    assert user.coins == 150  # Монеты не списываются у владельца
    assert response.unlocked is True
    assert response.coins == 150

    unlocked = await _is_album_unlocked(memory_session, user.id, "ownerchar")
    assert unlocked is True


@pytest.mark.asyncio
async def test_set_main_photos_writes_to_db(memory_session: AsyncSession) -> None:
    """Проверяем, что новые главные фото сохраняются в таблицу character_main_photos."""
    user = Users(email="creator@example.com", password_hash="hash", coins=200, is_active=True)
    memory_session.add(user)
    await memory_session.commit()
    await memory_session.refresh(user)

    character = CharacterDB(name="MainPhotosChar", prompt="Prompt", user_id=user.id)
    memory_session.add(character)
    await memory_session.commit()
    await memory_session.refresh(character)

    payload = {
        "character_name": character.name,
        "photos": [
            {"id": "photo1", "url": "https://example.com/photo1.png"},
            {"id": "photo2", "url": "https://example.com/photo2.png"},
        ],
    }

    response = await set_main_photos(payload, db=memory_session, current_user=user)
    assert response["main_photos"][0]["id"] == "photo1"

    result = await memory_session.execute(
        select(CharacterMainPhoto).where(CharacterMainPhoto.character_id == character.id)
    )
    rows = result.scalars().all()
    assert len(rows) == 2
    assert {row.photo_id for row in rows} == {"photo1", "photo2"}


