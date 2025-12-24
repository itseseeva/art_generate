"""
Тесты для проверки управления контекстом чата с точным подсчетом токенов.
Проверяет лимиты для STANDARD и PREMIUM подписок, точный подсчет токенов через tiktoken,
и скользящее окно контекста.
"""

import pytest
from typing import List, Dict
from app.chat_bot.utils.context_manager import (
    get_context_limit,
    get_max_context_tokens,
    get_max_tokens,
    count_message_tokens,
    count_messages_tokens,
    trim_messages_to_token_limit
)
from app.models.subscription import SubscriptionType


class TestGetContextLimit:
    """Тесты для функции get_context_limit (лимит сообщений для загрузки из БД)."""
    
    def test_premium_subscription_limit(self):
        """PREMIUM подписка должна возвращать None (без ограничений, обрезка только по токенам)."""
        limit = get_context_limit(SubscriptionType.PREMIUM)
        assert limit is None, f"Ожидалось None (без ограничений), получено {limit}"
    
    def test_standard_subscription_limit(self):
        """STANDARD подписка должна возвращать None (без ограничений, обрезка только по токенам)."""
        limit = get_context_limit(SubscriptionType.STANDARD)
        assert limit is None, f"Ожидалось None (без ограничений), получено {limit}"
    
    def test_free_subscription_limit(self):
        """FREE подписка должна возвращать лимит 10 сообщений."""
        limit = get_context_limit(SubscriptionType.FREE)
        assert limit == 10, f"Ожидалось 10, получено {limit}"
    
    def test_none_subscription_limit(self):
        """Отсутствие подписки должно возвращать лимит 10 сообщений (fallback)."""
        limit = get_context_limit(None)
        assert limit == 10, f"Ожидалось 10, получено {limit}"


class TestGetMaxContextTokens:
    """Тесты для функции get_max_context_tokens (лимит токенов для контекста)."""
    
    def test_premium_context_tokens_limit(self):
        """PREMIUM подписка должна возвращать лимит 8000 токенов."""
        limit = get_max_context_tokens(SubscriptionType.PREMIUM)
        assert limit == 8000, f"Ожидалось 8000, получено {limit}"
    
    def test_standard_context_tokens_limit(self):
        """STANDARD подписка должна возвращать лимит 4000 токенов."""
        limit = get_max_context_tokens(SubscriptionType.STANDARD)
        assert limit == 4000, f"Ожидалось 4000, получено {limit}"
    
    def test_free_context_tokens_limit(self):
        """FREE подписка должна возвращать лимит 2000 токенов."""
        limit = get_max_context_tokens(SubscriptionType.FREE)
        assert limit == 2000, f"Ожидалось 2000, получено {limit}"
    
    def test_none_context_tokens_limit(self):
        """Отсутствие подписки должно возвращать лимит 2000 токенов (fallback)."""
        limit = get_max_context_tokens(None)
        assert limit == 2000, f"Ожидалось 2000, получено {limit}"


class TestGetMaxTokens:
    """Тесты для функции get_max_tokens (лимит токенов для генерации ответа)."""
    
    def test_premium_max_tokens(self):
        """PREMIUM подписка должна возвращать лимит 850 токенов для генерации."""
        limit = get_max_tokens(SubscriptionType.PREMIUM)
        assert limit == 850, f"Ожидалось 850, получено {limit}"
    
    def test_standard_max_tokens(self):
        """STANDARD подписка должна возвращать лимит 400 токенов для генерации."""
        limit = get_max_tokens(SubscriptionType.STANDARD)
        assert limit == 400, f"Ожидалось 400, получено {limit}"
    
    def test_free_max_tokens(self):
        """FREE подписка должна возвращать лимит 150 токенов для генерации."""
        limit = get_max_tokens(SubscriptionType.FREE)
        assert limit == 150, f"Ожидалось 150, получено {limit}"


