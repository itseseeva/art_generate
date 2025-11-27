#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Основной файл приложения FastAPI для генерации изображений и чат-бота.
"""

import sys
from pathlib import Path
import asyncio
from datetime import datetime
import time
import logging
import traceback
from contextlib import asynccontextmanager

# Устанавливаем правильную кодировку для работы с Unicode
import locale
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Настройка кодировки для Windows
if sys.platform == "win32":
    import codecs
    # Устанавливаем UTF-8 как кодировку по умолчанию
    try:
        locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
    except:
        try:
            locale.setlocale(locale.LC_ALL, 'C.UTF-8')
        except:
            pass
    
    # Устанавливаем переменные окружения для правильной кодировки
    os.environ['LC_ALL'] = 'en_US.UTF-8'
    os.environ['LANG'] = 'en_US.UTF-8'
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Устанавливаем кодировку по умолчанию для всех операций
    import locale
    locale.getpreferredencoding = lambda: 'utf-8'
    
    # НЕ перенаправляем stdout и stderr, чтобы не конфликтовать с логированием
    # sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    # sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# Устанавливаем рабочую директорию ПЕРЕД импортами
import os
project_root = Path(__file__).parent.parent
os.chdir(str(project_root))

# Добавляем корневую директорию проекта в PYTHONPATH
app_root = Path(__file__).parent

# Добавляем оба пути для надежности
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(app_root))

# Проверяем и исправляем импорты
try:
    import pydantic
    print(f"[OK] Pydantic version: {pydantic.__version__}")
except ImportError as e:
    print(f"[ERROR] Pydantic import error: {e}")
    sys.exit(1)

import jwt

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, Response, StreamingResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
import uvicorn
from pydantic import BaseModel, Field
from typing import Optional
from httpx import HTTPStatusError

# Импорты для генерации изображений
from app.chat_bot.add_character import get_character_data
# FaceRefinementService импортируется лениво внутри функции, т.к. требует torch
from app.schemas.generation import GenerationSettings
from app.config.settings import settings

# Импорты моделей для Alembic
from app.models.chat_history import ChatHistory

# Схема для запроса генерации изображений
class ImageGenerationRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    use_default_prompts: bool = True
    seed: Optional[int] = None
    steps: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    cfg_scale: Optional[float] = None
    sampler_name: Optional[str] = None
    character: Optional[str] = None
    user_id: Optional[int] = None  # ID пользователя для проверки подписки

# Настраиваем логирование с правильной кодировкой
# Создаем папку для логов только при необходимости (не блокируем импорт)
try:
    os.makedirs('logs', exist_ok=True)
except Exception:
    pass  # Игнорируем ошибки создания папки при импорте

try:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/app.log', encoding='utf-8')
        ],
        force=True  # Принудительно перезаписываем конфигурацию
    )
except Exception:
    # Если не удалось настроить логирование в файл, используем только консоль
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True
    )

logger = logging.getLogger(__name__)



async def sync_characters_to_db():
    """Синхронизация персонажей теперь не нужна - используем character_importer."""
    logger.info("[INFO] Синхронизация персонажей отключена - используйте character_importer")
    logger.info("[NOTE] Для обновления персонажей используйте: python update_character.py")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    logger.info("[START] Запуск приложения...")
    
    # Логируем информацию о модели при запуске (не блокируем запуск)
    # Переносим в фоновую задачу в отдельном потоке, чтобы не блокировать event loop
    def check_model_sync():
        """Синхронная проверка модели в отдельном потоке"""
        try:
            import sys
            from pathlib import Path
            
            # Проверяем, что __file__ существует
            if not __file__:
                logger.warning("[WARNING] Не удалось определить путь к модулю")
                return
            
            webui_path = Path(__file__).parent.parent / "stable-diffusion-webui"
            if webui_path and webui_path.exists():
                sys.path.insert(0, str(webui_path))
                from model_config import get_model_info, check_model_files
                model_info = get_model_info()
                model_available = check_model_files()
                
                if model_info and model_available:
                    logger.info(f"[TARGET] Загружена модель: {model_info['name']} ({model_info['size_mb']} MB)")
                    if model_info.get("vae_name"):
                        logger.info(f"[ART] VAE: {model_info['vae_name']}")
                    else:
                        logger.info("[ART] VAE: Встроенный")
                else:
                    logger.warning("[WARNING] Модель не найдена или недоступна")
            else:
                logger.warning("[WARNING] Путь к stable-diffusion-webui не найден")
        except ImportError:
            # Модуль model_config не найден - это нормально, если stable-diffusion-webui не установлен
            pass
        except Exception as e:
            logger.warning(f"[WARNING] Не удалось получить информацию о модели: {e}")
    
    # Запускаем проверку модели в отдельном потоке, чтобы не блокировать startup
    try:
        import concurrent.futures
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, check_model_sync)
    except Exception as e:
        logger.warning(f"[WARNING] Ошибка запуска проверки модели: {e}")
    
    # Синхронизация персонажей отключена - используем character_importer
    logger.info("[INFO] Синхронизация персонажей отключена - используйте character_importer")
    
    # Инициализируем Redis кэш (не блокируем запуск приложения)
    # Redis будет подключен при первом использовании, если доступен
    logger.info("[INFO] Redis кэш будет инициализирован при первом использовании")
    
    logger.info("🎉 Приложение готово к работе!")
    logger.info("[INFO] Сервер должен быть готов принимать соединения")
    yield
    logger.info("[INFO] Lifespan завершается...")
    
    # Завершение работы приложения
    logger.info("🛑 Останавливаем приложение...")
    
    # Закрываем соединение с Redis
    try:
        from app.utils.redis_cache import close_redis_client
        await close_redis_client()
        logger.info("[OK] Redis соединение закрыто")
    except Exception as e:
        logger.warning(f"[WARNING] Ошибка закрытия Redis: {e}")
    
    logger.info("[OK] Приложение остановлено")

# Создаем приложение с lifespan
app = FastAPI(
    title="Stable Diffusion API",
    description="API для генерации изображений с помощью Stable Diffusion",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Событие startup удалено - синхронизация персонажей отключена

# КРИТИЧЕСКИ ВАЖНО: Простой тестовый эндпоинт БЕЗ зависимостей ДО всех middleware
# Это поможет проверить, работает ли FastAPI вообще
@app.get("/test-ping-simple")
async def test_ping_simple():
    """Максимально простой эндпоинт для проверки работы сервера."""
    logger.info("[TEST] /test-ping-simple called")
    return {"status": "ok", "message": "Server is alive"}

# Middleware для логирования всех запросов (для диагностики)
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """Логирует все входящие запросы для диагностики."""
    logger.info(f"[REQUEST] {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"[RESPONSE] {request.method} {request.url.path} -> {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"[ERROR] {request.method} {request.url.path} -> {e}")
        raise

# Настройка сессий для OAuth (должен быть ПЕРВЫМ, до CORS)
app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.SECRET_KEY,
    max_age=3600 * 24  # 24 часа
)

# Настройка CORS
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для правильной обработки Unicode
@app.middleware("http")
async def unicode_middleware(request: Request, call_next):
    """Middleware для правильной обработки Unicode в запросах."""
    # Просто пропускаем запрос дальше без блокирующих операций
    response = await call_next(request)
    return response

# Простой тестовый эндпоинт БЕЗ зависимостей для проверки работы сервера
@app.get("/api/v1/test-ping")
async def test_ping():
    """Простой тестовый эндпоинт для проверки работы сервера."""
    return {"status": "ok", "message": "API is responding"}

# Обработчик ошибок для Unicode
@app.exception_handler(UnicodeEncodeError)
async def unicode_encode_handler(request: Request, exc: UnicodeEncodeError):
    """Обработчик ошибок кодировки Unicode."""
    logger.error(f"Unicode encoding error: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": f"Unicode encoding error: {str(exc)}"}
    )

@app.exception_handler(UnicodeDecodeError)
async def unicode_decode_handler(request: Request, exc: UnicodeDecodeError):
    """Обработчик ошибок декодировки Unicode."""
    logger.error(f"Unicode decoding error: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": f"Unicode decoding error: {str(exc)}"}
    )

# Статические файлы не нужны

# Папка для изображений не нужны

# Монтируем платную галерею как статику
try:
    repo_root = Path(__file__).resolve().parents[1]
    paid_gallery_dir = repo_root / "paid_gallery"
    if paid_gallery_dir.exists():
        app.mount("/paid_gallery", StaticFiles(directory=str(paid_gallery_dir), html=True), name="paid_gallery")
        logger.info(f"[OK] Смонтирована платная галерея: {paid_gallery_dir}")
    else:
        logger.warning(f"Папка платной галереи не найдена: {paid_gallery_dir}")
    
    # Монтируем статические файлы для аватаров (не блокируем запуск)
    try:
        avatars_dir = project_root / "avatars"
        avatars_dir.mkdir(exist_ok=True)
        app.mount("/avatars", StaticFiles(directory=str(avatars_dir), html=False), name="avatars")
        logger.info(f"[OK] Смонтирована папка аватаров: {avatars_dir}")
    except Exception as e:
        logger.warning(f"[WARNING] Не удалось смонтировать папку аватаров: {e}")
except Exception as e:
    logger.error(f"Ошибка монтирования платной галереи: {e}")

# Подключаем роутеры аутентификации
try:
    from app.auth.routers import auth_router
    logger.info(f"[DEBUG] auth_router импортирован, routes: {len(auth_router.routes)}")
    app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
    logger.info("[OK] auth_router подключен")
    # Проверяем, что /auth/me/ подключен
    me_routes = [r for r in app.routes if hasattr(r, 'path') and '/auth/me' in str(r.path)]
    if me_routes:
        logger.info(f"[DEBUG] /auth/me/ найден: {[r.path for r in me_routes]}")
    else:
        logger.warning(f"[WARNING] /auth/me/ НЕ найден в app routes!")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения auth_router: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем OAuth роутер БЕЗ префикса /api/v1 (как было раньше)
try:
    from app.auth.oauth_routers import oauth_router
    app.include_router(oauth_router, tags=["oauth"])
    logger.info("[OK] oauth_router подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения oauth_router: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Роутер generation удален - используется только /api/v1/generate-image/ в main.py

try:
    logger.info("🔄 Импортируем chat_router...")
    from app.chat_bot.api.chat_endpoints import router as chat_router
    logger.info("[OK] chat_router импортирован успешно")
    
    logger.info("🔄 Импортируем character_router...")
    from app.chat_bot.api.character_endpoints import router as character_router
    logger.info("[OK] character_router импортирован успешно")
    
    logger.info("🔄 Подключаем chat_router...")
    app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
    logger.info("[OK] chat_router подключен")
    
    logger.info("🔄 Подключаем character_router...")
    app.include_router(character_router, prefix="/api/v1/characters", tags=["characters"])
    logger.info("[OK] character_router подключен")
    
    # Подключаем новые роутеры для системы персонажей
    # logger.info("🔄 Импортируем новые роутеры персонажей...")
    # from app.chat_bot.add_character import character_router as new_character_router
    # from app.chat_bot.add_character import universal_chat_router
    # logger.info("[OK] Новые роутеры импортированы")
    
    # logger.info("🔄 Подключаем new_character_router...")
    # app.include_router(new_character_router)
    # logger.info("[OK] new_character_router подключен")
    
    # logger.info("🔄 Подключаем universal_chat_router...")
    # app.include_router(universal_chat_router)
    # logger.info("[OK] universal_chat_router подключен")
    
    logger.info("[OK] Роутеры chat и character подключены")

except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутеров chat/character: {e}")
    logger.error(f"Тип ошибки: {type(e).__name__}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер подписок (исправленная версия)
try:
    logger.info("🔄 Импортируем profit_activate_router...")
    from app.api.endpoints.profit_activate_endpoints import router as profit_activate_router
    logger.info("[OK] profit_activate_router импортирован успешно")
    
    logger.info("🔄 Подключаем profit_activate_router...")
    app.include_router(profit_activate_router, prefix="/api/v1/profit", tags=["profit"])
    logger.info("[OK] profit_activate_router подключен")
    
    logger.info("[OK] Роутер подписок (исправленный) подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера подписок: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем старый роутер подписок для обратной совместимости
try:
    logger.info("🔄 Импортируем subscription_router...")
    from app.api.endpoints.subscription_endpoints import router as subscription_router
    logger.info("[OK] subscription_router импортирован успешно")
    
    logger.info("🔄 Подключаем subscription_router...")
    app.include_router(subscription_router, prefix="/api/v1/subscription", tags=["subscription"])
    logger.info("[OK] subscription_router подключен")
    
    logger.info("[OK] Роутер подписок (старый) подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения старого роутера подписок: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Добавляем эндпоинты напрямую в main.py для немедленного использования
from fastapi import Depends, HTTPException, status
from app.auth.dependencies import (
    get_current_user,
    get_current_user_optional,
    SECRET_KEY,
    ALGORITHM,
)
from app.models.user import Users
from app.services.profit_activate import (
    ProfitActivateService,
    register_profile_listener,
    unregister_profile_listener,
    collect_profile_snapshot,
    emit_profile_update,
)
from app.services.coins_service import CoinsService
from app.schemas.subscription import SubscriptionActivateRequest, SubscriptionActivateResponse, SubscriptionStatsResponse
from app.database.db_depends import get_db
from app.database.db import async_session_maker
from sqlalchemy.ext.asyncio import AsyncSession

@app.post("/api/v1/profit/activate/", response_model=SubscriptionActivateResponse)
async def activate_subscription_direct(
    request: SubscriptionActivateRequest,
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Активирует подписку для пользователя (прямой эндпоинт)."""
    try:
        service = ProfitActivateService(db)
        
        if request.subscription_type.lower() not in ["standard", "premium"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только подписки типа 'standard' и 'premium'"
            )
        
        subscription = await service.activate_subscription(current_user.id, request.subscription_type)
        
        if request.subscription_type.lower() == "standard":
            message = "Подписка Standard активирована! 1000 кредитов, 100 генераций фото и возможность создавать персонажей!"
        else:  # premium
            message = "Подписка Premium активирована! 5000 кредитов, 300 генераций фото и приоритет в очереди!"
        
        return SubscriptionActivateResponse(
            success=True,
            message=message,
            subscription=SubscriptionStatsResponse(
                subscription_type=subscription.subscription_type.value,
                status=subscription.status.value,
                monthly_credits=subscription.monthly_credits,
                monthly_photos=subscription.monthly_photos,
                used_credits=subscription.used_credits,
                used_photos=subscription.used_photos,
                credits_remaining=subscription.credits_remaining,
                photos_remaining=subscription.photos_remaining,
                days_left=subscription.days_until_expiry,
                is_active=subscription.is_active,
                expires_at=subscription.expires_at,
                last_reset_at=subscription.last_reset_at
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка активации подписки: {str(e)}"
        )

@app.get("/api/v1/profit/stats/")
async def get_subscription_stats_direct(
    current_user: Users = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получает статистику подписки пользователя (прямой эндпоинт)."""
    try:
        service = ProfitActivateService(db)
        stats = await service.get_subscription_stats(current_user.id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статистики подписки: {str(e)}"
        )


@app.websocket("/api/v1/profile/ws")
async def profile_updates_ws(websocket: WebSocket):
    """WebSocket для трансляции обновлений профиля пользователя в реальном времени."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise ValueError("Отсутствует идентификатор пользователя")
    except Exception as exc:
        logger.warning("[PROFILE WS] Ошибка декодирования токена: %s", exc)
        await websocket.close(code=1008)
        return

    try:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        async with async_session_maker() as db:
            result = await db.execute(
                select(Users)
                .options(selectinload(Users.subscription))
                .where(Users.email == email)
            )
            user = result.scalar_one_or_none()
            if not user:
                await websocket.close(code=1008)
                return

            user_id = user.id
            snapshot = await collect_profile_snapshot(user_id, db)

        await websocket.accept()
        queue = await register_profile_listener(user_id)
        try:
            await websocket.send_json(snapshot)

            while True:
                update = await queue.get()
                await websocket.send_json(update)
        except WebSocketDisconnect:
            logger.info("[PROFILE WS] Соединение закрыто пользователем %s", user_id)
        except Exception as exc:
            logger.error("[PROFILE WS] Ошибка обработки соединения: %s", exc)
        finally:
            await unregister_profile_listener(user_id, queue)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        logger.error("[PROFILE WS] Ошибка инициализации: %s", exc)
        await websocket.close(code=1011)

# Подключаем роутер платной галереи (отдельно от других роутеров)
try:
    from app.routers.gallery import router as gallery_router
    app.include_router(gallery_router)
    logger.info("[OK] Роутер paid-gallery подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера gallery: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер фотографий персонажей
try:
    from app.api.endpoints.photos_endpoints import router as photos_router
    app.include_router(photos_router)
    logger.info("[OK] Роутер фотографий персонажей подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера фотографий: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем интеграцию YouMoney
try:
    from app.youmoney.router import router as youmoney_router  # type: ignore
    app.include_router(youmoney_router)
    logger.info("[OK] Роутер YouMoney подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера YouMoney: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем интеграцию YooKassa (Checkout)
try:
    from app.youkassa.router import router as yookassa_router  # type: ignore
    app.include_router(yookassa_router)
    logger.info("[OK] Роутер YooKassa подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера YooKassa: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер истории чата
try:
    logger.info("🔄 Подключаем роутер истории чата...")
    try:
        from app.chat_history.api.endpoints import router as chat_history_router
        logger.info(f"[DEBUG] Роутер импортирован: {chat_history_router}")
        logger.info(f"[DEBUG] Роутер routes: {[r.path for r in chat_history_router.routes]}")
        app.include_router(chat_history_router, prefix="/api/v1/chat-history", tags=["chat-history"])
        logger.info("[OK] chat_history_router подключен из app.chat_history.api.endpoints")
    except ImportError as e:
        logger.warning(f"[WARNING] Не удалось импортировать из app.chat_history.api.endpoints: {e}")
        # Fallback на старый путь
        from app.api.endpoints.chat_history import router as chat_history_router
        app.include_router(chat_history_router, prefix="/api/v1/chat-history", tags=["chat-history"])
        logger.info("[OK] chat_history_router подключен из app.api.endpoints.chat_history (fallback)")
    
    logger.info("[OK] Роутер истории чата подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера истории чата: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Логируем все зарегистрированные роуты для отладки
logger.info("=== Registered Routes ===")
for route in app.routes:
    path = getattr(route, "path", "unknown")
    methods = ",".join(getattr(route, "methods", [])) if hasattr(route, "methods") else "no methods"
    logger.info(f"Route: {path} [{methods}]")
logger.info("========================")

# Подключаем тестовый роутер для llama-cpp-python (если существует)
try:
    logger.info("🔄 Подключаем тестовый роутер...")
    from app.chat_bot.api.test_endpoints import router as test_router
    app.include_router(test_router, prefix="/api/v1/test", tags=["test"])
    logger.info("[OK] test_router подключен")
    logger.info("[OK] Тестовый роутер подключен")
except ImportError:
    # Модуль не существует - это нормально, просто пропускаем
    logger.debug("[DEBUG] Тестовый роутер не найден, пропускаем")
except Exception as e:
    logger.warning(f"[WARNING] Ошибка подключения тестового роутера: {e}")

# Обработчики ошибок
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    error_msg = f"Validation error: {exc.errors()}"
    logger.error(error_msg)
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"""
Error occurred at {datetime.now()}
Request: {request.url}
Method: {request.method}
Error Type: {type(exc).__name__}
Error Message: {str(exc)}
Traceback:
{traceback.format_exc()}
"""
    logger.error(error_msg)
    
    status_code = 500
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
    
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": str(exc),
            "type": type(exc).__name__
        }
    )

@app.get("/")
async def root():
    """Главная страница - перенаправление на фронтенд."""
    return RedirectResponse(url="/frontend/")

@app.get("/docs_app")
async def docs_app():
    """Перенаправление на документацию."""
    return RedirectResponse(url="/docs")

@app.get("/robots.txt")
async def robots_txt():
    """Robots.txt файл."""
    robots_content = """User-agent: *
Disallow: /api/
Disallow: /docs/
Disallow: /redoc/
Allow: /frontend/
"""
    return Response(content=robots_content, media_type="text/plain")

@app.get("/favicon.ico")
async def favicon():
    """Favicon - возвращаем пустой ответ."""
    return Response(content="", media_type="image/x-icon")

@app.get("/chat")
async def chat_page():
    """Страница чата - перенаправление на фронтенд."""
    return RedirectResponse(url="/frontend/")

@app.get("/health")
async def health():
    """Проверка здоровья основного приложения."""
    try:
        # Получаем информацию о модели
        try:
            import sys
            from pathlib import Path
            webui_path = Path(__file__).parent.parent / "stable-diffusion-webui"
            sys.path.insert(0, str(webui_path))
            from model_config import get_model_info, check_model_files
            model_info = get_model_info()
            model_available = check_model_files()
        except Exception as e:
            logger.warning(f"Не удалось получить информацию о модели: {e}")
            model_info = None
            model_available = False
        
        # Общий статус приложения
        app_status = {
            "app": "Stable Diffusion API",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "model": {
                "name": model_info["name"] if model_info else "Unknown",
                "size_mb": model_info["size_mb"] if model_info else 0,
                "available": model_available,
                "vae": model_info["vae_name"] if model_info and model_info["vae_name"] else "Built-in"
            },
            "services": {}
        }
        
        # Логируем информацию о модели
        if model_info:
            logger.info(f"[TARGET] Активная модель: {model_info['name']} ({model_info['size_mb']} MB)")
            if model_info["vae_name"]:
                logger.info(f"[ART] VAE: {model_info['vae_name']}")
            else:
                logger.info("[ART] VAE: Встроенный")
        else:
            logger.warning("[WARNING] Информация о модели недоступна")
        
        return app_status
        
    except Exception as e:
        logger.error(f"Ошибка проверки здоровья приложения: {e}")
        return {
            "app": "Stable Diffusion API",
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/v1/models/")
async def get_available_models():
    """Получить список доступных моделей."""
    return [
        {
            "id": "L3-DARKEST-PLANET-16.5B",
            "name": "L3-DARKEST-PLANET-16.5B",
            "description": "L3-DARKEST-PLANET оптимизирован для 4096 контекст - лучшая производительность для 16.5B модели"
        },
        {
            "id": "MythoMax-L2-13B",
            "name": "MythoMax L2 13B", 
            "description": "Модель для творческих задач и диалогов"
        }
    ]

@app.get("/api/v1/generation-settings/")
async def get_generation_settings():
    """Получить настройки генерации по умолчанию."""
    try:
        from app.config.generation_defaults import get_generation_params, get_fallback_values
        settings = get_generation_params("default")
        fallback_values = get_fallback_values()
        
        # Возвращаем только основные настройки для фронтенда
        return {
            "steps": settings.get("steps", fallback_values["steps"]),
            "width": settings.get("width", fallback_values["width"]),
            "height": settings.get("height", fallback_values["height"]),
            "cfg_scale": settings.get("cfg_scale", fallback_values["cfg_scale"]),
            "sampler_name": settings.get("sampler_name", fallback_values["sampler_name"]),
            "negative_prompt": fallback_values["negative_prompt"]
        }
    except Exception as e:
        logger.error(f"Ошибка получения настроек генерации: {e}")
        # Возвращаем значения по умолчанию в случае ошибки
        try:
            from app.config.generation_defaults import get_fallback_values
            return get_fallback_values()
        except Exception as fallback_error:
            logger.error(f"Ошибка получения fallback значений: {fallback_error}")
            # Последний резерв - используем default_prompts.py
            try:
                from app.config.default_prompts import get_default_negative_prompts
                from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
                return {
                    "steps": DEFAULT_GENERATION_PARAMS.get("steps"),
                    "width": DEFAULT_GENERATION_PARAMS.get("width"),
                    "height": DEFAULT_GENERATION_PARAMS.get("height"),
                    "cfg_scale": DEFAULT_GENERATION_PARAMS.get("cfg_scale"),
                    "sampler_name": DEFAULT_GENERATION_PARAMS.get("sampler_name", "Euler"),
                    "negative_prompt": get_default_negative_prompts()
                }
            except Exception as final_error:
                logger.error(f"Критическая ошибка загрузки промптов: {final_error}")
                # Последний резерв - минимальные значения
                return {
                    "steps": None,
                    "width": None,
                    "height": None,
                    "cfg_scale": None,
                    "sampler_name": None,
                    "negative_prompt": None
                }

@app.get("/api/v1/fallback-settings/")
async def get_fallback_settings():
    """Получить fallback настройки из generation_defaults.py."""
    try:
        from app.config.generation_defaults import get_fallback_values
        return get_fallback_values()
    except Exception as e:
        logger.error(f"Ошибка получения fallback настроек: {e}")
        # Последний резерв - используем default_prompts.py
        try:
            from app.config.default_prompts import get_default_negative_prompts
            from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
            return {
                "steps": DEFAULT_GENERATION_PARAMS.get("steps"),
                "width": DEFAULT_GENERATION_PARAMS.get("width"),
                "height": DEFAULT_GENERATION_PARAMS.get("height"),
                "cfg_scale": DEFAULT_GENERATION_PARAMS.get("cfg_scale"),
                "sampler_name": DEFAULT_GENERATION_PARAMS.get("sampler_name", "Euler"),
                "negative_prompt": get_default_negative_prompts()
            }
        except Exception as final_error:
            logger.error(f"Критическая ошибка загрузки промптов: {final_error}")
            # Последний резерв - минимальные значения
            return {
                "steps": None,
                "width": None,
                "height": None,
                "cfg_scale": None,
                "sampler_name": None,
                "negative_prompt": None
            }

@app.get("/api/v1/prompts/")
async def get_prompts():
    """Получить промпты из default_prompts.py."""
    try:
        from app.config.generation_defaults import get_prompts_from_defaults
        return get_prompts_from_defaults()
    except Exception as e:
        logger.error(f"Ошибка получения промптов: {e}")
        # Последний резерв - минимальные значения
        return {
            "positive_prompt": None,
            "negative_prompt": None
        }

@app.get("/api/v1/characters/")
async def fallback_characters():
    """Fallback endpoint для персонажей если основной API недоступен с кэшированием."""
    try:
        from app.utils.redis_cache import (
            cache_get, cache_set, key_characters_list, TTL_CHARACTERS_LIST
        )
        
        cache_key = key_characters_list()
        
        # Пытаемся получить из кэша
        cached_characters = await cache_get(cache_key)
        if cached_characters is not None:
            logger.info(f"Загружено персонажей из кэша: {len(cached_characters)}")
            return cached_characters
        
        from app.database.db import async_session_maker
        from app.chat_bot.models.models import CharacterDB
        from sqlalchemy import select
        from app.chat_bot.utils.character_importer import CharacterImporter

        try:
            async with async_session_maker() as db:
                result = await db.execute(
                    select(CharacterDB).order_by(CharacterDB.name)
                )
                characters = result.scalars().all()

                if characters:
                    logger.info(f"Загружено персонажей из БД: {len(characters)}")
                    characters_list = [
                        {
                            "id": char.id,
                            "name": char.name,
                            "display_name": char.display_name,
                            "description": char.description,
                            "prompt": char.prompt,
                            "character_appearance": char.character_appearance,
                            "location": char.location,
                            "user_id": char.user_id,
                            "main_photos": char.main_photos,
                            "is_nsfw": char.is_nsfw
                        }
                        for char in characters
                    ]
                    # Сохраняем в кэш
                    await cache_set(cache_key, characters_list, ttl_seconds=TTL_CHARACTERS_LIST)
                    return characters_list
                logger.warning("База данных вернула пустой список персонажей, используем fallback из файлов")
        except Exception as session_error:
            logger.error(f"Не удалось открыть сессию БД: {session_error}")

        importer = CharacterImporter()
        fallback_characters = []
        for name in importer.list_available_characters():
            character_data = importer.load_character_from_file(name)
            if not character_data:
                continue

            fallback_characters.append({
                "id": f"file-{name}",
                "name": character_data.get("name", name),
                "display_name": character_data.get("display_name") or character_data.get("name", name),
                "description": character_data.get("description") or character_data.get("character_appearance", ""),
                "prompt": character_data.get("prompt", ""),
                "character_appearance": character_data.get("character_appearance", ""),
                "location": character_data.get("location", ""),
                "user_id": None,
                "main_photos": None,
                "is_nsfw": True
            })

        if not fallback_characters:
            logger.warning("Fallback из файлов не дал результатов, возвращаем встроенный список персонажей.")
            fallback_characters = [
                {
                    "id": "default-anna",
                    "name": "Anna",
                    "display_name": "Anna",
                    "description": "Вежливый помощник с позитивным характером.",
                    "prompt": "",
                    "character_appearance": "Friendly assistant",
                    "location": "Virtual lounge",
                    "user_id": None,
                    "main_photos": None,
                    "is_nsfw": True
                },
                {
                    "id": "default-caitlin",
                    "name": "Caitlin",
                    "display_name": "Caitlin",
                    "description": "Энергичная блогерша, которая любит общение.",
                    "prompt": "",
                    "character_appearance": "Energetic vlogger",
                    "location": "Studio apartment",
                    "user_id": None,
                    "main_photos": None,
                    "is_nsfw": True
                }
            ]

        logger.info(f"Загружено fallback персонажей: {len(fallback_characters)}")
        # Сохраняем в кэш
        await cache_set(cache_key, fallback_characters, ttl_seconds=TTL_CHARACTERS_LIST)
        return fallback_characters
    except Exception as e:
        logger.error(f"Критическая ошибка загрузки персонажей: {e}")
        return []

@app.get("/api/characters/")
async def legacy_characters_redirect(request: Request):
    """Legacy endpoint для совместимости с фронтендом."""
    try:
        from app.chat_bot.utils.character_importer import character_importer
        from app.database.db import async_session_maker
        from app.chat_bot.models.models import CharacterDB
        from sqlalchemy import select
        
        async with async_session_maker() as db:
            result = await db.execute(
                select(CharacterDB).order_by(CharacterDB.name)
            )
            characters = result.scalars().all()
            
            # Преобразуем в формат, ожидаемый фронтендом (новая схема Alpaca)
            character_list = []
            for char in characters:
                character_list.append({
                    "id": char.id,
                    "name": char.name,
                    "display_name": char.display_name,
                    "description": char.description,
                    "prompt": char.prompt,
                    "character_appearance": char.character_appearance,
                    "location": char.location,
                    "user_id": char.user_id,
                    "main_photos": char.main_photos  # Добавляем поле с главными фотографиями
                })
            
            logger.info(f"Загружено персонажей: {len(character_list)}")
            return character_list
    except Exception as e:
        logger.error(f"Ошибка загрузки персонажей: {e}")
        return []

@app.post("/api/chat/")
async def legacy_chat_redirect(request: Request):
    return RedirectResponse(url="/api/v1/chat/")


async def _write_chat_history(
    user_id: Optional[str],
    character_data: Optional[dict],
    message: str,
    response: str,
    image_url: Optional[str],
    image_filename: Optional[str]
) -> None:
    """Сохраняет историю чата в базу данных."""
    if not user_id:
        logger.debug("[HISTORY] Пропуск сохранения: user_id отсутствует")
        return

    if not character_data:
        logger.debug("[HISTORY] Пропуск сохранения: character_data отсутствует")
        return

    character_id = character_data.get("id")
    character_name = character_data.get("name")
    if not character_name:
        logger.debug("[HISTORY] Пропуск сохранения: character_name отсутствует")
        return

    from sqlalchemy import select
    from app.chat_bot.models.models import ChatSession, ChatMessageDB, CharacterDB

    async with async_session_maker() as db:
        db_user_id = str(user_id)
        resolved_character_id = character_id
        
        # Преобразуем user_id в int для ChatHistory
        try:
            if isinstance(user_id, str):
                user_id_int = int(user_id) if user_id else None
            elif isinstance(user_id, int):
                user_id_int = user_id
            else:
                user_id_int = None
        except (ValueError, TypeError) as e:
            logger.warning(f"[HISTORY] Не удалось преобразовать user_id в int: {user_id}, ошибка: {e}")
            user_id_int = None

        # Если character_id отсутствует, пробуем найти его по имени в БД
        if not resolved_character_id:
            character_result = await db.execute(
                select(CharacterDB.id).where(CharacterDB.name.ilike(character_name))
            )
            resolved_character_id = character_result.scalar_one_or_none()
            if not resolved_character_id:
                logger.debug("[HISTORY] Пропуск сохранения: character '%s' не найден в БД", character_name)
                return

        session_query = await db.execute(
            select(ChatSession)
            .where(
                ChatSession.character_id == resolved_character_id,
                ChatSession.user_id == db_user_id,
            )
            .order_by(ChatSession.started_at.desc())
            .limit(1)
        )
        chat_session = session_query.scalar_one_or_none()

        if not chat_session:
            chat_session = ChatSession(
                character_id=resolved_character_id,
                user_id=db_user_id,
                started_at=datetime.now(),
            )
            db.add(chat_session)
            await db.commit()
            await db.refresh(chat_session)

        user_record = ChatMessageDB(
            session_id=chat_session.id,
            role="user",
            content=message,
            timestamp=datetime.now(),
        )
        db.add(user_record)

        assistant_content = response
        if image_url:
            assistant_content = f"{assistant_content}\n\n[image:{image_url}]"
        elif image_filename:
            assistant_content = f"{assistant_content}\n\n[image:{image_filename}]"

        assistant_record = ChatMessageDB(
            session_id=chat_session.id,
            role="assistant",
            content=assistant_content,
            timestamp=datetime.now(),
        )
        db.add(assistant_record)

        # Также сохраняем в ChatHistory для истории чата
        # Сохраняем все сообщения (с фото и без)
        if user_id_int:
            try:
                # Сохраняем промпт пользователя
                user_chat_history = ChatHistory(
                    user_id=user_id_int,
                    character_name=character_name,
                    session_id=str(chat_session.id),
                    message_type="user",
                    message_content=message,  # Промпт пользователя
                    image_url=image_url,
                    image_filename=image_filename
                )
                db.add(user_chat_history)
                
                # Также сохраняем ответ ассистента
                assistant_chat_history = ChatHistory(
                    user_id=user_id_int,
                    character_name=character_name,
                    session_id=str(chat_session.id),
                    message_type="assistant",
                    message_content=response,
                    image_url=image_url,
                    image_filename=image_filename
                )
                db.add(assistant_chat_history)
                
                await db.commit()
                
                logger.debug(
                    "[HISTORY] Сообщения сохранены в ChatHistory (user_id=%s, character=%s, has_image=%s)",
                    user_id_int,
                    character_name,
                    bool(image_url or image_filename)
                )
            except Exception as chat_history_error:
                logger.error(f"[HISTORY] Ошибка сохранения в ChatHistory: {chat_history_error}")
                import traceback
                logger.error(f"[HISTORY] Трейсбек: {traceback.format_exc()}")
                await db.rollback()

        await db.commit()
        logger.info(
            "[HISTORY] Сообщения сохранены (session_id=%s, user_id=%s)",
            chat_session.id,
            db_user_id,
        )


async def process_chat_history_storage(
    subscription_type: Optional[str],
    user_id: Optional[str],
    character_data: Optional[dict],
    message: str,
    response: str,
    image_url: Optional[str],
    image_filename: Optional[str]
) -> None:
    """Определяет, нужно ли сохранять историю чата, и выполняет сохранение."""
    try:
        await _write_chat_history(
            user_id=user_id,
            character_data=character_data,
            message=message,
            response=response,
            image_url=image_url,
            image_filename=image_filename,
        )
    except Exception as history_error:
        logger.error(f"[ERROR] Не удалось сохранить историю чата: {history_error}")


async def spend_photo_resources(user_id: int) -> None:
    """Списывает монеты и лимит подписки за генерацию фото."""
    async with async_session_maker() as db:
        coins_service = CoinsService(db)
        subscription_service = ProfitActivateService(db)

        if not await coins_service.can_user_afford(user_id, 30):
            raise HTTPException(
                status_code=403,
                detail="Недостаточно монет для генерации изображения. Нужно 30 монет."
            )

        if not await subscription_service.can_user_generate_photo(user_id):
            raise HTTPException(
                status_code=403,
                detail="Достигнут лимит генераций фото в подписке."
            )

        try:
            coins_spent = await coins_service.spend_coins(user_id, 30, commit=False)
            if not coins_spent:
                raise HTTPException(
                    status_code=403,
                    detail="Не удалось списать монеты за генерацию изображения."
                )

            photo_spent = await subscription_service.use_photo_generation(user_id, commit=False)
            if not photo_spent:
                raise HTTPException(
                    status_code=403,
                    detail="Недостаточно лимита подписки для генерации изображения."
                )

            await db.commit()
            await emit_profile_update(user_id, db)

            coins_left = await coins_service.get_user_coins(user_id)
            logger.info(
                "[OK] Потрачено 30 монет и лимит фото для пользователя %s. Осталось монет: %s",
                user_id,
                coins_left,
            )
        except HTTPException as exc:
            await db.rollback()
            raise exc
        except Exception as exc:
            await db.rollback()
            logger.exception("[ERROR] Ошибка списания ресурсов за генерацию фото")
            raise HTTPException(
                status_code=500,
                detail="Не удалось списать ресурсы за генерацию изображения. Повторите попытку."
            )

@app.post("/chat")
async def chat_endpoint(
    request: dict,
    current_user: Users = Depends(get_current_user_optional),
):
    """
    Простой эндпоинт для чата - прямой ответ от модели без пост-обработки.
    """
    try:
        logger.info("[NOTE] /chat: Простой режим - прямой ответ от модели")
        
        # Импортируем необходимые модули
        from app.chat_bot.services.textgen_webui_service import textgen_webui_service
        from app.chat_bot.config.chat_config import chat_config
        from app.config.generation_defaults import get_generation_params
        from app.services.profit_activate import ProfitActivateService
        from app.database.db import async_session_maker
        import json
        
        # Проверяем подключение к text-generation-webui (только если не подключены)
        if not textgen_webui_service.is_connected:
            if not await textgen_webui_service.check_connection():
                raise HTTPException(
                    status_code=503, 
                    detail="text-generation-webui недоступен. Запустите сервер text-generation-webui."
                )
        
        # Простая валидация запроса
        message = request.get("message", "").strip()
        character_name = request.get("character", "anna")  # По умолчанию Anna
        
        # Валидируем имя персонажа
        from app.utils.character_validation import validate_character_name
        is_valid, error_message = validate_character_name(character_name)
        
        if not is_valid:
            raise HTTPException(
                status_code=400, 
                detail=f"Некорректное имя персонажа: {error_message}"
            )
        
        if not message:
            raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")
        
        history = request.get("history", [])
        session_id = request.get("session_id", "default")
        
        # ОПТИМИЗИРОВАНО: Объединяем все запросы к БД в один блок
        token_user_id = str(current_user.id) if current_user else None
        body_user_id = request.get("user_id")
        user_id = str(body_user_id) if body_user_id is not None else None
        if token_user_id is not None:
            user_id = token_user_id
        logger.info(f"[DEBUG] /chat: effective user_id for history = {user_id}")

        def parse_int_user_id(value: Optional[str]) -> Optional[int]:
            if value is None:
                return None
            try:
                return int(value)
            except (TypeError, ValueError):
                logger.error(f"[ERROR] Некорректный user_id (ожидали int): {value}")
                return None
        coins_user_id = parse_int_user_id(user_id)
        character_data = None
        user_subscription_type: Optional[str] = None
        use_credits = False  # Флаг: использовать кредиты подписки (True) или монеты (False)
        
        async with async_session_maker() as db:
            # 1. Проверяем возможность отправки сообщения (если авторизован)
            use_credits = False  # Флаг: использовать кредиты подписки или монеты
            if user_id:
                logger.info(f"[DEBUG] Проверка ресурсов для пользователя {user_id}")
                if coins_user_id is None:
                    raise HTTPException(status_code=400, detail="Некорректный идентификатор пользователя")
                
                subscription_service = ProfitActivateService(db)
                subscription = await subscription_service.get_user_subscription(coins_user_id)
                user_subscription_type = subscription.subscription_type.value if subscription else None
                
                # Сначала проверяем кредиты подписки (приоритет)
                can_use_subscription_credits = await subscription_service.can_user_send_message(
                    coins_user_id,
                    len(message)
                )
                
                if can_use_subscription_credits:
                    use_credits = True  # Используем кредиты подписки
                    logger.info(
                        "[OK] Подписка пользователя %s позволяет отправить сообщение (тип: %s, кредиты: %s/%s)",
                        user_id,
                        user_subscription_type or "неизвестно",
                        subscription.used_credits if subscription else 0,
                        subscription.monthly_credits if subscription else 0,
                    )
                else:
                    # Если кредиты подписки закончились, проверяем монеты (fallback)
                    from app.services.coins_service import CoinsService
                    coins_service = CoinsService(db)
                    can_send_message = await coins_service.can_user_send_message(coins_user_id)
                    
                    if not can_send_message:
                        coins = await coins_service.get_user_coins(coins_user_id)
                        logger.error(
                            "[ERROR] Недостаточно ресурсов! У пользователя %s: %s монет (нужно 2), кредиты: %s/%s",
                            user_id,
                            coins or 0,
                            subscription.used_credits if subscription else 0,
                            subscription.monthly_credits if subscription else 0,
                        )
                        raise HTTPException(
                            status_code=403, 
                            detail="Недостаточно кредитов подписки или монет для отправки сообщения! Нужно 2 кредита или 2 монеты."
                        )
                    use_credits = False  # Используем монеты
                    logger.info(f"[OK] Пользователь {user_id} может отправить сообщение за счет монет")
            else:
                user_subscription_type = None
            
            # 2. Получаем данные персонажа из базы данных
            try:
                from app.chat_bot.models.models import CharacterDB
                from sqlalchemy import select
                
                result = await db.execute(
                    select(CharacterDB).where(CharacterDB.name.ilike(character_name))
                )
                db_character = result.scalar_one_or_none()
                
                if db_character:
                    character_data = {
                        "name": db_character.name,
                        "prompt": db_character.prompt,
                        "id": db_character.id
                    }
                    logger.info(f"[OK] Данные персонажа '{character_name}' получены из БД")
                else:
                    # Fallback к файлам
                    character_data = get_character_data(character_name)
                    if character_data:
                        logger.info(f"[OK] Fallback: данные персонажа '{character_name}' получены из файлов")
                    else:
                        logger.error(f"[ERROR] Персонаж '{character_name}' не найден ни в БД, ни в файлах")
                        raise HTTPException(
                            status_code=404, 
                            detail=f"Персонаж '{character_name}' не найден"
                        )
            except Exception as e:
                logger.error(f"[ERROR] Ошибка получения данных персонажа: {e}")
                # Fallback к файлам
                character_data = get_character_data(character_name)
                if not character_data:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Персонаж '{character_name}' не найден"
                    )
        
        # Специальная обработка для "continue the story"
        is_continue_story = message.lower().strip() == "continue the story briefly"
        
        if is_continue_story:
            logger.info(f"📖 Continue the story briefly - продолжаем историю кратко")
        else:
            logger.info(f"[START] Генерируем ответ для: {message[:50]}...")
        
        # Строим простой промпт в формате Alpaca (ОПТИМИЗИРОВАНО)
        if history:
            # Строим историю в формате Alpaca (только последние 5 сообщений для скорости)
            history_text = ""
            for msg in history[-5:]:  # Уменьшено до 5 сообщений для быстрой обработки
                if msg.get('role') == 'user':
                    user_content = msg.get('content', '')[:200]  # Ограничиваем длину сообщений
                    history_text += f"### Instruction:\n{user_content}\n\n### Response:\n"
                elif msg.get('role') == 'assistant':
                    history_text += f"{msg.get('content', '')[:300]}\n\n"  # Ограничиваем длину ответов
            
            # Строим промпт
            full_prompt = character_data["prompt"] + "\n\n" + history_text
        else:
            # Если истории нет
            if is_continue_story:
                full_prompt = character_data["prompt"] + f"\n\n### Instruction:\ncontinue the story briefly.\n\n### Response:\n"
            else:
                full_prompt = character_data["prompt"] + f"\n\n### Instruction:\n{message}\n\n### Response:\n"
        
        # Генерируем ответ напрямую от модели (ОПТИМИЗИРОВАНО ДЛЯ СКОРОСТИ)
        response = await textgen_webui_service.generate_text(
            prompt=full_prompt,
            max_tokens=min(chat_config.HARD_MAX_TOKENS, 150),  # Ограничиваем до 150 токенов для скорости
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            top_k=chat_config.DEFAULT_TOP_K,
            min_p=chat_config.DEFAULT_MIN_P,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY
        )
        
        if not response:
            raise HTTPException(
                status_code=500, 
                detail="Не удалось сгенерировать ответ от модели"
            )
        
        logger.info(f"[OK] /chat: Ответ сгенерирован ({len(response)} символов)")
        
        # Списываем ресурсы после успешной генерации ответа
        if user_id and coins_user_id is not None:
            async with async_session_maker() as db:
                if use_credits:
                    # Списываем кредиты подписки
                    subscription_service = ProfitActivateService(db)
                    credits_spent = await subscription_service.use_message_credits(coins_user_id)
                    
                    if not credits_spent:
                        logger.error(
                            "[ERROR] Не удалось списать кредиты подписки за сообщение для пользователя %s",
                            user_id,
                        )
                        raise HTTPException(
                            status_code=500,
                            detail="Не удалось списать кредиты подписки за сообщение. Повторите попытку.",
                        )
                    logger.info(
                        "[OK] Списаны кредиты подписки за сообщение пользователя %s",
                        user_id,
                    )
                else:
                    # Списываем монеты (fallback)
                    from app.services.coins_service import CoinsService
                    coins_service = CoinsService(db)
                    coins_spent = await coins_service.spend_coins_for_message(coins_user_id)
                    
                    if not coins_spent:
                        logger.error(
                            "[ERROR] Не удалось списать монеты за сообщение для пользователя %s",
                            user_id,
                        )
                        raise HTTPException(
                            status_code=500,
                            detail="Не удалось списать монеты за сообщение. Повторите попытку.",
                        )
                    logger.info(
                        "[OK] Списаны монеты за сообщение пользователя %s",
                        user_id,
                    )
        
        # Проверяем, нужно ли генерировать изображение
        generate_image = request.get("generate_image", False)
        image_url = None
        image_filename = None
        cloud_url = None
        
        if generate_image:
            try:
                logger.info("[ART] Генерируем изображение для чата...")
                
                # Проверяем, может ли пользователь генерировать фото
                if user_id:
                    logger.info(f"[DEBUG] DEBUG: Проверка монет для генерации фото пользователя {user_id}")
                    if coins_user_id is None:
                        raise HTTPException(status_code=400, detail="Некорректный идентификатор пользователя")
                    async with async_session_maker() as db:
                        from app.services.coins_service import CoinsService
                        coins_service = CoinsService(db)
                        can_generate_photo = await coins_service.can_user_generate_photo(coins_user_id)
                        logger.info(f"[DEBUG] DEBUG: Может генерировать фото: {can_generate_photo}")
                        if not can_generate_photo:
                            coins = await coins_service.get_user_coins(coins_user_id)
                            logger.error(f"[ERROR] DEBUG: Недостаточно монет для генерации фото! У пользователя {user_id}: {coins} монет, нужно 30")
                            raise HTTPException(
                                status_code=403, 
                                detail="Недостаточно монет для генерации фото! Нужно 30 монет."
                            )
                        else:
                            logger.info(f"[OK] DEBUG: Пользователь {user_id} может генерировать фото")
                else:
                    logger.warning(f"[WARNING] DEBUG: user_id не передан, пропускаем проверку монет")
                
                # Получаем промпт для изображения
                image_prompt = request.get("image_prompt") or message
                
                # Получаем параметры генерации изображения
                image_steps = request.get("image_steps")
                image_width = request.get("image_width") 
                image_height = request.get("image_height")
                image_cfg_scale = request.get("image_cfg_scale")
                
                # Создаем запрос для генерации изображения
                image_request = ImageGenerationRequest(
                    prompt=image_prompt,
                    character=character_name,
                    steps=image_steps,
                    width=image_width,
                    height=image_height,
                    cfg_scale=image_cfg_scale
                )
                
                # Вызываем существующий эндпоинт генерации изображений через HTTP
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "http://localhost:8000/api/v1/generate-image/",
                        json=image_request.dict()
                    )
                    if response.status_code == 200:
                        image_result = response.json()
                        image_url = image_result.get("image_url")  # Теперь это cloud URL
                        cloud_url = image_result.get("cloud_url")  # Тот же URL
                        image_filename = image_result.get("filename")
                    else:
                        raise Exception(f"Ошибка генерации изображения: {response.status_code}")
                
                logger.info(f"[OK] /chat: Изображение сгенерировано: {image_filename}")
                
                # Проверяем доступность изображения (теперь это cloud URL)
                if image_url:
                    logger.info(f"[OK] Cloud URL получен: {image_url}")
                else:
                    logger.error(f"[ERROR] Cloud URL не получен")
                    image_url = None
                
                # Тратим монеты за генерацию фото (если пользователь авторизован)
                if user_id and image_url:
                    if coins_user_id is None:
                        raise HTTPException(status_code=400, detail="Некорректный идентификатор пользователя")
                    await spend_photo_resources(coins_user_id)
                
            except Exception as e:
                logger.error(f"[ERROR] /chat: Ошибка генерации изображения: {e}")
                # Продолжаем без изображения, не прерываем чат
        
        # Возвращаем ответ с изображением (если есть)
        result = {
            "response": response,
            "session_id": session_id,
            "character": character_data["name"],
            "message": message,
            "image_generated": generate_image and image_url is not None
        }
        
        logger.info(f"[DEBUG] DEBUG: image_url = {image_url}, image_filename = {image_filename}")
        logger.info(f"[DEBUG] DEBUG: generate_image = {generate_image}, image_generated = {result['image_generated']}")
        
        if image_url:
            result["image_url"] = image_url
            result["image_filename"] = image_filename
            if cloud_url:
                result["cloud_url"] = cloud_url
            logger.info(f"[OK] DEBUG: Добавлено изображение в ответ: {image_url}")
        else:
            logger.warning(f"[WARNING] DEBUG: image_url пустой, изображение не добавлено в ответ")

        # Сохраняем историю чата через ChatSession / ChatMessageDB
        await process_chat_history_storage(
            subscription_type=user_subscription_type,
            user_id=user_id,
            character_data=character_data,
            message=message,
            response=response,
            image_url=cloud_url or image_url,
            image_filename=image_filename,
        )

        return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] /chat: Ошибка: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Импорт уже есть выше в файле

@app.post("/api/v1/generate-image/")
async def generate_image(
    request: ImageGenerationRequest,
    current_user: Users = Depends(get_current_user_optional)
):
    """
    Генерация изображения для чата через Celery.
    Возвращает task_id для отслеживания статуса генерации.

    Args:
        request (ImageGenerationRequest): Запрос с параметрами генерации.
        current_user: Текущий пользователь (опционально).

    Returns:
        dict: Результат с task_id для отслеживания статуса.
    """
    # ВРЕМЕННАЯ ЗАГЛУШКА ДЛЯ ПРОВЕРКИ ФРОНТЕНДА
    # Можно включить через переменную окружения для тестирования
    USE_MOCK_GENERATION = os.getenv("USE_MOCK_GENERATION", "false").lower() == "true"
    
    if USE_MOCK_GENERATION:
        logger.info("[MOCK] Возвращаем заглушку для проверки фронтенда")
        return {
            "image_url": "https://via.placeholder.com/512x512/667eea/ffffff?text=Mock+Image",
            "image_id": f"mock_{int(time.time())}",
            "success": True
        }
    
    try:
        # Валидируем имя персонажа
        from app.utils.character_validation import validate_character_name
        
        character_name = request.character or "character"
        is_valid, error_message = validate_character_name(character_name)
        
        if not is_valid:
            raise HTTPException(
                status_code=400, 
                detail=f"Некорректное имя персонажа: {error_message}"
            )
        
        # Получаем user_id из текущего пользователя или из request
        user_id = current_user.id if current_user else (getattr(request, 'user_id', None))
        logger.info(f"[DEBUG] DEBUG: Эндпоинт generate-image, user_id: {user_id}")
        if user_id:
            logger.info(f"[DEBUG] DEBUG: Проверка монет для генерации фото пользователя {user_id}")
            from app.services.coins_service import CoinsService
            from app.database.db import async_session_maker
            
            async with async_session_maker() as db:
                coins_service = CoinsService(db)
                can_generate_photo = await coins_service.can_user_generate_photo(user_id)
                logger.info(f"[DEBUG] DEBUG: Может генерировать фото: {can_generate_photo}")
                if not can_generate_photo:
                    coins = await coins_service.get_user_coins(user_id)
                    logger.error(f"[ERROR] DEBUG: Недостаточно монет для генерации фото! У пользователя {user_id}: {coins} монет, нужно 30")
                    raise HTTPException(
                        status_code=403, 
                        detail="Недостаточно монет для генерации фото! Нужно 30 монет."
                    )
                else:
                    logger.info(f"[OK] DEBUG: Пользователь {user_id} может генерировать фото")
        else:
            logger.warning(f"[WARNING] DEBUG: user_id не передан в эндпоинте generate-image")
        # Логируем информацию о модели перед генерацией
        try:
            import sys
            from pathlib import Path
            
            # Проверяем, что __file__ существует
            if not __file__:
                logger.warning("[WARNING] Не удалось определить путь к модулю")
            else:
                webui_path = Path(__file__).parent.parent / "stable-diffusion-webui"
                if webui_path and webui_path.exists():
                    sys.path.insert(0, str(webui_path))
                    from model_config import get_model_info
                    model_info = get_model_info()
                    if model_info:
                        logger.info(f"[TARGET] Генерация изображения с моделью: {model_info['name']} ({model_info['size_mb']} MB)")
                    else:
                        logger.warning("[WARNING] Информация о модели недоступна")
        except ImportError:
            # Модуль model_config не найден - это нормально
            pass
        except Exception as e:
            logger.warning(f"[WARNING] Не удалось получить информацию о модели: {e}")
        
        logger.info(f"[TARGET] Генерация изображения: {request.prompt}")

        # Создаем сервис для генерации
        # Ленивый импорт - импортируем только при выполнении эндпоинта
        from app.services.face_refinement import FaceRefinementService
        face_refinement_service = FaceRefinementService(settings.SD_API_URL)

        # Получаем данные персонажа для внешности
        character_name = request.character or "anna"
        
        # Сначала пытаемся получить данные из базы данных
        character_appearance = None
        character_location = None
        
        try:
            from app.database.db import async_session_maker
            from app.chat_bot.models.models import CharacterDB
            from sqlalchemy import select
            
            async with async_session_maker() as db:
                # Поиск без учета регистра, берем первого если несколько
                result = await db.execute(
                    select(CharacterDB).where(CharacterDB.name.ilike(character_name))
                )
                db_character = result.scalars().first()
                
                if db_character:
                    character_appearance = db_character.character_appearance
                    character_location = db_character.location
                    logger.info(f"[OK] Данные персонажа '{character_name}' получены из БД")
                else:
                    # Если в БД нет, пытаемся получить из файлов
                    character_data = get_character_data(character_name)
                    if character_data:
                        character_appearance = character_data.get("character_appearance")
                        character_location = character_data.get("location")
                        logger.info(f"[OK] Данные персонажа '{character_name}' получены из файлов")
                    else:
                        logger.error(f"[ERROR] Персонаж '{character_name}' не найден ни в БД, ни в файлах")
                        raise HTTPException(status_code=404, detail=f"Персонаж '{character_name}' не найден")
                        
        except Exception as e:
            logger.error(f"[ERROR] Ошибка получения данных персонажа: {e}")
            # Fallback к файлам
            character_data = get_character_data(character_name)
            if character_data:
                character_appearance = character_data.get("character_appearance")
                character_location = character_data.get("location")
                logger.info(f"[OK] Fallback: данные персонажа '{character_name}' получены из файлов")
            else:
                logger.error(f"[ERROR] Персонаж '{character_name}' не найден")
                raise HTTPException(status_code=404, detail=f"Персонаж '{character_name}' не найден")
        # Импортируем настройки по умолчанию
        from app.config.generation_defaults import get_generation_params
        
        # Получаем настройки по умолчанию
        default_params = get_generation_params("default")
        logger.info(f"🚨 MAIN.PY: request.steps = {request.steps}")
        logger.info(f"🚨 MAIN.PY: default_params.get('steps') = {default_params.get('steps')}")
        
        # Создаем настройки генерации с использованием значений по умолчанию
        generation_settings = GenerationSettings(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            use_default_prompts=request.use_default_prompts,
            character=character_name,
            seed=request.seed or default_params.get("seed"),
            steps=request.steps or default_params.get("steps"),  # Используем steps из запроса или дефолтное значение
            width=request.width or default_params.get("width"),
            height=request.height or default_params.get("height"),
            cfg_scale=request.cfg_scale or default_params.get("cfg_scale"),
            sampler_name=request.sampler_name or default_params.get("sampler_name"),
            batch_size=default_params.get("batch_size"),
            n_iter=default_params.get("n_iter"),
            save_grid=default_params.get("save_grid", False),
            use_adetailer=default_params.get("use_adetailer", False),
            enable_hr=default_params.get("enable_hr", True),
            denoising_strength=default_params.get("denoising_strength"),
            hr_scale=default_params.get("hr_scale"),
            hr_upscaler=default_params.get("hr_upscaler"),
            hr_second_pass_steps=default_params.get("hr_second_pass_steps"),
            hr_prompt=default_params.get("hr_prompt", ""),
            hr_negative_prompt=default_params.get("hr_negative_prompt", ""),
            restore_faces=default_params.get("restore_faces", False),
            clip_skip=default_params.get("clip_skip"),
            lora_models=default_params.get("lora_models", []),
            alwayson_scripts=default_params.get("alwayson_scripts", {})
        )
        
        
        # Создаем полные настройки для логирования (включая все значения по умолчанию)
        full_settings_for_logging = default_params.copy()
        full_settings_for_logging.update({
            "prompt": request.prompt,
            "negative_prompt": request.negative_prompt,
            "use_default_prompts": request.use_default_prompts,
            "character": character_name,
            "seed": request.seed or default_params.get("seed"),
            "steps": request.steps or default_params.get("steps"),
            "width": request.width or default_params.get("width"),
            "height": request.height or default_params.get("height"),
            "cfg_scale": request.cfg_scale or default_params.get("cfg_scale"),
            "sampler_name": request.sampler_name or default_params.get("sampler_name"),
        })
        full_settings_for_logging["negative_prompt"] = generation_settings.negative_prompt
        
        # Добавляем внешность и локацию персонажа в промпт если есть
        prompt_parts = []
        
        if character_appearance:
            logger.info(f"[ART] Добавляем внешность персонажа: {character_appearance[:100]}...")
            prompt_parts.append(character_appearance)
            full_settings_for_logging["character_appearance"] = character_appearance
        
        if character_location:
            logger.info(f"🏠 Добавляем локацию персонажа: {character_location[:100]}...")
            prompt_parts.append(character_location)
            full_settings_for_logging["character_location"] = character_location
        
        # Получаем стандартный промпт из default_prompts.py
        from app.config.default_prompts import get_default_positive_prompts, get_default_negative_prompts
        default_positive_prompts = get_default_positive_prompts() or ""
        if default_positive_prompts:
            logger.info(f"[NOTE] Добавляем стандартный промпт: {default_positive_prompts[:100]}...")
        else:
            logger.warning("[WARNING] Стандартный промпт пустой, используем только пользовательский и данные персонажа")
        default_negative_prompts = get_default_negative_prompts() or ""
        if not request.negative_prompt and default_negative_prompts:
            logger.info("[NOTE] Используем стандартный негативный промпт")
            generation_settings.negative_prompt = default_negative_prompts
        elif request.negative_prompt:
            generation_settings.negative_prompt = request.negative_prompt
        else:
            generation_settings.negative_prompt = ""
        
        # Формируем финальный промпт: данные персонажа + пользовательский промпт + стандартный промпт
        final_prompt_parts = []
        
        # 1. Данные персонажа (если есть)
        if prompt_parts:
            final_prompt_parts.extend(prompt_parts)
        
        # 2. Пользовательский промпт
        if generation_settings.prompt:
            final_prompt_parts.append(generation_settings.prompt)
        
        # 3. Стандартный промпт
        if default_positive_prompts:
            final_prompt_parts.append(default_positive_prompts)
        
        # Объединяем все части
        enhanced_prompt = ", ".join(final_prompt_parts)
        generation_settings.prompt = enhanced_prompt or (generation_settings.prompt or "")
        
        # Обновляем промпт в настройках для логирования
        full_settings_for_logging["prompt"] = enhanced_prompt
        full_settings_for_logging["default_positive_prompts"] = default_positive_prompts
        
        # Запускаем задачу Celery для генерации изображения
        from app.tasks.generation_tasks import generate_image_task
        from app.celery_app import celery_app
        
        # Преобразуем настройки в словарь для сериализации
        settings_dict = generation_settings.dict()
        # Сохраняем оригинальный промпт пользователя (тот, что он ввел) для отображения
        settings_dict["original_user_prompt"] = request.prompt
        
        # Проверяем подключение к Celery
        try:
            # Проверяем, что Celery подключен к Redis
            logger.info(f"[CELERY] Проверяем подключение к Redis...")
            try:
                celery_app.control.inspect().ping()
                logger.info(f"[CELERY] Подключение к Celery worker подтверждено")
            except Exception as ping_error:
                logger.warning(f"[CELERY] Не удалось проверить подключение к worker: {ping_error}")
                # Продолжаем выполнение, так как задача может быть отправлена в очередь
            
            # Запускаем задачу асинхронно
            logger.info(f"[CELERY] Отправляем задачу в очередь high_priority (user_id={user_id})")
            task = generate_image_task.delay(
                settings_dict=settings_dict,
                user_id=user_id,
                character_name=character_name
            )
            
            # Сохраняем промпт сразу (БЕЗ Celery, БЕЗ Redis) с task_id (без image_url, обновим позже)
            if user_id and character_name and request.prompt:
                try:
                    from app.utils.prompt_saver import save_prompt_to_history
                    await save_prompt_to_history(
                        db=db,
                        user_id=user_id,
                        character_name=character_name,
                        prompt=request.prompt,
                        image_url=None,  # Пока нет URL, обновим в get_generation_status
                        task_id=task.id
                    )
                    logger.info(f"[PROMPT] ✓ Промпт сохранен с task_id={task.id}, обновим с image_url в get_generation_status")
                except Exception as e:
                    logger.error(f"[PROMPT] Ошибка сохранения промпта: {e}")
                    import traceback
                    logger.error(f"[PROMPT] Трейсбек: {traceback.format_exc()}")
            
            logger.info(f"[CELERY] Задача генерации изображения создана: task_id={task.id}, user_id={user_id}")
            logger.info(f"[CELERY] Задача отправлена в очередь, состояние: {task.state}")
            
            # Проверяем, что задача действительно отправлена
            if not task.id:
                raise Exception("Задача не получила ID - возможно, не отправлена в очередь")
            
            # Логируем ответ, который будет отправлен фронтенду
            response_data = {
                "task_id": task.id,
                "status": "PENDING",
                "message": "Задача генерации изображения создана. Используйте /api/v1/generation-status/{task_id} для проверки статуса.",
                "status_url": f"/api/v1/generation-status/{task.id}"
            }
            logger.info(f"[CELERY] Отправляем ответ фронтенду: {response_data}")
                
        except Exception as e:
            logger.error(f"[CELERY] Ошибка при создании задачи: {e}")
            import traceback
            logger.error(f"[CELERY] Трейсбек: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка при создании задачи генерации: {str(e)}"
            )
        
        # Возвращаем task_id для отслеживания статуса
        response_data = {
            "task_id": task.id,
            "status": "PENDING",
            "message": "Задача генерации изображения создана. Используйте /api/v1/generation-status/{task_id} для проверки статуса.",
            "status_url": f"/api/v1/generation-status/{task.id}"
        }
        logger.info(f"[CELERY] Возвращаем ответ фронтенду с task_id: {response_data}")
        return response_data
        
    except HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response else 502
        detail = f"Сервис Stable Diffusion вернул ошибку {status_code}"
        logger.error(f"[ERROR] Ошибка Stable Diffusion API: {detail}")
        raise HTTPException(status_code=502, detail=detail)
    except HTTPException as exc:
        raise exc
    except Exception as e:
        logger.error(f"[ERROR] Ошибка генерации изображения: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации изображения: {str(e)}")


@app.get("/api/v1/generation-stream/{task_id}")
async def stream_generation_status(
    task_id: str,
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """
    Server-Sent Events (SSE) эндпоинт для получения статуса генерации в реальном времени.
    
    Args:
        task_id: ID задачи Celery
        
    Returns:
        StreamingResponse: SSE поток с событиями статуса
    """
    from app.celery_app import celery_app
    import json
    
    async def event_generator():
        """Генератор событий SSE"""
        last_status = None
        max_wait_time = 300  # Максимум 5 минут
        check_interval = 0.5  # Проверяем каждые 0.5 секунды
        elapsed_time = 0
        
        try:
            while elapsed_time < max_wait_time:
                task = celery_app.AsyncResult(task_id)
                current_state = task.state
                
                # Отправляем событие только если статус изменился
                if current_state != last_status or current_state in ["PROGRESS", "SUCCESS", "FAILURE"]:
                    last_status = current_state
                    
                    if current_state == "PENDING":
                        event_data = {
                            "status": "PENDING",
                            "message": "Задача ожидает выполнения"
                        }
                    elif current_state == "PROGRESS":
                        progress = task.info.get("progress", 0) if isinstance(task.info, dict) else 0
                        event_data = {
                            "status": "PROGRESS",
                            "message": task.info.get("status", "Выполняется генерация") if isinstance(task.info, dict) else "Выполняется генерация",
                            "progress": progress
                        }
                    elif current_state == "SUCCESS":
                        result = task.result
                        event_data = {
                            "status": "SUCCESS",
                            "message": "Генерация завершена успешно",
                            "data": result
                        }
                        # Отправляем финальное событие и завершаем
                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                        break
                    elif current_state == "FAILURE":
                        error_info = task.info
                        error_message = "Неизвестная ошибка"
                        
                        if isinstance(error_info, dict):
                            error_message = (
                                error_info.get("error") or 
                                error_info.get("exc_message") or 
                                error_info.get("message") or
                                str(error_info)
                            )
                        elif error_info:
                            error_message = str(error_info)
                        
                        event_data = {
                            "status": "FAILURE",
                            "message": "Ошибка генерации изображения",
                            "error": error_message
                        }
                        # Отправляем финальное событие и завершаем
                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                        break
                    else:
                        event_data = {
                            "status": current_state,
                            "message": f"Статус: {current_state}"
                        }
                    
                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                
                # Небольшая задержка перед следующей проверкой
                await asyncio.sleep(check_interval)
                elapsed_time += check_interval
                
                # Отправляем heartbeat каждые 10 секунд, чтобы соединение не закрывалось
                if int(elapsed_time) % 10 == 0:
                    yield f": heartbeat\n\n"
            
            # Если время истекло, отправляем событие таймаута
            if elapsed_time >= max_wait_time:
                event_data = {
                    "status": "TIMEOUT",
                    "message": "Превышено время ожидания генерации",
                    "error": "Превышено время ожидания генерации изображения"
                }
                yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                
        except Exception as e:
            logger.error(f"[SSE] Ошибка в event_generator для задачи {task_id}: {e}")
            event_data = {
                "status": "ERROR",
                "message": "Ошибка получения статуса",
                "error": str(e)
            }
            yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Отключаем буферизацию в nginx
        }
    )


@app.get("/api/v1/generation-status/{task_id}")
async def get_generation_status(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Получить статус генерации изображения по task_id.
    
    Args:
        task_id: ID задачи Celery
        
    Returns:
        dict: Статус задачи и результат (если готово)
    """
    try:
        logger.info(f"[CELERY STATUS] Запрос статуса задачи {task_id}")
        from app.celery_app import celery_app
        
        # Получаем информацию о задаче
        task = celery_app.AsyncResult(task_id)
        logger.info(f"[CELERY STATUS] Запрос статуса задачи {task_id}, состояние: {task.state}")
        
        # Логируем результат задачи для диагностики
        if task.state == "SUCCESS":
            logger.info(f"[CELERY STATUS] Задача {task_id} SUCCESS, результат: {task.result}")
        elif task.state == "FAILURE":
            logger.warning(f"[CELERY STATUS] Задача {task_id} FAILURE, info: {task.info}")
        
        if task.state == "PENDING":
            # Задача еще не началась
            response = {
                "task_id": task_id,
                "status": "PENDING",
                "message": "Задача ожидает выполнения"
            }
        elif task.state == "PROGRESS":
            # Задача выполняется
            response = {
                "task_id": task_id,
                "status": "PROGRESS",
                "message": task.info.get("status", "Выполняется генерация"),
                "progress": task.info.get("progress", 0)
            }
        elif task.state == "SUCCESS":
            # Задача выполнена успешно
            result = task.result
            
            # Логируем результат для диагностики
            logger.info(f"[CELERY STATUS] Результат задачи {task_id}: {result}")
            logger.info(f"[CELERY STATUS] Тип результата: {type(result)}")
            if isinstance(result, dict):
                logger.info(f"[CELERY STATUS] Ключи в результате: {list(result.keys())}")
                logger.info(f"[CELERY STATUS] user_id в результате: {result.get('user_id')}")
                logger.info(f"[CELERY STATUS] character_name в результате: {result.get('character_name')}")
                logger.info(f"[CELERY STATUS] original_user_prompt в результате: {'present' if result.get('original_user_prompt') else 'missing'}")
            
            # Проверяем, что результат содержит image_url
            if isinstance(result, dict):
                if "image_url" in result or "cloud_url" in result:
                    logger.info(f"[CELERY STATUS] URL изображения найден в результате")
                else:
                    logger.warning(f"[CELERY STATUS] URL изображения НЕ найден в результате! Ключи: {list(result.keys())}")
            
            # Обновляем промпт с image_url (промпт уже сохранен в generate_image с task_id)
            try:
                if isinstance(result, dict):
                    image_url = result.get("image_url") or result.get("cloud_url")
                    
                    if image_url:
                        # Ищем запись по task_id и обновляем её с image_url
                        from sqlalchemy import select
                        from app.models.chat_history import ChatHistory
                        
                        logger.info(f"[PROMPT] Обновляем промпт с image_url: task_id={task_id}, image_url={image_url}")
                        
                        existing_query = select(ChatHistory).where(
                            ChatHistory.session_id == f"task_{task_id}"
                        ).order_by(ChatHistory.created_at.desc()).limit(1)
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalars().first()
                        
                        if existing:
                            normalized_url = image_url.split('?')[0].split('#')[0]
                            existing.image_url = normalized_url
                            await db.flush()
                            await db.commit()
                            logger.info(f"[PROMPT] ✓ Промпт обновлен с image_url: task_id={task_id}, image_url={normalized_url}")
                        else:
                            logger.warning(f"[PROMPT] Запись с task_id={task_id} не найдена для обновления")
                    else:
                        logger.warning(f"[PROMPT] image_url отсутствует в результате, пропускаем обновление")
                else:
                    logger.warning(f"[PROMPT] Результат не является словарем: {type(result)}")
            except Exception as e:
                logger.error(f"[PROMPT] Ошибка при обновлении промпта: {e}")
                import traceback
                logger.error(f"[PROMPT] Трейсбек: {traceback.format_exc()}")
                # Не прерываем выполнение, промпт - дополнительная функция
            
            response = {
                "task_id": task_id,
                "status": "SUCCESS",
                "message": "Генерация завершена успешно",
                "result": result
            }
            
            logger.info(f"[CELERY STATUS] Возвращаем ответ для задачи {task_id}: status={response['status']}, result keys={list(result.keys()) if isinstance(result, dict) else 'not dict'}")
        elif task.state == "FAILURE":
            # Задача завершилась с ошибкой
            # Получаем информацию об ошибке из result или info
            error_info = task.info
            error_message = "Неизвестная ошибка"
            
            if isinstance(error_info, dict):
                # Пробуем разные ключи для получения сообщения об ошибке
                error_message = (
                    error_info.get("error") or 
                    error_info.get("exc_message") or 
                    error_info.get("message") or
                    str(error_info)
                )
            elif error_info:
                error_message = str(error_info)
            
            # Также проверяем result задачи, если он есть
            if task.result and isinstance(task.result, dict):
                if "error" in task.result:
                    error_message = task.result["error"]
            
            response = {
                "task_id": task_id,
                "status": "FAILURE",
                "message": "Ошибка при генерации изображения",
                "error": error_message
            }
        else:
            # Неизвестное состояние
            response = {
                "task_id": task_id,
                "status": task.state,
                "message": f"Состояние задачи: {task.state}",
                "info": task.info
            }
        
        return response
        
    except Exception as e:
        logger.error(f"[ERROR] Ошибка получения статуса задачи {task_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения статуса задачи: {str(e)}"
        )


if __name__ == "__main__":
    logger.info("Запуск основного приложения...")
    uvicorn.run(app, host="0.0.0.0", port=8000)