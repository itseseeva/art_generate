"""
Конфигурация OAuth провайдеров.
"""

import os
import json
from dotenv import load_dotenv

# Загружаем .env файл из корня проекта
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Пытаемся загрузить настройки из client_secret.json
def load_google_credentials():
    """Загружает Google OAuth настройки из переменных окружения."""
    # Используем настройки из переменных окружения (.env файл)
    return {
        'client_id': os.getenv("GOOGLE_CLIENT_ID"),
        'client_secret': os.getenv("GOOGLE_CLIENT_SECRET"),
        'redirect_uri': os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback/")
    }

# Загружаем настройки Google OAuth
google_creds = load_google_credentials()
GOOGLE_CLIENT_ID = google_creds['client_id']
GOOGLE_CLIENT_SECRET = google_creds['client_secret']
GOOGLE_REDIRECT_URI = google_creds['redirect_uri']

# Проверяем обязательные переменные
if not GOOGLE_CLIENT_ID:
    print("[WARNING] GOOGLE_CLIENT_ID not set. Google OAuth will not work.")
    print("[INFO] Set GOOGLE_CLIENT_ID in .env file or environment variables.")
if not GOOGLE_CLIENT_SECRET:
    print("[WARNING] GOOGLE_CLIENT_SECRET not set. Google OAuth will not work.")
    print("[INFO] Set GOOGLE_CLIENT_SECRET in .env file or environment variables.")

# OAuth провайдеры
OAUTH_PROVIDERS = {
    "google": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "authorize_url": "https://accounts.google.com/o/oauth2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "user_info_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
        "redirect_uri": GOOGLE_REDIRECT_URI
    }
}
