"""
Тесты для страницы истории чата:
1. Проверка загрузки фото персонажей
2. Проверка удаления персонажей после очистки истории
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from app.main import app
from app.models.user import Users
from app.chat_bot.models.models import CharacterDB, ChatSession, ChatMessageDB
from app.models.chat_history import ChatHistory
from app.auth.dependencies import create_jwt_token
import json


@pytest.fixture
async def test_user(memory_session: AsyncSession):
    """Создает тестового пользователя с подпиской."""
    from app.models.user import Users
    from app.models.subscription import UserSubscription, SubscriptionType
    from sqlalchemy import select
    from datetime import datetime, timedelta
    
    # Проверяем, существует ли пользователь
    result = await memory_session.execute(
        select(Users).where(Users.email == "test_history@example.com")
    )
    user = result.scalars().first()
    
    if not user:
        user = Users(
            email="test_history@example.com",
            username="test_history_user",
            password_hash="hashed_password",
            coins=100,
            is_active=True,
            is_verified=True
        )
        memory_session.add(user)
        await memory_session.commit()
        await memory_session.refresh(user)
    
        # Создаем подписку для пользователя (нужна для работы с историей)
        subscription = UserSubscription(
            user_id=user.id,
            subscription_type=SubscriptionType.STANDARD,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        memory_session.add(subscription)
        await memory_session.commit()

    return user


@pytest.fixture
async def test_character(memory_session: AsyncSession, test_user: Users):
    """Создает тестового персонажа с фото."""
    from sqlalchemy import select
    
    # Проверяем, существует ли персонаж
    result = await memory_session.execute(
        select(CharacterDB).where(CharacterDB.name == "test_history_character")
    )
    character = result.scalars().first()
    
    if not character:
        character = CharacterDB(
            name="test_history_character",
            display_name="Test History Character",
            prompt="Test prompt",
            description="Test description",
            main_photos=json.dumps([
                {"id": "photo1", "url": "/static/photos/test_history_character/photo1.png"},
                {"id": "photo2", "url": "/static/photos/test_history_character/photo2.png"}
            ]),
            user_id=test_user.id
        )
        memory_session.add(character)
        await memory_session.commit()
        await memory_session.refresh(character)
    
    return character


@pytest.fixture
async def test_chat_history(
    memory_session: AsyncSession,
    test_user: Users,
    test_character: CharacterDB
):
    """Создает тестовую историю чата."""
    from datetime import datetime
    
    # Создаем сессию чата
    session = ChatSession(
        user_id=str(test_user.id),
        character_id=test_character.id
    )
    memory_session.add(session)
    await memory_session.commit()
    await memory_session.refresh(session)
    
    # Создаем сообщения
    message1 = ChatMessageDB(
        session_id=session.id,
        role="user",
        content="Test message 1",
        timestamp=datetime.utcnow()
    )
    message2 = ChatMessageDB(
        session_id=session.id,
        role="assistant",
        content="Test response 1",
        timestamp=datetime.utcnow()
    )
    memory_session.add(message1)
    memory_session.add(message2)
    await memory_session.commit()
    
    # Создаем запись в ChatHistory (старая система)
    history_entry = ChatHistory(
        user_id=test_user.id,
        character_name=test_character.name,
        session_id="default",
        message_type="user",
        message_content="Test message 1",
        image_url=None
    )
    memory_session.add(history_entry)
    await memory_session.commit()
    
    return {
        "session": session,
        "messages": [message1, message2],
        "history_entry": history_entry
    }


@pytest_asyncio.fixture
async def test_client_with_db(memory_session: AsyncSession):
    """Создает TestClient с мокированным get_db."""
    async def override_get_db():
        yield memory_session

    from app.database import db_depends
    app.dependency_overrides[db_depends.get_db] = override_get_db

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_characters_with_history_returns_character_with_photos(
    test_user: Users,
    test_character: CharacterDB,
    test_chat_history: dict,
    test_client_with_db: TestClient
):
    """Тест: GET /api/v1/chat-history/characters возвращает персонажа с историей."""
    # Создаем токен напрямую для теста
    token = create_jwt_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    # Запрашиваем список персонажей с историей
    response = test_client_with_db.get(
        "/api/v1/chat-history/characters",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "characters" in data
    
    characters = data["characters"]
    assert len(characters) > 0
    
    # Проверяем, что наш персонаж в списке
    character_names = [char["name"] for char in characters]
    assert test_character.name in character_names or test_character.display_name in character_names
    
    # Проверяем, что у персонажа есть last_message_at
    our_character = next(
        (char for char in characters if char["name"] == test_character.name or char["name"] == test_character.display_name),
        None
    )
    assert our_character is not None
    assert "last_message_at" in our_character


@pytest.mark.asyncio
async def test_clear_chat_history_removes_character_from_list(
    test_user: Users,
    test_character: CharacterDB,
    test_chat_history: dict,
    test_client_with_db: TestClient
):
    """Тест: Очистка истории чата удаляет персонажа из списка."""
    # Создаем токен напрямую для теста
    token = create_jwt_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    # Получаем список персонажей до очистки
    response_before = test_client_with_db.get(
        "/api/v1/chat-history/characters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_before.status_code == 200
    characters_before = response_before.json()["characters"]
    character_names_before = [char["name"] for char in characters_before]
    assert test_character.name in character_names_before or test_character.display_name in character_names_before
    
    # Очищаем историю
    clear_response = test_client_with_db.post(
        "/api/v1/chat-history/clear-history",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "character_name": test_character.name,
            "session_id": "default"
        }
    )
    assert clear_response.status_code == 200
    
    # Получаем список персонажей после очистки
    response_after = test_client_with_db.get(
        "/api/v1/chat-history/characters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_after.status_code == 200
    characters_after = response_after.json()["characters"]
    character_names_after = [char["name"] for char in characters_after]
    
    # Персонаж должен исчезнуть из списка
    assert test_character.name not in character_names_after
    assert test_character.display_name not in character_names_after


@pytest.mark.asyncio
async def test_character_photos_loaded_correctly(
    test_user: Users,
    test_character: CharacterDB,
    test_client_with_db: TestClient
):
    """Тест: Фото персонажа загружаются правильно."""
    # Создаем токен напрямую для теста
    token = create_jwt_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    # Запрашиваем информацию о персонаже
    response = test_client_with_db.get(
        f"/api/v1/characters/{test_character.name}/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Если endpoint не существует, проверяем через общий список
    if response.status_code == 404:
        response = test_client_with_db.get(
            "/api/v1/characters/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        characters = response.json()
        assert isinstance(characters, list)
        
        our_character = next(
            (char for char in characters if char.get("name") == test_character.name),
            None
        )
        assert our_character is not None
        assert "main_photos" in our_character or "photos" in our_character
    else:
        assert response.status_code == 200
        character_data = response.json()
        assert "main_photos" in character_data or "photos" in character_data


@pytest.mark.asyncio
async def test_history_page_character_matching_by_name_and_display_name(
    test_user: Users,
    test_character: CharacterDB,
    test_chat_history: dict,
    test_client_with_db: TestClient
):
    """Тест: Персонажи сопоставляются по name и display_name."""
    # Создаем токен напрямую для теста
    token = create_jwt_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=30)
    )
    
    # Получаем список персонажей с историей
    response = test_client_with_db.get(
        "/api/v1/chat-history/characters",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    characters = response.json()["characters"]
    
    # Проверяем, что персонаж найден по name или display_name
    found_by_name = any(char["name"] == test_character.name for char in characters)
    found_by_display_name = any(char["name"] == test_character.display_name for char in characters)
    
    assert found_by_name or found_by_display_name, f"Персонаж не найден. name={test_character.name}, display_name={test_character.display_name}, characters={[c['name'] for c in characters]}"

