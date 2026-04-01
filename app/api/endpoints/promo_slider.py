from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
import uuid

from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.models.promo_slider import PromoSliderItem
from app.schemas.promo_slider import PromoSliderItem as PromoSliderItemSchema, PromoSliderItemCreate, PromoSliderItemUpdate
from app.services.yandex_storage import YandexCloudStorageService

router = APIRouter()
storage_service = YandexCloudStorageService()

@router.get("/", response_model=List[PromoSliderItemSchema])
async def get_active_slides(db: AsyncSession = Depends(get_db)):
    """Получить список активных слайдов для промо-слайдера."""
    result = await db.execute(
        select(PromoSliderItem)
        .where(PromoSliderItem.is_active == True)
        .order_by(PromoSliderItem.order.asc(), PromoSliderItem.created_at.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=PromoSliderItemSchema)
async def create_slide(
    title_ru: Optional[str] = Form(None),
    title_en: Optional[str] = Form(None),
    subtitle_ru: Optional[str] = Form(None),
    subtitle_en: Optional[str] = Form(None),
    button_text_ru: Optional[str] = Form(None),
    button_text_en: Optional[str] = Form(None),
    target_url: str = Form("/#"),
    is_active: str = Form("true"),
    show_timer: str = Form("false"),
    order: str = Form("0"),
    file_ru: Optional[UploadFile] = File(None),
    file_en: Optional[UploadFile] = File(None),
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать новый слайд (только для админов)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут добавлять слайды")
    
    try:
        image_url = None
        image_url_en = None

        if file_ru:
            file_content = await file_ru.read()
            file_extension = file_ru.filename.split(".")[-1] if "." in file_ru.filename else "jpg"
            object_key = f"promo_slider/{uuid.uuid4()}_ru.{file_extension}"
            image_url = await storage_service.upload_file(
                file_data=file_content,
                object_key=object_key,
                content_type=file_ru.content_type
            )

        if file_en:
            file_content = await file_en.read()
            file_extension = file_en.filename.split(".")[-1] if "." in file_en.filename else "jpg"
            object_key = f"promo_slider/{uuid.uuid4()}_en.{file_extension}"
            image_url_en = await storage_service.upload_file(
                file_data=file_content,
                object_key=object_key,
                content_type=file_en.content_type
            )
        
        new_slide = PromoSliderItem(
            image_url=image_url,
            image_url_en=image_url_en,
            title_ru=title_ru if title_ru and title_ru != "null" else None,
            title_en=title_en if title_en and title_en != "null" else None,
            subtitle_ru=subtitle_ru if subtitle_ru and subtitle_ru != "null" else None,
            subtitle_en=subtitle_en if subtitle_en and subtitle_en != "null" else None,
            button_text_ru=button_text_ru if button_text_ru and button_text_ru != "null" else "ПОЛУЧИТЬ СКИДКУ",
            button_text_en=button_text_en if button_text_en and button_text_en != "null" else "GET DISCOUNT",
            target_url=target_url,
            is_active=is_active.lower() == "true" if isinstance(is_active, str) else bool(is_active),
            show_timer=show_timer.lower() == "true" if isinstance(show_timer, str) else bool(show_timer),
            order=int(order) if order and order != "null" else 0
        )
        
        db.add(new_slide)
        await db.commit()
        await db.refresh(new_slide)
        return new_slide
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания слайда: {str(e)}")

@router.put("/{slide_id}", response_model=PromoSliderItemSchema)
async def update_slide(
    slide_id: int,
    title_ru: Optional[str] = Form(None),
    title_en: Optional[str] = Form(None),
    subtitle_ru: Optional[str] = Form(None),
    subtitle_en: Optional[str] = Form(None),
    button_text_ru: Optional[str] = Form(None),
    button_text_en: Optional[str] = Form(None),
    target_url: Optional[str] = Form(None),
    is_active: Optional[str] = Form(None),
    show_timer: Optional[str] = Form(None),
    order: Optional[str] = Form(None),
    file_ru: Optional[UploadFile] = File(None),
    file_en: Optional[UploadFile] = File(None),
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновить существующий слайд (только для админов)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут изменять слайды")
    
    result = await db.execute(select(PromoSliderItem).where(PromoSliderItem.id == slide_id))
    slide = result.scalar_one_or_none()
    if not slide:
        raise HTTPException(status_code=404, detail="Слайд не найден")
    
    try:
        if file_ru:
            file_content = await file_ru.read()
            file_extension = file_ru.filename.split(".")[-1] if "." in file_ru.filename else "jpg"
            object_key = f"promo_slider/{uuid.uuid4()}_ru.{file_extension}"
            slide.image_url = await storage_service.upload_file(
                file_data=file_content,
                object_key=object_key,
                content_type=file_ru.content_type
            )
        
        if file_en:
            file_content = await file_en.read()
            file_extension = file_en.filename.split(".")[-1] if "." in file_en.filename else "jpg"
            object_key = f"promo_slider/{uuid.uuid4()}_en.{file_extension}"
            slide.image_url_en = await storage_service.upload_file(
                file_data=file_content,
                object_key=object_key,
                content_type=file_en.content_type
            )
            
        if title_ru is not None: slide.title_ru = title_ru
        if title_en is not None: slide.title_en = title_en
        if subtitle_ru is not None: slide.subtitle_ru = subtitle_ru if subtitle_ru != "null" else None
        if subtitle_en is not None: slide.subtitle_en = subtitle_en if subtitle_en != "null" else None
        if button_text_ru is not None: slide.button_text_ru = button_text_ru
        if button_text_en is not None: slide.button_text_en = button_text_en
        if target_url is not None: slide.target_url = target_url
        if is_active is not None: slide.is_active = is_active.lower() == "true"
        if show_timer is not None: slide.show_timer = show_timer.lower() == "true"
        if order is not None: slide.order = int(order) if order != "null" else 0
        
        await db.commit()
        await db.refresh(slide)
        return slide
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка обновления слайда: {str(e)}")

@router.delete("/{slide_id}")
async def delete_slide(
    slide_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удалить слайд (только для админов)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администраторы могут удалять слайды")
    
    result = await db.execute(select(PromoSliderItem).where(PromoSliderItem.id == slide_id))
    slide = result.scalar_one_or_none()
    if not slide:
        raise HTTPException(status_code=404, detail="Слайд не найден")
    
    try:
        await db.delete(slide)
        await db.commit()
        return {"message": "Слайд успешно удален"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления слайда: {str(e)}")
