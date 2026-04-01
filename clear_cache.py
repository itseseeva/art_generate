import asyncio
from datetime import datetime, timedelta
from app.utils.redis_cache import cache_delete, cache_delete_pattern, key_user, get_redis
from sqlalchemy import select
from app.database.db import async_session_maker
from app.models.user import Users
from app.models.subscription import UserSubscription, SubscriptionStatus

async def main():
    email = "eseeva228@gmail.com"
    async with async_session_maker() as session:
        result = await session.execute(select(Users).where(Users.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"User {user.id} found. Fixing subscription expiry and clearing cache...")
            
            # Make sure subscription is active and has future expiration
            result = await session.execute(select(UserSubscription).where(UserSubscription.user_id == user.id))
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = SubscriptionStatus.ACTIVE
                # Продлеваем подписку на 10 лет
                sub.expires_at = datetime.utcnow() + timedelta(days=3650)
                await session.commit()
                print("Subscription expiry extended to 10 years!")
            
            # Clear redis cache
            try:
                await cache_delete(key_user(email))
                redis = await get_redis()
                if redis:
                    keys = await redis.keys(f"*")
                    deleted = 0
                    for key in keys:
                        try:
                            key_str = key.decode('utf-8')
                        except:
                            continue
                        # удаляем все ключи профиля для этого пользователя или почты
                        if str(user.id) in key_str or email in key_str:
                            await redis.delete(key)
                            deleted += 1
                            print(f"Deleted cache key: {key_str}")
                        
                        # Также удаляем кэш подписок профиля
                        if "profile" in key_str or "subscription" in key_str:
                            await redis.delete(key)
                            deleted += 1
                            
                    print(f"Total keys deleted: {deleted}")
                
            except Exception as e:
                print(f"Error clearing redis: {e}")
                
            print("Cache cleared successfully!")
        else:
            print("User not found.")

if __name__ == "__main__":
    asyncio.run(main())