class TestCountMessageTokens:
    """Тесты для точного подсчета токенов в сообщении через tiktoken."""
    
    def test_count_simple_message_tokens(self):
        """Подсчет токенов для простого сообщения."""
        message = {
            "role": "user",
            "content": "Hello, world!"
        }
        tokens = count_message_tokens(message)
        # Проверяем, что токены подсчитаны (должно быть больше 0)
        assert tokens > 0, "Количество токенов должно быть больше 0"
        # Для "Hello, world!" должно быть примерно 3-5 токенов
        assert 3 <= tokens <= 10, f"Неожиданное количество токенов: {tokens}"
    
    def test_count_russian_message_tokens(self):
        """Подсчет токенов для русского сообщения."""
        message = {
            "role": "user",
            "content": "Привет, как дела?"
        }
        tokens = count_message_tokens(message)
        assert tokens > 0, "Количество токенов должно быть больше 0"
        # Для русского текста токены могут быть другими
        assert 5 <= tokens <= 15, f"Неожиданное количество токенов: {tokens}"
    
    def test_count_long_message_tokens(self):
        """Подсчет токенов для длинного сообщения."""
        message = {
            "role": "assistant",
            "content": "A" * 1000  # 1000 символов
        }
        tokens = count_message_tokens(message)
        assert tokens > 0, "Количество токенов должно быть больше 0"
        # Для 1000 символов "A" tiktoken может считать по-разному
        # Проверяем, что токены подсчитаны (должно быть больше 50)
        assert tokens >= 50, f"Неожиданное количество токенов для длинного сообщения: {tokens}"
    
    def test_count_empty_message_tokens(self):
        """Подсчет токенов для пустого сообщения."""
        message = {
            "role": "user",
            "content": ""
        }
        tokens = count_message_tokens(message)
        # Пустое сообщение все равно имеет токены от role
        assert tokens >= 0, "Количество токенов должно быть >= 0"
    
    def test_count_system_message_tokens(self):
        """Подсчет токенов для системного сообщения."""
        message = {
            "role": "system",
            "content": "You are a helpful assistant."
        }
        tokens = count_message_tokens(message)
        assert tokens > 0, "Количество токенов должно быть больше 0"


