from types import ModuleType, SimpleNamespace
from typing import Any, Iterable, List

import sys

import pytest
from fastapi import HTTPException

if "torch" not in sys.modules:
    torch_stub = ModuleType("torch")
    torch_stub.cuda = SimpleNamespace(is_available=lambda: False)
    sys.modules["torch"] = torch_stub
    sys.modules["torch.cuda"] = torch_stub.cuda  # type: ignore[attr-defined]

from app.main import spend_photo_resources  # type: ignore  # noqa: E402
from app.models.subscription import SubscriptionTypeDB, SubscriptionType  # noqa: E402
from app.services.subscription_service import _normalize_subscription_type  # noqa: E402
from app.services.coins_service import CoinsService  # noqa: E402
from app.auth.routers import tip_character_creator  # noqa: E402
from app.schemas.auth import TipCreatorRequest  # noqa: E402


class _DummySession:
    def __init__(self):
        self.flushed = False
        self.committed = False
        self.rolled_back = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def flush(self):
        self.flushed = True

    async def commit(self):
        self.committed = True

    async def rollback(self):
        self.rolled_back = True


@pytest.mark.asyncio
async def test_spend_photo_resources_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Проверяем успешное списание монет и лимитов при генерации фото."""
    calls = {"coins": [], "credits": [], "afford": [], "emit": []}

    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            calls["afford"].append((user_id, amount))
            return True

        async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            calls["coins"].append(user_id)
            return True

        async def get_user_coins(self, user_id: int) -> int:
            return 70

        async def add_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

        async def can_user_generate_photo(self, user_id: int) -> bool:
            return True

        async def use_photo_generation(self, user_id: int, commit: bool = True) -> bool:
            calls["credits"].append(user_id)
            return True

    async def dummy_emit(user_id, db):
        calls["emit"].append(user_id)

    monkeypatch.setattr("app.main.async_session_maker", lambda: _DummySession())
    monkeypatch.setattr("app.main.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.main.ProfitActivateService", DummyProfitService)
    monkeypatch.setattr("app.main.emit_profile_update", dummy_emit)

    await spend_photo_resources(10)

    assert calls["afford"] == [(10, 30)]
    assert calls["coins"] == [10]
    assert calls["credits"] == [10]
    assert calls["emit"] == [10]


@pytest.mark.asyncio
async def test_spend_photo_resources_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Убеждаемся, что при ошибке списания монет функция выбрасывает 403."""
    class DummyCoinsService:
        def __init__(self, db):
            self.db = db

        async def can_user_afford(self, user_id: int, amount: int) -> bool:
            return True

        async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return False

        async def get_user_coins(self, user_id: int) -> int:
            return 0

        async def add_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
            return True

    class DummyProfitService:
        def __init__(self, db):
            self.db = db

        async def can_user_generate_photo(self, user_id: int) -> bool:
            return True

        async def use_photo_generation(self, user_id: int, commit: bool = True) -> bool:
            return True

    monkeypatch.setattr("app.main.async_session_maker", lambda: _DummySession())
    monkeypatch.setattr("app.main.CoinsService", DummyCoinsService)
    monkeypatch.setattr("app.main.ProfitActivateService", DummyProfitService)
    monkeypatch.setattr("app.main.emit_profile_update", lambda *args, **kwargs: None)

    with pytest.raises(HTTPException) as exc_info:
        await spend_photo_resources(5)

    assert exc_info.value.status_code == 403


@pytest.mark.parametrize(
    "raw_value",
    [
        "base",
        "BASE",
        "Base",
        " free ",
        SubscriptionType.FREE,
    ],
)
def test_subscription_type_db_process_bind_param_free_alias(raw_value: Any) -> None:
    """Alias free/base должен сохраняться в базе как BASE (историческое значение enum)."""
    column = SubscriptionTypeDB()
    assert column.process_bind_param(raw_value, dialect=None) == "BASE"


@pytest.mark.parametrize(
    "raw_value, expected",
    [
        ("standard", "STANDARD"),
        ("PREMIUM", "PREMIUM"),
        (SubscriptionType.PREMIUM, "PREMIUM"),
        ("pro", "PRO"),
    ],
)
def test_subscription_type_db_process_bind_param_other_values(raw_value: Any, expected: str) -> None:
    """Другие тарифы должны конвертироваться в верхний регистр без изменений сути."""
    column = SubscriptionTypeDB()
    assert column.process_bind_param(raw_value, dialect=None) == expected


@pytest.mark.parametrize(
    "db_value",
    [
        "FREE",
        "free",
        "BASE",
        " base ",
    ],
)
def test_subscription_type_db_process_result_value_free_alias(db_value: str) -> None:
    """Чтение значений FREE/BASE из базы должно возвращать SubscriptionType.FREE."""
    column = SubscriptionTypeDB()
    assert column.process_result_value(db_value, dialect=None) == SubscriptionType.FREE


@pytest.mark.parametrize(
    "db_value, expected",
    [
        ("STANDARD", SubscriptionType.STANDARD),
        ("premium", SubscriptionType.PREMIUM),
        ("PRO", SubscriptionType.PRO),
    ],
)
def test_subscription_type_db_process_result_value_other(db_value: str, expected: SubscriptionType) -> None:
    """Остальные значения должны корректно мапиться на перечисление SubscriptionType."""
    column = SubscriptionTypeDB()
    assert column.process_result_value(db_value, dialect=None) == expected


@pytest.mark.parametrize(
    "raw_value, expected",
    [
        ("BASE", SubscriptionType.FREE),
        ("free", SubscriptionType.FREE),
        ("standard", SubscriptionType.STANDARD),
        (SubscriptionType.PREMIUM, SubscriptionType.PREMIUM),
    ],
)
def test_normalize_subscription_type_aliases(raw_value: Any, expected: SubscriptionType) -> None:
    """_normalize_subscription_type должен принимать алиас BASE и возвращать enum."""
    assert _normalize_subscription_type(raw_value) == expected


