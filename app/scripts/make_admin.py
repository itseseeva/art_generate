"""
Скрипт для выдачи роли администратора пользователю.
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


async def make_admin(email: str):
    """Выдает роль администратора пользователю с указанным email."""
    async with async_session_maker() as db:
        try:
            # Находим пользователя по email
            result = await db.execute(
                select(Users).where(Users.email == email)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"User with email {email} not found.")
                return False
            
            # Устанавливаем роль администратора
            user.is_admin = True
            await db.commit()
            await db.refresh(user)
            
            print(f"Admin role successfully granted to user {email} (ID: {user.id})")
            return True
            
        except Exception as e:
            await db.rollback()
            print(f"Error granting admin role: {e}")
            return False


if __name__ == "__main__":
    email = "yitifupi@mailfrs.com"
    print(f"Granting admin role to user {email}...")
    success = asyncio.run(make_admin(email))
    sys.exit(0 if success else 1)
