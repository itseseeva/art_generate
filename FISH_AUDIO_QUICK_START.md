# Fish Audio TTS - Быстрый старт

## Что было сделано

✅ Полностью удалена интеграция с fal.ai  
✅ Реализована интеграция с Fish Audio SDK  
✅ Используется instant voice cloning (не нужно создавать модели)  
✅ Добавлено кэширование превью голосов  

## Установка

### 1. Установите зависимости

```bash
pip install fish-audio-sdk
```

Или:

```bash
pip install -r requirements.txt
```

### 2. Получите API ключ Fish Audio

1. Зарегистрируйтесь: https://fish.audio/
2. Перейдите в Developer Settings
3. Создайте API ключ
4. Скопируйте его

### 3. Добавьте ключ в .env

Откройте `.env` файл и добавьте:

```env
FISH_AUDIO_API_KEY=ваш_ключ_здесь
```

### 4. Перезапустите сервер

```bash
# Остановите текущий сервер (Ctrl+C)
# Запустите заново
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Как это работает

### Instant Voice Cloning

Вместо создания постоянных моделей, мы используем **instant voice cloning**:

1. При каждом запросе TTS передается образец голоса из `app/default_character_voices/`
2. Fish Audio клонирует голос на лету
3. Генерируется речь с характеристиками образца
4. Результат сохраняется локально

**Преимущества:**
- ✅ Не нужно создавать модели заранее
- ✅ Проще в использовании
- ✅ Работает сразу после добавления новых голосов

**Недостатки:**
- ⚠️ Каждый запрос передает аудио образец (~100-200 KB)
- ⚠️ Может быть чуть медленнее, чем с pre-trained моделями

### Кэширование

- **Превью голосов** кэшируются на диске в `app/voices/`
- Используется MD5 хэш от `voice_id + text`
- При повторном запросе возвращается кэшированная версия

## Тестирование

### Проверка в логах

После запроса на генерацию голоса вы должны увидеть:

```
INFO | app.services.tts_service:generate_tts_audio:XX - Начало генерации речи через Fish Audio...
INFO | app.services.tts_service:_load_voice_audio:XX - Загружен аудио файл голоса...
INFO | app.services.tts_service:generate_tts_audio:XX - Аудио успешно сгенерировано и сохранено...
```

### Проверка через API

```bash
curl -X POST http://localhost:8001/api/v1/chat/generate_voice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Привет! Как дела?",
    "voice_url": "/default_character_voices/voice_preview_aitana_warm_friendly_and_expressive.mp3"
  }'
```

## Устранение проблем

### Ошибка: "FISH_AUDIO_API_KEY не установлен"

**Решение:**
```bash
# Проверьте .env файл
cat .env | grep FISH_AUDIO_API_KEY

# Если пусто, добавьте ключ
echo "FISH_AUDIO_API_KEY=your_key_here" >> .env

# Перезапустите сервер
```

### Ошибка: "No module named 'fishaudio'"

**Решение:**
```bash
# Убедитесь, что используете правильный venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установите SDK
pip install fish-audio-sdk
```

### Ошибка: "Файл голоса не найден"

**Решение:**
```bash
# Проверьте наличие голосов
ls app/default_character_voices/

# Убедитесь, что voice_url правильный
# Формат: /default_character_voices/filename.mp3
```

### Генерация работает, но аудио пустое/битое

**Возможные причины:**
- Неправильный API ключ
- Проблемы с форматом образца голоса
- Лимит API исчерпан

**Решение:**
- Проверьте квоту на fish.audio
- Убедитесь, что образцы голосов в формате MP3
- Проверьте логи на наличие ошибок от API

## Следующие шаги

### Опциональные улучшения:

1. **Создание persistent моделей** (если нужна максимальная скорость):
   ```python
   # Можно создать модели один раз при старте
   # И использовать reference_id вместо передачи аудио
   ```

2. **Настройка параметров генерации**:
   ```python
   client.tts.convert(
       text=text,
       references=[...],
       format="mp3",
       # Дополнительные параметры:
       # latency="normal",  # или "balanced"
       # prosody={"speed": 1.0, "volume": 1.0}
   )
   ```

3. **Добавление Redis кэша для reference_id** (если решите использовать модели)

4. **Мониторинг использования API**

## Поддержка

Если возникнут проблемы:
1. Проверьте логи сервера
2. Убедитесь, что API ключ валидный
3. Проверьте документацию Fish Audio: https://docs.fish.audio/

## Изменения в коде

**Модифицированные файлы:**
- `requirements.txt` - добавлен fish-audio-sdk
- `app/config/settings.py` - добавлен FISH_AUDIO_API_KEY
- `app/services/tts_service.py` - полностью переписан под Fish Audio
- `app/services/VOICE_PREVIEW_README.md` - обновлена документация

**Удалено:**
- Зависимость `fal-client`
- Настройки `FAL_API_KEY`, `DIA_TTS_MODEL`, `PUBLIC_BASE_URL`
- Весь код интеграции с fal.ai
