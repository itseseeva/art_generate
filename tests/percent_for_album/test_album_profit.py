"""
Тесты для проверки начисления 15% создателю персонажа при покупке платного альбома.
"""
from typing import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from fastapi import HTTPException

from app.database.db import Base
from app.models.user import Users
from app.chat_bot.models.models import CharacterDB, PaidAlbumUnlock
from app.routers.gallery import (
    unlock_paid_gallery,
    PaidAlbumUnlockRequest,
    PAID_ALBUM_COST,
    _get_character_by_slug,
)
from app.services.coins_service import CoinsService


CREATOR_PROFIT_PERCENT = 0.15
CREATOR_PROFIT = int(PAID_ALBUM_COST * CREATOR_PROFIT_PERCENT)  # 15% от 300 = 45 кредитов


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


@pytest_asyncio.fixture
async def creator_user(memory_session: AsyncSession) -> Users:
    """Создает пользователя-создателя персонажа."""
    creator = Users(
        email="creator@example.com",
        password_hash="hash",
        coins=100,
        is_active=True,
    )
    memory_session.add(creator)
    await memory_session.commit()
    await memory_session.refresh(creator)
    return creator


@pytest_asyncio.fixture
async def buyer_user(memory_session: AsyncSession) -> Users:
    """Создает пользователя-покупателя альбома."""
    buyer = Users(
        email="buyer@example.com",
        password_hash="hash",
        coins=500,
        is_active=True,
    )
    memory_session.add(buyer)
    await memory_session.commit()
    await memory_session.refresh(buyer)
    return buyer


@pytest_asyncio.fixture
async def character_with_creator(
    memory_session: AsyncSession, creator_user: Users
) -> CharacterDB:
    """Создает персонажа с создателем."""
    character = CharacterDB(
        name="Test Character",
        prompt="Test prompt",
        character_appearance="appearance",
        user_id=creator_user.id,
    )
    memory_session.add(character)
    await memory_session.commit()
    await memory_session.refresh(character)
    return character


@pytest_asyncio.fixture
async def character_without_creator(memory_session: AsyncSession) -> CharacterDB:
    """Создает персонажа без создателя (системный персонаж)."""
    character = CharacterDB(
        name="System Character",
        prompt="Test prompt",
        character_appearance="appearance",
        user_id=None,
    )
    memory_session.add(character)
    await memory_session.commit()
    await memory_session.refresh(character)
    return character


