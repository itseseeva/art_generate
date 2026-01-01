"""
API эндпоинты для работы с баг-репортами.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user_optional, get_current_user
from app.models.user import Users
from app.models.bug_report import BugReport, BugComment, BugStatus

router = APIRouter()


class CreateBugReportRequest(BaseModel):
    title: str
    description: str
    location: Optional[str] = None


class BugCommentRequest(BaseModel):
    content: str


class BugCommentResponse(BaseModel):
    id: int
    bug_report_id: int
    user_id: Optional[int]
    author_username: Optional[str]
    content: str
    created_at: str


class BugReportResponse(BaseModel):
    id: int
    title: str
    description: str
    location: Optional[str]
    status: str
    user_id: Optional[int]
    author_username: Optional[str]
    created_at: str
    comments: List[BugCommentResponse]


class UpdateBugStatusRequest(BaseModel):
    new_status: str


@router.get("/")
async def get_bug_reports(
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получает список всех баг-репортов с комментариями."""
    try:
        # Получаем все баг-репорты с информацией о пользователях
        result = await db.execute(
            select(BugReport, Users.username)
            .outerjoin(Users, BugReport.user_id == Users.id)
            .order_by(desc(BugReport.created_at))
        )
        
        bug_reports_data = result.all()
        
        bug_reports = []
        for bug_report, username in bug_reports_data:
            # Получаем комментарии для этого баг-репорта
            comments_result = await db.execute(
                select(BugComment, Users.username)
                .outerjoin(Users, BugComment.user_id == Users.id)
                .where(BugComment.bug_report_id == bug_report.id)
                .order_by(BugComment.created_at)
            )
            
            comments_data = comments_result.all()
            comments = []
            for comment, comment_username in comments_data:
                comments.append(BugCommentResponse(
                    id=comment.id,
                    bug_report_id=comment.bug_report_id,
                    user_id=comment.user_id,
                    author_username=comment_username,
                    content=comment.content,
                    created_at=comment.created_at.isoformat() if comment.created_at else ""
                ))
            
            bug_reports.append(BugReportResponse(
                id=bug_report.id,
                title=bug_report.title,
                description=bug_report.description,
                location=bug_report.location,
                status=bug_report.status.value if bug_report.status else "На проверке",
                user_id=bug_report.user_id,
                author_username=username,
                created_at=bug_report.created_at.isoformat() if bug_report.created_at else "",
                comments=comments
            ))
        
        return bug_reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения баг-репортов: {str(e)}")


