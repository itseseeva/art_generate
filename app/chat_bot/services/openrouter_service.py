"""
Сервис для взаимодействия с OpenRouter API.
Использует модель gryphe/mythomax-l2-13b.
"""

import os
import aiohttp
import json
from typing import Optional, Dict, Any, List
from app.chat_bot.config.chat_config import chat_config
from app.utils.logger import logger


class OpenRouterService:
    """Сервис для работы с OpenRouter API."""
    
    def __init__(self):
        """Инициализация сервиса."""
        self.base_url = "https://openrouter.ai/api/v1"
        self.api_key = os.getenv("OPENROUTER_KEY")
        self.model = "gryphe/mythomax-l2-13b"
        self._session: Optional[aiohttp.ClientSession] = None
        
        if not self.api_key:
            logger.warning("[OPENROUTER] OPENROUTER_KEY не установлен в переменных окружения")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Получает или создает сессию aiohttp."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=300, connect=10, sock_read=120)
            self._session = aiohttp.ClientSession(timeout=timeout)
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
                headers=headers
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
        
        try:
            session = await self._get_session()
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/your-repo",  # Опционально, для статистики
                "X-Title": "Art Generation Chat"  # Опционально, для статистики
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
                "model": self.model,
                "messages": formatted_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
                "presence_penalty": presence_penalty,
            }
            
            # Добавляем дополнительные параметры, если они есть
            if "stop" in kwargs:
                payload["stop"] = kwargs["stop"]
            
            logger.info(f"[OPENROUTER] Отправка запроса на генерацию")
            logger.debug(f"[OPENROUTER] Параметры: max_tokens={max_tokens}, temperature={temperature}, top_p={top_p}")
            
            async with session.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    # OpenAI API возвращает результат в choices[0].message.content
                    choices = result.get("choices", [])
                    if choices:
                        generated_text = choices[0].get("message", {}).get("content", "")
                        
                        if generated_text:
                            logger.info(f"[OPENROUTER] Генерация завершена ({len(generated_text)} символов)")
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


# Создаем глобальный экземпляр сервиса
openrouter_service = OpenRouterService()

