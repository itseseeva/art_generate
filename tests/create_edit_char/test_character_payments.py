import pytest
from fastapi import HTTPException

from app.chat_bot.api.character_endpoints import (
    charge_for_character_creation,
    charge_for_photo_generation,
    CHARACTER_CREATION_COST,
    PHOTO_GENERATION_COST,
)


class DummySession:
    def __init__(self):
        self.flushed = False

    async def flush(self):
        self.flushed = True


@pytest.mark.asyncio
async def test_charge_for_character_creation_success(monkeypatch):
    calls = {"afford": [], "credits": [], "coins": []}

    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            calls["afford"].append((user_id, amount))
            return True

        async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            calls["coins"].append((user_id, amount, commit))
            return True

        async def add_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

        async def can_user_use_credits_amount(self, user_id: int, amount: int) -> bool:
            calls["credits"].append((user_id, amount, "can"))
            return True

        async def use_credits_amount(self, user_id: int, amount: int, commit: bool = True) -> bool:
            calls["credits"].append((user_id, amount, commit))
            return True

    dummy_session = DummySession()
    monkeypatch.setattr("app.chat_bot.api.character_endpoints.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.chat_bot.api.character_endpoints.ProfitActivateService", DummyProfitService)

    await charge_for_character_creation(7, dummy_session)

    assert calls["afford"] == [(7, CHARACTER_CREATION_COST)]
    assert calls["coins"] == [(7, CHARACTER_CREATION_COST, False)]
    assert calls["credits"] == [(7, CHARACTER_CREATION_COST, "can"), (7, CHARACTER_CREATION_COST, False)]
    assert dummy_session.flushed is True


@pytest.mark.asyncio
async def test_charge_for_character_creation_not_enough_coins(monkeypatch):
    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            return False

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

    monkeypatch.setattr("app.chat_bot.api.character_endpoints.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.chat_bot.api.character_endpoints.ProfitActivateService", DummyProfitService)

    with pytest.raises(HTTPException) as exc_info:
        await charge_for_character_creation(3, DummySession())

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_charge_for_character_creation_subscription_failure(monkeypatch):
    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            return True

        async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

        async def can_user_use_credits_amount(self, user_id: int, amount: int) -> bool:
            return True

        async def use_credits_amount(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return False

    monkeypatch.setattr("app.chat_bot.api.character_endpoints.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.chat_bot.api.character_endpoints.ProfitActivateService", DummyProfitService)

    with pytest.raises(HTTPException) as exc_info:
        await charge_for_character_creation(11, DummySession())

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_charge_for_photo_generation_success(monkeypatch):
    calls = {"afford": [], "photo": []}

    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            calls["afford"].append(amount)
            return True

        async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

        async def add_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

        async def can_user_generate_photo(self, user_id: int) -> bool:
            return True

        async def use_photo_generation(self, user_id: int, commit: bool = True) -> bool:
            calls["photo"].append(commit)
            return True

        async def get_user_subscription(self, user_id: int):
            return None

    monkeypatch.setattr("app.chat_bot.api.character_endpoints.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.chat_bot.api.character_endpoints.ProfitActivateService", DummyProfitService)

    dummy_session = DummySession()
    await charge_for_photo_generation(9, dummy_session)

    assert calls["afford"] == [PHOTO_GENERATION_COST]
    # use_photo_generation вызывается только для FREE подписки, а мок возвращает None
    # Поэтому calls["photo"] будет пустым для STANDARD/PREMIUM
    assert calls["photo"] == []
    assert dummy_session.flushed is True