@pytest.mark.asyncio
async def test_creator_receives_15_percent_on_album_purchase(
    memory_session: AsyncSession,
    creator_user: Users,
    buyer_user: Users,
    character_with_creator: CharacterDB,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Тест: При покупке платного альбома создателю персонажа начисляется 15% от стоимости.
    """
    initial_creator_coins = creator_user.coins
    initial_buyer_coins = buyer_user.coins

    # Мокаем emit_profile_update чтобы избежать ошибок
    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    # Выполняем разблокировку альбома
    request = PaidAlbumUnlockRequest(character_name=character_with_creator.name)

    response = await unlock_paid_gallery(
        payload=request,
        db=memory_session,
        current_user=buyer_user,
    )

    # Проверяем, что альбом разблокирован
    assert response.unlocked is True
    assert response.character == character_with_creator.name

    # Проверяем, что у покупателя списались кредиты
    await memory_session.refresh(buyer_user)
    assert buyer_user.coins == initial_buyer_coins - PAID_ALBUM_COST

    # Проверяем, что создателю начислились 15% (30 кредитов)
    await memory_session.refresh(creator_user)
    assert creator_user.coins == initial_creator_coins + CREATOR_PROFIT


@pytest.mark.asyncio
async def test_no_profit_for_system_character(
    memory_session: AsyncSession,
    buyer_user: Users,
    character_without_creator: CharacterDB,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Тест: При покупке альбома системного персонажа (без создателя) никто не получает процент.
    """
    initial_buyer_coins = buyer_user.coins

    # Мокаем emit_profile_update
    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    request = PaidAlbumUnlockRequest(character_name=character_without_creator.name)

    response = await unlock_paid_gallery(
        payload=request,
        db=memory_session,
        current_user=buyer_user,
    )

    # Проверяем, что альбом разблокирован
    assert response.unlocked is True

    # Проверяем, что у покупателя списались кредиты
    await memory_session.refresh(buyer_user)
    assert buyer_user.coins == initial_buyer_coins - PAID_ALBUM_COST

    # Проверяем, что никто не получил процент (нет создателя)


@pytest.mark.asyncio
async def test_owner_does_not_pay_and_no_profit_on_own_album(
    memory_session: AsyncSession,
    creator_user: Users,
    character_with_creator: CharacterDB,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Тест: Владелец альбома не платит за разблокировку и не получает процент от собственной покупки.
    """
    initial_creator_coins = creator_user.coins

    # Мокаем emit_profile_update
    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    request = PaidAlbumUnlockRequest(character_name=character_with_creator.name)

    response = await unlock_paid_gallery(
        payload=request,
        db=memory_session,
        current_user=creator_user,  # Владелец разблокирует свой альбом
    )

    # Проверяем, что альбом разблокирован
    assert response.unlocked is True

    # Проверяем, что у владельца не списались кредиты
    await memory_session.refresh(creator_user)
    assert creator_user.coins == initial_creator_coins  # Кредиты не изменились


@pytest.mark.asyncio
async def test_multiple_purchases_accumulate_profit(
    memory_session: AsyncSession,
    creator_user: Users,
    buyer_user: Users,
    character_with_creator: CharacterDB,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Тест: При нескольких покупках альбома создателю начисляется процент от каждой покупки.
    """
    initial_creator_coins = creator_user.coins
    initial_buyer_coins = buyer_user.coins

    # Мокаем emit_profile_update
    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    # Первая покупка
    request1 = PaidAlbumUnlockRequest(character_name=character_with_creator.name)
    response1 = await unlock_paid_gallery(
        payload=request1,
        db=memory_session,
        current_user=buyer_user,
    )
    assert response1.unlocked is True

    # Создаем второго покупателя
    buyer2 = Users(
        email="buyer2@example.com",
        password_hash="hash",
        coins=500,
        is_active=True,
    )
    memory_session.add(buyer2)
    await memory_session.commit()
    await memory_session.refresh(buyer2)

    # Вторая покупка (другой пользователь)
    request2 = PaidAlbumUnlockRequest(character_name=character_with_creator.name)
    response2 = await unlock_paid_gallery(
        payload=request2,
        db=memory_session,
        current_user=buyer2,
    )
    assert response2.unlocked is True

    # Проверяем, что создателю начислились проценты от обеих покупок
    await memory_session.refresh(creator_user)
    expected_profit = CREATOR_PROFIT * 2  # 30 * 2 = 60 кредитов
    assert creator_user.coins == initial_creator_coins + expected_profit


@pytest.mark.asyncio
async def test_profit_calculation_is_15_percent(
    memory_session: AsyncSession,
    creator_user: Users,
    buyer_user: Users,
    character_with_creator: CharacterDB,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Тест: Проверяем точность расчета 15% от стоимости альбома (300 кредитов = 45 кредитов).
    """
    initial_creator_coins = creator_user.coins

    # Мокаем emit_profile_update
    async def dummy_emit_profile_update(user_id: int, db: AsyncSession) -> None:
        return None

    monkeypatch.setattr(
        "app.services.profit_activate.emit_profile_update",
        dummy_emit_profile_update,
    )

    request = PaidAlbumUnlockRequest(character_name=character_with_creator.name)

    response = await unlock_paid_gallery(
        payload=request,
        db=memory_session,
        current_user=buyer_user,
    )

    assert response.unlocked is True

    # Проверяем точный расчет: 15% от 300 = 45
    await memory_session.refresh(creator_user)
    assert creator_user.coins == initial_creator_coins + 45
    assert CREATOR_PROFIT == 45  # Дополнительная проверка константы


@pytest.mark.asyncio
async def test_profit_not_paid_if_insufficient_buyer_coins(
    memory_session: AsyncSession,
    creator_user: Users,
    character_with_creator: CharacterDB,
):
    """
    Тест: Если у покупателя недостаточно кредитов, создатель не получает процент.
    """
    # Создаем покупателя с недостаточным количеством кредитов
    poor_buyer = Users(
        email="poor@example.com",
        password_hash="hash",
        coins=100,  # Меньше чем PAID_ALBUM_COST (300)
        is_active=True,
    )
    memory_session.add(poor_buyer)
    await memory_session.commit()
    await memory_session.refresh(poor_buyer)

    initial_creator_coins = creator_user.coins
    initial_poor_buyer_coins = poor_buyer.coins

    request = PaidAlbumUnlockRequest(character_name=character_with_creator.name)
    
    # Ожидаем ошибку из-за недостатка кредитов
    with pytest.raises(HTTPException) as exc_info:
        await unlock_paid_gallery(
            payload=request,
            db=memory_session,
            current_user=poor_buyer,
        )
    
    assert exc_info.value.status_code == 400
    assert "Недостаточно кредитов" in exc_info.value.detail

    # Проверяем, что кредиты не изменились ни у кого
    await memory_session.refresh(creator_user)
    await memory_session.refresh(poor_buyer)
    assert creator_user.coins == initial_creator_coins
    assert poor_buyer.coins == initial_poor_buyer_coins

