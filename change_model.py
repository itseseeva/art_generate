#!/usr/bin/env python3
"""
Простой скрипт для смены модели Stable Diffusion.
Использование: python change_model.py "название_модели.safetensors"
"""

import sys
import os
from pathlib import Path

# Добавляем путь к проекту
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def change_model(new_model_name: str, new_vae_name: str = None):
    """
    Меняет модель в центральном конфигурационном файле.
    
    Args:
        new_model_name: Название новой модели
        new_vae_name: Название VAE (опционально)
    """
    print(f"🔄 Смена модели на: {new_model_name}")
    if new_vae_name:
        print(f"🎨 VAE: {new_vae_name}")
    else:
        print("🎨 VAE: Встроенный")
    
    # Путь к конфигурационному файлу
    config_file = project_root / "stable-diffusion-webui" / "model_config.py"
    
    try:
        # Читаем файл
        with open(config_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Заменяем название модели
        import re
        content = re.sub(
            r'MODEL_NAME = "[^"]*"',
            f'MODEL_NAME = "{new_model_name}"',
            content
        )
        
        # Заменяем VAE если указан
        if new_vae_name:
            content = re.sub(
                r'VAE_NAME = [^\\n]*',
                f'VAE_NAME = "{new_vae_name}"',
                content
            )
        else:
            content = re.sub(
                r'VAE_NAME = [^\\n]*',
                'VAE_NAME = None',
                content
            )
        
        # Записываем обновленный файл
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Конфигурация обновлена!")
        
        # Перезагружаем модуль
        import importlib
        import app.config.model_config
        importlib.reload(app.config.model_config)
        
        # Синхронизируем все конфигурации
        print("🔄 Синхронизация конфигураций...")
        try:
            import sys
            from pathlib import Path
            webui_path = project_root / "stable-diffusion-webui"
            sys.path.insert(0, str(webui_path))
            from model_config import sync_all_configs
            if sync_all_configs():
                print("✅ Все конфигурации синхронизированы!")
            else:
                print("⚠️ Проблемы с синхронизацией")
        except Exception as e:
            print(f"⚠️ Ошибка синхронизации: {e}")
        
        # Проверяем файлы
        print("\n🔍 Проверка файлов...")
        try:
            from model_config import check_model_files, get_model_info
            if check_model_files():
                info = get_model_info()
                if info:
                    print(f"📊 Размер модели: {info['size_mb']} MB")
                print("✅ Модель готова к использованию!")
            else:
                print("❌ Модель не найдена!")
                print(f"💡 Поместите файл {new_model_name} в папку models/Stable-diffusion/")
        except Exception as e:
            print(f"⚠️ Ошибка проверки: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def list_available_models():
    """Показывает доступные модели"""
    models_dir = project_root / "stable-diffusion-webui" / "models" / "Stable-diffusion"
    
    print(f"🔍 Ищем модели в: {models_dir}")
    
    if not models_dir.exists():
        print("❌ Папка с моделями не найдена!")
        return
    
    print("📁 Доступные модели:")
    print("=" * 30)
    
    models = list(models_dir.glob("*.safetensors"))
    if not models:
        print("❌ Модели не найдены!")
        return
    
    for i, model in enumerate(models, 1):
        size_mb = model.stat().st_size / (1024 * 1024)
        print(f"{i}. {model.name} ({size_mb:.1f} MB)")

def main():
    """Главная функция"""
    import sys
    if len(sys.argv) < 2:
        print("🎯 СМЕНА МОДЕЛИ STABLE DIFFUSION")
        print("=" * 40)
        print("Использование:")
        print("  python change_model.py <название_модели> [vae_модель]")
        print()
        print("Примеры:")
        print("  python change_model.py dreamshaper_8.safetensors")
        print("  python change_model.py meinamix_v12Final.safetensors")
        print("  python change_model.py model.safetensors vae.safetensors")
        print()
        print("Доступные команды:")
        print("  python change_model.py list  - показать доступные модели")
        print("  python change_model.py info  - показать текущую модель")
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_available_models()
    elif command == "info":
        try:
            import sys
            from pathlib import Path
            webui_path = project_root / "stable-diffusion-webui"
            sys.path.insert(0, str(webui_path))
            from model_config import MODEL_NAME, VAE_NAME, check_model_files, get_model_info
            print("📊 ТЕКУЩАЯ КОНФИГУРАЦИЯ")
            print("=" * 30)
            print(f"Модель: {MODEL_NAME}")
            print(f"VAE: {VAE_NAME or 'Встроенный'}")
            
            if check_model_files():
                info = get_model_info()
                if info:
                    print(f"Размер: {info['size_mb']} MB")
                    print(f"Путь: {info['path']}")
            else:
                print("❌ Модель не найдена!")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
    else:
        # Смена модели
        new_model = sys.argv[1]
        new_vae = sys.argv[2] if len(sys.argv) > 2 else None
        
        if change_model(new_model, new_vae):
            print("\n🎉 Модель успешно изменена!")
            print("💡 Не забудьте перезапустить Stable Diffusion WebUI и API сервер!")
        else:
            print("\n❌ Ошибка при смене модели!")

if __name__ == "__main__":
    main()
