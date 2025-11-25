#!/usr/bin/env python3
"""
Упрощенные chat endpoints - только один endpoint для чата
"""

import json
import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.chat_bot.config.chat_config import chat_config
from app.chat_bot.schemas.chat import SimpleChatRequest, ChatMessage
from app.chat_bot.services.textgen_webui_service import textgen_webui_service
from app.chat_bot.schemas.chat import CharacterConfig
from app.auth.dependencies import get_current_user_optional
from app.models.user import Users
from app.database.db_depends import get_db
from app.chat_bot.models.models import CharacterDB, ChatSession, ChatMessageDB

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/status")
async def get_chat_status():
    """
    Проверка статуса чат-бота.
    """
    try:
        # Проверяем подключение к text-generation-webui
        is_connected = await textgen_webui_service.check_connection()
        
        return {
            "status": "online" if is_connected else "offline",
            "textgen_webui_connected": is_connected,
            "message": "Чат-бот работает" if is_connected else "text-generation-webui недоступен"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "textgen_webui_connected": False,
            "message": f"Ошибка: {str(e)}"
        }


@router.post("/chat")
async def chat_with_character(
    request: SimpleChatRequest,
    current_user: Users = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Обычный чат с персонажем без стриминга.
    """
    try:
        # Получаем персонажа из запроса - обязательное поле
        if not request.character:
            raise HTTPException(status_code=400, detail="Не указан персонаж для диалога")
        
        character_name = request.character
        
        # Получаем данные персонажа из базы данных
        character_query = select(CharacterDB).where(CharacterDB.name.ilike(character_name))
        character_result = await db.execute(character_query)
        character = character_result.scalar_one_or_none()
        
        if not character:
            raise HTTPException(status_code=404, detail=f"Персонаж '{character_name}' не найден")
        
        character_config = CharacterConfig(
            id=character.id,
            name=character.name,
            prompt=character.prompt,
            location=character.location
        )
        
        # Создаем промпт с данными персонажа и историей диалога
        # Получаем историю диалога из базы данных
        conversation_history = ""
        user_id = str(current_user.id) if current_user else None
        
        session_query = (
            select(ChatSession)
            .where(ChatSession.character_id == character_config.id)
            .order_by(ChatSession.started_at.desc())
            .limit(1)
        )
        if user_id is None:
            session_query = session_query.where(ChatSession.user_id.is_(None))
        else:
            session_query = session_query.where(ChatSession.user_id == user_id)
        
        session_result = await db.execute(session_query)
        chat_session = session_result.scalar_one_or_none()
        
        if chat_session:
            messages_query = (
                select(ChatMessageDB)
                .where(ChatMessageDB.session_id == chat_session.id)
                .order_by(ChatMessageDB.timestamp.desc())
                .limit(20)
            )
            messages_result = await db.execute(messages_query)
            messages = messages_result.scalars().all()
            
            for msg in reversed(messages):
                if msg.role == "user":
                    conversation_history += f"User: {msg.content}\n"
                else:
                    conversation_history += f"Anna: {msg.content}\n"
            
            if conversation_history.strip():
                character_prompt = f"{character_config.prompt}\n\n{conversation_history}\n\nUser: {request.message}\nAnna:"
            else:
                character_prompt = f"{character_config.prompt}\n\nUser: {request.message}\nAnna:"
            
            logger.info("=== FULL PROMPT DEBUG ===")
            logger.info(f"Character prompt: {character_config.prompt}")
            logger.info(f"Conversation history: {conversation_history}")
            logger.info(f"User message: {request.message}")
            logger.info(f"Final prompt: {character_prompt}")
            logger.info("=== END PROMPT DEBUG ===")
        else:
            character_prompt = f"{character_config.prompt}\n\nUser: {request.message}\nAnna:"
            logger.info("=== PROMPT DEBUG (NO HISTORY) ===")
            logger.info(f"Character prompt: {character_config.prompt}")
            logger.info(f"User message: {request.message}")
            logger.info(f"Final prompt: {character_prompt}")
            logger.info("=== END PROMPT DEBUG ===")
        
        # Получаем ответ от модели без стриминга
        response_text = await textgen_webui_service.generate_text(
            prompt=character_prompt,
            max_tokens=chat_config.DEFAULT_MAX_TOKENS,
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            top_k=chat_config.DEFAULT_TOP_K,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY
        )
        
        # Сохраняем диалог в базу данных
        try:
            if not chat_session:
                chat_session = ChatSession(
                    character_id=character_config.id,
                    user_id=user_id,
                    started_at=datetime.now()
                )
                db.add(chat_session)
                await db.flush()
            
            user_message = ChatMessageDB(
                session_id=chat_session.id,
                role="user",
                content=request.message,
                timestamp=datetime.now()
            )
            db.add(user_message)
            
            assistant_message = ChatMessageDB(
                session_id=chat_session.id,
                role="assistant",
                content=response_text,
                timestamp=datetime.now()
            )
            db.add(assistant_message)
            
            await db.commit()
        except Exception as e:
            logger.error(f"Ошибка сохранения диалога: {e}")
        
        return {
            "response": response_text,
            "character_name": character_config.name,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")