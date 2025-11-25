"""
Интеграционные тесты для задач генерации изображений (без моков).
"""
import pytest
import asyncio
from app.tasks.generation_tasks import (
    generate_image_task,
    save_chat_history_task,
    _spend_photo_resources,
    _save_prompt_to_history
)


@pytest.mark.asyncio
async def test_generate_image_task_structure(celery_app, generation_settings):
    """Тест структуры задачи генерации изображения."""
    # Проверяем, что задача зарегистрирована
    task = celery_app.tasks.get("app.tasks.generation_tasks.generate_image_task")
    assert task is not None
    
    # Проверяем параметры задачи
    assert task.max_retries == 3
    assert task.default_retry_delay == 60


@pytest.mark.asyncio
async def test_save_chat_history_task_structure(celery_app):
    """Тест структуры задачи сохранения истории."""
    task = celery_app.tasks.get("app.tasks.generation_tasks.save_chat_history_task")
    assert task is not None


@pytest.mark.asyncio
async def test_spend_photo_resources_function(test_user, test_db_session):
    """Тест функции списания ресурсов."""
    from app.services.coins_service import CoinsService
    from app.services.profit_activate import ProfitActivateService
    from app.models.subscription import UserSubscription
    from sqlalchemy import select
    from app.database import db
    from contextlib import asynccontextmanager
    
    user_id = test_user.id
    
    # Сохраняем оригинальный async_session_maker
    original_session_maker = db.async_session_maker
    
    # Создаем context manager, который возвращает тестовую сессию
    @asynccontextmanager
    async def test_session_maker():
        yield test_db_session
    
    # Временно заменяем async_session_maker на тестовую сессию
    db.async_session_maker = test_session_maker
    
    try:
        # Проверяем начальные значения
        coins_service = CoinsService(test_db_session)
        subscription_service = ProfitActivateService(test_db_session)
        
        initial_coins = await coins_service.get_user_coins(user_id)
        assert initial_coins is not None
        assert initial_coins >= 30  # Должно быть достаточно монет
        
        # Получаем подписку
        result = await test_db_session.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        subscription = result.scalar_one_or_none()
        assert subscription is not None
        initial_photos = subscription.photos_remaining
        
        # Выполняем функцию списания
        await _spend_photo_resources(user_id)
        
        # Обновляем объекты из БД
        await test_db_session.refresh(test_user)
        await test_db_session.refresh(subscription)
        
        # Проверяем, что монеты и лимит фото списались
        final_coins = await coins_service.get_user_coins(user_id)
        assert final_coins == initial_coins - 30
        
        # Проверяем подписку - используем first() чтобы избежать ошибки если несколько подписок
        result = await test_db_session.execute(
            select(UserSubscription).where(UserSubscription.user_id == user_id).order_by(UserSubscription.id.desc())
        )
        subscriptions = result.scalars().all()
        # Берем последнюю подписку (самую свежую)
        assert len(subscriptions) > 0, "Должна быть хотя бы одна подписка"
        subscription = subscriptions[0]
        
        # Обновляем подписку из БД
        await test_db_session.refresh(subscription)
        
        # Либо использовалась генерация фото, либо кредиты
        assert subscription.used_photos > 0 or subscription.used_credits >= 30, (
            f"Должны быть использованы фото ({subscription.used_photos}) или кредиты ({subscription.used_credits} >= 30)"
        )
    finally:
        # Восстанавливаем оригинальный async_session_maker
        db.async_session_maker = original_session_maker


@pytest.mark.asyncio
async def test_save_prompt_to_history_function(test_user, test_db_session):
    """Тест функции сохранения промпта."""
    from app.models.chat_history import ChatHistory
    from app.database import db
    from sqlalchemy import select
    from contextlib import asynccontextmanager
    
    user_id = test_user.id
    character_name = "anna"
    prompt = "test prompt for celery"
    image_url = "https://storage.yandexcloud.net/test_celery.png"
    
    # Сохраняем оригинальный async_session_maker
    original_session_maker = db.async_session_maker
    
    # Создаем context manager, который возвращает тестовую сессию
    @asynccontextmanager
    async def test_session_maker():
        yield test_db_session
    
    # Временно заменяем async_session_maker на тестовую сессию
    db.async_session_maker = test_session_maker
    
    try:
        # Выполняем функцию сохранения
        await _save_prompt_to_history(
            user_id=user_id,
            character_name=character_name,
            prompt=prompt,
            image_url=image_url
        )
        
        # Проверяем, что запись сохранилась в БД
        result = await test_db_session.execute(
            select(ChatHistory).where(
                ChatHistory.user_id == user_id,
                ChatHistory.image_url == image_url
            )
        )
        chat_message = result.scalar_one_or_none()
        
        assert chat_message is not None
        assert chat_message.user_id == user_id
        assert chat_message.character_name == character_name
        assert chat_message.message_content == prompt
        assert chat_message.image_url == image_url
        assert chat_message.session_id == "photo_generation"
        assert chat_message.message_type == "user"
        
        # Очистка - удаляем тестовую запись
        await test_db_session.delete(chat_message)
        await test_db_session.commit()
    finally:
        # Восстанавливаем оригинальный async_session_maker
        db.async_session_maker = original_session_maker


def test_generate_image_task_callable(celery_app, generation_settings):
    """Тест, что задача генерации может быть вызвана."""
    task = celery_app.tasks.get("app.tasks.generation_tasks.generate_image_task")
    
    # Проверяем, что задача callable
    assert callable(task)
    
    # Проверяем сигнатуру задачи
    import inspect
    sig = inspect.signature(task)
    assert "settings_dict" in sig.parameters
    assert "user_id" in sig.parameters
    assert "character_name" in sig.parameters


def test_save_chat_history_task_callable(celery_app):
    """Тест, что задача сохранения истории может быть вызвана."""
    task = celery_app.tasks.get("app.tasks.generation_tasks.save_chat_history_task")
    
    assert callable(task)
    
    import inspect
    sig = inspect.signature(task)
    assert "user_id" in sig.parameters
    assert "character_data" in sig.parameters
    assert "message" in sig.parameters
    assert "response" in sig.parameters

