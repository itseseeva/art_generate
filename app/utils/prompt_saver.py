"""
Утилита для сохранения промпта в ChatHistory.
"""
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.chat_history import ChatHistory

logger = logging.getLogger(__name__)


async def save_prompt_to_history(
    db: AsyncSession,
    user_id: int,
    character_name: str,
    prompt: str,
    image_url: Optional[str] = None,
    task_id: Optional[str] = None
) -> None:
    """
    Сохраняет промпт в ChatHistory.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        character_name: Имя персонажа
        prompt: Промпт пользователя
        image_url: URL изображения
    """
    try:
        # Если есть task_id, ищем запись по task_id (в session_id)
        if task_id:
            from sqlalchemy.orm import load_only
            existing_query = (
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
                .where(
                    ChatHistory.user_id == user_id,
                    ChatHistory.session_id == f"task_{task_id}"
                )
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalars().first()
            
            if existing:
                # Обновляем существующую запись с image_url
                if image_url:
                    normalized_url = image_url.split('?')[0].split('#')[0]
                    existing.image_url = normalized_url
                existing.message_content = prompt
                existing.character_name = character_name
                logger.info(
                    f"[PROMPT] Обновлен промпт по task_id={task_id}, "
                    f"image_url={'present' if image_url else 'missing'}, user_id={user_id}"
                )
            else:
                # Создаем новую запись с task_id
                normalized_url = image_url.split('?')[0].split('#')[0] if image_url else None
                
                # Извлекаем имя файла
                image_filename = None
                if normalized_url:
                    from urllib.parse import urlparse
                    import os
                    parsed_path = urlparse(normalized_url).path
                    image_filename = os.path.basename(parsed_path)

                chat_message = ChatHistory(
                    user_id=user_id,
                    character_name=character_name,
                    session_id=f"task_{task_id}",
                    message_type="user",
                    message_content=prompt,
                    image_url=normalized_url,
                    image_filename=image_filename
                )
                db.add(chat_message)
                logger.info(
                    f"[PROMPT] Создан новый промпт с task_id={task_id}, "
                    f"user_id={user_id}, prompt_length={len(prompt)}, image_url={'present' if image_url else 'missing'}"
                )
        elif image_url:
            # Если нет task_id, но есть image_url, ищем по URL
            normalized_url = image_url.split('?')[0].split('#')[0]
            
            logger.info(
                f"[PROMPT] Сохраняем промпт: user_id={user_id}, character={character_name}, "
                f"normalized_url={normalized_url}, prompt_length={len(prompt)}"
            )
            
            from sqlalchemy.orm import load_only
            existing_query = (
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
                .where(
                    ChatHistory.user_id == user_id,
                    ChatHistory.image_url == normalized_url
                )
                .order_by(ChatHistory.created_at.desc())
                .limit(1)
            )
            existing_result = await db.execute(existing_query)
            existing = existing_result.scalars().first()
            
            if existing:
                # Обновляем существующую запись
                existing.message_content = prompt
                existing.character_name = character_name
                logger.info(
                    f"[PROMPT] Обновлен существующий промпт для image_url={normalized_url}, "
                    f"user_id={user_id}"
                )
            else:
                # Создаем новую запись
                # Извлекаем имя файла
                image_filename = None
                if normalized_url:
                    from urllib.parse import urlparse
                    import os
                    parsed_path = urlparse(normalized_url).path
                    image_filename = os.path.basename(parsed_path)

                chat_message = ChatHistory(
                    user_id=user_id,
                    character_name=character_name,
                    session_id="photo_generation",
                    message_type="user",
                    message_content=prompt,
                    image_url=normalized_url,
                    image_filename=image_filename
                )
                db.add(chat_message)
                logger.info(
                    f"[PROMPT] Создан новый промпт для image_url={normalized_url}, "
                    f"user_id={user_id}, prompt_length={len(prompt)}"
                )
        else:
            logger.warning(f"[PROMPT] Не указан ни task_id, ни image_url, пропускаем сохранение")
            return
        
        # Flush перед commit, чтобы убедиться, что данные отправлены в БД
        await db.flush()
        await db.commit()
        
        logger.info(
            f"[PROMPT] Промпт успешно сохранен: user_id={user_id}, "
            f"task_id={task_id}, image_url={'present' if image_url else 'missing'}"
        )
    except Exception as e:
        logger.error(f"[PROMPT] Ошибка сохранения промпта: {e}")
        import traceback
        logger.error(f"[PROMPT] Трейсбек: {traceback.format_exc()}")
        await db.rollback()
        # Не пробрасываем исключение, чтобы не прерывать выполнение

