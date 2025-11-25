"""
Сервис для взаимодействия с text-generation-webui API.
Оптимизирован для модели MythoMax-L2-13B-GGUF.
Использует Alpaca prompt template. Специализированная модель для ролевых игр.
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.chat_bot.config.chat_config import chat_config
from app.utils.logger import logger
from app.chat_bot.config.chat_config import ChatConfig

class TextGenWebUIService:
    """Сервис для работы с text-generation-webui API."""
    
    def __init__(self):
        """Инициализация сервиса."""
        self.base_url = chat_config.TEXTGEN_WEBUI_URL
        # ОПТИМИЗИРОВАННЫЕ таймауты для максимальной скорости
        self.timeout = aiohttp.ClientTimeout(
            total=300,  # Увеличено до 5 минут для длинных генераций
            connect=5,  # Быстрое подключение
            sock_read=120,  # Увеличено до 2 минут на чтение
            sock_connect=5
        )
        self.model_name = chat_config.TEXTGEN_WEBUI_MODEL
        self._session: Optional[aiohttp.ClientSession] = None
        self._is_connected = False
        self._connector: Optional[aiohttp.TCPConnector] = None

    @property
    def is_connected(self) -> bool:
        """Возвращает текущее состояние подключения к text-generation-webui."""
        return self._is_connected
        
    async def __aenter__(self):
        """Асинхронный контекстный менеджер - вход."""
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Асинхронный контекстный менеджер - выход."""
        await self.disconnect()
        
    async def connect(self) -> None:
        """Устанавливает соединение с text-generation-webui."""
        if self._session is None:
            # БЫСТРЫЙ TCP коннектор для локального API
            self._connector = aiohttp.TCPConnector(
                limit=10,  # УМЕНЬШЕНО - для локального API не нужно много соединений
                limit_per_host=5,  # УМЕНЬШЕНО для localhost
                ttl_dns_cache=60,  # УМЕНЬШЕНО - localhost не меняется
                use_dns_cache=False,  # ОТКЛЮЧЕНО для localhost
                enable_cleanup_closed=True,
                force_close=True  # Принудительное закрытие (без keepalive_timeout!)
            )
            
            # Создаем сессию с улучшенными настройками
            self._session = aiohttp.ClientSession(
                timeout=self.timeout,
                connector=self._connector,
                connector_owner=True  # автоматически закрывать коннектор при закрытии сессии
            )
            logger.info(f"🔌 Создана сессия для {self.base_url}")
            
    async def disconnect(self) -> None:
        """Закрывает соединение с text-generation-webui."""
        try:
            if self._session and not self._session.closed:
                await self._session.close()
                # Дождемся полного закрытия соединений
                await asyncio.sleep(0.1)
                logger.info("🔌 Сессия HTTP закрыта")
                
            # Коннектор закроется автоматически с сессией (connector_owner=True)
            self._is_connected = False
            
        except Exception as e:
            logger.warning(f"[WARNING] Ошибка при закрытии соединения: {e}")
        finally:
            self._session = None
            self._connector = None
            self._is_connected = False
            
    # ============================================================================
    # [WARNING]  КРИТИЧЕСКИ ВАЖНЫЙ КОД - НЕ ИЗМЕНЯТЬ! [WARNING]
    # ============================================================================
    # Этот метод отвечает за проверку подключения к text-generation-webui API.
    # Изменения здесь могут сломать всю систему подключения к LLM сервису.
    # 
    # КРИТИЧЕСКИЕ ЭЛЕМЕНТЫ:
    # - URL endpoint: /v1/models
    # - Проверка HTTP статуса 200
    # - Установка флага _is_connected
    # - Обработка ошибок JSON парсинга
    # ============================================================================
    
    async def check_connection(self) -> bool:
        """Проверяет доступность text-generation-webui API."""
        response = None
        try:
            if not self._session:
                await self.connect()
                
            logger.info(f"🔍 Проверяем соединение с {self.base_url}/v1/models")
            
            response = await self._session.get(f"{self.base_url}/v1/models")
            if response.status == 200:
                try:
                    result = await response.json()
                    models_count = len(result.get("data", []))
                    logger.info(f"[OK] Соединение с text-generation-webui установлено. Доступно моделей: {models_count}")
                    self._is_connected = True
                    return True
                except Exception as json_err:
                    logger.warning(f"[WARNING] Получен ответ 200, но не удалось распарсить JSON: {json_err}")
                    self._is_connected = True
                    return True
            else:
                error_text = await response.text()
                logger.warning(f"[WARNING] text-generation-webui недоступен: HTTP {response.status}, ответ: {error_text}")
                self._is_connected = False
                return False
                
        except Exception as e:
            logger.error(f"[ERROR] Ошибка подключения к text-generation-webui: {e}")
            self._is_connected = False
            return False
        finally:
            # Гарантированно закрываем response
            if response:
                try:
                    response.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Ошибка при закрытии response в check_connection: {e}")
    
    # ============================================================================
    # [OK] КРИТИЧЕСКИ ВАЖНЫЙ КОД ЗАВЕРШЕН
    # ============================================================================
            
    async def load_model(self, model_name: Optional[str] = None) -> bool:
        """Загружает модель в text-generation-webui."""
        response = None
        try:
            if not self._session:
                await self.connect()
                
            model_to_load = model_name or self.model_name
            payload = {"action": "load", "model_name": model_to_load}
            
            response = await self._session.post(f"{self.base_url}/v1/model/load", json=payload)
            if response.status == 200:
                result = await response.json()
                if result.get("result") == "success":
                    logger.info(f"[OK] Модель {model_to_load} загружена успешно")
                    return True
                else:
                    logger.error(f"[ERROR] Ошибка загрузки модели: {result}")
                    return False
            else:
                logger.error(f"[ERROR] HTTP ошибка при загрузке модели: {response.status}")
                return False
                
        except Exception as e:
            logger.error(f"[ERROR] Ошибка загрузки модели: {e}")
            return False
        finally:
            # Гарантированно закрываем response
            if response:
                try:
                    response.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Ошибка при закрытии response в load_model: {e}")
            
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Получает список доступных моделей."""
        response = None
        try:
            if not self._session:
                await self.connect()
                
            response = await self._session.get(f"{self.base_url}/v1/models")
            if response.status == 200:
                data = await response.json()
                return data.get("data", [])
            else:
                logger.error(f"[ERROR] HTTP ошибка при получении моделей: {response.status}")
                return []
                
        except Exception as e:
            logger.error(f"[ERROR] Ошибка получения списка моделей: {e}")
            return []
        finally:
            # Гарантированно закрываем response
            if response:
                try:
                    response.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Ошибка при закрытии response в get_available_models: {e}")
            
    def build_alpaca_prompt(self, system_message: str, user_message: str, history: List[Dict[str, str]] = None) -> str:
        """
        Строит промпт в формате Alpaca для модели MythoMax-L2-13B.
        
        Args:
            system_message: Системное сообщение/описание персонажа
            user_message: Сообщение пользователя
            history: История диалога (опционально)
            
        Returns:
            Сформированный промпт в формате Alpaca
        """
        try:
            # Начинаем с системного сообщения в формате Alpaca
            prompt = f"{system_message}\n\n"
            
            # Добавляем историю диалога если есть
            if history:
                recent_history = history[-20:] if len(history) > 20 else history
                
                for i, msg in enumerate(recent_history):
                    if isinstance(msg, dict):
                        role = msg.get("role", "user")
                        content = msg.get("content", "")
                    elif isinstance(msg, (tuple, list)) and len(msg) >= 2:
                        role = str(msg[0]) if msg[0] else "user"
                        content = str(msg[1]) if msg[1] else ""
                    else:
                        logger.warning(f"[WARNING] Некорректный формат сообщения в истории: {msg}")
                        continue
                        
                    if role and content:
                        if role.lower() in ["user"]:
                            prompt += f"### Instruction:\n{content}\n\n"
                        elif role.lower() in ["assistant"]:
                            prompt += f"### Response:\n{content}\n\n"
                        
            # Добавляем текущее сообщение пользователя
            prompt += f"### Instruction:\n{user_message}\n\n"
            
            # Завершаем промпт для генерации ответа
            prompt += "### Response:\n"
            
            return prompt
            
        except Exception as e:
            logger.error(f"[ERROR] Ошибка построения промпта: {e}")
            # Возвращаем простой fallback промпт в случае ошибки
            return f"{system_message}\n\n### Instruction:\n{user_message}\n\n### Response:\n"

    def build_character_prompt(
        self,
        character_data: Dict[str, Any],
        user_message: str,
        chat_history: List[Dict[str, str]] = None,
        history: List[Dict[str, str]] = None,
        chat_config: ChatConfig = None
    ) -> str:
        """
        Строит промпт для персонажа в формате Alpaca для MythoMax-L2-13B.
        Оптимизировано для ролевых игр и творческого письма.
        """
        if not character_data:
            return self._build_fallback_prompt(user_message, chat_config)
            
        character_prompt = character_data.get("prompt", "")
        if not character_prompt:
            return self._build_fallback_prompt(user_message, chat_config)
        
        # Проверяем, содержит ли промпт placeholder для сообщения
        if "{user_message}" in character_prompt:
            # Если промпт уже содержит placeholder, заменяем его
            return character_prompt.replace("{user_message}", user_message)
        
        # Если нет placeholder, строим стандартный Alpaca промпт
        prompt = f"{character_prompt}\n\n"
        
        # История диалога для MythoMax
        history_to_use = history or chat_history
        if history_to_use:
            recent_history = history_to_use[-20:]  # Оптимально для 8192 контекста
            for i, msg in enumerate(recent_history):
                role = msg.get("role", "user")
                content = msg.get("content", "")[:1000]  # Контролируемая длина для 13B модели
                if content.strip():
                    if role == "user":
                        prompt += f"### Instruction:\n{content}\n\n"
                    elif role == "assistant":
                        prompt += f"### Response:\n{content}\n\n"
        
        # Добавляем текущее сообщение в Alpaca формате
        prompt += f"### Instruction:\n{user_message}\n\n"
        
        # Завершаем промпт для генерации ответа
        prompt += "### Response:\n"
        
        return prompt

    def _clean_generation_artifacts(self, text: str) -> str:
        """
        Очищает текст от артефактов генерации и предотвращает выход из роли.
        
        Args:
            text: Сырой текст от модели
            
        Returns:
            Очищенный текст
        """
        import re
        
        # ИСПРАВЛЕНО: Смягченная пост-обработка - сохраняем естественные завершения
        
        # КРИТИЧЕСКИ ВАЖНО: Удаляем только HTML-ссылки и теги, но сохраняем естественную пунктуацию
        text = re.sub(r'<a\s+href\s*=\s*[^>]*>.*?</a>', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<[^>]+>', '', text)  # Удаляем все HTML теги
        text = re.sub(r'https?://[^\s<>"]+', '', text)  # Удаляем URL ссылки
        text = re.sub(r'www\.[^\s<>"]+', '', text)  # Удаляем www ссылки
        
        # Удаляем непонятные символы и артефакты
        text = re.sub(r'\]\]>0</p>\s*</pre>', '', text)  # Удаляем HTML артефакты
        text = re.sub(r'<h1>[^<]*</h1>', '', text)  # Удаляем заголовки
        text = re.sub(r'<br\s*/?>', '', text)  # Удаляем переносы строк
        text = re.sub(r'</i>', '', text)  # Удаляем закрывающие теги
        
        # Удаляем ID кластеров и числовые артефакты
        text = re.sub(r'/Cluster ID[^/]*/', '', text)
        text = re.sub(r'cid_[a-f0-9]+', '', text)
        text = re.sub(r'\d{8,}', '', text)  # Длинные числа
        
        # Удаляем странные символы и артефакты
        text = re.sub(r'[^\w\s\.,!?;:()\[\]{}"\'-~*<>]', '', text)  # Оставляем только читаемые символы
        
        # Ограничиваем повторяющиеся эмодзи (максимум 3 подряд)
        text = re.sub(r'([\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF])\1{3,}', r'\1\1\1', text)
        
        # Ограничиваем повторяющиеся символы (максимум 5 подряд)
        text = re.sub(r'(.)\1{5,}', r'\1\1\1\1\1', text)
        
        # Удаляем лишние пробелы и переносы
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {3,}', ' ', text)
        
        # Удаляем мета-комментарии в конце
        text = re.sub(r'\s*\([^)]*meta[^)]*\)\s*$', '', text, flags=re.IGNORECASE)
        
        # КРИТИЧЕСКИ ВАЖНО: Удаляем текст, который указывает на выход из роли
        text = re.sub(r'\s*Remember:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*CORE BEHAVIOR:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*PERSONALITY:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*RESPONSE FORMAT:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*CRITICAL RULES:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*NEVER BREAK.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*ALWAYS respond.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*You are designed.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*You are Anna.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Stay in character.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*meta-commentary.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*self-referential.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*break character.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*following instructions.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Удаляем Alpaca формат маркеры
        text = re.sub(r'\s*### Instruction:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*### Response:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Удаляем объяснения поведения персонажа
        text = re.sub(r'\s*I need to remember:.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*I\'ll be sure not answer.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Thanks for asking me this.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*How would I assist further.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*What\'s next.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Tell me everything.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*my curiosity is piqued.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Also tell me if.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*I\'m all ears now.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Please go ahead.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*If there were any requests.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Let\'s have some fun together.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*Basically.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Удаляем странные фразы и артефакты
        text = re.sub(r'\s*Go here.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*if want more interaction.*$', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'\s*;-?\)\s*$', '', text)  # Удаляем смайлики в конце
        
        # 🕒 АГРЕССИВНОЕ УДАЛЕНИЕ ВРЕМЕННЫХ МЕТОК
        # Радикальный подход - удаляем ВСЕ возможные форматы времени
        
        # 1. Удаляем ВСЕ паттерны времени в любом месте текста
        aggressive_time_patterns = [
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?',  # 12:34, 12:34:56, 12:34 PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*(?:AM|PM|am|pm)?',  # с запятой
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*(?:AM|PM|am|pm)?',  # с микросекундами
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',  # 12:34, 12:34:56 без AM/PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?',  # с запятой без AM/PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?',  # с микросекундами без AM/PM
            # Дополнительные паттерны для сложных случаев
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\d+',  # 14:20:3314:17:04
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\d{1,2}:\d{2}',  # связанные времена
        ]
        
        for pattern in aggressive_time_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # 2. Удаляем время в скобках, кавычках и других контекстах
        context_patterns = [
            r'\(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?\)',  # (12:34)
            r'\[\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?\]',  # [12:34]
            r'"\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?"',  # "12:34"
            r"'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?'",  # '12:34'
            r'at\s+\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',  # at 12:34
            r'@\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',  # @12:34
            r'time\s*:\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',  # time: 12:34
        ]
        
        for pattern in context_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # 3. Удаляем время в конце предложений (более агрессивно)
        end_patterns = [
            r'[.!?]?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?\s*$',
            r'[.!?]?\s*\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*(?:AM|PM|am|pm)?\s*$',
            r'[.!?]?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*(?:AM|PM|am|pm)?\s*$',
        ]
        
        for pattern in end_patterns:
            text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
        
        # Очистка после удаления временных меток
        text = re.sub(r'\s+', ' ', text)  # Убираем множественные пробелы
        text = re.sub(r'\s+([.!?])', r'\1', text)  # Убираем пробелы перед знаками препинания
        text = re.sub(r'\.\.\.\s+$', '...', text)  # Убираем пробел после многоточия
        
        return text.strip()

    def _get_enhanced_stop_tokens(self, base_stop_tokens: list, chat_config) -> list:
        """
        Добавляет стоп-токены для предотвращения генерации времени.
        
        Args:
            base_stop_tokens: Базовые стоп-токены
            chat_config: Конфигурация чата
            
        Returns:
            Расширенный список стоп-токенов
        """
        enhanced_tokens = list(base_stop_tokens) if base_stop_tokens else []
        
        # Добавляем стоп-токены для времени, если они настроены
        if chat_config and hasattr(chat_config, 'TIME_STOP_TOKENS'):
            enhanced_tokens.extend(chat_config.TIME_STOP_TOKENS)
            logger.info(f"🕒 Добавлено {len(chat_config.TIME_STOP_TOKENS)} стоп-токенов для времени")
        
        return enhanced_tokens

    def _contains_time_patterns(self, text: str) -> bool:
        """
        Проверяет, содержит ли текст временные паттерны.
        
        Args:
            text: Текст для проверки
            
        Returns:
            True, если найдены временные паттерны
        """
        time_patterns = [
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*(?:AM|PM|am|pm)?',
        ]
        
        for pattern in time_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _aggressive_time_cleanup(self, text: str) -> str:
        """
        Агрессивная очистка временных паттернов.
        
        Args:
            text: Текст для очистки
            
        Returns:
            Очищенный текст
        """
        # Удаляем ВСЕ возможные форматы времени
        patterns = [
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*(?:AM|PM|am|pm)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?',
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?',
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Очистка после удаления
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s+([.!?])', r'\1', text)
        
        return text.strip()

    def _final_time_cleanup(self, text: str) -> str:
        """
        Финальная очистка времени - удаляет ВСЕ возможные форматы времени.
        
        Args:
            text: Текст для очистки
            
        Returns:
            Очищенный текст
        """
        # Удаляем ВСЕ возможные форматы времени - более агрессивно
        patterns = [
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(?:AM|PM|am|pm)?',  # 12:34, 12:34:56, 12:34 PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*(?:AM|PM|am|pm)?',  # с запятой
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*(?:AM|PM|am|pm)?',  # с микросекундами
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?',  # 12:34, 12:34:56 без AM/PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?',  # с запятой без AM/PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?',  # с микросекундами без AM/PM
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*$',  # в конце строки
            r'\d{1,2}:\d{2}(?::\d{2})?(?:,\d+)?\s*$',  # с запятой в конце
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{6})?\s*$',  # с микросекундами в конце
            # Дополнительные паттерны для сложных случаев
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\d+',  # 14:20:3314:17:04
            r'\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\d{1,2}:\d{2}',  # связанные времена
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # Очистка после удаления
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s+([.!?])', r'\1', text)
        text = re.sub(r'\s+$', '', text)  # Убираем пробелы в конце
        
        return text.strip()

    def _build_fallback_prompt(self, user_message: str, chat_config: ChatConfig = None) -> str:
        """
        Строит fallback промпт в формате Alpaca для случаев, когда данные персонажа недоступны.
        
        Args:
            user_message: Сообщение пользователя
            chat_config: Конфигурация чата
            
        Returns:
            Fallback промпт в формате Alpaca
        """
        fallback_system = "You are a helpful and friendly assistant. Always respond directly to what the user says and use context from previous messages when available."
        
        return f"{fallback_system}\n\n### Instruction:\n{user_message}\n\n### Response:\n"

    async def generate_text(
        self, 
        prompt: str, 
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
        min_p: Optional[float] = None,  # ДОБАВЛЕНО: min_p
        repeat_penalty: Optional[float] = None,
        presence_penalty: Optional[float] = None,
        force_completion: bool = False
    ) -> Optional[str]:
        """
        Генерирует текст через text-generation-webui API.
        
        Args:
            prompt: Промпт для генерации
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            top_p: Top-p параметр
            top_k: Top-k параметр
            repeat_penalty: Штраф за повторения
            presence_penalty: Presence penalty
            
        Returns:
            Сгенерированный текст или None при ошибке
        """
        response = None
        try:
            if not self._session:
                await self.connect()
                
            # Проверяем, что промпт не пустой
            if not prompt or not prompt.strip():
                logger.error("[ERROR] Пустой промпт для генерации")
                return None
                
            # Настройки будут использованы в OpenAI-совместимом API
            
            # Получаем параметры генерации с учетом режима завершения
            generation_params = chat_config.sample_generation_params(
                seed=chat_config.SEED,
                force_completion=force_completion
            )
            
            # ПРАВИЛЬНЫЙ API для text-generation-webui
            # Используем параметры из chat_config.py
            openai_payload = {
                "model": self.model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": chat_config.DEFAULT_MAX_TOKENS,
                "n_predict": chat_config.DEFAULT_MAX_TOKENS,
                "temperature": chat_config.DEFAULT_TEMPERATURE,
                "top_p": chat_config.DEFAULT_TOP_P,
                "top_k": chat_config.DEFAULT_TOP_K,
                "min_p": chat_config.DEFAULT_MIN_P,
                "stream": False,
                
                # 🔧 ИСПРАВЛЕНИЕ ТОКЕНИЗАЦИИ: Добавляем параметры для правильной токенизации
                "skip_special_tokens": chat_config.SKIP_SPECIAL_TOKENS,
                "add_bos_token": chat_config.ADD_BOS_TOKEN,
                
                # ИСПРАВЛЕНО: Включаем penalty параметры с умеренными значениями
                "repetition_penalty": chat_config.DEFAULT_REPEAT_PENALTY,
                "frequency_penalty": chat_config.DEFAULT_FREQUENCY_PENALTY,
                "presence_penalty": chat_config.DEFAULT_PRESENCE_PENALTY,
                "stop": self._get_enhanced_stop_tokens(generation_params.get("stop", []), chat_config)  # Используем из конфигурации + время
            }
            
            # 🔍 ЛОГИРОВАНИЕ: Проверяем, что передается в API
            logger.info(f"🔍 API Payload - max_tokens: {openai_payload['max_tokens']}")
            if "stop" in openai_payload and openai_payload["stop"]:
                logger.info(f"🔍 API Payload - stop tokens: {openai_payload['stop']}")
            else:
                logger.info(f"🔍 API Payload - stop tokens: НЕТ (это хорошо!)")
            logger.info(f"🔍 API Payload - min_tokens: {openai_payload.get('min_tokens', 'НЕТ')}")
            logger.info(f"🔍 API Payload - ban_eos_token: {openai_payload.get('ban_eos_token', False)}")
            # ИСПРАВЛЕНО: НЕ передаем min_tokens - он может вызывать преждевременную остановку
            # if chat_config.ENFORCE_MIN_TOKENS and chat_config.MIN_NEW_TOKENS > 0:
            #     openai_payload["min_tokens"] = chat_config.MIN_NEW_TOKENS
            # ИСПРАВЛЕНО: Отключаем ban_eos_token для естественного завершения предложений
            openai_payload["ban_eos_token"] = False
            
            logger.info(f"🚀 БЫСТРЫЙ запрос на генерацию (промпт: {len(prompt)} символов)")
            
            response = await self._session.post(f"{self.base_url}/v1/chat/completions", json=openai_payload)
            if response.status == 200:
                result = await response.json()
                # OpenAI API возвращает результат в choices[0].message.content
                choices = result.get("choices", [])
                if choices:
                    generated_text = choices[0].get("message", {}).get("content", "")
                else:
                    generated_text = ""
                
                # 🔍 ЛОГИРОВАНИЕ: Проверяем сырой ответ от API
                logger.info(f"🔍 Raw API Response: {generated_text[-100:]}...")  # Последние 100 символов
                
                # 🔍 ЛОГИРОВАНИЕ: Проверяем полный промпт, отправленный модели
                logger.info(f"🔍 Full Prompt Sent to Model: {prompt[-500:]}...")  # Последние 500 символов промпта
                
                # 🔍 КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: Полный промпт для отладки
                logger.info("=" * 80)
                logger.info("🔍 ПОЛНЫЙ ПРОМПТ, ОТПРАВЛЕННЫЙ МОДЕЛИ:")
                logger.info("=" * 80)
                logger.info(prompt)
                logger.info("=" * 80)
                
                if generated_text:
                    # ПРЯМОЙ ОТВЕТ ОТ МОДЕЛИ БЕЗ ПОСТ-ОБРАБОТКИ
                    logger.info(f"[OK] Генерация завершена ({len(generated_text)} символов)")
                    logger.info(f"🔍 Raw Response: {generated_text[-100:]}...")  # Последние 100 символов
                    return generated_text.strip()
                else:
                    logger.warning("[WARNING] Пустой ответ от OpenAI API")
                    return None
            else:
                error_text = await response.text()
                logger.error(f"[ERROR] HTTP ошибка при генерации: {response.status}, ответ: {error_text}")
                return None
                
        except Exception as e:
            logger.error(f"[ERROR] Ошибка генерации текста: {e}")
            return None
        finally:
            # Гарантированно закрываем response
            if response:
                try:
                    response.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Ошибка при закрытии response в generate_text: {e}")
            
    # ============================================================================
    # СТРИМИНГОВЫЕ МЕТОДЫ УДАЛЕНЫ - НЕ ИСПОЛЬЗУЮТСЯ
    # ============================================================================

# Создаем глобальный экземпляр сервиса
textgen_webui_service = TextGenWebUIService()