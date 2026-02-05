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
@router.post("/quickpay/notify/")  # Поддержка обоих вариантов (с слэшем и без) для Nginx/proxy
async def youmoney_quickpay_notify(request: Request):
	"""
	YooMoney QuickPay HTTP-notification endpoint.
	Верифицируем sha1_hash и, если всё ок, активируем подписку пользователю из label.
	label формат: "plan:<standard|premium>;uid:<userId>"
	Документация: вычисление sha1 от
	notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label
	"""
	# Логируем заголовки запроса для проверки Nginx/proxy
	logging.info("[YOUMONEY NOTIFY] ===== ВХОДЯЩЕЕ УВЕДОМЛЕНИЕ =====")
	logging.info("[YOUMONEY NOTIFY] Метод: %s, URL: %s, Path: %s", request.method, request.url, request.url.path)
	logging.info("[YOUMONEY NOTIFY] Заголовки запроса:")
	for header_name, header_value in request.headers.items():
		if header_name.lower() in ['x-forwarded-for', 'x-real-ip', 'x-forwarded-proto', 'host', 'content-type']:
			logging.info("[YOUMONEY NOTIFY]   %s: %s", header_name, header_value)
	
	# Логируем всю входящую форму для отладки
	form = await request.form()
	form_dict = dict(form)
	logging.info("[YOUMONEY NOTIFY] Полная форма (все поля): %s", {k: v for k, v in form_dict.items()})
	logging.info("[YOUMONEY NOTIFY] Количество полей в форме: %d", len(form_dict))
	logging.info("[YOUMONEY NOTIFY] Ключи формы: %s", list(form_dict.keys()))
	
	# Проверяем, является ли это тестовым уведомлением
	is_test_notification = form_dict.get("test_notification", "").lower() == "true"
	if is_test_notification:
		logging.info("[YOUMONEY NOTIFY] ⚠️ Это ТЕСТОВОЕ уведомление от YooMoney")
		logging.info("[YOUMONEY NOTIFY] Тестовые уведомления не содержат реальных данных о платеже")
		logging.info("[YOUMONEY NOTIFY] Возвращаем успешный ответ для проверки подключения")
		return {"ok": True, "test": True, "message": "Test notification received successfully"}
	
	# Извлекаем данные точно в том виде, как пришли от YooMoney
	# ВАЖНО: не преобразуем типы до проверки хеша!
	data = {}
	for key in ["notification_type", "operation_id", "amount", "currency", "datetime", "sender", "codepro", "label", "sha1_hash"]:
		value = form.get(key)
		# Сохраняем как строку, даже если пустое
		data[key] = str(value) if value is not None else ""
	
	logging.info("[YOUMONEY NOTIFY] Извлеченные данные (без sha1_hash): %s", {k: data[k] for k in data if k != "sha1_hash"})
	logging.info("[YOUMONEY NOTIFY] sha1_hash (первые 8 символов): %s...", (data["sha1_hash"] or "")[:8] if data["sha1_hash"] else "отсутствует")
	logging.info("[YOUMONEY NOTIFY] Типы данных: amount=%s (type: %s), codepro=%s (type: %s)", 
		data["amount"], type(data["amount"]).__name__, data["codepro"], type(data["codepro"]).__name__)
	
	try:
		cfg = get_youm_config()
		logging.info("[YOUMONEY NOTIFY] Конфигурация загружена: min_standard=%s, min_premium=%s, secret_set=%s", 
			cfg.get("min_standard"), cfg.get("min_premium"), bool(cfg.get("notification_secret")))
	except ValueError as err:
		logging.error("[YOUMONEY NOTIFY] config error: %s", err)
		raise HTTPException(status_code=500, detail=str(err))
	
	# Секрет может быть пустым (если в кошельке не задан). Тогда подпись считается с пустой строкой.
	secret = cfg.get("notification_secret") or ""
	# Если секрет задан у нас, но sha1_hash не пришёл — отклоняем.
	if secret and not data["sha1_hash"]:
		logging.warning("[YOUMONEY NOTIFY] missing sha1_hash while secret configured")
		raise HTTPException(status_code=400, detail="missing sha1_hash")

	# Формируем строку для проверки подписи
	# КРИТИЧНО: Порядок полей строго по документации YooMoney:
	# notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label
	# ВАЖНО: 
	# - amount используется в исходном виде (строка с точкой, как пришла от YooMoney)
	# - codepro используется как строка ('true'/'false'), НЕ преобразуем в bool!
	# - Все поля используются как строки, без преобразований
	
	check_str_parts = [
		data["notification_type"],
		data["operation_id"],
		data["amount"],  # ИСХОДНЫЙ ВИД - строка с точкой, не округляем!
		data["currency"],
		data["datetime"],
		data["sender"],
		data["codepro"],  # СТРОКА 'true'/'false', не bool!
		secret,
		data["label"]
	]
	
	check_str = "&".join(check_str_parts)
	
	# Логируем check_str БЕЗ секрета для отладки (заменяем секрет на "***")
	check_str_for_log_parts = check_str_parts.copy()
	check_str_for_log_parts[7] = "***" if secret else ""  # Заменяем секрет на ***
	check_str_for_log = "&".join(check_str_for_log_parts)
	
	logging.info("[YOUMONEY NOTIFY] Строка для проверки подписи (без секрета): %s", check_str_for_log)
	logging.info("[YOUMONEY NOTIFY] Длина check_str: %d символов", len(check_str))
	logging.info("[YOUMONEY NOTIFY] Поля для хеша:")
	logging.info("[YOUMONEY NOTIFY]   1. notification_type: '%s'", data["notification_type"])
	logging.info("[YOUMONEY NOTIFY]   2. operation_id: '%s'", data["operation_id"])
	logging.info("[YOUMONEY NOTIFY]   3. amount: '%s' (исходный вид)", data["amount"])
	logging.info("[YOUMONEY NOTIFY]   4. currency: '%s'", data["currency"])
	logging.info("[YOUMONEY NOTIFY]   5. datetime: '%s'", data["datetime"])
	logging.info("[YOUMONEY NOTIFY]   6. sender: '%s'", data["sender"])
	logging.info("[YOUMONEY NOTIFY]   7. codepro: '%s' (строка, не bool!)", data["codepro"])
	logging.info("[YOUMONEY NOTIFY]   8. notification_secret: '%s'", "***" if secret else "(пусто)")
	logging.info("[YOUMONEY NOTIFY]   9. label: '%s'", data["label"])
	
	digest = hashlib.sha1(check_str.encode("utf-8")).hexdigest()
	logging.info("[YOUMONEY NOTIFY] Вычисленный hash: %s", digest.lower())
	logging.info("[YOUMONEY NOTIFY] Полученный hash: %s", (data["sha1_hash"] or "").lower())
	
	if digest.lower() != (data["sha1_hash"] or "").lower():
		logging.error("[YOUMONEY NOTIFY] ❌ НЕВЕРНАЯ ПОДПИСЬ!")
		logging.error("[YOUMONEY NOTIFY] Ожидалось: %s", digest.lower())
		logging.error("[YOUMONEY NOTIFY] Получено: %s", (data["sha1_hash"] or "").lower())
		logging.error("[YOUMONEY NOTIFY] Проверьте:")
		logging.error("[YOUMONEY NOTIFY]   - Порядок полей в check_str")
		logging.error("[YOUMONEY NOTIFY]   - Формат amount (должен быть исходный, с точкой)")
		logging.error("[YOUMONEY NOTIFY]   - codepro должен быть строкой ('true'/'false'), не bool")
		logging.error("[YOUMONEY NOTIFY]   - Наличие и значение notification_secret")
		logging.error("[YOUMONEY NOTIFY]   - Кодировка строки (UTF-8)")
		raise HTTPException(status_code=400, detail="invalid sha1 signature")
	
	logging.info("[YOUMONEY NOTIFY] ✅ Подпись проверена успешно - хеши совпадают")

	# Отсекаем защищённые платежи
	# ВАЖНО: codepro приходит как строка 'true'/'false', проверяем как строку
	codepro_value = str(data.get("codepro", "")).lower()
	logging.info("[YOUMONEY NOTIFY] Проверка codepro: значение='%s' (тип: %s)", codepro_value, type(data.get("codepro")).__name__)
	if codepro_value == "true":
		logging.warning("[YOUMONEY NOTIFY] codepro=true not accepted - защищенный платеж отклонен")
		raise HTTPException(status_code=400, detail="codepro payments are not accepted")

	label = data["label"] or ""
	logging.info("[YOUMONEY NOTIFY] Парсинг label: '%s'", label)
	
	plan = "standard"
	user_id = None
	payment_type = "subscription"  # По умолчанию подписка
	package_id = None
	months = 1  # По умолчанию 1 месяц
	
	# ожидаем "plan:premium;uid:37" или "type:topup;package:small;uid:37" или "plan:premium;uid:37;months:3"
	# Улучшенный парсинг с обработкой ошибок
	parse_errors = []
	try:
		if not label:
			parse_errors.append("label пустой")
		else:
			parts = [p.strip() for p in label.split(";")]
			logging.info("[YOUMONEY NOTIFY] Части label после split: %s", parts)
			
			for p in parts:
				if not p:
					continue
				try:
					if p.startswith("plan:"):
						plan = p.split(":", 1)[1].strip().lower()
						logging.info("[YOUMONEY NOTIFY] Найден plan: %s", plan)
					elif p.startswith("type:"):
						payment_type = p.split(":", 1)[1].strip().lower()
						logging.info("[YOUMONEY NOTIFY] Найден type: %s", payment_type)
					elif p.startswith("package:"):
						package_id = p.split(":", 1)[1].strip().lower()
						logging.info("[YOUMONEY NOTIFY] Найден package: %s", package_id)
					elif p.startswith("uid:"):
						uid_str = p.split(":", 1)[1].strip()
						try:
							user_id = int(uid_str)
							logging.info("[YOUMONEY NOTIFY] Найден uid: %s", user_id)
						except ValueError:
							parse_errors.append(f"uid не является числом: '{uid_str}'")
					elif p.startswith("months:"):
						months_str = p.split(":", 1)[1].strip()
						try:
							months = int(months_str)
							logging.info("[YOUMONEY NOTIFY] Найден months: %s", months)
						except ValueError:
							parse_errors.append(f"months не является числом: '{months_str}'")
					else:
						logging.warning("[YOUMONEY NOTIFY] Неизвестная часть label: '%s'", p)
				except Exception as e:
					parse_errors.append(f"Ошибка парсинга части '{p}': {e}")
	except Exception as e:
		parse_errors.append(f"Критическая ошибка парсинга label: {e}")
		logging.error("[YOUMONEY NOTIFY] Ошибка парсинга label: %s", e, exc_info=True)
	
	if parse_errors:
		logging.warning("[YOUMONEY NOTIFY] Ошибки парсинга label: %s", parse_errors)
	
	if not user_id:
		logging.error("[YOUMONEY NOTIFY] ❌ user_id не найден в label!")
		logging.error("[YOUMONEY NOTIFY] label: '%s'", label)
		logging.error("[YOUMONEY NOTIFY] Распарсенные значения: plan=%s, payment_type=%s, package_id=%s, user_id=%s", 
			plan, payment_type, package_id, user_id)
		if parse_errors:
			logging.error("[YOUMONEY NOTIFY] Ошибки парсинга: %s", parse_errors)
		raise HTTPException(status_code=400, detail=f"user id not found in label: '{label}'")
	
	logging.info("[YOUMONEY NOTIFY] ✅ Label распарсен: plan=%s, user_id=%s, payment_type=%s, package_id=%s, months=%s", 
		plan, user_id, payment_type, package_id, months)

	# Проверяем сумму с улучшенным логированием
	amount_raw = data["amount"]
	logging.info("[YOUMONEY NOTIFY] Сумма (raw): '%s'", amount_raw)
	try:
		# YooMoney может отправлять amount с точкой или запятой
		amount_normalized = amount_raw.replace(",", ".")
		amount_val = float(amount_normalized)
		logging.info("[YOUMONEY NOTIFY] Сумма (parsed): %s", amount_val)
	except Exception as e:
		logging.error("[YOUMONEY NOTIFY] ❌ Ошибка парсинга суммы: '%s', ошибка: %s", amount_raw, e)
		amount_val = 0.0
	
	# Проверяем идемпотентность: не обрабатывали ли мы уже этот платеж?
	from sqlalchemy.ext.asyncio import AsyncSession
	from app.database.db import async_session_maker
	from app.services.profit_activate import ProfitActivateService
	from app.config.credit_packages import get_credit_package
	from app.models.payment_transaction import PaymentTransaction
	from sqlalchemy import select
	
	logging.info("[YOUMONEY NOTIFY] Подключение к БД для проверки идемпотентности...")
	async with async_session_maker() as db:  # type: AsyncSession
		logging.info("[YOUMONEY NOTIFY] Сессия БД создана")
		
		# Проверяем, не обрабатывали ли мы уже этот operation_id
		logging.info("[YOUMONEY NOTIFY] Поиск существующей транзакции: operation_id=%s", data["operation_id"])
		try:
			existing_transaction = await db.execute(
				select(PaymentTransaction).where(PaymentTransaction.operation_id == data["operation_id"])
			)
			transaction = existing_transaction.scalars().first()
			
			if transaction:
				logging.info("[YOUMONEY NOTIFY] Транзакция найдена: id=%s, processed=%s, user_id=%s", 
					transaction.id if hasattr(transaction, 'id') else 'N/A', 
					transaction.processed, 
					transaction.user_id)
				
				if transaction.processed:
					# Платеж уже обработан - возвращаем успешный ответ (идемпотентность)
					logging.info("[YOUMONEY NOTIFY] ✅ Дубликат платежа (уже обработан): operation_id=%s", data["operation_id"])
					return {"ok": True, "user_id": transaction.user_id, "duplicate": True, "message": "Payment already processed"}
				else:
					# Транзакция существует, но не обработана - возможно, была ошибка
					logging.warning("[YOUMONEY NOTIFY] ⚠️ Транзакция существует, но не обработана: operation_id=%s", data["operation_id"])
					logging.warning("[YOUMONEY NOTIFY] Повторная попытка обработки...")
					# Продолжаем обработку ниже
			else:
				# Создаем новую запись о транзакции (еще не обработана)
				logging.info("[YOUMONEY NOTIFY] Новая транзакция, создаем запись...")
				transaction = PaymentTransaction(
					operation_id=data["operation_id"],
					payment_type=payment_type,
					user_id=user_id,
					amount=data["amount"],
					currency=data.get("currency", "RUB"),
					label=label,
					package_id=package_id,
					subscription_type=plan,
					months=months,
					processed=False
				)
				db.add(transaction)
				await db.flush()  # Сохраняем транзакцию перед обработкой
				logging.info("[YOUMONEY NOTIFY] ✅ Транзакция создана и сохранена (flush)")
		except Exception as e:
			logging.error("[YOUMONEY NOTIFY] ❌ Ошибка при работе с БД (проверка идемпотентности): %s", e, exc_info=True)
			await db.rollback()
			raise
		
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
				# Учитываем комиссию карты: принимаем платежи, если сумма >= 95% от минимальной
				# (комиссия обычно 3-5%, поэтому допускаем отклонение до 5%)
				min_amount_with_commission = min_amount * 0.95
				
				logging.info("[YOUMONEY NOTIFY] Проверка суммы: amount_val=%s, min_amount=%s, min_with_commission=%s, plan=%s", 
					amount_val, min_amount, min_amount_with_commission, plan)
				logging.info("[YOUMONEY NOTIFY] Разница от минимума: %s, разница от минимума с комиссией: %s", 
					amount_val - min_amount, amount_val - min_amount_with_commission)
				
				if amount_val + 1e-6 < min_amount_with_commission:
					logging.error("[YOUMONEY NOTIFY] ❌ Сумма слишком мала!")
					logging.error("[YOUMONEY NOTIFY] Получено: %s, минимум: %s, минимум с учетом комиссии (95%%): %s, разница: %s", 
						amount_val, min_amount, min_amount_with_commission, amount_val - min_amount_with_commission)
					logging.error("[YOUMONEY NOTIFY] Возможно, комиссия карты слишком большая или сумма некорректна.")
					raise HTTPException(status_code=400, detail=f"amount too low ({amount_val} < {min_amount_with_commission})")

			logging.info("[YOUMONEY NOTIFY] ✅ Сумма проверена успешно")
			logging.info("[YOUMONEY NOTIFY] Активация подписки: user_id=%s plan=%s amount=%s", user_id, plan, amount_val)
			
			# Проверяем, что plan соответствует стандартным тарифам из config
			valid_plans = ["standard", "premium"]
			if plan.lower() not in valid_plans:
				logging.error("[YOUMONEY NOTIFY] ❌ Неподдерживаемый план: %s (ожидается: %s)", plan, valid_plans)
				raise HTTPException(status_code=400, detail=f"Unsupported plan: {plan}")
			
			logging.info("[YOUMONEY NOTIFY] План валиден, вызываем service.activate_subscription...")
			logging.info("[YOUMONEY NOTIFY] Параметры активации: user_id=%s, plan=%s, amount=%s", user_id, plan, amount_val)
			
			try:
				# КРИТИЧНО: Помечаем транзакцию как обработанную ДО активации подписки
				# Это гарантирует атомарность: если активация не удастся, транзакция все равно будет помечена
				# Но мы проверим успешность активации после commit
				logging.info("[YOUMONEY NOTIFY] Вызов service.activate_subscription(user_id=%s, plan=%s, months=%s)...", user_id, plan, months)
				
				# Активируем подписку (внутри делается commit)
				sub = await service.activate_subscription(user_id, plan, months=months)
				
				if not sub:
					raise ValueError("activate_subscription вернул None - подписка не была создана")
				
				logging.info("[YOUMONEY NOTIFY] ✅ Подписка активирована: user_id=%s plan=%s subscription_id=%s", 
					user_id, plan, sub.id if sub else None)
				
				# Проверяем состояние подписки после активации
				logging.info("[YOUMONEY NOTIFY] Проверка подписки после активации:")
				logging.info("[YOUMONEY NOTIFY]   - subscription_id: %s", sub.id)
				logging.info("[YOUMONEY NOTIFY]   - subscription_type: %s", sub.subscription_type.value if hasattr(sub, 'subscription_type') else 'N/A')
				logging.info("[YOUMONEY NOTIFY]   - status: %s", sub.status.value if hasattr(sub, 'status') else 'N/A')
				logging.info("[YOUMONEY NOTIFY]   - is_active: %s", sub.is_active if hasattr(sub, 'is_active') else 'N/A')
				logging.info("[YOUMONEY NOTIFY]   - expires_at: %s", sub.expires_at if hasattr(sub, 'expires_at') else 'N/A')
				
				# КРИТИЧНО: Проверяем, что подписка действительно активна
				if hasattr(sub, 'is_active') and not sub.is_active:
					logging.error("[YOUMONEY NOTIFY] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка создана, но is_active=False!")
					raise ValueError("Подписка создана, но не активна")
				
				if hasattr(sub, 'status') and sub.status.value != 'active':
					logging.error("[YOUMONEY NOTIFY] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка создана, но status != active! status=%s", sub.status.value)
					raise ValueError(f"Подписка создана, но статус не активен: {sub.status.value}")
				
				# Проверяем тип подписки
				if hasattr(sub, 'subscription_type'):
					actual_type = sub.subscription_type.value.lower()
					expected_type = plan.lower()
					if actual_type != expected_type:
						logging.error("[YOUMONEY NOTIFY] ❌ КРИТИЧЕСКАЯ ОШИБКА: Тип подписки не совпадает! Ожидалось: %s, Получено: %s", 
							expected_type, actual_type)
						raise ValueError(f"Тип подписки не совпадает: ожидалось {expected_type}, получено {actual_type}")
				
				logging.info("[YOUMONEY NOTIFY] ✅ Все проверки пройдены - подписка активирована корректно")
				
				# После успешной активации помечаем транзакцию как обработанную
				# ВАЖНО: activate_subscription уже сделал commit, поэтому transaction может быть detached
				# Нужно перезагрузить транзакцию из БД или обновить в текущей сессии
				logging.info("[YOUMONEY NOTIFY] Помечаем транзакцию как обработанную...")
				
				# Перезагружаем транзакцию из БД, чтобы убедиться, что она в актуальном состоянии
				await db.refresh(transaction)
				
				transaction.processed = True
				transaction.processed_at = datetime.utcnow()
				
				await db.commit()
				logging.info("[YOUMONEY NOTIFY] ✅ Транзакция помечена как обработанная: operation_id=%s", data["operation_id"])
				
				# Финальная проверка состояния подписки из БД
				from app.services.profit_activate import ProfitActivateService
				final_check_service = ProfitActivateService(db)
				final_subscription = await final_check_service.get_user_subscription(user_id)
				
				if final_subscription:
					logging.info("[YOUMONEY NOTIFY] Финальная проверка подписки из БД:")
					logging.info("[YOUMONEY NOTIFY]   - subscription_type: %s", final_subscription.subscription_type.value)
					logging.info("[YOUMONEY NOTIFY]   - status: %s", final_subscription.status.value)
					logging.info("[YOUMONEY NOTIFY]   - is_active: %s", final_subscription.is_active)
					logging.info("[YOUMONEY NOTIFY]   - expires_at: %s", final_subscription.expires_at)
				else:
					logging.error("[YOUMONEY NOTIFY] ❌ КРИТИЧЕСКАЯ ОШИБКА: Подписка не найдена в БД после активации!")
					raise ValueError("Подписка не найдена в БД после активации")
				
			except Exception as e:
				logging.error("[YOUMONEY NOTIFY] ❌ Ошибка активации подписки: %s", e, exc_info=True)
				logging.error("[YOUMONEY NOTIFY] Тип ошибки: %s", type(e).__name__)
				logging.error("[YOUMONEY NOTIFY] Сообщение: %s", str(e))
				import traceback
				logging.error("[YOUMONEY NOTIFY] Traceback: %s", traceback.format_exc())
				# При ошибке транзакция остается необработанной, что позволит повторить попытку
				raise
			
			logging.info("[YOUMONEY NOTIFY] ===== ПЛАТЕЖ УСПЕШНО ОБРАБОТАН =====")
			logging.info("[YOUMONEY NOTIFY] user_id=%s, plan=%s, operation_id=%s", user_id, plan, data["operation_id"])
			return {"ok": True, "user_id": user_id, "plan": plan}
		except Exception as e:
			# В случае ошибки не помечаем транзакцию как обработанную
			# Это позволит повторить обработку при повторном запросе от YooMoney
			import traceback
			logging.error("[YOUMONEY NOTIFY] ===== ОШИБКА ОБРАБОТКИ ПЛАТЕЖА =====")
			logging.error("[YOUMONEY NOTIFY] Тип ошибки: %s", type(e).__name__)
			logging.error("[YOUMONEY NOTIFY] Сообщение: %s", str(e))
			logging.error("[YOUMONEY NOTIFY] Traceback: %s", traceback.format_exc())
			logging.error("[YOUMONEY NOTIFY] Данные платежа:")
			logging.error("[YOUMONEY NOTIFY]   - operation_id: %s", data.get("operation_id"))
			logging.error("[YOUMONEY NOTIFY]   - user_id: %s", user_id)
			logging.error("[YOUMONEY NOTIFY]   - payment_type: %s", payment_type)
			logging.error("[YOUMONEY NOTIFY]   - plan: %s", plan)
			logging.error("[YOUMONEY NOTIFY]   - amount_val: %s", amount_val)
			logging.error("[YOUMONEY NOTIFY]   - label: %s", label)
			
			# Проверяем состояние транзакции перед rollback
			if transaction:
				logging.error("[YOUMONEY NOTIFY] Состояние транзакции ДО rollback:")
				logging.error("[YOUMONEY NOTIFY]   - processed: %s", transaction.processed)
				logging.error("[YOUMONEY NOTIFY]   - operation_id: %s", transaction.operation_id)
			
			try:
				await db.rollback()
				logging.info("[YOUMONEY NOTIFY] ✅ Rollback выполнен успешно")
				logging.info("[YOUMONEY NOTIFY] Транзакция НЕ помечена как обработанная - YooMoney сможет повторить запрос")
			except Exception as rollback_error:
				logging.error("[YOUMONEY NOTIFY] ❌ Ошибка при rollback: %s", rollback_error)
			
			# Проверяем состояние транзакции после rollback
			if transaction:
				logging.error("[YOUMONEY NOTIFY] Состояние транзакции ПОСЛЕ rollback:")
				logging.error("[YOUMONEY NOTIFY]   - processed: %s", getattr(transaction, 'processed', 'N/A'))
				logging.error("[YOUMONEY NOTIFY]   - operation_id: %s", getattr(transaction, 'operation_id', 'N/A'))
			
			logging.error("[YOUMONEY NOTIFY] =========================================")
			raise


