"""
Сервис для взаимодействия с OpenRouter API.

Модель выбирается на основе типа подписки:
- STANDARD: sao10k/l3-euryale-70b
- PREMIUM: sao10k/l3-euryale-70b
- FREE/другое: модель из chat_config.OPENROUTER_MODEL
"""

import os
import aiohttp
import json
from typing import Optional, Dict, List, AsyncGenerator
from app.chat_bot.config.chat_config import chat_config
from app.models.subscription import SubscriptionType
from app.utils.logger import logger


def get_model_for_subscription(subscription_type: Optional[SubscriptionType]) -> str:
    """
    Возвращает модель на основе типа подписки.
    
    Args:
        subscription_type: Тип подписки пользователя
        
    Returns:
        Название модели для использования
    """
    if subscription_type == SubscriptionType.STANDARD:
        return "sao10k/l3-euryale-70b"
    elif subscription_type == SubscriptionType.PREMIUM:
        return "sao10k/l3-euryale-70b"
    else:
        # FREE/BASE - используем модель sao10k/l3-euryale-70b с ограничением на 20 сообщений
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
        if max_tokens is None:
            max_tokens = chat_config.DEFAULT_MAX_TOKENS
        temperature = temperature if temperature is not None else chat_config.DEFAULT_TEMPERATURE
        top_p = top_p if top_p is not None else chat_config.DEFAULT_TOP_P
        presence_penalty = presence_penalty if presence_penalty is not None else chat_config.DEFAULT_PRESENCE_PENALTY
        
        # Выбираем модель: если передан явно - используем её, иначе на основе подписки
        if model:
            # Проверяем, что модель разрешена для использования
            allowed_models = [
                "sao10k/l3-euryale-70b",
                "gryphe/mythomax-l2-13b"
            ]
            if model in allowed_models:
                model_to_use = model
            else:
                logger.warning(f"[OPENROUTER] Disallowed model: {model}, using default")
                model_to_use = get_model_for_subscription(subscription_type)
        else:
            model_to_use = get_model_for_subscription(subscription_type)
        
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
            
            # Короткое логирование: только количество сообщений
            logger.info(f"[OPENROUTER] Sending {len(formatted_messages)} messages to API")
            
            payload = {
                "model": model_to_use,
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "presence_penalty": presence_penalty,
                "repetition_penalty": 1.15,
                "frequency_penalty": 0.5,
            }
            
            # КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: проверяем, какая модель реально отправляется
            logger.info(f"[OPENROUTER] Payload model field: {payload.get('model')}")
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            logger.info("[OPENROUTER] Sending generation request")
            logger.info(f"[OPENROUTER] Model parameter received: {model}")
            logger.info(f"[OPENROUTER] Model to use: {model_to_use} (sub: {subscription_type.value if subscription_type else 'FREE'})")
            logger.info(f"[OPENROUTER] Generation params: max_tokens={max_tokens}, temperature={temperature}, top_p={top_p}")
            
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                proxy=self.proxy if self.proxy else None
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    # Логируем модель из ответа API (может отличаться от запрошенной)
                    model_used = result.get("model", "unknown")
                    logger.info(f"[OPENROUTER] Response received from model: {model_used}")
                    
                    # OpenAI API возвращает результат в choices[0].message.content
                    choices = result.get("choices", [])
                    if choices:
                        generated_text = choices[0].get("message", {}).get("content", "")
                        
                        if generated_text:
                            logger.info(f"[OPENROUTER] Generation completed ({len(generated_text)} chars) using model: {model_used}")
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
        if max_tokens is None:
            max_tokens = chat_config.DEFAULT_MAX_TOKENS
        temperature = temperature if temperature is not None else chat_config.DEFAULT_TEMPERATURE
        top_p = top_p if top_p is not None else chat_config.DEFAULT_TOP_P
        presence_penalty = presence_penalty if presence_penalty is not None else chat_config.DEFAULT_PRESENCE_PENALTY
        
        # Выбираем модель: если передан явно - используем её, иначе на основе подписки
        if model:
            # Проверяем, что модель разрешена для использования
            allowed_models = [
                "sao10k/l3-euryale-70b",
                "gryphe/mythomax-l2-13b"
            ]
            if model not in allowed_models:
                logger.warning(f"[OPENROUTER STREAM] Disallowed model: {model}, using default")
                model_to_use = get_model_for_subscription(subscription_type)
            else:
                model_to_use = model
                logger.info(f"[OPENROUTER STREAM] Using selected model: {model_to_use}")
        else:
            # Выбираем модель на основе подписки
            model_to_use = get_model_for_subscription(subscription_type)
        
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
            
            logger.info(f"[OPENROUTER STREAM] Sending {len(formatted_messages)} messages to API (streaming)")
            logger.info(f"[OPENROUTER STREAM] Using model: {model_to_use} (sub: {subscription_type.value if subscription_type else 'FREE'})")
            logger.info(f"[OPENROUTER STREAM] Generation params: max_tokens={max_tokens}, temperature={temperature}, top_p={top_p}")
            
            payload = {
                "model": model_to_use,
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "presence_penalty": presence_penalty,
                "repetition_penalty": 1.15,
                "frequency_penalty": 0.5,
                "stream": True  # Включаем стриминг
            }
            
            # КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: проверяем, какая модель реально отправляется
            logger.info(f"[OPENROUTER STREAM] Payload model field: {payload.get('model')}")
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
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
                async for chunk in response.content.iter_any():
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
                                logger.info("[OPENROUTER STREAM] Stream finished")
                                return
                            
                            try:
                                data = json.loads(data_str)
                                
                                # Извлекаем текст из choices[0].delta.content
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    
                                    if content:
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
                
                logger.info("[OPENROUTER STREAM] Stream finished successfully")
                
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
