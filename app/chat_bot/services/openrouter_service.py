"""
Сервис для взаимодействия с OpenRouter API.

Модель выбирается на основе типа подписки:
- STANDARD: gryphe/mythomax-l2-13b
- PREMIUM: sao10k/l3-euryale-70b
- FREE/другое: модель из chat_config.OPENROUTER_MODEL
"""

import os
import aiohttp
import json
from typing import Optional, Dict, Any, List, AsyncGenerator
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
        return "gryphe/mythomax-l2-13b"
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
        logger.info("[OPENROUTER] Прокси отключен для текстовой модели")
        
        if not self.api_key:
            logger.warning("[OPENROUTER] OPENROUTER_KEY не установлен в переменных окружения")
        
        logger.info(f"[OPENROUTER] Модель по умолчанию: {self.model}")
    
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
            logger.error("[OPENROUTER] API ключ не установлен")
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
                    logger.info("[OPENROUTER] Подключение успешно установлено")
                    return True
                else:
                    error_text = await response.text()
                    logger.warning(f"[OPENROUTER] API недоступен: HTTP {response.status}, ответ: {error_text}")
                    return False
        except Exception as e:
            logger.error(f"[OPENROUTER] Ошибка подключения: {e}")
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
            logger.error("[OPENROUTER] API ключ не установлен")
            return None
        
        # Используем значения по умолчанию из конфигурации, если не указаны
        max_tokens = max_tokens or chat_config.DEFAULT_MAX_TOKENS
        temperature = temperature if temperature is not None else chat_config.DEFAULT_TEMPERATURE
        top_p = top_p if top_p is not None else chat_config.DEFAULT_TOP_P
        presence_penalty = presence_penalty if presence_penalty is not None else chat_config.DEFAULT_PRESENCE_PENALTY
        
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
                logger.error("[OPENROUTER] Не указан ни prompt, ни messages")
                return None
            
            # Короткое логирование: только количество сообщений
            logger.info(f"[OPENROUTER] Отправка {len(formatted_messages)} сообщений в API")
            
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
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            logger.info(f"[OPENROUTER] Отправка запроса на генерацию")
            logger.info(f"[OPENROUTER] Используемая модель: {model_to_use} (подписка: {subscription_type.value if subscription_type else 'FREE'})")
            logger.debug(f"[OPENROUTER] Параметры: max_tokens={max_tokens}, temperature={temperature}, top_p={top_p}")
            
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
                    logger.info(f"[OPENROUTER] Ответ получен от модели: {model_used}")
                    
                    # OpenAI API возвращает результат в choices[0].message.content
                    choices = result.get("choices", [])
                    if choices:
                        generated_text = choices[0].get("message", {}).get("content", "")
                        
                        if generated_text:
                            logger.info(f"[OPENROUTER] Генерация завершена ({len(generated_text)} символов) моделью: {model_used}")
                            return generated_text.strip()
                        else:
                            logger.warning("[OPENROUTER] Пустой ответ от API")
                            return None
                    else:
                        logger.warning("[OPENROUTER] Нет choices в ответе API")
                        return None
                else:
                    error_text = await response.text()
                    logger.error(f"[OPENROUTER] HTTP ошибка при генерации: {response.status}, ответ: {error_text}")
                    
                    # Проверяем, является ли это ошибкой подключения
                    if response.status in [503, 502, 504]:
                        return "__CONNECTION_ERROR__"
                    
                    return None
                    
        except aiohttp.ClientProxyConnectionError as e:
            logger.error(f"[OPENROUTER] Ошибка подключения к прокси: {e}")
            logger.error(f"[OPENROUTER] Используемый прокси: {self.proxy}")
            return "__CONNECTION_ERROR__"
        except aiohttp.ClientError as e:
            error_str = str(e).lower()
            # Проверяем, является ли это ошибкой подключения
            if any(keyword in error_str for keyword in [
                'cannot connect', 'connect call failed', 'connection refused', 
                'connection error', 'connection timeout'
            ]):
                logger.error(f"[OPENROUTER] Ошибка подключения: {e}")
                return "__CONNECTION_ERROR__"
            else:
                logger.error(f"[OPENROUTER] Ошибка генерации текста: {e}")
                return None
        except Exception as e:
            logger.error(f"[OPENROUTER] Неожиданная ошибка: {e}")
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
            logger.error("[OPENROUTER] API ключ не установлен")
            yield json.dumps({"error": "API ключ не установлен"})
            return
        
        # Используем значения по умолчанию из конфигурации, если не указаны
        max_tokens = max_tokens or chat_config.DEFAULT_MAX_TOKENS
        temperature = temperature if temperature is not None else chat_config.DEFAULT_TEMPERATURE
        top_p = top_p if top_p is not None else chat_config.DEFAULT_TOP_P
        presence_penalty = presence_penalty if presence_penalty is not None else chat_config.DEFAULT_PRESENCE_PENALTY
        
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
                logger.error("[OPENROUTER] Не указан ни prompt, ни messages")
                yield json.dumps({"error": "Не указан ни prompt, ни messages"})
                return
            
            logger.info(f"[OPENROUTER STREAM] Отправка {len(formatted_messages)} сообщений в API (streaming)")
            logger.info(f"[OPENROUTER STREAM] Используемая модель: {model_to_use} (подписка: {subscription_type.value if subscription_type else 'FREE'})")
            
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
                    logger.error(f"[OPENROUTER STREAM] HTTP ошибка: {response.status}, ответ: {error_text}")
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
                                logger.info("[OPENROUTER STREAM] Поток завершен")
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
                                logger.warning(f"[OPENROUTER STREAM] Ошибка парсинга JSON: {e}, data: {data_str[:100]}")
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
                
                logger.info("[OPENROUTER STREAM] Поток завершен успешно")
                
        except aiohttp.ClientProxyConnectionError as e:
            logger.error(f"[OPENROUTER STREAM] Ошибка подключения к прокси: {e}")
            logger.error(f"[OPENROUTER STREAM] Используемый прокси: {self.proxy}")
            yield json.dumps({"error": "__CONNECTION_ERROR__"})
        except aiohttp.ClientError as e:
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in [
                'cannot connect', 'connect call failed', 'connection refused', 
                'connection error', 'connection timeout'
            ]):
                logger.error(f"[OPENROUTER STREAM] Ошибка подключения: {e}")
                yield json.dumps({"error": "__CONNECTION_ERROR__"})
            else:
                logger.error(f"[OPENROUTER STREAM] Ошибка генерации текста: {e}")
                yield json.dumps({"error": str(e)})
        except Exception as e:
            logger.error(f"[OPENROUTER STREAM] Неожиданная ошибка: {e}")
            yield json.dumps({"error": str(e)})


# Создаем глобальный экземпляр сервиса
openrouter_service = OpenRouterService()

