#!/usr/bin/env python3
"""
Упрощенные chat endpoints - только один endpoint для чата
"""

import json
import asyncio
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
from app.chat_bot.schemas.chat import TTSRequest, VoicePreviewRequest
from app.services.tts_service import generate_tts_audio, generate_voice_preview
from app.services.coins_service import CoinsService
from app.services.profit_activate import emit_profile_update

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
        
        # Формируем языковую инструкцию
        target_lang = request.target_language or "ru"
        if target_lang == "ru":
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in RUSSIAN language
- NEVER use Chinese, Japanese, Korean or any Asian languages
- NEVER use Chinese characters (我, 你, 的, 是, 在, 我的手, 轻轻, 抚摸, 触摸, 你的脸庞, 我等待, etc.)
- NEVER use any hieroglyphs or Asian symbols
- Write in Russian using normal Cyrillic alphabet
- If you use Chinese characters, you will be penalized. STRICTLY RUSSIAN ONLY."""
        elif target_lang == "en":
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in ENGLISH language
- NEVER use Russian, Chinese, Japanese, or any other languages
- NEVER use Chinese characters (我, 你, 的, 是, 在, 触摸, etc.) or any hieroglyphs
- Write in English using Latin alphabet only
- If you use any other characters, you will be penalized. STRICTLY ENGLISH ONLY."""
        else:
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in RUSSIAN language
- NEVER use Chinese, Japanese, Korean or any Asian languages
- NEVER use Chinese characters or hieroglyphs
- Write in Russian using Cyrillic alphabet
- STRICTLY RUSSIAN ONLY."""

        # Получаем данные о подписке пользователя
        from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
        
        subscription_type_enum = SubscriptionType.FREE
        user_id = current_user.id if current_user else None
        
        if current_user:
            subscription_query = select(UserSubscription).where(
                UserSubscription.user_id == current_user.id,
                UserSubscription.status == SubscriptionStatus.ACTIVE
            ).order_by(UserSubscription.activated_at.desc()).limit(1)
            subscription_result = await db.execute(subscription_query)
            subscription = subscription_result.scalar_one_or_none()
            if subscription and subscription.is_active:
                subscription_type_enum = subscription.subscription_type
        
        # Импортируем утилиты для работы с контекстом
        from app.chat_bot.utils.context_manager import (
            get_context_limit, 
            get_max_tokens, 
            get_max_context_tokens,
            trim_messages_to_token_limit
        )
        
        # Определяем модель ПЕРЕД расчетом лимитов
        from app.chat_bot.services.openrouter_service import get_model_for_subscription
        selected_model = request.model if request.model and subscription_type_enum == SubscriptionType.PREMIUM else None
        model_used = selected_model if selected_model else get_model_for_subscription(subscription_type_enum)

        # Определяем лимиты контекста
        context_limit = get_context_limit(subscription_type_enum)
        max_context_tokens = get_max_context_tokens(subscription_type_enum, model_used)
        max_tokens = get_max_tokens(subscription_type_enum)
        
        logger.info(f"[CONTEXT] Модель: {model_used}, Лимит сообщений БД: {context_limit}, Лимит токенов: {max_context_tokens}")

        # Пытаемся найти существующую сессию чата
        chat_session = None
        if user_id:
            session_query = select(ChatSession).where(
                ChatSession.character_id == character.id,
                ChatSession.user_id == user_id
            ).order_by(ChatSession.started_at.desc()).limit(1)
            session_result = await db.execute(session_query)
            chat_session = session_result.scalar_one_or_none()

        # Создаем промпт с данными персонажа и историей диалога
        messages = []
        db_messages = []
        
        if chat_session:
            # Загружаем сообщения из БД
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
            
            # 1. Системное сообщение с описанием персонажа
            openai_messages.append({
                "role": "system",
                "content": character_config.prompt
            })
            
            # 2. История диалога из БД
            for msg in reversed(db_messages):
                if not should_include_message_in_context(msg.content, msg.role):
                    continue
                openai_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # 3. Текущее сообщение пользователя
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
            
            # 5. Добавляем инструкции к системному промпту
            if openai_messages and openai_messages[0]["role"] == "system":
                openai_messages[0]["content"] += f"\n\nIMPORTANT: Be concise. Your response must be strictly within {max_tokens} tokens."
                openai_messages[0]["content"] += lang_instruction
            
            # Добавляем финальное напоминание для Euryale
            if model_used == "sao10k/l3-euryale-70b":
                openai_messages[0]["content"] += f"\n\nREMINDER: Write your response ONLY in {target_lang.upper()}. NO CHINESE CHARACTERS."
            
            messages = openai_messages
        else:
            # Нет истории - создаем базовые сообщения
            messages = [
                {
                    "role": "system",
                    "content": character_config.prompt + f"\n\nIMPORTANT: Be concise. Your response must be strictly within {max_tokens} tokens." + lang_instruction + (f"\n\nREMINDER: Write your response ONLY in {target_lang.upper()}. NO CHINESE CHARACTERS." if model_used == "sao10k/l3-euryale-70b" else "")
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
            
        # ЕСЛИ ИСПОЛЬЗУЕТСЯ CYDONIA, ДОБАВЛЯЕМ СПЕЦИФИЧНЫЕ ИНСТРУКЦИИ
        if model_used == "thedrummer/cydonia-24b-v4.1":
            from app.chat_bot.config.cydonia_config import CYDONIA_CONFIG
            if messages and messages[0]["role"] == "system":
                current_content = messages[0]["content"]
                suffix = CYDONIA_CONFIG["system_suffix"]
                if suffix not in current_content:
                    messages[0]["content"] = current_content + suffix
                    logger.info(f"[CHAT] Добавлены Cydonia инструкции к системному промпту")
        
        # Логируем используемую модель и размер контекста перед запросом
        from app.chat_bot.utils.context_manager import count_messages_tokens
        final_tokens = count_messages_tokens(messages)
        logger.info(f"[CHAT_BOT] ОТПРАВКА ЗАПРОСА: Модель={model_used}, Контекст={final_tokens}/{max_context_tokens} токенов, Подписка={subscription_type_enum.value if subscription_type_enum else 'FREE'}")
        
        response_text = await openrouter_service.generate_text(
            messages=messages,
            max_tokens=max_tokens,
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
            subscription_type=subscription_type_enum,
            model=model_used
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
        
        # Логируем модель, которая ответила на сообщение
        logger.info(f"[CHAT] Ответ сгенерирован моделью: {model_used} (подписка: {subscription_type_enum.value if subscription_type_enum else 'FREE'})")
        
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
                    # КРИТИЧЕСКИ ВАЖНО: сохраняем историю для ВСЕХ подписок, включая FREE
                    # PREMIUM должен работать так же, как STANDARD и FREE
                    can_save_session = subscription.subscription_type in [
                        SubscriptionType.FREE, 
                        SubscriptionType.STANDARD, 
                        SubscriptionType.PREMIUM, 
                        SubscriptionType.PRO
                    ]
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
        # Логируем начало обработки запроса
        logger.info(f"[CHAT STREAM ENDPOINT] ========================================")
        logger.info(f"[CHAT STREAM ENDPOINT] POST /api/v1/chat/stream")
        logger.info(f"[CHAT STREAM ENDPOINT] User: {current_user.email if current_user else 'Anonymous'} (ID: {current_user.id if current_user else 'N/A'})")
        logger.info(f"[CHAT STREAM ENDPOINT] Character: {request.character}")
        logger.info(f"[CHAT STREAM ENDPOINT] Message (первые 100 символов): {request.message[:100].encode('utf-8', errors='replace').decode('utf-8') if request.message else 'N/A'}...")
        logger.info(f"[CHAT STREAM ENDPOINT] Model from request: {request.model if request.model else 'N/A'}")
        logger.info(f"[CHAT STREAM ENDPOINT] Subscription type: {subscription_type_enum.value if subscription_type_enum else 'FREE'}")
        logger.info(f"[CHAT STREAM ENDPOINT] Full request body model field: {request.model}")
        logger.info(f"[CHAT STREAM ENDPOINT] ========================================")
        
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
        subscription_type_enum = SubscriptionType.FREE
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
                subscription_type_enum = user_subscription.subscription_type

        # Определяем модель ПЕРЕД расчетом лимитов
        from app.chat_bot.services.openrouter_service import get_model_for_subscription
        selected_model = request.model if request.model and subscription_type_enum == SubscriptionType.PREMIUM else None
        model_used = selected_model if selected_model else get_model_for_subscription(subscription_type_enum)
        
        context_limit = get_context_limit(subscription_type_enum)
        max_context_tokens = get_max_context_tokens(subscription_type_enum, model_used)
        max_tokens = get_max_tokens(subscription_type_enum)
        
        # Формируем языковую инструкцию
        target_lang = request.target_language or "ru"
        if target_lang == "ru":
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in RUSSIAN language
- NEVER use Chinese, Japanese, Korean or any Asian languages
- NEVER use Chinese characters (我, 你, 的, 是, 在, 我的手, 轻轻, 抚摸, 触摸, 你的脸庞, 我等待, etc.)
- NEVER use any hieroglyphs or Asian symbols
- Write in Russian using normal Cyrillic alphabet
- If you use Chinese characters, you will be penalized. STRICTLY RUSSIAN ONLY."""
        elif target_lang == "en":
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in ENGLISH language
- NEVER use Russian, Chinese, Japanese, or any other languages
- NEVER use Chinese characters (我, 你, 的, 是, 在, 触摸, etc.) or any hieroglyphs
- Write in English using Latin alphabet only
- If you use any other characters, you will be penalized. STRICTLY ENGLISH ONLY."""
        else:
            lang_instruction = """\n\nCRITICAL LANGUAGE REQUIREMENTS:
