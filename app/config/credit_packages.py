"""
Конфигурация пакетов разовой докупки кредитов (Credit Top-up).
Премиальное ценообразование для стимулирования продления подписки.
"""

from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class CreditPackage:
    """Модель пакета кредитов для разовой покупки."""
    id: str
    name: str
    credits: int
    price: float  # Цена в рублях
    price_per_credit: float  # Цена за 1 кредит
    description: str = ""


# Конфигурация пакетов
CREDIT_PACKAGES: List[CreditPackage] = [
    CreditPackage(
        id="small",
        name="Small",
        credits=200,
        price=15.0,
        price_per_credit=0.075,  # ~0.075₽/кредит
    ),
    CreditPackage(
        id="medium",
        name="Medium",
        credits=500,
        price=259.0,
        price_per_credit=0.518,  # ~0.52₽/кредит
    ),
    CreditPackage(
        id="large",
        name="Large",
        credits=1000,
        price=499.0,
        price_per_credit=0.499,  # ~0.5₽/кредит
    ),
]


def get_credit_package(package_id: str) -> CreditPackage | None:
    """Получить пакет по ID."""
    for package in CREDIT_PACKAGES:
        if package.id == package_id:
            return package
    return None


def get_all_packages() -> List[Dict[str, Any]]:
    """Получить все пакеты в виде словарей для API."""
    return [
        {
            "id": pkg.id,
            "name": pkg.name,
            "credits": pkg.credits,
            "price": pkg.price,
            "price_per_credit": pkg.price_per_credit,
            "description": pkg.description
        }
        for pkg in CREDIT_PACKAGES
    ]
