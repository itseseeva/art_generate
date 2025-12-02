"""
Конфигурация Celery для фоновых задач.
Использует Redis как брокер и backend для результатов.
"""
import os
import logging
from celery import Celery
from celery.signals import worker_ready, worker_shutting_down
from celery.backends.redis import RedisBackend
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Получаем URL Redis из переменных окружения или используем дефолтный
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class SafeRedisBackend(RedisBackend):
    """
    Кастомный Redis backend с обработкой ошибок десериализации старых записей.
    
    ВАЖНО: Это временное решение для обработки старых записей с неправильным форматом.
    Новые записи должны создаваться с правильным форматом (exc_type, exc_message).
    """
    
    def _get_task_meta_for(self, task_id):
        """
        Переопределяем метод для обработки ошибок десериализации старых записей.
        Если запись имеет неправильный формат - удаляем её и возвращаем пустые метаданные.
        Это позволяет retry работать даже при наличии старых проблемных записей.
        """
        try:
            return super()._get_task_meta_for(task_id)
        except (ValueError, KeyError) as e:
            error_str = str(e)
            # Обрабатываем только ошибки десериализации старых записей
            if ("Exception information must include the exception type" in error_str or 
                'exc_type' in error_str):
                # Логируем только один раз для каждой задачи, чтобы не засорять логи
                logger.debug(f"[CELERY] Обнаружена старая проблемная запись для задачи {task_id}, очищаю...")
                try:
                    self.delete(task_id)
                except Exception:
                    pass
                # Возвращаем пустые метаданные, чтобы retry мог продолжиться
                return {'status': 'PENDING', 'result': None, 'traceback': None, 'children': None}
            raise


# Создаем экземпляр Celery с оптимизированной конфигурацией
celery_app = Celery(
    "art_generation",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.generation_tasks", "app.tasks.email_tasks", "app.tasks.storage_tasks"],
    # Оптимизация импортов для ускорения запуска
    autodiscover_tasks=False,  # Отключаем автодискавери для ускорения
)

# Устанавливаем кастомный backend
# Используем приватный атрибут _backend напрямую, так как backend - это read-only property
backend_instance = SafeRedisBackend(app=celery_app, url=redis_url)
celery_app._backend = backend_instance

