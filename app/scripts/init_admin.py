"""
Скрипт для автоматического создания администратора при запуске.
Создает пользователя с админскими правами, если его еще нет.
"""
import asyncio
import sys
from pathlib import Path

# Устанавливаем UTF-8 кодировку для вывода
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Добавляем корневую директорию проекта в путь
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from app.database.db import async_session_maker
from app.models.user import Users
from app.models.subscription import (
    UserSubscription, SubscriptionType, SubscriptionStatus
)
from app.auth.utils import hash_password
from sqlalchemy import select
from datetime import datetime, timedelta


# Данные администратора
ADMIN_USERNAME = "ihnupfidi"
ADMIN_EMAIL = "eseeva228@gmail.com"
ADMIN_PASSWORD = "Kohkau11999"
ADMIN_COINS = 10000


async def create_admin_user() -> bool:
    """
    Создает администратора в БД, если его еще нет.
    Возвращает True если пользователь создан или уже существует.
    """
    async with async_session_maker() as db:
        try:
            # Проверяем, существует ли уже пользователь
            result = await db.execute(
                select(Users).where(Users.email == ADMIN_EMAIL)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # Пользователь уже существует - обновляем его данные
                if not existing_user.is_admin:
                    existing_user.is_admin = True
                if existing_user.coins < ADMIN_COINS:
                    existing_user.coins = ADMIN_COINS
                await db.commit()
                await db.refresh(existing_user)
                print(
                    f"[INIT_ADMIN] Admin user {ADMIN_EMAIL} already exists, "
                    f"updated (coins: {existing_user.coins})"
                )
                admin_user = existing_user
            else:
                # Создаем нового пользователя-администратора
                password_hash = hash_password(ADMIN_PASSWORD)
                admin_user = Users(
                    email=ADMIN_EMAIL,
                    username=ADMIN_USERNAME,
                    password_hash=password_hash,
                    is_active=True,
                    is_verified=True,
                    is_admin=True,
                    coins=ADMIN_COINS
                )
                db.add(admin_user)
                await db.commit()
                await db.refresh(admin_user)
                print(
                    f"[INIT_ADMIN] Admin user created: {ADMIN_EMAIL} "
                    f"(ID: {admin_user.id})"
                )

            # Проверяем и создаем/обновляем PREMIUM подписку
            subscription_result = await db.execute(
                select(UserSubscription).where(
                    UserSubscription.user_id == admin_user.id
                ).order_by(UserSubscription.activated_at.desc())
            )
            subscription = subscription_result.scalar_one_or_none()
            user_id = admin_user.id

            if subscription:
                # Обновляем существующую подписку на PREMIUM
                subscription.subscription_type = SubscriptionType.PREMIUM
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.monthly_credits = 5000
                subscription.monthly_photos = 0
                subscription.max_message_length = 300
                subscription.used_credits = 0
                subscription.used_photos = 0
                subscription.activated_at = datetime.utcnow()
                subscription.expires_at = (
                    datetime.utcnow() + timedelta(days=365)
                )
                subscription.last_reset_at = datetime.utcnow()
                print("[INIT_ADMIN] Subscription updated to PREMIUM")
            else:
                # Создаем новую подписку PREMIUM
                subscription = UserSubscription(
                    user_id=user_id,
                    subscription_type=SubscriptionType.PREMIUM,
                    status=SubscriptionStatus.ACTIVE,
                    monthly_credits=5000,
                    monthly_photos=0,
                    max_message_length=300,
                    used_credits=0,
                    used_photos=0,
                    activated_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=365),
                    last_reset_at=datetime.utcnow()
                )
                db.add(subscription)
                print("[INIT_ADMIN] PREMIUM subscription created")

            await db.commit()
            print(
                f"[INIT_ADMIN] Admin initialization complete for "
                f"{ADMIN_EMAIL}"
            )
            return True

        except Exception as e:
            await db.rollback()
            print(f"[INIT_ADMIN] Error creating admin user: {e}")
            return False


async def main():
    """Главная функция для запуска из командной строки."""
    print(f"[INIT_ADMIN] Creating admin user: {ADMIN_EMAIL}")
    success = await create_admin_user()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
