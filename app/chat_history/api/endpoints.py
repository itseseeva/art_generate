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
        logger.info(f"[HISTORY API] Пользователь {current_user.id}: can_save_history={can_save}, force_refresh={force_refresh}")
        
        # Если нет прав на сохранение истории, все равно пытаемся получить персонажей
        # (может быть, история была сохранена до изменения подписки)
        # characters уже загружены выше с учетом force_refresh
        
        logger.info(f"[HISTORY API] Возвращаем {len(characters)} персонажей с историей для пользователя {current_user.id}")
        if len(characters) == 0:
            logger.warning(f"[HISTORY API] Пустой список персонажей для user_id={current_user.id}, can_save_history={can_save}")
        for char in characters:
            logger.info(f"[HISTORY API]   - {char.get('name')}: last_message_at={char.get('last_message_at')}")
        
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
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """Получает промпт для изображения по его URL.

    Доступно для всех пользователей, включая неавторизованных.
    Приоритет: сначала ищем в истории текущего пользователя (если авторизован), затем среди всех пользователей.
    """
    try:
        from app.models.chat_history import ChatHistory
        from sqlalchemy import select
        import logging

        logger = logging.getLogger(__name__)
        user_id = current_user.id if current_user else None
        # Логирование удалено для уменьшения шума в логах

        # Максимально простая и надежная нормализация
        normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
        
        # Извлекаем имя файла или путь после /generated/ или /media/generated/
        # Это позволяет находить промпты независимо от домена (localhost, cherrylust.art, yandexcloud и т.д.)
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
            
            # Пробуем найти по точному совпадению нормализованного URL
            # Сначала пробуем точное совпадение, затем ищем среди записей пользователя
            # Для админов ищем по всем пользователям, для обычных пользователей - только по своему user_id
            
            # Ищем по идентификатору файла (имя файла после /generated/), игнорируя домен
            # Для неавторизованных пользователей ищем среди всех записей
            if current_user and current_user.is_admin:
                image_history_stmt = (
                    select(ImageGenerationHistory)
                    .where(
                        ImageGenerationHistory.image_url.is_not(None),
                        ImageGenerationHistory.image_url != ""
                    )
                    .order_by(ImageGenerationHistory.created_at.desc())
                )
            elif current_user:
                image_history_stmt = (
                    select(ImageGenerationHistory)
                    .where(
                        ImageGenerationHistory.image_url.is_not(None),
                        ImageGenerationHistory.image_url != "",
                        ImageGenerationHistory.user_id == user_id
                    )
                    .order_by(ImageGenerationHistory.created_at.desc())
                )
            else:
                # Для неавторизованных пользователей ищем среди всех записей
                image_history_stmt = (
                    select(ImageGenerationHistory)
                    .where(
                        ImageGenerationHistory.image_url.is_not(None),
                        ImageGenerationHistory.image_url != ""
                    )
                    .order_by(ImageGenerationHistory.created_at.desc())
                )
            
            image_history_records = (await db.execute(image_history_stmt)).scalars().all()
            image_history_record = None
            for record in image_history_records:
                record_file_id = get_file_id_from_url(record.image_url)
                if record_file_id == file_identifier and file_identifier:
                    image_history_record = record
                    break
            
            if image_history_record:
                # Приоритет: сначала admin_prompt, затем обычный prompt
                clean_prompt = None
                if image_history_record.admin_prompt:
                    clean_prompt = image_history_record.admin_prompt
                elif image_history_record.prompt:
                    clean_prompt = image_history_record.prompt
                
                if clean_prompt:
                    # Очищаем промпт от JSON если он там есть
                    try:
                        import json
                        if clean_prompt.strip().startswith('{'):
                            data = json.loads(clean_prompt)
                            if isinstance(data, dict) and 'prompt' in data:
                                clean_prompt = data['prompt']
                    except:
                        pass
                        
                    return {
                        "success": True,
                        "prompt": clean_prompt,
                        "character_name": image_history_record.character_name,
                        "generation_time": image_history_record.generation_time
                    }
        except Exception as img_history_err:
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
            return {
                "success": True,
                "prompt": message.message_content,
                "character_name": message.character_name,
                "generation_time": message.generation_time
            }

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
            return {
                "success": True,
                "prompt": message.message_content,
                "character_name": message.character_name,
                "generation_time": message.generation_time
            }

        # Дополнительная диагностика: проверяем, есть ли вообще записи для этого пользователя
        from sqlalchemy.orm import load_only
        debug_stmt = (
            select(ChatHistory)
            .options(load_only(
                ChatHistory.id,
                ChatHistory.user_id,
                ChatHistory.character_name,
                ChatHistory.session_id,
                ChatHistory.message_type,
                ChatHistory.message_content,
                ChatHistory.image_url,
                ChatHistory.image_filename,
                ChatHistory.created_at
            ))
            .where(ChatHistory.user_id == user_id)
            .order_by(ChatHistory.created_at.desc())
            .limit(10)
        )
        debug_result = await db.execute(debug_stmt)
        debug_records = debug_result.scalars().all()
        return {
            "success": False,
            "prompt": None,
            "message": "Промпт не найден для этого изображения"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения промпта: {str(e)}")
