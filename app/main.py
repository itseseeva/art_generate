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
import json
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
    # Убрано логирование версии Pydantic
except ImportError as e:
    print(f"[ERROR] Pydantic import error: {e}")
    sys.exit(1)

import jwt

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse, Response, StreamingResponse
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
import uvicorn
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from httpx import HTTPStatusError

# Импорты для генерации изображений
from app.chat_bot.add_character import get_character_data
# FaceRefinementService импортируется лениво внутри функции, т.к. требует torch
from app.schemas.generation import GenerationSettings, GenerationResponse
from app.config.settings import settings
# import replicate  # Устарело: переехали на RunPod API
from replicate.exceptions import ReplicateError, ModelError
import requests
from PIL import Image
from io import BytesIO
import base64

# Импорты моделей для Alembic
from app.models.chat_history import ChatHistory

# Схема для запроса генерации изображений
class ImageGenerationRequest(BaseModel):
    prompt: str
    custom_prompt: Optional[str] = None  # Отредактированный пользователем промпт (если есть, используется вместо prompt)
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
    # Модель: anime, anime-realism или realism (точно так же как для anime и anime-realism)
    model: Literal["anime", "anime-realism", "realism"] = Field(
        default="anime-realism", 
        description="Модель для генерации: 'anime', 'anime-realism' или 'realism'"
    )
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "prompt": "portrait of a beautiful woman",
                "model": "realism"
            }
        },
        # Принудительно обновляем схему
        extra="forbid"
    )

# Настраиваем логирование с правильной кодировкой
# Создаем папку для логов только при необходимости (не блокируем импорт)
try:
    os.makedirs('logs', exist_ok=True)
except Exception:
    pass  # Игнорируем ошибки создания папки при импорте

# Создаем безопасный StreamHandler для Windows, который обрабатывает Unicode
class SafeStreamHandler(logging.StreamHandler):
    """StreamHandler который безопасно обрабатывает Unicode в Windows"""
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            # Пытаемся вывести как есть
            stream.write(msg + self.terminator)
            self.flush()
        except (UnicodeEncodeError, UnicodeError):
            # Если не получается, заменяем проблемные символы
            try:
                msg = self.format(record)
                # Заменяем проблемные символы на ASCII эквиваленты
                msg_ascii = msg.encode('ascii', errors='replace').decode('ascii')
                stream.write(msg_ascii + self.terminator)
                self.flush()
            except Exception:
                # Если все равно не получается, просто пропускаем
                pass
        except Exception:
            self.handleError(record)

try:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            SafeStreamHandler(sys.stdout),
            logging.FileHandler('logs/app.log', encoding='utf-8')
        ],
        force=True  # Принудительно перезаписываем конфигурацию
    )
    # Отключаем INFO логи от httpx для уменьшения шума
    logging.getLogger("httpx").setLevel(logging.WARNING)
except Exception:
    # Если не удалось настроить логирование в файл, используем только консоль
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[SafeStreamHandler(sys.stdout)],
        force=True
    )
    # Отключаем INFO логи от httpx для уменьшения шума
    logging.getLogger("httpx").setLevel(logging.WARNING)

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
            if webui_path.exists():
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
    # logger.info("[INFO] Redis кэш будет инициализирован при первом использовании")
    
    # Проверяем переменные окружения RunPod
    try:
        from app.services.runpod_client import RUNPOD_URL, RUNPOD_URL_2, RUNPOD_URL_3
        if RUNPOD_URL:
            logger.info("[INFO] RUNPOD_URL установлен (модель 'Аниме')")
        else:
            logger.warning("[WARNING] RUNPOD_URL не установлен - модель 'Аниме' будет недоступна")
        
        if RUNPOD_URL_2:
            logger.info("[INFO] RUNPOD_URL_2 установлен (модель 'Аниме реализм')")
        else:
            logger.warning("[WARNING] RUNPOD_URL_2 не установлен - модель 'Аниме реализм' будет недоступна")
        
        if RUNPOD_URL_3:
            logger.info("[INFO] RUNPOD_URL_3 установлен (модель 'Реализм')")
        else:
            logger.warning(
                "[WARNING] RUNPOD_URL_3 не установлен - модель 'Реализм' будет недоступна. "
                "Добавьте RUNPOD_URL_3=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run в файл .env в папке Docker_all/ "
                "и перезапустите контейнеры: docker compose down && docker compose up -d"
            )
    except Exception as e:
        logger.warning(f"[WARNING] Ошибка проверки переменных RunPod: {e}")
    
    # Keep Alive скрипт отключен
    # keep_alive_task = None
    # try:
    #     import sys
    #     from pathlib import Path
    #
    #     # Добавляем корневую директорию проекта в sys.path
    #     # для корректного импорта keep_alive
    #     project_root = Path(__file__).parent.parent
    #     if str(project_root) not in sys.path:
    #         sys.path.insert(0, str(project_root))
    #
    #     from keep_alive import start_keep_alive_task
    #
    #     # Запускаем как asyncio task в текущем event loop
    #     keep_alive_task = await start_keep_alive_task()
    #     logger.info("[OK] Keep Alive скрипт запущен (асинхронно, не блокирует)")
    # except ImportError as e:
    #     logger.warning(
    #         f"[WARNING] Не удалось импортировать Keep Alive модуль: {e}"
    #     )
    # except Exception as e:
    #     logger.warning(
    #         f"[WARNING] Не удалось запустить Keep Alive скрипт: {e}"
    #     )
    keep_alive_task = None
    
    logger.info("[OK] Приложение готово к работе!")
    logger.info("[INFO] Сервер должен быть готов принимать соединения")
    yield
    logger.info("[INFO] Lifespan завершается...")
    
    # Завершение работы приложения
    logger.info("[STOP] Останавливаем приложение...")
    
    # Keep Alive скрипт отключен
    # if keep_alive_task:
    #     try:
    #         logger.info("[INFO] Останавливаем Keep Alive скрипт...")
    #         from keep_alive import stop_keep_alive_task
    #         await stop_keep_alive_task()
    #         logger.info("[OK] Keep Alive скрипт остановлен")
    #     except Exception as e:
    #         logger.warning(
    #             f"[WARNING] Ошибка остановки Keep Alive скрипта: {e}"
    #         )
    
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
    version="1.0.2",
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

# Middleware для логирования запросов (только ошибки)
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """Логирует только ошибки запросов."""
    try:
        response = await call_next(request)
        # Логируем только ошибки
        if response.status_code >= 400:
            logger.warning(f"[ERROR] {request.method} {request.url.path} -> {response.status_code}")
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
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:80",
    "http://127.0.0.1:80",
    "http://localhost:8000",  # Для прямых запросов к API в Docker
    "http://127.0.0.1:8000",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production домены
    "http://cherrylust.art",
    "https://cherrylust.art",
    "http://www.cherrylust.art",
    "https://www.cherrylust.art",
    # VPS IP адреса
    "http://89.124.71.251",
    "http://89.124.71.251:80",
    "https://89.124.71.251",
    # Добавляем FRONTEND_URL из настроек, если он задан
    *([settings.FRONTEND_URL] if settings.FRONTEND_URL and settings.FRONTEND_URL not in ["http://localhost:5175", "http://127.0.0.1:5175"] else []),
]

# Добавляем дополнительные origin'ы из переменной окружения (через запятую)
ADDITIONAL_ORIGINS = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if ADDITIONAL_ORIGINS:
    additional_origins = [origin.strip() for origin in ADDITIONAL_ORIGINS.split(",") if origin.strip()]
    ALLOWED_ORIGINS.extend(additional_origins)

# Логируем разрешенные origin'ы для отладки
# logger.info(f"[CORS] Разрешенные origin'ы: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Middleware для логирования запросов к character-ratings
@app.middleware("http")
async def log_ratings_requests(request: Request, call_next):
	"""Middleware для логирования запросов к character-ratings."""
	if "/character-ratings/" in str(request.url):
		print("=" * 80)
		print(f"[MIDDLEWARE] Запрос к character-ratings: {request.method} {request.url}")
		print(f"[MIDDLEWARE] Path: {request.url.path}")
		print("=" * 80)
		logger.info("=" * 80)
		logger.info(f"[MIDDLEWARE] Запрос к character-ratings: {request.method} {request.url}")
		logger.info(f"[MIDDLEWARE] Path: {request.url.path}")
		logger.info("=" * 80)
	
	# Логирование ВСЕХ POST-запросов к YooMoney эндпоинтам
	if request.method == "POST" and "/youmoney/" in str(request.url):
		logger.info("=" * 80)
		logger.info(f"[YOUMONEY MIDDLEWARE] POST-запрос к YooMoney: {request.method} {request.url}")
		logger.info(f"[YOUMONEY MIDDLEWARE] Path: {request.url.path}")
		logger.info(f"[YOUMONEY MIDDLEWARE] Headers: {dict(request.headers)}")
		logger.info(f"[YOUMONEY MIDDLEWARE] Client: {request.client}")
		logger.info("=" * 80)
	
	response = await call_next(request)
	
	if "/character-ratings/" in str(request.url):
		print(f"[MIDDLEWARE] Ответ для character-ratings: {response.status_code}")
		logger.info(f"[MIDDLEWARE] Ответ для character-ratings: {response.status_code}")
	
	if request.method == "POST" and "/youmoney/" in str(request.url):
		logger.info(f"[YOUMONEY MIDDLEWARE] Ответ для YooMoney: {response.status_code}")
	
	return response

# ============================================================================
# КРИТИЧНО: Роуты для рейтингов регистрируются НАПРЯМУЮ в app, ПЕРЕД всеми остальными
# Это гарантирует, что они будут проверяться первыми и не будут перехвачены
# роутом /{character_name}
# ============================================================================
# Импортируем зависимости для роутов рейтингов
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.database.db_depends import get_db

