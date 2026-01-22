"""
Роутер для рейтингов персонажей (лайки/дизлайки).
КРИТИЧНО: Этот роутер должен быть подключен ПЕРЕД основным роутером персонажей,
чтобы избежать конфликтов с роутом /{character_name}.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.chat_bot.models.models import CharacterDB, CharacterRating
from app.database.db_depends import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.models.user import Users
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_character_ratings, TTL_CHARACTER_RATINGS
)
import logging

logger = logging.getLogger(__name__)

# Создаем отдельный роутер для рейтингов
ratings_router = APIRouter(tags=["Character Ratings"])


@ratings_router.post("/character-ratings/{character_id}/like")
async def like_character(
    character_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ставит лайк персонажу."""
    print("=" * 80)
    print(f"[RATINGS] POST /character-ratings/{character_id}/like вызван!")
    print(f"[RATINGS] User ID: {current_user.id if current_user else 'None'}")
    print("=" * 80)
    logger.info("=" * 80)
    logger.info(f"[RATINGS] POST /character-ratings/{character_id}/like вызван!")
    logger.info(f"[RATINGS] User ID: {current_user.id if current_user else 'None'}")
    logger.info("=" * 80)
    try:
        # Проверяем, существует ли персонаж
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        # Проверяем, есть ли уже рейтинг от этого пользователя
        existing_result = await db.execute(
            select(CharacterRating).where(
                CharacterRating.user_id == current_user.id,
                CharacterRating.character_id == character_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Если уже есть лайк, удаляем его
            if existing.is_like:
                await db.delete(existing)
                await db.commit()
                # Инвалидируем кэш рейтингов для этого персонажа
                await cache_delete(key_character_ratings(character_id))
                await cache_delete(key_character_ratings(character_id, current_user.id))
                return {"success": True, "message": "Like removed", "user_rating": None}
            else:
                # Если есть дизлайк, меняем на лайк
                existing.is_like = True
                existing.updated_at = datetime.utcnow()
                await db.commit()
                # Инвалидируем кэш рейтингов для этого персонажа
                await cache_delete(key_character_ratings(character_id))
                await cache_delete(key_character_ratings(character_id, current_user.id))
                return {"success": True, "message": "Changed from dislike to like", "user_rating": "like"}
        else:
            # Создаем новый лайк
            rating = CharacterRating(
                user_id=current_user.id,
                character_id=character_id,
                is_like=True
            )
            db.add(rating)
            await db.commit()
            # Инвалидируем кэш рейтингов для этого персонажа
            await cache_delete(key_character_ratings(character_id))
            await cache_delete(key_character_ratings(character_id, current_user.id))
            return {"success": True, "message": "Character liked", "user_rating": "like"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error liking character: {e}")
        raise HTTPException(status_code=500, detail=f"Error liking character: {str(e)}")


@ratings_router.post("/character-ratings/{character_id}/dislike")
async def dislike_character(
    character_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ставит дизлайк персонажу."""
    print("=" * 80)
    print(f"[RATINGS] POST /character-ratings/{character_id}/dislike вызван!")
    print(f"[RATINGS] User ID: {current_user.id if current_user else 'None'}")
    print("=" * 80)
    logger.info("=" * 80)
    logger.info(f"[RATINGS] POST /character-ratings/{character_id}/dislike вызван!")
    logger.info(f"[RATINGS] User ID: {current_user.id if current_user else 'None'}")
    logger.info("=" * 80)
    try:
        # Проверяем, существует ли персонаж
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        # Проверяем, есть ли уже рейтинг от этого пользователя
        existing_result = await db.execute(
            select(CharacterRating).where(
                CharacterRating.user_id == current_user.id,
                CharacterRating.character_id == character_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Если уже есть дизлайк, удаляем его
            if not existing.is_like:
                await db.delete(existing)
                await db.commit()
                # Инвалидируем кэш рейтингов для этого персонажа
                await cache_delete(key_character_ratings(character_id))
                await cache_delete(key_character_ratings(character_id, current_user.id))
                return {"success": True, "message": "Dislike removed", "user_rating": None}
            else:
                # Если есть лайк, меняем на дизлайк
                existing.is_like = False
                existing.updated_at = datetime.utcnow()
                await db.commit()
                # Инвалидируем кэш рейтингов для этого персонажа
                await cache_delete(key_character_ratings(character_id))
                await cache_delete(key_character_ratings(character_id, current_user.id))
                return {"success": True, "message": "Changed from like to dislike", "user_rating": "dislike"}
        else:
            # Создаем новый дизлайк
            rating = CharacterRating(
                user_id=current_user.id,
                character_id=character_id,
                is_like=False
            )
            db.add(rating)
            await db.commit()
            # Инвалидируем кэш рейтингов для этого персонажа
            await cache_delete(key_character_ratings(character_id))
            await cache_delete(key_character_ratings(character_id, current_user.id))
            return {"success": True, "message": "Character disliked", "user_rating": "dislike"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error disliking character: {e}")
        raise HTTPException(status_code=500, detail=f"Error disliking character: {str(e)}")


@ratings_router.get("/character-ratings/{character_id}")
async def get_character_ratings(
    character_id: int,
    current_user: Users = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получает рейтинг персонажа (лайки, дизлайки, рейтинг пользователя) с кэшированием."""
    try:
        # Проверяем, существует ли персонаж
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        # Формируем ключ кэша (разный для авторизованных и неавторизованных)
        user_id = current_user.id if current_user else None
        cache_key = key_character_ratings(character_id, user_id)
        
        # Пытаемся получить из кэша
        cached_ratings = await cache_get(cache_key, timeout=0.5)
        if cached_ratings is not None:
            logger.debug(f"[RATINGS] Использован кэш для character_id={character_id}, user_id={user_id}")
            return cached_ratings
        
        # Подсчитываем лайки и дизлайки
        from sqlalchemy import func
        likes_result = await db.execute(
            select(func.count(CharacterRating.id)).where(
                CharacterRating.character_id == character_id,
                CharacterRating.is_like == True
            )
        )
        likes_count = likes_result.scalar() or 0
        
        dislikes_result = await db.execute(
            select(func.count(CharacterRating.id)).where(
                CharacterRating.character_id == character_id,
                CharacterRating.is_like == False
            )
        )
        dislikes_count = dislikes_result.scalar() or 0
        
        # Получаем рейтинг текущего пользователя (если авторизован)
        user_rating = None
        if current_user:
            user_rating_result = await db.execute(
                select(CharacterRating).where(
                    CharacterRating.user_id == current_user.id,
                    CharacterRating.character_id == character_id
                )
            )
            user_rating_obj = user_rating_result.scalar_one_or_none()
            if user_rating_obj:
                user_rating = "like" if user_rating_obj.is_like else "dislike"
        
        ratings_data = {
            "character_id": character_id,
            "likes": likes_count,
            "dislikes": dislikes_count,
            "user_rating": user_rating
        }
        
        # Сохраняем в кэш
        await cache_set(cache_key, ratings_data, ttl_seconds=TTL_CHARACTER_RATINGS, timeout=0.5)
        
        return ratings_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting character ratings: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting character ratings: {str(e)}")

