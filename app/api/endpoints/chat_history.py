from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List, Tuple
from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.chat_history.services.chat_history_service import ChatHistoryService


router = APIRouter()


class SaveMessageRequest(BaseModel):
    character_name: str
    message_type: str  # 'user' или 'assistant'
    message_content: str
    session_id: str = "default"  # ID сессии чата
    image_url: Optional[str] = None
    image_filename: Optional[str] = None


class GetHistoryRequest(BaseModel):
    character_name: str


class ChatHistoryResponse(BaseModel):
    id: int
    character_name: str
    message_type: str
    message_content: str
    image_url: Optional[str] = None
    image_filename: Optional[str] = None
    created_at: str


@router.post("/save-message")
async def save_chat_message(
    request: SaveMessageRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Сохраняет сообщение в историю чата."""
    try:
        service = ChatHistoryService(db)
        
        message = await service.save_message(
            user_id=current_user.id,
            character_name=request.character_name,
            message_type=request.message_type,
            message_content=request.message_content,
            session_id=request.session_id,
            image_url=request.image_url,
            image_filename=request.image_filename
        )
        
        return {
            "success": True,
            "message_id": message.id,
            "message": "Сообщение сохранено в историю"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения сообщения: {str(e)}")


@router.post("/get-history")
async def get_chat_history(
    request: GetHistoryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получает историю чата для конкретного персонажа."""
    try:
        service = ChatHistoryService(db)
        
        messages = await service.get_chat_history(
            user_id=current_user.id,
            character_name=request.character_name
        )
        
        history = []
        for msg in messages:
            history.append({
                "id": msg.id,
                "character_name": msg.character_name,
                "message_type": msg.message_type,
                "message_content": msg.message_content,
                "image_url": msg.image_url,
                "image_filename": msg.image_filename,
                "created_at": msg.created_at.isoformat()
            })
        
        return {
            "success": True,
            "character_name": request.character_name,
            "history": history,
            "count": len(history)
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
        service = ChatHistoryService(db)
        
        characters = await service.get_user_characters_with_history(current_user.id)
        
        return {
            "success": True,
            "characters": characters,
            "count": len(characters)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения персонажей: {str(e)}")


@router.post("/clear-history")
async def clear_chat_history(
    request: GetHistoryRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Очищает историю чата для конкретного персонажа."""
    try:
        service = ChatHistoryService(db)
        
        success = await service.clear_chat_history(
            user_id=current_user.id,
            character_name=request.character_name
        )
        
        return {
            "success": success,
            "message": f"История чата для персонажа '{request.character_name}' {'очищена' if success else 'не найдена'}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки истории: {str(e)}")


@router.get("/stats")
async def get_history_stats(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получает статистику истории чата пользователя."""
    try:
        service = ChatHistoryService(db)
        
        stats = await service.get_history_stats(current_user.id)
        
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
        import logging

        logger = logging.getLogger(__name__)
        user_id = current_user.id
        logger.info(
            "[PROMPT] Поиск промпта для изображения: %s (user_id=%s)",
            image_url,
            user_id
        )

        normalized_url = image_url.split('?')[0].split('#')[0]
        search_candidates: List[Tuple[str, bool]] = []

        search_candidates.append((image_url, True))
        if normalized_url != image_url:
            search_candidates.append((normalized_url, True))

        search_candidates.append((image_url, False))
        if normalized_url != image_url:
            search_candidates.append((normalized_url, False))

        async def _find_prompt(target_url: str, only_current_user: bool) -> Optional[ChatHistory]:
            stmt = (
                select(ChatHistory)
                .where(ChatHistory.image_url == target_url)
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            if only_current_user:
                stmt = stmt.where(ChatHistory.user_id == user_id)
            return (await db.execute(stmt)).scalar_one_or_none()

        message = None
        for candidate_url, scoped in search_candidates:
            message = await _find_prompt(candidate_url, scoped)
            if message:
                break

        if not message:
            logger.info("[PROMPT] Пробуем поиск по частичному совпадению")
            # Сначала ищем среди всех пользователей по частичному совпадению
            stmt = (
                select(ChatHistory)
                .where(ChatHistory.image_url.ilike(f"%{normalized_url}%"))
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            message = (await db.execute(stmt)).scalar_one_or_none()
            
            # Если не нашли, пробуем поиск только среди текущего пользователя
            if not message:
                logger.info(f"[PROMPT] Пробуем поиск по частичному совпадению для user_id={user_id}")
                stmt = (
                    select(ChatHistory)
                    .where(
                        ChatHistory.image_url.ilike(f"%{normalized_url}%"),
                        ChatHistory.user_id == user_id
                    )
                    .order_by(ChatHistory.created_at.desc())
                    .limit(1)
                )
                message = (await db.execute(stmt)).scalar_one_or_none()
            
            # Если все еще не нашли, пробуем поиск по имени файла из URL
            if not message:
                import os
                filename = os.path.basename(normalized_url)
                logger.info(f"[PROMPT] Пробуем поиск по имени файла: {filename}")
                stmt = (
                    select(ChatHistory)
                    .where(ChatHistory.image_url.ilike(f"%{filename}%"))
                    .order_by(ChatHistory.created_at.desc())
                    .limit(1)
                )
                message = (await db.execute(stmt)).scalar_one_or_none()

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
        debug_stmt = select(ChatHistory).where(ChatHistory.user_id == user_id).limit(5)
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
            logger.warning(
                "[PROMPT] Примеры URL из базы для user_id=%s: %s",
                user_id,
                [r.image_url for r in debug_records[:3]]
            )
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
