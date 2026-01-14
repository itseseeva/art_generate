"""
API endpoints для работы с историей генерации изображений.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from loguru import logger

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.models.image_generation_history import ImageGenerationHistory


router = APIRouter(prefix="/image-generation", tags=["Image Generation"])


class SetAdminPromptRequest(BaseModel):
    """Запрос на установку админского промпта."""
    image_url: str = Field(..., description="URL изображения")
    admin_prompt: Optional[str] = Field(None, description="Промпт админа (если null, то удаляется)")


@router.post("/set-admin-prompt/")
async def set_admin_prompt(
    request: SetAdminPromptRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Устанавливает админский промпт для изображения.
    Доступно только для админов.
    Если запись не найдена, создает новую запись с минимальными данными.
    """
    try:
        # Проверяем права админа
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
        
        # Нормализуем URL
        normalized_url = request.image_url.split('?')[0].split('#')[0] if request.image_url else request.image_url
        
        # Функция для извлечения идентификатора файла из URL
        def extract_file_identifier(url: str) -> str:
            """Извлекает уникальный идентификатор файла из URL"""
            if not url:
                return ""
            clean_url = url.split('?')[0].split('#')[0]
            # Извлекаем путь после /generated/ или /media/generated/
            if '/generated/' in clean_url:
                return clean_url.split('/generated/')[-1]
            elif '/media/generated/' in clean_url:
                return clean_url.split('/media/generated/')[-1]
            # Если нет /generated/, берем имя файла
            return clean_url.split('/')[-1]
        
        file_identifier = extract_file_identifier(normalized_url)
        logger.info(f"[ADMIN PROMPT] Установка админского промпта для изображения: {file_identifier}")
        
        # Функция для нормализации URL из базы
        def normalize_db_url(url: str) -> str:
            if not url:
                return ""
            return url.split('?')[0].split('#')[0]
        
        def get_file_id_from_url(url: str) -> str:
            """Извлекает идентификатор файла из URL в базе"""
            return extract_file_identifier(normalize_db_url(url))
        
        # Ищем запись в ImageGenerationHistory по идентификатору файла
        stmt = (
            select(ImageGenerationHistory)
            .where(
                ImageGenerationHistory.image_url.is_not(None),
                ImageGenerationHistory.image_url != ""
            )
            .order_by(ImageGenerationHistory.created_at.desc())
        )
        all_records = (await db.execute(stmt)).scalars().all()
        record = None
        for rec in all_records:
            rec_file_id = get_file_id_from_url(rec.image_url)
            if rec_file_id == file_identifier and file_identifier:
                record = rec
                break
        
        # Если запись не найдена, пытаемся найти информацию в ChatHistory
        if not record:
            logger.info(f"[ADMIN PROMPT] Запись не найдена в ImageGenerationHistory, ищем в ChatHistory")
            try:
                from app.models.chat_history import ChatHistory
                from sqlalchemy.orm import load_only
                from sqlalchemy import not_
                
                chat_stmt = (
                    select(ChatHistory)
                    .options(load_only(
                        ChatHistory.user_id, ChatHistory.character_name, ChatHistory.image_url
                    ))
                    .where(
                        ChatHistory.image_url.is_not(None),
                        ChatHistory.image_url != ""
                    )
                    .order_by(ChatHistory.created_at.desc())
                )
                chat_messages = (await db.execute(chat_stmt)).scalars().all()
                
                chat_record = None
                for msg in chat_messages:
                    msg_file_id = get_file_id_from_url(msg.image_url)
                    if msg_file_id == file_identifier and file_identifier:
                        chat_record = msg
                        break
                
                if chat_record:
                    # Создаем новую запись на основе данных из ChatHistory
                    logger.info(f"[ADMIN PROMPT] Найдена запись в ChatHistory, создаем новую запись в ImageGenerationHistory")
                    record = ImageGenerationHistory(
                        user_id=chat_record.user_id,
                        character_name=chat_record.character_name,
                        image_url=normalized_url,
                        admin_prompt=request.admin_prompt if request.admin_prompt else None
                    )
                    db.add(record)
                    await db.commit()
                    await db.refresh(record)
                else:
                    # Создаем запись с минимальными данными
                    logger.info(f"[ADMIN PROMPT] Запись не найдена нигде, создаем новую с минимальными данными")
                    record = ImageGenerationHistory(
                        user_id=current_user.id,  # Используем ID админа
                        character_name="unknown",  # Дефолтное значение
                        image_url=normalized_url,
                        admin_prompt=request.admin_prompt if request.admin_prompt else None
                    )
                    db.add(record)
                    await db.commit()
                    await db.refresh(record)
            except Exception as chat_err:
                logger.warning(f"[ADMIN PROMPT] Ошибка поиска в ChatHistory: {chat_err}, создаем запись с минимальными данными")
                # Создаем запись с минимальными данными
                record = ImageGenerationHistory(
                    user_id=current_user.id,  # Используем ID админа
                    character_name="unknown",  # Дефолтное значение
                    image_url=normalized_url,
                    admin_prompt=request.admin_prompt if request.admin_prompt else None
                )
                db.add(record)
                await db.commit()
                await db.refresh(record)
        else:
            # Обновляем существующую запись
            update_stmt = (
                update(ImageGenerationHistory)
                .where(ImageGenerationHistory.id == record.id)
                .values(admin_prompt=request.admin_prompt if request.admin_prompt else None)
            )
            await db.execute(update_stmt)
            await db.commit()
        
        logger.info(f"[ADMIN PROMPT] Админский промпт успешно установлен для записи ID={record.id}")
        
        return {
            "success": True,
            "message": "Админский промпт успешно установлен" if request.admin_prompt else "Админский промпт удален"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN PROMPT] Ошибка установки админского промпта: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка установки админского промпта: {str(e)}")
