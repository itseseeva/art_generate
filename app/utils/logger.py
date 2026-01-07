"""
Модуль для настройки логирования с интеграцией Telegram.
"""
from loguru import logger
from telegram import Bot
from telegram.error import TelegramError
from functools import wraps
import sys


class Logger:
    """Класс для логирования с поддержкой Telegram"""

    def __init__(
        self,
        bot_token: str,
        chat_id: str,
        log_level: str = "ERROR",
        max_message_length: int = 4000
    ):
        """
        Инициализация логгера

        Args:
            bot_token: Токен Telegram бота
            chat_id: ID чата для отправки логов
            log_level: Уровень логирования (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            max_message_length: Максимальная длина сообщения в Telegram
        """
        if not bot_token or not chat_id:
            raise ValueError(
                "Bot token и chat_id обязательны "
                "для работы логгера"
            )
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.log_level = log_level
        self.max_message_length = max_message_length
        self.bot = Bot(token=bot_token)

    def info(self, message: str) -> None:
        """
        Логирование информационного сообщения

        Args:
            message: Текст сообщения
        """
        logger.info(message)

    def error(self, message: str) -> None:
        """
        Логирование сообщения об ошибке

        Args:
            message: Текст сообщения об ошибке
        """
        logger.error(message)

    def warning(self, message: str) -> None:
        """
        Логирование предупреждения

        Args:
            message: Текст предупреждения
        """
        logger.warning(message)

    def debug(self, message: str) -> None:
        """
        Логирование отладочного сообщения

        Args:
            message: Текст отладочного сообщения
        """
        logger.debug(message)

    async def send_log(self, message: str) -> None:
        """
        Отправка лога в Telegram

        Args:
            message: Текст сообщения для отправки
        """
        try:
            # Разбиваем длинные сообщения
            if len(message) > self.max_message_length:
                chunks = [
                    message[i:i + self.max_message_length]
                    for i in range(0, len(message), self.max_message_length)
                ]
                for chunk in chunks:
                    await self.bot.send_message(
                        chat_id=self.chat_id,
                        text=chunk,
                        parse_mode='HTML'
                    )
            else:
                await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=message,
                    parse_mode='HTML'
                )
        except TelegramError as e:
            logger.error(f"Ошибка отправки лога в Telegram: {str(e)}")
            # Не пробрасываем ошибку дальше, чтобы не прерывать работу приложения
            pass


def setup_logger(
    bot_token: str,
    chat_id: str,
    log_level: str = "ERROR",
    max_message_length: int = 4000,
    log_file: str = "logs/app.log",
    log_rotation: str = "1 day",
    log_retention: str = "7 days"
) -> Logger:
    """
    Настройка логгера

    Args:
        bot_token: Токен Telegram бота
        chat_id: ID чата для отправки логов
        log_level: Уровень логирования
        max_message_length: Максимальная длина сообщения
        log_file: Путь к файлу логов
        log_rotation: Период ротации логов
        log_retention: Время хранения логов

    Returns:
        Logger: Настроенный логгер
    """
    # Проверяем, не был ли уже настроен логгер
    if hasattr(setup_logger, "_instance"):
        return setup_logger._instance

    # Настраиваем базовый логгер
    logger.remove()  # Удаляем стандартный обработчик

    # Добавляем вывод в консоль
    # sys.stdout уже должен быть переконфигурирован на UTF-8 в app/main.py
    # Если это не так, loguru автоматически обработает кодировку
    logger.add(
        sys.stdout,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | <cyan>{name}</cyan>:"
            "<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
        level=log_level,
        encoding='utf-8'  # Явно указываем кодировку для loguru
    )

    # Добавляем вывод в файл
    # Явно указываем encoding='utf-8' для файлового обработчика
    logger.add(
        log_file,
        rotation=None,  # Отключаем ротацию
        retention=log_retention,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
            "{name}:{function}:{line} - "
            "{message}"
        ),
        level=log_level,
        encoding='utf-8',  # Явно указываем кодировку для файла
        enqueue=True,
        delay=True  # Откладываем открытие файла до первой записи
    )

    # Создаем экземпляр логгера
    logger_instance = Logger(
        bot_token=bot_token,
        chat_id=chat_id,
        log_level=log_level,
        max_message_length=max_message_length
    )

    # Сохраняем экземпляр логгера
    setup_logger._instance = logger_instance
    return logger_instance


def log_exceptions(func):
    """
    Декоратор для логирования исключений в асинхронных функциях.

    Args:
        func: Декорируемая функция
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.exception(f"Ошибка в функции {func.__name__}: {str(e)}")
            raise
    return wrapper 