from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.chat_bot.api.character_endpoints import (
    _character_slug,
    _normalize_main_photos,
)
from app.chat_bot.models.models import CharacterDB, PaidAlbumUnlock
from app.database.db_depends import get_db
from app.models.user import Users
from app.services.coins_service import CoinsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["paid_gallery"])

# Albums are now free for Standard and Premium subscriptions
PAID_ALBUM_LIMIT = 20


class PaidAlbumUnlockRequest(BaseModel):
    """Запрос на разблокировку платного альбома."""

    character_name: str = Field(..., min_length=1, description="Имя персонажа")


class PaidAlbumUnlockResponse(BaseModel):
    """Ответ на разблокировку платного альбома."""

    unlocked: bool
    character: str
    coins: int


class PaidAlbumUnlockedItem(BaseModel):
    """Информация о разблокированном альбоме пользователя."""

    character: str
    character_slug: str
    unlocked_at: datetime


class PaidAlbumStatusResponse(BaseModel):
    """Ответ со статусом доступа к платному альбому."""

    character: str
    character_slug: str
    unlocked: bool
    is_owner: bool
    photos_count: int = 0


class PaidAlbumPhotosRequest(BaseModel):
    """Запрос на сохранение фотографий платного альбома."""

    photos: List[dict] = Field(default_factory=list, description="Список фотографий (id/url)")


async def _get_character_by_slug(db: AsyncSession, character_name: str) -> CharacterDB | None:
    """Возвращает персонажа по имени или слагу."""
    slug = _character_slug(character_name)

    stmt = select(CharacterDB).where(CharacterDB.name.ilike(character_name))
    result = await db.execute(stmt)
    character = result.scalar_one_or_none()
    if character:
        return character

    stmt = select(CharacterDB)
    result = await db.execute(stmt)
    for candidate in result.scalars():
        if _character_slug(candidate.name) == slug:
            return candidate
    return None


