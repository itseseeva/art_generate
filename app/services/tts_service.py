"""
Сервис для генерации речи через Fish Audio API с локальным кэшированием.
"""

import os
import uuid
import asyncio
import hashlib
from pathlib import Path
from typing import Optional
from fishaudio import FishAudio
from fishaudio.types import ReferenceAudio
from app.config.paths import VOICES_DIR, DEFAULT_CHARACTER_VOICES_DIR, USER_VOICES_DIR
from app.config.settings import settings
from app.utils.logger import logger

# Стандартная фраза приветствия для превью голосов
DEFAULT_PREVIEW_TEXT = (
    "Ммм... Наконец-то ты здесь. Я так долго ждала возможности поговорить с тобой наедине. "
    "Я здесь, чтобы исполнить любой твой приказ. Ну что, приступим?"
)


def _get_fish_client() -> Optional[FishAudio]:
    """
    Создает и возвращает клиент Fish Audio.
    
    Returns:
        Экземпляр FishAudio клиента или None если API ключ не установлен.
    """
    if not settings.FISH_AUDIO_API_KEY:
        logger.error("FISH_AUDIO_API_KEY не установлен в настройках")
        return None
    
    try:
        client = FishAudio(api_key=settings.FISH_AUDIO_API_KEY)
        return client
    except Exception as e:
        logger.error(f"Ошибка при создании Fish Audio клиента: {e}")
        return None


def _load_voice_audio(voice_id: str, is_user_voice: bool = False) -> Optional[bytes]:
    """
    Загружает аудио файл голоса как bytes.
    
    Args:
        voice_id: ID голоса (имя файла)
        is_user_voice: Искать в пользовательских голосах
        
    Returns:
        Аудио данные в формате bytes или None в случае ошибки
    """
    try:
        if is_user_voice:
            voice_path = USER_VOICES_DIR / voice_id
        else:
            voice_path = DEFAULT_CHARACTER_VOICES_DIR / voice_id
        
        if not voice_path.exists():
            logger.error(f"Файл голоса не найден: {voice_path}")
            return None
        
        with open(voice_path, 'rb') as f:
            audio_data = f.read()
        
        logger.info(f"Загружен аудио файл голоса {voice_id}, размер: {len(audio_data)} байт")
        return audio_data
        
    except Exception as e:
        logger.error(f"Ошибка при загрузке аудио файла {voice_id}: {e}")
        return None


