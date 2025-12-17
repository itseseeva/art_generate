"""
Минимальные маршруты для YooMoney QuickPay: принимаем только HTTP‑уведомления.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import hashlib
import logging
from datetime import datetime

from .config import get_youm_config


router = APIRouter(prefix="/api/v1/youmoney", tags=["youmoney"])


class NotifyOK(BaseModel):
	ok: bool
	user_id: int
	plan: str

@router.post("/quickpay/notify")
async def youmoney_quickpay_notify(request: Request):
	"""
	YooMoney QuickPay HTTP-notification endpoint.
	Верифицируем sha1_hash и, если всё ок, активируем подписку пользователю из label.
	label формат: "plan:<standard|premium>;uid:<userId>"
	Документация: вычисление sha1 от
	notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label
	"""
	form = await request.form()
	data = {k: (form.get(k) or "") for k in [
		"notification_type","operation_id","amount","currency","datetime",
		"sender","codepro","label","sha1_hash"
	]}
	logging.info("[YOUMONEY NOTIFY] incoming: %s", {k: data[k] for k in data if k != "sha1_hash"})
	try:
		cfg = get_youm_config()
	except ValueError as err:
		logging.error("[YOUMONEY NOTIFY] config error: %s", err)
		raise HTTPException(status_code=500, detail=str(err))
	# Секрет может быть пустым (если в кошельке не задан). Тогда подпись считается с пустой строкой.
	secret = cfg.get("notification_secret") or ""
	# Если секрет задан у нас, но sha1_hash не пришёл — отклоняем.
	if secret and not data["sha1_hash"]:
		logging.warning("[YOUMONEY NOTIFY] missing sha1_hash while secret configured")
		raise HTTPException(status_code=400, detail="missing sha1_hash")

	check_str = "&".join([
		data["notification_type"], data["operation_id"], data["amount"], data["currency"],
		data["datetime"], data["sender"], data["codepro"], secret, data["label"]
	])
	digest = hashlib.sha1(check_str.encode("utf-8")).hexdigest()
	if digest.lower() != (data["sha1_hash"] or "").lower():
		logging.warning("[YOUMONEY NOTIFY] invalid signature: expected=%s got=%s", digest.lower(), (data["sha1_hash"] or "").lower())
		raise HTTPException(status_code=400, detail="invalid sha1 signature")

	# Отсекаем защищённые платежи и слишком маленькие суммы
	if (data["codepro"] or "").lower() == "true":
		logging.warning("[YOUMONEY NOTIFY] codepro=true not accepted")
		raise HTTPException(status_code=400, detail="codepro payments are not accepted")

	label = data["label"] or ""
	plan = "standard"
	user_id = None
	payment_type = "subscription"  # По умолчанию подписка
	package_id = None
	
	# ожидаем "plan:premium;uid:37" или "type:topup;package:small;uid:37"
	try:
		parts = [p.strip() for p in label.split(";")]
		for p in parts:
			if p.startswith("plan:"):
				plan = p.split(":",1)[1].strip().lower()
			if p.startswith("type:"):
				payment_type = p.split(":",1)[1].strip().lower()
			if p.startswith("package:"):
				package_id = p.split(":",1)[1].strip().lower()
			if p.startswith("uid:"):
				user_id = int(p.split(":",1)[1].strip())
	except Exception:
		pass
	if not user_id:
		logging.warning("[YOUMONEY NOTIFY] label parse error, no uid: %s", label)
		raise HTTPException(status_code=400, detail="user id not found in label")

	# Проверяем сумму
	try:
		amount_val = float(data["amount"].replace(",","."))
	except Exception:
		amount_val = 0.0
	
	# Проверяем идемпотентность: не обрабатывали ли мы уже этот платеж?
	from sqlalchemy.ext.asyncio import AsyncSession
	from app.database.db import async_session_maker
	from app.services.profit_activate import ProfitActivateService
	from app.config.credit_packages import get_credit_package
	from app.models.payment_transaction import PaymentTransaction
	from sqlalchemy import select
	
	async with async_session_maker() as db:  # type: AsyncSession
		# Проверяем, не обрабатывали ли мы уже этот operation_id
		existing_transaction = await db.execute(
			select(PaymentTransaction).where(PaymentTransaction.operation_id == data["operation_id"])
		)
		transaction = existing_transaction.scalars().first()
		
		if transaction:
			if transaction.processed:
				# Платеж уже обработан - возвращаем успешный ответ (идемпотентность)
				logging.info("[YOUMONEY NOTIFY] Дубликат платежа (уже обработан): operation_id=%s", data["operation_id"])
				return {"ok": True, "user_id": transaction.user_id, "duplicate": True, "message": "Payment already processed"}
			else:
				# Транзакция существует, но не обработана - возможно, была ошибка
				logging.warning("[YOUMONEY NOTIFY] Транзакция существует, но не обработана: operation_id=%s", data["operation_id"])
				# Продолжаем обработку ниже
		else:
			# Создаем новую запись о транзакции (еще не обработана)
			transaction = PaymentTransaction(
				operation_id=data["operation_id"],
				payment_type=payment_type,
				user_id=user_id,
				amount=data["amount"],
				currency=data.get("currency", "RUB"),
				label=label,
				package_id=package_id if payment_type == "topup" else None,
				subscription_type=plan if payment_type == "subscription" else None,
				processed=False
			)
			db.add(transaction)
			await db.flush()  # Сохраняем транзакцию перед обработкой
		
		service = ProfitActivateService(db)
		
		try:
			if payment_type == "topup" and package_id:
				# Разовая покупка кредитов
				package = get_credit_package(package_id)
				if not package:
					logging.warning("[YOUMONEY NOTIFY] unknown package_id: %s", package_id)
					raise HTTPException(status_code=400, detail=f"Unknown package: {package_id}")
				
				# Проверяем сумму (допускаем небольшую погрешность из-за комиссий)
				if amount_val + 1e-6 < package.price * 0.95:  # Минимум 95% от цены
					logging.warning("[YOUMONEY NOTIFY] amount too low: %s (expected ~%s) for package=%s", amount_val, package.price, package_id)
					raise HTTPException(status_code=400, detail=f"amount too low ({amount_val} < {package.price * 0.95})")
				
				result = await service.add_credits_topup(user_id, package.credits)
				logging.info("[YOUMONEY NOTIFY] credits top-up: user_id=%s package=%s credits=%s", user_id, package_id, package.credits)
				
				# Помечаем транзакцию как обработанную
				transaction.processed = True
				transaction.processed_at = datetime.utcnow()
				await db.commit()
				
				return {"ok": True, "user_id": user_id, "type": "topup", "package": package_id, "credits": package.credits}
			else:
				# Обычная подписка
				min_amount = (cfg["min_premium"] if plan == "premium" else cfg["min_standard"])
				if amount_val + 1e-6 < min_amount:
					logging.warning("[YOUMONEY NOTIFY] amount too low: %s (min %s) for plan=%s", amount_val, min_amount, plan)
					raise HTTPException(status_code=400, detail=f"amount too low ({amount_val} < {min_amount})")
				
				sub = await service.activate_subscription(user_id, plan)
				logging.info("[YOUMONEY NOTIFY] subscription activated: user_id=%s plan=%s", user_id, plan)
				
				# Помечаем транзакцию как обработанную
				transaction.processed = True
				transaction.processed_at = datetime.utcnow()
				await db.commit()
				
				return {"ok": True, "user_id": user_id, "plan": plan}
		except Exception as e:
			# В случае ошибки не помечаем транзакцию как обработанную
			# Это позволит повторить обработку при повторном запросе от YooMoney
			await db.rollback()
			logging.error("[YOUMONEY NOTIFY] Ошибка обработки платежа: %s", e)
			raise


