import asyncio
import logging
import sqlite3
import re
import os
from sqlalchemy import text
from app.database.db import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def restore_from_sqlite():
    sqlite_path = 'app/chatbot.db'
    if not os.path.exists(sqlite_path):
        sqlite_path = 'app.db'
        if not os.path.exists(sqlite_path):
            logger.error("Не найден файл SQLite базы данных.")
            return

    logger.info(f"Используем SQLite базу: {sqlite_path}")
    
    # 1. Читаем данные из SQLite
    try:
        conn = sqlite3.connect(sqlite_path)
        cursor = conn.cursor()
        
        # Проверяем структуру таблицы
        cursor.execute("PRAGMA table_info(characters)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'prompt' not in columns:
            logger.error(f"В SQLite базе {sqlite_path} нет колонки prompt.")
            conn.close()
            return
            
        cursor.execute("SELECT id, name, prompt FROM characters WHERE prompt IS NOT NULL AND prompt != ''")
        sqlite_chars = cursor.fetchall()
        conn.close()
        
        logger.info(f"В SQLite базе найдено {len(sqlite_chars)} персонажей с prompt.")
        
    except Exception as e:
        logger.error(f"Ошибка при работе с SQLite: {e}")
        return

    # 2. Обновляем PostgreSQL
    async with async_session_maker() as session:
        updated_count = 0
        
        for char in sqlite_chars:
            char_id = char[0]
            name = char[1]
            prompt = char[2]
            
            updates = {}
            
            # Парсим prompt как fallback
            situation_match = re.search(r'(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий):\s*(.*?)(?=\n\n|\n|$)', prompt, flags=re.IGNORECASE | re.DOTALL)
            if situation_match:
                updates['situation_ru'] = situation_match.group(1).strip()
                
            personality_match = re.search(r'(?:Personality|Character|Описание характера|Характер|Личность):\s*(.*?)(?=\n\n|\n(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий)|$)', prompt, flags=re.IGNORECASE | re.DOTALL)
            if personality_match:
                updates['personality_ru'] = personality_match.group(1).strip()
            
            instructions_match = re.search(r'(?:Instructions|Инструкции):\s*(.*?)(?=\n\n|\n|$)', prompt, flags=re.IGNORECASE | re.DOTALL)
            if instructions_match:
                updates['instructions_ru'] = instructions_match.group(1).strip()
            
            if updates:
                try:
                    # Проверяем, существует ли персонаж и пустые ли у него поля
                    check_result = await session.execute(
                        text("SELECT id, personality_ru, situation_ru FROM characters WHERE id = :id OR name = :name"),
                        {"id": char_id, "name": name}
                    )
                    existing_char = check_result.fetchone()
                    
                    if existing_char and (not existing_char[1] or not existing_char[2]):
                        real_id = existing_char[0]
                        set_clauses = [f"{key} = :{key}" for key in updates.keys()]
                        update_query = text(f"""
                            UPDATE characters 
                            SET {", ".join(set_clauses)}
                            WHERE id = :id
                        """)
                        
                        params = {**updates, 'id': real_id}
                        await session.execute(update_query, params)
                        updated_count += 1
                        logger.info(f"Обновлен персонаж {real_id} ({name}): из SQLite восстановили {list(updates.keys())}")
                except Exception as e:
                    logger.error(f"Ошибка обновления персонажа {name}: {e}")
                    await session.rollback()
        
        await session.commit()
        logger.info(f"Готово. Обновлено {updated_count} персонажей из SQLite базы.")

if __name__ == "__main__":
    asyncio.run(restore_from_sqlite())
