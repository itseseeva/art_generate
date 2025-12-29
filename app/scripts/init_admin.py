"""
Скрипт для автоматической инициализации администратора при запуске.
Ищет пользователя по email из переменной окружения ADMIN_EMAIL
и назначает ему роль администратора с 10 000 кредитов.
"""
import asyncio
import sys
import os
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
from sqlalchemy import select


async def init_admin(email: str) -> bool:
    """
    Инициализирует администратора для указанного email.
    Назначает роль админа и 10 000 кредитов, если пользователь существует.
    """
    async with async_session_maker() as db:
        try:
            # Находим пользователя по email
            result = await db.execute(
                select(Users).where(Users.email == email)
            )
            user = result.scalar_one_or_none()

            if not user:
                print(f"[INIT_ADMIN] User with email {email} not found. Skipping.")
                return False

            # Если уже админ, проверяем баланс
            if user.is_admin:
                # Обновляем баланс до 10 000, если меньше
                if user.coins < 10000:
                    user.coins = 10000
                    await db.commit()
                    print(
                        f"[INIT_ADMIN] Admin {email} balance updated to "
                        f"{user.coins} coins"
                    )
                else:
                    print(
                        f"[INIT_ADMIN] Admin {email} already exists "
                        f"with {user.coins} coins"
                    )
                return True

            # Устанавливаем роль администратора
            user.is_admin = True

            # Начисляем 10 000 кредитов администратору
            user.coins = 10000

            await db.commit()
            await db.refresh(user)

            print(
                f"[INIT_ADMIN] Admin role successfully granted to user "
                f"{email} (ID: {user.id})"
            )
            print(f"[INIT_ADMIN] User balance set to {user.coins} coins")
            return True

        except Exception as e:
            await db.rollback()
            print(f"[INIT_ADMIN] Error initializing admin: {e}")
            return False


async def main():
    """Главная функция для запуска из командной строки."""
    admin_email = os.getenv("ADMIN_EMAIL")
    if not admin_email:
        print("[INIT_ADMIN] ADMIN_EMAIL environment variable not set. Skipping.")
        return

    print(f"[INIT_ADMIN] Initializing admin for email: {admin_email}")
    success = await init_admin(admin_email)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())