class TestCountMessagesTokens:
    """Тесты для подсчета токенов в массиве сообщений."""
    
    def test_count_multiple_messages_tokens(self):
        """Подсчет токенов для нескольких сообщений."""
        messages = [
            {"role": "system", "content": "You are helpful."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        total_tokens = count_messages_tokens(messages)
        assert total_tokens > 0, "Общее количество токенов должно быть больше 0"
        # Проверяем, что сумма больше, чем одно сообщение
        single_token = count_message_tokens(messages[0])
        assert total_tokens > single_token, "Сумма должна быть больше одного сообщения"
    
    def test_count_empty_messages_tokens(self):
        """Подсчет токенов для пустого массива."""
        messages = []
        total_tokens = count_messages_tokens(messages)
        assert total_tokens == 0, "Для пустого массива должно быть 0 токенов"


class TestTrimMessagesToTokenLimit:
    """Тесты для функции обрезки сообщений по лимиту токенов."""
    
    @pytest.mark.asyncio
    async def test_keep_system_message_always(self):
        """Системное сообщение всегда должно сохраняться первым."""
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=10,  # Очень маленький лимит
            system_message_index=0
        )
        
        # Системное сообщение должно быть первым
        assert len(result) >= 1, "Должно быть хотя бы одно сообщение"
        assert result[0]["role"] == "system", "Первое сообщение должно быть system"
        assert result[0]["content"] == "You are a helpful assistant.", "Содержимое system должно сохраниться"
    
    @pytest.mark.asyncio
    async def test_trim_when_exceeds_limit(self):
        """Сообщения должны обрезаться, если превышают лимит токенов."""
        # Создаем много сообщений, которые точно превысят лимит
        messages = [
            {"role": "system", "content": "System prompt"},
        ]
        # Добавляем много длинных сообщений
        for i in range(50):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": "A" * 200  # Длинные сообщения
            })
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=1000,  # Лимит 1000 токенов
            system_message_index=0
        )
        
        # Результат должен быть меньше исходного массива
        assert len(result) < len(messages), "Результат должен быть меньше исходного массива"
        # Системное сообщение должно быть первым
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
        # Должно быть хотя бы системное сообщение
        assert len(result) >= 1, "Должно быть хотя бы одно сообщение"
    
    @pytest.mark.asyncio
    async def test_keep_all_when_under_limit(self):
        """Все сообщения должны сохраняться, если не превышают лимит."""
        messages = [
            {"role": "system", "content": "System"},
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi"}
        ]
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=10000,  # Большой лимит
            system_message_index=0
        )
        
        # Все сообщения должны сохраниться
        assert len(result) == len(messages), "Все сообщения должны сохраниться"
        assert result[0]["role"] == "system", "Первое сообщение должно быть system"
        assert result[1]["role"] == "user", "Второе сообщение должно быть user"
        assert result[2]["role"] == "assistant", "Третье сообщение должно быть assistant"
    
    @pytest.mark.asyncio
    async def test_empty_messages(self):
        """Пустой массив должен возвращаться как есть."""
        result = await trim_messages_to_token_limit([], max_tokens=4096)
        assert result == [], "Пустой массив должен вернуться как есть"
    
    @pytest.mark.asyncio
    async def test_only_system_message(self):
        """Если только системное сообщение, оно должно сохраниться."""
        messages = [
            {"role": "system", "content": "System prompt"}
        ]
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=4096, 
            system_message_index=0
        )
        
        assert len(result) == 1, "Должно быть одно сообщение"
        assert result[0]["role"] == "system", "Сообщение должно быть system"
    
    @pytest.mark.asyncio
    async def test_trim_from_oldest_keep_newest(self):
        """Старые сообщения должны обрезаться первыми (новые сохраняются)."""
        messages = [
            {"role": "system", "content": "System"},
            {"role": "user", "content": "Old message 1"},
            {"role": "assistant", "content": "Old response 1"},
            {"role": "user", "content": "New message"},
            {"role": "assistant", "content": "New response"}
        ]
        
        # Устанавливаем очень маленький лимит, чтобы обрезались старые сообщения
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=100, 
            system_message_index=0
        )
        
        # Системное сообщение должно быть
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
        # Новые сообщения должны быть в конце (если помещаются)
        if len(result) > 1:
            # Последнее сообщение должно быть из новых
            last_content = result[-1]["content"]
            assert last_content in ["New message", "New response"], \
                f"Последнее сообщение должно быть новым, получено: {last_content}"
    
    @pytest.mark.asyncio
    async def test_system_message_too_large(self):
        """Если системное сообщение слишком большое, оставляем только его."""
        messages = [
            {"role": "system", "content": "A" * 5000},  # Очень большое системное сообщение
            {"role": "user", "content": "Hello"}
        ]
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=100, 
            system_message_index=0
        )
        
        # Должно остаться только системное сообщение
        assert len(result) == 1, "Должно остаться только одно сообщение"
        assert result[0]["role"] == "system", "Оставшееся сообщение должно быть system"
    
    @pytest.mark.asyncio
    async def test_premium_context_limit_8000_tokens(self):
        """Тест для PREMIUM: контекст должен укладываться в 8000 токенов."""
        # Создаем сообщения, которые точно превысят 8000 токенов
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
        ]
        # Добавляем много длинных сообщений
        for i in range(100):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": "This is a long message. " * 50  # Длинные сообщения
            })
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=8000,  # Лимит для PREMIUM
            system_message_index=0
        )
        
        # Проверяем, что результат укладывается в лимит
        total_tokens = count_messages_tokens(result)
        assert total_tokens <= 8000, \
            f"Контекст должен укладываться в 8000 токенов, получено: {total_tokens}"
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
    
    @pytest.mark.asyncio
    async def test_standard_context_limit_4000_tokens(self):
        """Тест для STANDARD: контекст должен укладываться в 4000 токенов."""
        # Создаем сообщения, которые точно превысят 4000 токенов
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
        ]
        # Добавляем много длинных сообщений
        for i in range(100):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": "This is a long message. " * 30  # Длинные сообщения
            })
        
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=4000,  # Лимит для STANDARD
            system_message_index=0
        )
        
        # Проверяем, что результат укладывается в лимит
        total_tokens = count_messages_tokens(result)
        assert total_tokens <= 4000, \
            f"Контекст должен укладываться в 4000 токенов, получено: {total_tokens}"
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
    
    @pytest.mark.asyncio
    async def test_sliding_window_preserves_newest(self):
        """Скользящее окно должно сохранять самые новые сообщения."""
        messages = [
            {"role": "system", "content": "System prompt"},
            {"role": "user", "content": "Message 1"},
            {"role": "assistant", "content": "Response 1"},
            {"role": "user", "content": "Message 2"},
            {"role": "assistant", "content": "Response 2"},
            {"role": "user", "content": "Message 3"},
            {"role": "assistant", "content": "Response 3"},
        ]
        
        # Устанавливаем лимит, который позволит сохранить только последние 2 пары сообщений
        result = await trim_messages_to_token_limit(
            messages, 
            max_tokens=200,  # Маленький лимит
            system_message_index=0
        )
        
        # System сообщение должно быть
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
        # Последние сообщения должны быть сохранены (если помещаются)
        if len(result) > 1:
            last_content = result[-1]["content"]
            # Последнее сообщение должно быть из последних (Message 3 или Response 3)
            assert "3" in last_content or "Message 3" in last_content or "Response 3" in last_content, \
                f"Последнее сообщение должно быть новым, получено: {last_content}"


