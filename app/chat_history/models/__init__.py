"""
Сохраняем совместимость модулей chat_history, переиспользуя основную модель.
"""
from app.models.chat_history import ChatHistory

__all__ = ["ChatHistory"]
