"""
Скрипт для автоматического перевода описаний персонажей на английский.
УСТАРЕЛ: Перевод теперь обрабатывается в app.services.translation_service.auto_translate_and_save_character
"""
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def auto_translate_descriptions():
    logger.info("=" * 80)
    logger.info("🌍 Скрипт auto_translate_descriptions.py УСТАРЕЛ и отключен.")
    logger.info("=" * 80)
    return

def run_translation():
    try:
        asyncio.run(auto_translate_descriptions())
    except Exception as e:
        logger.error(f"Ошибка запуска перевода: {e}")

if __name__ == "__main__":
    asyncio.run(auto_translate_descriptions())
