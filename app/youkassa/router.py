from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import httpx
import uuid
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .config import get_kassa_config
from app.database.db_depends import get_db
from app.models.user import Users
from app.models.payment_transaction import PaymentTransaction
from app.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/kassa", tags=["yookassa"])


class CreateKassaPaymentRequest(BaseModel):
	amount: float = Field(..., gt=0, description="Сумма в RUB")
	description: str = Field(..., min_length=3, max_length=255)
	plan: str | None = None  # 'standard' | 'premium'
	package_id: str | None = None  # ID пакета кредитов
	payment_type: str = Field(default="subscription", description="subscription или topup")
	payment_method: str = Field(default="bank_card", description="sbp, sberbank, tinkoff_bank, yoo_money, bank_card")


class CreateKassaPaymentResponse(BaseModel):
	id: str
	status: str
	confirmation_url: str


class YooKassaWebhookRequest(BaseModel):
	"""Схема webhook уведомления от ЮKassa"""
	type: str
	event: str
	object: Dict[str, Any]


@router.post("/create_payment/", response_model=CreateKassaPaymentResponse)
async def create_kassa_payment(
	payload: CreateKassaPaymentRequest,
	current_user: Users = Depends(get_current_user),
	db: AsyncSession = Depends(get_db)
) -> CreateKassaPaymentResponse:
	"""
	Создает платеж в ЮKassa для подписки или покупки кредитов.
	"""
	try:
		cfg = get_kassa_config()
	except ValueError as err:
		raise HTTPException(status_code=500, detail=str(err))

	# Генерируем уникальный ключ идемпотентности
	idempotence_key = f"yookassa-{current_user.id}-{payload.payment_type}-{uuid.uuid4()}"
	
	# Формируем metadata для отслеживания платежа
	metadata = {
		"user_id": str(current_user.id),
		"payment_type": payload.payment_type,
	}
	
	if payload.payment_type == "subscription" and payload.plan:
		metadata["plan"] = payload.plan
	elif payload.payment_type == "topup" and payload.package_id:
		metadata["package_id"] = payload.package_id

	# Определяем capture в зависимости от метода оплаты
	# СБП не поддерживает двухстадийную оплату, поэтому capture всегда true
	capture = True if payload.payment_method == "sbp" else cfg["capture"]

	req_body = {
		"amount": {
			"value": f"{payload.amount:.2f}",
			"currency": cfg["currency"],
		},
		"confirmation": {
			"type": "redirect",
			"return_url": cfg["return_url"],
		},
		"capture": capture,
		"description": payload.description,
		"metadata": metadata,
		"payment_method_data": {
			"type": payload.payment_method
		}
	}

	headers = {
		"Idempotence-Key": idempotence_key,
		"Content-Type": "application/json"
	}

	auth = (cfg["shop_id"], cfg["secret_key"])

	try:
		resp = httpx.post(
			"https://api.yookassa.ru/v3/payments",
			json=req_body,
			headers=headers,
			auth=auth,
			timeout=20.0,
		)
	except Exception as ex:
		logger.error(f"[YOOKASSA] Request error: {ex}")
		raise HTTPException(status_code=502, detail=f"YooKassa request error: {ex}")

	if resp.status_code not in (200, 201):
		try:
			err_json = resp.json()
		except Exception:
			err_json = {"detail": resp.text}
		logger.error(f"[YOOKASSA] API error: {err_json}")
		raise HTTPException(status_code=resp.status_code, detail=err_json)

	data = resp.json()
	conf = data.get("confirmation") or {}
	conf_url = conf.get("confirmation_url")
	if not conf_url:
		raise HTTPException(status_code=500, detail="No confirmation_url in YooKassa response")

	# Сохраняем транзакцию в БД
	try:
		transaction = PaymentTransaction(
			operation_id=data.get("id"),
			payment_type=payload.payment_type,
			user_id=current_user.id,
			amount=str(payload.amount),
			currency=cfg["currency"],
			label=f"yookassa_{payload.payment_type}",
			package_id=payload.package_id if payload.payment_type == "topup" else None,
			subscription_type=payload.plan if payload.payment_type == "subscription" else None,
			processed=False
		)
		db.add(transaction)
		await db.commit()
		logger.info(f"[YOOKASSA] Transaction created: {data.get('id')} for user {current_user.id}")
	except Exception as e:
		logger.error(f"[YOOKASSA] Failed to save transaction: {e}")
		# Не прерываем процесс создания платежа

	return CreateKassaPaymentResponse(
		id=data.get("id", ""),
		status=data.get("status", ""),
		confirmation_url=conf_url,
	)


