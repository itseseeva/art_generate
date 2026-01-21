# Руководство по загрузке пользовательских голосов

## Функциональность

### ✅ Что реализовано:

1. **Загрузка пользовательских голосов**
   - Пользователь может загрузить свой аудио файл (MP3, WAV)
   - Автоматическая генерация превью с дефолтной фразой приветствия
   - Сохранение оригинала и превью

2. **Озвучка сообщений в чате**
   - Генерация речи персонажей через Fish Audio API
   - Клонирование голоса из загруженного образца
   - Fallback на дефолтные голоса для старых персонажей

3. **Дефолтные голоса**
   - Готовые образцы в `app/default_character_voices/`
   - Превью дефолтных голосов создаются вручную на fish.audio

## API Endpoints

### 1. Загрузка пользовательского голоса

**POST** `/api/v1/characters/upload-voice`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
voice_file: <audio_file.mp3>  (file upload)
```

**Ограничения:**
- Форматы: MP3, WAV
- Максимальный размер: 10 MB
- Рекомендуемая длительность образца: 5-15 секунд

**Response (Success):**
```json
{
  "status": "success",
  "message": "Голос успешно загружен и превью сгенерировано",
  "voice_url": "/user_voices/user_voice_abc123.mp3",
  "preview_url": "/voices/preview_abc123.mp3",
  "voice_path": "app/user_voices/user_voice_abc123.mp3",
  "preview_path": "app/voices/preview_abc123.mp3"
}
```

**Response (Error):**
```json
{
  "detail": "Описание ошибки"
}
```

**Возможные ошибки:**
- `400` - Неподдерживаемый тип файла
- `400` - Файл слишком большой (>10 MB)
- `400` - Файл пустой
- `401` - Требуется авторизация
- `500` - Ошибка генерации превью

### 2. Генерация голоса для сообщения

**POST** `/api/v1/chat/generate_voice`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "text": "Текст для озвучки",
  "voice_url": "/user_voices/user_voice_abc123.mp3"
}
```

**Response:**
```json
{
  "status": "success",
  "audio_url": "/voices/generated_xyz789.mp3"
}
```

### 3. Превью голоса (для дефолтных)

**POST** `/api/v1/chat/preview-voice`

**Body:**
```json
{
  "voice_id": "voice_preview_aitana.mp3",
  "text": null
}
```

## Структура файлов

```
app/
├── default_character_voices/     # Образцы дефолтных голосов
│   ├── voice_preview_aitana.mp3
│   ├── voice_preview_marina.mp3
│   └── ...
│
├── user_voices/                  # Загруженные пользователями голоса
│   ├── user_voice_abc123.mp3
│   ├── user_voice_def456.mp3
│   └── ...
│
└── voices/                       # Сгенерированные аудио и превью
    ├── preview_abc123.mp3        # Превью загруженного голоса
    ├── preview_def456.mp3
    ├── generated_xyz789.mp3       # Озвучка сообщения
    └── ...
```

## Флоу работы

### Загрузка голоса пользователем:

```
1. Пользователь выбирает аудио файл
   ↓
2. POST /characters/upload-voice
   ↓
3. Валидация файла (тип, размер)
   ↓
4. Сохранение в app/user_voices/
   ↓
5. Вызов Fish Audio API для генерации превью
   ↓
6. Сохранение превью в app/voices/
   ↓
7. Возврат URL'ов пользователю
```

### Создание персонажа с голосом:

```
1. Пользователь создает персонажа
   ↓
2. Выбирает голос:
   - Дефолтный: /default_character_voices/voice_preview_xxx.mp3
   - Загруженный: /user_voices/user_voice_xxx.mp3
   ↓
3. Проигрывание превью:
   - Дефолтный: вручную созданное превью
   - Загруженный: /voices/preview_xxx.mp3
   ↓
4. Сохранение voice_url в БД
```

### Озвучка сообщений в чате:

```
1. Персонаж отправляет сообщение
   ↓
2. POST /chat/generate_voice
   {text: "...", voice_url: "..."}
   ↓
3. Определение типа голоса:
   - Дефолтный: загрузка из default_character_voices/
   - Пользовательский: загрузка из user_voices/
   - Старый URL (fal.ai): fallback на дефолтный
   ↓
4. Fish Audio клонирует голос
   ↓
5. Генерация речи с текстом
   ↓
6. Сохранение в app/voices/
   ↓
7. Возврат URL для проигрывания
```