@pytest.mark.parametrize("invalid_value", ["unknown", "pro", 123, object()])
def test_normalize_subscription_type_invalid(invalid_value: Any) -> None:
    """Неподдерживаемые тарифы должны приводить к ValueError."""
    with pytest.raises(ValueError):
        _normalize_subscription_type(invalid_value)


@pytest.mark.asyncio
async def test_spend_coins_for_message_uses_expected_amount(monkeypatch: pytest.MonkeyPatch) -> None:
    """Метод spend_coins_for_message должен тратить ровно 2 монеты."""
    calls: List[tuple[int, int, bool]] = []

    async def fake_spend(self: CoinsService, user_id: int, amount: int, commit: bool = True) -> bool:  # type: ignore[override]
        calls.append((user_id, amount, commit))
        return True

    monkeypatch.setattr(CoinsService, "spend_coins", fake_spend)
    service = CoinsService(db=None)  # type: ignore[arg-type]

    result = await service.spend_coins_for_message(7)

    assert result is True
    assert calls == [(7, 2, True)]


@pytest.mark.asyncio
async def test_spend_coins_for_photo_uses_expected_amount(monkeypatch: pytest.MonkeyPatch) -> None:
    """Метод spend_coins_for_photo должен тратить 30 монет."""
    calls: List[tuple[int, int, bool]] = []

    async def fake_spend(self: CoinsService, user_id: int, amount: int, commit: bool = True) -> bool:  # type: ignore[override]
        calls.append((user_id, amount, commit))
        return True

    monkeypatch.setattr(CoinsService, "spend_coins", fake_spend)
    service = CoinsService(db=None)  # type: ignore[arg-type]

    result = await service.spend_coins_for_photo(9)

    assert result is True
    assert calls == [(9, 30, True)]


class _DummyExecuteResult:
    def __init__(self, value: Any):
        self._value = value

    def scalar_one_or_none(self) -> Any:
        return self._value
    
    def scalar_one(self) -> Any:
        """Возвращает значение, как scalar_one_or_none, но без проверки на None."""
        return self._value


class _DummyAsyncDB:
    def __init__(self, responses: Iterable[Any]):
        self._responses = list(responses)
        self.committed = False
        self.rolled_back = False
        self.refreshed: List[Any] = []
        self.added: List[Any] = []

    async def execute(self, *_args: Any, **_kwargs: Any) -> _DummyExecuteResult:
        value = self._responses.pop(0)
        return _DummyExecuteResult(value)

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True

    async def refresh(self, obj: Any) -> None:
        self.refreshed.append(obj)
    
    def add(self, obj: Any) -> None:
        """Добавляет объект в список добавленных (для TipMessage и других)."""
        self.added.append(obj)


@pytest.mark.asyncio
async def test_tip_character_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Донат успешен: списываем у отправителя, зачисляем создателю, коммитим."""
    sender = SimpleNamespace(id=1, coins=200, email="sender@test.dev", is_admin=False)
    creator = SimpleNamespace(id=2, coins=50, email="creator@test.dev")
    character = SimpleNamespace(id=100, name="hero", display_name="Hero", user_id=2)

    # После commit код делает два дополнительных execute для получения обновленных данных
    # Добавляем sender и creator в конец списка responses
    db = _DummyAsyncDB([character, creator, sender, creator])

    async def dummy_emit(user_id: int, _db: Any) -> None:
        pass

    monkeypatch.setattr("app.auth.routers.emit_profile_update", dummy_emit)

    request = TipCreatorRequest(amount=100, character_name="hero")
    response = await tip_character_creator(request, current_user=sender, db=db)  # type: ignore[arg-type]

    assert response.success is True
    assert sender.coins == 100
    assert creator.coins == 150
    assert db.committed is True
    assert db.rolled_back is False


@pytest.mark.asyncio
async def test_tip_character_prevents_self_tip(monkeypatch: pytest.MonkeyPatch) -> None:
    """Обычный пользователь не может задонатить своему персонажу."""
    sender = SimpleNamespace(id=5, coins=300, email="self@test.dev", is_admin=False)
    character = SimpleNamespace(name="selfy", display_name="Selfy", user_id=5)
    db = _DummyAsyncDB([character, sender])

    async def dummy_emit(user_id: int, _db: Any) -> None:
        pass

    monkeypatch.setattr("app.auth.routers.emit_profile_update", dummy_emit)

    request = TipCreatorRequest(amount=50, character_name="selfy")

    with pytest.raises(HTTPException) as exc_info:
        await tip_character_creator(request, current_user=sender, db=db)  # type: ignore[arg-type]

    assert exc_info.value.status_code == 400
    assert "не можете отправить кредиты своему персонажу" in exc_info.value.detail
    assert db.committed is False
    assert db.rolled_back is False  # Проверяем, что исключение поднято до commit


@pytest.mark.asyncio
async def test_tip_character_insufficient_funds() -> None:
    """Если монет меньше требуемой суммы, функция выбрасывает 400 и не трогает БД."""
    sender = SimpleNamespace(id=10, coins=10, email="poor@test.dev", is_admin=False)
    request = TipCreatorRequest(amount=20, character_name="hero")

    db = _DummyAsyncDB([])

    with pytest.raises(HTTPException) as exc_info:
        await tip_character_creator(request, current_user=sender, db=db)  # type: ignore[arg-type]

    assert exc_info.value.status_code == 400
    assert "Недостаточно кредитов" in exc_info.value.detail
    assert sender.coins == 10
    assert db.committed is False

