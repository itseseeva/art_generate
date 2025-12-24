"""
Тесты для кэширования подписок с реальным Redis.
"""
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from app.services.subscription_service import SubscriptionService
from app.models.subscription import SubscriptionType, SubscriptionStatus
from app.utils.redis_cache import (
    cache_set, cache_get, key_subscription, key_subscription_stats,
    TTL_SUBSCRIPTION, TTL_SUBSCRIPTION_STATS
)


@pytest_asyncio.fixture
async def mock_db():
    """Создает мок базы данных."""
    db = AsyncMock()
    # Инициализируем моки для каждого теста заново
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.get = AsyncMock()
    db.flush = AsyncMock()
    return db


class MockSubscription:
    """Упрощенная модель подписки без SQLAlchemy."""

    def __init__(self, **data):
        self.id = data["id"]
        self.user_id = data["user_id"]
        self.subscription_type = SubscriptionType(data["subscription_type"])
        self.status = SubscriptionStatus(data["status"])
        self.monthly_credits = data["monthly_credits"]
        self.monthly_photos = data["monthly_photos"]
        self.max_message_length = data["max_message_length"]
        self.used_credits = data["used_credits"]
        self.used_photos = data["used_photos"]
        self.activated_at = self._to_datetime(data["activated_at"])
        self.expires_at = self._to_datetime(data["expires_at"])
        self.last_reset_at = self._to_datetime(data["last_reset_at"])

    @property
    def credits_remaining(self):
        return self.monthly_credits - self.used_credits

    @property
    def photos_remaining(self):
        return self.monthly_photos - self.used_photos

    @property
    def is_active(self):
        return self.status == SubscriptionStatus.ACTIVE

    @property
    def days_until_expiry(self):
        return 30

    def should_reset_limits(self):
        return False

    def reset_monthly_limits(self):
        pass

    def can_generate_photo(self):
        return self.photos_remaining > 0 or self.credits_remaining >= 30

    def use_photo_generation(self):
        if self.photos_remaining > 0:
            self.used_photos += 1
            return True
        if self.credits_remaining >= 30:
            self.used_credits += 30
            return True
        return False

    def to_dict(self) -> dict:
        """Преобразует объект в словарь."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "subscription_type": self.subscription_type.value,
            "status": self.status.value,
            "monthly_credits": self.monthly_credits,
            "monthly_photos": self.monthly_photos,
            "max_message_length": self.max_message_length,
            "used_credits": self.used_credits,
            "used_photos": self.used_photos,
            "credits_remaining": self.credits_remaining,
            "photos_remaining": self.photos_remaining,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_reset_at": self.last_reset_at.isoformat() if self.last_reset_at else None,
            "is_active": self.is_active,
            "days_until_expiry": self.days_until_expiry
        }

    def use_credits(self, amount):
        if self.credits_remaining >= amount:
            self.used_credits += amount
            return True
        return False

    def to_dict(self) -> dict:
        """Преобразует объект в словарь."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "subscription_type": self.subscription_type.value,
            "status": self.status.value,
            "monthly_credits": self.monthly_credits,
            "monthly_photos": self.monthly_photos,
            "max_message_length": self.max_message_length,
            "used_credits": self.used_credits,
            "used_photos": self.used_photos,
            "credits_remaining": self.credits_remaining,
            "photos_remaining": self.photos_remaining,
            "activated_at": self.activated_at.isoformat() if self.activated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_reset_at": self.last_reset_at.isoformat() if self.last_reset_at else None,
            "is_active": self.is_active,
            "days_until_expiry": self.days_until_expiry
        }
    
    @staticmethod
    def _to_datetime(value):
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(value.replace("Z", "+00:00"))


@pytest_asyncio.fixture
def sample_subscription():
    """Базовые данные подписки для тестов."""
    return {
        "id": 1,
        "user_id": 123,
        "subscription_type": SubscriptionType.STANDARD.value,
        "status": SubscriptionStatus.ACTIVE.value,
        "monthly_credits": 1000,
        "monthly_photos": 100,
        "max_message_length": 200,
        "used_credits": 50,
        "used_photos": 5,
        "activated_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "last_reset_at": datetime.utcnow().isoformat(),
    }


