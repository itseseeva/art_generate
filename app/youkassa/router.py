from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import httpx
from .config import get_kassa_config

router = APIRouter(prefix="/api/v1/kassa", tags=["yookassa"])


class CreateKassaPaymentRequest(BaseModel):
	amount: float = Field(..., gt=0, description="Сумма в RUB")
	description: str = Field(..., min_length=3, max_length=255)
	plan: str | None = None  # 'standard' | 'premium' | ...


class CreateKassaPaymentResponse(BaseModel):
	id: str
	status: str
	confirmation_url: str


@router.post("/create_payment/", response_model=CreateKassaPaymentResponse)
def create_kassa_payment(payload: CreateKassaPaymentRequest) -> CreateKassaPaymentResponse:
	try:
		cfg = get_kassa_config()
	except ValueError as err:
		raise HTTPException(status_code=500, detail=str(err))

	req_body = {
		"amount": {
			"value": f"{payload.amount:.2f}",
			"currency": cfg["currency"],
		},
		"confirmation": {
			"type": "redirect",
			"return_url": cfg["return_url"],
		},
		"capture": cfg["capture"],
		"description": payload.description,
		"payment_method_data": {
			"type": "yoo_money"  # откроет страницу /checkout/payments/... с выбором кошелька/карт
		},
	}

	headers = {
		"Idempotence-Key": "kassa-" + payload.description.replace(" ", "-")
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
		raise HTTPException(status_code=502, detail=f"YooKassa request error: {ex}")

	if resp.status_code not in (200, 201):
		try:
			err_json = resp.json()
		except Exception:
			err_json = {"detail": resp.text}
		raise HTTPException(status_code=resp.status_code, detail=err_json)

	data = resp.json()
	conf = data.get("confirmation") or {}
	conf_url = conf.get("confirmation_url")
	if not conf_url:
		raise HTTPException(status_code=500, detail="No confirmation_url in YooKassa response")

	return CreateKassaPaymentResponse(
		id=data.get("id", ""),
		status=data.get("status", ""),
		confirmation_url=conf_url,
	)


