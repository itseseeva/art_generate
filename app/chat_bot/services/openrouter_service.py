"""
Сервис для взаимодействия с OpenRouter API.

Все пользователи получают модель: L3 Euryale 70B (sao10k/l3-euryale-70b)
При rate limit отправляется уведомление администратору в Telegram.
"""

import os
import aiohttp
import json
from typing import Optional, Dict, List, AsyncGenerator, Tuple
from app.chat_bot.config.chat_config import chat_config
from app.chat_bot.config.cydonia_config import get_cydonia_overrides
from app.chat_bot.config.deepseek_config import get_deepseek_overrides
from app.models.subscription import SubscriptionType
from app.utils.logger import logger
from datetime import datetime


async def send_telegram_alert(message: str) -> None:
    """
    Отправляет уведомление администратору в Telegram.
    
    Args:
        message: Текст уведомления
    """
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not bot_token or not chat_id:
        logger.warning("[TELEGRAM] Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID")
        return
    
    try:
        api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        # Форматируем сообщение
        formatted_message = (
            f"🚨 <b>RATE LIMIT ALERT</b>\n\n"
            f"<b>Время:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"<b>Сообщение:</b> {message}\n"
        )
        
        payload = {
            "chat_id": chat_id,
            "text": formatted_message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status != 200:
                    response_text = await response.text()
                    logger.error(f"[TELEGRAM] Ошибка отправки: {response.status}, ответ: {response_text}")
                else:
                    logger.info("[TELEGRAM] Уведомление отправлено в Telegram")
    except Exception as e:
        logger.error(f"[TELEGRAM] Ошибка при отправке уведомления: {e}")


def get_model_for_subscription(subscription_type: Optional[SubscriptionType]) -> str:
    """
    Возвращает модель на основе типа подписки.
    
    Args:
        subscription_type: Тип подписки пользователя
        
    Returns:
        Название модели для использования
    """
    # Все пользователи получают L3 Euryale 70B
    return "sao10k/l3-euryale-70b"


class OpenRouterService:
    """Сервис для работы с OpenRouter API."""
    
    def __init__(self):
        """Инициализация сервиса."""
        self.base_url = "https://openrouter.ai/api/v1"
        self.api_key = os.getenv("OPENROUTER_KEY")
        # Модель по умолчанию (для FREE подписки)
        self.model = chat_config.OPENROUTER_MODEL
        self._session: Optional[aiohttp.ClientSession] = None
        
        # Прокси отключен для текстовой модели
        self.proxy = None
        logger.info("[OPENROUTER] Proxy disabled for text model")
        
        if not self.api_key:
            logger.warning("[OPENROUTER] OPENROUTER_KEY not set in env vars")
        
        logger.info(f"[OPENROUTER] Default model: {self.model}")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Получает или создает сессию aiohttp."""
        if self._session is None or self._session.closed:
            # Увеличиваем таймауты для Docker (может быть медленное подключение)
            timeout = aiohttp.ClientTimeout(total=300, connect=30, sock_read=120, sock_connect=30)
            # Настройки для лучшей совместимости с Docker сетью
            connector = aiohttp.TCPConnector(
                limit=100,
                limit_per_host=30,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=30
            )
            # Отключаем автоматическое использование HTTP_PROXY/HTTPS_PROXY из окружения
            # Прокси не используется для текстовой модели
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                connector=connector,
                trust_env=False  # Отключаем автоматическое использование HTTP_PROXY/HTTPS_PROXY
            )
        return self._session
    
    async def close(self):
        """Закрывает сессию."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    async def check_connection(self) -> bool:
        """
        Проверяет доступность OpenRouter API.
        
        Returns:
            True если API доступен, False в противном случае
        """
        if not self.api_key:
            logger.error("[OPENROUTER] API key not set")
            return False
        
        try:
            session = await self._get_session()
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Простой запрос для проверки подключения
            async with session.get(
                f"{self.base_url}/models",
                headers=headers,
                proxy=self.proxy if self.proxy else None
            ) as response:
                if response.status == 200:
                    logger.info("[OPENROUTER] Connection established successfully")
                    return True
                else:
                    error_text = await response.text()
                    logger.warning(f"[OPENROUTER] API unavailable: HTTP {response.status}, response: {error_text}")
                    return False
        except Exception as e:
            logger.error(f"[OPENROUTER] Connection error: {e}")
            return False
    
    async def generate_text(
        self,
        prompt: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
        repeat_penalty: Optional[float] = None,
        presence_penalty: Optional[float] = None,
        subscription_type: Optional[SubscriptionType] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> Optional[str]:
        """
        Генерирует текст через OpenRouter API.
        
        Args:
            prompt: Промпт для генерации (устаревший способ, используйте messages)
            messages: Массив сообщений в формате OpenAI [{"role": "system/user/assistant", "content": "..."}]
            system_prompt: Системное сообщение (будет добавлено первым, если messages не указан)
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            top_p: Top-p параметр
            top_k: Top-k параметр (не поддерживается OpenAI API, игнорируется)
            repeat_penalty: Штраф за повторения (не поддерживается OpenAI API, игнорируется)
            presence_penalty: Presence penalty
            **kwargs: Дополнительные параметры
            
        Returns:
            Сгенерированный текст или None при ошибке
        """
        if not self.api_key:
            logger.error("[OPENROUTER] API key not set")
            return None
        
        # Используем значения по умолчанию из конфигурации, если не указаны
        # ВАЖНО: max_tokens должен быть передан из вызывающего кода на основе подписки
        # Если max_tokens не передан (None), используем значение по умолчанию
        # Параметры из kwargs имеют приоритет над значениями по умолчанию
        if max_tokens is None:
            max_tokens = chat_config.DEFAULT_MAX_TOKENS
        temperature = kwargs.get("temperature", temperature) if "temperature" in kwargs else (temperature if temperature is not None else chat_config.DEFAULT_TEMPERATURE)
        top_p = kwargs.get("top_p", top_p) if "top_p" in kwargs else (top_p if top_p is not None else chat_config.DEFAULT_TOP_P)
        top_k = kwargs.get("top_k", top_k) if "top_k" in kwargs else (top_k if top_k is not None else chat_config.DEFAULT_TOP_K)
        min_p = kwargs.get("min_p", None) if "min_p" in kwargs else chat_config.DEFAULT_MIN_P
        presence_penalty = kwargs.get("presence_penalty", presence_penalty) if "presence_penalty" in kwargs else (presence_penalty if presence_penalty is not None else chat_config.DEFAULT_PRESENCE_PENALTY)
        frequency_penalty = kwargs.get("frequency_penalty", None) if "frequency_penalty" in kwargs else chat_config.DEFAULT_FREQUENCY_PENALTY
        repetition_penalty = kwargs.get("repetition_penalty", repeat_penalty) if "repetition_penalty" in kwargs else (repeat_penalty if repeat_penalty is not None else chat_config.DEFAULT_REPEAT_PENALTY)
        
        # Выбираем модель: если передан явно - используем её, иначе на основе подписки
        if model:
            # Проверяем, что модель разрешена для использования
            allowed_models = [
                "sao10k/l3-euryale-70b",
                "thedrummer/cydonia-24b-v4.1",
                "deepseek/deepseek-chat-v3-0324"
            ]
            if model in allowed_models:
                model_to_use = model
            else:
                logger.warning(f"[OPENROUTER] Disallowed model: {model}, using default")
                model_to_use = get_model_for_subscription(subscription_type)
        else:
            model_to_use = get_model_for_subscription(subscription_type)
        
        # ПРИМЕНЯЕМ СПЕЦИФИЧНЫЕ НАСТРОЙКИ ДЛЯ МОДЕЛИ CYDONIA
        if model_to_use == "thedrummer/cydonia-24b-v4.1":
            cydonia_overrides = get_cydonia_overrides()
            # Переопределяем только те параметры, которые не были переданы явно в generate_text
            # или если они были переданы как None
            if "temperature" not in kwargs or kwargs["temperature"] is None:
                temperature = cydonia_overrides["temperature"]
            if "top_p" not in kwargs or kwargs["top_p"] is None:
                top_p = cydonia_overrides["top_p"]
            if "top_k" not in kwargs or kwargs["top_k"] is None:
                top_k = cydonia_overrides["top_k"]
            if "repetition_penalty" not in kwargs or kwargs["repetition_penalty"] is None:
                repetition_penalty = cydonia_overrides["repetition_penalty"]
            if "presence_penalty" not in kwargs or kwargs["presence_penalty"] is None:
                presence_penalty = cydonia_overrides["presence_penalty"]
            if "frequency_penalty" not in kwargs or kwargs["frequency_penalty"] is None:
                frequency_penalty = cydonia_overrides["frequency_penalty"]
            if "min_p" not in kwargs or kwargs["min_p"] is None:
                min_p = cydonia_overrides["min_p"]
            if "stop" not in kwargs or kwargs["stop"] is None:
                kwargs["stop"] = cydonia_overrides["stop"]
            
            # Cydonia specific overrides applied
        
        # ПРИМЕНЯЕМ СПЕЦИФИЧНЫЕ НАСТРОЙКИ ДЛЯ МОДЕЛИ DEEPSEEK
        elif model_to_use == "deepseek/deepseek-chat-v3-0324":
            deepseek_overrides = get_deepseek_overrides()
            # Переопределяем только те параметры, которые не были переданы явно
            if "temperature" not in kwargs or kwargs["temperature"] is None:
                temperature = deepseek_overrides["temperature"]
            if "top_p" not in kwargs or kwargs["top_p"] is None:
                top_p = deepseek_overrides["top_p"]
            if "top_k" not in kwargs or kwargs["top_k"] is None:
                top_k = deepseek_overrides["top_k"]
            if "repetition_penalty" not in kwargs or kwargs["repetition_penalty"] is None:
                repetition_penalty = deepseek_overrides["repetition_penalty"]
            if "presence_penalty" not in kwargs or kwargs["presence_penalty"] is None:
                presence_penalty = deepseek_overrides["presence_penalty"]
            if "frequency_penalty" not in kwargs or kwargs["frequency_penalty"] is None:
                frequency_penalty = deepseek_overrides["frequency_penalty"]
            if "min_p" not in kwargs or kwargs["min_p"] is None:
                min_p = deepseek_overrides["min_p"]
            if "stop" not in kwargs or kwargs["stop"] is None:
                kwargs["stop"] = deepseek_overrides["stop"]
            
            # DeepSeek specific overrides applied
        
        try:
            session = await self._get_session()
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("BASE_URL", "http://localhost:8000"),
                "X-Title": os.getenv("APP_TITLE", "Art Generation Chat")
            }
            
            # Формируем массив сообщений для OpenAI-совместимого API
            if messages:
                # Используем переданный массив сообщений
                formatted_messages = messages.copy()
                # Если есть system_prompt и его нет в messages, добавляем первым
                if system_prompt and not any(msg.get("role") == "system" for msg in formatted_messages):
                    formatted_messages.insert(0, {"role": "system", "content": system_prompt})
            elif system_prompt:
                # Если есть только system_prompt и prompt
                formatted_messages = [{"role": "system", "content": system_prompt}]
                if prompt:
                    formatted_messages.append({"role": "user", "content": prompt})
            elif prompt:
                # Устаревший способ: весь prompt как одно сообщение пользователя
                formatted_messages = [{"role": "user", "content": prompt}]
            else:
                logger.error("[OPENROUTER] No prompt or messages provided")
                return None
            
            payload = {
                "model": model_to_use,
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "presence_penalty": presence_penalty,
                "frequency_penalty": frequency_penalty,
                "repetition_penalty": repetition_penalty,
            }
            
            # Добавляем min_p и top_k, если они поддерживаются
            if min_p is not None:
                payload["min_p"] = min_p
            if top_k is not None:
                payload["top_k"] = top_k
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            logger.info(
                f"\n{'='*80}\n"
                f"[API ЗАПРОС] 🚀 Отправка в OpenRouter:\n"
                f"  ├─ Модель: {model_to_use}\n"
                f"  ├─ Сообщений: {len(formatted_messages)} шт.\n"
                f"  ├─ Max tokens (ответ): {max_tokens}\n"
                f"  └─ Подписка: {subscription_type.value if subscription_type else 'FREE'}\n"
                f"{'='*80}"
            )
            
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                proxy=self.proxy if self.proxy else None
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    # Извлекаем данные из ответа
                    model_used = result.get("model", "unknown")
                    usage = result.get("usage", {})
                    input_tokens = usage.get("prompt_tokens", 0)
                    output_tokens = usage.get("completion_tokens", 0)
                    total_tokens = usage.get("total_tokens", 0)
                    
                    # OpenAI API возвращает результат в choices[0].message.content
                    choices = result.get("choices", [])
                    if choices:
                        generated_text = choices[0].get("message", {}).get("content", "")
                        
                        if generated_text:
                            logger.info(
                                f"\n{'='*80}\n"
                                f"[API ОТВЕТ] ✅ Получен ответ от {model_used}:\n"
                                f"  ├─ Длина ответа: {len(generated_text)} символов\n"
                                f"  ├─ Input tokens: {input_tokens}\n"
                                f"  ├─ Output tokens: {output_tokens}\n"
                                f"  └─ ИТОГО: {total_tokens} токенов\n"
                                f"{'='*80}"
                            )
                            return generated_text.strip()
                        else:
                            logger.warning("[OPENROUTER] Empty response from API")
                            return None
                    else:
                        logger.warning("[OPENROUTER] No choices in API response")
                        return None
                else:
                    error_text = await response.text()
                    logger.error(f"[OPENROUTER] HTTP error during generation: {response.status}, response: {error_text}")
                    
                    # Проверяем, является ли это ошибкой подключения
                    if response.status in [503, 502, 504]:
                        return "__CONNECTION_ERROR__"
                    
                    return None
                    
        except aiohttp.ClientProxyConnectionError as e:
            logger.error(f"[OPENROUTER] Proxy connection error: {e}")
            logger.error(f"[OPENROUTER] Proxy used: {self.proxy}")
            return "__CONNECTION_ERROR__"
        except aiohttp.ClientError as e:
            error_str = str(e).lower()
            # Проверяем, является ли это ошибкой подключения
            if any(keyword in error_str for keyword in [
                'cannot connect', 'connect call failed', 'connection refused', 
                'connection error', 'connection timeout'
            ]):
                logger.error(f"[OPENROUTER] Connection error: {e}")
                return "__CONNECTION_ERROR__"
            else:
                logger.error(f"[OPENROUTER] Text generation error: {e}")
                return None
        except Exception as e:
            logger.error(f"[OPENROUTER] Unexpected error: {e}")
            return None
    
    async def generate_text_stream(
        self,
        prompt: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        presence_penalty: Optional[float] = None,
        subscription_type: Optional[SubscriptionType] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Генерирует текст через OpenRouter API с потоковой передачей (streaming).
        
        Args:
            prompt: Промпт для генерации (устаревший способ, используйте messages)
            messages: Массив сообщений в формате OpenAI [{"role": "system/user/assistant", "content": "..."}]
            system_prompt: Системное сообщение (будет добавлено первым, если messages не указан)
            max_tokens: Максимальное количество токенов
            temperature: Температура генерации
            top_p: Top-p параметр
            presence_penalty: Presence penalty
            subscription_type: Тип подписки для выбора модели
            **kwargs: Дополнительные параметры
            
        Yields:
            Части сгенерированного текста по мере поступления
        """
        if not self.api_key:
            logger.error("[OPENROUTER] API key not set")
            yield json.dumps({"error": "API key not set"})
            return
        
        # Используем значения по умолчанию из конфигурации, если не указаны
        # ВАЖНО: max_tokens должен быть передан из вызывающего кода на основе подписки
        # Если max_tokens не передан (None), используем значение по умолчанию
        # Параметры из kwargs имеют приоритет над значениями по умолчанию
        if max_tokens is None:
            max_tokens = chat_config.DEFAULT_MAX_TOKENS
        temperature = (
            kwargs.get("temperature", temperature)
            if "temperature" in kwargs
            else (
                temperature
                if temperature is not None
                else chat_config.DEFAULT_TEMPERATURE
            )
        )
        top_p = (
            kwargs.get("top_p", top_p)
            if "top_p" in kwargs
            else (
                top_p if top_p is not None else chat_config.DEFAULT_TOP_P
            )
        )
        top_k = (
            kwargs.get("top_k", None)
            if "top_k" in kwargs
            else chat_config.DEFAULT_TOP_K
        )
        min_p = (
            kwargs.get("min_p", None)
            if "min_p" in kwargs
            else chat_config.DEFAULT_MIN_P
        )
        presence_penalty = (
            kwargs.get("presence_penalty", presence_penalty)
            if "presence_penalty" in kwargs
            else (
                presence_penalty
                if presence_penalty is not None
                else chat_config.DEFAULT_PRESENCE_PENALTY
            )
        )
        frequency_penalty = (
            kwargs.get("frequency_penalty", None)
            if "frequency_penalty" in kwargs
            else chat_config.DEFAULT_FREQUENCY_PENALTY
        )
        repetition_penalty = (
            kwargs.get("repetition_penalty", None)
            if "repetition_penalty" in kwargs
            else chat_config.DEFAULT_REPEAT_PENALTY
        )
        
        # Выбираем модель: если передан явно - используем её, иначе на основе подписки
        if model:
            # Проверяем, что модель разрешена для использования
            allowed_models = [
                "sao10k/l3-euryale-70b",
                "thedrummer/cydonia-24b-v4.1",
                "deepseek/deepseek-chat-v3-0324"
            ]
            if model not in allowed_models:
                logger.warning(f"[OPENROUTER STREAM] Disallowed model: {model}, using default")
                model_to_use = get_model_for_subscription(subscription_type)
            else:
                model_to_use = model
                # Using selected model
        else:
            # Выбираем модель на основе подписки
            model_to_use = get_model_for_subscription(subscription_type)
        
        # ПРИМЕНЯЕМ СПЕЦИФИЧНЫЕ НАСТРОЙКИ ДЛЯ МОДЕЛИ CYDONIA
        if model_to_use == "thedrummer/cydonia-24b-v4.1":
            cydonia_overrides = get_cydonia_overrides()
            # Переопределяем только те параметры, которые не были переданы явно
            if "temperature" not in kwargs or kwargs["temperature"] is None:
                temperature = cydonia_overrides["temperature"]
            if "top_p" not in kwargs or kwargs["top_p"] is None:
                top_p = cydonia_overrides["top_p"]
            if "top_k" not in kwargs or kwargs["top_k"] is None:
                top_k = cydonia_overrides["top_k"]
            if "repetition_penalty" not in kwargs or kwargs["repetition_penalty"] is None:
                repetition_penalty = cydonia_overrides["repetition_penalty"]
            if "presence_penalty" not in kwargs or kwargs["presence_penalty"] is None:
                presence_penalty = cydonia_overrides["presence_penalty"]
            if "frequency_penalty" not in kwargs or kwargs["frequency_penalty"] is None:
                frequency_penalty = cydonia_overrides["frequency_penalty"]
            if "min_p" not in kwargs or kwargs["min_p"] is None:
                min_p = cydonia_overrides["min_p"]
            if "stop" not in kwargs or kwargs["stop"] is None:
                kwargs["stop"] = cydonia_overrides["stop"]
            
            # Cydonia specific overrides applied
        
        # ПРИМЕНЯЕМ СПЕЦИФИЧНЫЕ НАСТРОЙКИ ДЛЯ МОДЕЛИ DEEPSEEK
        elif model_to_use == "deepseek/deepseek-chat-v3-0324":
            deepseek_overrides = get_deepseek_overrides()
            # Переопределяем только те параметры, которые не были переданы явно
            if "temperature" not in kwargs or kwargs["temperature"] is None:
                temperature = deepseek_overrides["temperature"]
            if "top_p" not in kwargs or kwargs["top_p"] is None:
                top_p = deepseek_overrides["top_p"]
            if "top_k" not in kwargs or kwargs["top_k"] is None:
                top_k = deepseek_overrides["top_k"]
            if "repetition_penalty" not in kwargs or kwargs["repetition_penalty"] is None:
                repetition_penalty = deepseek_overrides["repetition_penalty"]
            if "presence_penalty" not in kwargs or kwargs["presence_penalty"] is None:
                presence_penalty = deepseek_overrides["presence_penalty"]
            if "frequency_penalty" not in kwargs or kwargs["frequency_penalty"] is None:
                frequency_penalty = deepseek_overrides["frequency_penalty"]
            if "min_p" not in kwargs or kwargs["min_p"] is None:
                min_p = deepseek_overrides["min_p"]
            if "stop" not in kwargs or kwargs["stop"] is None:
                kwargs["stop"] = deepseek_overrides["stop"]
            
            # DeepSeek specific overrides applied
        
        try:
            session = await self._get_session()
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("BASE_URL", "http://localhost:8000"),
                "X-Title": os.getenv("APP_TITLE", "Art Generation Chat")
            }
            
            # Формируем массив сообщений для OpenAI-совместимого API
            if messages:
                formatted_messages = messages.copy()
                if system_prompt and not any(msg.get("role") == "system" for msg in formatted_messages):
                    formatted_messages.insert(0, {"role": "system", "content": system_prompt})
            elif system_prompt:
                formatted_messages = [{"role": "system", "content": system_prompt}]
                if prompt:
                    formatted_messages.append({"role": "user", "content": prompt})
            elif prompt:
                formatted_messages = [{"role": "user", "content": prompt}]
            else:
                logger.error("[OPENROUTER] No prompt or messages provided")
                yield json.dumps({"error": "No prompt or messages provided"})
                return
            
            payload = {
                "model": model_to_use,
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "presence_penalty": presence_penalty,
                "frequency_penalty": frequency_penalty,
                "repetition_penalty": repetition_penalty,
                "stream": True  # Включаем стриминг
            }
            
            # Добавляем min_p и top_k, если они поддерживаются
            if min_p is not None:
                payload["min_p"] = min_p
            if top_k is not None:
                payload["top_k"] = top_k
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            logger.info(
                f"\n{'='*80}\n"
                f"[API STREAM] 🚀 Начало стриминга:\n"
                f"  ├─ Модель: {model_to_use}\n"
                f"  ├─ Сообщений: {len(formatted_messages)} шт.\n"
                f"  ├─ Max tokens (ответ): {max_tokens}\n"
                f"  └─ Подписка: {subscription_type.value if subscription_type else 'FREE'}\n"
                f"{'='*80}"
            )
            
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                proxy=self.proxy if self.proxy else None
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"[OPENROUTER STREAM] HTTP error: {response.status}, response: {error_text}")
                    yield json.dumps({"error": f"HTTP {response.status}: {error_text}"})
                    return
                
                # Читаем поток SSE (Server-Sent Events)
                buffer = ""
                content_received = False
                async for chunk in response.content.iter_any():
                    content_received = True
                    if not chunk:
                        continue
                    
                    # Декодируем байты в строку
                    try:
                        buffer += chunk.decode('utf-8')
                    except UnicodeDecodeError:
                        continue
                    
                    # Обрабатываем все полные строки в буфере
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        
                        if not line:
                            continue
                        
                        # SSE формат: "data: {...}"
                        if line.startswith('data: '):
                            data_str = line[6:]  # Убираем "data: "
                            
                            # Проверяем на [DONE] маркер
                            if data_str.strip() == '[DONE]':
                                # Логируем завершение стриминга с деталями
                                chunk_count = getattr(self, '_stream_chunk_count', 0)
                                total_chars = getattr(self, '_stream_total_chars', 0)
                                logger.info(
                                    f"\n{'='*80}\n"
                                    f"[API STREAM] ✅ Стриминг завершен:\n"
                                    f"  ├─ Чанков получено: {chunk_count}\n"
                                    f"  └─ Символов в ответе: {total_chars}\n"
                                    f"{'='*80}"
                                )
                                # Сбрасываем счетчик чанков
                                if hasattr(self, '_stream_chunk_count'):
                                    delattr(self, '_stream_chunk_count')
                                if hasattr(self, '_stream_total_chars'):
                                    delattr(self, '_stream_total_chars')
                                return
                            
                            try:
                                data = json.loads(data_str)
                                
                                # КРИТИЧЕСКИ ВАЖНО: Проверяем на ошибку от OpenRouter
                                if "error" in data:
                                    error_data = data.get("error", {})
                                    if isinstance(error_data, dict):
                                        error_text = error_data.get("message", str(error_data))
                                        error_code = error_data.get("code")
                                        error_metadata = error_data.get("metadata", {})
                                        raw_error = error_metadata.get("raw", "")
                                    else:
                                        error_text = str(error_data)
                                        error_code = None
                                        raw_error = ""
                                    
                                    # Проверяем, является ли это rate limit ошибкой
                                    is_rate_limit = (
                                        error_code == 429 or 
                                        "rate" in error_text.lower() or 
                                        "rate" in raw_error.lower()
                                    )
                                    
                                    if is_rate_limit:
                                        # Логируем кратко и отправляем уведомление в Telegram
                                        logger.warning(f"[OPENROUTER STREAM] ⚠️ Rate limit для модели {model_to_use}")
                                        
                                        # Отправляем уведомление в Telegram (ждем выполнения)
                                        alert_message = (
                                            f"Модель <code>{model_to_use}</code> достигла rate limit!\n"
                                            f"Ошибка: {error_text}\n"
                                            f"Детали: {raw_error[:200]}"
                                        )
                                        try:
                                            await send_telegram_alert(alert_message)
                                        except Exception as telegram_error:
                                            logger.error(f"[OPENROUTER STREAM] Не удалось отправить уведомление в Telegram: {telegram_error}")
                                        
                                        # Возвращаем ошибку пользователю
                                        user_message = (
                                            f"⚠️ Сервис временно перегружен. Попробуйте повторить запрос через несколько минут, или смените модель"
                                        )
                                        yield json.dumps({"error": user_message})
                                    else:
                                        yield json.dumps({"error": error_text})
                                    return
                                
                                # Извлекаем текст из choices[0].delta.content
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    
                                    if content:
                                        # Подсчитываем чанки и символы
                                        if not hasattr(self, '_stream_chunk_count'):
                                            self._stream_chunk_count = 0
                                            self._stream_total_chars = 0
                                        self._stream_chunk_count += 1
                                        self._stream_total_chars += len(content)
                                        yield content
                                        
                            except json.JSONDecodeError as e:
                                logger.warning(f"[OPENROUTER STREAM] JSON parse error: {e}, data: {data_str[:100]}")
                                continue
                        elif line.startswith(':'):
                            # Комментарий SSE, пропускаем
                            continue
                
                # Обрабатываем оставшийся буфер
                if buffer.strip():
                    if buffer.strip().startswith('data: '):
                        data_str = buffer.strip()[6:]
                        if data_str.strip() != '[DONE]':
                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                pass
                
                if not content_received:
                    logger.error("[OPENROUTER STREAM] ⚠️ Не получено данных от OpenRouter")
                    yield json.dumps({"error": "OpenRouter не вернул данные. Попробуйте повторить запрос."})
                
        except aiohttp.ClientProxyConnectionError as e:
            logger.error(f"[OPENROUTER STREAM] Proxy connection error: {e}")
            logger.error(f"[OPENROUTER STREAM] Proxy used: {self.proxy}")
            yield json.dumps({"error": "__CONNECTION_ERROR__"})
        except aiohttp.ClientError as e:
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in [
                'cannot connect', 'connect call failed', 'connection refused', 
                'connection error', 'connection timeout'
            ]):
                logger.error(f"[OPENROUTER STREAM] Connection error: {e}")
                yield json.dumps({"error": "__CONNECTION_ERROR__"})
            else:
                logger.error(f"[OPENROUTER STREAM] Text generation error: {e}")
                yield json.dumps({"error": str(e)})
        except Exception as e:
            logger.error(f"[OPENROUTER STREAM] Unexpected error: {e}")
            yield json.dumps({"error": str(e)})


# Создаем глобальный экземпляр сервиса
openrouter_service = OpenRouterService()
