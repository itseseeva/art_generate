"""
Утилиты для аутентификации.
"""

import hashlib
import secrets
import random
import string
import asyncio
from datetime import datetime, timezone, timedelta


def hash_password(password: str) -> str:
    """Хеширует пароль используя SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Проверяет пароль против хеша."""
    return hash_password(password) == hashed


def hash_token(token: str) -> str:
    """Хеширует токен используя SHA-256."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token() -> str:
    """Создает случайный refresh токен."""
    return secrets.token_urlsafe(32)


def get_token_expiry(days: int = 7) -> datetime:
    """Возвращает время истечения токена (timezone-naive)."""
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=days)


def generate_verification_code() -> str:
    """Генерирует 6-значный код верификации."""
    return ''.join(random.choices(string.digits, k=6))


async def send_verification_email(email: str, code: str) -> None:
    """
    Отправляет код верификации на email.
    Обёртка вокруг синхронного EmailSender, чтобы не блокировать event loop.
    """
    try:
        from app.mail_service.sender import EmailSender
        
        def _send_email_sync():
            """Синхронная функция для отправки email в отдельном потоке"""
            try:
                email_sender = EmailSender()
                return email_sender.send_verification_email(email, code)
            except ValueError as init_error:
                # Если EmailSender не может быть создан (нет конфигурации), просто возвращаем False
                print(f"EmailSender initialization failed: {init_error}")
                print(f"Verification code {code} for {email} (email sending disabled - no config)")
                return False
        
        # Выполняем отправку email в отдельном потоке, чтобы не блокировать event loop
        # SMTP операции могут занимать время и блокировать поток
        success = await asyncio.to_thread(_send_email_sync)
        
        if not success:
            print(f"Verification code {code} for {email} (real sending disabled)")
            
    except Exception as e:
        print(f"Error sending email: {type(e).__name__}: {e}")
        print(f"Verification code {code} for {email} (email sending disabled)")


async def send_password_reset_email(email: str, code: str) -> None:
    """
    Отправляет код восстановления пароля на email.
    Обёртка вокруг синхронного EmailSender, чтобы не блокировать event loop.
    """
    try:
        from app.mail_service.sender import EmailSender
        
        def _send_email_sync():
            """Синхронная функция для отправки email в отдельном потоке"""
            try:
                email_sender = EmailSender()
                return email_sender.send_password_reset_email(email, code)
            except ValueError as init_error:
                # Если EmailSender не может быть создан (нет конфигурации), просто возвращаем False
                print(f"EmailSender initialization failed: {init_error}")
                print(f"Password reset code {code} for {email} (email sending disabled - no config)")
                return False
        
        # Выполняем отправку email в отдельном потоке, чтобы не блокировать event loop
        success = await asyncio.to_thread(_send_email_sync)
        
        if not success:
            print(f"Password reset code {code} for {email} (real sending disabled)")
            
    except Exception as e:
        print(f"Error sending password reset email: {type(e).__name__}: {e}")
        print(f"Password reset code {code} for {email} (email sending disabled)")