# Конфигурация Celery (оптимизирована согласно best practices)
celery_app.conf.update(
    # Настройки брокера (Redis)
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    broker_pool_limit=10,  # Пул соединений для брокера
    broker_connection_timeout=30,  # Таймаут подключения к брокеру
    broker_transport_options={
        'master_name': 'mymaster',  # Для Redis Sentinel (если используется)
        'visibility_timeout': 3600,  # Видимость задачи (1 час)
        'retry_policy': {
            'timeout': 5.0  # Таймаут для retry операций
        },
        'health_check_interval': 30,  # Проверка здоровья соединения
        'socket_keepalive': True,  # Keep-alive для соединений
        'socket_keepalive_options': {},
        'socket_connect_timeout': 5,
        'socket_timeout': 5,
    },
    
    # Настройки результатов (Redis Backend)
    result_expires=3600,  # Результаты хранятся 1 час
    result_serializer="json",
    accept_content=["json"],
    task_serializer="json",
    result_backend_transport_options={
        'master_name': 'mymaster',  # Для Redis Sentinel (если используется)
        'visibility_timeout': 3600,
        'retry_policy': {
            'timeout': 5.0
        },
        'health_check_interval': 30,
        'socket_keepalive': True,
        'socket_connect_timeout': 5,
        'socket_timeout': 5,
    },
    
    # Настройки задач
    task_track_started=True,  # Отслеживание начала выполнения
    task_time_limit=600,  # Максимальное время выполнения задачи (10 минут)
    task_soft_time_limit=540,  # Мягкий лимит (9 минут)
    task_acks_late=True,  # Подтверждение после выполнения (best practice)
    task_reject_on_worker_lost=True,  # Отклонять задачи при потере воркера
    worker_prefetch_multiplier=1,  # Берем по одной задаче за раз (best practice для долгих задач)
    task_always_eager=False,  # Не выполнять синхронно (для production)
    task_eager_propagates=True,  # Пробрасывать исключения при eager режиме
    
    # Настройки очередей
    task_routes={
        "app.tasks.generation_tasks.generate_image_task": {"queue": "high_priority"},
        "app.tasks.generation_tasks.generate_image_task_premium": {"queue": "high_priority"},
        "app.tasks.storage_tasks.upload_to_cloud_task": {"queue": "normal_priority"},
        "app.tasks.email_tasks.send_email_task": {"queue": "low_priority"},
        "app.tasks.generation_tasks.save_chat_history_task": {"queue": "low_priority"},
    },
    
    # Настройки retry
    task_default_retry_delay=60,  # Задержка перед повтором (60 секунд)
    task_max_retries=3,  # Максимальное количество повторов
    task_autoretry_for=(Exception,),  # Автоматический retry для всех исключений
    task_acks_on_failure_or_timeout=True,  # Подтверждать даже при ошибках
    
    # Настройки воркеров
    worker_max_tasks_per_child=50,  # Перезапуск воркера после 50 задач (предотвращение утечек памяти)
    worker_disable_rate_limits=False,
    worker_send_task_events=True,  # Отправлять события задач (для мониторинга)
    task_send_sent_event=True,  # Отправлять событие отправки задачи
    
    # Оптимизация производительности
    worker_direct=True,  # Прямая отправка задач воркерам (быстрее)
    task_ignore_result=False,  # Сохранять результаты (для отслеживания)
    task_store_eager_result=True,  # Сохранять результаты даже в eager режиме
    
    # Часовой пояс
    timezone="UTC",
    enable_utc=True,
    
    # Мониторинг и логирование
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
)

# Именование очередей
celery_app.conf.task_default_queue = "normal_priority"
celery_app.conf.task_default_exchange = "tasks"
celery_app.conf.task_default_exchange_type = "direct"
celery_app.conf.task_default_routing_key = "normal_priority"


def cleanup_old_celery_results():
    """
    Очищает старые результаты Celery из Redis, которые могут вызывать ошибки десериализации.
    Удаляет записи с неправильным форматом исключений.
    """
    try:
        import redis
        from urllib.parse import urlparse
        
        # Парсим URL Redis
        if redis_url.startswith("redis://"):
            # Убираем префикс для правильного парсинга
            url_for_parse = redis_url.replace("redis://", "http://", 1)
        else:
            url_for_parse = f"http://{redis_url}"
        
        parsed = urlparse(url_for_parse)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        # Извлекаем номер базы данных из пути
        db = 0
        if parsed.path:
            db_str = parsed.path.lstrip("/").split("/")[0]
            if db_str:
                try:
                    db = int(db_str)
                except ValueError:
                    db = 0
        
        # Подключаемся к Redis
        r = redis.Redis(host=host, port=port, db=db, decode_responses=False)
        
        # Получаем все ключи результатов Celery
        celery_keys = r.keys("celery-task-meta-*")
        
        if not celery_keys:
            return
        
        # Убираем детальное логирование очистки
        
        # Проверяем и удаляем записи с неправильным форматом
        deleted_count = 0
        for key in celery_keys:
            try:
                # Пытаемся прочитать значение
                value = r.get(key)
                if value:
                    # Пытаемся декодировать JSON
                    import json
                    try:
                        data = json.loads(value)
                        # Проверяем, есть ли поле result с неправильным форматом исключения
                        if isinstance(data, dict) and "result" in data:
                            result = data["result"]
                            # Если result - это словарь без exc_type, но с ошибкой - удаляем
                            if isinstance(result, dict):
                                # Проверяем различные признаки проблемных записей
                                has_error = "error" in result or "exc" in result or "exception" in result
                                missing_exc_type = "exc_type" not in result
                                # Также проверяем, если это строка с ошибкой десериализации
                                if (has_error and missing_exc_type) or "Exception information must include" in str(result):
                                    r.delete(key)
                                    deleted_count += 1
                                    logger.debug(f"[CELERY] Удалена проблемная запись: {key.decode() if isinstance(key, bytes) else key}")
                    except (json.JSONDecodeError, TypeError):
                        # Если не удалось декодировать - удаляем
                        r.delete(key)
                        deleted_count += 1
                        logger.debug(f"[CELERY] Удалена невалидная запись: {key.decode() if isinstance(key, bytes) else key}")
            except Exception as e:
                logger.warning(f"[CELERY] Ошибка при обработке ключа {key}: {e}")
                # При ошибке тоже удаляем проблемную запись
                try:
                    r.delete(key)
                    deleted_count += 1
                except Exception:
                    pass
        
        if deleted_count > 0:
            logger.warning(f"[CELERY] Очищено {deleted_count} проблемных результатов")
            
    except Exception as e:
        logger.warning(f"[CELERY] Не удалось выполнить автоматическую очистку результатов: {e}")


