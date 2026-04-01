from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Integer, text
from app.database.db import Base

class PromoSliderItem(Base):
    """Модель слайда для промо-слайдера на главной странице."""
    __tablename__ = "promo_slider_items"

    id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    image_url = Column(String, nullable=True)
    image_url_en = Column(String, nullable=True)
    
    # Текстовые поля (RU/EN)
    title_ru = Column(String, nullable=True)
    title_en = Column(String, nullable=True)
    subtitle_ru = Column(String, nullable=True)
    subtitle_en = Column(String, nullable=True)
    
    # Кнопка
    button_text_ru = Column(String, nullable=True, default="ПОЛУЧИТЬ СКИДКУ")
    button_text_en = Column(String, nullable=True, default="GET DISCOUNT")
    target_url = Column(String, nullable=True, default="/#")
    
    # Служебные поля
    is_active = Column(Boolean, default=True, nullable=False)
    show_timer = Column(Boolean, default=False, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    created_at = Column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    def __repr__(self):
        return f"<PromoSliderItem(id={self.id}, title_ru='{self.title_ru}')>"
