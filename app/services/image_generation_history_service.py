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
        generation_time: Optional[float] = None,
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
                        # Нормализуем URL перед сохранением (убираем query параметры и якоря)
                        normalized_image_url = image_url.split('?')[0].split('#')[0] if image_url and not image_url.startswith("pending:") else image_url
                        existing_record.image_url = normalized_image_url
                        # Обновляем generation_time, если оно передано
                        if generation_time is not None:
                            try:
                                existing_record.generation_time = float(generation_time) if generation_time else None
                            except (ValueError, TypeError):
                                existing_record.generation_time = generation_time
                        
                        # Извлекаем оригинальный промпт из JSON, если он там сохранен
                        if prompt:
                            # Если передан новый промпт, используем его (он уже извлечен из JSON в main.py)
                            existing_record.prompt = prompt
                        else:
                            # Если промпт не передан, пытаемся извлечь из существующей записи
                            existing_prompt = existing_record.prompt or "Генерация изображения"
                            try:
                                import json
                                prompt_data = json.loads(existing_prompt)
                                if isinstance(prompt_data, dict) and "prompt" in prompt_data:
                                    existing_record.prompt = prompt_data["prompt"]
                                # Если это не JSON, оставляем как есть
                            except (json.JSONDecodeError, TypeError):
                                # Если это не JSON, оставляем как есть
                                pass
                        
                        await self.db.commit()
                        await self.db.refresh(existing_record)
                        return True
                    else:
                        return True
            
            # Нормализуем URL перед сохранением (убираем query параметры и якоря)
            # Это нужно для корректного поиска в get_prompt_by_image
            # Но не нормализуем pending URL, так как они временные
            normalized_image_url = image_url.split('?')[0].split('#')[0] if image_url and not image_url.startswith("pending:") else image_url
            
            # Проверяем по image_url (на случай если task_id нет, но пропускаем pending записи)
            if normalized_image_url and not normalized_image_url.startswith("pending:"):
                existing = await self.db.execute(
                    select(ImageGenerationHistory).where(
                        ImageGenerationHistory.user_id == user_id,
                        ImageGenerationHistory.image_url == normalized_image_url
                    ).limit(1)
                )
                existing_record = existing.scalars().first()
                if existing_record:
                    # Обновляем generation_time, если оно передано и отсутствует в записи
                    if generation_time is not None and existing_record.generation_time is None:
                        try:
                            existing_record.generation_time = float(generation_time) if generation_time else None
                            await self.db.commit()
                            await self.db.refresh(existing_record)
                            logger.info(f"[IMAGE_HISTORY] Обновлено generation_time для существующей записи: {normalized_image_url}")
                        except (ValueError, TypeError):
                            pass
                    logger.info(f"[IMAGE_HISTORY] Изображение с URL уже сохранено для user_id={user_id}")
                    return True
            
            # Извлекаем оригинальный промпт из JSON, если он там сохранен
            final_prompt = prompt or "Генерация изображения"
            try:
                import json
                prompt_data = json.loads(final_prompt)
                if isinstance(prompt_data, dict) and "prompt" in prompt_data:
                    final_prompt = prompt_data["prompt"]
                # Если это не JSON, используем как есть
            except (json.JSONDecodeError, TypeError):
                # Если это не JSON, используем как есть
                pass
            
            # Создаем новую запись с нормализованным URL
            # Преобразуем generation_time в float, если оно есть
            final_generation_time = None
            if generation_time is not None:
                try:
                    final_generation_time = float(generation_time) if generation_time else None
                except (ValueError, TypeError):
                    final_generation_time = generation_time
            
            history_entry = ImageGenerationHistory(
                user_id=user_id,
                character_name=character_name,
                prompt=final_prompt,
                image_url=normalized_image_url,
                generation_time=final_generation_time,
                task_id=task_id
            )
            
            self.db.add(history_entry)
            await self.db.commit()
            await self.db.refresh(history_entry)
            
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
