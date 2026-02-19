from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional, Union
from pydantic import BaseModel
import json
import logging

from app.database.db_depends import get_db
from app.chat_bot.models.models import CharacterDB, CharacterMainPhoto
from app.models.user import Users

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter()

class SearchResult(BaseModel):
    id: Union[int, str]
    type: str  # 'character' or 'user'
    name: str # slug or username
    display_name: str # display_name or username
    avatar_url: Optional[str] = None
    description: Optional[str] = None # Short description

@router.get("/", response_model=List[SearchResult])
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for characters and users.
    """
    if not q:
        return []

    query_str = f"%{q}%"
    results = []
    
    # 1. Search Characters
    try:
        # We also want to fetch one photo URL for each character
        # Using a subquery might be complex with async, let's just fetch characters first
        stmt_chars = (
            select(CharacterDB)
            .where(
                or_(
                    CharacterDB.name.ilike(query_str),
                    CharacterDB.display_name.ilike(query_str)
                )
            )
            .limit(limit)
        )
        chars = (await db.execute(stmt_chars)).scalars().all()
        
        for char in chars:
            avatar_url = None
            
            # Try to get photo from CharacterMainPhoto table
            stmt_photo = (
                select(CharacterMainPhoto.photo_url)
                .where(CharacterMainPhoto.character_id == char.id)
                .limit(1)
            )
            photo_result = (await db.execute(stmt_photo)).scalar_one_or_none()
            
            if photo_result:
                avatar_url = photo_result
            else:
                # Fallback to parsing main_photos json
                if char.main_photos:
                    try:
                        photos_data = json.loads(char.main_photos)
                        if isinstance(photos_data, list) and len(photos_data) > 0:
                            photo_item = photos_data[0]
                            # Start with simple heuristic
                            if isinstance(photo_item, dict) and 'url' in photo_item:
                                avatar_url = photo_item['url']
                            elif isinstance(photo_item, str):
                                # It might be an ID or a URL
                                if photo_item.startswith('http') or photo_item.startswith('/'):
                                    avatar_url = photo_item
                                else:
                                    # Assuming convention if it's just an ID, but let's leave it null for now to avoid broken links
                                    pass
                    except Exception:
                        pass

            results.append(SearchResult(
                id=char.id,
                type='character',
                name=char.name, # This is often used as slug
                display_name=char.display_name or char.name,
                avatar_url=avatar_url,
                description=char.description[:100] + '...' if char.description else None
            ))
            
    except Exception as e:
        logger.error(f"Error searching characters: {e}")

    # 2. Search Users
    # Calculate remaining limit
    remaining_limit = limit - len(results)
    
    if remaining_limit > 0:
        try:
            stmt_users = (
                select(Users)
                .where(Users.username.ilike(query_str))
                .limit(remaining_limit)
            )
            users = (await db.execute(stmt_users)).scalars().all()
            
            for user in users:
                results.append(SearchResult(
                    id=user.id,
                    type='user',
                    name=user.username,
                    display_name=user.username,
                    avatar_url=user.avatar_url,
                    description=None
                ))
        except Exception as e:
            logger.error(f"Error searching users: {e}")

    return results
