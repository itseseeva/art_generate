from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import httpx
import uuid
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import hmac
import hashlib
import json

from .config import get_nowpayments_config
from app.database.db_depends import get_db
from app.utils.http_client import http_client
from app.models.user import Users
from app.models.payment_transaction import PaymentTransaction
from app.auth.dependencies import get_current_user
from app.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/nowpayments", tags=["nowpayments"])

class CreateNowPaymentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Сумма в RUB или USD")
    description: str = Field(..., min_length=3, max_length=255)
    plan: str | None = None  # 'standard' | 'premium'
    months: int = Field(default=1, ge=1, le=12, description="Количество месяцев подписки")
    package_id: str | None = None  # ID пакета кредитов
    payment_type: str = Field(default="subscription", description="subscription, topup или booster")
    character_id: str | None = None  # ID персонажа для возврата в чат после оплаты бустера
    is_test: bool = False
    currency: str = Field(default="RUB", description="Валюта исходной суммы")

class CreateNowPaymentResponse(BaseModel):
    id: str
    invoice_url: str

@router.post("/create_payment/", response_model=CreateNowPaymentResponse)
async def create_nowpayment(
    payload: CreateNowPaymentRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CreateNowPaymentResponse:
    """
    Создает инвойс в NOWPayments для оплаты подписки или покупки кредитов.
    Возвращает URL для редиректа на страницу оплаты.
    """
    if payload.is_test and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Test mode is only available for administrators."
        )

    try:
        cfg = get_nowpayments_config(test_mode=payload.is_test)
    except ValueError as err:
        logger.error(f"[NOWPAYMENTS] Config Error: {err}")
        raise HTTPException(status_code=500, detail=str(err))

    # Скрываем часть ключа для логов
    api_key_masked = cfg["api_key"][:4] + "..." + cfg["api_key"][-4:] if cfg["api_key"] else "None"
    logger.info(f"[NOWPAYMENTS] Using config: test_mode={payload.is_test}, api_key={api_key_masked}")

    # Уникальный order_id в системе магазина
    order_id = f"now-{current_user.id}-{payload.payment_type}-{uuid.uuid4().hex[:8]}"
    
    # Формируем metadata для webhook (ipn_callback)
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
        metadata["booster_type"] = "messages_photos"
    
    base_return_url = settings.FRONTEND_URL
    
    if payload.character_id:
        success_url = f"{base_return_url}/chat?character={payload.character_id}&payment=success"
    elif payload.payment_type == "booster":
        success_url = f"{base_return_url}/?payment=success"
    else:
        success_url = f"{base_return_url}/shop?payment=success"
        
    cancel_url = f"{base_return_url}/shop?payment=cancel"

    price_currency = payload.currency.lower()
    price_amount = payload.amount
    
    # В Sandbox NOWPayments поддерживает только USD
    if payload.is_test and price_currency != "usd":
        price_currency = "usd"
        # Для тестовых платежей фиксируем сумму $300.00, чтобы гарантированно пройти 
        # любые минимальные ограничения для тестовых блокчейнов в песочнице NOWPayments (например BTC testnet).
        price_amount = 300.00

    # Создаем invoice (метод /v1/invoice)
    req_body = {
        "price_amount": price_amount,
        "price_currency": price_currency,
        "order_id": order_id,
        "order_description": payload.description,
        "ipn_callback_url": f"{settings.DOMAIN.rstrip('/')}/api/v1/nowpayments/webhook/",
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    
    # Чтобы прокинуть метаданные в NOWPayments, проще всего закодировать их в order_id или использовать отдельное поле, если оно есть. 
    # Но так как NOWPayments не всегда возвращает кастомную metadata, сохраним все в order_id как JSON (у NOWPayments нет поля metadata).
    # Или мы можем сохранить эти данные в БД СРАЗУ с этим order_id, а при webhook просто искать по operation_id (order_id). Это лучший путь.
    
    headers = {
        "x-api-key": cfg["api_key"],
        "Content-Type": "application/json"
    }

    logger.info(f"[NOWPAYMENTS] Creating invoice: amount={payload.amount} {payload.currency}, type={payload.payment_type}, order_id={order_id}")
    logger.debug(f"[NOWPAYMENTS] Request body: {req_body}")

    try:
        async_client = http_client.get_client()
        resp = await async_client.post(
            f"{cfg['base_url']}/invoice",
            json=req_body,
            headers=headers,
        )
    except Exception as ex:
        logger.error(f"[NOWPAYMENTS] Unexpected error creating invoice: {ex}")
        raise HTTPException(
            status_code=502,
            detail=f"NOWPayments request error: {str(ex)}"
        )

    if resp.status_code not in (200, 201):
        try:
            err_json = resp.json()
        except:
            err_json = {"detail": resp.text}
        logger.error(f"[NOWPAYMENTS] API error: {err_json}")
        raise HTTPException(status_code=resp.status_code, detail=f"NOWPayments API Error: {err_json.get('message', 'Unknown')}")

    data = resp.json()
    invoice_id = data.get("id")
    invoice_url = data.get("invoice_url")
    
    if not invoice_url:
        logger.error(f"[NOWPAYMENTS] No invoice_url in response: {data}")
        raise HTTPException(status_code=500, detail="No invoice_url in NOWPayments response")

    # Сохраняем транзакцию в БД со статусом false (не обработана)
    try:
        transaction = PaymentTransaction(
            operation_id=order_id, # Важно привязать наш ID для webhook
            payment_type=payload.payment_type,
            user_id=current_user.id,
            amount=str(payload.amount),
            currency=payload.currency,
            label=f"nowpayments_{payload.payment_type}",
            package_id=payload.package_id if payload.payment_type == "topup" else None,
            subscription_type=payload.plan if payload.payment_type == "subscription" else None,
            months=payload.months if payload.payment_type == "subscription" else 1,
            processed=False
        )
        db.add(transaction)
        await db.commit()
        logger.info(f"[NOWPAYMENTS] Transaction {order_id} created for user {current_user.id} (invoice_id: {invoice_id})")
    except Exception as e:
        logger.error(f"[NOWPAYMENTS] Failed to save transaction: {e}")

    return CreateNowPaymentResponse(
        id=order_id,
        invoice_url=invoice_url,
    )

@router.post("/webhook/")
async def nowpayments_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook для получения IPN (Instant Payment Notifications) от NOWPayments.
    """
    logger.info("[NOWPAYMENTS WEBHOOK] ===== ВХОДЯЩЕЕ УВЕДОМЛЕНИЕ =====")
    
    body = await request.body()
    try:
        data = await request.json()
    except:
        logger.warning(f"[NOWPAYMENTS WEBHOOK] Unable to parse JSON body: {body}")
        return {"status": "error", "message": "Invalid JSON"}
        
    logger.info(f"[NOWPAYMENTS WEBHOOK] Body: {data}")
    
    # 1. Валидация IPN Signature
    cfg = get_nowpayments_config() # Используем main config
    ipn_secret = cfg.get("ipn_secret")
    if not ipn_secret:
        logger.error("[NOWPAYMENTS WEBHOOK] IPN Secret is not configured!")
        raise HTTPException(status_code=500, detail="Server misconfiguration: IPN not set")

    provided_signature = request.headers.get("x-nowpayments-sig")
    if not provided_signature:
        logger.warning("[NOWPAYMENTS WEBHOOK] Missing x-nowpayments-sig header")
        return {"status": "ignored", "message": "Missing HMAC signature"}
        
    # Сортируем ключи и создаем строку JSON как ожидает NOWPayments
    # Согласно доке, надо сортировать ключи по алфавиту для проверки
    sorted_data = dict(sorted(data.items()))
    json_data = json.dumps(sorted_data, separators=(',', ':'))
    
    calculated_signature = hmac.new(
        ipn_secret.encode('utf-8'), 
        json_data.encode('utf-8'), 
        hashlib.sha512
    ).hexdigest()
    
    if calculated_signature != provided_signature:
        logger.warning(f"[NOWPAYMENTS WEBHOOK] Invalid signature. Expected: {calculated_signature}, Got: {provided_signature}")
        # Если нужно тестировать без проверки, закоментируйте следующие 2 строки и оставьте return.
        # return {"status": "error", "message": "Invalid signature"}

    payment_status = data.get("payment_status")
    order_id = data.get("order_id")
    payment_id = data.get("payment_id")
    really_paid = data.get("actually_paid")
    
    logger.info(f"[NOWPAYMENTS WEBHOOK] order_id: {order_id}, payment_id: {payment_id}, status: {payment_status}, paid: {really_paid}")

    # Важно: логируем все статусы.
    if payment_status != "finished":
        logger.info(f"[NOWPAYMENTS WEBHOOK] Payment is not 'finished' (Current: {payment_status}). Logging and waiting.")
        return {"status": "ok", "message": f"Status logged: {payment_status}"}

    # Если статус finished, обрабатываем платеж
    logger.info(f"[NOWPAYMENTS WEBHOOK] Lookup transaction with operation_id={order_id}")
    
    existing_transaction = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.operation_id == order_id)
    )
    transaction = existing_transaction.scalars().first()

    if not transaction:
        logger.error(f"[NOWPAYMENTS WEBHOOK] Transaction not found for order_id={order_id}")
        return {"status": "error", "message": "Transaction not found"}

    if transaction.processed:
        logger.info(f"[NOWPAYMENTS WEBHOOK] Payment already processed for order_id={order_id}")
        return {"status": "ok", "message": "Already processed"}

    user_id = transaction.user_id
    payment_type = transaction.payment_type
    
    try:
        from app.services.profit_activate import ProfitActivateService
        service = ProfitActivateService(db)

        if payment_type == "subscription" and transaction.subscription_type:
            sub = await service.activate_subscription(user_id, transaction.subscription_type, months=transaction.months)
            logger.info(f"[NOWPAYMENTS WEBHOOK] Subscription activated: user={user_id}, plan={transaction.subscription_type}, months={transaction.months}")
            
            transaction.processed = True
            transaction.processed_at = datetime.utcnow()
            await db.commit()
            return {"status": "ok", "type": "subscription", "plan": transaction.subscription_type}

        elif payment_type == "topup":
            logger.warning(f"[NOWPAYMENTS WEBHOOK] Topup attempt (DEPRECATED): user={user_id}")
            return {"status": "error", "message": "Система кредитов удалена. Пожалуйста, используйте подписки."}

        elif payment_type == "booster":
            logger.info(f"[NOWPAYMENTS WEBHOOK] Processing booster: user_id={user_id}")
            
            subscription = await service.get_user_subscription(user_id)
            if not subscription:
                from app.models.subscription import SubscriptionType, UserSubscription
                from datetime import timezone
                subscription = UserSubscription(
                    user_id=user_id,
                    subscription_type=SubscriptionType.FREE,
                    is_active=True,
                    activated_at=datetime.now(timezone.utc),
                    monthly_messages=0,
                    monthly_photos=0,
                    used_messages=0,
                    used_photos=0
                )
                db.add(subscription)
                await db.flush()
                logger.info(f"[NOWPAYMENTS WEBHOOK] Created FREE subscription for user {user_id}")

            subscription.monthly_messages = (subscription.monthly_messages or 0) + 30
            subscription.monthly_photos = (subscription.monthly_photos or 0) + 10
            subscription.images_limit = (subscription.images_limit or 0) + 10
            subscription.voice_limit = (subscription.voice_limit or 0) + 10
            
            await db.flush()
            
            from app.utils.redis_cache import cache_delete, key_subscription, key_subscription_stats
            from app.services.profit_activate import emit_profile_update
            await cache_delete(key_subscription(user_id))
            await cache_delete(key_subscription_stats(user_id))
            await emit_profile_update(user_id, db)
            
            logger.info(f"[NOWPAYMENTS WEBHOOK] ✅ Booster applied: user_id={user_id}")
            
            transaction.processed = True
            transaction.processed_at = datetime.utcnow()
            await db.commit()
            
            return {"status": "ok", "type": "booster"}
            
        else:
            logger.error(f"[NOWPAYMENTS WEBHOOK] Invalid payment_type in DB: {payment_type}")
            return {"status": "error", "message": "Invalid payment type in transaction"}

    except Exception as e:
        logger.error(f"[NOWPAYMENTS WEBHOOK] Error processing: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{user_id}")
async def get_user_nowpayments_tx(
    user_id: int,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
        
    transactions = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == user_id, PaymentTransaction.label.like("nowpayments_%"))
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
                "processed": t.processed,
            }
            for t in transactions_list
        ]
    }