- You MUST write your response STRICTLY in RUSSIAN language
- NEVER use Chinese, Japanese, Korean or any Asian languages
- NEVER use Chinese characters or hieroglyphs
- Write in Russian using Cyrillic alphabet
- STRICTLY RUSSIAN ONLY."""
        
        # Формируем массив messages для OpenAI API
        if chat_session:
            # ...
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
            
            # 5. В начало списка сообщений (system prompt) добавляем инструкции
            if openai_messages and openai_messages[0]["role"] == "system":
                openai_messages[0]["content"] += f"\n\nIMPORTANT: Be concise. Your response must be strictly within {max_tokens} tokens."
                openai_messages[0]["content"] += lang_instruction
                
                # Добавляем финальное напоминание для Euryale
                if model_used == "sao10k/l3-euryale-70b":
                    openai_messages[0]["content"] += f"\n\nREMINDER: Write your response ONLY in {target_lang.upper()}. NO CHINESE CHARACTERS."
            
            messages = openai_messages
        else:
            # Нет истории
            messages = [
                {
                    "role": "system",
                    "content": character_config.prompt + f"\n\nIMPORTANT: Be concise. Your response must be strictly within {max_tokens} tokens." + lang_instruction + (f"\n\nREMINDER: Write your response ONLY in {target_lang.upper()}. NO CHINESE CHARACTERS." if model_used == "sao10k/l3-euryale-70b" else "")
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        
        logger.info(f"[CHAT STREAM] Начало стриминга для персонажа '{character_name}', сообщений: {len(messages)}")
        
        # ЕСЛИ ИСПОЛЬЗУЕТСЯ CYDONIA, ДОБАВЛЯЕМ СПЕЦИФИЧНЫЕ ИНСТРУКЦИИ
        if model_used == "thedrummer/cydonia-24b-v4.1":
            from app.chat_bot.config.cydonia_config import CYDONIA_CONFIG
            if messages and messages[0]["role"] == "system":
                # Добавляем суффикс к системному сообщению
                current_content = messages[0]["content"]
                suffix = CYDONIA_CONFIG["system_suffix"]
                if suffix not in current_content:
                    messages[0]["content"] = current_content + suffix
                    logger.info(f"[CHAT STREAM] Добавлены Cydonia инструкции к системному промпту")

        # Логируем используемую модель и размер контекста перед стримингом
        from app.chat_bot.utils.context_manager import count_messages_tokens
        final_tokens = count_messages_tokens(messages)
        logger.info(f"[CHAT_BOT STREAM] НАЧАЛО СТРИМИНГА: Модель={model_used}, Контекст={final_tokens}/{max_context_tokens} токенов, Подписка={subscription_type_enum.value if subscription_type_enum else 'FREE'}")
        
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
                    subscription_type=subscription_type_enum,
                    model=model_used
                ):
                    try:
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
                        
                        # Для более плавной анимации на фронтенде разбиваем большие чанки
                        # и добавляем небольшую задержку
                        if len(chunk) > 10:
                            # Разбиваем на мелкие части по 4-6 символов
                            chunk_size = 5
                            for i in range(0, len(chunk), chunk_size):
                                sub_chunk = chunk[i:i+chunk_size]
                                yield f"data: {json.dumps({'content': sub_chunk})}\n\n"
                                await asyncio.sleep(0.02)
                        else:
                            yield f"data: {json.dumps({'content': chunk})}\n\n"
                            # Небольшая задержка даже для маленьких чанков
                            await asyncio.sleep(0.025)
                    except (ConnectionResetError, BrokenPipeError, OSError) as conn_error:
                        # Обрабатываем ошибки разрыва соединения (нормально для Windows)
                        logger.debug(f"[CHAT STREAM] Соединение разорвано клиентом: {conn_error}")
                        return
                    except Exception as yield_error:
                        logger.error(f"[CHAT STREAM] Ошибка при отправке чанка: {yield_error}")
                        # Продолжаем обработку, не прерывая поток
                
                # Отправляем маркер завершения
                try:
                    yield f"data: {json.dumps({'done': True})}\n\n"
                except (ConnectionResetError, BrokenPipeError, OSError) as conn_error:
                    logger.debug(f"[CHAT STREAM] Соединение разорвано клиентом при отправке маркера завершения: {conn_error}")
                    return
                
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
                            can_save_session = subscription.subscription_type in [
                                SubscriptionType.FREE, 
                                SubscriptionType.STANDARD, 
                                SubscriptionType.PREMIUM, 
                                SubscriptionType.PRO
                            ]
                    
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
                        logger.info(f"[CHAT STREAM] Диалог сохранен в БД (session_id={chat_session.id}), модель: {model_used}")
                except Exception as e:
                    logger.error(f"[CHAT STREAM] Ошибка сохранения диалога: {e}")
                    # Не прерываем стриминг из-за ошибки сохранения
                
            except (ConnectionResetError, BrokenPipeError, OSError) as conn_error:
                logger.debug(f"[CHAT STREAM] Соединение разорвано клиентом: {conn_error}")
                return
            except Exception as e:
                logger.error(f"[CHAT STREAM] Ошибка в генераторе SSE: {e}")
                try:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
                except (ConnectionResetError, BrokenPipeError, OSError):
                    logger.debug(f"[CHAT STREAM] Соединение разорвано клиентом при отправке ошибки")
                    return
        
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


@router.post("/generate_voice")
async def generate_voice(
    request: TTSRequest,
    current_user: Users = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Генерация речи для сообщения.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
        
    try:
        # Извлекаем название голоса из voice_url
        voice_name = "Неизвестный голос"
        if request.voice_url:
            # Извлекаем имя файла из пути
            import os
            voice_filename = os.path.basename(request.voice_url)
            # Убираем расширение и декодируем специальные символы
            voice_name = os.path.splitext(voice_filename)[0]
            # Убираем квадратные скобки если есть
            voice_name = voice_name.replace('[', '').replace(']', '')
        
        # Логируем информацию о генерации голоса
        logger.info("=" * 80)
        logger.info(f"[VOICE PLAYBACK] Начало генерации/воспроизведения голоса")
        logger.info(f"[VOICE PLAYBACK] Пользователь: {current_user.username} (ID: {current_user.id})")
        logger.info(f"[VOICE PLAYBACK] Название голоса: {voice_name}")
        logger.info(f"[VOICE PLAYBACK] Путь к голосу: {request.voice_url}")
        logger.info(f"[VOICE PLAYBACK] Текст для озвучки: {request.text[:100]}{'...' if len(request.text) > 100 else ''}")
        logger.info(f"[VOICE PLAYBACK] Длина текста: {len(request.text)} символов")
        logger.info("=" * 80)
        
        coins_service = CoinsService(db)
        
        # Проверяем баланс перед генерацией
        cost = coins_service.calculate_tts_cost(request.text)
        if not await coins_service.can_user_afford(current_user.id, cost):
            raise HTTPException(
                status_code=400, 
                detail=f"Недостаточно монет. Требуется: {cost}, у вас: {current_user.coins}"
            )
        
        audio_path = await generate_tts_audio(request.text, request.voice_url)
        
        if not audio_path:
            raise HTTPException(status_code=500, detail="Не удалось сгенерировать аудио")
        
        # Списываем монеты после успешной генерации (без commit, чтобы записать историю)
        await coins_service.spend_coins(current_user.id, cost, commit=False)
        
        # Записываем в историю баланса
        try:
            from app.utils.balance_history import record_balance_change
            await record_balance_change(
                db=db,
                user_id=current_user.id,
                amount=-cost,
                reason=f"Голосовая генерация ({len(request.text)} символов)"
            )
        except Exception as e:
            logger.warning(f"Не удалось записать историю баланса для TTS: {e}")
        
        # Коммитим все изменения вместе
        await db.commit()
        
        # Обновляем кэш и профиль пользователя
        await emit_profile_update(current_user.id, db)
        
        # Обновляем баланс в объекте пользователя для ответа
        await db.refresh(current_user)
        
        # Формируем URL для фронтенда
        import os
        from app.config.paths import VOICES_DIR
        
        # Проверяем, что файл находится в правильной директории
        if not str(audio_path).startswith(str(VOICES_DIR)):
            logger.error(f"[GENERATE_VOICE] Файл не в директории voices: {audio_path}, ожидается в {VOICES_DIR}")
            raise HTTPException(status_code=500, detail="Файл сохранен в неправильной директории")
        
        file_name = os.path.basename(audio_path)
        audio_url = f"/voices/{file_name}"
        
        logger.info("=" * 80)
        logger.info(f"[VOICE PLAYBACK] Голос успешно сгенерирован/воспроизведен")
        logger.info(f"[VOICE PLAYBACK] Название голоса: {voice_name}")
        logger.info(f"[VOICE PLAYBACK] Файл аудио: {file_name}")
        logger.info(f"[VOICE PLAYBACK] URL аудио: {audio_url}")
        logger.info(f"[VOICE PLAYBACK] Пользователь: {current_user.username} (ID: {current_user.id})")
        logger.info("=" * 80)
        
        logger.info(f"[GENERATE_VOICE] Аудио сгенерировано: audio_path={audio_path}, file_name={file_name}, audio_url={audio_url}")
        
        # Проверяем существование файла
        if not os.path.exists(audio_path):
            logger.error(f"[GENERATE_VOICE] Файл не существует: {audio_path}")
            raise HTTPException(status_code=500, detail=f"Сгенерированный файл не найден: {audio_path}")
        
        # Проверяем размер файла
        file_size = os.path.getsize(audio_path)
        logger.info(f"[GENERATE_VOICE] Размер файла: {file_size} байт")
        
        if file_size == 0:
            logger.error(f"[GENERATE_VOICE] Файл пустой: {audio_path}")
            raise HTTPException(status_code=500, detail="Сгенерированный файл пустой")
        
        return {
            "status": "success",
            "audio_url": audio_url,
            "cost": cost,
            "remaining_coins": current_user.coins
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка в generate_voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview-voice")
async def preview_voice(request: VoicePreviewRequest):
    """
    Генерация превью голоса из папки default_character_voices.
    
    Озвучивает стандартную фразу приветствия выбранным голосом:
    "Ммм... Наконец-то ты здесь. Я так долго ждала возможности поговорить с тобой наедине.
    Я здесь, чтобы исполнить любой твой приказ. Ну что, приступим?"
    
    Результат кэшируется для избежания повторной генерации.
    """
    try:
        logger.info(f"Запрос на превью голоса: {request.voice_id}")
        
        audio_path = await generate_voice_preview(request.voice_id, request.text)
        
        if not audio_path:
            raise HTTPException(status_code=500, detail="Не удалось сгенерировать превью голоса")
            
        # Формируем URL для фронтенда
        # Путь возвращается относительно BASE_DIR (app/voices/preview_xxx.wav)
        # Нам нужно сделать его доступным через HTTP (/voices/preview_xxx.wav)
        import os
        file_name = os.path.basename(audio_path)
        audio_url = f"/voices/{file_name}"
        
        return {
            "status": "success",
            "audio_url": audio_url,
            "voice_id": request.voice_id
        }
    except Exception as e:
        logger.error(f"Ошибка в preview_voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))