async def generate_tts_audio(text: str, voice_url: str) -> Optional[str]:
    """
    Генерирует аудио из текста с использованием Fish Audio API.
    
    Использует instant voice cloning - передает образец голоса в каждом запросе.
    Поддерживает только локальные голоса из default_character_voices.
    
    Примечание: Внешние URL (например, от старых персонажей с fal.ai) не поддерживаются,
    так как это уже готовые озвученные фразы, а не образцы голосов для клонирования.
    
    Args:
        text: Текст для озвучки.
        voice_url: Ссылка на образец голоса из default_character_voices.
        
    Returns:
        Относительный путь к сохраненному локально файлу или None в случае ошибки.
    """
    if not settings.FISH_AUDIO_API_KEY:
        logger.error("FISH_AUDIO_API_KEY не установлен в настройках")
        return None
    
    try:
        logger.info(f"Начало генерации речи через Fish Audio: text_len={len(text)}, voice_url={voice_url}")
        
        # Проверяем, что это не внешний URL (fallback на дефолтный голос)
        if voice_url.startswith('http://') or voice_url.startswith('https://'):
            logger.warning(f"Получен внешний URL вместо локального голоса: {voice_url}")
            logger.warning("Используем дефолтный голос (fallback для старых персонажей)")
            # Используем единственный дефолтный голос как fallback
            voice_url = "/default_character_voices/[Mita Miside (Russian voice)]Ммм........упим_.mp3"
        
        # Извлекаем voice_id из URL
        is_user_voice = False
        if voice_url.startswith('/default_character_voices/'):
            voice_id = voice_url.replace('/default_character_voices/', '')
        elif 'default_character_voices' in voice_url:
            voice_id = voice_url.split('default_character_voices/')[-1]
        elif voice_url.startswith('/user_voices/'):
            voice_id = voice_url.replace('/user_voices/', '')
            is_user_voice = True
        elif 'user_voices' in voice_url:
            voice_id = voice_url.split('user_voices/')[-1]
            is_user_voice = True
        else:
            logger.error(f"Неподдерживаемый формат voice_url: {voice_url}")
            logger.error("Ожидается формат: /default_character_voices/filename.mp3 или /user_voices/filename.mp3")
            return None
        
        # Загружаем аудио образец голоса
        voice_audio = _load_voice_audio(voice_id, is_user_voice=is_user_voice)
        if not voice_audio:
            logger.error(f"Не удалось загрузить аудио для голоса {voice_id}")
            return None
        
        client = _get_fish_client()
        if not client:
            return None
        
        logger.info(f"Fish Audio клиент создан успешно")
        logger.info(f"Начинаем генерацию TTS для текста: '{text[:50]}...' с голосом {voice_id}")
        
        # Генерация аудио в отдельном потоке (SDK может быть блокирующим)
        def generate_audio():
            logger.info(f"[TTS GENERATION] Вызов Fish Audio API...")
            # Используем instant voice cloning
            # Передаем образец голоса и текст, который в нем произносится
            result = client.tts.convert(
                text=text,
                references=[
                    ReferenceAudio(
                        audio=voice_audio,
                        text=DEFAULT_PREVIEW_TEXT  # Примерный текст из образца
                    )
                ],
                format="mp3"
            )
            logger.info(f"[TTS GENERATION] Fish Audio API вернул результат типа: {type(result)}")
            return result
        
        loop = asyncio.get_event_loop()
        logger.info(f"Запуск генерации в executor...")
        audio_data = await loop.run_in_executor(None, generate_audio)
        logger.info(f"Генерация завершена, получены данные размером: {len(audio_data) if isinstance(audio_data, bytes) else 'unknown'}")
        
        # Создание директории если не существует
        VOICES_DIR.mkdir(parents=True, exist_ok=True)
        
        file_name = f"{uuid.uuid4()}.mp3"
        file_path = VOICES_DIR / file_name
        
        # Сохранение на диск
        if isinstance(audio_data, bytes):
            with open(file_path, "wb") as f:
                f.write(audio_data)
        else:
            # Если SDK возвращает другой тип (например, Response объект)
            with open(file_path, "wb") as f:
                f.write(audio_data.content if hasattr(audio_data, 'content') else bytes(audio_data))
        
        logger.info(f"Аудио успешно сгенерировано и сохранено: {file_path}")
        
        # Возвращаем относительный путь для использования в API
        from app.config.paths import get_relative_path
        return get_relative_path(file_path)
        
    except Exception as e:
        logger.error(f"Ошибка при генерации речи через Fish Audio: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def get_voice_url_by_id(voice_id: str) -> Optional[str]:
    """
    Получает полный URL голоса по его ID (имени файла).
    
    Args:
        voice_id: Имя файла голоса из папки default_character_voices
        
    Returns:
        Полный URL к файлу голоса или None если файл не найден
    """
    try:
        voice_path = DEFAULT_CHARACTER_VOICES_DIR / voice_id
        
        if not voice_path.exists():
            logger.error(f"Файл голоса не найден: {voice_path}")
            return None
            
        # Возвращаем URL в формате /default_character_voices/filename.mp3
        # который будет доступен через StaticFiles mount
        voice_url = f"/default_character_voices/{voice_id}"
        logger.info(f"Получен URL голоса для {voice_id}: {voice_url}")
        return voice_url
        
    except Exception as e:
        logger.error(f"Ошибка при получении URL голоса {voice_id}: {e}")
        return None


async def generate_voice_preview(voice_id: str, text: Optional[str] = None) -> Optional[str]:
    """
    Генерирует превью голоса с кэшированием через Fish Audio API.
    
    Использует стандартную фразу приветствия или переданный текст.
    Кэширует результат по хэшу (voice_id + text) для избежания повторной генерации.
    
    Args:
        voice_id: ID голоса из папки default_character_voices
        text: Текст для озвучки (опционально, по умолчанию используется стандартная фраза)
        
    Returns:
        Относительный путь к сгенерированному аудио или None в случае ошибки
    """
    if not settings.FISH_AUDIO_API_KEY:
        logger.error("FISH_AUDIO_API_KEY не установлен в настройках")
        return None
    
    try:
        # Используем стандартную фразу если текст не указан
        preview_text = text or DEFAULT_PREVIEW_TEXT
        
        # Создаем хэш для кэширования: voice_id + text
        cache_key = hashlib.md5(f"{voice_id}_{preview_text}".encode('utf-8')).hexdigest()
        cache_filename = f"preview_{cache_key}.mp3"
        cache_path = VOICES_DIR / cache_filename
        
        # Проверяем наличие в кэше
        if cache_path.exists():
            logger.info(f"Превью голоса найдено в кэше: {cache_filename}")
            from app.config.paths import get_relative_path
            return get_relative_path(cache_path)
        
        # Создаем директорию если не существует
        VOICES_DIR.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Генерация превью для голоса {voice_id} через Fish Audio")
        
        # Загружаем аудио образец голоса
        voice_audio = _load_voice_audio(voice_id)
        if not voice_audio:
            logger.error(f"Не удалось загрузить аудио для голоса {voice_id}")
            return None
        
        client = _get_fish_client()
        if not client:
            return None
        
        # Генерация аудио в отдельном потоке
        def generate_audio():
            return client.tts.convert(
                text=preview_text,
                references=[
                    ReferenceAudio(
                        audio=voice_audio,
                        text=DEFAULT_PREVIEW_TEXT  # Текст из образца
                    )
                ],
                format="mp3"
            )
        
        loop = asyncio.get_event_loop()
        audio_data = await loop.run_in_executor(None, generate_audio)
        
        # Сохранение в кэш
        if isinstance(audio_data, bytes):
            with open(cache_path, "wb") as f:
                f.write(audio_data)
        else:
            # Если SDK возвращает другой тип
            with open(cache_path, "wb") as f:
                f.write(audio_data.content if hasattr(audio_data, 'content') else bytes(audio_data))
        
        logger.info(f"Превью успешно сгенерировано и сохранено в кэш: {cache_path}")
        
        # Возвращаем относительный путь
        from app.config.paths import get_relative_path
        return get_relative_path(cache_path)
        
    except Exception as e:
        logger.error(f"Ошибка при генерации превью голоса {voice_id}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


async def generate_preview_from_uploaded_voice(voice_audio: bytes, voice_filename: str, text: Optional[str] = None) -> Optional[str]:
    """
    Генерирует превью для загруженного пользователем голоса через Fish Audio API.
    
    Сохраняет оригинальный файл голоса и генерирует превью с дефолтной фразой.
    
    Args:
        voice_audio: Аудио данные загруженного голоса в формате bytes
        voice_filename: Имя файла (для сохранения)
        text: Текст для озвучки (опционально, по умолчанию используется стандартная фраза)
        
    Returns:
        Словарь с путями: {"voice_path": "...", "preview_path": "..."} или None в случае ошибки
    """
    if not settings.FISH_AUDIO_API_KEY:
        logger.error("FISH_AUDIO_API_KEY не установлен в настройках")
        return None
    
    try:
        # Используем стандартную фразу если текст не указан
        preview_text = text or DEFAULT_PREVIEW_TEXT
        
        # Создаем директории если не существуют
        USER_VOICES_DIR.mkdir(parents=True, exist_ok=True)
        VOICES_DIR.mkdir(parents=True, exist_ok=True)
        
        # Генерируем уникальное имя для голоса
        unique_id = uuid.uuid4().hex[:12]
        voice_ext = Path(voice_filename).suffix or ".mp3"
        saved_voice_filename = f"user_voice_{unique_id}{voice_ext}"
        voice_path = USER_VOICES_DIR / saved_voice_filename
        
        # Сохраняем оригинальный голос
        with open(voice_path, "wb") as f:
            f.write(voice_audio)
        
        logger.info(f"Сохранен загруженный голос: {voice_path}, размер: {len(voice_audio)} байт")
        
        # Генерируем превью
        logger.info(f"Генерация превью для загруженного голоса через Fish Audio")
        
        client = _get_fish_client()
        if not client:
            return None
        
        logger.info(f"Fish Audio клиент создан успешно")
        logger.info(f"Начинаем генерацию превью TTS для текста: '{preview_text[:50]}...'")
        
        # Генерация аудио в отдельном потоке
        def generate_audio():
            logger.info(f"[TTS PREVIEW] Вызов Fish Audio API...")
            result = client.tts.convert(
                text=preview_text,
                references=[
                    ReferenceAudio(
                        audio=voice_audio,
                        text=DEFAULT_PREVIEW_TEXT  # Текст из образца
                    )
                ],
                format="mp3"
            )
            logger.info(f"[TTS PREVIEW] Fish Audio API вернул результат типа: {type(result)}")
            return result
        
        loop = asyncio.get_event_loop()
        logger.info(f"Запуск генерации превью в executor...")
        audio_data = await loop.run_in_executor(None, generate_audio)
        logger.info(f"Генерация превью завершена, получены данные")
        
        # Сохраняем превью
        preview_filename = f"preview_{unique_id}.mp3"
        preview_path = VOICES_DIR / preview_filename
        
        if isinstance(audio_data, bytes):
            with open(preview_path, "wb") as f:
                f.write(audio_data)
        else:
            with open(preview_path, "wb") as f:
                f.write(audio_data.content if hasattr(audio_data, 'content') else bytes(audio_data))
        
        logger.info(f"Превью успешно сгенерировано и сохранено: {preview_path}")
        
        # Возвращаем относительные пути
        from app.config.paths import get_relative_path
        return {
            "voice_path": get_relative_path(voice_path),
            "preview_path": get_relative_path(preview_path),
            "voice_url": f"/user_voices/{saved_voice_filename}",
            "preview_url": f"/voices/{preview_filename}"
        }
        
    except Exception as e:
        logger.error(f"Ошибка при генерации превью для загруженного голоса: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None
