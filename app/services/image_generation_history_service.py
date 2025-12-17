"""
Сервис для сохранения истории генераций изображений.
Простая и надежная реализация без сложных зависимостей.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.image_generation_history import ImageGenerationHistory

logger = logging.getLogger(__name__)


class ImageGenerationHistoryService:
    """Сервис для работы с историей генераций изображений."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def save_generation(
        self,
        user_id: int,
        character_name: str,
        image_url: str,
        prompt: Optional[str] = None,
        generation_time: Optional[int] = None,
        task_id: Optional[str] = None
    ) -> bool:
        """
        Сохраняет историю генерации изображения.
        
        Args:
            user_id: ID пользователя
            character_name: Имя персонажа
            image_url: URL сгенерированного изображения
            prompt: Промпт пользователя (опционально)
            generation_time: Время генерации в секундах (опционально)
            task_id: ID задачи генерации (опционально)
            
        Returns:
            True если сохранено успешно, False в противном случае
        """
        try:
            logger.info(f"[IMAGE_HISTORY] Начинаем сохранение: user_id={user_id}, character={character_name}, task_id={task_id}, image_url={image_url[:50] if image_url else 'None'}...")
            
            # Проверяем, не сохранили ли мы уже эту генерацию
            if task_id:
                existing = await self.db.execute(
                    select(ImageGenerationHistory).where(
                        ImageGenerationHistory.task_id == task_id
                    )
                )
                existing_record = existing.scalars().first()
                if existing_record:
                    # Если это временная запись (pending), обновляем её
                    if existing_record.image_url and existing_record.image_url.startswith("pending:"):
                        logger.info(f"[IMAGE_HISTORY] Найдена временная запись, обновляем: task_id={task_id}")
                        existing_record.image_url = image_url
                        existing_record.generation_time = generation_time
                        await self.db.commit()
                        await self.db.refresh(existing_record)
                        logger.info(f"[IMAGE_HISTORY] ✓ Временная запись обновлена для task_id={task_id}")
                        return True
                    else:
                        logger.info(f"[IMAGE_HISTORY] Генерация с task_id={task_id} уже сохранена, пропускаем")
                        return True
            
            # Проверяем по image_url (на случай если task_id нет, но пропускаем pending записи)
            if image_url and not image_url.startswith("pending:"):
                normalized_url = image_url.split('?')[0].split('#')[0]
                existing = await self.db.execute(
                    select(ImageGenerationHistory).where(
                        ImageGenerationHistory.user_id == user_id,
                        ImageGenerationHistory.image_url == normalized_url
                    ).limit(1)
                )
                if existing.scalars().first():
                    logger.info(f"[IMAGE_HISTORY] Изображение с URL уже сохранено для user_id={user_id}")
                    return True
            
            # Создаем новую запись
            history_entry = ImageGenerationHistory(
                user_id=user_id,
                character_name=character_name,
                prompt=prompt or "Генерация изображения",
                image_url=image_url,
                generation_time=generation_time,
                task_id=task_id
            )
            
            self.db.add(history_entry)
            await self.db.commit()
            await self.db.refresh(history_entry)
            
            logger.info(
                f"[IMAGE_HISTORY] ✓ Сохранена история генерации: "
                f"user_id={user_id}, character={character_name}, "
                f"image_url={image_url[:50]}..., task_id={task_id}"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"[IMAGE_HISTORY] Ошибка сохранения истории: {e}")
            await self.db.rollback()
            return False
    
    async def get_user_history(
        self,
        user_id: int,
        character_name: Optional[str] = None,
        limit: int = 100
    ) -> list[ImageGenerationHistory]:
        """
        Получает историю генераций для пользователя.
        
        Args:
            user_id: ID пользователя
            character_name: Имя персонажа (опционально, для фильтрации)
            limit: Максимальное количество записей
            
        Returns:
            Список записей истории
        """
        try:
            query = select(ImageGenerationHistory).where(
                ImageGenerationHistory.user_id == user_id
            )
            
            if character_name:
                query = query.where(
                    ImageGenerationHistory.character_name == character_name
                )
            
            query = query.order_by(
                ImageGenerationHistory.created_at.desc()
            ).limit(limit)
            
            result = await self.db.execute(query)
            return list(result.scalars().all())
            
        except Exception as e:
            logger.error(f"[IMAGE_HISTORY] Ошибка получения истории: {e}")
            return []
