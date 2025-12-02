"""
Конфигурация CUDA для оптимизации производительности
"""
import torch
import logging
import gc
import os

logger = logging.getLogger(__name__)

def configure_cuda():
    """
    Настраивает параметры CUDA для оптимальной производительности
    """
    debug_lines = []
    try:
        debug_lines.append(f"torch version: {getattr(torch, '__version__', 'unknown')}")
        debug_lines.append(f"torch.cuda.is_available(): {torch.cuda.is_available()}")
        debug_lines.append(f"torch.version.cuda: {getattr(torch.version, 'cuda', 'unknown')}")
        debug_lines.append(f"torch.cuda.device_count(): {torch.cuda.device_count()}")
        # Отключаем автотюнинг для стабильной производительности
        torch.backends.cudnn.benchmark = False
        
        # Включаем детерминированность для воспроизводимости результатов
        torch.backends.cudnn.deterministic = True
        
        # Оптимизируем использование памяти
        torch.backends.cuda.matmul.allow_tf32 = True  # Используем TF32 для матричных операций
        torch.backends.cudnn.allow_tf32 = True  # Разрешаем TF32 для cuDNN
        
        # Проверяем доступность CUDA
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            cuda_version = torch.version.cuda
            total_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3  # GB
            allocated_memory = torch.cuda.memory_allocated(0) / 1024**3  # GB
            free_memory = total_memory - allocated_memory
            debug_lines.append(f"CUDA доступна. Устройство: {device_name}")
            debug_lines.append(f"Версия CUDA: {cuda_version}")
            debug_lines.append(f"GPU память: {total_memory:.1f}GB всего, {allocated_memory:.1f}GB занято, {free_memory:.1f}GB свободно")
            logger.info(f"CUDA доступна. Устройство: {device_name}")
            logger.info(f"Версия CUDA: {cuda_version}")
            logger.info(f"GPU память: {total_memory:.1f}GB всего, {allocated_memory:.1f}GB занято, {free_memory:.1f}GB свободно")
            if free_memory < 2.0:
                logger.info(f"Мало свободной GPU памяти ({free_memory:.1f}GB), используется CPU")
                debug_lines.append(f"Мало свободной GPU памяти ({free_memory:.1f}GB), используется CPU")
                with open('debug_cuda.log', 'w', encoding='utf-8') as f:
                    f.write('\n'.join(debug_lines))
                return
            torch.cuda.empty_cache()
            torch.cuda.set_device(0)
            memory_fraction = min(0.5, free_memory / total_memory * 0.8)
            torch.cuda.memory.set_per_process_memory_fraction(memory_fraction)
            logger.info(f"CUDA успешно настроена. Используется {memory_fraction*100:.1f}% GPU памяти")
            debug_lines.append(f"CUDA успешно настроена. Используется {memory_fraction*100:.1f}% GPU памяти")
        # logger.info("CUDA недоступна, используется CPU")
            
    except Exception as e:
        logger.error(f"Ошибка при настройке CUDA: {str(e)}")
        logger.info("Переключаемся на CPU режим")
        debug_lines.append(f"Ошибка при настройке CUDA: {str(e)}")
        debug_lines.append("Переключаемся на CPU режим")
    finally:
        with open('debug_cuda.log', 'w', encoding='utf-8') as f:
            f.write('\n'.join(debug_lines))

def optimize_memory():
    """
    Оптимизирует использование памяти
    """
    try:
        # Очищаем кэш Python
        gc.collect()
        
        # Очищаем кэш CUDA
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        # Очищаем кэш операционной системы (только для Linux/Mac)
        # Windows: Clear-RecycleBin не нужен для оптимизации памяти и вызывает предупреждения
        if os.name != 'nt':  # Linux/Mac
            try:
                os.system('sync; echo 3 > /proc/sys/vm/drop_caches')
            except Exception:
                pass  # Игнорируем ошибки очистки системного кэша
            
    except Exception as e:
        logger.error(f"Ошибка при оптимизации памяти: {str(e)}")

def get_gpu_memory_info():
    """
    Получает информацию об использовании памяти GPU
    """
    if torch.cuda.is_available():
        try:
            # Получаем информацию о памяти
            memory_allocated = torch.cuda.memory_allocated(0) / 1024**2  # MB
            memory_reserved = torch.cuda.memory_reserved(0) / 1024**2  # MB
            memory_cached = torch.cuda.memory_cached(0) / 1024**2  # MB
            
            logger.info(f"GPU Memory: Allocated={memory_allocated:.2f}MB, "
                       f"Reserved={memory_reserved:.2f}MB, "
                       f"Cached={memory_cached:.2f}MB")
            
            return {
                "allocated": memory_allocated,
                "reserved": memory_reserved,
                "cached": memory_cached
            }
        except Exception as e:
            logger.error(f"Ошибка при получении информации о памяти GPU: {str(e)}")
            return None
    return None 