#!/bin/bash
# Устанавливаем кодовую страницу UTF-8 для Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || -n "$WINDIR" ]]; then
    chcp 65001 >nul 2>&1 || true
fi

# Устанавливаем переменные окружения для UTF-8
export PYTHONIOENCODING=utf-8
export PYTHONUTF8=1
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

# Запускаем сервер
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

