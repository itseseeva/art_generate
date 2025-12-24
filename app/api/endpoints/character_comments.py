"""
API эндпоинты для работы с комментариями к персонажам.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.models.user import Users
from app.models.character_comment import CharacterComment

router = APIRouter()


class CreateCommentRequest(BaseModel):
    character_name: str
    content: str


class UpdateCommentRequest(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    character_name: str
    user_id: int
    username: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: Optional[datetime]


@router.post("/create")
async def create_comment(
    request: CreateCommentRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создает новый комментарий к персонажу."""
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")
    
    if len(request.content.strip()) > 2000:
        raise HTTPException(status_code=400, detail="Комментарий слишком длинный (максимум 2000 символов)")
    
    try:
        comment = CharacterComment(
            character_name=request.character_name,
            user_id=current_user.id,
            content=request.content.strip()
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        
        return {
            "success": True,
            "message": "Комментарий успешно создан",
            "comment": {
                "id": comment.id,
                "character_name": comment.character_name,
                "user_id": comment.user_id,
                "username": current_user.username,
                "email": current_user.email,
                "avatar_url": current_user.avatar_url,
                "content": comment.content,
                "is_edited": comment.is_edited,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
                "updated_at": comment.updated_at.isoformat() if comment.updated_at else None
            }
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания комментария: {str(e)}")


@router.get("/{character_name}")
async def get_comments(
    character_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получает список комментариев для персонажа."""
    try:
        # Получаем комментарии с информацией о пользователях
        result = await db.execute(
            select(CharacterComment, Users.username, Users.email, Users.avatar_url)
            .join(Users, CharacterComment.user_id == Users.id)
            .where(CharacterComment.character_name == character_name)
            .order_by(desc(CharacterComment.created_at))
            .offset(skip)
            .limit(limit)
        )
        
        comments_data = result.all()
        
        comments = []
        for comment, username, email, avatar_url in comments_data:
            comments.append({
                "id": comment.id,
                "character_name": comment.character_name,
                "user_id": comment.user_id,
                "username": username,
                "email": email,
                "avatar_url": avatar_url,
                "content": comment.content,
                "is_edited": comment.is_edited,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
                "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                "can_edit": current_user and current_user.id == comment.user_id,
                "can_delete": current_user and (current_user.id == comment.user_id or current_user.is_admin)
            })
        
        # Получаем общее количество комментариев
        count_result = await db.execute(
            select(func.count(CharacterComment.id))
            .where(CharacterComment.character_name == character_name)
        )
        total_count = count_result.scalar() or 0
        
        return {
            "success": True,
            "comments": comments,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения комментариев: {str(e)}")


@router.put("/{comment_id}")
async def update_comment(
    comment_id: int,
    request: UpdateCommentRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновляет комментарий."""
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")
    
    if len(request.content.strip()) > 2000:
        raise HTTPException(status_code=400, detail="Комментарий слишком длинный (максимум 2000 символов)")
    
    try:
        result = await db.execute(
            select(CharacterComment)
            .where(CharacterComment.id == comment_id)
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            raise HTTPException(status_code=404, detail="Комментарий не найден")
        
        if comment.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Вы не можете редактировать этот комментарий")
        
        comment.content = request.content.strip()
        comment.is_edited = True
        comment.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        
        await db.commit()
        await db.refresh(comment)
        
        return {
            "success": True,
            "message": "Комментарий успешно обновлен",
            "comment": {
                "id": comment.id,
                "character_name": comment.character_name,
                "user_id": comment.user_id,
                "content": comment.content,
                "is_edited": comment.is_edited,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
                "updated_at": comment.updated_at.isoformat() if comment.updated_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка обновления комментария: {str(e)}")


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаляет комментарий."""
    try:
        result = await db.execute(
            select(CharacterComment)
            .where(CharacterComment.id == comment_id)
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            raise HTTPException(status_code=404, detail="Комментарий не найден")
        
        if comment.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Вы не можете удалить этот комментарий")
        
        await db.delete(comment)
        await db.commit()
        
        return {
            "success": True,
            "message": "Комментарий успешно удален"
        }
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления комментария: {str(e)}")

