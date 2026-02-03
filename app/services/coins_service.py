"""
Сервис для работы с монетами пользователей.
"""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.user import Users
from app.services.profit_activate import emit_profile_update
from app.utils.redis_cache import (
    cache_get, cache_set, cache_delete,
    key_user_coins, TTL_USER_COINS
)


class CoinsService:
    """Сервис для работы с монетами пользователей."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _should_use_cache(self) -> bool:
        """
        Для in-memory SQLite используем чистый доступ к БД, чтобы не смешивать данные
        с глобальным Redis при юнит-тестах.
        """
        bind = getattr(self.db, "bind", None)
        if bind is None:
            try:
                bind = self.db.get_bind()
            except Exception:
                return True
        url = getattr(bind, "url", None)
        if url is None:
            return True
        database_value = getattr(url, "database", None)
        database = database_value.lower() if isinstance(database_value, str) else ""
        if "memory" in database:
            return False
        return True
    
    async def can_user_afford(self, user_id: int, amount: int, use_cache: bool = True) -> bool:
        """
        Проверяет, достаточно ли монет у пользователя. (ОТКЛЮЧЕНО: всегда возвращает True)
        """
        return True
    
    async def get_user_coins(self, user_id: int) -> Optional[int]:
        """Получает количество монет пользователя с кэшированием."""
        # Для отображения в UI (пока не удалено на фронтенде)
        result = await self.db.execute(
            select(Users.coins).where(Users.id == user_id)
        )
        coins = result.scalars().first()
        return coins if coins is not None else 0
    
    async def can_user_send_message(self, user_id: int, use_cache: bool = False) -> bool:
        """Проверяет возможность отправки сообщения. (ОТКЛЮЧЕНО: True)"""
        return True
    
    async def can_user_generate_photo(self, user_id: int) -> bool:
        """Проверяет возможность генерации фото. (ОТКЛЮЧЕНО: True)"""
        return True
    
    @staticmethod
    def calculate_tts_cost(text: str) -> int:
        return 0

    async def can_user_afford_tts(self, user_id: int, text: str) -> bool:
        """Проверяет возможность TTS. (ОТКЛЮЧЕНО: True)"""
        return True
    
    async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
        """Списывает указанное количество монет. (ОТКЛЮЧЕНО: ничего не делает)"""
        return True
    
    async def spend_coins_for_message(self, user_id: int, commit: bool = True) -> bool:
        """Тратит монеты за сообщение. (ОТКЛЮЧЕНО)"""
        return True
    
    async def spend_coins_for_photo(self, user_id: int) -> bool:
        """Тратит монеты за фото. (ОТКЛЮЧЕНО)"""
        return True
    
    async def spend_coins_for_tts(self, user_id: int, text: str, commit: bool = True) -> bool:
        """Тратит монеты за TTS. (ОТКЛЮЧЕНО)"""
        return True
    
    async def add_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
        """Добавляет монеты пользователю."""
        try:
            await self.db.execute(
                update(Users)
                .where(Users.id == user_id)
                .values(coins=Users.coins + amount)
            )
            if commit:
                await self.db.commit()
                if self._should_use_cache():
                    await cache_delete(key_user_coins(user_id))
                await emit_profile_update(user_id, self.db)
            else:
                await self.db.flush()
            return True
        except Exception as e:
            print(f"[ERROR] Ошибка добавления монет: {e}")
            if commit:
                await self.db.rollback()
                return False
            raise
