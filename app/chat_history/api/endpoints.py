"""
API эндпоинты для работы с историей чата.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.models.user import Users
from app.utils.redis_cache import (
    cache_get, cache_set, key_image_metadata, TTL_IMAGE_METADATA
)


router = APIRouter()


class ChatMessageRequest(BaseModel):
    """Запрос для сохранения сообщения."""
    character_name: str
    session_id: str
    message_type: str  # 'user' или 'assistant'
    message_content: str = ""  # Может быть пустым для сообщений только с фото
    image_url: Optional[str] = None
    image_filename: Optional[str] = None


class ChatHistoryRequest(BaseModel):
    """Запрос для получения истории чата."""
    character_name: str
    session_id: str


class ClearHistoryRequest(BaseModel):
    """Запрос для очистки истории чата."""
    character_name: str
    session_id: str


@router.post("/save-message")
async def save_chat_message(
    request: ChatMessageRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Сохраняет сообщение в историю чата."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(
            f"[CHAT_HISTORY_API] Сохранение сообщения: user_id={current_user.id}, "
            f"character={request.character_name}, type={request.message_type}, "
            f"has_image={bool(request.image_url)}, content_length={len(request.message_content)}"
        )
        
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        # Если message_content пустой, но есть image_url, используем дефолтный текст
        message_content = request.message_content
        if not message_content and request.image_url:
            message_content = "Генерация изображения"
            logger.info(f"[CHAT_HISTORY_API] message_content пустой, используем '{message_content}'")
        
        success = await history_service.save_message(
            user_id=current_user.id,
            character_name=request.character_name,
            session_id=request.session_id,
            message_type=request.message_type,
            message_content=message_content,
            image_url=request.image_url,
            image_filename=request.image_filename
        )
        
        if success:
            logger.info(f"[CHAT_HISTORY_API] ✓ Сообщение сохранено в историю для user_id={current_user.id}")
            return {"success": True, "message": "Сообщение сохранено в историю"}
        else:
            logger.warning(f"[CHAT_HISTORY_API] Не удалось сохранить сообщение для user_id={current_user.id} (нет прав)")
            raise HTTPException(
                status_code=403, 
                detail="У вас нет прав на сохранение истории чата. Требуется подписка STANDARD или PREMIUM."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[CHAT_HISTORY_API] Ошибка сохранения сообщения: {e}")
        import traceback
        logger.error(f"[CHAT_HISTORY_API] Трейсбек: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения сообщения: {str(e)}")


@router.post("/get-history")
async def get_chat_history(
    request: ChatHistoryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получает историю чата для конкретного персонажа."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        history = await history_service.get_chat_history(
            user_id=current_user.id,
            character_name=request.character_name,
            session_id=request.session_id
        )
        
        return {
            "success": True,
            "history": history,
            "can_save_history": await history_service.can_save_history(current_user.id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения истории: {str(e)}")


@router.get("/characters")
async def get_characters_with_history(
    current_user: Users = Depends(get_current_user),
    force_refresh: bool = Query(False, description="Принудительно обновить кэш"),
    db: AsyncSession = Depends(get_db)
):
    """Получает список персонажей с историей чата."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        characters = await history_service.get_user_characters_with_history(current_user.id, force_refresh=force_refresh)
        
        # Проверяем подписку пользователя
        can_save = await history_service.can_save_history(current_user.id)
        
        # Если нет прав на сохранение истории, все равно пытаемся получить персонажей
        # (может быть, история была сохранена до изменения подписки)
        # characters уже загружены выше с учетом force_refresh
        
        return {
            "success": True,
            "characters": characters,
            "can_save_history": can_save
        }
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"[HISTORY API] Ошибка получения списка персонажей: {e}")
        import traceback
        logger.error(f"[HISTORY API] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения списка персонажей: {str(e)}")


