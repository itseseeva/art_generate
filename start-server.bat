@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

