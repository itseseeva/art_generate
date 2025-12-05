"""
Минимальная конфигурация для интеграции YooMoney QuickPay (только HTTP‑уведомления).
"""
import os
from typing import TypedDict
from dotenv import load_dotenv
from pathlib import Path

# Загружаем переменные окружения из .env и, если есть, из файла "env" (как у вас в проекте)
load_dotenv(override=True)
env_path = Path("env")
if env_path.exists():
	load_dotenv(dotenv_path=str(env_path), override=True)


class YouMoneyConfig(TypedDict):
	notification_secret: str | None
	min_standard: float
	min_premium: float


def get_youm_config() -> YouMoneyConfig:
	"""
	Читает env‑переменные для QuickPay‑уведомлений.
	"""
	notification_secret = os.getenv("YOUMONEY_NOTIFICATION_SECRET") or os.getenv("notification_secret") or None
	# Минимальные суммы для приёма (можно ослабить из-за комиссий карт)
	def _to_float(value: str | None, default: float) -> float:
		if not value:
			return default
		try:
			return float(value)
		except Exception:
			return default
	min_standard = _to_float(os.getenv("YOUMONEY_MIN_STANDARD"), 599.0)
	min_premium = _to_float(os.getenv("YOUMONEY_MIN_PREMIUM"), 1399.0)

	return {
		"notification_secret": notification_secret,
		"min_standard": min_standard,
		"min_premium": min_premium,
	}


