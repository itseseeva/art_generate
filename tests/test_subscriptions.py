"""
Тесты для системы подписок.
Проверяет покупку подписок, лимиты, привилегии и накопление лимитов.
"""
import pytest
from datetime import datetime, timedelta
from freezegun import freeze_time
from sqlalchemy import select
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus


# ============================================================================
# Тесты покупки подписок
# ============================================================================

@pytest.mark.integration
@pytest.mark.db
@pytest.mark.asyncio
async def test_purchase_standard_subscription(db_session, test_user_free):
    """Тест покупки STANDARD подписки."""
    # Получаем текущую подписку пользователя
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_free.id)
    )
    subscription = result.scalar_one()
    
    # Проверяем что изначально FREE
    assert subscription.subscription_type == SubscriptionType.FREE
    
    # Обновляем на STANDARD
    subscription.subscription_type = SubscriptionType.STANDARD
    subscription.monthly_messages = 0  # Безлимитные сообщения
    subscription.images_limit = 50
    subscription.voice_limit = 30
    subscription.expires_at = datetime.utcnow() + timedelta(days=30)
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Проверяем что обновилось
    assert subscription.subscription_type == SubscriptionType.STANDARD
    assert subscription.monthly_messages == 0
    assert subscription.images_limit == 50
    assert subscription.voice_limit == 30
    assert subscription.is_active


@pytest.mark.integration
@pytest.mark.db
@pytest.mark.asyncio
async def test_purchase_premium_subscription(db_session, test_user_free):
    """Тест покупки PREMIUM подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_free.id)
    )
    subscription = result.scalar_one()
    
    # Обновляем на PREMIUM
    subscription.subscription_type = SubscriptionType.PREMIUM
    subscription.monthly_messages = 0  # Безлимитные сообщения
    subscription.images_limit = 200
    subscription.voice_limit = 100
    subscription.expires_at = datetime.utcnow() + timedelta(days=30)
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    assert subscription.subscription_type == SubscriptionType.PREMIUM
    assert subscription.monthly_messages == 0
    assert subscription.images_limit == 200
    assert subscription.voice_limit == 100


# ============================================================================
# Тесты привилегий подписок
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_free_subscription_privileges(db_session, test_user_free):
    """Тест всех привилегий FREE подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_free.id)
    )
    subscription = result.scalar_one()
    
    # FREE подписка имеет лимиты
    assert subscription.monthly_messages == 10  # Лимит сообщений
    assert subscription.images_limit == 5  # Лимит изображений
    assert subscription.voice_limit == 0  # Нет голоса
    
    # Проверяем что можем отправить сообщение
    assert subscription.can_send_message(50) is True
    
    # Проверяем что можем сгенерировать фото
    assert subscription.can_generate_photo() is True
    
    # Проверяем что НЕ можем использовать голос
    assert subscription.can_use_voice(1) is False


@pytest.mark.unit
@pytest.mark.asyncio
async def test_standard_subscription_privileges(db_session, test_user_standard):
    """Тест всех привилегий STANDARD подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    # STANDARD подписка
    assert subscription.monthly_messages == 0  # Безлимитные сообщения
    assert subscription.images_limit == 50
    assert subscription.voice_limit == 30
    
    # Проверяем безлимитные сообщения
    assert subscription.messages_remaining == -1  # -1 означает безлимит
    assert subscription.can_send_message(100) is True
    
    # Проверяем лимиты изображений
    assert subscription.images_remaining == 50
    assert subscription.can_generate_photo() is True
    
    # Проверяем лимиты голоса
    assert subscription.voice_remaining == 30
    assert subscription.can_use_voice(5) is True


@pytest.mark.unit
@pytest.mark.asyncio
async def test_premium_subscription_privileges(db_session, test_user_premium):
    """Тест всех привилегий PREMIUM подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_premium.id)
    )
    subscription = result.scalar_one()
    
    # PREMIUM подписка
    assert subscription.monthly_messages == 0  # Безлимитные сообщения
    assert subscription.images_limit == 200
    assert subscription.voice_limit == 100
    
    # Проверяем безлимитные сообщения
    assert subscription.messages_remaining == -1
    assert subscription.can_send_message(100) is True
    
    # Проверяем увеличенные лимиты изображений
    assert subscription.images_remaining == 200
    assert subscription.can_generate_photo() is True
    
    # Проверяем увеличенные лимиты голоса
    assert subscription.voice_remaining == 100
    assert subscription.can_use_voice(50) is True


# ============================================================================
# Тесты лимитов сообщений
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_message_limits_free_tier(db_session, test_user_free):
    """Проверка лимитов сообщений для FREE подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_free.id)
    )
    subscription = result.scalar_one()
    
    # Изначально 10 сообщений доступно
    assert subscription.messages_remaining == 10
    
    # Отправляем 10 сообщений
    for i in range(10):
        assert subscription.can_send_message(50) is True
        subscription.used_messages += 1
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Лимит исчерпан
    assert subscription.messages_remaining == 0
    assert subscription.can_send_message(50) is False


@pytest.mark.unit
@pytest.mark.asyncio
async def test_message_limits_standard_tier(db_session, test_user_standard):
    """Безлимитные сообщения для STANDARD подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    # Безлимитные сообщения
    assert subscription.monthly_messages == 0
    assert subscription.messages_remaining == -1
    
    # Можем отправить сколько угодно
    for i in range(1000):
        assert subscription.can_send_message(100) is True
        subscription.used_messages += 1
    
    # Все еще можем отправлять
    assert subscription.can_send_message(100) is True


