# Модуль истории чата

Этот модуль содержит всю логику для работы с историей чата в системе.

## Структура модуля

```
app/chat_history/
├── __init__.py                 # Главный файл модуля с экспортами
├── models/
│   ├── __init__.py
│   └── chat_history.py         # Модель ChatHistory для базы данных
├── services/
│   ├── __init__.py
│   └── chat_history_service.py # Сервис для работы с историей чата
└── api/
    ├── __init__.py
    └── endpoints.py            # API эндпоинты для истории чата
```

## Функциональность

### Модель ChatHistory
- Сохранение сообщений чата по персонажам
- Связь с пользователями через `user_id`
- Поддержка изображений в сообщениях
- Индексы для быстрого поиска

### Сервис ChatHistoryService
- `can_save_history()` - проверка прав на сохранение истории
- `save_message()` - сохранение сообщения в историю
- `get_chat_history()` - получение истории чата
- `get_user_characters_with_history()` - список персонажей с историей
- `clear_chat_history()` - очистка истории чата
- `get_history_stats()` - статистика по истории

### API Эндпоинты
- `POST /api/v1/chat-history/save-message` - сохранение сообщения
- `POST /api/v1/chat-history/get-history` - получение истории
- `GET /api/v1/chat-history/characters` - список персонажей
- `POST /api/v1/chat-history/clear-history` - очистка истории
- `GET /api/v1/chat-history/stats` - статистика

## Права доступа

История чата доступна только пользователям с подпиской **Premium** или **Pro**.
Пользователи с подпиской **Base** не имеют доступа к этой функции.

## Использование

```python
from app.chat_history import ChatHistoryService, chat_history_router

# В FastAPI приложении
app.include_router(chat_history_router, prefix="/api/v1/chat-history")

# В сервисах
history_service = ChatHistoryService(db)
can_save = await history_service.can_save_history(user_id)
```

## Интеграция с фронтендом

Фронтенд автоматически:
- Проверяет права на сохранение истории при загрузке
- Сохраняет каждое сообщение в историю (если есть права)
- Загружает историю при переключении персонажей
- Отображает сохраненную историю в чате
