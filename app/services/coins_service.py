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
    
    async def can_user_afford(self, user_id: int, amount: int) -> bool:
        """Проверяет, достаточно ли монет у пользователя."""
        coins = await self.get_user_coins(user_id)
        return coins is not None and coins >= amount
    
    async def get_user_coins(self, user_id: int) -> Optional[int]:
        """Получает количество монет пользователя с кэшированием."""
        cache_key = key_user_coins(user_id)
        use_cache = self._should_use_cache()
        if use_cache:
            cached_coins = await cache_get(cache_key)
            if cached_coins is not None:
                return cached_coins
        
        result = await self.db.execute(
            select(Users.coins).where(Users.id == user_id)
        )
        coins = result.scalars().first()
        
        if coins is not None and use_cache:
            await cache_set(cache_key, coins, ttl_seconds=TTL_USER_COINS)
        
        return coins
    
    async def can_user_send_message(self, user_id: int) -> bool:
        """Проверяет, может ли пользователь отправить сообщение (стоимость: 5 монет)."""
        return await self.can_user_afford(user_id, 5)
    
    async def can_user_generate_photo(self, user_id: int) -> bool:
        """Проверяет, может ли пользователь сгенерировать фото (стоимость: 10 монет)."""
        return await self.can_user_afford(user_id, 10)
    
    @staticmethod
    def calculate_tts_cost(text: str) -> int:
        """
        Рассчитывает стоимость TTS на основе длины текста.
        1 кредит за 30 символов, минимум 1 кредит.
        """
        if not text:
            return 1
        return max(1, (len(text) + 29) // 30)

    async def can_user_afford_tts(self, user_id: int, text: str) -> bool:
        """Проверяет, может ли пользователь позволить себе TTS для данного текста."""
        cost = self.calculate_tts_cost(text)
        return await self.can_user_afford(user_id, cost)
    
    async def spend_coins(self, user_id: int, amount: int, commit: bool = True) -> bool:
        """Списывает указанное количество монет."""
        try:
            await self.db.execute(
                update(Users)
                .where(Users.id == user_id)
                .values(coins=Users.coins - amount)
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
            print(f"[ERROR] Ошибка траты монет: {e}")
            if commit:
                await self.db.rollback()
                return False
            raise
    
    async def spend_coins_for_message(self, user_id: int, commit: bool = True) -> bool:
        """Тратит 5 монет за отправку сообщения."""
        return await self.spend_coins(user_id, 5, commit=commit)
    
    async def spend_coins_for_photo(self, user_id: int) -> bool:
        """Тратит 10 монет за генерацию фото."""
        return await self.spend_coins(user_id, 10)
    
    async def spend_coins_for_tts(self, user_id: int, text: str, commit: bool = True) -> bool:
        """Тратит монеты за генерацию TTS (1 кредит за 30 символов, минимум 1)."""
        cost = self.calculate_tts_cost(text)
        return await self.spend_coins(user_id, cost, commit=commit)
    
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
