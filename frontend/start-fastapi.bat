@echo off
echo 🚀 Запуск FastAPI сервера...
echo.
echo 🔧 Очистка порта 8000 от старых Python процессов (uvicorn)...
powershell -Command "$connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; $connections | ForEach-Object { $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($proc) { $procName = $proc.ProcessName.ToLower(); $procPath = $proc.Path -replace '\\', '/' -replace '//', '/'; if (($procName -eq 'python' -or $procName -eq 'pythonw') -and $procPath -notlike '*docker*' -and $procPath -notlike '*wsl*') { try { $cmdLine = (Get-CimInstance Win32_Process -Filter \"ProcessId = $($proc.Id)\" -ErrorAction SilentlyContinue).CommandLine; if ($cmdLine -like '*uvicorn*' -or $cmdLine -like '*app.main*' -or $cmdLine -like '*fastapi*') { Write-Host \"Останавливаем: $procName (PID: $($proc.Id))\"; Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } } catch { } } } }"
timeout /t 1 /nobreak >nul
echo ✅ Порт 8000 проверен (Docker процессы не затронуты)
echo.
echo 🔧 FastAPI будет доступен по адресу: http://localhost:8000
echo 🌐 Доступ с других устройств: http://0.0.0.0:8000
echo.
echo ⚡ Автоматическая перезагрузка включена!
echo 💡 Изменения в Python файлах будут применяться мгновенно
echo.
echo Нажмите Ctrl+C для остановки
echo.

cd /d "%~dp0\.."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --no-access-log
