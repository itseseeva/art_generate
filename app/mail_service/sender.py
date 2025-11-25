"""
Email sender для отправки уведомлений.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .config import (
    EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS,
    EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL
)


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
            msg['Subject'] = "Email Verification - Art Generation API"
            
            # Create simple text body
            text_body = f"""Email Verification - Art Generation API

Hello!

To verify your email address, use the following code:

{verification_code}

Important:
- Code is valid for 24 hours
- Do not share the code with third parties
- If you did not register in Art Generation API, ignore this email

Best regards,
Art Generation API Team

This is an automatic email, please do not reply"""
            
            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            
            # Connect to SMTP server
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                
                # Authenticate
                server.login(self.username, self.password)
                
                # Send message
                server.send_message(msg)
                
            print(f"Verification code successfully sent to {to_email}")
            return True
            
        except Exception as e:
            print(f"Error sending email: {type(e).__name__}")
            return False