@app.post("/api/v1/characters/character-ratings/{character_id}/like")
async def like_character_direct(
    character_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ставит лайк персонажу."""
    from app.chat_bot.models.models import CharacterDB, CharacterRating
    from sqlalchemy import select
    from datetime import datetime
    
    print("=" * 80)
    print(f"[RATINGS DIRECT] POST /character-ratings/{character_id}/like вызван!")
    print(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'None'}")
    print("=" * 80)
    logger.info("=" * 80)
    logger.info(f"[RATINGS DIRECT] POST /character-ratings/{character_id}/like вызван!")
    logger.info(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'None'}")
    logger.info("=" * 80)
    
    try:
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        existing_result = await db.execute(
            select(CharacterRating).where(
                CharacterRating.user_id == current_user.id,
                CharacterRating.character_id == character_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            if existing.is_like:
                await db.delete(existing)
                await db.commit()
                return {"success": True, "message": "Like removed", "user_rating": None}
            else:
                existing.is_like = True
                existing.updated_at = datetime.utcnow()
                await db.commit()
                return {"success": True, "message": "Changed from dislike to like", "user_rating": "like"}
        else:
            rating = CharacterRating(
                user_id=current_user.id,
                character_id=character_id,
                is_like=True
            )
            db.add(rating)
            await db.commit()
            return {"success": True, "message": "Character liked", "user_rating": "like"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error liking character: {e}")
        raise HTTPException(status_code=500, detail=f"Error liking character: {str(e)}")


@app.post("/api/v1/characters/character-ratings/{character_id}/dislike")
async def dislike_character_direct(
    character_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ставит дизлайк персонажу."""
    from app.chat_bot.models.models import CharacterDB, CharacterRating
    from sqlalchemy import select
    from datetime import datetime
    
    print("=" * 80)
    print(f"[RATINGS DIRECT] POST /character-ratings/{character_id}/dislike вызван!")
    print(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'None'}")
    print("=" * 80)
    logger.info("=" * 80)
    logger.info(f"[RATINGS DIRECT] POST /character-ratings/{character_id}/dislike вызван!")
    logger.info(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'None'}")
    logger.info("=" * 80)
    
    try:
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        existing_result = await db.execute(
            select(CharacterRating).where(
                CharacterRating.user_id == current_user.id,
                CharacterRating.character_id == character_id
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            if not existing.is_like:
                await db.delete(existing)
                await db.commit()
                return {"success": True, "message": "Dislike removed", "user_rating": None}
            else:
                existing.is_like = False
                existing.updated_at = datetime.utcnow()
                await db.commit()
                return {"success": True, "message": "Changed from like to dislike", "user_rating": "dislike"}
        else:
            rating = CharacterRating(
                user_id=current_user.id,
                character_id=character_id,
                is_like=False
            )
            db.add(rating)
            await db.commit()
            return {"success": True, "message": "Character disliked", "user_rating": "dislike"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error disliking character: {e}")
        raise HTTPException(status_code=500, detail=f"Error disliking character: {str(e)}")


@app.get("/api/v1/characters/character-ratings/{character_id}")
async def get_character_ratings_direct(
    character_id: int,
    current_user = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получает рейтинг персонажа."""
    from app.chat_bot.models.models import CharacterDB, CharacterRating
    from sqlalchemy import select, func
    
    print("=" * 80)
    print(f"[RATINGS DIRECT] GET /character-ratings/{character_id} вызван!")
    print(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'Anonymous'}")
    print("=" * 80)
    logger.info("=" * 80)
    logger.info(f"[RATINGS DIRECT] GET /character-ratings/{character_id} вызван!")
    logger.info(f"[RATINGS DIRECT] User ID: {current_user.id if current_user else 'Anonymous'}")
    logger.info("=" * 80)
    
    try:
        result = await db.execute(select(CharacterDB).where(CharacterDB.id == character_id))
        character = result.scalar_one_or_none()
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        likes_result = await db.execute(
            select(func.count(CharacterRating.id)).where(
                CharacterRating.character_id == character_id,
                CharacterRating.is_like == True
            )
        )
        likes_count = likes_result.scalar() or 0
        
        dislikes_result = await db.execute(
            select(func.count(CharacterRating.id)).where(
                CharacterRating.character_id == character_id,
                CharacterRating.is_like == False
            )
        )
        dislikes_count = dislikes_result.scalar() or 0
        
        user_rating = None
        if current_user:
            user_rating_result = await db.execute(
                select(CharacterRating).where(
                    CharacterRating.user_id == current_user.id,
                    CharacterRating.character_id == character_id
                )
            )
            user_rating_obj = user_rating_result.scalar_one_or_none()
            if user_rating_obj:
                user_rating = "like" if user_rating_obj.is_like else "dislike"
        
        return {
            "character_id": character_id,
            "likes": likes_count,
            "dislikes": dislikes_count,
            "user_rating": user_rating
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting character ratings: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting character ratings: {str(e)}")

# Простой тестовый эндпоинт БЕЗ зависимостей для проверки работы сервера
@app.get("/api/v1/test-ping")
async def test_ping():
    """Простой тестовый эндпоинт для проверки работы сервера."""
    return {"status": "ok", "message": "API is responding"}

# Обработчик ошибок для Unicode
@app.exception_handler(UnicodeEncodeError)
async def unicode_encode_handler(request: Request, exc: UnicodeEncodeError):
    """Handler for Unicode encoding errors."""
    try:
        logger.error(f"Unicode encoding error: {exc}")
    except:
        pass
    return JSONResponse(
        status_code=400,
        content={"detail": "Unicode encoding error occurred"}
    )

@app.exception_handler(UnicodeDecodeError)
async def unicode_decode_handler(request: Request, exc: UnicodeDecodeError):
    """Handler for Unicode decoding errors."""
    try:
        logger.error(f"Unicode decoding error: {exc}")
    except:
        pass
    return JSONResponse(
        status_code=400,
        content={"detail": "Unicode decoding error occurred"}
    )

# Статические файлы не нужны

# Папка для изображений не нужны

# Монтируем платную галерею как статику
try:
    repo_root = Path(__file__).resolve().parents[1]
    paid_gallery_dir = repo_root / "paid_gallery"
    if paid_gallery_dir.exists():
        app.mount("/paid_gallery", StaticFiles(directory=str(paid_gallery_dir), html=True), name="paid_gallery")
        # Убрано логирование монтирования
    else:
        logger.warning(f"Папка платной галереи не найдена: {paid_gallery_dir}")
    
    # Монтируем статические файлы для аватаров (не блокируем запуск)
    try:
        avatars_dir = project_root / "avatars"
        avatars_dir.mkdir(exist_ok=True)
        app.mount("/avatars", StaticFiles(directory=str(avatars_dir), html=False), name="avatars")
        # Убрано логирование монтирования
    except Exception as e:
        logger.warning(f"[WARNING] Не удалось смонтировать папку аватаров: {e}")
except Exception as e:
    logger.error(f"Ошибка монтирования платной галереи: {e}")

# Подключаем роутеры аутентификации
try:
    from app.auth.routers import auth_router
    app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
    # Убрано логирование подключения роутеров
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения auth_router: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем OAuth роутер БЕЗ префикса /api/v1 (как было раньше)
try:
    from app.auth.oauth_routers import oauth_router
    app.include_router(oauth_router, tags=["oauth"])
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения oauth_router: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Роутер generation удален - используется только /api/v1/generate-image/ в main.py

try:
    from app.chat_bot.api.chat_endpoints import router as chat_router
    from app.chat_bot.api.character_endpoints import router as character_router
    # ПРИМЕЧАНИЕ: Роуты рейтингов теперь регистрируются напрямую в app выше,
    # поэтому отдельный роутер не нужен
    
    app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
    app.include_router(character_router, prefix="/api/v1/characters", tags=["characters"])
    
    # Роутер для комментариев к персонажам
    from app.api.endpoints.character_comments import router as comments_router
    app.include_router(comments_router, prefix="/api/v1/character-comments", tags=["character-comments"])
    
    # Логируем все роуты для отладки (отключено)
    # print("=" * 80)
    # print("[ROUTES] Зарегистрированные роуты для character-ratings:")
    # ratings_routes = []
    # for route in app.routes:
    #     if hasattr(route, 'path') and 'character-ratings' in route.path:
    #         methods = list(route.methods) if hasattr(route, 'methods') else []
    #         route_info = f"{methods} {route.path}"
    #         print(f"[ROUTES] {route_info}")
    #         ratings_routes.append(route_info)
    # if not ratings_routes:
    #     print("[ROUTES] ВНИМАНИЕ: Роуты character-ratings НЕ найдены!")
    # print("=" * 80)
    # logger.info("=" * 80)
    # logger.info("[ROUTES] Зарегистрированные роуты для character-ratings:")
    # for route in app.routes:
    #     if hasattr(route, 'path') and 'character-ratings' in route.path:
    #         methods = list(route.methods) if hasattr(route, 'methods') else []
    #         logger.info(f"[ROUTES] {methods} {route.path}")
    # if not ratings_routes:
    #     logger.warning("[ROUTES] ВНИМАНИЕ: Роуты character-ratings НЕ найдены!")
    # logger.info("=" * 80)

except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутеров chat/character: {e}")
    logger.error(f"Тип ошибки: {type(e).__name__}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Роутер для баг-репортов (отдельный блок для надежности)
try:
    from app.api.endpoints.bug_reports import router as bug_reports_router
    app.include_router(bug_reports_router, prefix="/api/v1/bug-reports", tags=["bug-reports"])
    logger.info("[ROUTER] Bug reports router подключен")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера bug_reports: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер подписок (исправленная версия)
try:
    from app.api.endpoints.profit_activate_endpoints import router as profit_activate_router
    app.include_router(profit_activate_router, prefix="/api/v1/profit", tags=["profit"])
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера подписок: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем старый роутер подписок для обратной совместимости
try:
    from app.api.endpoints.subscription_endpoints import router as subscription_router
    app.include_router(subscription_router, prefix="/api/v1/subscription", tags=["subscription"])
    
    # Подключаем роутер истории баланса
    try:
        from app.api.endpoints.balance_endpoints import router as balance_router
        app.include_router(balance_router)
    except Exception as e:
        logger.error(f"[ERROR] Ошибка подключения balance_router: {e}")
    # Убрано логирование подключения
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
            message = "Подписка Standard активирована! 1500 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото) и возможность создавать персонажей!"
        else:  # premium
            message = "Подписка Premium активирована! 5000 кредитов. Генерация фото оплачивается кредитами (10 кредитов за фото) и приоритет в очереди!"
        
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
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера gallery: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер фотографий персонажей
try:
    from app.api.endpoints.photos_endpoints import router as photos_router
    app.include_router(photos_router)
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера фотографий: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем интеграцию YouMoney
try:
    from app.youmoney.router import router as youmoney_router  # type: ignore
    app.include_router(youmoney_router)
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера YouMoney: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем интеграцию YooKassa (Checkout)
try:
    from app.youkassa.router import router as yookassa_router  # type: ignore
    app.include_router(yookassa_router)
    # Убрано логирование подключения
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера YooKassa: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Подключаем роутер истории чата
try:
    try:
        from app.chat_history.api.endpoints import router as chat_history_router
        app.include_router(chat_history_router, prefix="/api/v1/chat-history", tags=["chat-history"])
        logger.info(f"[ROUTER] Chat history router подключен: {len(chat_history_router.routes)} routes")
    except ImportError as e:
        # Fallback на старый путь
        logger.warning(f"[ROUTER] Fallback на старый путь chat_history: {e}")
        from app.api.endpoints.chat_history import router as chat_history_router
        app.include_router(chat_history_router, prefix="/api/v1/chat-history", tags=["chat-history"])
        logger.info(f"[ROUTER] Chat history router (fallback) подключен: {len(chat_history_router.routes)} routes")
except Exception as e:
    logger.error(f"[ERROR] Ошибка подключения роутера истории чата: {e}")
    import traceback
    logger.error(f"Traceback: {traceback.format_exc()}")

# Убрано логирование всех зарегистрированных роутов

# Подключаем тестовый роутер для llama-cpp-python (если существует)
try:
    logger.info("[ROUTER] Подключаем тестовый роутер...")
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
    # Логируем полную информацию об ошибке для отладки
    import json
    logger.error(f"Validation errors details: {json.dumps(exc.errors(), indent=2, ensure_ascii=False)}")
    logger.error(f"Request body: {await request.body() if hasattr(request, 'body') else 'N/A'}")
    
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
            if webui_path.exists():
                sys.path.insert(0, str(webui_path))
                from model_config import get_model_info, check_model_files
                model_info = get_model_info()
                model_available = check_model_files()
            else:
                model_info = None
                model_available = False
        except ImportError:
            # Модуль model_config не найден - это нормально, если stable-diffusion-webui не установлен
            model_info = None
            model_available = False
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
        logger.error(f"Ошибка получения fallback настроек: {e}", exc_info=True)
        # Последний резерв - используем default_prompts.py
        try:
            from app.config.default_prompts import get_default_negative_prompts
            from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
            return {
                "steps": DEFAULT_GENERATION_PARAMS.get("steps", 28),
                "width": DEFAULT_GENERATION_PARAMS.get("width", 832),
                "height": DEFAULT_GENERATION_PARAMS.get("height", 1216),
                "cfg_scale": DEFAULT_GENERATION_PARAMS.get("cfg_scale", 4),
                "sampler_name": DEFAULT_GENERATION_PARAMS.get("sampler_name", "DPM++ 2M Karras"),
                "negative_prompt": get_default_negative_prompts()
            }
        except Exception as final_error:
            logger.error(f"Критическая ошибка загрузки промптов: {final_error}", exc_info=True)
            # Последний резерв - минимальные значения
            return {
                "steps": 28,
                "width": 832,
                "height": 1216,
                "cfg_scale": 4,
                "sampler_name": "DPM++ 2M Karras",
                "negative_prompt": ""
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
        logger.error(f"Критическая ошибка загрузки персонажей: {e}", exc_info=True)
        import traceback
        logger.error(f"Трейсбек: {traceback.format_exc()}")
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
    image_filename: Optional[str],
    generation_time: Optional[float] = None
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
        logger.warning(f"[HISTORY] Пропуск сохранения: character_name отсутствует. character_data={character_data}")
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

        # КРИТИЧЕСКИ ВАЖНО: проверяем подписку - для FREE не сохраняем ChatSession/ChatMessageDB
        can_save_session = False
        if user_id_int:
            from app.models.subscription import UserSubscription, SubscriptionType, SubscriptionStatus
            # Получаем самую новую активную подписку (если есть несколько записей)
            subscription_query = await db.execute(
                select(UserSubscription)
                .where(UserSubscription.user_id == user_id_int)
                .where(UserSubscription.status == SubscriptionStatus.ACTIVE)
                .order_by(UserSubscription.activated_at.desc())
                .limit(1)
            )
            subscription = subscription_query.scalar_one_or_none()
            if subscription and subscription.is_active:
                # КРИТИЧЕСКИ ВАЖНО: сохраняем историю для STANDARD и PREMIUM подписок одинаково
                # PREMIUM должен работать так же, как STANDARD - никаких различий в обработке
                can_save_session = subscription.subscription_type in [SubscriptionType.STANDARD, SubscriptionType.PREMIUM]
                logger.info(f"[HISTORY] Пользователь {user_id_int}: подписка={subscription.subscription_type.value}, is_active={subscription.is_active}, can_save_session={can_save_session}")
                if subscription.subscription_type == SubscriptionType.PREMIUM:
                    logger.info(f"[HISTORY] PREMIUM подписка обнаружена для user_id={user_id_int} - история должна сохраняться так же, как для STANDARD")
            else:
                logger.warning(f"[HISTORY] Пользователь {user_id_int}: подписка отсутствует или неактивна (subscription={subscription})")
        else:
            logger.warning(f"[HISTORY] user_id_int отсутствует (user_id={user_id})")
        
        # Если character_id отсутствует, пробуем найти его по имени в БД
        if not resolved_character_id:
            logger.info(f"[HISTORY] character_id отсутствует, ищем по имени '{character_name}' в БД")
            character_result = await db.execute(
                select(CharacterDB.id).where(CharacterDB.name.ilike(character_name))
            )
            resolved_character_id = character_result.scalar_one_or_none()
            if not resolved_character_id:
                logger.warning(f"[HISTORY] Пропуск сохранения: character '{character_name}' не найден в БД. character_data={character_data}")
                return
            else:
                logger.info(f"[HISTORY] Найден character_id={resolved_character_id} для character_name='{character_name}'")

        # Сохраняем ChatSession и ChatMessageDB только если подписка позволяет
        chat_session = None
        if can_save_session:
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

            # Сохраняем сообщение пользователя (даже если оно пустое, но есть фото)
            # Фото = текст для истории чата
            user_content = message if message else ""
            
            # ВАЖНО: Если есть фото, но нет текста - создаем сообщение для истории
            # Это нужно, чтобы история работала даже при генерации фото без текста
            if (image_url or image_filename) and not user_content:
                # Используем текст "Генерация изображения" чтобы пройти фильтры истории
                # (минимум 3 символа, максимум 1000 символов)
                user_content = "Генерация изображения"
                logger.info(f"[HISTORY] Установлен user_content='Генерация изображения' для фото без текста (image_url={bool(image_url)}, image_filename={bool(image_filename)}, message='{message}')")
            
            # ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: если message уже содержит "Генерация изображения", используем его
            if message == "Генерация изображения" and (image_url or image_filename):
                user_content = "Генерация изображения"
                logger.info(f"[HISTORY] Используем message='Генерация изображения' как user_content")
            
            # Если есть image_url, добавляем его в user_content для сохранения в ChatMessageDB
            # Это нужно для случаев, когда пользователь загружает изображение
            if image_url and user_content and "[image:" not in user_content:
                user_content = f"{user_content}\n\n[image:{image_url}]"
            elif image_filename and user_content and "[image:" not in user_content:
                user_content = f"{user_content}\n\n[image:{image_filename}]"
            
            # Используем более точное время для правильной сортировки
            import time
            user_timestamp = datetime.now()
            
            user_record = ChatMessageDB(
                session_id=chat_session.id,
                role="user",
                content=user_content,
                timestamp=user_timestamp,
            )
            db.add(user_record)
            await db.flush()  # Сохраняем user сообщение сразу, чтобы получить ID

            # Если есть только фото без текста, создаем сообщение с фото
            assistant_content = response if response else ""
            if image_url:
                if assistant_content:
                    # Если есть текст, добавляем метку о фото с URL
                    assistant_content = f"{assistant_content}\n\n[image:{image_url}]"
                else:
                    # Если нет текста, создаем сообщение о фото с URL
                    # Используем формат [image:url] чтобы можно было извлечь URL при загрузке
                    assistant_content = f"[image:{image_url}]"
            elif image_filename:
                if assistant_content:
                    assistant_content = f"{assistant_content}\n\n[image:{image_filename}]"
                else:
                    assistant_content = f"[image:{image_filename}]"

            # Добавляем небольшую задержку, чтобы timestamp был разным
            # Используем микросекунды для более точного времени
            await asyncio.sleep(0.001)  # 1 миллисекунда (асинхронно)
            assistant_timestamp = datetime.now()
            
            # Убеждаемся, что assistant timestamp больше user timestamp
            if assistant_timestamp <= user_timestamp:
                from datetime import timedelta
                assistant_timestamp = user_timestamp + timedelta(microseconds=1000)

            assistant_record = ChatMessageDB(
                session_id=chat_session.id,
                role="assistant",
                content=assistant_content,
                timestamp=assistant_timestamp,
            )
            db.add(assistant_record)
            
            # КРИТИЧЕСКИ ВАЖНО: коммитим ChatMessageDB сразу, чтобы они сохранились
            await db.commit()
            logger.info(f"[HISTORY] ChatSession и ChatMessageDB сохранены для user_id={user_id_int}, character={character_name}, session_id={chat_session.id}")
            logger.info(f"[HISTORY] User message: '{user_content}' ({len(user_content)} chars), Assistant message: '{assistant_content[:100]}...' ({len(assistant_content)} chars)")
            logger.info(f"[HISTORY] User message length check: >= 3? {len(user_content.strip()) >= 3}, < 1000? {len(user_content.strip()) < 1000}")
            logger.info(f"[HISTORY] Image URL present: {bool(image_url)}, Image filename present: {bool(image_filename)}")
        else:
            logger.warning(f"[HISTORY] Пропуск сохранения ChatSession/ChatMessageDB: подписка FREE или отсутствует (user_id={user_id_int}, can_save_session={can_save_session})")

        # Также сохраняем в ChatHistory для истории чата
        # КРИТИЧЕСКИ ВАЖНО: сохраняем для STANDARD и PREMIUM подписок одинаково
        # PREMIUM должен работать так же, как STANDARD - никаких различий в обработке
        # ВАЖНО: Если chat_session не был создан (например, при сохранении через галерею),
        # создаем его сейчас, чтобы можно было сохранить ChatHistory
        if user_id_int and can_save_session:
            # Если chat_session не был создан выше, создаем его сейчас
            if not chat_session:
                try:
                    # Пытаемся найти существующую сессию или создать новую
                    if resolved_character_id:
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
                            logger.info(f"[HISTORY] Создан ChatSession для сохранения ChatHistory: session_id={chat_session.id}")
                except Exception as session_error:
                    logger.warning(f"[HISTORY] Не удалось создать ChatSession для ChatHistory: {session_error}")
            
            if chat_session:
                try:
                    # Сохраняем промпт пользователя (даже если он пустой, но есть фото)
                    # Фото = текст для истории чата
                    user_message_content = message if message else ""
                    if image_url and not user_message_content:
                        # Если есть только фото без текста, создаем сообщение с фото
                        user_message_content = f"[image:{image_url}]"
                    elif image_filename and not user_message_content:
                        user_message_content = f"[image:{image_filename}]"
                    
                    # Сохраняем в ChatHistory используя raw SQL, так как поле generation_time может отсутствовать в БД
                    from sqlalchemy import text
                    
                    # Сохраняем сообщение пользователя
                    user_message_content_to_save = user_message_content if user_message_content else ""
                    
                    # Сохраняем ответ ассистента
                    assistant_message_content = response if response else ""
                    if image_url and not assistant_message_content:
                        assistant_message_content = f"[image:{image_url}]"
                    elif image_filename and not assistant_message_content:
                        assistant_message_content = f"[image:{image_filename}]"
                
                    # Сохраняем сообщение пользователя (без generation_time)
                    await db.execute(
                        text("""
                            INSERT INTO chat_history (user_id, character_name, session_id, message_type, message_content, image_url, image_filename, created_at)
                            VALUES (:user_id, :character_name, :session_id, :message_type, :message_content, :image_url, :image_filename, NOW())
                        """),
                        {
                            "user_id": user_id_int,
                            "character_name": character_name,
                            "session_id": str(chat_session.id),
                            "message_type": "user",
                            "message_content": user_message_content_to_save,
                            "image_url": image_url,
                            "image_filename": image_filename
                        }
                    )
                    # Сохраняем сообщение ассистента с generation_time (если есть)
                    # Пытаемся добавить generation_time, если оно передано
                    if generation_time is not None and generation_time > 0:
                        # Вставляем с generation_time
                        await db.execute(
                            text("""
                                INSERT INTO chat_history (user_id, character_name, session_id, message_type, message_content, image_url, image_filename, generation_time, created_at)
                                VALUES (:user_id, :character_name, :session_id, :message_type, :message_content, :image_url, :image_filename, :generation_time, NOW())
                            """),
                            {
                                "user_id": user_id_int,
                                "character_name": character_name,
                                "session_id": str(chat_session.id),
                                "message_type": "assistant",
                                "message_content": assistant_message_content,
                                "image_url": image_url,
                                "image_filename": image_filename,
                                "generation_time": int(round(generation_time))
                            }
                        )
                    else:
                        # Вставляем без generation_time
                        await db.execute(
                            text("""
                                INSERT INTO chat_history (user_id, character_name, session_id, message_type, message_content, image_url, image_filename, created_at)
                                VALUES (:user_id, :character_name, :session_id, :message_type, :message_content, :image_url, :image_filename, NOW())
                            """),
                            {
                                "user_id": user_id_int,
                                "character_name": character_name,
                                "session_id": str(chat_session.id),
                                "message_type": "assistant",
                                "message_content": assistant_message_content,
                                "image_url": image_url,
                                "image_filename": image_filename
                            }
                        )

                    await db.commit()

                    logger.info(
                        "[HISTORY] Сообщения сохранены в ChatHistory (user_id=%s, character=%s, session_id=%s, has_image=%s, generation_time=%s)",
                        user_id_int,
                        character_name,
                        str(chat_session.id),
                        bool(image_url or image_filename),
                        generation_time
                    )
                    
                    # Инвалидируем кэш списка персонажей, чтобы новый персонаж появился на странице /history
                    from app.utils.redis_cache import cache_delete, key_user_characters
                    user_characters_cache_key = key_user_characters(user_id_int)
                    await cache_delete(user_characters_cache_key)
                    logger.info(f"[HISTORY] Кэш списка персонажей инвалидирован для user_id={user_id_int}")
                except Exception as chat_history_error:
                    await db.rollback()
                    logger.error(f"[HISTORY] Ошибка сохранения в ChatHistory: {chat_history_error}")
                    import traceback
                    logger.error(f"[HISTORY] Трейсбек: {traceback.format_exc()}")
                    # НЕ делаем rollback для ChatMessageDB, так как они уже сохранены
        
        # Логируем только если chat_session был создан
        if chat_session:
            logger.info(
                "[HISTORY] Сообщения сохранены (session_id=%s, user_id=%s)",
                chat_session.id,
                db_user_id,
            )


async def increment_message_counter_async(user_id: int) -> None:
    """Асинхронно увеличивает счетчик отправленных сообщений пользователя."""
    try:
        async with async_session_maker() as db:
            from app.models.user import Users
            from sqlalchemy import select, update
            
            # Получаем пользователя
            result = await db.execute(
                select(Users).where(Users.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if user:
                # Увеличиваем счетчик атомарно
                current_count = user.total_messages_sent or 0
                await db.execute(
                    update(Users)
                    .where(Users.id == user_id)
                    .values(total_messages_sent=current_count + 1)
                )
                await db.commit()
                logger.info(f"[MESSAGE_COUNTER] Счетчик сообщений увеличен для user_id={user_id} (было {current_count}, стало {current_count + 1})")
            else:
                logger.warning(f"[MESSAGE_COUNTER] Пользователь {user_id} не найден")
    except Exception as e:
        logger.error(f"[MESSAGE_COUNTER] Ошибка увеличения счетчика сообщений для user_id={user_id}: {e}")
        # Не прерываем выполнение, если счетчик не обновился


async def process_chat_history_storage(
    subscription_type: Optional[str],
    user_id: Optional[str],
    character_data: Optional[dict],
    message: str,
    response: str,
    image_url: Optional[str],
    image_filename: Optional[str],
    generation_time: Optional[float] = None
) -> None:
    """Определяет, нужно ли сохранять историю чата, и выполняет сохранение."""
    logger.info(f"[HISTORY] process_chat_history_storage вызван: user_id={user_id}, subscription_type={subscription_type}, character={character_data.get('name') if character_data else None}")
    try:
        # Преобразуем user_id в int для счетчика
        user_id_int = None
        if user_id:
            try:
                user_id_int = int(user_id) if isinstance(user_id, str) else user_id
            except (ValueError, TypeError):
                logger.warning(f"[HISTORY] Не удалось преобразовать user_id в int: {user_id}")
        
        # Увеличиваем счетчик сообщений асинхронно (не блокируем сохранение истории)
        if user_id_int:
            asyncio.create_task(increment_message_counter_async(user_id_int))
        
        await _write_chat_history(
            user_id=user_id,
            character_data=character_data,
            message=message,
            response=response,
            image_url=image_url,
            image_filename=image_filename,
            generation_time=generation_time,
        )
    except Exception as history_error:
        logger.error(f"[ERROR] Не удалось сохранить историю чата: {history_error}")
        import traceback
        logger.error(f"[ERROR] Трейсбек: {traceback.format_exc()}")


async def spend_message_resources_async(user_id: int, use_credits: bool) -> None:
    """Списывает кредиты или монеты за сообщение в фоновом режиме."""
    try:
        async with async_session_maker() as db:
            if use_credits:
                subscription_service = ProfitActivateService(db)
                credits_spent = await subscription_service.use_message_credits(user_id)
                if credits_spent:
                    # Записываем историю баланса (кредиты подписки, баланс не меняется)
                    try:
                        from app.utils.balance_history import record_balance_change
                        await record_balance_change(
                            db=db,
                            user_id=user_id,
                            amount=-5,
                            reason="Отправка сообщения в чате (кредиты подписки)"
                        )
                    except Exception as e:
                        logger.warning(f"Не удалось записать историю баланса за сообщение (кредиты подписки): {e}")
                    await db.commit()
                    logger.info(f"[STREAM] Списаны кредиты подписки за сообщение пользователя {user_id}")
            else:
                from app.services.coins_service import CoinsService
                coins_service = CoinsService(db)
                coins_spent = await coins_service.spend_coins_for_message(user_id, commit=False)
                if coins_spent:
                    # Записываем историю баланса
                    try:
                        from app.utils.balance_history import record_balance_change
                        await record_balance_change(
                            db=db,
                            user_id=user_id,
                            amount=-5,
                            reason="Отправка сообщения в чате"
                        )
                    except Exception as e:
                        logger.warning(f"Не удалось записать историю баланса: {e}")
                    await db.commit()
                    logger.info(f"[STREAM] Списаны монеты за сообщение пользователя {user_id}")
    except Exception as e:
        logger.error(f"[STREAM] Ошибка списания ресурсов: {e}")


async def spend_photo_resources(user_id: int) -> None:
    """Списывает монеты за генерацию фото. Для STANDARD/PREMIUM только баланс, для FREE - также лимит подписки."""
    async with async_session_maker() as db:
        coins_service = CoinsService(db)
        subscription_service = ProfitActivateService(db)

        # Проверяем баланс пользователя (обязательно для всех)
        if not await coins_service.can_user_afford(user_id, 10):
            raise HTTPException(
                status_code=403,
                detail="Недостаточно монет для генерации изображения. Нужно 10 монет."
            )

        # Проверяем подписку (для FREE может быть лимит на фото)
        subscription = await subscription_service.get_user_subscription(user_id)
        if subscription:
            subscription_type = subscription.subscription_type.value
            if subscription_type == "free":
                # Для FREE проверяем лимит подписки
                if not await subscription_service.can_user_generate_photo(user_id):
                    raise HTTPException(
                        status_code=403,
                        detail="Достигнут лимит генераций фото в подписке."
                    )
            # Для STANDARD и PREMIUM - только проверяем активность подписки
            elif subscription_type in ("standard", "premium"):
                if not subscription.is_active:
                    raise HTTPException(
                        status_code=403,
                        detail="Подписка неактивна. Необходима активная подписка для генерации фото."
                    )

        try:
            # Списываем кредиты с баланса пользователя
            coins_spent = await coins_service.spend_coins(user_id, 10, commit=False)
            if not coins_spent:
                raise HTTPException(
                    status_code=403,
                    detail="Не удалось списать монеты за генерацию изображения."
                )

            # Для FREE списываем лимит подписки, для STANDARD/PREMIUM - ничего не делаем
            if subscription and subscription.subscription_type.value == "free":
                photo_spent = await subscription_service.use_photo_generation(user_id, commit=False)
                if not photo_spent:
                    raise HTTPException(
                        status_code=403,
                        detail="Недостаточно лимита подписки для генерации изображения."
                    )
            
            # Записываем историю баланса
            try:
                from app.utils.balance_history import record_balance_change
                await record_balance_change(
                    db=db,
                    user_id=user_id,
                    amount=-10,
                    reason="Генерация изображения через API"
                )
            except Exception as e:
                logger.warning(f"Не удалось записать историю баланса: {e}")

            await db.commit()
            await emit_profile_update(user_id, db)

            coins_left = await coins_service.get_user_coins(user_id)
            logger.info(
                "[OK] Потрачено 10 монет за генерацию фото для пользователя %s. Осталось монет: %s",
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
    Поддерживает стриминг через параметр stream=true.
    """
    # Проверяем параметр stream
    stream_param_raw = request.get('stream')
    
    try:
        logger.info("[NOTE] /chat: Simple mode - direct response from model")
        
        # Импортируем необходимые модули
        from app.chat_bot.services.openrouter_service import openrouter_service
        from app.chat_bot.config.chat_config import chat_config
        from app.config.generation_defaults import get_generation_params
        from app.services.profit_activate import ProfitActivateService
        from app.database.db import async_session_maker
        import json
        
        # Проверяем подключение к OpenRouter
        if not await openrouter_service.check_connection():
                raise HTTPException(
                    status_code=503, 
                detail="OpenRouter API unavailable. Check OPENROUTER_KEY settings."
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
        
        # Проверяем, нужно ли генерировать изображение
        generate_image = request.get("generate_image", False)
        
        # Проверяем, нужен ли стриминг
        stream_param = request.get("stream", False)
        logger.info(f"[STREAM DEBUG] stream_param from request.get('stream'): {stream_param} (type: {type(stream_param).__name__})")
        
        # Обрабатываем разные форматы: bool, строка "true"/"false", число 1/0
        if isinstance(stream_param, bool):
            use_streaming = stream_param
        elif isinstance(stream_param, str):
            use_streaming = stream_param.lower() in ("true", "1", "yes")
        elif isinstance(stream_param, (int, float)):
            use_streaming = bool(stream_param)
        else:
            use_streaming = False
        
        logger.info(f"[STREAM] Stream parameter from request: {stream_param} (type: {type(stream_param).__name__}), use_streaming={use_streaming}")
        
        # === КРИТИЧЕСКИ ВАЖНО: Обрабатываем пустое сообщение ДО формирования контекста для LLM ===
        # Если сообщение пустое, но запрашивается генерация фото, устанавливаем message
        # Это нужно сделать ДО вызова openrouter_service.generate_text!
        if not message and generate_image:
            image_prompt = request.get("image_prompt", "")
            if image_prompt:
                message = image_prompt
                logger.info(f"[HISTORY] Using image_prompt as message: {image_prompt[:50]}...")
            else:
                # Если нет промпта, создаем сообщение-заглушку для LLM
                message = "Image generation"
                logger.info(f"[HISTORY] Set message='Image generation' for photo generation without text")
        
        # Разрешаем пустое сообщение, если запрашивается генерация фото
        # Фото = текст для истории чата
        if not message and not generate_image:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        history = request.get("history", [])
        session_id = request.get("session_id", "default")
        
        # Логируем историю из запроса для диагностики
        if history:
            logger.info(f"[CONTEXT] History from request: {len(history)} messages")
            for i, msg in enumerate(history[-5:]):  # Показываем последние 5
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')[:100]
                logger.debug(f"[CONTEXT]   history[{i}]: {role}: {content}...")
        else:
            logger.info(f"[CONTEXT] History from request is missing")
        
        # ОПТИМИЗИРОВАНО: Объединяем все запросы к БД в один блок
        token_user_id = str(current_user.id) if current_user else None
        body_user_id = request.get("user_id")
        user_id = str(body_user_id) if body_user_id is not None else None
        if token_user_id is not None:
            user_id = token_user_id
        logger.info(f"[DEBUG] /chat: effective user_id for history = {user_id}, current_user={current_user.email if current_user else 'None'}, current_user.id={current_user.id if current_user else 'None'}")

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
        subscription = None
        subscription_type_enum = None
        
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
                
                # Сохраняем subscription_type_enum для использования после выхода из блока
                if subscription and subscription.subscription_type:
                    try:
                        from app.models.subscription import SubscriptionType
                        subscription_type_enum = SubscriptionType(subscription.subscription_type.value)
                    except (ValueError, AttributeError):
                        subscription_type_enum = None
                
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
                        # КРИТИЧЕСКИ ВАЖНО: Пытаемся найти ID в БД по имени, чтобы история сохранялась
                        if not character_data.get("id"):
                            try:
                                character_id_result = await db.execute(
                                    select(CharacterDB.id).where(CharacterDB.name.ilike(character_name))
                                )
                                character_id = character_id_result.scalar_one_or_none()
                                if character_id:
                                    character_data["id"] = character_id
                                    logger.info(f"[OK] ID персонажа '{character_name}' найден в БД: {character_id}")
                                else:
                                    logger.warning(f"[WARNING] ID персонажа '{character_name}' не найден в БД, история может не сохраниться")
                            except Exception as id_error:
                                logger.warning(f"[WARNING] Ошибка поиска ID персонажа '{character_name}' в БД: {id_error}")
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
                # КРИТИЧЕСКИ ВАЖНО: Пытаемся найти ID в БД по имени, чтобы история сохранялась
                if not character_data.get("id"):
                    try:
                        character_id_result = await db.execute(
                            select(CharacterDB.id).where(CharacterDB.name.ilike(character_name))
                        )
                        character_id = character_id_result.scalar_one_or_none()
                        if character_id:
                            character_data["id"] = character_id
                            logger.info(f"[OK] ID персонажа '{character_name}' найден в БД после ошибки: {character_id}")
                        else:
                            logger.warning(f"[WARNING] ID персонажа '{character_name}' не найден в БД, история может не сохраниться")
                    except Exception as id_error:
                        logger.warning(f"[WARNING] Ошибка поиска ID персонажа '{character_name}' в БД: {id_error}")
        
        # Специальная обработка для "continue the story"
        is_continue_story = message.lower().strip() == "continue the story briefly"
        
        if is_continue_story:
            logger.info(f"📖 Continue the story briefly - продолжаем историю кратко")
        else:
            logger.info(f"[START] Генерируем ответ для: {message[:50]}...")
        
        # Импортируем утилиты для работы с контекстом
        from app.chat_bot.utils.context_manager import (
            get_context_limit, 
            get_max_tokens, 
            get_max_context_tokens,
            trim_messages_to_token_limit
        )
        
        # Определяем лимит контекста на основе подписки
        # subscription_type_enum уже определен выше в блоке async with
        context_limit = get_context_limit(subscription_type_enum)  # Лимит сообщений для загрузки из БД
        max_context_tokens = get_max_context_tokens(subscription_type_enum)  # Лимит токенов для контекста
        max_tokens = get_max_tokens(subscription_type_enum)  # Лимит токенов для генерации ответа
        logger.info(f"[CONTEXT] Лимит сообщений из БД: {context_limit}, лимит токенов контекста: {max_context_tokens}, лимит токенов генерации: {max_tokens}")
        
        # Получаем историю из БД, если есть подписка и user_id
        db_history_messages = []
        if coins_user_id and character_data.get("id"):
            try:
                from app.chat_bot.models.models import ChatSession, ChatMessageDB
                from sqlalchemy import select
                
                # Используем отдельную сессию для получения истории
                from app.database.db import async_session_maker
                async with async_session_maker() as history_db:
                    # Находим последнюю сессию чата
                    session_query = (
                        select(ChatSession)
                        .where(ChatSession.character_id == character_data["id"])
                        .where(ChatSession.user_id == user_id)
                        .order_by(ChatSession.started_at.desc())
                        .limit(1)
                    )
                    session_result = await history_db.execute(session_query)
                    chat_session = session_result.scalar_one_or_none()
                    
                    if chat_session:
                        # Получаем сообщения из истории (с учетом лимита подписки)
                        # Для PREMIUM и STANDARD context_limit = None (без ограничений, обрезка только по токенам)
                        messages_query = (
                            select(ChatMessageDB)
                            .where(ChatMessageDB.session_id == chat_session.id)
                            .order_by(ChatMessageDB.timestamp.asc(), ChatMessageDB.id.asc())  # Сортируем по возрастанию времени и ID
                        )
                        # Применяем лимит только если он установлен (для FREE)
                        if context_limit is not None:
                            messages_query = messages_query.limit(context_limit)
                        messages_result = await history_db.execute(messages_query)
                        db_history_messages = messages_result.scalars().all()
            except Exception as e:
                logger.warning(f"[CONTEXT] Error loading history from DB: {e}, using history from request")
                import traceback
                logger.warning(f"[CONTEXT] Traceback: {traceback.format_exc()}")
        
        # Формируем массив messages для OpenAI API
        openai_messages = []
        
        # 1. Системное сообщение с описанием персонажа (всегда первое)
        # Получаем target_language из запроса (по умолчанию 'ru')
        target_language = request.get("target_language", "ru")
        
        # Формируем языковую инструкцию
        if target_language == "ru":
            language_instruction = "\n\nIMPORTANT: You must write your response STRICTLY in RUSSIAN language. Do not use English."
        elif target_language == "en":
            language_instruction = "\n\nIMPORTANT: You must write your response STRICTLY in ENGLISH language."
        else:
            # По умолчанию русский
            language_instruction = "\n\nIMPORTANT: You must write your response STRICTLY in RUSSIAN language. Do not use English."
        
        # Добавляем языковую инструкцию к промпту персонажа
        system_prompt = character_data["prompt"] + language_instruction
        
        logger.info(f"[LANGUAGE] Target language: {target_language}, instruction added to system prompt")
        
        openai_messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Импортируем фильтр сообщений
        from app.chat_bot.utils.message_filter import should_include_message_in_context
        
        # 2. История диалога из БД (если есть)
        if db_history_messages:
            
            # Сообщения уже отсортированы по возрастанию времени (timestamp.asc), используем их в прямом порядке
            for msg in db_history_messages:
                # Фильтруем промпты от фото и другие нерелевантные сообщения
                if not should_include_message_in_context(msg.content, msg.role):
                    logger.info(f"[CONTEXT] Пропущено сообщение {msg.role}: {msg.content[:100] if msg.content else 'empty'}...")
                    continue
                    
                if msg.role == "user":
                    openai_messages.append({
                        "role": "user",
                        "content": msg.content
                    })
                    logger.debug(f"[CONTEXT] Added user message: {msg.content[:100]}...")
                elif msg.role == "assistant":
                    openai_messages.append({
                        "role": "assistant",
                        "content": msg.content
                    })
                    logger.debug(f"[CONTEXT] Added assistant message: {msg.content[:100]}...")
        # Fallback: используем history из запроса (для обратной совместимости)
        elif history:
            # Для PREMIUM и STANDARD context_limit = None, берем все сообщения
            history_to_process = history if context_limit is None else history[-context_limit:]
            logger.info(f"[CONTEXT] Using history from request: {len(history)} messages, processing {len(history_to_process)}")
            for msg in history_to_process:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                # Фильтруем промпты от фото и другие нерелевантные сообщения
                if not should_include_message_in_context(content, role):
                    logger.info(f"[CONTEXT] Skipped message {role} from history: {content[:100] if content else 'empty'}...")
                    continue
                
                if role == 'user':
                    openai_messages.append({
                        "role": "user",
                        "content": content
                    })
                    logger.debug(f"[CONTEXT] Added user message from history: {content[:100]}...")
                elif role == 'assistant':
                    openai_messages.append({
                        "role": "assistant",
                        "content": content
                    })
                    logger.debug(f"[CONTEXT] Added assistant message from history: {content[:100]}...")
        else:
            logger.info(f"[CONTEXT] Нет истории диалога (ни из БД, ни из запроса)")
        
        # 3. Текущее сообщение пользователя (всегда последнее)
        # НЕ фильтруем текущее сообщение - у пользователя есть отдельная кнопка для генерации изображений
        # Все сообщения в чате предназначены для текстовой модели
        if is_continue_story:
            openai_messages.append({
                "role": "user",
                "content": "continue the story briefly"
            })
        else:
            # Всегда добавляем текущее сообщение пользователя без фильтрации
            openai_messages.append({
                "role": "user",
                "content": message
            })
        
        # 4. Проверяем и обрезаем по лимиту токенов контекста (4000 для STANDARD, 8000 для PREMIUM)
        messages_before_trim = len(openai_messages)
        openai_messages = await trim_messages_to_token_limit(
            openai_messages, 
            max_tokens=max_context_tokens, 
            system_message_index=0
        )
        messages_after_trim = len(openai_messages)
        
        if messages_before_trim != messages_after_trim:
            logger.warning(f"[CONTEXT] Messages trimmed: was {messages_before_trim}, now {messages_after_trim}")
        
        # Короткое логирование: количество сообщений в памяти
        history_count = len(openai_messages) - 1  # -1 для system сообщения
        logger.info(f"[CONTEXT] In memory: {history_count} messages (context limit: {max_context_tokens} tokens)")
        
        # Если запрошен стриминг, возвращаем StreamingResponse
        if use_streaming:
            # Проверяем, что выбор модели доступен только для PREMIUM
            selected_model = None
            if request.get("model") and subscription_type_enum == SubscriptionType.PREMIUM:
                selected_model = request.get("model")
            
            # Создаем асинхронный генератор для SSE
            async def generate_sse_stream() -> AsyncGenerator[str, None]:
                """
                Генерирует SSE события из потока OpenRouter.
                """
                full_response = ""  # Собираем полный ответ для сохранения в БД
                
                try:
                    # Получаем поток от OpenRouter
                    async for chunk in openrouter_service.generate_text_stream(
                        messages=openai_messages,
                        max_tokens=max_tokens,
                        temperature=chat_config.DEFAULT_TEMPERATURE,
                        top_p=chat_config.DEFAULT_TOP_P,
                        presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
                        subscription_type=subscription_type_enum,
                        model=selected_model
                    ):
                        # Проверяем на ошибку
                        if chunk.startswith('{"error"'):
                            error_data = json.loads(chunk)
                            error_msg = error_data.get("error", "Unknown error")
                            
                            if error_msg == "__CONNECTION_ERROR__":
                                yield f"data: {json.dumps({'error': 'Сервис генерации текста недоступен'})}\n\n"
                                return
                            else:
                                yield f"data: {json.dumps({'error': error_msg})}\n\n"
                                return
                        
                        # Отправляем чанк как SSE событие
                        full_response += chunk
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                    
                    # Отправляем маркер завершения
                    yield f"data: {json.dumps({'done': True})}\n\n"
                    
                    # Списываем ресурсы и сохраняем диалог в базу данных после завершения стриминга
                    # Используем фоновую задачу для сохранения, чтобы не блокировать стриминг
                    if full_response:
                        # Определяем, какая модель была использована
                        from app.chat_bot.services.openrouter_service import get_model_for_subscription
                        model_used = selected_model if selected_model else get_model_for_subscription(subscription_type_enum)
                        logger.info(f"[STREAM] Ответ сгенерирован моделью: {model_used} (подписка: {subscription_type_enum.value if subscription_type_enum else 'FREE'}), длина: {len(full_response)} символов")
                        
                        # Подготавливаем данные для сохранения
                        history_message = message if message else ""
                        
                        # Списываем ресурсы в фоне
                        if user_id and coins_user_id is not None:
                            asyncio.create_task(spend_message_resources_async(
                                user_id=coins_user_id,
                                use_credits=use_credits
                            ))
                        
                        # Сохраняем историю в фоне
                        asyncio.create_task(process_chat_history_storage(
                            subscription_type=user_subscription_type,
                            user_id=user_id,
                            character_data=character_data,
                            message=history_message,
                            response=full_response,
                            image_url=None,
                            image_filename=None
                        ))
                    
                except Exception as e:
                    logger.error(f"[STREAM] Ошибка в генераторе SSE: {e}")
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            # Возвращаем StreamingResponse с SSE
            return StreamingResponse(
                generate_sse_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no"  # Отключаем буферизацию в nginx
                }
            )
        
        # Обычный режим без стриминга
        # Генерируем ответ напрямую от модели (ОПТИМИЗИРОВАНО ДЛЯ СКОРОСТИ)
        # max_tokens определяется на основе подписки: STANDARD=200, PREMIUM=450
        # Модель выбирается на основе подписки или из запроса (для PREMIUM)
        # Проверяем, что выбор модели доступен только для PREMIUM
        selected_model = None
        if request.get("model") and subscription_type_enum == SubscriptionType.PREMIUM:
            selected_model = request.get("model")
        
        response = await openrouter_service.generate_text(
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=chat_config.DEFAULT_TEMPERATURE,
            top_p=chat_config.DEFAULT_TOP_P,
            repeat_penalty=chat_config.DEFAULT_REPEAT_PENALTY,
            presence_penalty=chat_config.DEFAULT_PRESENCE_PENALTY,
            subscription_type=subscription_type_enum,
            model=selected_model
        )
        
        # Проверяем ошибку подключения к сервису генерации
        if response == "__CONNECTION_ERROR__":
            raise HTTPException(
                status_code=503,
                detail="Сервис генерации текста недоступен. Проверьте настройки OpenRouter API."
        )
        
        if not response:
            raise HTTPException(
                status_code=500, 
                detail="Не удалось сгенерировать ответ от модели"
            )
        
        # Определяем, какая модель была использована
        from app.chat_bot.services.openrouter_service import get_model_for_subscription
        model_used = selected_model if selected_model else get_model_for_subscription(subscription_type_enum)
        logger.info(f"[OK] /chat: Ответ сгенерирован ({len(response)} символов) моделью: {model_used} (подписка: {subscription_type_enum.value if subscription_type_enum else 'FREE'})")
        
        # КРИТИЧЕСКИ ВАЖНО: Сохраняем ответ модели в БД СРАЗУ после генерации
        # Это нужно для того, чтобы следующий запрос мог использовать этот ответ в контексте
        # Сохраняем только user сообщение здесь, assistant сохраним позже вместе с полной историей
        # Но сначала нужно подготовить данные для сохранения
        # ВАЖНО: history_message будет установлен ПОСЛЕ генерации фото (если нужно)
        # КРИТИЧЕСКИ ВАЖНО: Определяем history_message и history_response сразу после генерации ответа
        history_message = message if message else ""
        history_response = response if response else ""
        logger.info(f"[HISTORY] Определены переменные после генерации: history_message='{history_message[:50] if history_message else 'пустой'}...', history_response='{history_response[:50] if history_response else 'пустой'}...', response_length={len(response) if response else 0}")
        
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
                    
                    # Записываем историю баланса (кредиты подписки, баланс не меняется)
                    try:
                        from app.utils.balance_history import record_balance_change
                        # Получаем текущий баланс пользователя для записи истории
                        from app.models.user import Users
                        from sqlalchemy import select
                        user_result = await db.execute(select(Users).where(Users.id == coins_user_id))
                        user = user_result.scalar_one_or_none()
                        if user:
                            await record_balance_change(
                                db=db,
                                user_id=coins_user_id,
                                amount=-5,
                                reason="Отправка сообщения в чате (кредиты подписки)"
                            )
                    except Exception as e:
                        logger.warning(f"Не удалось записать историю баланса за сообщение (кредиты подписки): {e}")
                    
                    await db.commit()
                    logger.info(
                        "[OK] Списаны кредиты подписки за сообщение пользователя %s",
                        user_id,
                    )
                else:
                    # Списываем монеты (fallback)
                    from app.services.coins_service import CoinsService
                    coins_service = CoinsService(db)
                    coins_spent = await coins_service.spend_coins_for_message(coins_user_id, commit=False)
                    
                    if coins_spent:
                        # Записываем историю баланса
                        try:
                            from app.utils.balance_history import record_balance_change
                            await record_balance_change(
                                db=db,
                                user_id=coins_user_id,
                                amount=-5,
                                reason="Отправка сообщения в чате (fallback)"
                            )
                        except Exception as e:
                            logger.warning(f"Не удалось записать историю баланса: {e}")
                        await db.commit()
                    
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
        
        # ВАЖНО: Обновляем history_message после установки message (если он еще не установлен)
        # message уже установлен выше для случая generate_image
        if not history_message and message:
            history_message = message
            logger.info(f"[HISTORY] Обновлен history_message из message: '{history_message}'")
        
        # КРИТИЧЕСКИ ВАЖНО: Убеждаемся, что history_response установлен
        if not history_response and response:
            history_response = response
            logger.info(f"[HISTORY] Обновлен history_response из response: '{history_response[:50]}...'")
        
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
                            logger.error(f"[ERROR] DEBUG: Недостаточно монет для генерации фото! У пользователя {user_id}: {coins} монет, нужно 10")
                            raise HTTPException(
                                status_code=403, 
                                detail="Недостаточно монет для генерации фото! Нужно 10 монет."
                            )
                        else:
                            logger.info(f"[OK] DEBUG: Пользователь {user_id} может генерировать фото")
                else:
                    logger.warning(f"[WARNING] DEBUG: user_id не передан, пропускаем проверку монет")
                
                # Получаем промпт для изображения
                image_prompt = request.get("image_prompt") or message
                # Сохраняем промпт для истории (будет использован при сохранении)
                history_message = image_prompt if image_prompt else "Генерация изображения"
                
                # Получаем параметры генерации изображения
                image_steps = request.get("image_steps")
                image_width = request.get("image_width") 
                image_height = request.get("image_height")
                image_cfg_scale = request.get("image_cfg_scale")
                
                # Создаем запрос для генерации изображения
                # Получаем model из request если есть, иначе используем дефолт
                image_model = request.get("image_model") or request.get("model") or "anime-realism"
                image_request = ImageGenerationRequest(
                    prompt=image_prompt,
                    character=character_name,
                    steps=image_steps,
                    width=image_width,
                    height=image_height,
                    cfg_scale=image_cfg_scale,
                    model=image_model
                )
                
                # Вызываем существующий эндпоинт генерации изображений через HTTP
                import httpx
                generation_time = None
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
                        generation_time = image_result.get("generation_time")  # Время генерации в секундах
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
            if generation_time is not None:
                result["generation_time"] = generation_time
            logger.info(f"[OK] DEBUG: Добавлено изображение в ответ: {image_url}")
        else:
            logger.warning(f"[WARNING] DEBUG: image_url пустой, изображение не добавлено в ответ")

        # КРИТИЧЕСКИ ВАЖНО: Сохраняем историю чата СРАЗУ после генерации ответа
        # Это гарантирует, что следующий запрос получит полную историю с ответами модели
        # Подготавливаем данные для сохранения
        # КРИТИЧЕСКИ ВАЖНО: Убеждаемся, что history_message и history_response определены
        if 'history_message' not in locals() or not history_message:
            # Если была генерация изображения, используем реальный промпт из image_prompt
            if generate_image and 'image_prompt' in locals() and image_prompt:
                history_message = image_prompt
                logger.info(f"[HISTORY] Используем реальный промпт генерации для истории: '{history_message[:50]}...'")
            else:
                history_message = message if message else "Генерация изображения"
                logger.warning(f"[HISTORY] history_message не был установлен, используем message: '{history_message}'")
        
        if 'history_response' not in locals() or not history_response:
            history_response = response if response else ""
            logger.warning(f"[HISTORY] history_response не был установлен, используем response: '{history_response[:50] if history_response else 'пустой'}...'")
        
        # КРИТИЧЕСКИ ВАЖНО: Проверяем, что character_data содержит все необходимые поля
        if not character_data:
            logger.error(f"[HISTORY] ОШИБКА: character_data отсутствует! Не можем сохранить историю.")
        elif not character_data.get("name"):
            logger.error(f"[HISTORY] ОШИБКА: character_data не содержит 'name'! character_data={character_data}")
        elif not character_data.get("id"):
            logger.warning(f"[HISTORY] ПРЕДУПРЕЖДЕНИЕ: character_data не содержит 'id', попробуем найти по имени. character_data={character_data}")
        
        # КРИТИЧЕСКИ ВАЖНО: Проверяем, что history_response определен
        if 'history_response' not in locals() or history_response is None:
            history_response = response if response else ""
            logger.warning(f"[HISTORY] history_response not defined, using response: '{history_response[:50] if history_response else 'empty'}...'")
        
        logger.info(f"[HISTORY] Saving history: user_id={user_id}, character={character_data.get('name') if character_data else 'N/A'}, user_message='{history_message}' ({len(history_message)} chars), assistant_response={len(history_response)} chars, image_url={bool(cloud_url or image_url)}")
        logger.info(f"[HISTORY] history_message passes filters? >=3: {len(history_message.strip()) >= 3}, <1000: {len(history_message.strip()) < 1000 if history_message else False}")
        logger.info(f"[HISTORY] subscription_type={user_subscription_type}, can_save_history will be checked in process_chat_history_storage")
        logger.info(f"[HISTORY] Check before save: user_id={user_id} (type: {type(user_id).__name__}), character_data={character_data}, character_name={character_data.get('name') if character_data else 'N/A'}")
        
        # Сохраняем историю только если есть user_id и character_data
        if user_id and character_data and character_data.get("name"):
            # Сохраняем историю в фоне через Celery для неблокирующего выполнения
            try:
                from app.tasks.chat_tasks import save_chat_history_async_task
                save_chat_history_async_task.delay(
                    user_id=str(user_id) if user_id else None,
                    character_data=character_data,
                    message=history_message,
                    response=history_response,
                    image_url=cloud_url or image_url,
                    image_filename=image_filename
                )
                logger.info(f"[HISTORY] Задача сохранения истории отправлена в Celery")
            except Exception as celery_error:
                # Fallback: сохраняем синхронно если Celery недоступен
                logger.warning(f"[HISTORY] Celery недоступен, сохраняем синхронно: {celery_error}")
            
            await process_chat_history_storage(
                subscription_type=user_subscription_type,
                user_id=user_id,
                character_data=character_data,
                message=history_message,
                response=history_response,
                image_url=cloud_url or image_url,
                image_filename=image_filename,
                generation_time=generation_time
            )
            logger.info(f"[HISTORY] История успешно сохранена в БД (синхронно)")
        else:
            logger.warning(f"[HISTORY] Пропуск сохранения истории: user_id={user_id}, character_data={character_data}, character_name={character_data.get('name') if character_data else 'N/A'}")

        return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ERROR] /chat: Ошибка: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Импорт уже есть выше в файле

async def generate_image_replicate(settings: GenerationSettings) -> GenerationResponse:
    """
    Генерирует изображение через Replicate API.
    
    Args:
        settings: Настройки генерации
        
    Returns:
        GenerationResponse с результатами генерации
    """
    logger.info("[REPLICATE] Начинаем генерацию через Replicate API")
    
    # Проверяем наличие API токена
    replicate_api_token = os.environ.get("REPLICATE_API_TOKEN")
    if not replicate_api_token:
        raise Exception("REPLICATE_API_TOKEN не установлен в переменных окружения")
    
    # Получаем модель из переменных окружения
    replicate_model = os.environ.get("REPLICATE_MODEL")
    if not replicate_model:
        raise Exception("REPLICATE_MODEL не установлен в переменных окружения")
    
    # Если указана версия и она не найдена, пробуем использовать latest
    # Это поможет избежать ошибок при изменении версий на Replicate
    original_model = replicate_model
    
    # Читаем настройки из конфигурационных файлов
    from app.config.generation_defaults import DEFAULT_GENERATION_PARAMS
    
    # Промпты уже сформированы в эндпоинте, используем их как есть
    # НЕ добавляем дефолтные промпты повторно, чтобы избежать дублирования
    final_prompt = settings.prompt or ""
    final_negative_prompt = settings.negative_prompt or ""
    
    # Обработка размера: парсим settings.size если есть, иначе используем width/height
    width = DEFAULT_GENERATION_PARAMS.get("width", 832)
    height = DEFAULT_GENERATION_PARAMS.get("height", 1216)
    
    # Проверяем, есть ли поле size в settings
    if hasattr(settings, 'size') and settings.size:
        try:
            # Парсим строку вида "832x1216"
            size_parts = str(settings.size).split('x')
            if len(size_parts) == 2:
                width = int(size_parts[0].strip())
                height = int(size_parts[1].strip())
            else:
                logger.warning(f"[REPLICATE] Не удалось распарсить size: {settings.size}, используем дефолтные значения")
        except (ValueError, AttributeError) as e:
            logger.warning(f"[REPLICATE] Ошибка парсинга size: {e}, используем дефолтные значения")
    else:
        # Используем отдельные поля width и height
        width = settings.width or DEFAULT_GENERATION_PARAMS.get("width", 832)
        height = settings.height or DEFAULT_GENERATION_PARAMS.get("height", 1216)
    
    # Получаем параметры из settings или используем дефолтные
    num_inference_steps = settings.steps or DEFAULT_GENERATION_PARAMS.get("steps", 30)
    
    # Проверяем settings.cfg, если нет - используем cfg_scale
    if hasattr(settings, 'cfg') and settings.cfg is not None:
        guidance_scale = settings.cfg
    else:
        guidance_scale = settings.cfg_scale or 7.0
    
    # Обрабатываем seed: -1 означает случайный seed, поэтому передаем None в Replicate
    seed = settings.seed if settings.seed is not None and settings.seed != -1 else None
    
    logger.info(f"[REPLICATE] Параметры: steps={num_inference_steps}, cfg={guidance_scale}, size={width}x{height}, seed={seed}")
    logger.info(f"[REPLICATE] Промпт: {final_prompt[:100]}...")
    
    # Подготавливаем входные параметры для Replicate (только правильные имена параметров)
    input_params = {
        "prompt": final_prompt or "",
        "num_inference_steps": num_inference_steps,
        "guidance_scale": guidance_scale,
        "width": width,
        "height": height,
    }
    
    # Добавляем negative_prompt только если он не пустой
    if final_negative_prompt and final_negative_prompt.strip():
        input_params["negative_prompt"] = final_negative_prompt.strip()
    
    # Добавляем seed только если он задан (если -1, передаем None или случайное число)
    if seed is not None:
        input_params["seed"] = seed
    # Если seed не задан, не передаем его - Replicate сам сгенерирует случайный seed
    
    try:
        # Устанавливаем API токен для Replicate
        # Replicate автоматически использует переменную окружения REPLICATE_API_TOKEN
        # Убеждаемся, что она установлена
        if not os.environ.get("REPLICATE_API_TOKEN"):
            os.environ["REPLICATE_API_TOKEN"] = replicate_api_token
        
        # Вызываем Replicate API
        logger.info(f"[REPLICATE] Вызываем модель: {replicate_model}")
        logger.info(f"[REPLICATE] Параметры запроса: {json.dumps(input_params, indent=2, ensure_ascii=False)}")
        # Обертываем синхронный вызов replicate.run в asyncio.to_thread для неблокирующего выполнения
        output = await asyncio.to_thread(replicate.run, replicate_model, input=input_params)
        
        logger.info(f"[REPLICATE] Получен ответ от Replicate: {type(output)}")
        
        # Обрабатываем разные типы ответов от Replicate
        image_data = None
        
        # Проверяем, является ли это FileOutput (бинарные данные)
        try:
            from replicate.helpers import FileOutput
            if isinstance(output, FileOutput):
                logger.info(
                    "[REPLICATE] Получен FileOutput, "
                    "получаем URL или читаем данные"
                )
                # FileOutput может иметь атрибут url для получения URL
                if hasattr(output, 'url') and output.url:
                    # Используем URL если доступен
                    url_str = str(output.url)
                    logger.info(
                        f"[REPLICATE] FileOutput имеет URL: {url_str}"
                    )
                    image_data = None  # Будем загружать по URL
                elif hasattr(output, 'read'):
                    # Читаем бинарные данные напрямую
                    try:
                        image_data = output.read()
                        if isinstance(image_data, bytes):
                            logger.info(
                                f"[REPLICATE] Прочитано {len(image_data)} байт "
                                f"из FileOutput"
                            )
                        else:
                            # Если read() вернул не bytes, пробуем получить URL
                            image_data = None
                    except Exception as read_error:
                        logger.warning(
                            f"[REPLICATE] Ошибка чтения FileOutput: {read_error}, "
                            f"пробуем получить URL"
                        )
                        image_data = None
                else:
                    # Пробуем получить URL через другие методы
                    image_data = None
        except ImportError:
            # Модуль replicate.helpers может быть недоступен
            pass
        except Exception as e:
            logger.warning(
                f"[REPLICATE] Ошибка при обработке FileOutput: {e}, "
                f"пробуем обработать как URL"
            )
        
        # Если не FileOutput или FileOutput без бинарных данных, обрабатываем как URL
        if image_data is None:
            # Replicate возвращает список URL или один URL
            image_urls = []
            
            # Проверяем FileOutput с URL
            try:
                from replicate.helpers import FileOutput
                if isinstance(output, FileOutput):
                    if hasattr(output, 'url') and output.url:
                        url_str = str(output.url)
                        if url_str.startswith('http'):
                            image_urls = [url_str]
                        else:
                            logger.warning(
                                f"[REPLICATE] FileOutput.url не является URL: "
                                f"{url_str[:100]}"
                            )
            except (ImportError, AttributeError, TypeError) as e:
                logger.debug(
                    f"[REPLICATE] Не удалось получить URL из FileOutput: {e}"
                )
            
            # Если не FileOutput, обрабатываем как обычный ответ
            if not image_urls:
                if isinstance(output, list):
                    image_urls = output
                elif isinstance(output, str):
                    image_urls = [output]
                else:
                    # Если это итератор или другой тип
                    if hasattr(output, '__iter__'):
                        image_urls = list(output)
                    else:
                        # Пробуем получить строковое представление
                        output_str = str(output)
                        # Проверяем, является ли это URL
                        if output_str.startswith('http'):
                            image_urls = [output_str]
                        else:
                            raise Exception(
                                f"Replicate API вернул неожиданный тип: "
                                f"{type(output)}"
                            )
            
            if not image_urls:
                raise Exception("Replicate API не вернул изображения")
            
            # Загружаем первое изображение
            first_image_url = image_urls[0]
            
            # Убеждаемся, что это строка, а не bytes
            if isinstance(first_image_url, bytes):
                # Если это бинарные данные PNG, используем их напрямую
                if first_image_url.startswith(b'\x89PNG'):
                    logger.info(
                        "[REPLICATE] Получены бинарные данные PNG, "
                        "используем напрямую"
                    )
                    image_data = first_image_url
                else:
                    raise Exception(
                        "Получены бинарные данные вместо URL. "
                        "Проверьте обработку FileOutput."
                    )
            else:
                # Это строка URL
                logger.info(
                    f"[REPLICATE] Загружаем изображение с URL: {first_image_url}"
                )
                response = requests.get(first_image_url, timeout=60)
                response.raise_for_status()
                image_data = response.content
        
        # Конвертируем в PIL Image
        image = Image.open(BytesIO(image_data))
        
        # Конвертируем в base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")
        
        # Сохраняем на диск для отладки (опционально)
        output_path = Path("replicate_output.png")
        image.save(str(output_path))
        logger.info(f"[REPLICATE] Изображение сохранено: {output_path}")
        
        # Формируем информацию о генерации
        info_dict = {
            "seed": seed if seed is not None else -1,
            "steps": num_inference_steps,
            "model": replicate_model,
            "width": width,
            "height": height,
            "guidance_scale": guidance_scale
        }
        
        # Создаем GenerationResponse
        result = GenerationResponse(
            images=[img_base64],
            image_data=[img_bytes],
            parameters=input_params,
            info=json.dumps(info_dict),
            seed=seed if seed is not None else -1,
            saved_paths=[str(output_path)],
            cloud_urls=[first_image_url]
        )
        
        logger.info("[REPLICATE] Генерация успешно завершена")
        return result
        
    except ModelError as e:
        # Специальная обработка ошибок модели на Replicate
        error_detail = str(e)
        logger.error(f"[REPLICATE] Ошибка модели: {error_detail}")
        
        # Пытаемся получить дополнительную информацию об ошибке
        error_info = {}
        if hasattr(e, 'prediction'):
            prediction = e.prediction
            if hasattr(prediction, 'error'):
                error_info['prediction_error'] = prediction.error
            if hasattr(prediction, 'status'):
                error_info['prediction_status'] = prediction.status
            if hasattr(prediction, 'logs'):
                error_info['prediction_logs'] = prediction.logs
        
        logger.error(f"[REPLICATE] Детали ошибки модели: {json.dumps(error_info, indent=2, ensure_ascii=False)}")
        
        # Формируем понятное сообщение об ошибке
        if error_info.get('prediction_error'):
            error_message = (
                f"Ошибка при выполнении модели на Replicate: {error_info.get('prediction_error')}. "
                f"Проверьте логи модели и параметры запроса."
            )
        else:
            error_message = (
                f"Ошибка при выполнении модели на Replicate: {error_detail}. "
                f"Возможно, модель не смогла обработать переданные параметры. "
                f"Проверьте правильность параметров запроса."
            )
        
        raise HTTPException(
            status_code=500,
            detail=error_message
        )
    except ReplicateError as e:
        # Специальная обработка ошибок Replicate API
        error_detail = str(e)
        error_status = getattr(e, 'status', None) or (str(e) if hasattr(e, '__str__') else '')
        logger.error(f"[REPLICATE] Ошибка Replicate API: {error_detail}")
        logger.error(f"[REPLICATE] Статус ошибки: {error_status}")
        
        # Проверяем тип ошибки
        if "Insufficient credit" in error_detail or "402" in str(error_status):
            error_message = (
                "Недостаточно кредитов на аккаунте Replicate. "
                "Пожалуйста, пополните баланс на https://replicate.com/account/billing#billing "
                "и подождите несколько минут перед повторной попыткой."
            )
            logger.error(f"[REPLICATE] {error_message}")
            raise HTTPException(
                status_code=402,
                detail=error_message
            )
        elif "404" in str(error_status) or "not found" in error_detail.lower() or "could not be found" in error_detail.lower():
            error_message = (
                f"Модель не найдена на Replicate. "
                f"Проверьте правильность указания модели в переменной окружения REPLICATE_MODEL. "
                f"Текущее значение: {replicate_model}. "
                f"Формат должен быть: 'owner/model-name' или 'owner/model-name:version-id'. "
                f"Проверьте модель на https://replicate.com/{replicate_model.split('/')[0] if '/' in replicate_model else ''}"
            )
            logger.error(f"[REPLICATE] {error_message}")
            raise HTTPException(
                status_code=404,
                detail=error_message
            )
        else:
            # Другие ошибки Replicate
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка Replicate API: {error_detail}"
            )
    except Exception as e:
        logger.error(f"[REPLICATE] Ошибка при генерации: {str(e)}")
        logger.error(f"[REPLICATE] Трейсбек: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка генерации изображения: {str(e)}"
        )


@app.post("/api/v1/generate-image/")
async def generate_image(
    request: ImageGenerationRequest,
    current_user: Users = Depends(get_current_user_optional)
):
    """
    Генерация изображения для чата (синхронная генерация).
    Возвращает image_url и cloud_url сразу после генерации.

    Args:
        request (ImageGenerationRequest): Запрос с параметрами генерации.
        current_user: Текущий пользователь (опционально).

    Returns:
        dict: Результат с image_url и cloud_url.
    """
    import traceback
    # КРИТИЧЕСКАЯ ПРОВЕРКА: Если вы видите этот лог, значит новый код выполняется
    print("=" * 80)
    print("[GENERATE IMAGE] ========== НАЧАЛО ГЕНЕРАЦИИ ФОТО ==========")
    print(f"[GENERATE IMAGE] POST /api/v1/generate-image/")
    logger.info("=" * 80)
    logger.info("[GENERATE IMAGE] ========== НАЧАЛО ГЕНЕРАЦИИ ФОТО ==========")
    logger.info(f"[GENERATE IMAGE] POST /api/v1/generate-image/")
    logger.info(f"[GENERATE IMAGE] User: {current_user.email if current_user else 'Anonymous'} (ID: {current_user.id if current_user else 'N/A'})")
    logger.info(f"[GENERATE IMAGE] Character: {request.character}")
    logger.info(f"[GENERATE IMAGE] Steps: {request.steps}, CFG: {request.cfg_scale}, Size: {request.width}x{request.height}, Model: {request.model}")
    logger.info(f"[GENERATE IMAGE] Промпт (полный): {request.prompt}")
    logger.info(f"[GENERATE IMAGE] Negative prompt: {request.negative_prompt}")
    logger.info(f"[GENERATE IMAGE] Use default prompts: {request.use_default_prompts}")
    logger.info(f"[GENERATE IMAGE] Тип модели: {type(request.model)}, Значение: {repr(request.model)}")
    print(f"[GENERATE IMAGE] User: {current_user.email if current_user else 'Anonymous'} (ID: {current_user.id if current_user else 'N/A'})")
    print(f"[GENERATE IMAGE] Character: {request.character}")
    print(f"[GENERATE IMAGE] Промпт: {request.prompt}")
    # Проверяем валидность модели
    valid_models = ["anime", "anime-realism", "realism"]
    if request.model and request.model not in valid_models:
        logger.error(f"[ENDPOINT IMG] ОШИБКА: Недопустимая модель '{request.model}'. Допустимые значения: {valid_models}")
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимая модель '{request.model}'. Допустимые значения: {valid_models}"
        )
    logger.info(f"[ENDPOINT IMG] ========================================")
    
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
        user_id = current_user.id if current_user else request.user_id
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
                    logger.error(f"[ERROR] DEBUG: Недостаточно монет для генерации фото! У пользователя {user_id}: {coins} монет, нужно 10")
                    raise HTTPException(
                        status_code=403, 
                        detail="Недостаточно монет для генерации фото! Нужно 10 монет."
                    )
                else:
                    logger.info(f"[OK] DEBUG: Пользователь {user_id} может генерировать фото")
        else:
            logger.warning(f"[WARNING] DEBUG: user_id не передан в эндпоинте generate-image")
        # Логируем информацию о модели перед генерацией
        try:
            import sys
            from pathlib import Path
            webui_path = Path(__file__).parent.parent / "stable-diffusion-webui"
            if webui_path.exists():
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

        # Проверяем наличие переменных окружения для RunPod
        if not os.environ.get("RUNPOD_API_KEY"):
            raise HTTPException(
                status_code=500,
                detail="RUNPOD_API_KEY не установлен в переменных окружения. Настрой RunPod в .env файле."
            )
        if not os.environ.get("RUNPOD_URL"):
            raise HTTPException(
                status_code=500,
                detail="RUNPOD_URL не установлен в переменных окружения. Настрой RunPod в .env файле."
            )

        # Получаем данные персонажа для внешности
        # Если use_default_prompts=False - НЕ используем дефолтного персонажа!
        if request.use_default_prompts:
            character_name = request.character or "anna"  # Дефолт только если use_default_prompts=True
        else:
            character_name = request.character  # Для тестов - только если явно передан
        
        # Сохраняем данные персонажа для сохранения истории
        character_data_for_history = None
        
        # Сначала пытаемся получить данные из базы данных
        character_appearance = None
        character_location = None
        
        # Пропускаем загрузку, если character_name не задан (тестовый режим)
        if character_name:
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
                        # Сохраняем данные персонажа для истории
                        character_data_for_history = {
                            "name": db_character.name,
                            "prompt": db_character.prompt,
                            "id": db_character.id
                        }
                        logger.info(f"[OK] Данные персонажа '{character_name}' получены из БД")
                    else:
                        # Если в БД нет, пытаемся получить из файлов
                        character_data = get_character_data(character_name)
                        if character_data:
                            character_appearance = character_data.get("character_appearance")
                            character_location = character_data.get("location")
                            # Сохраняем данные персонажа для истории
                            character_data_for_history = {
                                "name": character_name,
                                "prompt": character_data.get("prompt", ""),
                                "id": None
                            }
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
                    # Сохраняем данные персонажа для истории
                    character_data_for_history = {
                        "name": character_name,
                        "prompt": character_data.get("prompt", ""),
                        "id": None
                    }
                    logger.info(f"[OK] Fallback: данные персонажа '{character_name}' получены из файлов")
                else:
                    logger.error(f"[ERROR] Персонаж '{character_name}' не найден")
                    raise HTTPException(status_code=404, detail=f"Персонаж '{character_name}' не найден")
        else:
            logger.info("[TEST] character_name=None - пропускаем загрузку персонажа")
        # Импортируем настройки по умолчанию
        from app.config.generation_defaults import get_generation_params
        
        # Получаем настройки по умолчанию
        default_params = get_generation_params("default")
        logger.info(f"🚨 MAIN.PY: request.steps = {request.steps}")
        logger.info(f"🚨 MAIN.PY: default_params.get('steps') = {default_params.get('steps')}")
        
        # Создаем настройки генерации с использованием значений по умолчанию
        # ВАЖНО: Если seed не указан или равен -1, передаем None для рандомизации
        seed_value = None
        if request.seed is not None:
            if request.seed == -1:
                seed_value = None  # Будет рандомизирован в start_generation
            else:
                seed_value = request.seed
        # Если request.seed is None, seed_value остается None (будет рандомизирован)
        
        generation_settings = GenerationSettings(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=seed_value,
            steps=request.steps or default_params.get("steps"),  # Используем steps из запроса или дефолтное значение
            width=request.width or default_params.get("width"),
            height=request.height or default_params.get("height"),
            cfg_scale=request.cfg_scale or default_params.get("cfg_scale"),
            sampler_name=request.sampler_name or default_params.get("sampler_name"),
            model=getattr(request, 'model', None) or "anime-realism",  # Модель из запроса или дефолт
            batch_size=default_params.get("batch_size", 1),
            n_iter=default_params.get("n_iter", 1),
            save_grid=default_params.get("save_grid", False),
            enable_hr=default_params.get("enable_hr", False),
            denoising_strength=default_params.get("denoising_strength", 0.4),
            hr_scale=default_params.get("hr_scale", 1.5),
            hr_upscaler=default_params.get("hr_upscaler", "SwinIR_4x"),
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
            "model": getattr(request, 'model', None) or "anime-realism",
            "seed": request.seed or default_params.get("seed"),
            "steps": request.steps or default_params.get("steps"),
            "width": request.width or default_params.get("width"),
            "height": request.height or default_params.get("height"),
            "cfg_scale": request.cfg_scale or default_params.get("cfg_scale"),
            "sampler_name": request.sampler_name or default_params.get("sampler_name"),
        })
        full_settings_for_logging["negative_prompt"] = generation_settings.negative_prompt
        
        # Если пришел custom_prompt, используем его как есть (без добавления данных персонажа)
        if request.custom_prompt and request.custom_prompt.strip():
            logger.info(f"[CUSTOM_PROMPT] Используем отредактированный промпт от пользователя: {request.custom_prompt[:100]}...")
            generation_settings.prompt = request.custom_prompt.strip()
            # Переводим custom_prompt на английский если нужно
            try:
                import re
                has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', generation_settings.prompt))
                if has_cyrillic:
                    from deep_translator import GoogleTranslator
                    translator = GoogleTranslator(source='ru', target='en')
                    # Разбиваем длинный текст на части для более надежного перевода
                    # Разделяем по переносам строк или запятым, если текст очень длинный
                    prompt_text = generation_settings.prompt
                    if len(prompt_text) > 4000:
                        # Если текст очень длинный, разбиваем по переносам строк
                        parts = prompt_text.split('\n')
                        translated_parts = []
                        for part in parts:
                            if part.strip():
                                if bool(re.search(r'[а-яёА-ЯЁ]', part)):
                                    translated_part = translator.translate(part)
                                    translated_parts.append(translated_part)
                                else:
                                    # Если часть уже на английском, оставляем как есть
                                    translated_parts.append(part)
                        generation_settings.prompt = '\n'.join(translated_parts)
                    else:
                        generation_settings.prompt = translator.translate(prompt_text)
                    logger.info(f"[CUSTOM_PROMPT] Промпт переведен на английский: {generation_settings.prompt[:100]}...")
            except (ImportError, Exception) as translate_error:
                logger.error(f"[TRANSLATE] Ошибка перевода custom_prompt: {translate_error}")
        else:
            # Обычная логика: добавляем внешность и локацию персонажа в промпт ТОЛЬКО если use_default_prompts=True
            prompt_parts = []
            
            if request.use_default_prompts and character_appearance:
                # Очищаем от переносов строк
                clean_appearance = character_appearance.replace('\n', ', ')
                clean_appearance = ', '.join([p.strip() for p in clean_appearance.split(',') if p.strip()])
                
                # Переводим на английский
                try:
                    import re
                    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', clean_appearance))
                    if has_cyrillic:
                        from deep_translator import GoogleTranslator
                        translator = GoogleTranslator(source='ru', target='en')
                        clean_appearance = translator.translate(clean_appearance)
                except (ImportError, Exception) as translate_error:
                    logger.error(f"[TRANSLATE] Ошибка перевода внешности: {translate_error}")
                
                logger.info(f"👤 Добавляем внешность персонажа: {clean_appearance[:100]}...")
                prompt_parts.append(clean_appearance)
                full_settings_for_logging["character_appearance"] = clean_appearance
            
            if request.use_default_prompts and character_location:
                # Очищаем от переносов строк и других пробельных символов
                clean_location = character_location.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                # Убираем множественные пробелы
                clean_location = ' '.join(clean_location.split())
                # Разбиваем по запятым и очищаем каждую часть
                clean_location = ', '.join([p.strip() for p in clean_location.split(',') if p.strip()])
                
                # Переводим на английский
                try:
                    import re
                    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', clean_location))
                    if has_cyrillic:
                        from deep_translator import GoogleTranslator
                        translator = GoogleTranslator(source='ru', target='en')
                        clean_location = translator.translate(clean_location)
                except (ImportError, Exception) as translate_error:
                    logger.error(f"[TRANSLATE] Ошибка перевода локации: {translate_error}")
                
                logger.info(f"🏠 Добавляем локацию персонажа: {clean_location[:100]}...")
                prompt_parts.append(clean_location)
                full_settings_for_logging["character_location"] = clean_location
        
        # Негативный промпт (стандартные позитивные промпты убраны)
        from app.config.default_prompts import get_default_negative_prompts
        
        if request.use_default_prompts:
            default_negative_prompts = get_default_negative_prompts() or ""
            if not request.negative_prompt and default_negative_prompts:
                logger.info("[NOTE] Используем стандартный негативный промпт")
                generation_settings.negative_prompt = default_negative_prompts
            elif request.negative_prompt:
                generation_settings.negative_prompt = request.negative_prompt
            else:
                generation_settings.negative_prompt = ""
        else:
            # Для тестов - только базовый негативный или пользовательский
            generation_settings.negative_prompt = request.negative_prompt or "lowres, bad quality"
        
        # Формируем финальный промпт (БЕЗ стандартных позитивных промптов)
        # Только если НЕ использовался custom_prompt
        if not (request.custom_prompt and request.custom_prompt.strip()):
            if request.use_default_prompts:
                # Обычный режим: данные персонажа + пользовательский промпт (БЕЗ стандартных промптов)
                final_prompt_parts = []
                
                # 1. Пользовательский промпт (СНАЧАЛА!)
                if generation_settings.prompt:
                    # Очищаем от переносов строк
                    clean_user_prompt = generation_settings.prompt.replace('\n', ', ')
                    clean_user_prompt = ', '.join([p.strip() for p in clean_user_prompt.split(',') if p.strip()])
                    final_prompt_parts.append(clean_user_prompt)
                
                # 2. Данные персонажа (если есть)
                if prompt_parts:
                    final_prompt_parts.extend(prompt_parts)
                
                # Объединяем все части (БЕЗ стандартных промптов)
                enhanced_prompt = ", ".join(final_prompt_parts)
                generation_settings.prompt = enhanced_prompt or (generation_settings.prompt or "")
            else:
                # Тестовый режим: ТОЛЬКО пользовательский промпт БЕЗ изменений
                # Но всё равно очищаем от \n
                generation_settings.prompt = generation_settings.prompt.replace('\n', ', ')
                generation_settings.prompt = ', '.join([p.strip() for p in generation_settings.prompt.split(',') if p.strip()])
                logger.info(f"[TEST] Финальный промпт (чистый): {generation_settings.prompt}")
                enhanced_prompt = generation_settings.prompt  # Для логирования
        
        # ВАЖНО: Переводим промпт с русского на английский перед генерацией
        if generation_settings.prompt:
            try:
                import re
                has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', generation_settings.prompt))
                
                if has_cyrillic:
                    from deep_translator import GoogleTranslator
                    translator = GoogleTranslator(source='ru', target='en')
                    original_prompt = generation_settings.prompt
                    generation_settings.prompt = translator.translate(original_prompt)
                    logger.debug(f"[TRANSLATE] Промпт переведен: '{original_prompt[:50]}...' -> '{generation_settings.prompt[:50]}...'")
            except ImportError:
                logger.error("[TRANSLATE] deep_translator не установлен! Установите: pip install deep-translator")
                raise HTTPException(
                    status_code=500,
                    detail="Ошибка перевода промпта: библиотека deep-translator не установлена"
                )
            except Exception as translate_error:
                logger.error(f"[TRANSLATE] Ошибка перевода промпта: {translate_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Ошибка перевода промпта: {str(translate_error)}"
                )
        
        # ВАЖНО: Удаляем дубликаты из финального промпта
        from app.config.default_prompts import deduplicate_prompt
        generation_settings.prompt = deduplicate_prompt(generation_settings.prompt)
        enhanced_prompt = generation_settings.prompt  # Обновляем для логирования
        
        logger.info(f"[PROMPT] Финальный промпт после дедупликации ({len(generation_settings.prompt)} символов)")
        
        # Обновляем промпт в настройках для логирования
        full_settings_for_logging["prompt"] = enhanced_prompt
        
        # Генерация изображения через RunPod API
        logger.info(f"[GENERATE] =========================================")
        logger.info(f"[GENERATE] === ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ ЧЕРЕЗ RUNPOD ===")
        logger.info(f"[GENERATE] Начинаем генерацию изображения (user_id={user_id})")
        logger.info(f"[GENERATE] =========================================")
        
        try:
            from app.services.runpod_client import start_generation
            import httpx
            import time
            
            # Засекаем время начала генерации
            start_time = time.time()
            
            logger.info(f"[GENERATE] Запускаем асинхронную генерацию через RunPod: character={character_name}, steps={generation_settings.steps}")
            
            # ВАЖНО: Запускаем задачу и сразу возвращаем task_id, не ждём завершения
            # Это позволяет другим пользователям генерировать изображения параллельно
            async with httpx.AsyncClient() as client:
                try:
                    # Запускаем генерацию и получаем job_id
                    selected_model = getattr(generation_settings, 'model', None) or (getattr(request, 'model', None) or "anime-realism")
                    # Определяем какой URL будет использован для логирования
                    if selected_model == "anime-realism":
                        url_info = "RUNPOD_URL_2 (Аниме реализм)"
                    elif selected_model == "realism":
                        url_info = "RUNPOD_URL_3 (Реализм)"
                    else:
                        url_info = "RUNPOD_URL (Аниме)"
                    logger.info(f"[GENERATE] 🎯 Выбранная модель: '{selected_model}' -> будет использован {url_info}")
                    # Подготавливаем seed для передачи
                    # Если seed не указан или равен -1, передаем None, чтобы start_generation сгенерировал случайный seed
                    seed_to_send = None
                    if generation_settings.seed is not None and generation_settings.seed != -1:
                        seed_to_send = generation_settings.seed
                    logger.info(f"[GENERATE] 🎲 Seed из запроса: {generation_settings.seed}, seed для отправки: {seed_to_send} (будет рандомизирован если None)")
                    
                    job_id, runpod_url_base = await start_generation(
                        client=client,
                        user_prompt=generation_settings.prompt,
                        width=generation_settings.width,
                        height=generation_settings.height,
                        steps=generation_settings.steps,
                        cfg_scale=generation_settings.cfg_scale,
                        seed=seed_to_send,  # None или -1 будут обработаны в start_generation для генерации случайного seed
                        sampler_name=generation_settings.sampler_name,
                        negative_prompt=generation_settings.negative_prompt,
                        use_enhanced_prompts=False,  # Мы уже обработали промпты выше
                        lora_scale=default_params.get("lora_scale", 0.5),  # Dramatic Lighting LoRA
                        model=selected_model
                    )
                    
                    print("=" * 80)
                    print(f"[GENERATE IMAGE] ✅ ЗАДАЧА ЗАПУЩЕНА НА RUNPOD")
                    print(f"[GENERATE IMAGE] Job ID: {job_id}, Модель: {selected_model}")
                    print("=" * 80)
                    logger.info("=" * 80)
                    logger.info(f"[GENERATE IMAGE] ✅ ЗАДАЧА ЗАПУЩЕНА НА RUNPOD")
                    logger.info(f"[GENERATE IMAGE] Job ID: {job_id}")
                    logger.info(f"[GENERATE IMAGE] Модель: {selected_model}")
                    logger.info(f"[GENERATE IMAGE] URL: {url_info}")
                    logger.info("=" * 80)
                    # Seed уже залогирован в start_generation с сообщением "Generating random seed: {seed}"
                    
                    # ВАЖНО: Тратим монеты СРАЗУ при запуске задачи, а не при завершении
                    # Это предотвращает злоупотребление (если пользователь отменит задачу, монеты уже списаны)
                    if user_id:
                        from app.services.coins_service import CoinsService
                        from app.database.db import async_session_maker
                        from app.chat_bot.api.character_endpoints import PHOTO_GENERATION_COST
                        
                        async with async_session_maker() as db:
                            coins_service = CoinsService(db)
                            await coins_service.spend_coins(user_id, PHOTO_GENERATION_COST, commit=False)
                            
                            # Записываем историю баланса
                            try:
                                from app.utils.balance_history import record_balance_change
                                character_name_for_history = character_data_for_history.get("name", "неизвестный") if character_data_for_history else "неизвестный"
                                await record_balance_change(
                                    db=db,
                                    user_id=user_id,
                                    amount=-PHOTO_GENERATION_COST,
                                    reason=f"Генерация фото для персонажа '{character_name_for_history}'"
                                )
                            except Exception as e:
                                logger.warning(f"Не удалось записать историю баланса: {e}")
                            
                            await db.commit()
                            logger.info(f"[COINS] Списано {PHOTO_GENERATION_COST} монет за запуск генерации для user_id={user_id}")
                    
                    # КРИТИЧЕСКИ ВАЖНО: Сохраняем метаданные генерации в Redis для сохранения истории после завершения
                    if user_id and character_data_for_history:
                        try:
                            from app.utils.redis_cache import cache_set
                            from app.database.db import async_session_maker
                            from app.models.image_generation_history import ImageGenerationHistory
                            import json
                            
                            generation_metadata = {
                                "user_id": user_id,
                                "character_name": character_data_for_history.get("name"),
                                "character_id": character_data_for_history.get("id"),
                                "prompt": request.prompt,
                                "task_id": job_id,
                                "runpod_url_base": runpod_url_base,  # Сохраняем для правильной проверки статуса
                                "model": selected_model,  # Сохраняем модель для отладки
                                "created_at": time.time()  # Время запуска задачи для оценки прогресса
                            }
                            
                            # ВАЖНО: Сохраняем метаданные в БД сразу (fallback на случай если Redis недоступен)
                            # Это гарантирует, что история будет сохранена даже без Redis
                            async with async_session_maker() as fallback_db:
                                try:
                                    # Сохраняем runpod_url_base и model в prompt как JSON для восстановления при проверке статуса
                                    import json
                                    prompt_with_metadata = json.dumps({
                                        "prompt": request.prompt,
                                        "runpod_url_base": runpod_url_base,
                                        "model": selected_model
                                    }, ensure_ascii=False)
                                    
                                    # Создаем временную запись с пустым image_url (будет обновлена при завершении)
                                    temp_entry = ImageGenerationHistory(
                                        user_id=user_id,
                                        character_name=character_data_for_history.get("name"),
                                        prompt=prompt_with_metadata,  # Сохраняем метаданные в JSON
                                        image_url=f"pending:{job_id}",  # Временный маркер
                                        task_id=job_id
                                    )
                                    fallback_db.add(temp_entry)
                                    await fallback_db.commit()
                                    logger.info(f"[HISTORY] OK Метаданные сохранены в БД для task_id={job_id}: user_id={user_id}, character={character_data_for_history.get('name')}, runpod_url_base={runpod_url_base}, model={selected_model}")
                                except Exception as db_error:
                                    logger.error(f"[HISTORY] Ошибка сохранения метаданных в БД: {db_error}")
                                    import traceback
                                    logger.error(f"[HISTORY] Трейсбек: {traceback.format_exc()}")
                                    await fallback_db.rollback()
                            
                            # Дополнительно сохраняем в Redis для быстрого доступа
                            cache_saved = await cache_set(f"generation:{job_id}", generation_metadata, ttl_seconds=3600)
                            if cache_saved:
                                logger.info(f"[HISTORY] OK Метаданные также сохранены в Redis для task_id={job_id}")
                            else:
                                logger.warning(f"[HISTORY] Redis недоступен, но метаданные уже в БД для task_id={job_id}")
                        except Exception as cache_error:
                            logger.error(f"[HISTORY] Критическая ошибка сохранения метаданных: {cache_error}")
                            import traceback
                            logger.error(f"[HISTORY] Трейсбек: {traceback.format_exc()}")
                    
                    # Логируем seed, который был использован для генерации
                    # Seed уже залогирован в runpod_client.py, но добавим здесь для удобства
                    logger.info(f"[GENERATE] OK Задача запущена: job_id={job_id}, seed будет залогирован в runpod_client")
                    
                    # Возвращаем task_id сразу, фронтенд будет опрашивать статус
                    # Это позволяет другим пользователям генерировать изображения параллельно
                    return {
                        "task_id": job_id,
                        "status_url": f"/api/v1/generation-status/{job_id}",
                        "success": True,
                        "message": "Генерация запущена, используйте task_id для проверки статуса"
                    }
                    
                except Exception as gen_error:
                    print("=" * 80)
                    print(f"[GENERATE IMAGE] ❌ ОШИБКА ПРИ ЗАПУСКЕ ГЕНЕРАЦИИ")
                    print(f"[GENERATE IMAGE] {str(gen_error)}")
                    print(traceback.format_exc())
                    print("=" * 80)
                    logger.error("=" * 80)
                    logger.error(f"[GENERATE IMAGE] ❌ ОШИБКА ПРИ ЗАПУСКЕ ГЕНЕРАЦИИ")
                    logger.error(f"[GENERATE IMAGE] Ошибка: {str(gen_error)}")
                    logger.error(f"[GENERATE IMAGE] Тип ошибки: {type(gen_error).__name__}")
                    import traceback
                    logger.error(f"[GENERATE IMAGE] Трейсбек:")
                    logger.error(traceback.format_exc())
                    logger.error("=" * 80)
                    raise
                
        except Exception as e:
            logger.error(f"[GENERATE] =========================================")
            logger.error(f"[GENERATE] ОШИБКА в генерации: {e}")
            import traceback
            logger.error(f"[GENERATE] Трейсбек: {traceback.format_exc()}")
            logger.error(f"[GENERATE] =========================================")
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка генерации изображения: {str(e)}"
            )
        
    except HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response else 502
        detail = f"Сервис Stable Diffusion вернул ошибку {status_code}"
        logger.error(f"[ERROR] Ошибка Stable Diffusion API: {detail}")
        raise HTTPException(status_code=502, detail=detail)
    except HTTPException as exc:
        raise exc
    except Exception as e:
        logger.error(f"[GENERATE] =========================================")
        logger.error(f"[GENERATE] КРИТИЧЕСКАЯ ОШИБКА в endpoint: {e}")
        import traceback
        logger.error(f"[GENERATE] Трейсбек: {traceback.format_exc()}")
        logger.error(f"[GENERATE] =========================================")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации изображения: {str(e)}")


