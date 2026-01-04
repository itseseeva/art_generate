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


# Данные тестовых пользователей
TEST_USERS = [
    {
        "username": "dsujhgs",
        "email": "dsgjbsdigbsdi@mail.com",
        "password": "Kohkau11999",
        "coins": 5
    },
    {
        "username": "safdasfa",
        "email": "sgsbgniks@mail.com",
        "password": "Kohkau11999",
        "coins": 5
    }
]


async def create_test_user(user_data: dict) -> bool:
    """
    Создает тестового пользователя без подписки в БД, если его еще нет.
    
    Args:
        user_data: Словарь с данными пользователя (username, email, password, coins)
    
    Returns:
        bool: True если пользователь создан или уже существует, False при ошибке
    """
    async with async_session_maker() as db:
        try:
            email = user_data["email"]
            username = user_data["username"]
            password = user_data["password"]
            coins = user_data.get("coins", 5)
            
            # Проверяем, существует ли уже пользователь
            result = await db.execute(
                select(Users).where(Users.email == email)
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                # Пользователь уже существует - проверяем, что is_admin = False
                if existing_user.is_admin:
                    existing_user.is_admin = False
                    await db.commit()
                    await db.refresh(existing_user)
                    print(
                        f"[INIT_TEST_USER] Test user {email} already exists, "
                        f"is_admin reset to False (ID: {existing_user.id})"
                    )
                else:
                    print(
                        f"[INIT_TEST_USER] Test user {email} already exists "
                        f"(ID: {existing_user.id}, is_admin: {existing_user.is_admin}, "
                        f"subscription: {'exists' if existing_user.subscription else 'none'})"
                    )
                return True

            # Создаем нового тестового пользователя БЕЗ подписки и БЕЗ прав админа
            password_hash = hash_password(password)
            new_user = Users(
                email=email,
                username=username,
                password_hash=password_hash,
                is_active=True,
                is_verified=True,
                is_admin=False,  # КРИТИЧНО: Явно устанавливаем is_admin = False
                coins=coins,
                created_at=datetime.utcnow()
            )

            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)

            print(
                f"[INIT_TEST_USER] Test user created successfully: "
                f"ID={new_user.id}, email={email}, username={username}, "
                f"is_admin={new_user.is_admin}, subscription=NONE (no subscription created)"
            )
            return True

        except Exception as e:
            await db.rollback()
            print(f"[INIT_TEST_USER] Error creating test user {user_data.get('email', 'unknown')}: {e}")
            import traceback
            traceback.print_exc()
            return False


async def create_all_test_users() -> bool:
    """
    Создает всех тестовых пользователей без подписок.
    
    Returns:
        bool: True если все пользователи созданы или уже существуют, False при ошибке
    """
    all_success = True
    for user_data in TEST_USERS:
        success = await create_test_user(user_data)
        if not success:
            all_success = False
    
    return all_success


if __name__ == "__main__":
    try:
        result = asyncio.run(create_all_test_users())
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"[INIT_TEST_USER] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

