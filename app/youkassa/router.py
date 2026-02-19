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
from app.utils.http_client import http_client
from app.models.user import Users
from app.models.payment_transaction import PaymentTransaction
from app.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/kassa", tags=["yookassa"])


class CreateKassaPaymentRequest(BaseModel):
	amount: float = Field(..., gt=0, description="Сумма в RUB")
	description: str = Field(..., min_length=3, max_length=255)
	plan: str | None = None  # 'standard' | 'premium'
	months: int = Field(default=1, ge=1, le=12, description="Количество месяцев подписки")
	package_id: str | None = None  # ID пакета кредитов
	payment_type: str = Field(default="subscription", description="subscription, topup или booster")
	payment_method: str = Field(default="bank_card", description="sbp, sberbank, tinkoff_bank, yoo_money, bank_card")
	character_id: str | None = None  # ID персонажа для возврата в чат после оплаты бустера
	is_test: bool = False


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
	if payload.is_test and not current_user.is_admin:
		raise HTTPException(
			status_code=403,
			detail="Test mode is only available for administrators."
		)

	try:
		cfg = get_kassa_config(test_mode=payload.is_test)
	except ValueError as err:
		raise HTTPException(status_code=500, detail=str(err))

	# Отладочное логирование (маскированное)
	sk_masked = cfg["secret_key"][:10] + "..." + cfg["secret_key"][-4:] if cfg["secret_key"] else "None"
	logger.info(f"[YOOKASSA DEBUG] Using config: shop_id={cfg['shop_id']}, test_mode={payload.is_test}, secret_key={sk_masked}")

	# Генерируем уникальный ключ идемпотентности
	idempotence_key = f"yookassa-{current_user.id}-{payload.payment_type}-{uuid.uuid4()}"
	
	# Формируем metadata для отслеживания платежа
	metadata = {
		"user_id": str(current_user.id),
		"payment_type": payload.payment_type,
	}
	
	if payload.payment_type == "subscription" and payload.plan:
		metadata["plan"] = payload.plan
		metadata["months"] = str(payload.months)
	elif payload.payment_type == "topup" and payload.package_id:
		metadata["package_id"] = payload.package_id
	elif payload.payment_type == "booster":
		metadata["booster_type"] = "messages_photos"  # 30 сообщений + 10 генераций

	# Определяем capture в зависимости от метода оплаты
	# СБП не поддерживает двухстадийную оплату, поэтому capture всегда true
	capture = True if payload.payment_method == "sbp" else cfg["capture"]

	# Определяем return_url в зависимости от типа платежа
	# Если передан character_id, возвращаем пользователя обратно в чат с персонажем
	if payload.character_id:
		base_url = cfg["return_url"].replace("/shop", "")
		return_url = f"{base_url}/chat?character={payload.character_id}&payment=success"
	elif payload.payment_type == "booster":
		# Если это бустер, но character_id не передан, возвращаем на главную (чтобы не оставаться в магазине)
		return_url = cfg["return_url"].replace("/shop", "/?payment=success")
	else:
		return_url = cfg["return_url"]

	req_body = {
		"amount": {
			"value": f"{payload.amount:.2f}",
			"currency": cfg["currency"],
		},
		"confirmation": {
			"type": "redirect",
			"return_url": return_url,
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

	logger.info(
		f"[YOOKASSA] Creating payment: amount={payload.amount}, "
		f"method={payload.payment_method}, type={payload.payment_type}"
	)
	logger.debug(f"[YOOKASSA] Request body: {req_body}")
	
	try:
		logger.info("[YOOKASSA] Sending request to YooKassa API...")
		async_client = http_client.get_client()
		resp = await async_client.post(
			"https://api.yookassa.ru/v3/payments",
			json=req_body,
			headers=headers,
			auth=auth,
		)
		logger.info(f"[YOOKASSA] Response received: status={resp.status_code}")
	except httpx.ConnectTimeout as ex:
		logger.error(f"[YOOKASSA] Connection timeout: {ex}")
		raise HTTPException(
			status_code=504, 
			detail="YooKassa connection timeout. Please try again later."
		)
	except httpx.ReadTimeout as ex:
		logger.error(f"[YOOKASSA] Read timeout: {ex}")
		raise HTTPException(
			status_code=504,
			detail="YooKassa read timeout. Please try again later."
		)
	except httpx.ConnectError as ex:
		logger.error(f"[YOOKASSA] Connection error: {ex}")
		raise HTTPException(
			status_code=502,
			detail=f"YooKassa connection error: {str(ex)}. Check network connectivity."
		)
	except httpx.HTTPError as ex:
		logger.error(f"[YOOKASSA] HTTP error: {ex}")
		raise HTTPException(
			status_code=502,
			detail=f"YooKassa HTTP error: {str(ex)}"
		)
	except Exception as ex:
		logger.error(f"[YOOKASSA] Unexpected error: {ex}", exc_info=True)
		raise HTTPException(
			status_code=502,
			detail=f"YooKassa request error: {str(ex)}"
		)

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
			months=payload.months if payload.payment_type == "subscription" else 1,
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


async def process_yookassa_webhook(
	request: Request,
	db: AsyncSession
):
	"""
	Внутренняя функция для обработки webhook от YooKassa.
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
		
		# Получаем метод оплаты из payment_object
		payment_method_data = payment_object.get("payment_method", {})
		payment_method = payment_method_data.get("type", "bank_card") if isinstance(payment_method_data, dict) else "bank_card"
		
		logger.info(f"[YOOKASSA WEBHOOK] Payment ID: {payment_id}, Status: {status}, Amount: {amount}, Method: {payment_method}")
		logger.info(f"[YOOKASSA WEBHOOK] Metadata: {metadata}")
		
		# Проверяем статус
		if status != "succeeded":
			logger.info(f"[YOOKASSA WEBHOOK] Payment not succeeded: {status}")
			return {"status": "ok", "message": f"Payment status: {status}"}
		
		# Получаем данные из metadata
		user_id_str = metadata.get("user_id")
		if not user_id_str:
			logger.error(f"[YOOKASSA WEBHOOK] Missing user_id in metadata: {metadata}")
			raise HTTPException(status_code=400, detail="Missing user_id in metadata")
		
		try:
			user_id = int(user_id_str)
		except (ValueError, TypeError) as e:
			logger.error(f"[YOOKASSA WEBHOOK] Invalid user_id in metadata: {user_id_str}, error: {e}")
			raise HTTPException(status_code=400, detail=f"Invalid user_id in metadata: {user_id_str}")
		
		payment_type = metadata.get("payment_type", "subscription")
		plan = metadata.get("plan")
		months = int(metadata.get("months", 1))
		package_id = metadata.get("package_id")
		booster_type = metadata.get("booster_type")
		
		logger.info(
			f"[YOOKASSA WEBHOOK] Parsed metadata: user_id={user_id}, "
			f"payment_type={payment_type}, plan={plan}, months={months}, package_id={package_id}, booster_type={booster_type}"
		)
		
		# Проверяем идемпотентность
		logger.info(f"[YOOKASSA WEBHOOK] Looking for transaction with operation_id={payment_id}")
		existing_transaction = await db.execute(
			select(PaymentTransaction).where(PaymentTransaction.operation_id == payment_id)
		)
		transaction = existing_transaction.scalars().first()
		
		if transaction:
			logger.info(f"[YOOKASSA WEBHOOK] Found transaction: {transaction.id}, processed={transaction.processed}")
			if transaction.processed:
				logger.info(f"[YOOKASSA WEBHOOK] Payment already processed: {payment_id}")
				return {"status": "ok", "message": "Payment already processed"}
		else:
			# Если транзакция не найдена, создаем новую
			logger.warning(f"[YOOKASSA WEBHOOK] Transaction not found for payment_id={payment_id}, creating new one")
			
			# Важно: если это не тестовый платеж и транзакция не найдена, возможно что-то пошло не так при создании платежа
			# Но мы все равно должны обработать (например, если платеж был создан не через наш API, а вручную)
			# Или если при создании платежа произошла ошибка записи в БД
			
			transaction = PaymentTransaction(
				operation_id=payment_id,
				payment_type=payment_type,
				user_id=user_id,
				amount=str(amount),
				currency="RUB",
				label=f"yookassa_webhook_{payment_type}",
				package_id=package_id,
				subscription_type=plan,
				months=months,
				processed=False
			)
			db.add(transaction)
			await db.flush()
			logger.info(f"[YOOKASSA WEBHOOK] Created new transaction: {transaction.id} for user {user_id}, months={months}")
		

		
		# Обрабатываем платеж
		from app.services.profit_activate import ProfitActivateService
		from app.config.credit_packages import get_credit_package
		
		service = ProfitActivateService(db)
		
		if payment_type == "topup":
			# Покупка кредитов (ОТКЛЮЧЕНО)
			logger.warning(f"[YOOKASSA WEBHOOK] Topup attempt (DEPRECATED): user_id={user_id}, package_id={package_id}")
			return {"status": "error", "message": "Система кредитов удалена. Пожалуйста, используйте подписки."}
			
		elif payment_type == "subscription" and plan:
			# Активация подписки
			sub = await service.activate_subscription(user_id, plan, months=months)
			logger.info(f"[YOOKASSA WEBHOOK] Subscription activated: user_id={user_id}, plan={plan}, months={months}")
			
			transaction.processed = True
			await db.commit()
			
			return {"status": "ok", "type": "subscription", "plan": plan}
		
		elif payment_type == "booster" and booster_type == "messages_photos":
			# Начисление 30 сообщений + 10 генераций для FREE пользователей
			logger.info(f"[YOOKASSA WEBHOOK] Processing booster: user_id={user_id}, amount={amount}")
			
			# Проверяем сумму (должна быть 69 руб)
			if amount < 65:  # С учетом возможных комиссий
				logger.error(f"[YOOKASSA WEBHOOK] Booster amount too low: {amount} < 65")
				raise HTTPException(status_code=400, detail=f"Booster amount too low: {amount}")
			
			# Получаем подписку пользователя
			subscription = await service.get_user_subscription(user_id)
			if not subscription:
				# Если подписки нет, создаем FREE подписку автоматически
				logger.warning(f"[YOOKASSA WEBHOOK] No subscription found for user {user_id}, creating FREE subscription")
				from app.models.subscription import SubscriptionType, UserSubscription
				from datetime import datetime, timezone
				
				subscription = UserSubscription(
					user_id=user_id,
					subscription_type=SubscriptionType.FREE,
					is_active=True,
					activated_at=datetime.now(timezone.utc),
					monthly_messages=0,  # Будет увеличено ниже
					monthly_photos=0,  # Будет увеличено ниже
					used_messages=0,
					used_photos=0
				)
				db.add(subscription)
				await db.flush()
				logger.info(f"[YOOKASSA WEBHOOK] Created FREE subscription for user {user_id}")
			
			# Увеличиваем лимиты: +30 сообщений, +10 генераций
			subscription.monthly_messages = (subscription.monthly_messages or 0) + 30
			subscription.monthly_photos = (subscription.monthly_photos or 0) + 10
			
			# Update new limit fields as well to ensure it works with new system
			subscription.images_limit = (subscription.images_limit or 0) + 10
			subscription.voice_limit = (subscription.voice_limit or 0) + 10
			
			await db.flush()
			
			# Инвалидируем кэш
			from app.utils.redis_cache import cache_delete, key_subscription, key_subscription_stats
			from app.services.profit_activate import emit_profile_update
			await cache_delete(key_subscription(user_id))
			await cache_delete(key_subscription_stats(user_id))
			await emit_profile_update(user_id, db)
			
			logger.info(
				f"[YOOKASSA WEBHOOK] ✅ Booster applied: user_id={user_id}, "
				f"new_messages_limit={subscription.monthly_messages}, "
				f"new_photos_limit={subscription.monthly_photos}, "
				f"new_images_limit={subscription.images_limit}, "
				f"new_voice_limit={subscription.voice_limit}"
			)
			
			transaction.processed = True
			await db.commit()
			
			return {
				"status": "ok",
				"type": "booster",
				"messages_added": 30,
				"photos_added": 10,
				"voice_added": 10,
				"new_messages_limit": subscription.monthly_messages,
				"new_photos_limit": subscription.monthly_photos,
				"new_images_limit": subscription.images_limit,
				"new_voice_limit": subscription.voice_limit
			}
		
		else:
			logger.error(f"[YOOKASSA WEBHOOK] Invalid payment data: type={payment_type}, plan={plan}, package={package_id}")
			raise HTTPException(status_code=400, detail="Invalid payment data")
			
	except Exception as e:
		logger.error(f"[YOOKASSA WEBHOOK] Error processing webhook: {e}", exc_info=True)
		await db.rollback()
		raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/")
async def yookassa_webhook(
	request: Request,
	db: AsyncSession = Depends(get_db)
):
	"""
	Webhook для обработки уведомлений от ЮKassa о статусе платежа.
	Документация: https://yookassa.ru/developers/using-api/webhooks
	"""
	return await process_yookassa_webhook(request, db)


@router.get("/callback")
async def yookassa_callback():
	"""
	Redirect URI для ЮKassa после оплаты.
	"""
	from fastapi.responses import RedirectResponse
	return RedirectResponse(url="/?payment=success", status_code=302)


@router.get("/transactions/{user_id}")
async def get_user_transactions(
	user_id: int,
	current_user: Users = Depends(get_current_user),
	db: AsyncSession = Depends(get_db)
):
	"""
	Получить список транзакций пользователя для отладки.
	"""
	# Проверяем, что пользователь запрашивает свои транзакции или является админом
	if current_user.id != user_id and not current_user.is_admin:
		raise HTTPException(status_code=403, detail="Access denied")
	
	transactions = await db.execute(
		select(PaymentTransaction)
		.where(PaymentTransaction.user_id == user_id)
		.order_by(PaymentTransaction.created_at.desc())
		.limit(50)
	)
	
	transactions_list = transactions.scalars().all()
	
	return {
		"user_id": user_id,
		"transactions": [
			{
				"operation_id": t.operation_id,
				"payment_type": t.payment_type,
				"amount": t.amount,
				"currency": t.currency,
				"package_id": t.package_id,
				"subscription_type": t.subscription_type,
				"months": t.months,
				"processed": t.processed,
				"created_at": t.created_at.isoformat() if t.created_at else None,
				"processed_at": t.processed_at.isoformat() if t.processed_at else None,
			}
			for t in transactions_list
		]
	}


@router.post("/process-transaction343242/{operation_id}")
async def process_transaction_manually(
	operation_id: str,
	current_user: Users = Depends(get_current_user),
	db: AsyncSession = Depends(get_db)
):
	"""
	Вручную обработать транзакцию (для случаев, когда webhook не пришел).
	Только для администраторов.
	"""
	if not current_user.is_admin:
		raise HTTPException(status_code=403, detail="Access denied. Admin only.")
	
	# Находим транзакцию
	transaction = await db.execute(
		select(PaymentTransaction).where(PaymentTransaction.operation_id == operation_id)
	)
	transaction = transaction.scalars().first()
	
	if not transaction:
		raise HTTPException(status_code=404, detail="Transaction not found")
	
	if transaction.processed:
		return {"status": "ok", "message": "Transaction already processed"}
	
	# Обрабатываем транзакцию
	from app.services.profit_activate import ProfitActivateService
	from app.config.credit_packages import get_credit_package
	
	service = ProfitActivateService(db)
	
	if transaction.payment_type == "topup":
		return {"status": "error", "message": "Credit top-up is deprecated."}
		
	
	elif transaction.payment_type == "subscription" and transaction.subscription_type:
		months = getattr(transaction, 'months', 1) or 1
		await service.activate_subscription(transaction.user_id, transaction.subscription_type, months=months)
		logger.info(
			f"[YOOKASSA MANUAL] Subscription activated: user_id={transaction.user_id}, "
			f"plan={transaction.subscription_type}, months={months}, operation_id={operation_id}"
		)
		
		transaction.processed = True
		transaction.processed_at = datetime.utcnow()
		await db.commit()
		
		return {"status": "ok", "type": "subscription", "plan": transaction.subscription_type, "months": months}
	
	else:
		raise HTTPException(status_code=400, detail="Invalid transaction data")



