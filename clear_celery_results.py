"""
Скрипт для очистки старых результатов Celery из Redis.
Использование: python clear_celery_results.py
"""
import redis
import os
import sys

def clear_celery_results():
    """Очищает все результаты Celery из Redis."""
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    try:
        # Парсим URL Redis
        if redis_url.startswith("redis://"):
            redis_url = redis_url.replace("redis://", "")
        
        # Извлекаем хост, порт и базу данных
        if "/" in redis_url:
            host_port, db = redis_url.split("/")
        else:
            host_port, db = redis_url, "0"
        
        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host, port = host_port, "6379"
        
        port = int(port)
        db = int(db)
        
        # Подключаемся к Redis
        r = redis.Redis(host=host, port=port, db=db, decode_responses=False)
        
        # Получаем все ключи Celery
        celery_keys = r.keys("celery-task-meta-*")
        
        if not celery_keys:
            print("Нет результатов Celery для очистки.")
            return
        
        print(f"Найдено {len(celery_keys)} результатов Celery.")
        
        # Удаляем все ключи
        deleted = 0
        for key in celery_keys:
            try:
                r.delete(key)
                deleted += 1
            except Exception as e:
                print(f"Ошибка при удалении ключа {key}: {e}")
        
        print(f"Удалено {deleted} результатов Celery.")
        
        # Также очищаем другие возможные ключи Celery
        other_keys = r.keys("celery-*")
        if other_keys:
            print(f"Найдено {len(other_keys)} других ключей Celery.")
            for key in other_keys:
                try:
                    r.delete(key)
                except Exception:
                    pass
        
        print("Очистка завершена.")
        
    except Exception as e:
        print(f"Ошибка при очистке Redis: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clear_celery_results()