# ============================================================================
# Тесты накопления лимитов
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_subscription_limits_accumulation(db_session, test_user_standard):
    """
    Тест накопления лимитов при повторной покупке подписки.
    КРИТИЧЕСКИ ВАЖНО: остатки лимитов должны суммироваться!
    """
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    # Используем часть лимитов
    subscription.images_used = 20  # Использовано 20 из 50
    subscription.voice_used = 10   # Использовано 10 из 30
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Остатки
    assert subscription.images_remaining == 30  # 50 - 20
    assert subscription.voice_remaining == 20   # 30 - 10
    
    # Повторная покупка STANDARD подписки
    # ВАЖНО: остатки должны сохраниться и добавиться к новым лимитам
    old_images_remaining = subscription.images_remaining
    old_voice_remaining = subscription.voice_remaining
    
    # Добавляем новые лимиты (как при покупке)
    subscription.images_limit += 50  # Добавляем еще 50
    subscription.voice_limit += 30   # Добавляем еще 30
    subscription.expires_at = datetime.utcnow() + timedelta(days=60)  # Продлеваем на 2 месяца
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Проверяем что лимиты накопились
    assert subscription.images_limit == 100  # 50 + 50
    assert subscription.voice_limit == 60    # 30 + 30
    
    # Проверяем что остатки сохранились
    assert subscription.images_remaining == old_images_remaining + 50  # 30 + 50 = 80
    assert subscription.voice_remaining == old_voice_remaining + 30    # 20 + 30 = 50


# ============================================================================
# Тесты истечения подписки
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_subscription_expiration(db_session, test_user_standard):
    """Тест истечения подписки."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    # Подписка активна
    assert subscription.is_active is True
    
    # Явно устанавливаем дату истечения в далёкое прошлое (2000 год)
    # Это гарантирует, что подписка истекла, независимо от часовых поясов и миллисекунд
    subscription.expires_at = datetime(2000, 1, 1)
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Проверяем что подписка истекла
    # Если это падает, значит is_active багнут или время на сервере < 2000 года
    if subscription.is_active:
        print(f"DEBUG FAILURE: expires_at={subscription.expires_at}, now={datetime.utcnow()}")
        
    assert subscription.is_active is False
    assert subscription.days_until_expiry == 0


# ============================================================================
# Тесты сброса лимитов
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_monthly_limits_reset(db_session, test_user_free):
    """Тест сброса месячных лимитов."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_free.id)
    )
    subscription = result.scalar_one()
    
    # Используем все лимиты
    subscription.used_messages = 10
    subscription.images_used = 5
    subscription.voice_used = 0
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Проверяем что лимиты исчерпаны
    assert subscription.messages_remaining == 0
    assert subscription.images_remaining == 0
    
    # Сбрасываем лимиты
    subscription.reset_monthly_limits()
    
    await db_session.commit()
    await db_session.refresh(subscription)
    

    # Проверяем что лимиты восстановились
    assert subscription.used_messages == 0
    assert subscription.images_used == 0
    assert subscription.messages_remaining == 10
    assert subscription.images_remaining == 5


@pytest.mark.unit
@pytest.mark.asyncio
async def test_paid_limits_no_reset(db_session, test_user_standard):
    """
    Тест того, что лимиты платных подписок НЕ сбрасываются reset_monthly_limits.
    Для STANDARD/PREMIUM лимиты накапливаются, а не сбрасываются.
    """
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    # Устанавливаем использование
    subscription.images_used = 10
    subscription.voice_used = 5
    
    await db_session.commit()
    
    # Вызываем сброс (который не должен сработать для STANDARD)
    subscription.reset_monthly_limits()
    
    await db_session.commit()
    await db_session.refresh(subscription)
    
    # Проверяем, что использование НЕ сбросилось
    assert subscription.images_used == 10
    assert subscription.voice_used == 5
    # Проверяем что остаток корректен (50 - 10 = 40)
    assert subscription.images_remaining == 40


# ============================================================================
# Тесты использования лимитов
# ============================================================================

@pytest.mark.unit
@pytest.mark.asyncio
async def test_use_photo_generation(db_session, test_user_standard):
    """Тест использования лимита генерации фото."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_standard.id)
    )
    subscription = result.scalar_one()
    
    initial_remaining = subscription.images_remaining
    
    # Используем одну генерацию
    success = subscription.use_photo_generation()
    
    assert success is True
    assert subscription.images_used == 1
    assert subscription.images_remaining == initial_remaining - 1


@pytest.mark.unit
@pytest.mark.asyncio
async def test_use_voice(db_session, test_user_premium):
    """Тест использования лимита голоса."""
    result = await db_session.execute(
        select(UserSubscription).where(UserSubscription.user_id == test_user_premium.id)
    )
    subscription = result.scalar_one()
    
    initial_remaining = subscription.voice_remaining
    
    # Используем 10 единиц голоса
    success = subscription.use_voice(10)
    
    assert success is True
    assert subscription.voice_used == 10
    assert subscription.voice_remaining == initial_remaining - 10