class TestIntegration:
    """Интеграционные тесты для проверки работы всей системы."""
    
    @pytest.mark.asyncio
    async def test_full_workflow_premium(self):
        """Полный тест workflow для PREMIUM подписки."""
        subscription_type = SubscriptionType.PREMIUM
        
        # Проверяем лимиты
        context_limit = get_context_limit(subscription_type)
        max_context_tokens = get_max_context_tokens(subscription_type)
        max_tokens = get_max_tokens(subscription_type)
        
        assert context_limit is None, "PREMIUM должен иметь None (без ограничений сообщений, обрезка только по токенам)"
        assert max_context_tokens == 8000, "PREMIUM должен иметь лимит 8000 токенов контекста"
        assert max_tokens == 850, "PREMIUM должен иметь лимит 850 токенов для генерации"
        
        # Создаем сообщения
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
        ]
        for i in range(50):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": f"Message {i}: " + "A" * 100
            })
        
        # Обрезаем по лимиту PREMIUM
        result = await trim_messages_to_token_limit(
            messages,
            max_tokens=max_context_tokens,
            system_message_index=0
        )
        
        # Проверяем результат
        total_tokens = count_messages_tokens(result)
        assert total_tokens <= max_context_tokens, \
            f"Контекст должен укладываться в {max_context_tokens} токенов, получено: {total_tokens}"
        assert result[0]["role"] == "system", "System сообщение должно быть первым"
    
    @pytest.mark.asyncio
    async def test_full_workflow_standard(self):
        """Полный тест workflow для STANDARD подписки."""
        subscription_type = SubscriptionType.STANDARD
        
        # Проверяем лимиты
        context_limit = get_context_limit(subscription_type)
        max_context_tokens = get_max_context_tokens(subscription_type)
        max_tokens = get_max_tokens(subscription_type)
        
        assert context_limit is None, "STANDARD должен иметь None (без ограничений сообщений, обрезка только по токенам)"
        assert max_context_tokens == 4000, "STANDARD должен иметь лимит 4000 токенов контекста"
        assert max_tokens == 400, "STANDARD должен иметь лимит 400 токенов для генерации"
        
        # Создаем сообщения
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
        ]
        for i in range(30):
            messages.append({
                "role": "user" if i % 2 == 0 else "assistant",
                "content": f"Message {i}: " + "A" * 100
            })
        
        # Обрезаем по лимиту STANDARD
        result = await trim_messages_to_token_limit(
            messages,
            max_tokens=max_context_tokens,
            system_message_index=0
        )
        
        # Проверяем результат
        total_tokens = count_messages_tokens(result)
        assert total_tokens <= max_context_tokens, \
            f"Контекст должен укладываться в {max_context_tokens} токенов, получено: {total_tokens}"
        assert result[0]["role"] == "system", "System сообщение должно быть первым"

