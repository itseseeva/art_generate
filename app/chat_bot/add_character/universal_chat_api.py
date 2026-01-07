"""
Универсальный чат API для работы с любыми персонажами.
"""
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from .character_registry import get_character_data
from app.chat_bot.services.openrouter_service import openrouter_service
from app.chat_bot.config.chat_config import chat_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["Universal Chat"])


@router.post("/")
async def universal_chat(request: Dict[str, Any]):
    """
    Универсальный эндпоинт для чата с любыми персонажами.
    
    Параметры:
    - message: сообщение пользователя
    - character: имя персонажа (по умолчанию 'anna')
    - history: история сообщений
    - session_id: ID сессии
    """
    try:
        # Извлекаем параметры
        message = request.get("message", "").strip()
        character_name = request.get("character", "anna")
        history = request.get("history", [])
        session_id = request.get("session_id", "default")
        
        # Валидация
        if not message:
            raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")
        
        # Получаем данные персонажа
        character_data = get_character_data(character_name)
        if not character_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Персонаж '{character_name}' не найден"
            )
        
        logger.info(f"[CHAT] Чат с {character_data['name']}: {message[:50]}...")
        
        # Проверяем подключение к OpenRouter
        if not await openrouter_service.check_connection():
            raise HTTPException(
                status_code=503, 
                detail="OpenRouter API недоступен. Проверьте настройки OPENROUTER_KEY."
            )
        
        # Специальная обработка для "continue the story"
        is_continue_story = message.lower().strip() == "continue the story briefly"
        
        if is_continue_story:
            logger.info(f"[STORY] Continue the story briefly - продолжаем историю кратко")
        else:
            logger.info(f"[GENERATE] Генерируем ответ для: {message[:50]}...")
        
        # Импортируем утилиты для работы с контекстом
        from app.chat_bot.utils.context_manager import (
            get_context_limit, 
            get_max_tokens, 
            get_max_context_tokens,
            trim_messages_to_token_limit
        )
        from app.models.subscription import SubscriptionType
        
        # Определяем лимит контекста (для universal_chat используем дефолтный лимит 10)
        # В будущем можно добавить проверку подписки пользователя
        context_limit = 10  # Дефолтный лимит для universal_chat
        # Для universal_chat используем минимальное значение max_tokens (150)
        max_tokens = get_max_tokens(None)
        max_context_tokens = get_max_context_tokens(None)  # 2000 токенов для FREE
        
        # Формируем массив messages для OpenAI API
        openai_messages = []
        
        # 1. Системное сообщение с описанием персонажа (всегда первое)
        openai_messages.append({
            "role": "system",
            "content": character_data["prompt"]
        })
        
        # Импортируем фильтр сообщений
        from app.chat_bot.utils.message_filter import should_include_message_in_context
        
        # 2. История диалога (с учетом лимита)
        if history:
            for msg in history[-context_limit:]:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                # Фильтруем промпты от фото и другие нерелевантные сообщения
                if not should_include_message_in_context(content, role):
                    logger.debug(f"[CONTEXT] Пропущено сообщение {role} из history: {content[:50] if content else 'empty'}...")
                    continue
                
                if role == 'user':
                    openai_messages.append({
                        "role": "user",
                        "content": content
                    })
                elif role == 'assistant':
                    openai_messages.append({
                        "role": "assistant",
                        "content": content
                    })
        
        # 3. Текущее сообщение пользователя (всегда последнее)
        # НЕ фильтруем текущее сообщение - у пользователя есть отдельная кнопка для генерации изображений
        # Все сообщения в чате предназначены для текстовой модели
        if is_continue_story:
            openai_messages.append({
                "role": "user",
                "content": "continue the story briefly"
            })
        else:
            # Всегда добавляем текущее сообщение пользователя без фильтрации
            openai_messages.append({
                "role": "user",
                "content": message
            })
        
        # 4. Проверяем и обрезаем по лимиту токенов контекста
        openai_messages = await trim_messages_to_token_limit(
            openai_messages, 
            max_tokens=max_context_tokens, 
            system_message_index=0
        )
        
        logger.info(f"[UNIVERSAL CHAT] Формируем запрос: system prompt length={len(character_data['prompt'])}, history messages={len(openai_messages) - 2}, total messages={len(openai_messages)}")
        
        # Генерируем ответ напрямую от модели
        # Для universal_chat используем минимальное значение max_tokens (150)
        # Модель выбирается на основе подписки: STANDARD=sao10k/l3-euryale-70b, PREMIUM=sao10k/l3-euryale-70b
        # Для universal_chat подписка не передается (None), используется модель по умолчанию
        response = await openrouter_service.generate_text(
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
            subscription_type=None  # universal_chat не использует подписки
        )
        
        # Проверяем ошибку подключения к сервису генерации
        if response == "__CONNECTION_ERROR__":
            raise HTTPException(
                status_code=503,
                detail="Сервис генерации текста недоступен. Проверьте настройки OpenRouter API."
        )
        
        if not response:
            raise HTTPException(
                status_code=500, 
                detail="Не удалось сгенерировать ответ от модели"
            )
        
        logger.info(f"[OK] Ответ сгенерирован ({len(response)} символов)")
        
        # Возвращаем ответ
        return JSONResponse(content={
            "response": response,
            "character": character_data["name"],
            "character_display_name": character_data.get("display_name", character_data["name"]),
            "session_id": session_id,
            "message": message,
            "is_continue_story": is_continue_story
        })
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] Ошибка в универсальном чате: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{character_name}")
async def character_specific_chat(character_name: str, request: Dict[str, Any]):
    """
    Эндпоинт для чата с конкретным персонажем.
    
    Параметры:
    - message: сообщение пользователя
    - history: история сообщений
    - session_id: ID сессии
    """
    # Добавляем имя персонажа в запрос
    request["character"] = character_name
    return await universal_chat(request)
