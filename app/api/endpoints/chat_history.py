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
    character_name: Optional[str] = None,
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
        
        # --- LOGGING CAPTURE ---
        debug_logs = []
        def log_debug(msg):
            logger.info(msg)
            debug_logs.append(msg)
        
        log_debug(f"--- [PROMPT_DEBUG] START SEARCH ---")
        log_debug(f"[PROMPT_DEBUG] Incoming image_url: '{image_url}'")
        log_debug(f"[PROMPT_DEBUG] User ID: {user_id}")
        
        # Нормализуем URL точно так же, как при сохранении
        normalized_url = image_url.split('?')[0].split('#')[0] if image_url else image_url
        log_debug(f"[PROMPT_DEBUG] Normalized URL: '{normalized_url}'")
        
        # --- 1. ImageGenerationHistory Search ---
        try:
            from app.models.image_generation_history import ImageGenerationHistory
            
            # 1.1 Точное совпадение URL
            log_debug(f"[PROMPT_DEBUG] 1. Searching ImageGenerationHistory by Exact URL...")
            hist_stmt = select(ImageGenerationHistory).where(ImageGenerationHistory.image_url == normalized_url)
            if character_name:
                hist_stmt = hist_stmt.where(ImageGenerationHistory.character_name == character_name)
            if current_user:
                # В PostgreSQL True > False, поэтому order_by(desc(user_id==user_id)) чтобы свои записи были первыми
                hist_stmt = hist_stmt.order_by((ImageGenerationHistory.user_id == user_id).desc(), ImageGenerationHistory.created_at.desc())
            else:
                hist_stmt = hist_stmt.order_by(ImageGenerationHistory.created_at.desc())
            
            hist_record = (await db.execute(hist_stmt.limit(1))).scalars().first()
            if hist_record:
                 log_debug(f"[PROMPT_DEBUG] FOUND in ImageGenerationHistory (Exact match with character). ID: {hist_record.id}, Prompt Len: {len(hist_record.prompt or '')}")
            else:
                 log_debug(f"[PROMPT_DEBUG] NOT FOUND in ImageGenerationHistory (Exact match with character).")
                 
            # 1.1.2 Точное совпадение URL без фильтра имени персонажа
            if not hist_record and character_name:
                log_debug(f"[PROMPT_DEBUG] 1. Searching ImageGenerationHistory without character_name...")
                fallback_stmt = select(ImageGenerationHistory).where(ImageGenerationHistory.image_url == normalized_url)
                if current_user:
                    fallback_stmt = fallback_stmt.order_by((ImageGenerationHistory.user_id == user_id).desc(), ImageGenerationHistory.created_at.desc())
                else:
                    fallback_stmt = fallback_stmt.order_by(ImageGenerationHistory.created_at.desc())
                hist_record = (await db.execute(fallback_stmt.limit(1))).scalars().first()
                if hist_record:
                     log_debug(f"[PROMPT_DEBUG] FOUND in ImageGenerationHistory (Exact match without character). ID: {hist_record.id}")

            # 1.2 По имени файла (User then Global)
            if not hist_record:
                from urllib.parse import urlparse
                import os
                parsed_path = urlparse(normalized_url).path
                filename = os.path.basename(parsed_path)
                log_debug(f"[PROMPT_DEBUG] Extracted Filename: '{filename}'")
                
                if filename and '.' in filename:
                    log_debug(f"[PROMPT_DEBUG] 1.2 Searching ImageGenerationHistory by LIKE %{filename}...")
                    like_stmt = select(ImageGenerationHistory).where(ImageGenerationHistory.image_url.like(f"%{filename}"))
                    if character_name:
                        like_stmt = like_stmt.where(ImageGenerationHistory.character_name == character_name)
                    if current_user:
                        like_stmt = like_stmt.order_by((ImageGenerationHistory.user_id == user_id).desc(), ImageGenerationHistory.created_at.desc())
                    else:
                        like_stmt = like_stmt.order_by(ImageGenerationHistory.created_at.desc())
                        
                    hist_record = (await db.execute(like_stmt.limit(1))).scalars().first()
                    if hist_record:
                         log_debug(f"[PROMPT_DEBUG] FOUND in ImageGenerationHistory (LIKE match with character). ID: {hist_record.id}")
                    else:
                         log_debug(f"[PROMPT_DEBUG] NOT FOUND in ImageGenerationHistory (LIKE match with character).")
                         
                    # 1.2.2 LIKE match без фильтра имени персонажа
                    if not hist_record and character_name:
                        log_debug(f"[PROMPT_DEBUG] 1.2 Searching ImageGenerationHistory LIKE match without character_name...")
                        like_fallback_stmt = select(ImageGenerationHistory).where(ImageGenerationHistory.image_url.like(f"%{filename}"))
                        if current_user:
                            like_fallback_stmt = like_fallback_stmt.order_by((ImageGenerationHistory.user_id == user_id).desc(), ImageGenerationHistory.created_at.desc())
                        else:
                            like_fallback_stmt = like_fallback_stmt.order_by(ImageGenerationHistory.created_at.desc())
                        hist_record = (await db.execute(like_fallback_stmt.limit(1))).scalars().first()
                        if hist_record:
                             log_debug(f"[PROMPT_DEBUG] FOUND in ImageGenerationHistory (LIKE match without character). ID: {hist_record.id}")
            
            if hist_record:
                clean_prompt = None
                if getattr(hist_record, 'admin_prompt', None):
                    clean_prompt = hist_record.admin_prompt
                elif hist_record.prompt:
                    clean_prompt = hist_record.prompt
                    # Очищаем промпт от JSON
                    try:
                        import json
                        if clean_prompt.strip().startswith('{'):
                             data = json.loads(clean_prompt)
                             if isinstance(data, dict) and 'prompt' in data:
                                 clean_prompt = data['prompt']
                    except:
                        pass
                
                if clean_prompt is not None:
                    log_debug(f"[PROMPT_DEBUG] Returning prompt from ImageGenerationHistory.")
                    return {
                        "success": True,
                        "prompt": clean_prompt,
                        "character_name": hist_record.character_name,
                        "debug_logs": debug_logs
                    }
        except Exception as e:
            await db.rollback()
            log_debug(f"[PROMPT_DEBUG] ERROR in ImageGenerationHistory search: {e}")

        # --- 2. ChatHistory Search (Fallback) ---
        message = None
        
        # 2.1 Точное совпадение URL (User)
        if current_user:
            log_debug(f"[PROMPT_DEBUG] 2.1 Searching ChatHistory (Exact URL, User {user_id})...")
            stmt = select(ChatHistory).where(
                ChatHistory.image_url == normalized_url,
                ChatHistory.user_id == user_id
            )
            if character_name:
                stmt = stmt.where(ChatHistory.character_name == character_name)
            stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
            message = (await db.execute(stmt)).scalars().first()
            
            if not message and character_name:
                log_debug(f"[PROMPT_DEBUG] 2.1 Searching ChatHistory (Exact URL, User {user_id}) without character_name...")
                stmt_fallback = select(ChatHistory).where(
                    ChatHistory.image_url == normalized_url,
                    ChatHistory.user_id == user_id
                ).order_by(ChatHistory.created_at.desc()).limit(1)
                message = (await db.execute(stmt_fallback)).scalars().first()
        
        # 2.2 Точное совпадение URL (Global)
        if not message:
            log_debug(f"[PROMPT_DEBUG] 2.2 Searching ChatHistory (Exact URL, Global)...")
            stmt = select(ChatHistory).where(ChatHistory.image_url == normalized_url)
            if character_name:
                stmt = stmt.where(ChatHistory.character_name == character_name)
            stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
            message = (await db.execute(stmt)).scalars().first()
            
            if not message and character_name:
                log_debug(f"[PROMPT_DEBUG] 2.2 Searching ChatHistory (Exact URL, Global) without character_name...")
                stmt_fallback = select(ChatHistory).where(ChatHistory.image_url == normalized_url)
                stmt_fallback = stmt_fallback.order_by(ChatHistory.created_at.desc()).limit(1)
                message = (await db.execute(stmt_fallback)).scalars().first()
        
        # 2.3 По имени файла
        if not message:
            try:
                from urllib.parse import urlparse
                import os
                parsed_path = urlparse(normalized_url).path
                filename = os.path.basename(parsed_path)
                
                if filename and '.' in filename:
                    log_debug(f"[PROMPT_DEBUG] 2.3 Searching ChatHistory (Filename '{filename}')...")
                    
                    # 2.3.1 User
                    if current_user:
                        stmt = select(ChatHistory).where(
                            ChatHistory.image_filename == filename,
                            ChatHistory.user_id == user_id
                        )
                        if character_name:
                            stmt = stmt.where(ChatHistory.character_name == character_name)
                        stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
                        message = (await db.execute(stmt)).scalars().first()
                        
                        if not message and character_name:
                            stmt_f = select(ChatHistory).where(ChatHistory.image_filename == filename, ChatHistory.user_id == user_id)
                            message = (await db.execute(stmt_f.order_by(ChatHistory.created_at.desc()).limit(1))).scalars().first()
                    
                    # 2.3.2 Global
                    if not message:
                        stmt = select(ChatHistory).where(ChatHistory.image_filename == filename)
                        if character_name:
                            stmt = stmt.where(ChatHistory.character_name == character_name)
                        stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
                        message = (await db.execute(stmt)).scalars().first()
                        
                        if not message and character_name:
                            stmt_f = select(ChatHistory).where(ChatHistory.image_filename == filename)
                            message = (await db.execute(stmt_f.order_by(ChatHistory.created_at.desc()).limit(1))).scalars().first()
                    
                    # 2.3.3 LIKE Match (Legacy)
                    if not message:
                        log_debug(f"[PROMPT_DEBUG] 2.3.3 Searching ChatHistory (LIKE match)...")
                        if current_user:
                            stmt = select(ChatHistory).where(
                                ChatHistory.image_url.like(f"%{filename}"),
                                ChatHistory.user_id == user_id
                            )
                            if character_name:
                                stmt = stmt.where(ChatHistory.character_name == character_name)
                            stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
                            message = (await db.execute(stmt)).scalars().first()
                            
                            if not message and character_name:
                                stmt_f = select(ChatHistory).where(ChatHistory.image_url.like(f"%{filename}"), ChatHistory.user_id == user_id)
                                message = (await db.execute(stmt_f.order_by(ChatHistory.created_at.desc()).limit(1))).scalars().first()
                        
                        if not message:
                            stmt = select(ChatHistory).where(ChatHistory.image_url.like(f"%{filename}"))
                            if character_name:
                                stmt = stmt.where(ChatHistory.character_name == character_name)
                            stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(1)
                            message = (await db.execute(stmt)).scalars().first()
                            
                            if not message and character_name:
                                stmt_f = select(ChatHistory).where(ChatHistory.image_url.like(f"%{filename}"))
                                message = (await db.execute(stmt_f.order_by(ChatHistory.created_at.desc()).limit(1))).scalars().first()
                        
                    if message:
                        log_debug(f"[PROMPT_DEBUG] FOUND in ChatHistory via Filename/Like.")
            except Exception as e:
                log_debug(f"[PROMPT_DEBUG] Error in Filename search: {str(e)}")
        
        if message:
            log_debug(f"[PROMPT_DEBUG] ChatHistory Match Found. ID: {message.id}, Type: {message.message_type}, ContentLen: {len(message.message_content or '')}")
            
            prompt_content = message.message_content
            
            # --- 3. Sibling Lookup ---
            # Если сообщение ассистента содержит placeholder текст вместо реального промпта,
            # ищем промпт в предыдущем сообщении пользователя из той же сессии
            placeholder_texts = ["Generating...", "🖼️ Генерирую фото...", "Генерация изображения"]
            if message.message_type == 'assistant' and (not prompt_content or prompt_content in placeholder_texts):
                log_debug(f"[PROMPT_DEBUG] 3. Sibling Lookup Triggered. SessionID: {message.session_id}")
                try:
                    user_stmt = (
                        select(ChatHistory)
                        .where(
                            ChatHistory.session_id == message.session_id,
                            ChatHistory.message_type == 'user'
                        )
                        .order_by(ChatHistory.created_at.desc())
                        .limit(1)
                    )
                    user_message = (await db.execute(user_stmt)).scalars().first()
                    if user_message and user_message.message_content:
                        log_debug(f"[PROMPT_DEBUG] Sibling User Message FOUND. ID: {user_message.id}")
                        prompt_content = user_message.message_content
                    else:
                        log_debug(f"[PROMPT_DEBUG] Sibling User Message NOT FOUND.")
                except Exception as sibling_err:
                    log_debug(f"[PROMPT_DEBUG] Error in Sibling Lookup: {sibling_err}")

            return {
                "success": True,
                "prompt": prompt_content,
                "character_name": message.character_name,
                "debug_logs": debug_logs
            }
        
        log_debug(f"[PROMPT_DEBUG] FAILURE: Prompt not found anywhere for {normalized_url}")

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
        log_debug(f"[PROMPT] Всего записей для user_id={user_id}: {len(debug_records)}")
        
        if debug_records:
            example_urls = [(r.image_url, r.created_at) for r in debug_records[:5] if r.image_url]
            log_debug(f"[PROMPT] Последние 5 URL: {example_urls}")
            
            # Проверяем, есть ли запись с похожим URL
            for record in debug_records:
                if record.image_url and normalized_url in record.image_url:
                    log_debug(f"[PROMPT] НАЙДЕНА ПОХОЖАЯ ЗАПИСЬ! record.image_url={record.image_url}")
                elif record.image_url and record.image_url in normalized_url:
                    log_debug(f"[PROMPT] НАЙДЕНА ПОХОЖАЯ ЗАПИСЬ (обратное)! record.image_url={record.image_url}")
                    
        return {
            "success": False,
            "prompt": None,
            "message": "Промпт не найден для этого изображения",
            "debug_logs": debug_logs
        }
    except Exception as e:
        import traceback
        error_msg = f"[PROMPT] Ошибка получения промпта: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": f"Ошибка сервера: {str(e)}",
            "debug_logs": [error_msg]
        }