@router.post("/webhook/")
async def yookassa_webhook(
	request: Request,
	db: AsyncSession = Depends(get_db)
):
	"""
	Webhook для обработки уведомлений от ЮKassa о статусе платежа.
	Документация: https://yookassa.ru/developers/using-api/webhooks
	"""
	logger.info("[YOOKASSA WEBHOOK] ===== ВХОДЯЩЕЕ УВЕДОМЛЕНИЕ =====")
	
	try:
		# Получаем JSON body
		body = await request.json()
		logger.info(f"[YOOKASSA WEBHOOK] Body: {body}")
		
		event_type = body.get("event")
		payment_object = body.get("object", {})
		
		if event_type != "payment.succeeded":
			logger.info(f"[YOOKASSA WEBHOOK] Ignoring event: {event_type}")
			return {"status": "ok", "message": f"Event {event_type} ignored"}
		
		# Получаем данные платежа
		payment_id = payment_object.get("id")
		status = payment_object.get("status")
		amount_data = payment_object.get("amount", {})
		amount = float(amount_data.get("value", 0))
		metadata = payment_object.get("metadata", {})
		
		logger.info(f"[YOOKASSA WEBHOOK] Payment ID: {payment_id}, Status: {status}, Amount: {amount}")
		logger.info(f"[YOOKASSA WEBHOOK] Metadata: {metadata}")
		
		# Проверяем статус
		if status != "succeeded":
			logger.info(f"[YOOKASSA WEBHOOK] Payment not succeeded: {status}")
			return {"status": "ok", "message": f"Payment status: {status}"}
		
		# Получаем данные из metadata
		user_id = int(metadata.get("user_id"))
		payment_type = metadata.get("payment_type", "subscription")
		plan = metadata.get("plan")
		package_id = metadata.get("package_id")
		
		# Проверяем идемпотентность
		existing_transaction = await db.execute(
			select(PaymentTransaction).where(PaymentTransaction.operation_id == payment_id)
		)
		transaction = existing_transaction.scalars().first()
		
		if transaction and transaction.processed:
			logger.info(f"[YOOKASSA WEBHOOK] Payment already processed: {payment_id}")
			return {"status": "ok", "message": "Payment already processed"}
		
		# Обновляем или создаем транзакцию
		if not transaction:
			transaction = PaymentTransaction(
				operation_id=payment_id,
				payment_type=payment_type,
				user_id=user_id,
				amount=str(amount),
				currency=amount_data.get("currency", "RUB"),
				label=f"yookassa_{payment_type}",
				package_id=package_id,
				subscription_type=plan,
				processed=False
			)
			db.add(transaction)
			await db.flush()
		
		# Обрабатываем платеж
		from app.services.profit_activate import ProfitActivateService
		from app.config.credit_packages import get_credit_package
		
		service = ProfitActivateService(db)
		
		if payment_type == "topup" and package_id:
			# Покупка кредитов
			package = get_credit_package(package_id)
			if not package:
				logger.error(f"[YOOKASSA WEBHOOK] Unknown package: {package_id}")
				raise HTTPException(status_code=400, detail=f"Unknown package: {package_id}")
			
			result = await service.add_credits_topup(user_id, package.credits)
			logger.info(f"[YOOKASSA WEBHOOK] Credits added: user_id={user_id}, credits={package.credits}")
			
			transaction.processed = True
			await db.commit()
			
			return {"status": "ok", "type": "topup", "credits": package.credits}
			
		elif payment_type == "subscription" and plan:
			# Активация подписки
			sub = await service.activate_subscription(user_id, plan)
			logger.info(f"[YOOKASSA WEBHOOK] Subscription activated: user_id={user_id}, plan={plan}")
			
			transaction.processed = True
			await db.commit()
			
			return {"status": "ok", "type": "subscription", "plan": plan}
		
		else:
			logger.error(f"[YOOKASSA WEBHOOK] Invalid payment data: type={payment_type}, plan={plan}, package={package_id}")
			raise HTTPException(status_code=400, detail="Invalid payment data")
			
	except Exception as e:
		logger.error(f"[YOOKASSA WEBHOOK] Error processing webhook: {e}", exc_info=True)
		await db.rollback()
		raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback")
async def yookassa_callback():
	"""
	Redirect URI для ЮKassa после оплаты.
	"""
	from fastapi.responses import RedirectResponse
	return RedirectResponse(url="/?payment=success", status_code=302)