@router.get("/callback")
async def youmoney_callback():
	"""
	Redirect URI для YooMoney QuickPay.
	Пользователь перенаправляется сюда после успешной оплаты.
	"""
	from fastapi.responses import RedirectResponse
	# Редиректим на главную страницу с параметром успешной оплаты
	return RedirectResponse(url="/?payment=success", status_code=302)


@router.get("/test")
async def test_endpoint():
	"""
	Простой тестовый эндпоинт для проверки доступности.
	"""
	return {
		"status": "ok",
		"message": "Эндпоинт YooMoney доступен",
		"notification_url": "https://cherrylust.art/api/v1/youmoney/quickpay/notify",
		"check_logs": "Проверьте логи на наличие записей [YOUMONEY NOTIFY] после оплаты"
	}


@router.post("/test-post")
async def test_post_endpoint(request: Request):
	"""
	Тестовый POST-эндпоинт для проверки, что POST-запросы доходят до сервера.
	"""
	logging.info("[YOUMONEY TEST] ===== ТЕСТОВЫЙ POST-ЗАПРОС =====")
	logging.info("[YOUMONEY TEST] Метод: %s, URL: %s", request.method, request.url)
	logging.info("[YOUMONEY TEST] Заголовки: %s", dict(request.headers))
	
	try:
		form = await request.form()
		form_dict = dict(form)
		logging.info("[YOUMONEY TEST] Форма: %s", form_dict)
	except Exception as e:
		logging.info("[YOUMONEY TEST] Ошибка чтения формы: %s", e)
		body = await request.body()
		logging.info("[YOUMONEY TEST] Тело запроса: %s", body.decode('utf-8', errors='ignore'))
	
	return {
		"status": "ok",
		"message": "POST-запрос успешно получен",
		"method": request.method,
		"url": str(request.url),
		"headers": dict(request.headers)
	}


