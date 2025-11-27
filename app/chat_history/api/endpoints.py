"""
API эндпоинты для работы с историей чата.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from pydantic import BaseModel

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users


router = APIRouter()


class ChatMessageRequest(BaseModel):
    """Запрос для сохранения сообщения."""
    character_name: str
    session_id: str
    message_type: str  # 'user' или 'assistant'
    message_content: str
    image_url: str = None
    image_filename: str = None


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
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        success = await history_service.save_message(
            user_id=current_user.id,
            character_name=request.character_name,
            session_id=request.session_id,
            message_type=request.message_type,
            message_content=request.message_content,
            image_url=request.image_url,
            image_filename=request.image_filename
        )
        
        if success:
            return {"success": True, "message": "Сообщение сохранено в историю"}
        else:
            raise HTTPException(
                status_code=403, 
                detail="У вас нет прав на сохранение истории чата. Требуется подписка Premium или выше."
            )
            
    except HTTPException:
        raise
    except Exception as e:
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
    db: AsyncSession = Depends(get_db)
):
    """Получает список персонажей с историей чата."""
    try:
        # Импортируем сервис только здесь, чтобы избежать циклических импортов
        from app.chat_history.services.chat_history_service import ChatHistoryService
        history_service = ChatHistoryService(db)
        
        characters = await history_service.get_user_characters_with_history(current_user.id)
        
        return {
            "success": True,
            "characters": characters,
            "can_save_history": await history_service.can_save_history(current_user.id)
        }
        
    except Exception as e:
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
    current_user: Users = Depends(get_current_user)
):
    """Получает промпт для изображения по его URL.

    Приоритет: сначала ищем в истории текущего пользователя, затем среди всех пользователей.
    """
    try:
        from app.models.chat_history import ChatHistory
        from sqlalchemy import select
        import logging

        logger = logging.getLogger(__name__)
        user_id = current_user.id
        logger.info(
            "[PROMPT] Поиск промпта для изображения: %s (user_id=%s)",
            image_url,
            user_id
        )

        # Нормализуем URL точно так же, как при сохранении
        normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
        
        logger.info(f"[PROMPT] Ищем промпт по точному совпадению: normalized_url={normalized_url}, user_id={user_id}")
        
        # Сначала ищем промпт у текущего пользователя (приоритет)
        stmt = (
            select(ChatHistory)
            .where(
                ChatHistory.image_url == normalized_url,
                ChatHistory.user_id == user_id
            )
            .order_by(ChatHistory.created_at.desc())
            .limit(1)
        )
        message = (await db.execute(stmt)).scalars().first()
        
        # Если не найдено у текущего пользователя, ищем среди всех пользователей (fallback)
        if not message:
            logger.info(f"[PROMPT] Промпт не найден у текущего пользователя, ищем среди всех пользователей")
            stmt = (
                select(ChatHistory)
                .where(ChatHistory.image_url == normalized_url)
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            message = (await db.execute(stmt)).scalars().first()
        
        if message:
            logger.info(
                "[PROMPT] Промпт найден: character_name=%s, user_id=%s, image_url=%s",
                message.character_name,
                message.user_id,
                message.image_url,
            )
            return {
                "success": True,
                "prompt": message.message_content,
                "character_name": message.character_name
            }

        # Дополнительная диагностика: проверяем, есть ли вообще записи для этого пользователя
        debug_stmt = select(ChatHistory).where(ChatHistory.user_id == user_id).order_by(ChatHistory.created_at.desc()).limit(10)
        debug_result = await db.execute(debug_stmt)
        debug_records = debug_result.scalars().all()
        logger.warning(
            "[PROMPT] Промпт не найден для изображения: %s (нормализованный: %s). "
            "Всего записей для user_id=%s: %d",
            image_url,
            normalized_url,
            user_id,
            len(debug_records)
        )
        if debug_records:
            example_urls = [(r.image_url, r.created_at, r.message_content[:50] if r.message_content else None) for r in debug_records[:5] if r.image_url]
            logger.warning(
                "[PROMPT] Последние 5 записей из базы для user_id=%s: %s",
                user_id,
                example_urls,
            )
            # Проверяем, есть ли запись с похожим URL
            for record in debug_records:
                if record.image_url and normalized_url in record.image_url:
                    logger.warning(f"[PROMPT] НАЙДЕНА ПОХОЖАЯ ЗАПИСЬ! record.image_url={record.image_url}, normalized_url={normalized_url}, match={normalized_url in record.image_url}")
                elif record.image_url and record.image_url in normalized_url:
                    logger.warning(f"[PROMPT] НАЙДЕНА ПОХОЖАЯ ЗАПИСЬ (обратное)! record.image_url={record.image_url}, normalized_url={normalized_url}, match={record.image_url in normalized_url}")
        return {
            "success": False,
            "prompt": None,
            "message": "Промпт не найден для этого изображения"
        }
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"[PROMPT] Ошибка получения промпта: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения промпта: {str(e)}")
