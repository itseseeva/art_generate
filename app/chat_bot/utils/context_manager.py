"""
Утилита для управления контекстом чата на основе подписки пользователя.
Использует tiktoken для точного подсчета токенов.
"""

from typing import Optional, List, Dict
import tiktoken
from app.models.subscription import SubscriptionType
from app.utils.logger import logger


# Инициализация энкодера для подсчета токенов (используем cl100k_base как в GPT-4)
_encoding = None


def _get_encoding():
    """Ленивая инициализация энкодера tiktoken."""
    global _encoding
    if _encoding is None:
        try:
            _encoding = tiktoken.get_encoding("cl100k_base")
        except Exception as e:
            logger.warning(f"[CONTEXT] Не удалось загрузить tiktoken, используем fallback: {e}")
            _encoding = None
    return _encoding


def get_context_limit(subscription_type: Optional[SubscriptionType]) -> Optional[int]:
    """
    Возвращает лимит сообщений для загрузки из БД на основе типа подписки.
    Для PREMIUM и STANDARD возвращает None (без ограничений) - обрезка только по токенам.

    Args:
        subscription_type: Тип подписки пользователя

    Returns:
        Количество сообщений для загрузки из БД или None (без ограничений)
    """
    if subscription_type == SubscriptionType.PREMIUM:
        return None  # Без ограничений - обрезка только по токенам (8192)
    elif subscription_type == SubscriptionType.STANDARD:
        return None  # Без ограничений - обрезка только по токенам (4096)
    else:
        # FREE/BASE - ограничение на 20 сообщений
        return 20


def get_max_context_tokens(subscription_type: Optional[SubscriptionType]) -> int:
    """
    Возвращает максимальное количество токенов для контекста (включая system prompt)
    на основе типа подписки.

    Args:
        subscription_type: Тип подписки пользователя

    Returns:
        Максимальное количество токенов для контекста
    """
    if subscription_type == SubscriptionType.PREMIUM:
        return 8192  # 8192 токенов для PREMIUM
    elif subscription_type == SubscriptionType.STANDARD:
        return 4096  # 4096 токенов для STANDARD
    else:
        # FREE или отсутствие подписки - 2048 токенов для контекста
        return 2048


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
        return 1024
    elif subscription_type == SubscriptionType.STANDARD:
        return 600
    else:
        # FREE или отсутствие подписки - 350 токенов для ответа
        return 350


def count_message_tokens(message: Dict[str, str]) -> int:
    """
    Точный подсчет токенов в сообщении с учетом role и content.

    Args:
        message: Сообщение в формате {"role": "...", "content": "..."}

    Returns:
        Количество токенов в сообщении
    """
    encoding = _get_encoding()
    if encoding is None:
        # Fallback: примерная оценка
        role = message.get("role", "")
        content = message.get("content", "")
        return (len(role) + len(content)) // 4
    
    # Подсчитываем токены для role и content
    role = message.get("role", "")
    content = message.get("content", "")
    
    # Формируем строку для подсчета (как в OpenAI API)
    # Формат: "role: {role}\ncontent: {content}"
    text_to_encode = f"role: {role}\ncontent: {content}"
    
    try:
        tokens = encoding.encode(text_to_encode)
        return len(tokens)
    except Exception as e:
        logger.warning(f"[CONTEXT] Ошибка подсчета токенов: {e}, используем fallback")
        return (len(role) + len(content)) // 4


def count_messages_tokens(messages: List[Dict[str, str]]) -> int:
    """
    Подсчитывает общее количество токенов в массиве сообщений.

    Args:
        messages: Массив сообщений

    Returns:
        Общее количество токенов
    """
    total_tokens = 0
    for message in messages:
        total_tokens += count_message_tokens(message)
    return total_tokens


async def trim_messages_to_token_limit(
    messages: List[Dict[str, str]],
    max_tokens: int,
    system_message_index: int = 0
) -> List[Dict[str, str]]:
    """
    Асинхронно обрезает массив сообщений, чтобы не превысить лимит токенов.
    Использует скользящее окно: сохраняет system prompt и удаляет самые старые сообщения.

    Args:
        messages: Массив сообщений
        max_tokens: Максимальное количество токенов для контекста
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
    
    if not system_message:
        return messages

    # Отделяем системное сообщение от истории
    history_messages = [
        msg for i, msg in enumerate(messages)
        if i != system_message_index
    ]

    # Подсчитываем токены системного сообщения
    system_tokens = count_message_tokens(system_message)
    available_tokens = max_tokens - system_tokens

    if available_tokens <= 0:
        return [system_message]

    # Если история пуста, возвращаем только system message
    if not history_messages:
        return [system_message]

    # Подсчитываем токены для всей истории
    total_history_tokens = count_messages_tokens(history_messages)

    # Если история укладывается в лимит, возвращаем все
    if total_history_tokens <= available_tokens:
        logger.info(
            f"[CONTEXT] История укладывается в лимит: "
            f"{total_history_tokens}/{available_tokens} токенов, "
            f"{len(history_messages)} сообщений"
        )
        return [system_message] + history_messages

    # Нужно обрезать историю: удаляем самые старые сообщения
    # (первые после system message)
    trimmed_history = []
    current_tokens = 0
    removed_count = 0

    # Идем с конца (самые новые сообщения) и добавляем их в trimmed_history
    for msg in reversed(history_messages):
        msg_tokens = count_message_tokens(msg)
        if current_tokens + msg_tokens <= available_tokens:
            trimmed_history.insert(0, msg)
            current_tokens += msg_tokens
        else:
            removed_count += 1
            # Продолжаем проверять, может быть следующее сообщение поместится
            # УДАЛЕНО ограничение removed_count > len(history_messages) // 2 для корректной очистки контекста

    # Если все еще не укладывается, удаляем самые старые
    while current_tokens > available_tokens and trimmed_history:
        removed_msg = trimmed_history.pop(0)
        removed_tokens = count_message_tokens(removed_msg)
        current_tokens -= removed_tokens
        removed_count += 1

    # Возвращаем системное сообщение + обрезанную историю
    result = [system_message] + trimmed_history

    return result
