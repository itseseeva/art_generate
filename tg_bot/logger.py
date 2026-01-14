"""
Telegram logger для отправки уведомлений об ошибках в Telegram.
Отправляет ERROR и CRITICAL ошибки в Telegram с полной информацией.
"""

import logging
import traceback
import json
import os
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from logging import Handler, LogRecord
from collections import defaultdict

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    try:
        import requests
        REQUESTS_AVAILABLE = True
    except ImportError:
        REQUESTS_AVAILABLE = False


class TelegramHandler(Handler):
    """
    Обработчик логирования, который отправляет ERROR и CRITICAL ошибки в Telegram.
    """
    
    def __init__(self, bot_token: str, chat_id: str, level: int = logging.ERROR):
        """
        Инициализация Telegram handler.
        
        Args:
            bot_token: Токен Telegram бота
            chat_id: ID чата для отправки сообщений
            level: Минимальный уровень логирования (по умолчанию ERROR)
        """
        super().__init__(level)
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        self.max_message_length = 4096  # Максимальная длина сообщения в Telegram
        # Дедупликация ошибок: храним хеши ошибок и время последней отправки
        self._error_cache: Dict[str, datetime] = {}
        self._deduplication_window = timedelta(minutes=5)  # Подавляем одинаковые ошибки 5 минут
        
    def _get_error_hash(self, record: LogRecord) -> str:
        """
        Создает хеш ошибки для дедупликации.
        
        Args:
            record: Запись лога
            
        Returns:
            Хеш строку ошибки
        """
        # Создаем уникальный идентификатор ошибки на основе сообщения, файла и строки
        error_parts = [
            record.getMessage(),
            record.pathname,
            str(record.lineno),
        ]
        
        # Если есть информация об исключении, добавляем тип
        if record.exc_info:
            exc_type, exc_value, _ = record.exc_info
            error_parts.append(exc_type.__name__ if exc_type else 'Unknown')
            error_parts.append(str(exc_value)[:200])  # Первые 200 символов сообщения об ошибке
        
        error_string = "|".join(error_parts)
        return hashlib.md5(error_string.encode('utf-8')).hexdigest()
    
    def _should_send_error(self, error_hash: str) -> bool:
        """
        Проверяет, нужно ли отправлять ошибку (дедупликация).
        
        Args:
            error_hash: Хеш ошибки
            
        Returns:
            True если нужно отправить, False если пропустить
        """
        now = datetime.now()
        
        # Очищаем устаревшие записи
        self._error_cache = {
            h: time for h, time in self._error_cache.items()
            if now - time < self._deduplication_window
        }
        
        # Проверяем, есть ли уже такая ошибка в кэше
        if error_hash in self._error_cache:
            return False
        
        # Добавляем ошибку в кэш
        self._error_cache[error_hash] = now
        return True
    
    def emit(self, record: LogRecord) -> None:
        """
        Отправляет сообщение в Telegram при ERROR или CRITICAL ошибках.
        
        Args:
            record: Запись лога
        """
        try:
            # Отправляем только ERROR и CRITICAL
            if record.levelno < logging.ERROR:
                return
            
            # Проверяем дедупликацию
            error_hash = self._get_error_hash(record)
            if not self._should_send_error(error_hash):
                return
            
            message = self.format_message(record)
            
            # Разбиваем сообщение на части, если оно слишком длинное
            if len(message) > self.max_message_length:
                # Первая часть - основная информация
                main_part = message[:self.max_message_length - 200]
                # Вторая часть - traceback (обрезаем начало)
                traceback_part = message[self.max_message_length - 200:]
                self._send_message(main_part)
                if traceback_part:
                    self._send_message(f"<code>{traceback_part[:self.max_message_length]}</code>")
            else:
                self._send_message(message)
                
        except Exception:
            # Игнорируем ошибки при отправке, чтобы не создать бесконечный цикл
            self.handleError(record)
    
    def format_message(self, record: LogRecord) -> str:
        """
        Форматирует сообщение для отправки в Telegram.
        
        Args:
            record: Запись лога
            
        Returns:
            Отформатированное сообщение
        """
        # Уровень ошибки
        level_emoji = "🔴" if record.levelno >= logging.CRITICAL else "⚠️"
        level_name = "CRITICAL" if record.levelno >= logging.CRITICAL else "ERROR"
        
        # Основное сообщение
        message_parts = [
            f"{level_emoji} <b>{level_name}</b>",
            f"<b>Время:</b> {datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')}",
            f"<b>Сообщение:</b> {record.getMessage()}",
        ]
        
        # Информация об исключении
        if record.exc_info:
            exc_type, exc_value, exc_tb = record.exc_info
            message_parts.append(f"<b>Тип ошибки:</b> {exc_type.__name__ if exc_type else 'Unknown'}")
            message_parts.append(f"<b>Текст ошибки:</b> <code>{str(exc_value)}</code>")
            
            # Traceback
            tb_text = ''.join(traceback.format_exception(exc_type, exc_value, exc_tb))
            # Обрезаем traceback до последних 2000 символов
            if len(tb_text) > 2000:
                tb_text = "..." + tb_text[-2000:]
            message_parts.append(f"<b>Traceback:</b>\n<code>{tb_text}</code>")
        
        # Дополнительная информация из record (если есть)
        if hasattr(record, 'url'):
            message_parts.append(f"<b>URL:</b> <code>{record.url}</code>")
        if hasattr(record, 'method'):
            message_parts.append(f"<b>Метод:</b> {record.method}")
        if hasattr(record, 'user_id'):
            message_parts.append(f"<b>User ID:</b> {record.user_id}")
        if hasattr(record, 'request_data'):
            request_data_str = json.dumps(record.request_data, ensure_ascii=False, indent=2)
            # Обрезаем request_data если слишком длинное
            if len(request_data_str) > 500:
                request_data_str = request_data_str[:500] + "..."
            message_parts.append(f"<b>Данные запроса:</b>\n<code>{request_data_str}</code>")
        
        # Имя файла и номер строки
        message_parts.append(f"<b>Файл:</b> {record.pathname}:{record.lineno}")
        message_parts.append(f"<b>Функция:</b> {record.funcName}")
        
        return "\n".join(message_parts)
    
    def _send_message(self, text: str) -> None:
        """
        Отправляет сообщение в Telegram.
        
        Args:
            text: Текст сообщения
        """
        try:
            payload = {
                "chat_id": self.chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            }
            
            if HTTPX_AVAILABLE:
                # Используем httpx (асинхронный, но здесь синхронный вызов)
                try:
                    import httpx
                    with httpx.Client(timeout=10.0) as client:
                        response = client.post(self.api_url, json=payload)
                        response.raise_for_status()
                except Exception:
                    # Fallback на requests
                    if REQUESTS_AVAILABLE:
                        import requests
                        response = requests.post(self.api_url, json=payload, timeout=10)
                        response.raise_for_status()
            elif REQUESTS_AVAILABLE:
                import requests
                response = requests.post(self.api_url, json=payload, timeout=10)
                response.raise_for_status()
            else:
                # Если нет библиотек, просто игнорируем
                pass
                
        except Exception:
            # Игнорируем ошибки отправки, чтобы не создать бесконечный цикл
            pass


def setup_telegram_logger(bot_token: Optional[str] = None, chat_id: Optional[str] = None) -> Optional[TelegramHandler]:
    """
    Настраивает Telegram logger для приложения.
    
    Args:
        bot_token: Токен Telegram бота (если None, берется из переменных окружения)
        chat_id: ID чата (если None, берется из переменных окружения)
        
    Returns:
        TelegramHandler или None, если не удалось настроить
    """
    # Получаем токен и chat_id из аргументов или переменных окружения
    token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
    chat = chat_id or os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat:
        return None
    
    # Проверяем доступность библиотек
    if not HTTPX_AVAILABLE and not REQUESTS_AVAILABLE:
        return None
    
    # Создаем handler
    handler = TelegramHandler(bot_token=token, chat_id=chat, level=logging.ERROR)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    
    return handler
