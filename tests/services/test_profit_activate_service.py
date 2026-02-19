import pytest
from unittest.mock import AsyncMock, patch, MagicMock, PropertyMock
from datetime import datetime, timedelta
from app.services.profit_activate import ProfitActivateService
from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
from app.models.user import Users

@pytest.fixture
def db_session():
    return AsyncMock()

@pytest.fixture
def profit_service(db_session):
    return ProfitActivateService(db_session)

@pytest.mark.asyncio
async def test_get_user_subscription_cache_hit(profit_service):
    """Test get_user_subscription returns data from cache."""
    user_id = 1
    cached_payload = {"id": 100, "user_id": 1, "subscription_type": "standard"}
    
    with patch("app.services.profit_activate.cache_get", new_callable=AsyncMock) as mock_get, \
         patch.object(profit_service.db, 'get', new_callable=AsyncMock) as mock_db_get:
        
        mock_get.return_value = cached_payload
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.id = 100
        mock_sub.user_id = 1
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_db_get.return_value = mock_sub
        
        result = await profit_service.get_user_subscription(user_id)
        
        assert result.id == 100
        assert mock_get.called
        assert mock_db_get.called

@pytest.mark.asyncio
async def test_get_user_subscription_db_success(profit_service):
    """Test get_user_subscription fetches from DB when cache is empty."""
    user_id = 1
    
    with patch("app.services.profit_activate.cache_get", new_callable=AsyncMock) as mock_get, \
         patch("app.services.profit_activate.cache_set", new_callable=AsyncMock) as mock_set, \
         patch.object(profit_service.db, 'execute', new_callable=AsyncMock) as mock_execute:
        
        mock_get.return_value = None
        
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.id = 200
        mock_sub.user_id = 1
        mock_sub.subscription_type = SubscriptionType.PREMIUM
        mock_sub.is_active = True
        mock_sub.to_dict.return_value = {"id": 200}
        
        res = MagicMock()
        res.scalars.return_value.first.return_value = mock_sub
        mock_execute.return_value = res
        
        result = await profit_service.get_user_subscription(user_id)
        
        assert result.id == 200
        assert mock_set.called

