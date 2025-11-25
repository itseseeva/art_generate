@echo off
cd /D "%~dp0"

echo ========================================
echo ОПТИМИЗАЦИЯ ДЛЯ RTX 3060 - МАКСИМАЛЬНОЕ GPU
echo ========================================

REM GPU Configuration для RTX 3060 (12GB VRAM)
set CUDA_VISIBLE_DEVICES=0
set FORCE_CMAKE=1
set CMAKE_ARGS=-DLLAMA_CUBLAS=on
set LLAMA_CUBLAS=1
set GGML_USE_CUBLAS=1
set GGML_USE_METAL=0
set GGML_USE_OPENBLAS=0
set GGML_USE_ACCELERATE=0

REM Memory Optimization для RTX 3060
set PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:2048
set CUDA_LAUNCH_BLOCKING=0

echo Запуск с параметрами для RTX 3060:
echo - 40 слоев на GPU (--gpu-layers 40) для оптимальной загрузки
echo - Оптимальный батч для 12GB VRAM (--batch-size 512)
echo - Минимум CPU потоков (--threads 1)
echo - Оптимизированный контекст (--ctx-size 8000)

python server.py ^
    --api ^
    --api-port 5000 ^
    --listen ^
    --listen-port 7861 ^
    --model Gryphe-MythoMax-L2-13b.Q4_K_S.gguf ^
    --loader llama.cpp ^
    --model-dir models/main_models ^
    --gpu-layers 50 ^
    --ctx-size 8000 ^
    --batch-size 512 ^
    --threads 1 ^
    --threads-batch 1 ^
    --trust-remote-code ^
    --cache-type f16 ^
    --verbose

echo.
echo Сервер запущен! Ожидаемая производительность: оптимальная GPU загрузка
echo API: http://localhost:5000
echo Web UI: http://localhost:7861
