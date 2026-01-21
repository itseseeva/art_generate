# Система превью голосов для персонажей

## Описание

Реализована система генерации превью голосов из папки `app/default_character_voices` с использованием Fish Audio TTS API.

## Функциональность

### 1. Автоматическая озвучка приветственной фразы

При выборе голоса для персонажа генерируется превью со стандартной фразой:

> "Ммм... Наконец-то ты здесь. Я так долго ждала возможности поговорить с тобой наедине.
> Я здесь, чтобы исполнить любой твой приказ. Ну что, приступим?"

### 2. Кэширование

- Превью кэшируются в папке `app/voices/`
- Используется MD5 хэш от `voice_id + text` для имени файла
- Повторные запросы возвращают кэшированную версию
- Экономия времени и API квот

### 3. Доступные голоса

Текущие голоса в системе (из `app/default_character_voices/`):
- voice_preview_aitana_warm_friendly_and_expressive.mp3
- voice_preview_ana_rita_smooth_expressive_and_bright.mp3
- voice_preview_cherie_smooth_fluid_and_advertisable.mp3
- voice_preview_kari_friendly_warm_and_engaging.mp3
- voice_preview_marina_soft_clear_and_warm.mp3
- voice_preview_nayva_for_social_media_e_learning_nonfiction_how_to_and_corporate_training.mp3
- voice_preview_rina_soft_clear_and_comforting.mp3
- voice_preview_weronika_uszko_soft_gentle_and_loving.mp3
- voice_preview_yasmin_alves_light_clear_and_musical.mp3
- voice_preview_zara__the_warm_real_world_conversationalist.mp3

## API Endpoints

### 1. Получение списка доступных голосов

**GET** `/characters/available-voices`

**Ответ:**
```json
[
  {
    "id": "voice_preview_aitana_warm_friendly_and_expressive.mp3",
    "name": "Голос 1",
    "url": "/default_character_voices/voice_preview_aitana_warm_friendly_and_expressive.mp3",
    "preview_url": "/voices/preview_abc123def456.mp3"  // null если превью еще не сгенерировано
  },
  ...
]
```

### 2. Генерация превью голоса

**POST** `/chat/preview-voice`

**Запрос:**
```json
{
  "voice_id": "voice_preview_aitana_warm_friendly_and_expressive.mp3",
  "text": null  // опционально, по умолчанию используется стандартная фраза
}
```

**Ответ:**
```json
{
  "status": "success",
  "audio_url": "/voices/preview_abc123def456.mp3",
  "voice_id": "voice_preview_aitana_warm_friendly_and_expressive.mp3"
}
```

## Использование

### Пример для фронтенда (TypeScript/React)

```typescript
// 1. Получить список голосов
const response = await fetch('http://localhost:8000/characters/available-voices');
const voices = await response.json();

// 2. Сгенерировать превью для выбранного голоса
const previewResponse = await fetch('http://localhost:8000/chat/preview-voice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voice_id: voices[0].id
  })
});

const previewData = await previewResponse.json();

// 3. Воспроизвести превью
const audio = new Audio(previewData.audio_url);
audio.play();
```

### Пример для Python

```python
import httpx

# Получить список голосов
async with httpx.AsyncClient() as client:
    voices = await client.get("http://localhost:8000/characters/available-voices")
    print(voices.json())
    
    # Сгенерировать превью
    preview = await client.post(
        "http://localhost:8000/chat/preview-voice",
        json={"voice_id": "voice_preview_aitana_warm_friendly_and_expressive.mp3"}
    )
    print(preview.json())
```

## Конфигурация

### Переменные окружения (.env)

```env
# Fish Audio API ключ (обязательно)
FISH_AUDIO_API_KEY=your_fish_audio_api_key_here
```

### Важно для Production

API ключ Fish Audio должен быть установлен в переменных окружения для работы TTS функциональности.

## Архитектура

### Модули

1. **app/services/tts_service.py**
   - `get_voice_url_by_id()` - получение URL голоса по ID
   - `generate_voice_preview()` - генерация превью с кэшированием
   - `generate_tts_audio()` - основная функция TTS

2. **app/chat_bot/schemas/chat.py**
   - `VoicePreviewRequest` - схема запроса превью

3. **app/chat_bot/api/chat_endpoints.py**
   - `POST /chat/preview-voice` - эндпоинт генерации превью

4. **app/chat_bot/api/character_endpoints.py**
   - `GET /characters/available-voices` - список голосов с превью

### Поток данных

```
Клиент -> GET /characters/available-voices
       <- [список голосов с preview_url если кэш есть]

Клиент -> POST /chat/preview-voice {voice_id}
       -> generate_voice_preview()
       -> проверка кэша
       -> (если нет в кэше) вызов Fish Audio API
       -> сохранение в кэш
       <- URL к аудио файлу

Клиент -> воспроизведение аудио по URL
```

## Best Practices

✅ **Реализовано:**
1. Асинхронная обработка всех I/O операций
2. Кэширование для экономии API квот
3. Валидация существования файлов голосов
4. Детальное логирование всех операций
5. Обработка ошибок на всех уровнях
6. Типизация всех функций
7. Докстринги для всех функций
8. Использование Pydantic для валидации

✅ **Соответствие DRY, KISS, SOLID:**
- Функции имеют одну ответственность
- Переиспользование кода через общие функции
- Простая и понятная логика без избыточной сложности

## Возможные улучшения

1. **Предварительная генерация превью**
   - Можно создать скрипт для генерации всех превью заранее
   
2. **Очистка кэша**
   - Периодическая очистка старых файлов превью

3. **Мультиязычность**
   - Разные фразы приветствия для разных языков

4. **Мониторинг**
   - Метрики использования API Fish Audio
   - Статистика популярных голосов
