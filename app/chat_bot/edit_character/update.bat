@echo off
chcp 65001 >nul
echo ========================================
echo   Обновление персонажей из файлов в БД
echo ========================================
echo.

cd /D "%~dp0"

if "%1"=="" (
    echo 📋 Использование:
    echo   update.bat [имя_персонажа]
    echo   update.bat --list
    echo.
    echo 📝 Примеры:
    echo   update.bat anna
    echo   update.bat new_char
    echo   update.bat --list
    echo.
    pause
    exit /b 1
)

echo 🚀 Запускаем обновление персонажа...
echo.

python update_character.py %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Ошибка обновления персонажа
    echo 🔍 Проверьте логи выше для деталей
) else (
    echo.
    echo ✅ Обновление завершено успешно
)

echo.
pause 