@app.get("/api/v1/generation-stream/{task_id}")
async def stream_generation_status(
    task_id: str,
    current_user: Optional[Users] = Depends(get_current_user_optional)
):
    """
    Server-Sent Events (SSE) эндпоинт для получения статуса генерации в реальном времени.
    Поддерживает как Celery task_id, так и RunPod job_id.
    
    Args:
        task_id: ID задачи Celery или RunPod job_id
        
    Returns:
        StreamingResponse: SSE поток с событиями статуса
    """
    from app.celery_app import celery_app
    import json
    import re
    import httpx
    
    # Проверяем, является ли это RunPod job_id (формат: UUID с дефисами)
    runpod_job_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[0-9a-f]+)?$', re.IGNORECASE)
    is_runpod_job = runpod_job_pattern.match(task_id)
    
    async def event_generator():
        """Генератор событий SSE"""
        last_status = None
        max_wait_time = 600  # Максимум 10 минут (увеличено для RunPod)
        check_interval = 2.0 if is_runpod_job else 0.5  # Для RunPod проверяем реже (каждые 2 сек)
        elapsed_time = 0
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        try:
            if is_runpod_job:
                # Это RunPod job_id - проверяем статус через RunPod API
                logger.info(f"[SSE RUNPOD] Начинаем отслеживание RunPod job: {task_id}")
                from app.services.runpod_client import check_status
                
                async with httpx.AsyncClient() as client:
                    while elapsed_time < max_wait_time:
                        try:
                            # Проверяем статус через RunPod API
                            status_response = await check_status(client, task_id)
                            consecutive_errors = 0  # Сбрасываем счетчик ошибок при успехе
                            
                            status = status_response.get("status")
                            
                            # Отправляем событие только если статус изменился
                            if status != last_status:
                                last_status = status
                                
                                if status == "COMPLETED":
                                    output = status_response.get("output", {})
                                    image_url = output.get("image_url")
                                    generation_time = output.get("generation_time")
                                    
                                    if image_url:
                                        # Конвертируем URL через прокси
                                        from app.services.yandex_storage import YandexCloudStorageService
                                        image_url = YandexCloudStorageService.convert_yandex_url_to_proxy(image_url)
                                        
                                        result = {
                                            "image_url": image_url,
                                            "cloud_url": image_url,
                                            "success": True
                                        }
                                        if generation_time is not None:
                                            result["generation_time"] = generation_time
                                        
                                        event_data = {
                                            "status": "SUCCESS",
                                            "message": "Генерация завершена успешно",
                                            "data": result
                                        }
                                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                        logger.info(f"[SSE RUNPOD] Генерация завершена: {image_url}")
                                        break
                                    else:
                                        event_data = {
                                            "status": "PROGRESS",
                                            "message": "Генерация завершена, обработка результата..."
                                        }
                                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                
                                elif status == "FAILED":
                                    error = status_response.get("error", "Unknown error")
                                    event_data = {
                                        "status": "FAILURE",
                                        "message": "Ошибка при генерации изображения",
                                        "error": error
                                    }
                                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                    logger.error(f"[SSE RUNPOD] Генерация завершилась с ошибкой: {error}")
                                    break
                                
                                elif status == "CANCELLED":
                                    event_data = {
                                        "status": "FAILURE",
                                        "message": "Генерация была отменена",
                                        "error": "Задача была отменена на RunPod"
                                    }
                                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                    logger.warning(f"[SSE RUNPOD] Генерация была отменена")
                                    break
                                
                                elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                                    # Вычисляем примерный прогресс на основе времени
                                    # Средняя генерация занимает ~30-60 секунд
                                    estimated_total_time = 60
                                    progress = min(95, int((elapsed_time / estimated_total_time) * 100))
                                    
                                    status_message = "В очереди..." if status == "IN_QUEUE" else "Выполняется генерация..."
                                    event_data = {
                                        "status": "PROGRESS",
                                        "message": status_message,
                                        "progress": progress
                                    }
                                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                
                                else:
                                    event_data = {
                                        "status": "PROGRESS",
                                        "message": f"Статус: {status}"
                                    }
                                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                            
                            # Если статус не изменился, но это IN_PROGRESS, отправляем heartbeat с прогрессом
                            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                                estimated_total_time = 60
                                progress = min(95, int((elapsed_time / estimated_total_time) * 100))
                                
                                # Отправляем обновление прогресса каждые 5 секунд
                                if int(elapsed_time) % 5 == 0:
                                    status_message = "В очереди..." if status == "IN_QUEUE" else "Выполняется генерация..."
                                    event_data = {
                                        "status": "PROGRESS",
                                        "message": status_message,
                                        "progress": progress
                                    }
                                    yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                            
                        except Exception as check_error:
                            consecutive_errors += 1
                            logger.warning(f"[SSE RUNPOD] Ошибка проверки статуса (попытка {consecutive_errors}/{max_consecutive_errors}): {check_error}")
                            
                            if consecutive_errors >= max_consecutive_errors:
                                event_data = {
                                    "status": "ERROR",
                                    "message": "Не удалось получить статус генерации",
                                    "error": f"Превышено количество ошибок при проверке статуса: {str(check_error)}"
                                }
                                yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                break
                            
                            # При ошибке отправляем событие прогресса, чтобы клиент знал, что мы еще работаем
                            if int(elapsed_time) % 10 == 0:
                                event_data = {
                                    "status": "PROGRESS",
                                    "message": "Проверка статуса генерации..."
                                }
                                yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                        
                        # Задержка перед следующей проверкой
                        await asyncio.sleep(check_interval)
                        elapsed_time += check_interval
                        
                        # Отправляем heartbeat каждые 10 секунд
                        if int(elapsed_time) % 10 == 0:
                            yield f": heartbeat\n\n"
                    
                    # Если время истекло, отправляем событие таймаута
                    if elapsed_time >= max_wait_time:
                        event_data = {
                            "status": "TIMEOUT",
                            "message": "Превышено время ожидания генерации",
                            "error": f"Генерация превысила максимальное время ожидания {max_wait_time} секунд"
                        }
                        yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                        logger.warning(f"[SSE RUNPOD] Таймаут для задачи {task_id}")
            
            else:
                # Это Celery task_id - используем стандартную логику
                logger.info(f"[SSE CELERY] Начинаем отслеживание Celery задачи: {task_id}")
                
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
            import traceback
            logger.error(f"[SSE] Трейсбек: {traceback.format_exc()}")
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
    Поддерживает как Celery task_id, так и RunPod job_id.
    
    Args:
        task_id: ID задачи Celery или RunPod job_id
        
    Returns:
        dict: Статус задачи и результат (если готово)
    """
    try:
        logger.info(f"[STATUS] Запрос статуса задачи {task_id}")
        
        # Проверяем, является ли это RunPod job_id (формат: UUID с дефисами)
        # RunPod job_id обычно выглядит как: "95c8aded-6fa3-4737-9728-7d34a88c277a-e1"
        import re
        runpod_job_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[0-9a-f]+)?$', re.IGNORECASE)
        
        if runpod_job_pattern.match(task_id):
            # Это RunPod job_id - проверяем статус через RunPod API
            logger.info(f"[RUNPOD STATUS] Проверяем статус RunPod job: {task_id}")
            from app.services.runpod_client import check_status
            import httpx
            
            # Пытаемся получить runpod_url_base из метаданных
            runpod_url_base = None
            try:
                from app.utils.redis_cache import cache_get
                generation_metadata = await cache_get(f"generation:{task_id}")
                if generation_metadata:
                    if isinstance(generation_metadata, str):
                        import json
                        try:
                            generation_metadata = json.loads(generation_metadata)
                        except json.JSONDecodeError:
                            logger.warning(f"[RUNPOD STATUS] Не удалось распарсить метаданные из Redis")
                            generation_metadata = None
                    
                    if generation_metadata and isinstance(generation_metadata, dict):
                        runpod_url_base = generation_metadata.get("runpod_url_base")
                        model = generation_metadata.get("model", "unknown")
                        logger.info(f"[RUNPOD STATUS] Найден runpod_url_base в метаданных: {runpod_url_base} (модель: {model})")
                    else:
                        logger.warning(f"[RUNPOD STATUS] Метаданные не являются словарем: {type(generation_metadata)}")
                else:
                    logger.warning(f"[RUNPOD STATUS] Метаданные не найдены в Redis для task_id={task_id}")
            except Exception as meta_error:
                logger.warning(f"[RUNPOD STATUS] Не удалось получить runpod_url_base из метаданных: {meta_error}")
                import traceback
                logger.warning(f"[RUNPOD STATUS] Трейсбек: {traceback.format_exc()}")
            
            # Если не нашли в метаданных, пытаемся найти в БД
            if not runpod_url_base:
                try:
                    from app.models.image_generation_history import ImageGenerationHistory
                    from sqlalchemy import select
                    from app.database.db import async_session_maker
                    async with async_session_maker() as fallback_db:
                        stmt = select(ImageGenerationHistory).where(
                            ImageGenerationHistory.task_id == task_id
                        ).limit(1)
                        result = await fallback_db.execute(stmt)
                        pending_entry = result.scalar_one_or_none()
                        if pending_entry and pending_entry.image_url and pending_entry.image_url.startswith("pending:"):
                            # Пытаемся извлечь runpod_url_base из JSON в prompt
                            try:
                                import json
                                if pending_entry.prompt:
                                    prompt_data = json.loads(pending_entry.prompt)
                                    if isinstance(prompt_data, dict) and "runpod_url_base" in prompt_data:
                                        runpod_url_base = prompt_data["runpod_url_base"]
                                        model = prompt_data.get("model", "anime")
                                        logger.info(f"[RUNPOD STATUS] OK Извлечен runpod_url_base из БД: {runpod_url_base}, модель: {model}")
                                    else:
                                        logger.warning(f"[RUNPOD STATUS] Найдена pending запись, но runpod_url_base не найден в JSON prompt")
                                else:
                                    logger.warning(f"[RUNPOD STATUS] Найдена pending запись, но prompt пуст")
                            except (json.JSONDecodeError, TypeError) as json_error:
                                logger.warning(f"[RUNPOD STATUS] Не удалось распарсить JSON из prompt: {json_error}")
                except Exception as db_error:
                    logger.warning(f"[RUNPOD STATUS] Ошибка поиска в БД: {db_error}")
            
            # Если runpod_url_base не найден, пытаемся определить по модели из метаданных или используем дефолтный
            if not runpod_url_base:
                from app.services.runpod_client import RUNPOD_URL_BASE, RUNPOD_URL_BASE_2, RUNPOD_URL_BASE_3
                # Пытаемся определить модель из метаданных
                try:
                    from app.utils.redis_cache import cache_get
                    generation_metadata = await cache_get(f"generation:{task_id}")
                    if generation_metadata:
                        if isinstance(generation_metadata, str):
                            import json
                            try:
                                generation_metadata = json.loads(generation_metadata)
                            except json.JSONDecodeError:
                                generation_metadata = None
                        if generation_metadata and isinstance(generation_metadata, dict):
                            model = generation_metadata.get("model", "anime")
                            if model == "anime-realism":
                                runpod_url_base = RUNPOD_URL_BASE_2
                                logger.info(f"[RUNPOD STATUS] Определен runpod_url_base по модели 'anime-realism': {runpod_url_base}")
                            elif model == "realism":
                                runpod_url_base = RUNPOD_URL_BASE_3
                                logger.info(f"[RUNPOD STATUS] Определен runpod_url_base по модели 'realism': {runpod_url_base}")
                            else:
                                runpod_url_base = RUNPOD_URL_BASE
                                logger.info(f"[RUNPOD STATUS] Определен runpod_url_base по модели '{model}': {runpod_url_base}")
                except Exception:
                    pass
                
                # Если все еще не найден, используем дефолтный
                if not runpod_url_base:
                    runpod_url_base = RUNPOD_URL_BASE
                    logger.warning(f"[RUNPOD STATUS] runpod_url_base не найден, используем дефолтный RUNPOD_URL_BASE: {runpod_url_base}")
            
            async with httpx.AsyncClient() as client:
                try:
                    status_response = await check_status(client, task_id, runpod_url_base)
                    status = status_response.get("status")
                    
                    # Извлекаем прогресс из ответа RunPod API
                    progress = None
                    try:
                        from app.services.runpod_progress_tracker import extract_progress_from_response
                        progress = extract_progress_from_response(status_response)
                        if progress is not None:
                            logger.info(f"[RUNPOD STATUS] OK Извлечен прогресс: {progress}%")
                        # Логирование структуры ответа удалено для уменьшения шума в логах
                    except Exception as progress_err:
                        logger.warning(f"[RUNPOD STATUS] Ошибка извлечения прогресса: {progress_err}")
                        import traceback
                        logger.debug(f"[RUNPOD STATUS] Traceback: {traceback.format_exc()}")
                except Exception as check_error:
                    logger.error(f"[RUNPOD STATUS] Ошибка проверки статуса: {check_error}")
                    import traceback
                    logger.error(f"[RUNPOD STATUS] Трейсбек: {traceback.format_exc()}")
                    # Возвращаем ошибку вместо проброса исключения
                    return {
                        "task_id": task_id,
                        "status": "ERROR",
                        "message": "Ошибка проверки статуса генерации",
                        "error": str(check_error),
                        "progress": 0
                    }
            
            # Если статус IN_PROGRESS и есть прогресс, возвращаем его
            if status == "IN_PROGRESS" and progress is not None:
                return {
                    "status": "generating",  # Используем кастомный статус для фронта
                    "task_id": task_id,
                    "progress": progress,
                    "result": {
                        "status": "generating",
                        "progress": progress,
                        "message": f"Generating: {progress}%"
                    }
                }
            
            # Если статус IN_PROGRESS но прогресс еще не получен
            # ВАЖНО: RunPod API не возвращает поле progress в ответе /status для этого типа endpoint
            # Используем время с момента запуска задачи для оценки прогресса
            if status == "IN_PROGRESS":
                estimated_progress = 0
                execution_time = status_response.get("executionTime", 0)
                
                # Пытаемся получить время запуска из метаданных
                try:
                    from app.utils.redis_cache import cache_get
                    import json
                    import time
                    generation_metadata = await cache_get(f"generation:{task_id}")
                    if generation_metadata:
                        if isinstance(generation_metadata, str):
                            try:
                                generation_metadata = json.loads(generation_metadata)
                            except json.JSONDecodeError:
                                generation_metadata = None
                        
                        if generation_metadata and isinstance(generation_metadata, dict):
                            start_time = generation_metadata.get("created_at")
                            if start_time:
                                elapsed_seconds = time.time() - start_time
                                # Среднее время генерации ~20 секунд (20000ms), оцениваем прогресс
                                # Используем более консервативную оценку: первые 5 секунд = 10%, затем линейно до 90%
                                if elapsed_seconds < 5:
                                    estimated_progress = min(10, int((elapsed_seconds / 5) * 10))
                                else:
                                    # После 5 секунд: от 10% до 90% за оставшиеся 15 секунд
                                    remaining_time = elapsed_seconds - 5
                                    estimated_progress = min(90, 10 + int((remaining_time / 15) * 80))
                                
                                logger.debug(f"[RUNPOD STATUS] Оценка прогресса на основе времени: {estimated_progress}% (elapsed={elapsed_seconds:.1f}s)")
                except Exception as time_err:
                    logger.debug(f"[RUNPOD STATUS] Не удалось оценить прогресс по времени: {time_err}")
                
                # Если есть executionTime, используем его для более точной оценки
                if execution_time > 0:
                    # executionTime в миллисекундах, среднее время ~20000ms
                    execution_seconds = execution_time / 1000
                    # Более консервативная оценка: первые 5 секунд = 10%, затем линейно до 90%
                    if execution_seconds < 5:
                        exec_progress = min(10, int((execution_seconds / 5) * 10))
                    else:
                        # После 5 секунд: от 10% до 90% за оставшиеся 15 секунд
                        remaining_time = execution_seconds - 5
                        exec_progress = min(90, 10 + int((remaining_time / 15) * 80))
                    # Используем максимум из двух оценок (по времени запуска и по executionTime)
                    estimated_progress = max(estimated_progress, exec_progress)
                    logger.debug(f"[RUNPOD STATUS] Оценка прогресса на основе executionTime: {estimated_progress}% (executionTime={execution_time}ms, {execution_seconds:.1f}s)")
                
                return {
                    "status": "generating",
                    "task_id": task_id,
                    "progress": estimated_progress,
                    "result": {
                        "status": "generating",
                        "progress": estimated_progress,
                        "message": f"Generating: {estimated_progress}%" if estimated_progress > 0 else "Generating..."
                    }
                }
            
            if status == "COMPLETED":
                output = status_response.get("output", {})
                logger.info(f"[RUNPOD STATUS] Полный output: {output}")
                image_url = output.get("image_url")
                generation_time = output.get("generation_time")  # Время генерации от RunPod
                seed_used = output.get("seed")  # Seed, который использовался для генерации
                logger.info(f"[RUNPOD STATUS] generation_time из output: {generation_time}")
                if seed_used is not None:
                    logger.info(f"[RUNPOD STATUS] 🎲 SEED использованный для генерации: {seed_used}")
                
                if image_url:
                    # Конвертируем URL через прокси
                    from app.services.yandex_storage import YandexCloudStorageService
                    image_url = YandexCloudStorageService.convert_yandex_url_to_proxy(image_url)
                    
                    result = {
                        "image_url": image_url,
                        "cloud_url": image_url,
                        "success": True
                    }
                    # Добавляем generation_time если оно есть
                    if generation_time is not None:
                        result["generation_time"] = generation_time
                        logger.info(f"[RUNPOD STATUS] Добавлено generation_time в result: {generation_time}")
                    else:
                        logger.warning(f"[RUNPOD STATUS] generation_time отсутствует в output!")
                    
                    # КРИТИЧЕСКИ ВАЖНО: Сохраняем историю генерации изображения
                    try:
                        from app.utils.redis_cache import cache_get
                        from app.services.image_generation_history_service import ImageGenerationHistoryService
                        from app.database.db import async_session_maker
                        from app.models.image_generation_history import ImageGenerationHistory
                        from sqlalchemy import select, update
                        import json
                        
                        user_id = None
                        character_name = None
                        prompt = "Генерация изображения"
                        
                        # Пытаемся получить метаданные из Redis
                        metadata_raw = await cache_get(f"generation:{task_id}")
                        if metadata_raw:
                            # cache_get уже возвращает распарсенный JSON (dict) или строку
                            if isinstance(metadata_raw, str):
                                try:
                                    metadata = json.loads(metadata_raw)
                                except json.JSONDecodeError:
                                    metadata = None
                            else:
                                metadata = metadata_raw
                            
                            if metadata and isinstance(metadata, dict):
                                user_id = metadata.get("user_id")
                                character_name = metadata.get("character_name")
                                prompt = metadata.get("prompt", "Генерация изображения")
                                logger.info(f"[IMAGE_HISTORY] Получены метаданные из Redis: user_id={user_id}, character={character_name}, task_id={task_id}")
                        
                        # Если не нашли в Redis, пытаемся найти временную запись в БД
                        if not user_id or not character_name:
                            logger.info(f"[IMAGE_HISTORY] Метаданные не найдены в Redis, ищем в БД по task_id={task_id}")
                            async with async_session_maker() as search_db:
                                temp_entry = await search_db.execute(
                                    select(ImageGenerationHistory).where(
                                        ImageGenerationHistory.task_id == task_id,
                                        ImageGenerationHistory.image_url.like("pending:%")
                                    ).limit(1)
                                )
                                temp_record = temp_entry.scalars().first()
                                
                                if temp_record:
                                    user_id = temp_record.user_id
                                    character_name = temp_record.character_name
                                    # Извлекаем оригинальный промпт из JSON, если он там сохранен
                                    prompt_text = temp_record.prompt or "Генерация изображения"
                                    try:
                                        import json
                                        prompt_data = json.loads(prompt_text)
                                        if isinstance(prompt_data, dict) and "prompt" in prompt_data:
                                            prompt = prompt_data["prompt"]
                                        else:
                                            prompt = prompt_text
                                    except (json.JSONDecodeError, TypeError):
                                        prompt = prompt_text
                                    logger.info(f"[IMAGE_HISTORY] Найдена временная запись в БД: user_id={user_id}, character={character_name}")
                        
                        # Сохраняем историю если есть все данные
                        if user_id and character_name and image_url:
                            logger.info(f"[IMAGE_HISTORY] Сохраняем историю генерации: user_id={user_id}, character={character_name}, image_url={image_url[:50]}...")
                            
                            async with async_session_maker() as history_db:
                                # Используем сервис для сохранения (он сам проверит дубликаты и обновит pending записи)
                                history_service = ImageGenerationHistoryService(history_db)
                                saved = await history_service.save_generation(
                                    user_id=user_id,
                                    character_name=character_name,
                                    image_url=image_url,
                                    prompt=prompt,
                                    generation_time=generation_time,
                                    task_id=task_id
                                )
                                
                                if saved:
                                    logger.info(f"[IMAGE_HISTORY] OK История сохранена для task_id={task_id}")
                                else:
                                    logger.warning(f"[IMAGE_HISTORY] Не удалось сохранить историю для task_id={task_id}")
                            
                            # КРИТИЧЕСКИ ВАЖНО: НЕ сохраняем в ChatHistory здесь!
                            # Chat API уже сохраняет сообщения через process_chat_history_storage.
                            # Сохранение здесь создает дублирующиеся сообщения.
                            # save_generation в ImageGenerationHistoryService сохраняет только в ImageGenerationHistory (галерея/статистика),
                            # но НЕ создает записи в ChatHistory - это правильно.
                            logger.info(f"[CHAT_HISTORY] Пропускаем сохранение в ChatHistory - Chat API уже обработал сообщение для task_id={task_id}")
                        else:
                            logger.warning(f"[IMAGE_HISTORY] Недостаточно данных для сохранения: user_id={user_id}, character={character_name}, image_url={bool(image_url)}, task_id={task_id}")
                    except Exception as history_error:
                        logger.error(f"[IMAGE_HISTORY] Ошибка сохранения истории: {history_error}")
                        import traceback
                        logger.error(f"[IMAGE_HISTORY] Трейсбек: {traceback.format_exc()}")
                        # Не прерываем выполнение, история - дополнительная функция
                    
                    logger.info(f"[RUNPOD STATUS] Финальный result: {result}")
                    return {
                        "task_id": task_id,
                        "status": "SUCCESS",
                        "message": "Генерация завершена успешно",
                        "result": result
                    }
                else:
                    return {
                        "task_id": task_id,
                        "status": "PROGRESS",
                        "message": "Генерация завершена, обработка результата..."
                    }
            elif status == "FAILED":
                error = status_response.get("error", "Unknown error")
                return {
                    "task_id": task_id,
                    "status": "FAILURE",
                    "message": "Ошибка при генерации изображения",
                    "error": error
                }
            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                result = {
                    "task_id": task_id,
                    "status": "PROGRESS",
                    "message": "Генерация выполняется..."
                }
                # Добавляем прогресс если он есть
                if progress is not None:
                    result["progress"] = progress
                    logger.info(f"[RUNPOD STATUS] Возвращаем прогресс: {progress}%")
                return result
            elif status == "IN_QUEUE":
                return {
                    "task_id": task_id,
                    "status": "pending",
                    "progress": 0,
                    "result": {
                        "status": "pending",
                        "progress": 0,
                        "message": "Задача в очереди"
                    }
                }
            else:
                # Другие статусы (FAILED, CANCELLED и т.д.)
                return {
                    "task_id": task_id,
                    "status": status.lower(),
                    "message": f"Статус: {status}",
                    "progress": progress if progress is not None else 0
                }
        else:
            # Это Celery task_id - используем стандартную логику
            logger.info(f"[CELERY STATUS] Проверяем статус Celery задачи: {task_id}")
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
            # Задача выполняется с прогрессом
            progress = task.info.get("progress", 0)
            response = {
                "task_id": task_id,
                "status": "generating",  # Используем кастомный статус для фронта
                "message": task.info.get("message", f"Generating: {progress}%"),
                "progress": progress,
                "result": {
                    "status": "generating",
                    "progress": progress,
                    "message": f"Generating: {progress}%"
                }
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
                        
                        from sqlalchemy.orm import load_only
                        existing_query = (
                            select(ChatHistory)
                            .options(load_only(
                                ChatHistory.id,
                                ChatHistory.user_id,
                                ChatHistory.character_name,
                                ChatHistory.session_id,
                                ChatHistory.message_type,
                                ChatHistory.message_content,
                                ChatHistory.image_url,
                                ChatHistory.image_filename,
                                ChatHistory.created_at
                            ))
                            .where(ChatHistory.session_id == f"task_{task_id}")
                            .order_by(ChatHistory.created_at.desc())
                            .limit(1)
                        )
                        existing_result = await db.execute(existing_query)
                        existing = existing_result.scalars().first()
                        
                        if existing:
                            normalized_url = image_url.split('?')[0].split('#')[0]
                            existing.image_url = normalized_url
                            await db.flush()
                            await db.commit()
                            logger.info(f"[PROMPT] OK Промпт обновлен с image_url: task_id={task_id}, image_url={normalized_url}")
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
            
            # Конвертируем URL в результате через прокси
            if isinstance(result, dict):
                from app.services.yandex_storage import YandexCloudStorageService
                if "image_url" in result and result["image_url"]:
                    result["image_url"] = YandexCloudStorageService.convert_yandex_url_to_proxy(result["image_url"])
                if "cloud_url" in result and result["cloud_url"]:
                    result["cloud_url"] = YandexCloudStorageService.convert_yandex_url_to_proxy(result["cloud_url"])
                if "cloud_urls" in result and isinstance(result["cloud_urls"], list):
                    result["cloud_urls"] = [
                        YandexCloudStorageService.convert_yandex_url_to_proxy(url) 
                        for url in result["cloud_urls"]
                    ]
            
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
        logger.error(f"[ERROR] Ошибка получения статуса задачи {task_id}: {e}", exc_info=True)
        import traceback
        logger.error(f"[ERROR] Трейсбек: {traceback.format_exc()}")
        # Возвращаем ошибку вместо raise HTTPException, чтобы фронтенд мог обработать
        return {
            "task_id": task_id,
            "status": "ERROR",
            "message": "Ошибка получения статуса задачи",
            "error": str(e)
        }


@app.get("/api/v1/cloud-save-status/{task_id}")
async def get_cloud_save_status(task_id: str):
    """
    Получить статус фоновой задачи сохранения в облако.
    
    Args:
        task_id: ID задачи Celery
    
    Returns:
        Статус задачи и URL сохраненных изображений
    """
    try:
        from app.celery_app import celery_app
        
        task = celery_app.AsyncResult(task_id)
        
        if task.state == 'PENDING':
            return {
                "status": "pending",
                "message": "Задача в очереди"
            }
        elif task.state == 'STARTED':
            return {
                "status": "processing",
                "message": "Сохранение в облако..."
            }
        elif task.state == 'SUCCESS':
            result = task.result
            return {
                "status": "completed",
                "cloud_urls": result.get("cloud_urls", []),
                "total": result.get("total", 0),
                "saved": result.get("saved", 0)
            }
        elif task.state == 'FAILURE':
            return {
                "status": "failed",
                "message": "Ошибка сохранения в облако",
                "error": str(task.info)
            }
        else:
            return {
                "status": task.state.lower(),
                "message": f"Статус: {task.state}"
            }
            
    except Exception as e:
        logger.error(f"[ERROR] Ошибка получения статуса задачи {task_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка получения статуса: {str(e)}"
        )


@app.post("/api/v1/translate/ru-en")
async def translate_ru_to_en(request: dict):
    """
    Переводит текст с русского на английский.
    
    Args:
        request: Словарь с ключом "text" - текст для перевода
        
    Returns:
        dict: Словарь с ключом "translated_text" - переведенный текст
    """
    try:
        text = request.get("text", "").strip()
        if not text:
            return {"translated_text": ""}
        
        # Проверяем, содержит ли текст кириллицу
        import re
        has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
        if not has_cyrillic:
            # Если нет кириллицы, считаем что текст уже на английском
            return {"translated_text": text}
        
        # Переводим с русского на английский
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='ru', target='en')
        translated_text = translator.translate(text)
        
        return {"translated_text": translated_text}
    except Exception as e:
        logger.error(f"[TRANSLATE] Ошибка перевода ru->en: {e}")
        return {"translated_text": request.get("text", "")}

@app.post("/api/v1/translate/en-ru")
async def translate_en_to_ru(request: dict):
    """
    Переводит текст с английского на русский.
    
    Args:
        request: Словарь с ключом "text" - текст для перевода
        
    Returns:
        dict: Словарь с ключом "translated_text" - переведенный текст
    """
    try:
        text = request.get("text", "").strip()
        if not text:
            return {"translated_text": ""}
        
        # Проверяем, содержит ли текст кириллицу
        import re
        has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
        if has_cyrillic:
            # Если есть кириллица, считаем что текст уже на русском
            return {"translated_text": text}
        
        # Переводим с английского на русский
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='en', target='ru')
        translated_text = translator.translate(text)
        
        return {"translated_text": translated_text}
    except Exception as e:
        logger.error(f"[TRANSLATE] Ошибка перевода en->ru: {e}")
        return {"translated_text": request.get("text", "")}
            
    except Exception as e:
        logger.error(f"[TRANSLATE] Критическая ошибка: {e}")
        import traceback
        logger.error(f"[TRANSLATE] Трейсбек: {traceback.format_exc()}")
        # В случае критической ошибки возвращаем оригинальный текст
        text = request.get("text", "")
        return {"translated_text": text}

@app.post("/api/v1/translate/en-ru")
async def translate_en_to_ru(request: dict):
    """
    Переводит текст с английского на русский.
    
    Args:
        request: Словарь с ключом "text" - текст для перевода
        
    Returns:
        dict: Словарь с ключом "translated_text" - переведенный текст
    """
    try:
        text = request.get("text", "").strip()
        if not text:
            return {"translated_text": ""}
        
        # Проверяем, содержит ли текст кириллицу
        import re
        has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', text))
        if has_cyrillic:
            # Если есть кириллица, считаем что текст уже на русском
            return {"translated_text": text}
        
        # Переводим с английского на русский
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='en', target='ru')
        translated_text = translator.translate(text)
        
        return {"translated_text": translated_text}
    except Exception as e:
        logger.error(f"[TRANSLATE] Ошибка перевода en->ru: {e}")
        return {"translated_text": request.get("text", "")}


if __name__ == "__main__":
    logger.info("Запуск основного приложения...")
    uvicorn.run(app, host="0.0.0.0", port=8000)