async def _is_album_unlocked(db: AsyncSession, user_id: int, character_slug: str) -> bool:
    """Проверяет, разблокирован ли альбом для пользователя."""
    stmt = select(PaidAlbumUnlock).where(
        PaidAlbumUnlock.user_id == user_id,
        PaidAlbumUnlock.character_slug == character_slug,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _get_paid_album_photos_count(db: AsyncSession, character_db: CharacterDB, slug: str) -> int:
    """Возвращает количество фотографий в платном альбоме (БД + папка paid_gallery)."""
    from app.chat_bot.models.models import PaidAlbumPhoto
    from sqlalchemy import func

    count_stmt = (
        select(func.count())
        .select_from(PaidAlbumPhoto)
        .where(PaidAlbumPhoto.character_id == character_db.id)
    )
    result = await db.execute(count_stmt)
    db_count = result.scalar() or 0
    if db_count > 0:
        return db_count

    project_root = Path(__file__).resolve().parents[2]
    gallery_dir = project_root / "paid_gallery" / slug
    if not gallery_dir.exists() or not gallery_dir.is_dir():
        return 0
    exts = {".png", ".jpg", ".jpeg", ".webp"}
    return sum(1 for f in gallery_dir.iterdir() if f.is_file() and f.suffix.lower() in exts)


@router.get("/paid-gallery/unlocked/", response_model=List[PaidAlbumUnlockedItem])
async def list_unlocked_albums(
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> List[PaidAlbumUnlockedItem]:
    """Возвращает список платных альбомов, разблокированных пользователем."""
    stmt = select(PaidAlbumUnlock).where(PaidAlbumUnlock.user_id == current_user.id)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [
        PaidAlbumUnlockedItem(
            character=entry.character_name,
            character_slug=entry.character_slug,
            unlocked_at=entry.unlocked_at,
        )
        for entry in entries
    ]


@router.get("/paid-gallery/{character}/status/", response_model=PaidAlbumStatusResponse)
async def get_paid_album_status(
    character: str,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> PaidAlbumStatusResponse:
    """Возвращает статус доступа к платному альбому."""
    character_db = await _get_character_by_slug(db, character)
    if not character_db:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    slug = _character_slug(character_db.name)
    is_owner = bool(character_db.user_id) and character_db.user_id == current_user.id
    is_unlocked = await _is_album_unlocked(db, current_user.id, slug)
    is_admin = bool(current_user.is_admin) if current_user.is_admin is not None else False
    
    # Проверяем подписку STANDARD/PREMIUM - для них все альбомы доступны
    has_subscription_access = False
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    if subscription and subscription.is_active:
        subscription_type = subscription.subscription_type.value.lower()
        if subscription_type in ['standard', 'premium']:
            has_subscription_access = True
    
    unlocked = bool(is_unlocked or is_owner or is_admin or has_subscription_access)
    photos_count = await _get_paid_album_photos_count(db, character_db, slug)

    return PaidAlbumStatusResponse(
        character=character_db.name,
        character_slug=slug,
        unlocked=unlocked,
        is_owner=is_owner,
        photos_count=photos_count,
    )


@router.post("/paid-gallery/unlock/", response_model=PaidAlbumUnlockResponse)
async def unlock_paid_gallery(
    payload: PaidAlbumUnlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> PaidAlbumUnlockResponse:
    """Открывает доступ к платному альбому персонажа для пользователей с подпиской Standard/Premium."""
    character_db = await _get_character_by_slug(db, payload.character_name)
    if not character_db:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    slug = _character_slug(character_db.name)
    is_owner = bool(character_db.user_id) and character_db.user_id == current_user.id

    # Владельцу или админу альбом доступен без ограничений
    if is_owner or current_user.is_admin:
        existed = await _is_album_unlocked(db, current_user.id, slug)
        if not existed:
            db.add(
                PaidAlbumUnlock(
                    user_id=current_user.id,
                    character_name=character_db.name,
                    character_slug=slug,
                )
            )
            await db.commit()

        coins_service = CoinsService(db)
        coins_balance = await coins_service.get_user_coins(current_user.id) or 0
        return PaidAlbumUnlockResponse(
            unlocked=True,
            character=character_db.name,
            coins=coins_balance,
        )

    # Проверяем, не был ли альбом разблокирован ранее
    if await _is_album_unlocked(db, current_user.id, slug):
        coins_service = CoinsService(db)
        coins_balance = await coins_service.get_user_coins(current_user.id) or 0
        return PaidAlbumUnlockResponse(
            unlocked=True,
            character=character_db.name,
            coins=coins_balance,
        )

    # Проверяем подписку STANDARD/PREMIUM - для них альбомы бесплатны
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    has_subscription_access = False
    if subscription and subscription.is_active:
        subscription_type = subscription.subscription_type.value.lower()
        if subscription_type in ['standard', 'premium']:
            has_subscription_access = True
    
    # Для FREE пользователей альбомы недоступны
    if not has_subscription_access:
        raise HTTPException(
            status_code=403,
            detail="Для доступа к платным альбомам необходима подписка Standard или Premium"
        )
    
    # Для STANDARD/PREMIUM подписки альбомы бесплатны - просто разблокируем
    photos_count = await _get_paid_album_photos_count(db, character_db, slug)
    if photos_count == 0:
        raise HTTPException(
            status_code=400,
            detail="В альбоме пока что нет фотографий.",
        )
    
    existed = await _is_album_unlocked(db, current_user.id, slug)
    if not existed:
        db.add(
            PaidAlbumUnlock(
                user_id=current_user.id,
                character_name=character_db.name,
                character_slug=slug,
            )
        )
        await db.commit()
        
        logger.info(
            f"[PAID_ALBUM_UNLOCK] Пользователь {current_user.id} "
            f"разблокировал альбом {character_db.name} "
            f"с подпиской {subscription_type.upper()}"
        )
    
    coins_service = CoinsService(db)
    coins_balance = await coins_service.get_user_coins(current_user.id) or 0
    return PaidAlbumUnlockResponse(
        unlocked=True,
        character=character_db.name,
        coins=coins_balance,
    )


@router.post("/paid-gallery/{character}/photos", response_model=dict)
async def save_paid_gallery_photos(
    character: str,
    payload: PaidAlbumPhotosRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> dict:
    """Сохраняет список фотографий платного альбома (до 20 штук)."""
    character_db = await _get_character_by_slug(db, character)
    if not character_db:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    is_owner = bool(character_db.user_id) and character_db.user_id == current_user.id
    
    if not current_user.is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Изменять платный альбом может только создатель персонажа")
    
    # Проверяем подписку - только STANDARD и PREMIUM могут создавать платные альбомы
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    can_create_album = False
    if subscription and subscription.is_active:
        subscription_type = subscription.subscription_type.value.lower()
        if subscription_type in ['standard', 'premium']:
            can_create_album = True
    
    if not can_create_album and not current_user.is_admin:
        logger.warning(f"[PAID_ALBUM] Пользователь {current_user.id} не имеет подписки STANDARD/PREMIUM для создания альбома {character_db.name}")
        raise HTTPException(status_code=403, detail="Для создания платного альбома нужна подписка Standard или Premium")

    normalized = _normalize_main_photos(
        character_db.name,
        payload.photos,
        register=False,
        max_photos=PAID_ALBUM_LIMIT,
    )
    unique_photos = []
    seen_ids = set()
    for photo in normalized:
        photo_id = photo.get("id")
        if not photo_id or photo_id in seen_ids:
            continue
        seen_ids.add(photo_id)
        unique_photos.append(photo)

    if len(unique_photos) > PAID_ALBUM_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"В платном альбоме может быть не более {PAID_ALBUM_LIMIT} фотографий",
        )

    # Сохраняем в БД
    from app.chat_bot.models.models import PaidAlbumPhoto
    from sqlalchemy import delete
    
    # Удаляем существующие фотографии для этого персонажа
    await db.execute(
        delete(PaidAlbumPhoto).where(PaidAlbumPhoto.character_id == character_db.id)
    )
    
    # Добавляем новые фотографии
    for photo in unique_photos:
        photo_id = photo.get("id")
        photo_url = photo.get("url")
        if photo_id and photo_url:
            db.add(
                PaidAlbumPhoto(
                    character_id=character_db.id,
                    photo_id=photo_id,
                    photo_url=photo_url,
                )
            )
    
    await db.commit()
    
    return {
        "character": character_db.name,
        "character_slug": _character_slug(character_db.name),
        "count": len(unique_photos),
        "photos": unique_photos,
    }


@router.get("/paid-gallery/{character}")
async def list_paid_gallery(
    character: str,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> dict:
    """Возвращает список URL изображений платного альбома (доступен только после разблокировки)."""
    project_root = Path(__file__).resolve().parents[2]
    character_db = await _get_character_by_slug(db, character)
    if not character_db:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    slug = _character_slug(character_db.name)
    is_owner = bool(character_db.user_id) and character_db.user_id == current_user.id
    unlocked = await _is_album_unlocked(db, current_user.id, slug)

    # Проверяем подписку STANDARD/PREMIUM - для них все альбомы доступны бесплатно
    has_subscription_access = False
    if not (unlocked or is_owner or current_user.is_admin):
        from app.services.subscription_service import SubscriptionService
        subscription_service = SubscriptionService(db)
        subscription = await subscription_service.get_user_subscription(current_user.id)
        
        if subscription and subscription.is_active:
            subscription_type = subscription.subscription_type.value.lower()
            if subscription_type in ['standard', 'premium']:
                has_subscription_access = True

    if not (unlocked or is_owner or current_user.is_admin or has_subscription_access):
        logger.warning(f"[PAID_ALBUM] Пользователь {current_user.id} не имеет доступа к альбому {character_db.name}")
        raise HTTPException(status_code=403, detail="Сначала разблокируйте платный альбом персонажа")

    # Загружаем фотографии из БД
    from app.chat_bot.models.models import PaidAlbumPhoto
    
    photos_result = await db.execute(
        select(PaidAlbumPhoto)
        .where(PaidAlbumPhoto.character_id == character_db.id)
        .order_by(PaidAlbumPhoto.created_at.desc())
    )
    db_photos = photos_result.scalars().all()
    
    if db_photos:
        metadata_photos = [
            {
                "id": photo.photo_id,
                "url": photo.photo_url,
                "created_at": photo.created_at.isoformat() + "Z" if photo.created_at else None,
            }
            for photo in db_photos
        ]
        return {
            "character": character_db.name,
            "character_slug": slug,
            "count": len(metadata_photos),
            "images": metadata_photos,
        }

    gallery_dir = project_root / "paid_gallery" / slug
    if not gallery_dir.exists() or not gallery_dir.is_dir():
        return {
            "character": character_db.name,
            "character_slug": slug,
            "count": 0,
            "images": [],
        }

    exts = {".png", ".jpg", ".jpeg", ".webp"}
    files = []
    for file_path in sorted(gallery_dir.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in exts:
            files.append(
                {
                    "id": file_path.stem,
                    "url": f"/paid_gallery/{slug}/{file_path.name}",
                    "created_at": datetime.utcnow().isoformat() + "Z",
                }
            )

    return {
        "character": character_db.name,
        "character_slug": slug,
        "count": len(files),
        "images": files,
    }



