# RunPod API Endpoints - Интеграция с FastAPI

## Регистрация router'а в main.py

Добавь в `app/main.py`:

```python
from app.api.endpoints import runpod_endpoints

# В функции create_app() или где регистрируются роутеры:
app.include_router(runpod_endpoints.router, prefix="/api/v1")
```

## Примеры использования API

### 1. Запуск генерации

**POST** `/api/v1/runpod/generate`

```bash
curl -X POST "http://localhost:8000/api/v1/runpod/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "beautiful anime girl with blue hair, detailed eyes",
    "width": 832,
    "height": 1216,
    "steps": 30,
    "use_enhanced_prompts": true
  }'
```

**Ответ:**
```json
{
  "task_id": "abc-123-def-456",
  "status": "pending",
  "message": "Image generation started. Use /status/{task_id} to check progress."
}
```

### 2. Проверка статуса

**GET** `/api/v1/runpod/status/{task_id}`

```bash
curl "http://localhost:8000/api/v1/runpod/status/abc-123-def-456"
```

**Ответ (в процессе):**
```json
{
  "task_id": "abc-123-def-456",
  "status": "started",
  "result": null
}
```

**Ответ (завершено):**
```json
{
  "task_id": "abc-123-def-456",
  "status": "success",
  "result": {
    "success": true,
    "image_url": "https://storage.runpod.io/...",
    "prompt": "beautiful anime girl...",
    "width": 832,
    "height": 1216,
    "steps": 30
  }
}
```

### 3. Пакетная генерация

**POST** `/api/v1/runpod/generate/batch`

```bash
curl -X POST "http://localhost:8000/api/v1/runpod/generate/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": [
      "anime girl with blue hair",
      "anime girl with red hair",
      "anime girl with green hair"
    ],
    "width": 832,
    "height": 1216,
    "steps": 30
  }'
```

### 4. Отмена задачи

**DELETE** `/api/v1/runpod/cancel/{task_id}`

```bash
curl -X DELETE "http://localhost:8000/api/v1/runpod/cancel/abc-123-def-456"
```

### 5. Тестирование подключения

**POST** `/api/v1/runpod/test`

```bash
curl -X POST "http://localhost:8000/api/v1/runpod/test"
```

### 6. Статистика очередей

**GET** `/api/v1/runpod/queue/stats`

```bash
curl "http://localhost:8000/api/v1/runpod/queue/stats"
```

**Ответ:**
```json
{
  "active_tasks": 2,
  "reserved_tasks": 5,
  "scheduled_tasks": 0,
  "workers": ["celery@worker1", "celery@worker2"]
}
```

## Интеграция с фронтендом

### JavaScript/TypeScript пример

```typescript
// Запуск генерации
async function generateImage(prompt: string) {
  const response = await fetch('/api/v1/runpod/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      width: 832,
      height: 1216,
      steps: 30
    })
  });
  
  const data = await response.json();
  return data.task_id;
}

// Опрос статуса
async function pollTaskStatus(taskId: string): Promise<string> {
  while (true) {
    const response = await fetch(`/api/v1/runpod/status/${taskId}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return data.result.image_url;
    } else if (data.status === 'failed') {
      throw new Error(data.error);
    }
    
    // Ждём 3 секунды перед следующим запросом
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Использование
const taskId = await generateImage("beautiful anime girl");
const imageUrl = await pollTaskStatus(taskId);
console.log(`Image ready: ${imageUrl}`);
```

### React пример с хуками

```tsx
import { useState, useEffect } from 'react';

function useImageGeneration(prompt: string) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Запуск генерации
  const generate = async () => {
    try {
      setStatus('starting');
      const response = await fetch('/api/v1/runpod/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width: 832, height: 1216, steps: 30 })
      });
      const data = await response.json();
      setTaskId(data.task_id);
      setStatus('pending');
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  };

  // Опрос статуса
  useEffect(() => {
    if (!taskId || status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/runpod/status/${taskId}`);
        const data = await response.json();
        
        setStatus(data.status);
        
        if (data.status === 'success') {
          setImageUrl(data.result.image_url);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError(data.error);
          clearInterval(interval);
        }
      } catch (err) {
        setError(err.message);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [taskId, status]);

  return { generate, status, imageUrl, error };
}

// Использование в компоненте
function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const { generate, status, imageUrl, error } = useImageGeneration(prompt);

  return (
    <div>
      <input 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt"
      />
      <button onClick={generate} disabled={status === 'pending'}>
        Generate
      </button>
      
      {status === 'pending' && <p>Generating...</p>}
      {imageUrl && <img src={imageUrl} alt="Generated" />}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

## Swagger UI

После регистрации router'а, документация будет доступна по адресу:
- **Swagger**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Права доступа

Endpoint'ы используют `get_current_user_optional`, что означает:
- Работают как для авторизованных пользователей
- Так и для гостей

Для ограничения доступа замени на `get_current_user`:

```python
current_user: Users = Depends(get_current_user)
```

## Лимиты и квоты

Для добавления лимитов используй декораторы:

```python
from app.auth.rate_limiter import rate_limit

@router.post("/generate")
@rate_limit(calls=10, period=3600)  # 10 запросов в час
async def start_image_generation(...):
    ...
```

## Мониторинг

Все операции логируются с префиксом `[RUNPOD API]`:

```bash
tail -f logs/app.log | grep "RUNPOD API"
```

