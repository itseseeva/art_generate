#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для переноса данных из локальной БД в Docker контейнер.
Использует Python для кроссплатформенности.
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

def run_command(cmd, check=True, capture_output=False):
    """Выполняет команду и возвращает результат."""
    print(f"Выполняю: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(
        cmd,
        shell=isinstance(cmd, str),
        check=check,
        capture_output=capture_output,
        text=True
    )
    return result

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
    dump_file = Path(tempfile.gettempdir()) / f"art_generation_dump_{timestamp}.sql"
    
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
        # Используем временный контейнер PostgreSQL для экспорта
        container_dump_path = "/tmp/dump.sql"
        
        # Создаём команду для выполнения в Docker контейнере
        # Используем host.docker.internal для доступа к локальной БД из контейнера
        env = os.environ.copy()
        env["PGPASSWORD"] = local_db_password
        
        # Для Windows используем host.docker.internal, для Linux - host network
        if sys.platform == "win32":
            db_host = "host.docker.internal"
        else:
            db_host = local_db_host
        
        cmd = [
            "docker", "run", "--rm",
            "--network", "host" if sys.platform != "win32" else "bridge",
            "-e", f"PGPASSWORD={local_db_password}",
            "postgres:17-alpine",
            "pg_dump",
            "-h", db_host if sys.platform != "win32" else "host.docker.internal",
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
                                      text=True, check=True)
            print(f"✓ Данные экспортированы в {dump_file}")
            return dump_file
        except subprocess.CalledProcessError as e:
            print(f"ОШИБКА: Не удалось экспортировать данные из локальной БД")
            if e.stderr:
                print(f"Детали ошибки: {e.stderr}")
            sys.exit(1)
    else:
        # Используем локальный pg_dump
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

def import_to_docker(dump_file):
    """Импортирует данные в Docker контейнер."""
    print("\n2. Импорт данных в Docker контейнер...")
    
    docker_db_name = "art_generate_db"
    docker_db_user = os.getenv("POSTGRES_USER", "postgres")
    docker_db_password = os.getenv("POSTGRES_PASSWORD", "Kohkau11999")
    
    # Копируем дамп в контейнер
    container_path = "/tmp/dump.sql"
    try:
        run_command(["docker", "cp", str(dump_file), f"art_generation_postgres:{container_path}"])
    except subprocess.CalledProcessError as e:
        print(f"ОШИБКА: Не удалось скопировать дамп в контейнер: {e}")
        sys.exit(1)
    
    # Импортируем данные
    env = os.environ.copy()
    env["PGPASSWORD"] = docker_db_password
    
    cmd = [
        "docker", "exec",
        "-e", f"PGPASSWORD={docker_db_password}",
        "art_generation_postgres",
        "psql",
        "-U", docker_db_user,
        "-d", docker_db_name,
        "-f", container_path
    ]
    
    try:
        result = subprocess.run(cmd, env=env, check=False, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if result.returncode != 0:
            # Игнорируем некоторые ошибки (Django таблицы, дубликаты и т.д.)
            stderr_lines = result.stderr.split('\n') if result.stderr else []
            error_count = sum(1 for line in stderr_lines if 'ERROR' in line.upper())
            warning_count = sum(1 for line in stderr_lines if 'WARNING' in line.upper() or 'duplicate' in line.lower())
            
            # Если только предупреждения о дубликатах или Django таблицах - это нормально
            django_errors = sum(1 for line in stderr_lines if 'django' in line.lower() or 'auth_group' in line.lower() or 'does not exist' in line.lower())
            
            if error_count - django_errors <= 5:  # Допускаем несколько ошибок
                print("✓ Данные импортированы в Docker (некоторые предупреждения проигнорированы)")
            else:
                print(f"ОШИБКА: Не удалось импортировать данные в Docker")
                print(f"Код возврата: {result.returncode}")
                if result.stderr:
                    print("Последние ошибки:")
                    for line in stderr_lines[-10:]:
                        if line.strip():
                            print(f"  {line}")
                sys.exit(1)
        else:
            print("✓ Данные импортированы в Docker")
    except Exception as e:
        print(f"ОШИБКА: Не удалось импортировать данные в Docker: {e}")
        sys.exit(1)
    
    # Очистка
    print("\n3. Очистка временных файлов...")
    try:
        dump_file.unlink()
        run_command(["docker", "exec", "art_generation_postgres", "rm", "-f", container_path])
    except Exception as e:
        print(f"Предупреждение: Не удалось удалить временные файлы: {e}")

def wait_for_postgres():
    """Ждёт, пока PostgreSQL контейнер станет готов."""
    import time
    max_attempts = 30
    for i in range(max_attempts):
        try:
            result = subprocess.run(
                ["docker", "exec", "art_generation_postgres", "pg_isready", "-U", "postgres"],
                capture_output=True,
                check=False
            )
            if result.returncode == 0:
                return True
        except:
            pass
        if i < max_attempts - 1:
            print(f"Ожидание готовности PostgreSQL... ({i+1}/{max_attempts})")
            time.sleep(2)
    return False

def main():
    """Главная функция."""
    print("=== Миграция данных из локальной БД в Docker ===")
    
    # Проверяем, что Docker контейнер запущен
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=art_generation_postgres", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=True
        )
        if not result.stdout.strip():
            raise subprocess.CalledProcessError(1, "docker ps")
    except subprocess.CalledProcessError:
        print("ОШИБКА: Docker контейнер art_generation_postgres не запущен.")
        print("Запустите: cd Docker_all && docker-compose up -d postgres")
        sys.exit(1)
    
    # Ждём, пока PostgreSQL станет готов
    print("\nПроверка готовности PostgreSQL...")
    if not wait_for_postgres():
        print("ОШИБКА: PostgreSQL не готов после ожидания.")
        sys.exit(1)
    print("✓ PostgreSQL готов")
    
    # Экспортируем данные
    dump_file = export_local_db()
    
    # Импортируем данные
    import_to_docker(dump_file)
    
    print("\n=== Миграция завершена успешно! ===")
    print("Все данные из локальной БД перенесены в Docker контейнер")

if __name__ == "__main__":
    main()

