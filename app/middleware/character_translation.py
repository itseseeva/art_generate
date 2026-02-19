"""
Middleware для автоматического перевода персонажей при API запросах.
"""
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import async_session_maker
from app.services.translation_service import auto_translate_and_save_character
from app.chat_bot.models.models import CharacterDB
from sqlalchemy import select
import json

logger = logging.getLogger(__name__)


class CharacterTranslationMiddleware(BaseHTTPMiddleware):
    """
    Middleware для автоматического перевода персонажей.
    
    При GET /api/characters/ проверяет Accept-Language header
    и автоматически переводит персонажей, если translations[lang] отсутствует.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Проверяем, является ли запрос GET для персонажей
        is_characters_request = (
            request.method == "GET" and 
            ("/api/characters" in str(request.url) or "/characters" in str(request.url))
        )
        
        if not is_characters_request:
            # Не наш запрос, пропускаем дальше
            return await call_next(request)
        
        # Получаем язык из заголовков (Accept-Language)
        accept_lang = request.headers.get("Accept-Language", "en")
        # Берем первый язык из списка (en-US,en;q=0.9,ru;q=0.8)
        target_lang = accept_lang.split(",")[0].split("-")[0].lower()
        
        # Поддерживаем только en и ru
        if target_lang not in ["en", "ru"]:
            target_lang = "en"
        
        logger.debug(f"[AUTO-TRANSLATE] Request to {request.url}, target lang: {target_lang}")
        
        # Выполняем оригинальный запрос
        response = await call_next(request)
        
        # Если это не 200 OK, возвращаем как есть
        if response.status_code != 200:
            return response
        
        # Читаем тело ответа
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk
        
        try:
            # Парсим JSON
            data = json.loads(response_body.decode())
            
            # Проверяем, есть ли список персонажей в ответе
            characters = None
            if isinstance(data, list):
                characters = data
            elif isinstance(data, dict) and "characters" in data:
                characters = data["characters"]
            elif isinstance(data, dict) and isinstance(data.get("character"), dict):
                # Одиночный персонаж
                characters = [data["character"]]
            
            if characters:
                logger.info(f"[AUTO-TRANSLATE] Обрабатываем {len(characters)} персонажей")
                
                # Открываем сессию БД для автоперевода
                async with async_session_maker() as db:
                    for char_data in characters:
                        try:
                            # Проверяем, нужен ли автоперевод (нет bilingual полей для целевого языка)
                            char_id = char_data.get("id")
                            
                            # Проверяем наличие полей для целевого языка
                            has_target_translation = (
                                (target_lang == "ru" and char_data.get("description_ru")) or
                                (target_lang == "en" and char_data.get("description_en"))
                            )
                            
                            if not char_id or has_target_translation:
                                continue  # Уже есть перевод
                            
                            # Загружаем персонажа из БД
                            result = await db.execute(
                                select(CharacterDB).where(CharacterDB.id == char_id)
                            )
                            character = result.scalar_one_or_none()
                            
                            if character:
                                # Автоматически переводим и сохраняем
                                was_translated = await auto_translate_and_save_character(
                                    character, db, target_lang
                                )
                                
                                if was_translated:
                                    # Обновляем данные в ответе из новых полей
                                    char_data["name_ru"] = character.name_ru
                                    char_data["name_en"] = character.name_en
                                    char_data["description_ru"] = character.description_ru
                                    char_data["description_en"] = character.description_en
                                    char_data["personality_ru"] = character.personality_ru
                                    char_data["personality_en"] = character.personality_en
                                    char_data["situation_ru"] = character.situation_ru
                                    char_data["situation_en"] = character.situation_en
                                    
                                    logger.info(f"[AUTO-TRANSLATE] ✓ Персонаж {char_id} переведен на {target_lang}")
                        
                        except Exception as e:
                            logger.error(f"[AUTO-TRANSLATE] Ошибка перевода персонажа {char_data.get('id')}: {e}")
                            # Продолжаем с остальными персонажами
                            continue
            
            # Формируем новый ответ с обновленными данными
            new_body = json.dumps(data, ensure_ascii=False).encode()
            
            from starlette.responses import Response
            return Response(
                content=new_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type="application/json"
            )
        
        except Exception as e:
            logger.error(f"[AUTO-TRANSLATE] Ошибка обработки ответа: {e}", exc_info=True)
            # Возвращаем оригинальный ответ в случае ошибки
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
