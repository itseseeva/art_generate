"""
Интеграционные тесты для проверки работы контекста с подписками.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.chat_bot.utils.context_manager import get_context_limit
from app.models.subscription import SubscriptionType


class TestContextWithSubscriptions:
    """Тесты интеграции контекста с подписками."""
    
    @pytest.mark.asyncio
    async def test_premium_context_limit(self):
        """PREMIUM подписка должна использовать лимит 40 сообщений."""
        limit = get_context_limit(SubscriptionType.PREMIUM)
        assert limit == 40
    
    @pytest.mark.asyncio
    async def test_standard_context_limit(self):
        """STANDARD подписка должна использовать лимит 20 сообщений."""
        limit = get_context_limit(SubscriptionType.STANDARD)
        assert limit == 20
    
    @pytest.mark.asyncio
    async def test_free_context_limit(self):
        """FREE подписка должна использовать лимит 10 сообщений."""
        limit = get_context_limit(SubscriptionType.FREE)
        assert limit == 10
    
    def test_context_limit_hierarchy(self):
        """Проверка иерархии лимитов: PREMIUM > STANDARD > FREE."""
        premium_limit = get_context_limit(SubscriptionType.PREMIUM)
        standard_limit = get_context_limit(SubscriptionType.STANDARD)
        free_limit = get_context_limit(SubscriptionType.FREE)
        
        assert premium_limit > standard_limit
        assert standard_limit > free_limit
        assert premium_limit == 40
        assert standard_limit == 20
        assert free_limit == 10

