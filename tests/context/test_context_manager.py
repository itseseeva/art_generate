"""
Тесты для утилиты управления контекстом чата.
"""

import pytest
from app.chat_bot.utils.context_manager import (
    get_context_limit,
    estimate_tokens,
    trim_messages_to_token_limit
)
from app.models.subscription import SubscriptionType


class TestGetContextLimit:
    """Тесты для функции get_context_limit."""
    
    def test_premium_subscription_limit(self):
        """PREMIUM подписка должна возвращать лимит 40 сообщений."""
        limit = get_context_limit(SubscriptionType.PREMIUM)
        assert limit == 40
    
    def test_standard_subscription_limit(self):
        """STANDARD подписка должна возвращать лимит 20 сообщений."""
        limit = get_context_limit(SubscriptionType.STANDARD)
        assert limit == 20
    
    def test_free_subscription_limit(self):
        """FREE подписка должна возвращать лимит 10 сообщений."""
        limit = get_context_limit(SubscriptionType.FREE)
        assert limit == 10
    
    def test_none_subscription_limit(self):
        """Отсутствие подписки должно возвращать лимит 10 сообщений (fallback)."""
        limit = get_context_limit(None)
        assert limit == 10
    
    def test_pro_subscription_limit(self):
        """PRO подписка должна возвращать лимит 10 сообщений (fallback)."""
        limit = get_context_limit(SubscriptionType.PRO)
        assert limit == 10


class TestEstimateTokens:
    """Тесты для функции estimate_tokens."""
    
    def test_estimate_tokens_english_text(self):
        """Оценка токенов для английского текста (примерно 4 символа на токен)."""
        text = "Hello world" * 10  # 110 символов
        tokens = estimate_tokens(text)
        # Ожидаем примерно 110 / 4 = 27-28 токенов
        assert 25 <= tokens <= 30
    
    def test_estimate_tokens_russian_text(self):
        """Оценка токенов для русского текста."""
        text = "Привет мир" * 10  # 100 символов
        tokens = estimate_tokens(text)
        # Ожидаем примерно 100 / 4 = 25 токенов
        assert 20 <= tokens <= 30
    
    def test_estimate_tokens_empty_text(self):
        """Пустой текст должен возвращать 0 токенов."""
        tokens = estimate_tokens("")
        assert tokens == 0
    
    def test_estimate_tokens_long_text(self):
        """Оценка токенов для длинного текста."""
        text = "A" * 1000  # 1000 символов
        tokens = estimate_tokens(text)
        # Ожидаем примерно 250 токенов
        assert 240 <= tokens <= 260


class TestTrimMessagesToTokenLimit:
    """Тесты для функции trim_messages_to_token_limit."""
    
    def test_keep_system_message_always(self):
        """Системное сообщение всегда должно сохраняться."""
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        
        result = trim_messages_to_token_limit(messages, max_tokens=10, system_message_index=0)
        
        # Системное сообщение должно быть первым
        assert len(result) >= 1
        assert result[0]["role"] == "system"
        assert result[0]["content"] == "You are a helpful assistant."
    
    def test_trim_when_exceeds_limit(self):
        """Сообщения должны обрезаться, если превышают лимит токенов."""
        # Создаем много сообщений, которые точно превысят лимит
        messages = [
            {"role": "system", "content": "System prompt"},
        ]
        # Добавляем много длинных сообщений
        for i in range(100):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": "A" * 200  # Длинные сообщения
            })
        
        result = trim_messages_to_token_limit(messages, max_tokens=4096, system_message_index=0)
        
        # Результат должен быть меньше исходного массива
        assert len(result) < len(messages)
        # Системное сообщение должно быть первым
        assert result[0]["role"] == "system"
        # Должно быть хотя бы системное сообщение
        assert len(result) >= 1
    
    def test_keep_all_when_under_limit(self):
        """Все сообщения должны сохраняться, если не превышают лимит."""
        messages = [
            {"role": "system", "content": "System"},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi"}
        ]
        
        result = trim_messages_to_token_limit(messages, max_tokens=4096, system_message_index=0)
        
        # Все сообщения должны сохраниться
        assert len(result) == len(messages)
        assert result[0]["role"] == "system"
        assert result[1]["role"] == "user"
        assert result[2]["role"] == "assistant"
    
    def test_empty_messages(self):
        """Пустой массив должен возвращаться как есть."""
        result = trim_messages_to_token_limit([], max_tokens=4096)
        assert result == []
    
    def test_only_system_message(self):
        """Если только системное сообщение, оно должно сохраниться."""
        messages = [
            {"role": "system", "content": "System prompt"}
        ]
        
        result = trim_messages_to_token_limit(messages, max_tokens=4096, system_message_index=0)
        
        assert len(result) == 1
        assert result[0]["role"] == "system"
    
    def test_trim_from_oldest(self):
        """Старые сообщения должны обрезаться первыми (новые сохраняются)."""
        messages = [
            {"role": "system", "content": "System"},
            {"role": "user", "content": "Old message 1"},
            {"role": "assistant", "content": "Old response 1"},
            {"role": "user", "content": "New message"},
            {"role": "assistant", "content": "New response"}
        ]
        
        # Устанавливаем очень маленький лимит, чтобы обрезались старые сообщения
        result = trim_messages_to_token_limit(messages, max_tokens=100, system_message_index=0)
        
        # Системное сообщение должно быть
        assert result[0]["role"] == "system"
        # Новые сообщения должны быть в конце (если помещаются)
        # Проверяем, что последнее сообщение - это новое
        if len(result) > 1:
            # Последнее сообщение должно быть из новых
            assert result[-1]["content"] in ["New message", "New response"]
    
    def test_system_message_too_large(self):
        """Если системное сообщение слишком большое, оставляем только его."""
        messages = [
            {"role": "system", "content": "A" * 5000},  # Очень большое системное сообщение
            {"role": "user", "content": "Hello"}
        ]
        
        result = trim_messages_to_token_limit(messages, max_tokens=100, system_message_index=0)
        
        # Должно остаться только системное сообщение
        assert len(result) == 1
        assert result[0]["role"] == "system"

