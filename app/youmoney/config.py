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
	# Захардкоженные минимальные суммы для приёма платежей
	# Учитываем комиссию 3%: минимальная сумма = цена * 0.97
	# STANDARD: 599 * 0.97 = 581.03, округляем до 570 (запас вниз)
	# PREMIUM: 1299 * 0.97 = 1260.03, округляем до 1260 (запас вниз)
	min_standard = 570.0
	min_premium = 1260.0

	return {
		"notification_secret": notification_secret,
		"min_standard": min_standard,
		"min_premium": min_premium,
	}


