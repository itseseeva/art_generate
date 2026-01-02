#!/bin/bash

# Скрипт для проверки наличия всех необходимых переменных окружения

echo "Проверка переменных окружения для Art Generation..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ ОШИБКА: Файл .env не найден!"
    exit 1
fi

echo "✓ Файл .env найден"

# Список обязательных переменных
REQUIRED_VARS=(
    "RUNPOD_API_KEY"
    "RUNPOD_URL"
    "RUNPOD_URL_2"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "POSTGRES_DB"
    "DATABASE_URL"
    "REDIS_URL"
)

# Список опциональных переменных (для новых моделей)
OPTIONAL_VARS=(
    "RUNPOD_URL_3"
)

# Проверяем обязательные переменные
echo ""
echo "Проверка обязательных переменных:"
MISSING_REQUIRED=0
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null; then
        value=$(grep "^${var}=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -z "$value" ]; then
            echo "⚠️  ${var}: установлена, но пуста"
            MISSING_REQUIRED=1
        else
            # Маскируем чувствительные данные
            if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"SECRET"* ]]; then
                masked_value="${value:0:4}...${value: -4}"
                echo "✓ ${var}: ${masked_value}"
            else
                echo "✓ ${var}: установлена"
            fi
        fi
    else
        echo "❌ ${var}: НЕ УСТАНОВЛЕНА"
        MISSING_REQUIRED=1
    fi
done

# Проверяем опциональные переменные
echo ""
echo "Проверка опциональных переменных (для новых моделей):"
MISSING_OPTIONAL=0
for var in "${OPTIONAL_VARS[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null; then
        value=$(grep "^${var}=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -z "$value" ]; then
            echo "⚠️  ${var}: установлена, но пуста"
        else
            echo "✓ ${var}: установлена"
        fi
    else
        echo "⚠️  ${var}: НЕ УСТАНОВЛЕНА (модель 'Реализм' будет недоступна)"
        MISSING_OPTIONAL=1
    fi
done

echo ""
if [ $MISSING_REQUIRED -eq 1 ]; then
    echo "❌ ОШИБКА: Отсутствуют обязательные переменные окружения!"
    echo "Пожалуйста, добавьте недостающие переменные в файл .env"
    exit 1
fi

if [ $MISSING_OPTIONAL -eq 1 ]; then
    echo "⚠️  ВНИМАНИЕ: Отсутствуют некоторые опциональные переменные."
    echo "Некоторые функции могут быть недоступны."
    echo ""
    echo "Для добавления RUNPOD_URL_3 в .env файл:"
    echo "  echo 'RUNPOD_URL_3=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/run' >> .env"
    exit 0
fi

echo "✓ Все переменные окружения установлены корректно!"
exit 0

