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
    """
    # Гарантируем, что код - это строка
    code_str = str(verification_code)
    
    html_template = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>Подтверждение email - Cherry Lust</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, div, p, h1 {{ font-family: Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #0f172a;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                    <!-- Верхняя декоративная полоса -->
                    <tr>
                        <td height="8" style="background: linear-gradient(90deg, #d946ef, #8b5cf6);"></td>
                    </tr>
                    
                    <!-- Логотип -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #d946ef, #8b5cf6); border-radius: 12px; padding: 12px 24px;">
                                        <span style="color: #ffffff; font-family: 'Inter', Arial, sans-serif; font-size: 24px; font-weight: 800; text-align: center; letter-spacing: -0.5px; text-decoration: none;">Cherry Lust</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Основной контент -->
                    <tr>
                        <td align="center" style="padding: 20px 40px 40px 40px; font-family: 'Inter', Arial, sans-serif;">
                            <h1 style="margin: 0 0 20px 0; color: #f8fafc; font-size: 32px; font-weight: 800; text-align: center; letter-spacing: -0.025em; line-height: 1.2;">
                                Подтвердите ваш email
                            </h1>
                            <p style="margin: 0 0 40px 0; color: #94a3b8; font-size: 18px; line-height: 1.6; text-align: center;">
                                Приятно видеть вас в Cherry Lust! Для завершения регистрации или входа в аккаунт, пожалуйста, используйте этот код подтверждения:
                            </p>
                            
                            <!-- Блок с кодом -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #0f172a; border: 2px solid #d946ef; border-radius: 16px; padding: 24px 48px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 800; color: #d946ef; letter-spacing: 12px; text-align: center; display: block;">{code_str}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 40px 0 0 0; color: #64748b; font-size: 14px; text-align: center; font-style: italic;">
                                Код действителен в течение 24 часов. Если вы не запрашивали этот код, просто проигнорируйте это письмо.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Футер -->
                    <tr>
                        <td align="center" style="padding: 32px 40px; background-color: #0f172a; border-top: 1px solid #334155; font-family: 'Inter', Arial, sans-serif;">
                            <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px; text-align: center; font-weight: 600;">
                                С любовью, команда Cherry Lust
                            </p>
                            <p style="margin: 0; color: #475569; font-size: 12px; text-align: center;">
                                Это автоматическое системное сообщение.<br>
                                © 2024 Cherry Lust. Все права защищены.
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
    """
    # Гарантируем, что код - это строка
    code_str = str(verification_code)
    
    html_template = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>Восстановление пароля - Cherry Lust</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, div, p, h1 {{ font-family: Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #0f172a;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 24px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
                    <!-- Верхняя декоративная полоса -->
                    <tr>
                        <td height="8" style="background: linear-gradient(90deg, #d946ef, #8b5cf6);"></td>
                    </tr>
                    
                    <!-- Логотип -->
                    <tr>
                        <td align="center" style="padding: 40px 20px 20px 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #d946ef, #8b5cf6); border-radius: 12px; padding: 12px 24px;">
                                        <span style="color: #ffffff; font-family: 'Inter', Arial, sans-serif; font-size: 24px; font-weight: 800; text-align: center; letter-spacing: -0.5px; text-decoration: none;">Cherry Lust</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Основной контент -->
                    <tr>
                        <td align="center" style="padding: 20px 40px 40px 40px; font-family: 'Inter', Arial, sans-serif;">
                            <h1 style="margin: 0 0 20px 0; color: #f8fafc; font-size: 32px; font-weight: 800; text-align: center; letter-spacing: -0.025em; line-height: 1.2;">
                                Восстановление пароля
                            </h1>
                            <p style="margin: 0 0 40px 0; color: #94a3b8; font-size: 18px; line-height: 1.6; text-align: center;">
                                Мы получили запрос на восстановление пароля для вашего аккаунта. Используйте этот код для продолжения:
                            </p>
                            
                            <!-- Блок с кодом -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #0f172a; border: 2px solid #d946ef; border-radius: 16px; padding: 24px 48px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 800; color: #d946ef; letter-spacing: 12px; text-align: center; display: block;">{code_str}</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 40px 0 0 0; color: #64748b; font-size: 14px; text-align: center; font-style: italic;">
                                Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш текущий пароль останется прежним.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Футер -->
                    <tr>
                        <td align="center" style="padding: 32px 40px; background-color: #0f172a; border-top: 1px solid #334155; font-family: 'Inter', Arial, sans-serif;">
                            <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px; text-align: center; font-weight: 600;">
                                С любовью, команда Cherry Lust
                            </p>
                            <p style="margin: 0; color: #475569; font-size: 12px; text-align: center;">
                                Это автоматическое системное сообщение.<br>
                                © 2024 Cherry Lust. Все права защищены.
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