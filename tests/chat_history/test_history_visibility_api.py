"""
Integration-style API test that verifies chat history visibility on /messages.

The test is skipped by default. To run it locally:

    RUN_HISTORY_E2E=1 pytest tests/chat_history/test_history_visibility_api.py

It requires a running backend (default http://localhost:8000) and valid user
credentials. You can override defaults via environment variables:

    HISTORY_BASE_URL - API root (default http://localhost:8000)
    HISTORY_EMAIL    - login email
    HISTORY_PASSWORD - login password
    HISTORY_CHARACTER - character name to talk to (default "save")
"""

from __future__ import annotations

import os
import time
from typing import Dict, Any

import pytest
import requests


BASE_URL = os.getenv("HISTORY_BASE_URL", "http://localhost:8000").rstrip("/")
LOGIN_URL = f"{BASE_URL}/api/v1/auth/login/"
PROFILE_URL = f"{BASE_URL}/api/v1/auth/me/"
CHAT_URL = f"{BASE_URL}/chat"
HISTORY_URL = f"{BASE_URL}/api/v1/chat-history/characters"

EMAIL = os.getenv("HISTORY_EMAIL", "ukratitelkisok9913@inbox.ru")
PASSWORD = os.getenv("HISTORY_PASSWORD", "Kohkau11999")
CHARACTER = os.getenv("HISTORY_CHARACTER", "save")


RUN_E2E = os.getenv("RUN_HISTORY_E2E") == "1"


def _pretty(response: requests.Response) -> str:
    """Formats response for easier debugging."""
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    return f"{response.status_code} {response.url}\n{payload}"


@pytest.mark.skipif(not RUN_E2E, reason="Set RUN_HISTORY_E2E=1 to run live API test")
def test_chat_history_visible_for_any_character() -> None:
    session = requests.Session()

    print(f"[LOGIN] POST {LOGIN_URL}")
    login_payload: Dict[str, Any] = {
        "email": EMAIL,
        "password": PASSWORD,
    }
    login_resp = session.post(LOGIN_URL, json=login_payload, timeout=30)
    assert (
        login_resp.status_code == 200
    ), f"Failed to login: {_pretty(login_resp)}"
    tokens = login_resp.json()
    access_token = tokens.get("access_token")
    assert access_token, f"No access_token in response: {tokens}"

    headers = {"Authorization": f"Bearer {access_token}"}

    print(f"[PROFILE] GET {PROFILE_URL}")
    profile_resp = session.get(PROFILE_URL, headers=headers, timeout=30)
    assert (
        profile_resp.status_code == 200
    ), f"Failed to fetch profile: {_pretty(profile_resp)}"
    profile = profile_resp.json()
    user_id = profile.get("id")
    assert user_id, f"No user id in profile response: {profile}"

    message_text = f"[pytest-history-check] time={int(time.time())}"
    chat_payload = {
        "message": message_text,
        "character": CHARACTER,
        "user_id": user_id,
        "generate_image": False,
    }

    print(f"[CHAT] POST {CHAT_URL} -> character={CHARACTER}")
    chat_resp = session.post(CHAT_URL, json=chat_payload, headers=headers, timeout=120)
    assert (
        chat_resp.status_code == 200
    ), f"Chat request failed: {_pretty(chat_resp)}"
    chat_json = chat_resp.json()
    assert (
        "response" in chat_json
    ), f"Chat response lacks 'response' field: {chat_json}"

    # Даем серверу время записать историю
    time.sleep(1)

    print(f"[HISTORY] GET {HISTORY_URL}")
    history_resp = session.get(HISTORY_URL, headers=headers, timeout=30)
    assert (
        history_resp.status_code == 200
    ), f"History endpoint failed: {_pretty(history_resp)}"
    history_json = history_resp.json()
    assert history_json.get("success") is True, f"History result: {history_json}"

    names = [entry.get("name") for entry in history_json.get("characters", [])]
    print(f"[HISTORY] characters={names}")

    assert CHARACTER in names, (
        f"Character '{CHARACTER}' not found in history list. "
        f"Characters returned: {names}"
    )

