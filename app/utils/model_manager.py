"""
Менеджер для управления активной моделью OpenRouter через Redis.
Поддерживает автоматическое переключение между primary и fallback моделями.
"""
import logging
from typing import Optional
from app.utils.redis_cache import get_redis_client

logger = logging.getLogger(__name__)

# Константы моделей
PRIMARY_MODEL = "sao10k/l3-euryale-70b"
FALLBACK_MODEL = "deepseek/deepseek-chat-v3-0324"
REDIS_KEY = "active_default_model"


async def get_active_model() -> str:
    """
    Получает текущую активную модель из Redis.
    
    Returns:
        Название активной модели (по умолчанию PRIMARY_MODEL)
    """
    try:
        redis_client = await get_redis_client()
        if not redis_client:
            logger.warning("[MODEL_MANAGER] Redis недоступен, используется PRIMARY_MODEL")
            return PRIMARY_MODEL
        
        model = await redis_client.get(REDIS_KEY)
        if model:
            model_str = model.decode('utf-8') if isinstance(model, bytes) else model
            logger.debug(f"[MODEL_MANAGER] Активная модель из Redis: {model_str}")
            return model_str
        
        # Если ключ не установлен, устанавливаем PRIMARY_MODEL
        await set_active_model(PRIMARY_MODEL)
        logger.info(f"[MODEL_MANAGER] Инициализирована PRIMARY_MODEL: {PRIMARY_MODEL}")
        return PRIMARY_MODEL
        
    except Exception as e:
        logger.error(f"[MODEL_MANAGER] Ошибка при получении активной модели: {e}")
        return PRIMARY_MODEL


async def set_active_model(model: str) -> None:
    """
    Устанавливает активную модель в Redis.
    
    Args:
        model: Название модели для установки
    """
    try:
        redis_client = await get_redis_client()
        if not redis_client:
            logger.warning("[MODEL_MANAGER] Redis недоступен, не удалось установить модель")
            return
        
        await redis_client.set(REDIS_KEY, model)
        logger.info(f"[MODEL_MANAGER] Активная модель установлена: {model}")
        
    except Exception as e:
        logger.error(f"[MODEL_MANAGER] Ошибка при установке активной модели: {e}")


async def switch_to_fallback() -> None:
    """
    Переключает на fallback модель (deepseek-chat-v3-0324).
    Вызывается при обнаружении rate limit на primary модели.
    """
    try:
        current_model = await get_active_model()
        if current_model == FALLBACK_MODEL:
            logger.debug("[MODEL_MANAGER] Уже используется fallback модель")
            return
        
        await set_active_model(FALLBACK_MODEL)
        logger.warning(
            f"[MODEL_MANAGER] ⚠️ ПЕРЕКЛЮЧЕНИЕ НА FALLBACK: {PRIMARY_MODEL} → {FALLBACK_MODEL}"
        )
        
        # Отправляем уведомление в Telegram
        from app.chat_bot.services.openrouter_service import send_telegram_alert
        alert_message = (
            f"⚠️ <b>Автоматическое переключение модели</b>\n\n"
            f"<b>Причина:</b> Rate limit на <code>{PRIMARY_MODEL}</code>\n"
            f"<b>Новая модель:</b> <code>{FALLBACK_MODEL}</code>\n\n"
            f"Система автоматически проверит доступность primary модели каждые 2 часа."
        )
        try:
            await send_telegram_alert(alert_message)
        except Exception as telegram_error:
            logger.error(f"[MODEL_MANAGER] Не удалось отправить уведомление в Telegram: {telegram_error}")
        
    except Exception as e:
        logger.error(f"[MODEL_MANAGER] Ошибка при переключении на fallback: {e}")


async def switch_to_primary() -> None:
    """
    Переключает на primary модель (sao10k/l3-euryale-70b).
    Вызывается периодической задачей при восстановлении доступности модели.
    """
    try:
        current_model = await get_active_model()
        if current_model == PRIMARY_MODEL:
            logger.debug("[MODEL_MANAGER] Уже используется primary модель")
            return
        
        await set_active_model(PRIMARY_MODEL)
        logger.info(
            f"[MODEL_MANAGER] ✅ ВОССТАНОВЛЕНИЕ PRIMARY: {FALLBACK_MODEL} → {PRIMARY_MODEL}"
        )
        
        # Отправляем уведомление в Telegram
        from app.chat_bot.services.openrouter_service import send_telegram_alert
        alert_message = (
            f"✅ <b>Модель восстановлена</b>\n\n"
            f"<b>Модель:</b> <code>{PRIMARY_MODEL}</code>\n"
            f"<b>Статус:</b> Доступна и работает нормально\n\n"
            f"Система вернулась к использованию primary модели."
        )
        try:
            await send_telegram_alert(alert_message)
        except Exception as telegram_error:
            logger.error(f"[MODEL_MANAGER] Не удалось отправить уведомление в Telegram: {telegram_error}")
        
    except Exception as e:
        logger.error(f"[MODEL_MANAGER] Ошибка при переключении на primary: {e}")


async def is_using_fallback() -> bool:
    """
    Проверяет, используется ли сейчас fallback модель.
    
    Returns:
        True если используется fallback, False если primary
    """
    try:
        current_model = await get_active_model()
        return current_model == FALLBACK_MODEL
    except Exception as e:
        logger.error(f"[MODEL_MANAGER] Ошибка при проверке fallback: {e}")
        return False
