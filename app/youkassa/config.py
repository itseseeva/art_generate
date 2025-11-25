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


def get_kassa_config() -> YooKassaConfig:
	shop_id = os.getenv("YOOKASSA_SHOP_ID") or os.getenv("yookassa_shop_id")
	secret_key = os.getenv("YOOKASSA_SECRET_KEY") or os.getenv("yookassa_secret_key")
	return_url = os.getenv("YOOKASSA_RETURN_URL") or os.getenv("redirect_url1")
	currency = os.getenv("YOOKASSA_CURRENCY") or "RUB"
	capture_env = os.getenv("YOOKASSA_CAPTURE", "true").strip().lower()
	capture = capture_env in ("1", "true", "yes", "on")

	missing = []
	if not shop_id:
		missing.append("YOOKASSA_SHOP_ID")
	if not secret_key:
		missing.append("YOOKASSA_SECRET_KEY")
	if not return_url:
		missing.append("YOOKASSA_RETURN_URL (или redirect_url1)")
	if missing:
		raise ValueError(f"YooKassa config is incomplete, missing: {', '.join(missing)}")

	return {
		"shop_id": shop_id,
		"secret_key": secret_key,
		"return_url": return_url,
		"currency": currency,
		"capture": capture,
	}


