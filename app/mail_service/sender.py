"""
Email sender для отправки уведомлений.
"""

import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import (
    EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS,
    EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL
)


def generate_verification_email_html(verification_code: str) -> str:
    """
    Генерирует HTML-шаблон письма для подтверждения email.
    
    Args:
        verification_code: Код подтверждения
        
    Returns:
        str: HTML-код письма с инлайновыми стилями
    """
    html_template = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Подтверждение email - Cherry Lust</title>
</head>
<body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #121212; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
                    <!-- Логотип -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <div style="width: 120px; height: 40px; background: linear-gradient(135deg, rgba(232, 121, 249, 0.8), rgba(139, 92, 246, 0.8)); border-radius: 8px; display: inline-block; line-height: 40px; color: #ffffff; font-size: 20px; font-weight: 700; text-align: center;">
                                Cherry Lust
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Заголовок -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <h1 style="margin: 0; color: #e879f9; font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">
                                Подтверждение почты
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Текст -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <p style="margin: 0; color: #e4e4e7; font-size: 16px; line-height: 1.6; text-align: center;">
                                Ваш код подтверждения:
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Код -->
                    <tr>
                        <td align="center" style="padding: 0 20px 40px 20px;">
                            <div style="display: inline-block; padding: 24px 40px; background-color: rgba(232, 121, 249, 0.1); border: 2px solid #e879f9; border-radius: 12px; box-shadow: 0 0 20px rgba(232, 121, 249, 0.3);">
                                <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #e879f9; letter-spacing: 8px; text-align: center;">
                                    {verification_code}
                                </div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Пометка о сроке действия -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <p style="margin: 0; color: #a0a0b0; font-size: 14px; text-align: center;">
                                Код действителен 24 часа
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Футер -->
                    <tr>
                        <td style="padding: 30px 20px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(232, 121, 249, 0.1);">
                            <p style="margin: 0 0 10px 0; color: #e4e4e7; font-size: 14px; text-align: center; line-height: 1.6;">
                                С уважением,<br>
                                команда Cherry Lust
                            </p>
                            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                                Это автоматическое письмо, пожалуйста, не отвечайте на него
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html_template


def generate_password_reset_email_html(verification_code: str) -> str:
    """
    Генерирует HTML-шаблон письма для восстановления пароля.
    
    Args:
        verification_code: Код восстановления пароля
        
    Returns:
        str: HTML-код письма с инлайновыми стилями
    """
    html_template = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Восстановление пароля - Cherry Lust</title>
</head>
<body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #121212; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
                    <!-- Логотип -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <div style="width: 120px; height: 40px; background: linear-gradient(135deg, rgba(232, 121, 249, 0.8), rgba(139, 92, 246, 0.8)); border-radius: 8px; display: inline-block; line-height: 40px; color: #ffffff; font-size: 20px; font-weight: 700; text-align: center;">
                                Cherry Lust
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Заголовок -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <h1 style="margin: 0; color: #e879f9; font-size: 28px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">
                                Восстановление пароля
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Текст -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <p style="margin: 0; color: #e4e4e7; font-size: 16px; line-height: 1.6; text-align: center;">
                                Для восстановления пароля используйте следующий код:
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Код -->
                    <tr>
                        <td align="center" style="padding: 0 20px 40px 20px;">
                            <div style="display: inline-block; padding: 24px 40px; background-color: rgba(232, 121, 249, 0.1); border: 2px solid #e879f9; border-radius: 12px; box-shadow: 0 0 20px rgba(232, 121, 249, 0.3);">
                                <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #e879f9; letter-spacing: 8px; text-align: center;">
                                    {verification_code}
                                </div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Пометка о сроке действия -->
                    <tr>
                        <td align="center" style="padding: 0 20px 30px 20px;">
                            <p style="margin: 0; color: #a0a0b0; font-size: 14px; text-align: center;">
                                Код действителен 24 часа
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Футер -->
                    <tr>
                        <td style="padding: 30px 20px; background-color: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(232, 121, 249, 0.1);">
                            <p style="margin: 0 0 10px 0; color: #e4e4e7; font-size: 14px; text-align: center; line-height: 1.6;">
                                С уважением,<br>
                                команда Cherry Lust
                            </p>
                            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                                Это автоматическое письмо, пожалуйста, не отвечайте на него
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html_template


