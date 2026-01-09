"""
Скрипт для проверки конфигурации YooKassa и тестирования платежей.
"""
import os
import sys
from pathlib import Path

# Устанавливаем UTF-8 для вывода в Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Добавляем корневую директорию в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.youkassa.config import get_kassa_config
from app.config.credit_packages import get_credit_package, get_all_packages


def check_config():
    """Проверяет конфигурацию YooKassa."""
    print("=" * 60)
    print("Проверка конфигурации YooKassa")
    print("=" * 60)
    
    try:
        cfg = get_kassa_config()
        print(f"\n[OK] Shop ID: {cfg['shop_id']}")
        print(f"[OK] Secret Key: {'*' * 20} (установлен)")
        print(f"[OK] Return URL: {cfg['return_url']}")
        print(f"[OK] Currency: {cfg['currency']}")
        print(f"[OK] Capture: {cfg['capture']}")
        
        # Проверяем, тестовый ли это ключ
        secret_key = os.getenv("YOU_KASSA_TEST_API_KEY") or os.getenv("YOU_KASSA_API_KEY") or os.getenv("YOOKASSA_SECRET_KEY")
        if secret_key and ("test" in secret_key.lower() or secret_key.startswith("test_")):
            print(f"\n[INFO] Используется ТЕСТОВЫЙ ключ")
        else:
            print(f"\n[WARNING] Возможно используется БОЕВОЙ ключ!")
            print(f"         Убедитесь, что это тестовый ключ из личного кабинета YooKassa")
        
        return True
    except ValueError as e:
        print(f"\n[ERROR] Ошибка конфигурации: {e}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Неожиданная ошибка: {e}")
        return False


def check_packages():
    """Проверяет доступные пакеты кредитов."""
    print("\n" + "=" * 60)
    print("Доступные пакеты кредитов")
    print("=" * 60)
    
    packages = get_all_packages()
    for pkg in packages:
        print(f"\nПакет: {pkg['name']} (ID: {pkg['id']})")
        print(f"  Кредиты: {pkg['credits']}")
        print(f"  Цена: {pkg['price']} RUB")
        print(f"  Цена за кредит: {pkg['price_per_credit']:.3f} RUB")
    
    return packages


def show_test_info():
    """Показывает информацию для тестирования."""
    print("\n" + "=" * 60)
    print("Информация для тестирования")
    print("=" * 60)
    
    print("\n1. Тестовая карта для оплаты:")
    print("   Номер: 5555 5555 5555 4444")
    print("   Срок: любая дата в будущем (например, 12/25)")
    print("   CVC: любые 3 цифры (например, 123)")
    
    print("\n2. Webhook URL должен быть настроен в YooKassa:")
    print("   https://cherrylust.art/api/v1/kassa/webhook/")
    print("   Событие: payment.succeeded (ОБЯЗАТЕЛЬНО!)")
    
    print("\n3. Для создания тестового платежа:")
    print("   - Зайдите на сайт: https://cherrylust.art/shop")
    print("   - Войдите в аккаунт")
    print("   - Выберите пакет и нажмите оплату")
    print("   - Используйте тестовую карту выше")
    
    print("\n4. Проверка транзакций:")
    print("   GET https://cherrylust.art/api/v1/kassa/transactions/{user_id}")
    print("   Authorization: Bearer <ваш_токен>")


if __name__ == "__main__":
    print("\n")
    config_ok = check_config()
    
    if config_ok:
        check_packages()
        show_test_info()
        print("\n" + "=" * 60)
        print("[OK] Конфигурация проверена успешно!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("[ERROR] Исправьте ошибки конфигурации!")
        print("=" * 60)
        sys.exit(1)
