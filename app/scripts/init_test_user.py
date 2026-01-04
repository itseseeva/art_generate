"""
Скрипт для автоматического создания тестового пользователя без подписки при запуске.
Создает пользователя для тестирования, если его еще нет.
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
from app.auth.utils import hash_password
from sqlalchemy import select
from datetime import datetime


# Данные тестового пользователя
TEST_USERNAME = "dsujhgs"
TEST_EMAIL = "dsgjbsdigbsdi@mail.com"
TEST_PASSWORD = "Kohkau11999"
TEST_COINS = 5


async def create_test_user() -> bool:
    """
    Создает тестового пользователя без подписки в БД, если его еще нет.
    Возвращает True если пользователь создан или уже существует.
    """
    async with async_session_maker() as db:
        try:
            # Проверяем, существует ли уже пользователь
            result = await db.execute(
                select(Users).where(Users.email == TEST_EMAIL)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # Пользователь уже существует - не создаем подписку, просто выводим сообщение
                print(
                    f"[INIT_TEST_USER] Test user {TEST_EMAIL} already exists "
                    f"(ID: {existing_user.id}, subscription: {'exists' if existing_user.subscription else 'none'})"
                )
                return True

            # Создаем нового тестового пользователя БЕЗ подписки
            password_hash = hash_password(TEST_PASSWORD)
            new_user = Users(
                email=TEST_EMAIL,
                username=TEST_USERNAME,
                password_hash=password_hash,
                is_active=True,
                is_verified=True,
                coins=TEST_COINS,
                created_at=datetime.utcnow()
            )

            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            print(
                f"[INIT_TEST_USER] Test user created successfully: "
                f"ID={new_user.id}, email={TEST_EMAIL}, username={TEST_USERNAME}, "
                f"subscription=NONE (no subscription created)"
            )
            return True

        except Exception as e:
            await db.rollback()
            print(f"[INIT_TEST_USER] Error creating test user: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    try:
        result = asyncio.run(create_test_user())
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"[INIT_TEST_USER] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

