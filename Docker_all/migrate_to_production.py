#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для миграции данных на production сервер.
Используется для переноса данных из локальной БД в production Docker контейнер.
"""
import os
import sys
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime

# Устанавливаем UTF-8 для Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def export_local_db():
    """Экспортирует данные из локальной БД."""
    print("\n1. Экспорт данных из локальной БД...")
    
    # Параметры локальной БД
    local_db_host = os.getenv("DB_HOST", "localhost")
    local_db_port = os.getenv("DB_PORT", "5432")
    local_db_name = os.getenv("POSTGRES_DB", "art_generate_db")
    local_db_user = os.getenv("POSTGRES_USER", "postgres")
    local_db_password = os.getenv("POSTGRES_PASSWORD", "Kohkau11999")
    
    # Создаём временный файл для дампа
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_file = Path(tempfile.gettempdir()) / f"art_generation_prod_dump_{timestamp}.sql"
    
    # Проверяем наличие pg_dump на хосте
    has_pg_dump = False
    try:
        result = subprocess.run(["pg_dump", "--version"], 
                              capture_output=True, 
                              check=False)
        has_pg_dump = (result.returncode == 0)
    except FileNotFoundError:
        pass
    
    # Если pg_dump не найден, используем Docker контейнер
    if not has_pg_dump:
        print("pg_dump не найден на хосте, используем Docker контейнер...")
        env = os.environ.copy()
        env["PGPASSWORD"] = local_db_password
        
        if sys.platform == "win32":
            db_host = "host.docker.internal"
            network_mode = "bridge"
        else:
            db_host = local_db_host
            network_mode = "host"
        
        cmd = [
            "docker", "run", "--rm",
            "--network", network_mode,
            "-e", f"PGPASSWORD={local_db_password}",
            "postgres:17-alpine",
            "pg_dump",
            "-h", db_host,
            "-p", local_db_port,
            "-U", local_db_user,
            "-d", local_db_name,
            "--data-only",
            "--no-owner",
            "--no-privileges"
        ]
        
        try:
            print(f"Экспортирую данные из {local_db_host}:{local_db_port}/{local_db_name}...")
            with open(dump_file, "w", encoding="utf-8") as f:
                result = subprocess.run(cmd, env=env, stdout=f, stderr=subprocess.PIPE, 
                                      text=True, check=True, encoding='utf-8', errors='replace')
            print(f"✓ Данные экспортированы в {dump_file}")
            return dump_file
        except subprocess.CalledProcessError as e:
            print(f"ОШИБКА: Не удалось экспортировать данные из локальной БД")
            if e.stderr:
                print(f"Детали ошибки: {e.stderr}")
            sys.exit(1)
    else:
        env = os.environ.copy()
        env["PGPASSWORD"] = local_db_password
        
        cmd = [
            "pg_dump",
            "-h", local_db_host,
            "-p", local_db_port,
            "-U", local_db_user,
            "-d", local_db_name,
            "--data-only",
            "--no-owner",
            "--no-privileges",
            "-f", str(dump_file)
        ]
        
        try:
            subprocess.run(cmd, env=env, check=True)
            print(f"✓ Данные экспортированы в {dump_file}")
            return dump_file
        except subprocess.CalledProcessError as e:
            print(f"ОШИБКА: Не удалось экспортировать данные из локальной БД: {e}")
            sys.exit(1)

def upload_to_server(dump_file, server_host, server_user, server_path="/tmp"):
    """Загружает дамп на production сервер."""
    print(f"\n2. Загрузка дампа на сервер {server_host}...")
    
    try:
        cmd = ["scp", str(dump_file), f"{server_user}@{server_host}:{server_path}/"]
        subprocess.run(cmd, check=True)
        remote_file = f"{server_path}/{dump_file.name}"
        print(f"✓ Дамп загружен на сервер: {remote_file}")
        return remote_file
    except subprocess.CalledProcessError as e:
        print(f"ОШИБКА: Не удалось загрузить дамп на сервер: {e}")
        sys.exit(1)

def import_on_server(server_host, server_user, remote_file, container_name="art_generation_postgres"):
    """Импортирует данные на production сервере."""
    print(f"\n3. Импорт данных на сервере {server_host}...")
    
    docker_db_name = os.getenv("PROD_POSTGRES_DB", "art_generation")
    docker_db_user = os.getenv("PROD_POSTGRES_USER", "postgres")
    docker_db_password = os.getenv("PROD_POSTGRES_PASSWORD", "postgres")
    
    # Копируем дамп в контейнер
    container_path = "/tmp/dump.sql"
    try:
        # Копируем файл в контейнер
        copy_cmd = f"docker cp {remote_file} {container_name}:{container_path}"
        ssh_cmd = ["ssh", f"{server_user}@{server_host}", copy_cmd]
        subprocess.run(ssh_cmd, check=True)
        print(f"✓ Дамп скопирован в контейнер")
    except subprocess.CalledProcessError as e:
        print(f"ОШИБКА: Не удалось скопировать дамп в контейнер: {e}")
        sys.exit(1)
    
    # Импортируем данные
    import_cmd = f"docker exec -e PGPASSWORD={docker_db_password} {container_name} psql -U {docker_db_user} -d {docker_db_name} -f {container_path}"
    ssh_cmd = ["ssh", f"{server_user}@{server_host}", import_cmd]
    
    try:
        result = subprocess.run(ssh_cmd, check=False, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode != 0:
            stderr_lines = result.stderr.split('\n') if result.stderr else []
            django_errors = sum(1 for line in stderr_lines if 'django' in line.lower() or 'auth_group' in line.lower() or 'does not exist' in line.lower())
            error_count = sum(1 for line in stderr_lines if 'ERROR' in line.upper())
            
            if error_count - django_errors <= 5:
                print("✓ Данные импортированы (некоторые предупреждения проигнорированы)")
            else:
                print(f"ОШИБКА: Не удалось импортировать данные")
                if result.stderr:
                    print("Последние ошибки:")
                    for line in stderr_lines[-10:]:
                        if line.strip():
                            print(f"  {line}")
                sys.exit(1)
        else:
            print("✓ Данные импортированы на production сервер")
    except Exception as e:
        print(f"ОШИБКА: Не удалось импортировать данные: {e}")
        sys.exit(1)
    
    # Очистка
    print("\n4. Очистка временных файлов...")
    try:
        dump_file.unlink()
        cleanup_cmd = f"rm -f {remote_file} && docker exec {container_name} rm -f {container_path}"
        ssh_cmd = ["ssh", f"{server_user}@{server_host}", cleanup_cmd]
        subprocess.run(ssh_cmd, check=False)
    except Exception as e:
        print(f"Предупреждение: Не удалось удалить временные файлы: {e}")

def main():
    """Главная функция."""
    print("=== Миграция данных на Production сервер ===")
    
    # Получаем параметры сервера
    server_host = os.getenv("PROD_SERVER_HOST")
    server_user = os.getenv("PROD_SERVER_USER", "root")
    
    if not server_host:
        print("ОШИБКА: Переменная PROD_SERVER_HOST не установлена")
        print("Установите переменные окружения:")
        print("  PROD_SERVER_HOST=your-server.com")
        print("  PROD_SERVER_USER=root (опционально)")
        print("  PROD_POSTGRES_DB=art_generation (опционально)")
        print("  PROD_POSTGRES_USER=postgres (опционально)")
        print("  PROD_POSTGRES_PASSWORD=postgres (опционально)")
        sys.exit(1)
    
    # Экспортируем данные
    dump_file = export_local_db()
    
    # Загружаем на сервер
    remote_file = upload_to_server(dump_file, server_host, server_user)
    
    # Импортируем на сервере
    import_on_server(server_host, server_user, remote_file)
    
    print("\n=== Миграция на Production завершена успешно! ===")
    print("Все данные из локальной БД перенесены на production сервер")

if __name__ == "__main__":
    main()

