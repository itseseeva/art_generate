from app.config.settings import settings

# Экспортируем settings как config для обратной совместимости
config = settings

__all__ = ['config', 'settings']