class EmailSender:
    """Class for sending email via SMTP"""
    
    def __init__(self):
        # Проверяем переменные только при создании экземпляра, а не при импорте
        if not EMAIL_HOST_USER:
            raise ValueError("EMAIL_HOST_USER not set in environment variables")
        if not EMAIL_HOST_PASSWORD:
            raise ValueError("EMAIL_HOST_PASSWORD not set in environment variables")
        
        self.host = EMAIL_HOST
        self.port = EMAIL_PORT
        self.username = EMAIL_HOST_USER
        self.password = EMAIL_HOST_PASSWORD
        self.use_tls = EMAIL_USE_TLS
    
    def send_verification_email(self, to_email: str, verification_code: str) -> bool:
        """
        Sends verification code to email
        
        Args:
            to_email: Recipient email
            verification_code: Verification code
            
        Returns:
            bool: True if sending successful, False if error
        """
        # Check if password contains non-ASCII characters
        try:
            self.password.encode('ascii')
        except UnicodeEncodeError:
            print(f"Password contains non-ASCII characters. Cannot send email.")
            print(f"Verification code {verification_code} for {to_email} (sending disabled due to non-ASCII password)")
            return False
            
        # If password is not set, don't try to send
        if not self.password:
            print(f"Verification code {verification_code} for {to_email} (real sending disabled)")
            return False
            
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = "Подтверждение email - Cherry Lust"
            
            # Создаем HTML-тело письма
            html_body = generate_verification_email_html(verification_code)
            
            # Создаем текстовую версию для клиентов без поддержки HTML
            text_body = f"""Подтверждение email - Cherry Lust

Здравствуйте!

Для подтверждения вашего email адреса используйте следующий код:

{verification_code}

Важно:
- Код действителен в течение 24 часов
- Не передавайте код третьим лицам
- Если вы не регистрировались в Cherry Lust, проигнорируйте это письмо

С уважением,
Команда Cherry Lust

Это автоматическое письмо, пожалуйста, не отвечайте на него"""
            
            # Добавляем HTML и текстовую версию
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Устанавливаем timeout для socket операций (10 секунд)
            # Это предотвращает зависание, если SMTP сервер недоступен
            old_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)
            try:
                # Connect to SMTP server with timeout
                with smtplib.SMTP(self.host, self.port) as server:
                    if self.use_tls:
                        server.starttls()
                    
                    # Authenticate
                    server.login(self.username, self.password)
                    
                    # Send message
                    server.send_message(msg)
                
                print(f"Verification code successfully sent to {to_email}")
                return True
            finally:
                # Восстанавливаем предыдущий timeout
                socket.setdefaulttimeout(old_timeout)
            
        except (smtplib.SMTPConnectError, smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as e:
            print(f"SMTP error sending email to {to_email}: {type(e).__name__}: {e}")
            return False
        except Exception as e:
            print(f"Error sending email to {to_email}: {type(e).__name__}: {e}")
            return False
    
    def send_password_reset_email(self, to_email: str, verification_code: str) -> bool:
        """
        Отправляет код восстановления пароля на email.
        
        Args:
            to_email: Email получателя
            verification_code: Код восстановления пароля
            
        Returns:
            bool: True если отправка успешна, False при ошибке
        """
        # Проверяем пароль на наличие не-ASCII символов
        try:
            self.password.encode('ascii')
        except UnicodeEncodeError:
            print(f"Password contains non-ASCII characters. Cannot send email.")
            print(f"Password reset code {verification_code} for {to_email} (sending disabled due to non-ASCII password)")
            return False
            
        # Если пароль не установлен, не пытаемся отправить
        if not self.password:
            print(f"Password reset code {verification_code} for {to_email} (real sending disabled)")
            return False
            
        try:
            # Создаем сообщение
            msg = MIMEMultipart()
            msg['From'] = self.username
            msg['To'] = to_email
            msg['Subject'] = "Восстановление пароля - Cherry Lust"
            
            # Создаем HTML-тело письма
            html_body = generate_password_reset_email_html(verification_code)
            
            # Создаем текстовую версию для клиентов без поддержки HTML
            text_body = f"""Восстановление пароля - Cherry Lust

Здравствуйте!

Для восстановления пароля используйте следующий код:

{verification_code}

Важно:
- Код действителен в течение 24 часов
- Не передавайте код третьим лицам
- Если вы не запрашивали восстановление пароля, проигнорируйте это письмо

С уважением,
Команда Cherry Lust

Это автоматическое письмо, пожалуйста, не отвечайте на него"""
            
            # Добавляем HTML и текстовую версию
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))
            
            # Устанавливаем timeout для socket операций (10 секунд)
            old_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(10)
            try:
                # Подключаемся к SMTP серверу с timeout
                with smtplib.SMTP(self.host, self.port) as server:
                    if self.use_tls:
                        server.starttls()
                    
                    # Аутентификация
                    server.login(self.username, self.password)
                    
                    # Отправка сообщения
                    server.send_message(msg)
                
                print(f"Password reset code successfully sent to {to_email}")
                return True
            finally:
                # Восстанавливаем предыдущий timeout
                socket.setdefaulttimeout(old_timeout)
            
        except (smtplib.SMTPConnectError, smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as e:
            print(f"SMTP error sending password reset email to {to_email}: {type(e).__name__}: {e}")
            return False
        except Exception as e:
            print(f"Error sending password reset email to {to_email}: {type(e).__name__}: {e}")
            return False