@router.post("/")
async def create_bug_report(
    request: CreateBugReportRequest,
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Создает новый баг-репорт."""
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Название проблемы не может быть пустым")
    
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Описание проблемы не может быть пустым")
    
    if len(request.title.strip()) > 500:
        raise HTTPException(status_code=400, detail="Название слишком длинное (максимум 500 символов)")
    
    if len(request.description.strip()) > 10000:
        raise HTTPException(status_code=400, detail="Описание слишком длинное (максимум 10000 символов)")
    
    try:
        bug_report = BugReport(
            title=request.title.strip(),
            description=request.description.strip(),
            location=request.location.strip() if request.location else None,
            status=BugStatus.PENDING,
            user_id=current_user.id if current_user else None
        )
        db.add(bug_report)
        await db.commit()
        await db.refresh(bug_report)
        
        # Получаем username для ответа
        username = current_user.username if current_user else None
        
        return BugReportResponse(
            id=bug_report.id,
            title=bug_report.title,
            description=bug_report.description,
            location=bug_report.location,
            status=bug_report.status.value if bug_report.status else "На проверке",
            user_id=bug_report.user_id,
            author_username=username,
            created_at=bug_report.created_at.isoformat() if bug_report.created_at else "",
            comments=[]
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания баг-репорта: {str(e)}")


@router.post("/{bug_id}/comments/")
async def create_bug_comment(
    bug_id: int,
    request: BugCommentRequest,
    current_user: Optional[Users] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Создает комментарий к баг-репорту."""
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")
    
    if len(request.content.strip()) > 2000:
        raise HTTPException(status_code=400, detail="Комментарий слишком длинный (максимум 2000 символов)")
    
    try:
        # Проверяем существование баг-репорта
        result = await db.execute(
            select(BugReport)
            .where(BugReport.id == bug_id)
        )
        bug_report = result.scalar_one_or_none()
        
        if not bug_report:
            raise HTTPException(status_code=404, detail="Баг-репорт не найден")
        
        comment = BugComment(
            bug_report_id=bug_id,
            user_id=current_user.id if current_user else None,
            content=request.content.strip()
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        
        # Получаем username для ответа
        username = current_user.username if current_user else None
        
        return BugCommentResponse(
            id=comment.id,
            bug_report_id=comment.bug_report_id,
            user_id=comment.user_id,
            author_username=username,
            content=comment.content,
            created_at=comment.created_at.isoformat() if comment.created_at else ""
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания комментария: {str(e)}")


@router.put("/{bug_id}/status/")
async def update_bug_status(
    bug_id: int,
    request: UpdateBugStatusRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновляет статус баг-репорта (только для админов)."""
    is_admin = bool(current_user.is_admin) if current_user.is_admin is not None else False
    if not is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут изменять статус баг-репорта")
    
    # Валидация статуса
    try:
        status_enum = BugStatus(request.new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Недопустимый статус. Допустимые значения: {', '.join([s.value for s in BugStatus])}")
    
    try:
        result = await db.execute(
            select(BugReport)
            .where(BugReport.id == bug_id)
        )
        bug_report = result.scalar_one_or_none()
        
        if not bug_report:
            raise HTTPException(status_code=404, detail="Баг-репорт не найден")
        
        bug_report.status = status_enum
        await db.commit()
        await db.refresh(bug_report)
        
        # Получаем username для ответа
        username_result = await db.execute(
            select(Users.username)
            .where(Users.id == bug_report.user_id)
        )
        username = username_result.scalar_one_or_none()
        
        # Загружаем комментарии
        comments_result = await db.execute(
            select(BugComment, Users.username)
            .outerjoin(Users, BugComment.user_id == Users.id)
            .where(BugComment.bug_report_id == bug_report.id)
            .order_by(BugComment.created_at)
        )
        
        comments_data = comments_result.all()
        comments = []
        for comment, comment_username in comments_data:
            comments.append(BugCommentResponse(
                id=comment.id,
                bug_report_id=comment.bug_report_id,
                user_id=comment.user_id,
                author_username=comment_username,
                content=comment.content,
                created_at=comment.created_at.isoformat() if comment.created_at else ""
            ))
        
        return BugReportResponse(
            id=bug_report.id,
            title=bug_report.title,
            description=bug_report.description,
            location=bug_report.location,
            status=bug_report.status.value,
            user_id=bug_report.user_id,
            author_username=username,
            created_at=bug_report.created_at.isoformat() if bug_report.created_at else "",
            comments=comments
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка обновления статуса: {str(e)}")


@router.delete("/{bug_id}/")
async def delete_bug_report(
    bug_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаляет баг-репорт (только для админов или создателей)."""
    try:
        result = await db.execute(
            select(BugReport)
            .where(BugReport.id == bug_id)
        )
        bug_report = result.scalar_one_or_none()
        
        if not bug_report:
            raise HTTPException(status_code=404, detail="Баг-репорт не найден")
        
        # Проверяем права: админ или создатель
        is_admin = bool(current_user.is_admin) if current_user.is_admin is not None else False
        if not is_admin and bug_report.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="У вас нет прав для удаления этого баг-репорта")
        
        # Удаляем баг-репорт (комментарии удалятся автоматически из-за cascade)
        await db.delete(bug_report)
        await db.commit()
        
        return {"message": "Баг-репорт успешно удален"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления баг-репорта: {str(e)}")

