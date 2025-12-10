#!/bin/bash
# Обертка для запуска cog команд через Python

# Активируем виртуальное окружение
source venv/Scripts/activate

# Проверяем аргументы
if [ "$1" = "push" ]; then
    # Для команды push используем Python напрямую
    # Cog CLI должен быть установлен отдельно
    echo "Для команды 'cog push' необходимо установить Cog CLI."
    echo "Попробуйте один из способов:"
    echo "1. Установите через официальный установщик: https://replicate.com/docs/get-started/install-cog"
    echo "2. Используйте Docker для сборки и загрузки"
    echo "3. Добавьте путь к Scripts в PATH: export PATH=\$PATH:/c/project_A/venv/Scripts"
    exit 1
else
    # Для других команд пробуем найти cog
    if command -v cog &> /dev/null; then
        cog "$@"
    else
        echo "Команда 'cog' не найдена."
        echo "Убедитесь, что Cog CLI установлен и добавлен в PATH."
        exit 1
    fi
fi

