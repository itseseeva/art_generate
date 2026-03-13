from fastapi import APIRouter, HTTPException, Request, Depends, Query
import httpx
import hmac
import hashlib
import logging
import os
import json
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_current_user
from app.models.user import Users
from app.models.payment_transaction import PaymentTransaction
from app.database.db_depends import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["creem"])


def _get_base_url(api_key: str) -> str:
    """Возвращает нужный API URL в зависимости от типа ключа."""
    if api_key.startswith("creem_test_"):
        return "https://test-api.creem.io/v1"
    return "https://api.creem.io/v1"


@router.post("/creem-checkout")
async def creem_checkout(
    current_user: Users = Depends(get_current_user),
    plan: str = Query(default="premium", description="Тарифный план: 'standard' или 'premium'"),
):
    """
    Создаёт Creem checkout сессию и возвращает checkout_url для редиректа.
    Доступен только для администраторов.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступно только для администраторов")

    api_key = os.getenv("CREEM_API_KEY")
    product_id = os.getenv("CREEM_PRODUCT_ID")

    if not api_key:
        logger.error("[CREEM] CREEM_API_KEY не задан в .env")
        raise HTTPException(status_code=500, detail="CREEM_API_KEY не настроен")

    if not product_id:
        logger.error("[CREEM] CREEM_PRODUCT_ID не задан в .env")
        raise HTTPException(status_code=500, detail="CREEM_PRODUCT_ID не настроен")

    base_url = _get_base_url(api_key)
    if api_key.startswith("creem_test_"):
        logger.info("[CREEM] Используется тестовый сервер: test-api.creem.io")

    # Передаём user_id и plan в metadata — они вернутся в webhook
    payload = {
        "product_id": product_id,
        "metadata": {
            "user_id": str(current_user.id),
            "plan": plan,
        },
    }

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }

    logger.info(
        f"[CREEM] Создание checkout для user_id={current_user.id}, "
        f"product_id={product_id}, plan={plan}"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/checkouts",
                json=payload,
                headers=headers,
            )
    except Exception as ex:
        logger.error(f"[CREEM] Ошибка запроса к Creem API: {ex}")
        raise HTTPException(status_code=502, detail=f"Ошибка соединения с Creem: {str(ex)}")

    if resp.status_code not in (200, 201):
        logger.error(f"[CREEM] Ошибка API: {resp.status_code} — {resp.text}")
        try:
            err = resp.json()
        except Exception:
            err = {"message": resp.text}
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Creem API Error: {err.get('message', 'Unknown error')}"
        )

    data = resp.json()
    checkout_url = data.get("checkout_url")

    if not checkout_url:
        logger.error(f"[CREEM] checkout_url отсутствует в ответе: {data}")
        raise HTTPException(status_code=500, detail="checkout_url отсутствует в ответе Creem")

    logger.info(f"[CREEM] Checkout создан: {checkout_url}")
    return {"checkout_url": checkout_url}


@router.post("/creem-webhook")
async def creem_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook от Creem.io — срабатывает при успешной оплате (checkout.completed).
    Верифицирует подпись HMAC-SHA256 и активирует подписку пользователю.
    """
    logger.info("[CREEM WEBHOOK] ===== ВХОДЯЩЕЕ УВЕДОМЛЕНИЕ =====")

    body_bytes = await request.body()

    # --- Верификация подписи ---
    webhook_secret = os.getenv("CREEM_WEBHOOK_SECRET")
    if webhook_secret:
        provided_sig = request.headers.get("creem-signature", "")
        computed_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(provided_sig, computed_sig):
            logger.warning(
                f"[CREEM WEBHOOK] Неверная подпись. "
                f"Expected: {computed_sig}, Got: {provided_sig}"
            )
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        logger.warning("[CREEM WEBHOOK] CREEM_WEBHOOK_SECRET не задан — подпись не проверяется")

    # --- Парсинг тела ---
    try:
        data = json.loads(body_bytes)
    except Exception:
        logger.error("[CREEM WEBHOOK] Не удалось распарсить JSON")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    logger.info(f"[CREEM WEBHOOK] Event: {data.get('eventType')}, id: {data.get('id')}")

    event_type = data.get("eventType")

    # Нас интересует только checkout.completed
    if event_type != "checkout.completed":
        logger.info(f"[CREEM WEBHOOK] Игнорируем событие: {event_type}")
        return {"status": "ok", "message": f"Event {event_type} ignored"}

    obj = data.get("object", {})
    checkout_id = obj.get("id", "")
    metadata = obj.get("metadata", {})
    order = obj.get("order", {})
    order_status = order.get("status", "")

    logger.info(
        f"[CREEM WEBHOOK] checkout_id={checkout_id}, "
        f"order_status={order_status}, metadata={metadata}"
    )

    if order_status != "paid":
        logger.info(f"[CREEM WEBHOOK] Заказ не оплачен: {order_status}")
        return {"status": "ok", "message": f"Order status: {order_status}"}

    # --- Получаем user_id и plan из metadata ---
    user_id_str = metadata.get("user_id")
    plan = metadata.get("plan", "premium")

    if not user_id_str:
        # Попробуем из subscription.metadata
        sub_meta = obj.get("subscription", {}).get("metadata", {})
        user_id_str = sub_meta.get("user_id")

    if not user_id_str:
        logger.error(f"[CREEM WEBHOOK] user_id не найден в metadata: {metadata}")
        raise HTTPException(status_code=400, detail="user_id не найден в metadata")

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.error(f"[CREEM WEBHOOK] Неверный user_id: {user_id_str}")
        raise HTTPException(status_code=400, detail=f"Неверный user_id: {user_id_str}")

    # --- Идемпотентность ---
    existing = await db.execute(
        select(PaymentTransaction).where(PaymentTransaction.operation_id == checkout_id)
    )
    transaction = existing.scalars().first()

    if transaction and transaction.processed:
        logger.info(f"[CREEM WEBHOOK] Уже обработан: checkout_id={checkout_id}")
        return {"status": "ok", "message": "Already processed"}

    # --- Создаём транзакцию если нет ---
    if not transaction:
        amount_val = order.get("amount", 0)
        currency = order.get("currency", "USD")
        transaction = PaymentTransaction(
            operation_id=checkout_id,
            payment_type="subscription",
            user_id=user_id,
            amount=str(amount_val / 100),  # Creem хранит в центах
            currency=currency,
            label=f"creem_subscription",
            subscription_type=plan,
            months=1,
            processed=False,
        )
        db.add(transaction)
        await db.flush()
        logger.info(
            f"[CREEM WEBHOOK] Создана транзакция: checkout_id={checkout_id}, "
            f"user_id={user_id}, plan={plan}"
        )

    # --- Активируем подписку ---
    try:
        from app.services.profit_activate import ProfitActivateService
        service = ProfitActivateService(db)

        sub = await service.activate_subscription(user_id, plan, months=1)
        logger.info(
            f"[CREEM WEBHOOK] ✅ Подписка активирована: user_id={user_id}, plan={plan}"
        )

        transaction.processed = True
        transaction.processed_at = datetime.utcnow()
        await db.commit()

        return {"status": "ok", "type": "subscription", "plan": plan, "user_id": user_id}

    except Exception as e:
        logger.error(f"[CREEM WEBHOOK] Ошибка активации подписки: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/creem-activate-test")
async def creem_activate_test(
    current_user: Users = Depends(get_current_user),
    plan: str = Query(default="premium", description="'standard' или 'premium'"),
    db: AsyncSession = Depends(get_db),
):
    """
    [ADMIN ONLY] Вручную активирует подписку — для проверки без реального вебхука.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только для администраторов")

    if plan not in ("standard", "premium"):
        raise HTTPException(status_code=400, detail="plan должен быть 'standard' или 'premium'")

    try:
        from app.services.profit_activate import ProfitActivateService
        service = ProfitActivateService(db)
        await service.activate_subscription(current_user.id, plan, months=1)
        await db.commit()
        logger.info(
            f"[CREEM TEST ACTIVATE] ✅ Подписка активирована вручную: "
            f"user_id={current_user.id}, plan={plan}"
        )
        return {"status": "ok", "plan": plan, "user_id": current_user.id}
    except Exception as e:
        logger.error(f"[CREEM TEST ACTIVATE] Ошибка: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
