from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class PromoSliderItemBase(BaseModel):
    image_url: Optional[str] = None
    image_url_en: Optional[str] = None
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    subtitle_ru: Optional[str] = None
    subtitle_en: Optional[str] = None
    button_text_ru: Optional[str] = "ПОЛУЧИТЬ СКИДКУ"
    button_text_en: Optional[str] = "GET DISCOUNT"
    target_url: Optional[str] = "/#"
    is_active: bool = True
    show_timer: bool = False
    order: int = 0

class PromoSliderItemCreate(PromoSliderItemBase):
    pass

class PromoSliderItemUpdate(BaseModel):
    image_url: Optional[str] = None
    image_url_en: Optional[str] = None
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    subtitle_ru: Optional[str] = None
    subtitle_en: Optional[str] = None
    button_text_ru: Optional[str] = None
    button_text_en: Optional[str] = None
    target_url: Optional[str] = None
    is_active: Optional[bool] = None
    show_timer: Optional[bool] = None
    order: Optional[int] = None

class PromoSliderItem(PromoSliderItemBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