def purge_queues():
    """
    Очищает все очереди Celery от старых задач.
    Используйте с осторожностью - это удалит все задачи в очередях!
    """
    try:
        # Получаем все очереди из конфигурации
        queues = ["high_priority", "normal_priority", "low_priority"]
        
        purged_count = 0
        for queue_name in queues:
            try:
                # Используем метод purge для очистки очереди
                count = celery_app.control.purge()
                if count:
                    purged_count += count
                    logger.info(f"[CELERY] Очищена очередь {queue_name}: удалено {count} задач")
            except Exception as e:
                logger.warning(f"[CELERY] Не удалось очистить очередь {queue_name}: {e}")
        
        if purged_count > 0:
            logger.info(f"[CELERY] Всего очищено {purged_count} задач из очередей")
        else:
            logger.info("[CELERY] Очереди пусты, очистка не требуется")
            
    except Exception as e:
        logger.warning(f"[CELERY] Не удалось выполнить очистку очередей: {e}")


def init_database_tables():
    """
    Инициализирует таблицы базы данных при запуске worker.
    Необходимо для работы с БД в Celery worker.
    """
    try:
        from app.database.db import engine, Base
        import asyncio
        
        # Импортируем все модели, чтобы они были зарегистрированы в Base.metadata
        from app.models.user import Users, RefreshToken, EmailVerificationCode
        from app.models.subscription import UserSubscription
        from app.models.chat_history import ChatHistory
        from app.models.user_gallery import UserGallery
        from app.models.user_gallery_unlock import UserGalleryUnlock
        
        # Создаем таблицы синхронно
        async def create_tables():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        
        # Запускаем создание таблиц
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(create_tables())
            logger.warning("[CELERY] Таблицы БД инициализированы")
        finally:
            loop.close()
            
    except Exception as e:
        logger.warning(f"[CELERY] Не удалось инициализировать таблицы БД: {e}")


@worker_ready.connect
def on_worker_ready(sender=None, **kwargs):
    """Вызывается при готовности worker к работе."""
    logger.warning("[CELERY] Worker готов к работе")
    
    # Инициализируем таблицы БД
    init_database_tables()
    
    cleanup_old_celery_results()
    
    # Показываем количество задач в очередях
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()
        reserved = inspect.reserved()
        scheduled = inspect.scheduled()
        
        total_tasks = 0
        if active:
            total_tasks += sum(len(tasks) for tasks in active.values())
        if reserved:
            total_tasks += sum(len(tasks) for tasks in reserved.values())
        if scheduled:
            total_tasks += sum(len(tasks) for tasks in scheduled.values())
        
        if total_tasks > 0:
            logger.warning(f"[CELERY] Задач в очередях: {total_tasks}")
        else:
            logger.warning("[CELERY] Очереди пусты")
    except Exception as e:
        logger.warning(f"[CELERY] Не удалось проверить очереди: {e}")
    
    # Опционально: очистка очередей при запуске (раскомментируйте, если нужно)
    # purge_queues()

