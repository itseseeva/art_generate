"""
Скрипт для проверки и обновления лимитов подписок Standard
"""
import asyncio
from app.database.db import async_session_maker
from app.models.subscription import UserSubscription
from app.models.user import Users
from sqlalchemy import select

async def fix_subscription_limits():
    async with async_session_maker() as db:
        # Получаем все подписки Standard с нулевыми лимитами
        result = await db.execute(
            select(UserSubscription, Users)
            .join(Users, UserSubscription.user_id == Users.id)
            .where(UserSubscription.subscription_type == 'standard')
        )
        
        for sub, user in result:
            print(f"\n{'='*60}")
            print(f"Пользователь: {user.email} (ID: {user.id})")
            print(f"Тип подписки: {sub.subscription_type.value}")
            print(f"Статус: {sub.status}")
            print(f"Активна: {sub.is_active}")
            print(f"Фото: {sub.images_used}/{sub.images_limit}")
            print(f"Голос: {sub.voice_used}/{sub.voice_limit}")
            print(f"Сообщения: {sub.monthly_messages}")
            
            # Если лимиты нулевые - обновляем
            if sub.images_limit == 0 or sub.voice_limit == 0:
                print(f"\n⚠️ Обнаружены нулевые лимиты! Обновляем...")
                
                # Стандартные лимиты для Standard подписки (месячные)
                sub.images_limit = 100
                sub.voice_limit = 100
                sub.monthly_messages = 5
                
                await db.commit()
                await db.refresh(sub)
                
                print(f"✅ Обновлено!")
                print(f"Новые лимиты - Фото: {sub.images_used}/{sub.images_limit}, Голос: {sub.voice_used}/{sub.voice_limit}")
            else:
                print(f"✅ Лимиты в порядке")

if __name__ == "__main__":
    asyncio.run(fix_subscription_limits())
