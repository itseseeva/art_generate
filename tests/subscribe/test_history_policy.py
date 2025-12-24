import pytest
from typing import Any, Dict, Optional

from app.main import process_chat_history_storage


@pytest.mark.asyncio
async def test_history_saved_for_standard(monkeypatch):
    calls = []

    async def fake_write(
        *,
        user_id: Optional[str],
        character_data: Optional[Dict[str, Any]],
        message: str,
        response: str,
        image_url: Optional[str],
        image_filename: Optional[str],
        generation_time: Optional[float] = None
    ) -> None:
        calls.append(
            {
                "user_id": user_id,
                "character_data": character_data,
                "message": message,
                "response": response,
                "image_url": image_url,
                "image_filename": image_filename,
            }
        )

    monkeypatch.setattr("app.main._write_chat_history", fake_write)

    await process_chat_history_storage(
        subscription_type="standard",
        user_id="42",
        character_data={"id": 1, "name": "Anna"},
        message="Hello",
        response="Hi",
        image_url=None,
        image_filename=None,
    )

    assert len(calls) == 1, "История должна сохраняться для подписки Standard"


@pytest.mark.asyncio
async def test_history_saved_for_premium(monkeypatch):
    calls = []

    async def fake_write(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr("app.main._write_chat_history", fake_write)

    await process_chat_history_storage(
        subscription_type="premium",
        user_id="77",
        character_data={"id": 2, "name": "Kate"},
        message="Hello",
        response="Hi",
        image_url="http://example.com/image.png",
        image_filename="image.png",
    )

    assert len(calls) == 1, (
        "Для Premium должна вызываться функция сохранения истории один раз"
    )


@pytest.mark.asyncio
async def test_history_not_saved_for_free(monkeypatch):
    async def fake_write(**kwargs):
        raise AssertionError("_write_chat_history не должно вызываться для подписки Free")

    monkeypatch.setattr("app.main._write_chat_history", fake_write)

    await process_chat_history_storage(
        subscription_type="free",
        user_id="15",
        character_data={"id": 3, "name": "Free"},
        message="Hello",
        response="Hi",
        image_url=None,
        image_filename=None,
    )