@pytest.mark.asyncio
async def test_activate_subscription_new_standard(profit_service):
    """Test activating a new standard subscription for a user."""
    user_id = 1
    sub_type = "standard"
    months = 1
    
    with patch.object(profit_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub, \
         patch.object(profit_service.db, 'execute', new_callable=AsyncMock) as mock_execute, \
         patch("app.utils.balance_history.record_balance_change", new_callable=AsyncMock) as mock_record_balance, \
         patch("app.services.profit_activate.cache_delete", new_callable=AsyncMock) as mock_cache_del, \
         patch("app.services.profit_activate.emit_profile_update", new_callable=AsyncMock) as mock_emit:
        
        mock_get_sub.return_value = None # New subscription
        
        mock_user = MagicMock(spec=Users)
        mock_user.id = user_id
        mock_user.coins = 100
        
        res_user = MagicMock()
        res_user.scalars.return_value.first.return_value = mock_user
        mock_execute.return_value = res_user
        
        # We need to mock the UserSubscription creation
        with patch("app.services.profit_activate.UserSubscription", spec=UserSubscription) as mock_sub_class:
            mock_sub_instance = mock_sub_class.return_value
            mock_sub_instance.status = SubscriptionStatus.ACTIVE
            mock_sub_instance.expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Mocking the property is_active on the specific instance's class or just the instance?
            # Since is_active is a property, we can mock it on the instance if we rely on type(instance).prop
            # But simpler here since it's a mock object: just configure the property mock contextually
            with patch("app.models.subscription.UserSubscription.is_active", new_callable=PropertyMock) as mock_is_active:
                mock_is_active.return_value = True
                
                result = await profit_service.activate_subscription(user_id, sub_type, months)
                
                assert profit_service.db.add.called
                assert mock_user.coins == 100 # No credits added
                assert profit_service.db.commit.called

@pytest.mark.asyncio
async def test_activate_subscription_renewal_with_bonus(profit_service):
    """Test renewal of existing subscription with 12 months bonus."""
    user_id = 1
    sub_type = "standard"
    months = 12
    
    with patch.object(profit_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub, \
         patch.object(profit_service.db, 'execute', new_callable=AsyncMock) as mock_execute, \
         patch("app.utils.balance_history.record_balance_change", new_callable=AsyncMock) as mock_record_balance, \
         patch("app.services.profit_activate.cache_delete", new_callable=AsyncMock) as mock_cache_del, \
         patch("app.services.profit_activate.emit_profile_update", new_callable=AsyncMock) as mock_emit:
        
        from datetime import datetime
        now = datetime.utcnow()
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_sub.status = SubscriptionStatus.ACTIVE
        mock_sub.expires_at = now + timedelta(days=5)
        
        # Safe patching of property
        with patch("app.models.subscription.UserSubscription.is_active", new_callable=PropertyMock) as mock_is_active:
             mock_is_active.return_value = True
        
             mock_sub.images_remaining = 10 # Existing
             mock_sub.voice_remaining = 5
             mock_get_sub.return_value = mock_sub
        
             mock_user = MagicMock(spec=Users)
             mock_user.coins = 0
             res_user = MagicMock()
             res_user.scalars.return_value.first.return_value = mock_user
             mock_execute.return_value = res_user
        
             result = await profit_service.activate_subscription(user_id, sub_type, months)
        
             # Credits are no longer added
             assert mock_user.coins == 0
             # images_limit = 10 (old) + 100*12*1.15 = 10 + 1380 = 1390. Correct.
             assert mock_sub.images_limit == 1390
             assert mock_sub.expires_at > now + timedelta(days=360)
             assert profit_service.db.commit.called

@pytest.mark.asyncio
async def test_get_subscription_stats_cache_hit(profit_service):
    """Test get_subscription_stats returns data from cache."""
    user_id = 1
    cached_stats = {"subscription_type": "standard", "is_active": True}
    
    with patch("app.services.profit_activate.cache_get", new_callable=AsyncMock) as mock_cache_get:
        mock_cache_get.return_value = cached_stats
        
        stats = await profit_service.get_subscription_stats(user_id)
        assert stats == cached_stats

@pytest.mark.asyncio
async def test_get_subscription_stats_reset_limits(profit_service):
    """Test get_subscription_stats resets limits if needed."""
    user_id = 1
    
    with patch("app.services.profit_activate.cache_get", new_callable=AsyncMock) as mock_cache_get, \
         patch.object(profit_service, 'get_user_subscription', new_callable=AsyncMock) as mock_get_sub, \
         patch.object(profit_service.db, 'execute', new_callable=AsyncMock) as mock_execute:
        
        mock_cache_get.return_value = None
        
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.id = 1
        mock_sub.user_id = 1
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_sub.status = SubscriptionStatus.ACTIVE
        mock_sub.should_reset_limits.return_value = True
        mock_sub.expires_at = datetime.utcnow() + timedelta(days=1)
        mock_sub.last_reset_at = datetime.utcnow() - timedelta(days=31)
        
        # Ensure compared/used fields are not MagicMocks
        mock_sub.images_limit = 100
        mock_sub.voice_limit = 100
        mock_sub.monthly_messages = 0
        mock_sub.monthly_credits = 2000
        mock_sub.monthly_photos = 0
        mock_sub.used_credits = 0
        mock_sub.used_photos = 0
        mock_sub.used_messages = 0
        mock_sub.images_used = 0
        mock_sub.voice_used = 0
        
        # Mocking to_dict since it's called at the end
        mock_sub.to_dict.return_value = {"subscription_type": "standard"}
        
        mock_get_sub.return_value = mock_sub
        
        # Mock characters_count_query result
        mock_char_res = MagicMock()
        mock_char_res.scalar.return_value = 5
        mock_execute.return_value = mock_char_res
        
        stats = await profit_service.get_subscription_stats(user_id)
        
        assert mock_sub.reset_monthly_limits.called
        assert profit_service.db.commit.called
        assert stats["characters_count"] == 5

@pytest.mark.asyncio
async def test_add_credits_topup_success(profit_service):
    """Test adding credits top-up to user balance."""
    user_id = 1
    credits = 500
    
    result = await profit_service.add_credits_topup(user_id, credits)
    
    assert result["success"] is False
    assert result["message"] == "Система кредитов удалена"

@pytest.mark.asyncio
async def test_can_user_send_message_success(profit_service):
    """Test can_user_send_message logic."""
    user_id = 1
    with patch.object(profit_service, '_ensure_subscription', new_callable=AsyncMock) as mock_ensure:
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.can_send_message.return_value = True
        mock_ensure.return_value = mock_sub
        
        result = await profit_service.can_user_send_message(user_id, 50)
        assert result is True
        mock_sub.can_send_message.assert_called_with(50)

@pytest.mark.asyncio
async def test_use_message_credits_success(profit_service):
    """Test use_message_credits successful deduction and cache invalidation."""
    user_id = 1
    with patch.object(profit_service, '_ensure_subscription', new_callable=AsyncMock) as mock_ensure, \
         patch("app.services.profit_activate.cache_delete", new_callable=AsyncMock) as mock_cache_del, \
         patch("app.services.profit_activate.emit_profile_update", new_callable=AsyncMock) as mock_emit:
        
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.should_reset_limits.return_value = False
        mock_sub.can_send_message.return_value = True
        mock_sub.subscription_type = SubscriptionType.STANDARD
        mock_ensure.return_value = mock_sub
        
        result = await profit_service.use_message_credits(user_id)
        
        assert result is True
        assert profit_service.db.commit.called
        assert mock_cache_del.called
        assert mock_emit.called

@pytest.mark.asyncio
async def test_use_photo_generation_success(profit_service):
    """Test use_photo_generation successful deduction."""
    user_id = 1
    with patch.object(profit_service, '_ensure_subscription', new_callable=AsyncMock) as mock_ensure, \
         patch("app.services.profit_activate.emit_profile_update", new_callable=AsyncMock) as mock_emit:
        
        mock_sub = MagicMock(spec=UserSubscription)
        mock_sub.should_reset_limits.return_value = False
        mock_sub.use_photo_generation.return_value = True
        mock_ensure.return_value = mock_sub
        
        result = await profit_service.use_photo_generation(user_id)
        
        assert result is True
        assert mock_sub.use_photo_generation.called
        assert profit_service.db.commit.called
        assert mock_emit.called
