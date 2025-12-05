"""
Утилита для управления контекстом чата на основе подписки пользователя.
"""

from typing import Optional, List, Dict
from app.models.subscription import SubscriptionType
from app.utils.logger import logger


def get_context_limit(subscription_type: Optional[SubscriptionType]) -> int:
    """
    Возвращает лимит сообщений для контекста на основе типа подписки.

    Args:
        subscription_type: Тип подписки пользователя

    Returns:
        Количество сообщений для включения в контекст
    """
    if subscription_type == SubscriptionType.PREMIUM:
        return 40
    elif subscription_type == SubscriptionType.STANDARD:
        return 20
    else:
        # FREE или отсутствие подписки
        return 10


def get_max_tokens(subscription_type: Optional[SubscriptionType]) -> int:
    """
    Возвращает максимальное количество токенов для генерации ответа
    на основе типа подписки.

    Args:
        subscription_type: Тип подписки пользователя

    Returns:
        Максимальное количество токенов для генерации
    """
    if subscription_type == SubscriptionType.PREMIUM:
        return 450
    elif subscription_type == SubscriptionType.STANDARD:
        return 200
    else:
        # FREE или отсутствие подписки - используем минимальное значение
        return 150


def estimate_tokens(text: str) -> int:
    """
    Оценивает количество токенов в тексте.
    Примерная оценка: 1 токен ≈ 4 символа для английского текста.

    Args:
        text: Текст для оценки

    Returns:
        Примерное количество токенов
    """
    # Простая оценка: примерно 4 символа на токен
    # Для более точной оценки можно использовать tiktoken
    return len(text) // 4


def trim_messages_to_token_limit(
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    system_message_index: int = 0
) -> List[Dict[str, str]]:
    """
    Обрезает массив сообщений, чтобы не превысить лимит токенов.
    Системное сообщение всегда сохраняется.

    Args:
        messages: Массив сообщений
        max_tokens: Максимальное количество токенов
        system_message_index: Индекс системного сообщения (обычно 0)

    Returns:
        Обрезанный массив сообщений
    """
    if not messages:
        return messages

    # Сохраняем системное сообщение
    system_message = (
        messages[system_message_index]
        if system_message_index < len(messages)
        else None
    )
    history_messages = [
        msg for i, msg in enumerate(messages)
        if i != system_message_index
    ]

    # Оцениваем токены системного сообщения
    system_tokens = (
        estimate_tokens(system_message.get("content", ""))
        if system_message
        else 0
    )
    available_tokens = max_tokens - system_tokens

    if available_tokens <= 0:
        logger.warning(
            f"[CONTEXT] Системное сообщение слишком большое "
            f"({system_tokens} токенов), оставляем только его"
        )
        return [system_message] if system_message else []

    # Подсчитываем токены для истории, начиная с самых новых
    trimmed_messages = []
    current_tokens = 0

    # Идем с конца (самые новые сообщения)
    for msg in reversed(history_messages):
        msg_tokens = estimate_tokens(msg.get("content", ""))
        if current_tokens + msg_tokens <= available_tokens:
            trimmed_messages.insert(0, msg)
            current_tokens += msg_tokens
        else:
            trimmed_count = len(history_messages) - len(trimmed_messages)
            logger.info(
                f"[CONTEXT] Достигнут лимит токенов "
                f"({current_tokens}/{available_tokens}), "
                f"обрезано {trimmed_count} сообщений"
            )
            break

    # Возвращаем системное сообщение + обрезанную историю
    result = []
    if system_message:
        result.append(system_message)
    result.extend(trimmed_messages)

    logger.info(f"[CONTEXT] Контекст: {len(result)} сообщений")

    return result
