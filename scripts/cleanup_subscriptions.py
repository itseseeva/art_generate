import asyncio
import logging
import os
import sys

# Добавляем корневой директорию проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.db import async_session_maker
from app.models.subscription import UserSubscription, SubscriptionStatus
from sqlalchemy import select, delete, func

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def cleanup_duplicate_subscriptions():
    async with async_session_maker() as db:
        # Находим user_id, у которых более одной подписки
        query = select(UserSubscription.user_id).group_by(UserSubscription.user_id).having(func.count(UserSubscription.id) > 1)
        result = await db.execute(query)
        duplicate_user_ids = [row[0] for row in result.all()]
        
        if not duplicate_user_ids:
            logger.info("Дубликаты подписок не найдены.")
            return

        logger.info(f"Найдено {len(duplicate_user_ids)} пользователей с дубликатами подписок.")
        
        for user_id in duplicate_user_ids:
            # Получаем все подписки этого пользователя, отсортированные по новизне
            sub_query = select(UserSubscription).where(UserSubscription.user_id == user_id).order_by(UserSubscription.activated_at.desc(), UserSubscription.id.desc())
            sub_result = await db.execute(sub_query)
            subs = sub_result.scalars().all()
            
            # Оставляем первую (самую новую), остальные удаляем
            keep_id = subs[0].id
            delete_ids = [s.id for s in subs[1:]]
            
            logger.info(f"Пользователь {user_id}: оставляем подписку {keep_id}, удаляем {delete_ids}")
            
            if delete_ids:
                await db.execute(delete(UserSubscription).where(UserSubscription.id.in_(delete_ids)))
        
        await db.commit()
        logger.info("Очистка дубликатов завершена.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicate_subscriptions())