@pytest.mark.asyncio
async def test_get_user_subscription_from_cache(redis_client, mock_db, sample_subscription):
    """Тест получения подписки из кэша."""
    service = SubscriptionService(mock_db)

    await cache_set(
        key_subscription(sample_subscription["user_id"]),
        sample_subscription,
        ttl_seconds=TTL_SUBSCRIPTION
    )

    # Мокаем db.get чтобы вернуть MockSubscription (вызывается при восстановлении из кэша)
    mock_subscription = MockSubscription(**sample_subscription)
    mock_db.get = AsyncMock(return_value=mock_subscription)
    # Убеждаемся, что execute не вызывается (данные в кэше)
    mock_db.execute = AsyncMock()
    
    subscription = await service.get_user_subscription(sample_subscription["user_id"])

    assert subscription is not None
    assert subscription.user_id == sample_subscription["user_id"]
    assert subscription.subscription_type == SubscriptionType.STANDARD
    # БД должна вызываться только для получения по ID из кэша через db.get
    mock_db.get.assert_called()


@pytest.mark.asyncio
async def test_get_user_subscription_from_db(redis_client, mock_db, sample_subscription):
    """Тест получения подписки из БД и сохранения в кэш."""
    service = SubscriptionService(mock_db)

    db_subscription = MockSubscription(**sample_subscription)

    # SubscriptionService использует .scalars().first(), а не .scalar_one_or_none()
    mock_scalars = MagicMock()
    mock_scalars.first = MagicMock(return_value=db_subscription)
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=mock_scalars)
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.get = AsyncMock(return_value=None)  # В кэше нет, поэтому get вернет None

    subscription = await service.get_user_subscription(sample_subscription["user_id"])

    assert subscription is not None
    assert subscription.user_id == sample_subscription["user_id"]

    cached = await cache_get(key_subscription(sample_subscription["user_id"]))
    assert cached is not None
    assert cached["user_id"] == sample_subscription["user_id"]


@pytest.mark.asyncio
async def test_get_subscription_stats_from_cache(redis_client, mock_db):
    """Тест получения статистики подписки из кэша."""
    service = SubscriptionService(mock_db)

    cached_stats = {
        "subscription_type": "standard",
        "status": "active",
        "monthly_credits": 1000,
        "monthly_photos": 100,
        "used_credits": 50,
        "used_photos": 5,
        "credits_remaining": 950,
        "photos_remaining": 95,
        "days_left": 30,
        "is_active": True
    }

    user_id = 123
    await cache_set(
        key_subscription_stats(user_id),
        cached_stats,
        ttl_seconds=TTL_SUBSCRIPTION_STATS
    )

    # Настраиваем моки, чтобы они не вызывались (данные в кэше)
    mock_db.execute = AsyncMock()
    mock_db.get = AsyncMock()
    
    # get_subscription_stats возвращает данные из кэша напрямую, без вызова get_user_subscription
    stats = await service.get_subscription_stats(user_id)

    # Проверяем, что все ключи из cached_stats присутствуют в stats
    for key, value in cached_stats.items():
        assert key in stats, f"Ключ {key} отсутствует в stats"
        assert stats[key] == value, f"Значение для {key}: ожидалось {value}, получено {stats[key]}"


@pytest.mark.asyncio
async def test_cache_invalidation_on_use_photo_generation(redis_client, mock_db, sample_subscription):
    """Тест инвалидации кэша при использовании генерации фото."""
    service = SubscriptionService(mock_db)

    mock_subscription = MockSubscription(**sample_subscription)

    with patch.object(
        SubscriptionService, "get_user_subscription", new_callable=AsyncMock
    ) as mock_get_subscription:
        mock_get_subscription.return_value = mock_subscription

        user_id = sample_subscription["user_id"]
        await cache_set(key_subscription(user_id), {"foo": "bar"})
        await cache_set(key_subscription_stats(user_id), {"foo": "bar"})

        result = await service.use_photo_generation(user_id)

    assert result is True
    assert await cache_get(key_subscription(user_id)) is None
    assert await cache_get(key_subscription_stats(user_id)) is None


@pytest.mark.asyncio
async def test_cache_invalidation_on_use_message_credits(redis_client, mock_db, sample_subscription):
    """Тест инвалидации кэша при использовании кредитов за сообщение."""
    service = SubscriptionService(mock_db)

    mock_subscription = MockSubscription(**sample_subscription)

    with patch.object(
        SubscriptionService, "get_user_subscription", new_callable=AsyncMock
    ) as mock_get_subscription:
        mock_get_subscription.return_value = mock_subscription

        user_id = sample_subscription["user_id"]
        await cache_set(key_subscription(user_id), {"foo": "bar"})
        await cache_set(key_subscription_stats(user_id), {"foo": "bar"})

        result = await service.use_message_credits(user_id)

    assert result is True
    assert await cache_get(key_subscription(user_id)) is None
    assert await cache_get(key_subscription_stats(user_id)) is None

