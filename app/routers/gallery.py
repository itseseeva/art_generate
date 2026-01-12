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
    _load_photo_metadata,
    _normalize_main_photos,
    _save_photo_metadata,
)
from app.chat_bot.models.models import CharacterDB, PaidAlbumUnlock
from app.database.db_depends import get_db
from app.models.user import Users
from app.services.coins_service import CoinsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["paid_gallery"])

PAID_ALBUM_COST = 200
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
    
    # Проверяем подписку PREMIUM - для них все альбомы доступны
    is_premium = False
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    if subscription and subscription.is_active:
        subscription_type = subscription.subscription_type.value.lower()
        if subscription_type == 'premium':
            is_premium = True
    
    unlocked = bool(is_unlocked or is_owner or is_admin or is_premium)

    return PaidAlbumStatusResponse(
        character=character_db.name,
        character_slug=slug,
        unlocked=unlocked,
        is_owner=is_owner,
    )


@router.post("/paid-gallery/unlock/", response_model=PaidAlbumUnlockResponse)
async def unlock_paid_gallery(
    payload: PaidAlbumUnlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Users = Depends(get_current_user),
) -> PaidAlbumUnlockResponse:
    """Списывает монеты и открывает доступ к платному альбому персонажа."""
    character_db = await _get_character_by_slug(db, payload.character_name)
    if not character_db:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    slug = _character_slug(character_db.name)
    is_owner = bool(character_db.user_id) and character_db.user_id == current_user.id

    # Владельцу или админу альбом доступен без оплаты
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

    # Проверяем подписку PREMIUM - для них альбомы бесплатны
    from app.services.subscription_service import SubscriptionService
    subscription_service = SubscriptionService(db)
    subscription = await subscription_service.get_user_subscription(current_user.id)
    
    is_premium = False
    if subscription and subscription.is_active:
        subscription_type = subscription.subscription_type.value.lower()
        if subscription_type == 'premium':
            is_premium = True
    
    # Для PREMIUM подписки альбомы бесплатны
    if is_premium:
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

    coins_service = CoinsService(db)
    
    # Получаем актуальный баланс напрямую из БД
    from sqlalchemy import select
    initial_result = await db.execute(
        select(Users.coins).where(Users.id == current_user.id)
    )
    initial_balance = initial_result.scalar_one_or_none() or 0
    
    logger = logging.getLogger(__name__)
    logger.info(
        f"[PAID_ALBUM_UNLOCK] Пользователь {current_user.id} "
        f"пытается разблокировать альбом {character_db.name}. "
        f"Баланс до списания: {initial_balance}, стоимость: {PAID_ALBUM_COST}"
    )
    
    if initial_balance < PAID_ALBUM_COST:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно кредитов для разблокировки альбома"
        )

    # Списываем монеты напрямую через SQL UPDATE
    from sqlalchemy import update
    update_result = await db.execute(
        update(Users)
        .where(Users.id == current_user.id)
        .values(coins=Users.coins - PAID_ALBUM_COST)
    )
    
    if update_result.rowcount == 0:
        raise HTTPException(
            status_code=500,
            detail="Не удалось списать кредиты, пользователь не найден"
        )
    
    # Применяем изменения в транзакции
    await db.flush()
    
    # Получаем баланс напрямую из БД после flush
    after_result = await db.execute(
        select(Users.coins).where(Users.id == current_user.id)
    )
    balance_after_spend = after_result.scalar_one_or_none() or 0
    expected_balance = initial_balance - PAID_ALBUM_COST
    
    logger.info(
        f"[PAID_ALBUM_UNLOCK] После списания. "
        f"Ожидаемый баланс: {expected_balance}, "
        f"фактический: {balance_after_spend}"
    )
    
    if balance_after_spend != expected_balance:
        await db.rollback()
        logger.error(
            f"[PAID_ALBUM_UNLOCK] ОШИБКА: Баланс не совпадает! "
            f"Ожидалось: {expected_balance}, получено: {balance_after_spend}"
        )
        raise HTTPException(
            status_code=500,
            detail="Ошибка при списании кредитов. Транзакция отменена."
        )
    
    if balance_after_spend < 0:
        await db.rollback()
        logger.error(
            f"[PAID_ALBUM_UNLOCK] ОШИБКА: Отрицательный баланс! "
            f"Баланс: {balance_after_spend}"
        )
        raise HTTPException(
            status_code=500,
            detail="Ошибка: отрицательный баланс после списания"
        )

    # Начисляем 15% создателю персонажа (если персонаж имеет создателя)
    CREATOR_PROFIT_PERCENT = 0.15
    creator_profit = int(
        PAID_ALBUM_COST * CREATOR_PROFIT_PERCENT
    )  # 15% от 200 = 30 кредитов

    if character_db.user_id:
        # Получаем создателя персонажа
        creator_result = await db.execute(
            select(Users).where(Users.id == character_db.user_id)
        )
        creator = creator_result.scalar_one_or_none()

        if creator:
            # Получаем баланс создателя до начисления напрямую из БД
            creator_initial_result = await db.execute(
                select(Users.coins).where(Users.id == creator.id)
            )
            creator_initial_balance = creator_initial_result.scalar_one_or_none() or 0
            
            # Начисляем 15% создателю напрямую через SQL UPDATE
            from sqlalchemy import update
            await db.execute(
                update(Users)
                .where(Users.id == creator.id)
                .values(coins=Users.coins + creator_profit)
            )
            
            # Применяем изменения
            await db.flush()
            
            # Проверяем баланс создателя после начисления
            creator_result_after = await db.execute(
                select(Users.coins).where(Users.id == creator.id)
            )
            creator_balance_after = creator_result_after.scalar_one_or_none() or 0
            creator_expected_balance = creator_initial_balance + creator_profit
            
            logger.info(
                f"[PAID_ALBUM_PROFIT] Пользователь {current_user.id} "
                f"купил альбом персонажа {character_db.name}. "
                f"Создателю {creator.id} начислено {creator_profit} "
                f"кредитов (15% от {PAID_ALBUM_COST}). "
                f"Баланс создателя: {creator_initial_balance} -> {creator_balance_after} "
                f"(ожидалось: {creator_expected_balance})"
            )
            
            if creator_balance_after != creator_expected_balance:
                logger.error(
                    f"[PAID_ALBUM_PROFIT] ОШИБКА: Баланс создателя не совпадает! "
                    f"Ожидалось: {creator_expected_balance}, получено: {creator_balance_after}"
                )

    db.add(
        PaidAlbumUnlock(
            user_id=current_user.id,
            character_name=character_db.name,
            character_slug=slug,
        )
    )
    
    # Записываем историю баланса для покупателя
    try:
        from app.utils.balance_history import record_balance_change
        await record_balance_change(
            db=db,
            user_id=current_user.id,
            amount=-PAID_ALBUM_COST,
            reason=f"Разблокировка платного альбома персонажа '{character_db.name}'"
        )
    except Exception as e:
        logger.warning(f"Не удалось записать историю баланса для покупателя: {e}")
    
    # Записываем историю баланса для создателя (если есть)
    if character_db.user_id and creator:
        try:
            from app.utils.balance_history import record_balance_change
            await record_balance_change(
                db=db,
                user_id=creator.id,
                amount=creator_profit,
                reason=f"Доход от продажи альбома персонажа '{character_db.name}' (15%)"
            )
        except Exception as e:
            logger.warning(f"Не удалось записать историю баланса для создателя: {e}")
    
    # Коммитим все изменения (списание у покупателя, начисление создателю, запись о разблокировке)
    await db.commit()
    
    # Инвалидируем кэш пользователя
    from app.utils.redis_cache import cache_delete, key_user_coins
    await cache_delete(key_user_coins(current_user.id))
    
    # Отправляем событие обновления профиля
    from app.services.profit_activate import emit_profile_update
    await emit_profile_update(current_user.id, db)
    
    # Получаем финальный баланс после коммита
    final_balance = await coins_service.get_user_coins(current_user.id) or 0
    
    logger.info(
        f"[PAID_ALBUM_UNLOCK] Успешно разблокирован альбом {character_db.name} "
        f"пользователем {current_user.id}. "
        f"Финальный баланс: {final_balance} "
        f"(было: {initial_balance}, списано: {PAID_ALBUM_COST})"
    )
    
    return PaidAlbumUnlockResponse(
        unlocked=True,
        character=character_db.name,
        coins=final_balance,
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

    _save_photo_metadata(character_db.name, unique_photos)
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

    # Проверяем подписку PREMIUM - для них все альбомы доступны бесплатно
    is_premium = False
    if not (unlocked or is_owner or current_user.is_admin):
        from app.services.subscription_service import SubscriptionService
        subscription_service = SubscriptionService(db)
        subscription = await subscription_service.get_user_subscription(current_user.id)
        
        if subscription and subscription.is_active:
            subscription_type = subscription.subscription_type.value.lower()
            if subscription_type == 'premium':
                is_premium = True

    if not (unlocked or is_owner or current_user.is_admin or is_premium):
        logger.warning(f"[PAID_ALBUM] Пользователь {current_user.id} не имеет доступа к альбому {character_db.name}")
        raise HTTPException(status_code=403, detail="Сначала разблокируйте платный альбом персонажа")

    metadata_photos = _load_photo_metadata(character_db.name)
    if metadata_photos:
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



