"""
Legacy import path for the chat history service.

Historically many modules imported ``ChatHistoryService`` from
``app.services.chat_history_service``.  The modern implementation that powers
all current endpoints lives in ``app.chat_history.services.chat_history_service``.

To keep backward compatibility (и, главное, чтобы эндпоинт
``/api/v1/chat-history/characters`` наконец-то видел реальные диалоги), мы
просто реэкспортируем новую версию отсюда.
"""

from app.chat_history.services.chat_history_service import ChatHistoryService

__all__ = ["ChatHistoryService"]

