"""
Скрипт для тестирования потока платежей YooKassa.
Позволяет проверить обработку webhook без реальной оплаты.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.youkassa.config import get_kassa_config
from app.config.credit_packages import get_credit_package, get_all_packages


def print_test_info():
    """Выводит информацию для тестирования."""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ ПЛАТЕЖЕЙ YOOKASSA")
    print("=" * 70)
    
    # Проверяем конфигурацию
    try:
        cfg = get_kassa_config()
        print(f"\n[OK] Конфигурация загружена:")
        print(f"     Shop ID: {cfg['shop_id']}")
        print(f"     Secret Key: {'*' * 20} (установлен)")
        print(f"     Return URL: {cfg['return_url']}")
    except Exception as e:
        print(f"\n[ERROR] Ошибка конфигурации: {e}")
        return
    
    # Показываем пакеты
    print(f"\n[INFO] Доступные пакеты:")
    packages = get_all_packages()
    for pkg in packages:
        print(f"     - {pkg['name']}: {pkg['credits']} кредитов за {pkg['price']} RUB")
    
    print("\n" + "=" * 70)
    print("СПОСОБЫ ТЕСТИРОВАНИЯ")
    print("=" * 70)
    
    print("\n1. ЧЕРЕЗ ФРОНТЕНД (рекомендуется):")
    print("   - Зайдите на https://cherrylust.art/shop")
    print("   - Войдите в аккаунт")
    print("   - Выберите пакет и нажмите оплату")
    print("   - Используйте тестовую карту: 5555 5555 5555 4444")
    print("   - Срок: 12/25, CVC: 123")
    
    print("\n2. ЧЕРЕЗ API (тестовый webhook):")
    print("   POST https://cherrylust.art/api/v1/kassa/test-webhook/")
    print("   Authorization: Bearer <ваш_токен>")
    print("   Body:")
    print("   {")
    print('     "user_id": 1,')
    print('     "payment_type": "topup",')
    print('     "package_id": "small"')
    print("   }")
    
    print("\n3. ПРОВЕРКА ТРАНЗАКЦИЙ:")
    print("   GET https://cherrylust.art/api/v1/kassa/transactions/{user_id}")
    print("   Authorization: Bearer <ваш_токен>")
    
    print("\n" + "=" * 70)
    print("ВАЖНО ДЛЯ WEBHOOK В YOOKASSA:")
    print("=" * 70)
    print("   URL: https://cherrylust.art/api/v1/kassa/webhook/")
    print("   Событие: payment.succeeded (ОБЯЗАТЕЛЬНО включить!)")
    print("   НЕ включайте payout.succeeded - это для выплат!")
    
    print("\n" + "=" * 70)
    print("ТЕСТОВАЯ КАРТА:")
    print("=" * 70)
    print("   Номер: 5555 5555 5555 4444")
    print("   Срок: любая дата в будущем (например, 12/25)")
    print("   CVC: любые 3 цифры (например, 123)")
    print("   Имя: любое")
    print("\n   Эта карта НЕ списывает реальные деньги!")
    
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print_test_info()