## Примеры использования

### Python (requests):

```python
import requests

# Загрузка голоса
with open('my_voice.mp3', 'rb') as f:
    files = {'voice_file': f}
    headers = {'Authorization': 'Bearer YOUR_TOKEN'}
    
    response = requests.post(
        'http://localhost:8001/api/v1/characters/upload-voice',
        headers=headers,
        files=files
    )
    
    result = response.json()
    print(f"Voice URL: {result['voice_url']}")
    print(f"Preview URL: {result['preview_url']}")

# Генерация голоса
data = {
    'text': 'Привет! Как дела?',
    'voice_url': result['voice_url']
}

response = requests.post(
    'http://localhost:8001/api/v1/chat/generate_voice',
    headers=headers,
    json=data
)

audio_result = response.json()
print(f"Audio URL: {audio_result['audio_url']}")
```

### JavaScript (fetch):

```javascript
// Загрузка голоса
const formData = new FormData();
formData.append('voice_file', fileInput.files[0]);

const uploadResponse = await fetch('/api/v1/characters/upload-voice', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const uploadResult = await uploadResponse.json();
console.log('Voice URL:', uploadResult.voice_url);
console.log('Preview URL:', uploadResult.preview_url);

// Генерация голоса
const generateResponse = await fetch('/api/v1/chat/generate_voice', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Привет! Как дела?',
    voice_url: uploadResult.voice_url
  })
});

const audioResult = await generateResponse.json();
console.log('Audio URL:', audioResult.audio_url);
```

## Настройка

### Переменные окружения (.env):

```env
# Fish Audio API ключ (обязательно)
FISH_AUDIO_API_KEY=your_api_key_here
```

### Стоимость:

- **Загрузка голоса**: ~$0.01-0.02 за превью (одноразово)
- **Озвучка сообщения**: ~$0.002-0.005 за сообщение

### Рекомендации по образцам голосов:

1. **Длительность**: 5-15 секунд (оптимально 10 сек)
2. **Качество**: чистый звук без шумов
3. **Контент**: естественная речь, желательно с интонациями
4. **Формат**: MP3 320kbps или WAV 16-bit

## Устранение неполадок

### Ошибка: "Invalid api key or insufficient balance"

**Решение:**
- Проверьте API ключ в .env
- Пополните баланс на fish.audio
- Перезапустите сервер

### Ошибка: "Неподдерживаемый тип файла"

**Решение:**
- Используйте только MP3 или WAV
- Убедитесь, что файл не поврежден

### Ошибка: "Файл слишком большой"

**Решение:**
- Максимальный размер: 10 MB
- Сожмите аудио или уменьшите битрейт
- Сократите длительность до 10-15 секунд

### Превью не генерируется

**Возможные причины:**
- Недостаточно средств на балансе Fish Audio
- Неверный формат аудио
- Проблемы с сетью

**Решение:**
- Проверьте логи сервера
- Убедитесь, что Fish Audio API доступен
- Проверьте баланс

## Безопасность

### Ограничения:

1. Требуется авторизация для загрузки
2. Максимальный размер файла: 10 MB
3. Только определенные форматы: MP3, WAV
4. Файлы сохраняются с уникальными именами (UUID)

### Рекомендации:

- Добавить rate limiting для endpoint загрузки
- Добавить проверку квоты пользователя
- Сканировать файлы на вирусы (опционально)
- Добавить watermark к сгенерированным аудио (опционально)

## Что дальше?

### Возможные улучшения:

1. **Управление голосами**
   - Список загруженных голосов
   - Удаление голосов
   - Переименование

2. **Предварительный просмотр**
   - Загрузка и прослушивание перед сохранением
   - Trim/Edit аудио

3. **Emotion control**
   - Настройка эмоций для генерации
   - Скорость речи
   - Тон голоса

4. **Библиотека голосов**
   - Публичные голоса от пользователей
   - Рейтинги голосов
   - Категории (мужской, женский, детский и т.д.)