@router.post("/clear-history")
async def clear_chat_history(
    request: ClearHistoryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Очищает историю чата для конкретного персонажа."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        success = await history_service.clear_chat_history(
            user_id=current_user.id,
            character_name=request.character_name,
            session_id=request.session_id
        )
        
        if success:
            return {"success": True, "message": "История чата очищена"}
        else:
            raise HTTPException(
                status_code=403, 
                detail="У вас нет прав на очистку истории чата. Требуется подписка Premium или выше."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки истории: {str(e)}")


@router.post("/clear-all-history")
async def clear_all_chat_history(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Очищает всю историю чата для текущего пользователя."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        success = await history_service.clear_all_chat_history(current_user.id)
        
        if success:
            return {"success": True, "message": "Вся история чата очищена"}
        else:
            raise HTTPException(status_code=500, detail="Ошибка очистки истории")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки истории: {str(e)}")


@router.post("/clear-history-for-free")
async def clear_chat_history_for_free(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Очищает всю историю чата для пользователей с FREE подпиской. Вызывается при выходе из чата или обновлении страницы."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        success = await history_service.clear_chat_history_for_free_users(current_user.id)
        
        if success:
            return {"success": True, "message": "История чата очищена для FREE подписки"}
        else:
            return {"success": False, "message": "Очистка истории доступна только для FREE подписки"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки истории: {str(e)}")


@router.get("/stats")
async def get_history_stats(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получает статистику по истории чата."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        stats = await history_service.get_history_stats(current_user.id)
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")


@router.get("/prompt-by-image")
async def get_prompt_by_image(
    image_url: str,
    character_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """Получает промпт для изображения по его URL с кэшированием.

    Доступно для всех пользователей, включая неавторизованных.
    Приоритет: сначала ищем в истории по URL/идентификатору файла, затем среди всех пользователей.
    Если передан character_name и по URL ничего не найдено (например, фото с главной из paid_gallery),
    делаем fallback: возвращаем последний известный промпт для этого персонажа.
    """
    try:
        from app.models.chat_history import ChatHistory
        from sqlalchemy import select
        from app.utils.redis_cache import (
            cache_get, cache_set, key_image_metadata, TTL_IMAGE_METADATA
        )
        import logging

        logger = logging.getLogger(__name__)
        user_id = current_user.id if current_user else None
        
        # Максимально простая и надежная нормализация
        normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
        
        # Формируем ключ кэша
        cache_key = key_image_metadata(normalized_url)
        
        # Пытаемся получить из кэша
        cached_metadata = await cache_get(cache_key, timeout=0.5)
        if cached_metadata is not None:
            logger.debug(f"[IMAGE METADATA] Использован кэш для image_url={normalized_url[:50]}...")
            return cached_metadata
        
        # Извлекаем имя файла или путь после /generated/ или /media/generated/
        # Это позволяет находить промпты независимо от домена (localhost, candygirlschat.com, yandexcloud и т.д.)
        def extract_file_identifier(url: str) -> str:
            """Извлекает уникальный идентификатор файла из URL (имя файла или путь после /generated/)"""
            if not url:
                return ""
            # Убираем параметры запроса и якоря
            clean_url = url.split('?')[0].split('#')[0]
            # Извлекаем путь после /generated/ или /media/generated/
            if '/generated/' in clean_url:
                parts = clean_url.split('/generated/')
                if len(parts) > 1:
                    return parts[-1]  # Имя файла после /generated/
            elif '/media/generated/' in clean_url:
                parts = clean_url.split('/media/generated/')
                if len(parts) > 1:
                    return parts[-1]  # Имя файла после /media/generated/
            # Если не нашли /generated/, берем просто имя файла
            if '/' in clean_url:
                return clean_url.split('/')[-1]
            return clean_url
        
        file_identifier = extract_file_identifier(normalized_url)

        # 1. СНАЧАЛА ищем в ImageGenerationHistory (там может быть admin_prompt)
        # Приоритет: admin_prompt важнее всего
        try:
            from app.models.image_generation_history import ImageGenerationHistory
            
            # Функция для нормализации URL из базы и извлечения идентификатора
            def normalize_db_url(url: str) -> str:
                if not url:
                    return ""
                return url.split('?')[0].split('#')[0]
            
            def get_file_id_from_url(url: str) -> str:
                """Извлекает идентификатор файла из URL в базе"""
                return extract_file_identifier(normalize_db_url(url))
            
            # Ищем по идентификатору файла (имя файла после /generated/), игнорируя домен.
            # Промпт к изображению доступен всем: ищем по всем записям (любой пользователь может видеть промпт к любому фото).
            # При нескольких совпадениях приоритет: запись текущего пользователя, затем по дате создания.
            from sqlalchemy import case
            order_criteria = [ImageGenerationHistory.created_at.desc()]
            if current_user:
                order_criteria.insert(0, case((ImageGenerationHistory.user_id == user_id, 1), else_=0).desc())
            image_history_stmt = (
                select(ImageGenerationHistory)
                .where(
                    ImageGenerationHistory.image_url.is_not(None),
                    ImageGenerationHistory.image_url != ""
                )
                .order_by(*order_criteria)
            )
            
            image_history_records = (await db.execute(image_history_stmt)).scalars().all()
            image_history_record = None
            for record in image_history_records:
                record_file_id = get_file_id_from_url(record.image_url)
                if record_file_id == file_identifier and file_identifier:
                    image_history_record = record
                    break
            
            if image_history_record:
                # 1.1 Получаем базовые значения
                raw_prompt = image_history_record.prompt
                raw_prompt_en = image_history_record.prompt_en
                raw_prompt_ru = image_history_record.prompt_ru
                admin_prompt = image_history_record.admin_prompt

                # 1.2 Приоритет admin_prompt - если есть, он перезаписывает все
                if admin_prompt:
                    # Считаем admin_prompt источником истины
                    # Пытаемся определить язык админского промпта
                    import re
                    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', admin_prompt))
                    if has_cyrillic:
                        raw_prompt_ru = admin_prompt
                        # Если нет английского или он старый, переведем (позже)
                    else:
                        raw_prompt_en = admin_prompt
                        # Если нет русского, переведем (позже)

                # 1.3 Логика заполнения пропусков (translation fallback)
                final_prompt_en = raw_prompt_en
                final_prompt_ru = raw_prompt_ru
                
                # Если нет ни того ни другого, берем raw_prompt
                if not final_prompt_en and not final_prompt_ru and raw_prompt:
                     # Определяем язык raw_prompt
                     import re
                     has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', raw_prompt))
                     if has_cyrillic:
                         final_prompt_ru = raw_prompt
                     else:
                         final_prompt_en = raw_prompt

                # Helper для перевода
                def translate_text(text: str, target_lang: str) -> str:
                     if not text: return ""
                     try:
                         # Очистка от JSON если есть
                         clean_text = text
                         if clean_text.strip().startswith('{'):
                             import json
                             try:
                                 data = json.loads(clean_text)
                                 if isinstance(data, dict) and 'prompt' in data:
                                     clean_text = data['prompt']
                             except: pass
                         
                         from deep_translator import GoogleTranslator
                         source_lang = 'en' if target_lang == 'ru' else 'ru'
                         translator = GoogleTranslator(source=source_lang, target=target_lang)
                         
                         if len(clean_text) > 4000:
                             parts = clean_text.split('\n')
                             translated_parts = []
                             for part in parts:
                                 if part.strip():
                                     translated_parts.append(translator.translate(part))
                             return '\n'.join(translated_parts)
                         else:
                             return translator.translate(clean_text)
                     except Exception as e:
                         logger.warning(f"[TRANSLATE] Error translating validation to {target_lang}: {e}")
                         return text # Fallback to original

                # Если все еще нет en, но есть ru -> переводим
                if not final_prompt_en and final_prompt_ru:
                    final_prompt_en = translate_text(final_prompt_ru, 'en')
                
                # Если все еще нет ru, но есть en -> переводим
                if not final_prompt_ru and final_prompt_en:
                     final_prompt_ru = translate_text(final_prompt_en, 'ru')

                result = {
                    "success": True,
                    "prompt": final_prompt_ru, # Legacy field for compatibility (defaults to RU)
                    "prompt_ru": final_prompt_ru,
                    "prompt_en": final_prompt_en,
                    "character_name": image_history_record.character_name,
                    "generation_time": image_history_record.generation_time
                }
                
                # Сохраняем в кэш
                await cache_set(cache_key, result, ttl_seconds=TTL_IMAGE_METADATA, timeout=0.5)
                
                return result
        except Exception as img_history_err:
            await db.rollback()
            logger.warning(f"[PROMPT_DEBUG] ERROR in ImageGenerationHistory search: {img_history_err}")
            pass

        # 2. Если не нашли в ImageGenerationHistory, ищем в ChatHistory (там сообщения чата)
        from sqlalchemy.orm import load_only
        from sqlalchemy import and_, not_
        
        # Функция для нормализации URL из базы
        def normalize_db_url(url: str) -> str:
            if not url:
                return ""
            return url.split('?')[0].split('#')[0]
        
        # Список исключаемых паттернов для контента (заглушки)
        exclude_patterns = ["Генерация изображения", "[image:", "Генерация..."]
        
        # Получаем все записи с изображениями и ищем по идентификатору файла
        # Если пользователь авторизован, сначала ищем в его истории, затем среди всех
        if current_user:
            stmt = (
                select(ChatHistory)
                .options(load_only(
                    ChatHistory.id, ChatHistory.user_id, ChatHistory.character_name,
                    ChatHistory.message_content, ChatHistory.image_url, ChatHistory.created_at,
                    ChatHistory.generation_time
                ))
                .where(
                    ChatHistory.user_id == user_id,
                    ChatHistory.image_url.is_not(None),
                    ChatHistory.image_url != "",
                    ChatHistory.message_content.is_not(None),
                    ChatHistory.message_content != "",
                    # Исключаем заглушки
                    not_(ChatHistory.message_content.like("Генерация изображения%")),
                    not_(ChatHistory.message_content.like("[image:%"))
                )
                .order_by(ChatHistory.created_at.desc())
            )
            messages = (await db.execute(stmt)).scalars().all()
        else:
            # Для неавторизованных пользователей ищем среди всех записей
            stmt = (
                select(ChatHistory)
                .options(load_only(
                    ChatHistory.id, ChatHistory.user_id, ChatHistory.character_name,
                    ChatHistory.message_content, ChatHistory.image_url, ChatHistory.created_at,
                    ChatHistory.generation_time
                ))
                .where(
                    ChatHistory.image_url.is_not(None),
                    ChatHistory.image_url != "",
                    ChatHistory.message_content.is_not(None),
                    ChatHistory.message_content != "",
                    # Исключаем заглушки
                    not_(ChatHistory.message_content.like("Генерация изображения%")),
                    not_(ChatHistory.message_content.like("[image:%"))
                )
                .order_by(ChatHistory.created_at.desc())
            )
            messages = (await db.execute(stmt)).scalars().all()
        message = None
        for msg in messages:
            msg_file_id = extract_file_identifier(msg.image_url)
            if msg_file_id == file_identifier and file_identifier:
                message = msg
                break
        
        if message and message.message_content:
            prompt_text = message.message_content
            # Helper для перевода (дубль, можно вынести но пока оставим тут для изоляции)
            def translate_chat_prompt(text: str):
                import re
                has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
                
                from deep_translator import GoogleTranslator
                
                prompt_ru = text
                prompt_en = text
                
                try:
                    if has_cyrillic:
                        # Есть кириллица -> это RU. Переводим в EN
                         translator = GoogleTranslator(source='ru', target='en')
                         if len(text) > 4000:
                             prompt_en = text # Too long, skip helper for now
                         else:
                             prompt_en = translator.translate(text)
                    else:
                        # Нет кириллицы -> это EN. Переводим в RU
                         translator = GoogleTranslator(source='en', target='ru')
                         if len(text) > 4000:
                             prompt_ru = text 
                         else:
                             prompt_ru = translator.translate(text)
                except Exception as e:
                    logger.warning(f"Translate error: {e}")
                    
                return prompt_ru, prompt_en

            p_ru, p_en = translate_chat_prompt(prompt_text)

            result = {
                "success": True,
                "prompt": p_ru, # Legacy
                "prompt_ru": p_ru,
                "prompt_en": p_en,
                "character_name": message.character_name,
                "generation_time": message.generation_time
            }
            
            # Сохраняем в кэш
            await cache_set(cache_key, result, ttl_seconds=TTL_IMAGE_METADATA, timeout=0.5)
            
            return result

        # 3. Крайний случай: поиск по всем пользователям по идентификатору файла (тоже исключая заглушки)
        stmt = (
            select(ChatHistory)
            .options(load_only(
                ChatHistory.id, ChatHistory.user_id, ChatHistory.character_name,
                ChatHistory.message_content, ChatHistory.image_url, ChatHistory.created_at,
                ChatHistory.generation_time
            ))
            .where(
                ChatHistory.image_url.is_not(None),
                ChatHistory.image_url != "",
                ChatHistory.message_content.is_not(None),
                ChatHistory.message_content != "",
                not_(ChatHistory.message_content.like("Генерация изображения%")),
                not_(ChatHistory.message_content.like("[image:%"))
            )
            .order_by(ChatHistory.created_at.desc())
        )
        all_messages = (await db.execute(stmt)).scalars().all()
        message = None
        for msg in all_messages:
            msg_file_id = extract_file_identifier(msg.image_url)
            if msg_file_id == file_identifier and file_identifier:
                message = msg
                break
        if message and message.message_content:
            prompt_text = message.message_content
            # Helper для перевода (дубль 2)
            def translate_chat_prompt_2(text: str):
                import re
                has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
                
                from deep_translator import GoogleTranslator
                
                prompt_ru = text
                prompt_en = text
                
                try:
                    if has_cyrillic:
                        # Есть кириллица -> это RU. Переводим в EN
                         translator = GoogleTranslator(source='ru', target='en')
                         if len(text) > 4000:
                             prompt_en = text
                         else:
                             prompt_en = translator.translate(text)
                    else:
                        # Нет кириллицы -> это EN. Переводим в RU
                         translator = GoogleTranslator(source='en', target='ru')
                         if len(text) > 4000:
                             prompt_ru = text 
                         else:
                             prompt_ru = translator.translate(text)
                except Exception as e:
                    logger.warning(f"Translate error: {e}")
                    
                return prompt_ru, prompt_en

            p_ru, p_en = translate_chat_prompt_2(prompt_text)

            result = {
                "success": True,
                "prompt": p_ru, # Legacy
                "prompt_ru": p_ru,
                "prompt_en": p_en,
                "character_name": message.character_name,
                "generation_time": message.generation_time
            }
            
            # Сохраняем в кэш
            await cache_set(cache_key, result, ttl_seconds=TTL_IMAGE_METADATA, timeout=0.5)
            
            return result

        # Fallback для главной страницы: если URL из paid_gallery/static (не совпадает с БД),
        # и передан character_name — возвращаем последний известный промпт для этого персонажа.
        if character_name and character_name.strip():
            # Расширенная логика fallback для любых статических/загруженных изображений
            # Если это не сгенерированное изображение (нет /generated/), считаем его статическим
            is_static_like_url = (
                "/paid_gallery/" in normalized_url
                or "/static/" in normalized_url
                or "/media/" in normalized_url
                or "cloudinary" in normalized_url
                or "/user_uploads/" in normalized_url
                or not "/generated/" in normalized_url
            )
            if is_static_like_url:
                try:
                    from app.models.image_generation_history import ImageGenerationHistory
                    from sqlalchemy import or_
                    fallback_stmt = (
                        select(ImageGenerationHistory)
                        .where(
                            ImageGenerationHistory.character_name.ilike(character_name.strip()),
                            ImageGenerationHistory.image_url.is_not(None),
                            ImageGenerationHistory.image_url != "",
                            or_(
                                ImageGenerationHistory.admin_prompt.is_not(None),
                                ImageGenerationHistory.prompt.is_not(None),
                            ),
                        )
                        .order_by(ImageGenerationHistory.created_at.desc())
                        .limit(1)
                    )
                    fallback_record = (await db.execute(fallback_stmt)).scalars().first()
                    if fallback_record:
                        clean_prompt = fallback_record.admin_prompt or fallback_record.prompt
                        if clean_prompt:
                            try:
                                import json
                                if clean_prompt.strip().startswith("{"):
                                    data = json.loads(clean_prompt)
                                    if isinstance(data, dict) and "prompt" in data:
                                        clean_prompt = data["prompt"]
                            except Exception:
                                pass
                            try:
                                import re
                                has_cyrillic = bool(re.search(r"[а-яёА-ЯЁ]", clean_prompt))
                                if not has_cyrillic:
                                    from deep_translator import GoogleTranslator
                                    translator = GoogleTranslator(source="en", target="ru")
                                    if len(clean_prompt) > 4000:
                                        parts = clean_prompt.split("\n")
                                        translated_parts = [translator.translate(p) for p in parts if p.strip()]
                                        clean_prompt = "\n".join(translated_parts)
                                    else:
                                        clean_prompt = translator.translate(clean_prompt)
                            except (ImportError, Exception) as translate_err:
                                logger.warning(f"[PROMPT FALLBACK] Ошибка перевода: {translate_err}")
                            fallback_cache_key = f"{cache_key}|char:{character_name.strip().lower()}"
                            result = {
                                "success": True,
                                "prompt": clean_prompt,
                                "character_name": fallback_record.character_name,
                                "generation_time": fallback_record.generation_time,
                            }
                            await cache_set(fallback_cache_key, result, ttl_seconds=TTL_IMAGE_METADATA, timeout=0.5)
                            return result
                except Exception as fallback_err:
                    await db.rollback()
                    logger.warning(f"[PROMPT FALLBACK] Ошибка fallback по character_name: {fallback_err}")

        return {
            "success": False,
            "prompt": None,
            "message": "Промпт не найден для этого изображения"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения промпта: {str(e)}")
