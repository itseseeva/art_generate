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
    """
    try:
        # Проверяем права админа
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Доступ запрещен. Требуются права администратора.")
        
        # Нормализуем URL
        normalized_url = request.image_url.split('?')[0].split('#')[0] if request.image_url else request.image_url
        filename = normalized_url.split('/')[-1] if '/' in normalized_url else normalized_url
        
        logger.info(f"[ADMIN PROMPT] Установка админского промпта для изображения: {filename}")
        
        # Ищем запись в ImageGenerationHistory
        stmt = (
            select(ImageGenerationHistory)
            .where(
                ImageGenerationHistory.image_url.contains(filename)
            )
            .order_by(ImageGenerationHistory.created_at.desc())
            .limit(1)
        )
        record = (await db.execute(stmt)).scalars().first()
        
        if not record:
            raise HTTPException(status_code=404, detail="Запись генерации изображения не найдена")
        
        # Обновляем admin_prompt
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
