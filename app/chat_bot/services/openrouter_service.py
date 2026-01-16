"""
Сервис для взаимодействия с OpenRouter API.

Все пользователи получают модель: sao10k/l3-euryale-70b
"""

import os
import aiohttp
import json
from typing import Optional, Dict, List, AsyncGenerator
from app.chat_bot.config.chat_config import chat_config
from app.chat_bot.config.cydonia_config import get_cydonia_overrides
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
    # Все пользователи, включая FREE, STANDARD и PREMIUM, получают лучшую модель
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
                "thedrummer/cydonia-24b-v4.1"
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
            
            logger.info(f"[OPENROUTER] Applied Cydonia specific overrides for {model_to_use}")
        
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
            
            # РАСШИРЕННОЕ ЛОГИРОВАНИЕ: выводим все параметры генерации
            logger.info("=" * 80)
            logger.info("[OPENROUTER] Final payload before sending:")
            logger.info(f"  Model: {payload.get('model')}")
            logger.info(f"  Max tokens: {max_tokens}")
            logger.info(f"  Temperature: {temperature}")
            logger.info(f"  Top-p: {top_p}")
            logger.info(f"  Top-k: {top_k}")
            logger.info(f"  Min-p: {min_p}")
            logger.info(f"  Presence penalty: {presence_penalty}")
            logger.info(f"  Frequency penalty: {frequency_penalty}")
            logger.info(f"  Repetition penalty: {repetition_penalty}")
            logger.info(f"  Subscription: {subscription_type.value if subscription_type else 'FREE'}")
            logger.info(f"  Messages count: {len(formatted_messages)}")
            logger.info("=" * 80)
            
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
                "thedrummer/cydonia-24b-v4.1"
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
            
            logger.info(f"[OPENROUTER STREAM] Applied Cydonia specific overrides for {model_to_use}")
        
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
            
            # РАСШИРЕННОЕ ЛОГИРОВАНИЕ: выводим все параметры генерации
            logger.info("=" * 80)
            logger.info("[OPENROUTER STREAM] Final payload before sending:")
            logger.info(f"  Model: {payload.get('model')}")
            logger.info(f"  Max tokens: {max_tokens}")
            logger.info(f"  Temperature: {temperature}")
            logger.info(f"  Top-p: {top_p}")
            logger.info(f"  Top-k: {top_k}")
            logger.info(f"  Min-p: {min_p}")
            logger.info(f"  Presence penalty: {presence_penalty}")
            logger.info(f"  Frequency penalty: {frequency_penalty}")
            logger.info(f"  Repetition penalty: {repetition_penalty}")
            logger.info(f"  Subscription: {subscription_type.value if subscription_type else 'FREE'}")
            logger.info(f"  Messages count: {len(formatted_messages)}")
            logger.info("=" * 80)
            
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
                                # Сбрасываем счетчик чанков
                                if hasattr(self, '_stream_chunk_count'):
                                    delattr(self, '_stream_chunk_count')
                                return
                            
                            try:
                                data = json.loads(data_str)
                                
                                # Извлекаем текст из choices[0].delta.content
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content", "")
                                    
                                    if content:
                                        # ДИАГНОСТИКА: Логируем первые несколько чанков
                                        if not hasattr(self, '_stream_chunk_count'):
                                            self._stream_chunk_count = 0
                                        self._stream_chunk_count += 1
                                        if self._stream_chunk_count <= 5:
                                            logger.info(f"[OPENROUTER STREAM] Chunk {self._stream_chunk_count}: {repr(content)}")
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
