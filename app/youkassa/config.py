import os
from typing import TypedDict
from dotenv import load_dotenv
from pathlib import Path

# Load env files
load_dotenv(override=True)
env_path = Path("env")
if env_path.exists():
	load_dotenv(dotenv_path=str(env_path), override=True)


class YooKassaConfig(TypedDict):
	shop_id: str
	secret_key: str
	return_url: str
	currency: str
	capture: bool


def get_kassa_config(test_mode: bool = False) -> YooKassaConfig:
	"""
	Получает конфигурацию YooKassa из переменных окружения.
	
	Для тестирования используйте тестовые ключи из личного кабинета YooKassa:
	- Включите "Тестовый режим" в настройках API
	- Используйте тестовый shop_id и секретный ключ
	- Тестовые карты: 5555 5555 5555 4444 (успешная оплата)
	
	Подробнее: см. app/youkassa/TESTING.md
	"""
	shop_id = os.getenv("YOOKASSA_TEST_SHOP_ID") if test_mode else None
	if not shop_id:
		shop_id = os.getenv("YOOKASSA_SHOP_ID") or os.getenv("yookassa_shop_id")

	if test_mode:
		secret_key = os.getenv("YOU_KASSA_TEST_API_KEY")
	else:
		# Поддержка обоих вариантов: YOU_KASSA_API_KEY и YOOKASSA_SECRET_KEY
		secret_key = (
			os.getenv("YOU_KASSA_API_KEY") or 
			os.getenv("YOOKASSA_SECRET_KEY") or 
			os.getenv("yookassa_secret_key")
		)

	return_url = os.getenv("YOOKASSA_RETURN_URL") or os.getenv("redirect_url1") or "https://candygirlschat.com/shop"
	currency = os.getenv("YOOKASSA_CURRENCY") or "RUB"
	capture_env = os.getenv("YOOKASSA_CAPTURE", "true").strip().lower()
	capture = capture_env in ("1", "true", "yes", "on")

	missing = []
	if not shop_id:
		missing.append("YOOKASSA_SHOP_ID")
	if not secret_key:
		key_name = "YOU_KASSA_TEST_API_KEY" if test_mode else "YOU_KASSA_API_KEY или YOOKASSA_SECRET_KEY"
		missing.append(key_name)
	if missing:
		raise ValueError(f"YooKassa config is incomplete, missing: {', '.join(missing)}")

	return {
		"shop_id": shop_id,
		"secret_key": secret_key,
		"return_url": return_url,
		"currency": currency,
		"capture": capture,
	}

