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
	# Учитываем комиссию 3.5%: минимальная сумма = цена * 0.965
	# STANDARD: 499 * 0.965 = 481.535, округляем до 481 (запас вниз)
	# PREMIUM: 1299 * 0.965 = 1253.535, округляем до 1253 (запас вниз)
	min_standard = 481.0
	min_premium = 1253.0

	return {
		"notification_secret": notification_secret,
		"min_standard": min_standard,
		"min_premium": min_premium,
	}


