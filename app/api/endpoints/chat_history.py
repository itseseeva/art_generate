from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
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
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """Получает промпт для изображения по его URL.

    Доступно для всех пользователей, включая неавторизованных.
    Приоритет: сначала ищем в истории текущего пользователя (если авторизован), затем среди всех пользователей.
    """
    try:
        from app.models.chat_history import ChatHistory
        import logging

        logger = logging.getLogger(__name__)
        user_id = current_user.id if current_user else None
        logger.info(
            "[PROMPT] Поиск промпта для изображения: %s (user_id=%s)",
            image_url,
            user_id or "неавторизован"
        )

        # Нормализуем URL точно так же, как при сохранении
        normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
        
        logger.info(f"[PROMPT] Ищем промпт по точному совпадению: normalized_url={normalized_url}, user_id={user_id or 'неавторизован'}")
        
        # Сначала ищем промпт у текущего пользователя (приоритет), если пользователь авторизован
        message = None
        if current_user:
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
        
        # Если не найдено у текущего пользователя (или пользователь не авторизован), ищем среди всех пользователей (fallback)
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
            logger.info(f"[PROMPT] Промпт найден: message_id={message.id}, image_url={message.image_url}, user_id={message.user_id}, prompt_length={len(message.message_content) if message.message_content else 0}")

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
