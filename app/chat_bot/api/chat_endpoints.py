#!/usr/bin/env python3
"""
Упрощенные chat endpoints - только один endpoint для чата
"""

import json
import logging
from typing import List, Dict, Optional, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.chat_bot.config.chat_config import chat_config
from app.chat_bot.schemas.chat import SimpleChatRequest, ChatMessage
from app.chat_bot.services.openrouter_service import openrouter_service
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
        # Проверяем подключение к OpenRouter
        is_connected = await openrouter_service.check_connection()
        
        return {
            "status": "online" if is_connected else "offline",
            "openrouter_connected": is_connected,
            "message": "Чат-бот работает" if is_connected else "OpenRouter API недоступен"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "openrouter_connected": False,
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
        
        # Импортируем утилиты для работы с контекстом
        from app.chat_bot.utils.context_manager import (
            get_context_limit, 
            get_max_tokens, 
            get_max_context_tokens,
            trim_messages_to_token_limit
        )
        from app.models.subscription import SubscriptionType
        
        # Определяем лимит контекста на основе подписки
        subscription_type_enum = None
        if current_user:
            from app.models.subscription import UserSubscription, SubscriptionStatus
            subscription_query = await db.execute(
                select(UserSubscription)
                .where(UserSubscription.user_id == current_user.id)
                .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
                .order_by(UserSubscription.activated_at.desc())
                .limit(1)
            )
            user_subscription = subscription_query.scalar_one_or_none()
            if user_subscription and user_subscription.subscription_type:
                try:
                    subscription_type_enum = SubscriptionType(user_subscription.subscription_type.value)
                except (ValueError, AttributeError):
                    subscription_type_enum = None
        
        context_limit = get_context_limit(subscription_type_enum)
        max_context_tokens = get_max_context_tokens(subscription_type_enum)
        max_tokens = get_max_tokens(subscription_type_enum)
        
        if chat_session:
            messages_query = (
                select(ChatMessageDB)
                .where(ChatMessageDB.session_id == chat_session.id)
                .order_by(ChatMessageDB.timestamp.desc())
            )
            # Применяем лимит только если он установлен (для FREE)
            if context_limit is not None:
                messages_query = messages_query.limit(context_limit)
            messages_result = await db.execute(messages_query)
            db_messages = messages_result.scalars().all()
            
            # Импортируем фильтр сообщений
            from app.chat_bot.utils.message_filter import should_include_message_in_context
            
            # Формируем массив messages для OpenAI API
            openai_messages = []
            
            # 1. Системное сообщение с описанием персонажа (всегда первое)
            openai_messages.append({
                "role": "system",
                "content": character_config.prompt
            })
            
            # 2. История диалога из БД
            for msg in reversed(db_messages):
                # Фильтруем промпты от фото и другие нерелевантные сообщения
                if not should_include_message_in_context(msg.content, msg.role):
                    logger.debug(f"[CONTEXT] Пропущено сообщение {msg.role}: {msg.content[:50] if msg.content else 'empty'}...")
                    continue
                    
                if msg.role == "user":
                    openai_messages.append({
                        "role": "user",
                        "content": msg.content
                    })
                elif msg.role == "assistant":
                    openai_messages.append({
                        "role": "assistant",
                        "content": msg.content
                    })
            
            # 3. Текущее сообщение пользователя (всегда последнее)
            # НЕ фильтруем текущее сообщение - у пользователя есть отдельная кнопка для генерации изображений
            # Все сообщения в чате предназначены для текстовой модели
            openai_messages.append({
                "role": "user",
                "content": request.message
            })
            
            # 4. Проверяем и обрезаем по лимиту токенов контекста
            openai_messages = await trim_messages_to_token_limit(
                openai_messages, 
                max_tokens=max_context_tokens, 
                system_message_index=0
            )
            
            messages = openai_messages
            
            logger.info("=== FULL PROMPT DEBUG ===")
            logger.info(f"Character prompt (system): {character_config.prompt[:200]}...")
            logger.info(f"Conversation history: {len(openai_messages) - 2} messages")
            logger.info(f"User message: {request.message}")
            logger.info(f"Total messages: {len(openai_messages)}")
            logger.info("=== END PROMPT DEBUG ===")
        else:
            # Нет истории - только системное сообщение и текущее сообщение пользователя
            messages = [
                {
                    "role": "system",
                    "content": character_config.prompt
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
            
            logger.info("=== PROMPT DEBUG (NO HISTORY) ===")
            logger.info(f"Character prompt (system): {character_config.prompt[:200]}...")
            logger.info(f"User message: {request.message}")
            logger.info(f"Total messages: {len(messages)}")
            logger.info("=== END PROMPT DEBUG ===")
        
        # Получаем ответ от модели без стриминга
        # max_tokens определяется на основе подписки: STANDARD=200, PREMIUM=450
        # Модель выбирается на основе подписки: STANDARD=gryphe/mythomax-l2-13b, PREMIUM=sao10k/l3-euryale-70b
        response_text = await openrouter_service.generate_text(
            messages=messages,
            max_tokens=max_tokens,
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
            subscription_type=subscription_type_enum
        )
        
        # Проверяем ошибку подключения к сервису генерации
        if response_text == "__CONNECTION_ERROR__":
            raise HTTPException(
                status_code=503,
                detail="Сервис генерации текста недоступен. Проверьте настройки OpenRouter API."
            )
        
        if not response_text:
            raise HTTPException(
                status_code=500,
                detail="Не удалось сгенерировать ответ от модели"
        )
        
        # Сохраняем диалог в базу данных
        # КРИТИЧЕСКИ ВАЖНО: для FREE подписки не сохраняем ChatSession/ChatMessageDB
        try:
            can_save_session = False
            if current_user:
                from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
                from sqlalchemy import select
                import logging
                logger = logging.getLogger(__name__)
                
                # Получаем самую новую активную подписку (если есть несколько записей)
                subscription_query = await db.execute(
                    select(UserSubscription)
                    .where(UserSubscription.user_id == current_user.id)
                    .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
                    .order_by(UserSubscription.activated_at.desc())
                    .limit(1)
                )
                subscription = subscription_query.scalar_one_or_none()
                if subscription and subscription.is_active:
                    # КРИТИЧЕСКИ ВАЖНО: сохраняем историю для STANDARD и PREMIUM подписок одинаково
                    # PREMIUM должен работать так же, как STANDARD
                    can_save_session = subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
                    logger.info(f"[CHAT] Пользователь {current_user.id}: подписка={subscription.subscription_type.value}, is_active={subscription.is_active}, can_save_session={can_save_session}")
                else:
                    logger.warning(f"[CHAT] Пользователь {current_user.id}: подписка отсутствует или неактивна (subscription={subscription})")
            
            if can_save_session:
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
                
                # КРИТИЧЕСКИ ВАЖНО: коммитим ChatMessageDB сразу, чтобы они сохранились
                await db.commit()
            else:
                logger.debug(f"[CHAT] Пропуск сохранения ChatSession/ChatMessageDB: подписка FREE или отсутствует (user_id={current_user.id if current_user else None})")
        except Exception as e:
            logger.error(f"Ошибка сохранения диалога: {e}")
        
        return {
            "response": response_text,
            "character_name": character_config.name,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/chat/stream")
async def chat_with_character_stream(
    request: SimpleChatRequest,
    current_user: Users = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Чат с персонажем с потоковой передачей ответов (Streaming).
    Использует Server-Sent Events (SSE) для передачи данных в реальном времени.
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
        
        # Получаем историю диалога из базы данных
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
        
        # Импортируем утилиты для работы с контекстом
        from app.chat_bot.utils.context_manager import (
            get_context_limit, 
            get_max_tokens, 
            get_max_context_tokens,
            trim_messages_to_token_limit
        )
        from app.models.subscription import SubscriptionType
        
        # Определяем лимит контекста на основе подписки
        subscription_type_enum = None
        if current_user:
            from app.models.subscription import UserSubscription, SubscriptionStatus
            subscription_query = await db.execute(
                select(UserSubscription)
                .where(UserSubscription.user_id == current_user.id)
                .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
                .order_by(UserSubscription.activated_at.desc())
                .limit(1)
            )
            user_subscription = subscription_query.scalar_one_or_none()
            if user_subscription and user_subscription.subscription_type:
                try:
                    subscription_type_enum = SubscriptionType(user_subscription.subscription_type.value)
                except (ValueError, AttributeError):
                    subscription_type_enum = None
        
        context_limit = get_context_limit(subscription_type_enum)
        max_context_tokens = get_max_context_tokens(subscription_type_enum)
        max_tokens = get_max_tokens(subscription_type_enum)
        
        # Формируем массив messages для OpenAI API
        if chat_session:
            messages_query = (
                select(ChatMessageDB)
                .where(ChatMessageDB.session_id == chat_session.id)
                .order_by(ChatMessageDB.timestamp.desc())
            )
            # Применяем лимит только если он установлен (для FREE)
            if context_limit is not None:
                messages_query = messages_query.limit(context_limit)
            messages_result = await db.execute(messages_query)
            db_messages = messages_result.scalars().all()
            
            # Импортируем фильтр сообщений
            from app.chat_bot.utils.message_filter import should_include_message_in_context
            
            openai_messages = []
            
            # 1. Системное сообщение с описанием персонажа (всегда первое)
            openai_messages.append({
                "role": "system",
                "content": character_config.prompt
            })
            
            # 2. История диалога из БД
            for msg in reversed(db_messages):
                if not should_include_message_in_context(msg.content, msg.role):
                    continue
                    
                if msg.role == "user":
                    openai_messages.append({
                        "role": "user",
                        "content": msg.content
                    })
                elif msg.role == "assistant":
                    openai_messages.append({
                        "role": "assistant",
                        "content": msg.content
                    })
            
            # 3. Текущее сообщение пользователя
            openai_messages.append({
                "role": "user",
                "content": request.message
            })
            
            # 4. Обрезаем по лимиту токенов контекста
            openai_messages = await trim_messages_to_token_limit(
                openai_messages, 
                max_tokens=max_context_tokens, 
                system_message_index=0
            )
            
            messages = openai_messages
        else:
            # Нет истории
            messages = [
                {
                    "role": "system",
                    "content": character_config.prompt
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        
        logger.info(f"[CHAT STREAM] Начало стриминга для персонажа '{character_name}', сообщений: {len(messages)}")
        
        # Создаем асинхронный генератор для SSE
        async def generate_sse_stream() -> AsyncGenerator[str, None]:
            """
            Генерирует SSE события из потока OpenRouter.
            """
            full_response = ""  # Собираем полный ответ для сохранения в БД
            
            try:
                # Получаем поток от OpenRouter
                async for chunk in openrouter_service.generate_text_stream(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=chat_config.DEFAULT_TEMPERATURE,
                    top_p=chat_config.DEFAULT_TOP_P,
                    presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
                    subscription_type=subscription_type_enum
                ):
                    # Проверяем на ошибку
                    if chunk.startswith('{"error"'):
                        error_data = json.loads(chunk)
                        error_msg = error_data.get("error", "Unknown error")
                        
                        if error_msg == "__CONNECTION_ERROR__":
                            yield f"data: {json.dumps({'error': 'Сервис генерации текста недоступен'})}\n\n"
                            return
                        else:
                            yield f"data: {json.dumps({'error': error_msg})}\n\n"
                            return
                    
                    # Отправляем чанк как SSE событие
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Отправляем маркер завершения
                yield f"data: {json.dumps({'done': True})}\n\n"
                
                # Сохраняем диалог в базу данных после завершения стриминга
                try:
                    can_save_session = False
                    if current_user:
                        from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
                        subscription_query = await db.execute(
                            select(UserSubscription)
                            .where(UserSubscription.user_id == current_user.id)
                            .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
                            .order_by(UserSubscription.activated_at.desc())
                            .limit(1)
                        )
                        subscription = subscription_query.scalar_one_or_none()
                        if subscription and subscription.is_active:
                            can_save_session = subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
                    
                    if can_save_session and full_response:
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
                            content=full_response,
                            timestamp=datetime.now()
                        )
                        db.add(assistant_message)
                        
                        await db.commit()
                        logger.info(f"[CHAT STREAM] Диалог сохранен в БД (session_id={chat_session.id})")
                except Exception as e:
                    logger.error(f"[CHAT STREAM] Ошибка сохранения диалога: {e}")
                    # Не прерываем стриминг из-за ошибки сохранения
                
            except Exception as e:
                logger.error(f"[CHAT STREAM] Ошибка в генераторе SSE: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        # Возвращаем StreamingResponse с SSE
        return StreamingResponse(
            generate_sse_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Отключаем буферизацию в nginx
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[CHAT STREAM] Критическая ошибка: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка стриминга: {str(e)}")