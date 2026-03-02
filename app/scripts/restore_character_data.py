import asyncio
import logging
from sqlalchemy import text
from app.database.db import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def restore_data():
    async with async_session_maker() as session:
        # Проверяем, существует ли prompt
        characters = []
        try:
            result = await session.execute(text("""
                SELECT id, name, character_appearance, location, prompt 
                FROM characters 
                WHERE personality_ru IS NULL OR situation_ru IS NULL OR appearance_ru IS NULL
            """))
            characters = result.fetchall()
            logger.info(f"Найдено {len(characters)} персонажей для восстановления данных c prompt.")
        except Exception as e:
            logger.error(f"Ошибка при запросе персонажей с prompt: {e}")
            await session.rollback() # Важно! Откат транзакции после ошибки
            
            # Если prompt нет, пробуем хотя бы восстановить appearance
            logger.info("Похоже, колонки prompt нет. Пробуем без неё.")
            result = await session.execute(text("""
                SELECT id, name, character_appearance, location, NULL as prompt
                FROM characters 
                WHERE appearance_ru IS NULL OR location_ru IS NULL
            """))
            characters = result.fetchall()
            logger.info(f"Найдено {len(characters)} персонажей для восстановления данных без prompt.")
            
        updated_count = 0
        
        for char in characters:
            char_id = char[0]
            name = char[1]
            character_appearance = char[2]
            location = char[3]
            prompt = char[4]
            
            updates = {}
            
            # 1. Восстанавливаем внешний вид и локацию
            if character_appearance:
                updates['appearance_ru'] = character_appearance
                
            if location:
                updates['location_ru'] = location
            
            # 2. Пытаемся распарсить prompt как fallback
            if prompt:
                import re
                situation_match = re.search(r'(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий):\s*(.*?)(?=\n\n|\n|$)', prompt, flags=re.IGNORECASE | re.DOTALL)
                if situation_match:
                    updates['situation_ru'] = situation_match.group(1).strip()
                    
                personality_match = re.search(r'(?:Personality|Character|Описание характера|Характер|Личность):\s*(.*?)(?=\n\n|\n(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий)|$)', prompt, flags=re.IGNORECASE | re.DOTALL)
                if personality_match:
                    updates['personality_ru'] = personality_match.group(1).strip()
            
            # Если есть что обновлять
            if updates:
                try:
                    set_clauses = [f"{key} = :{key}" for key in updates.keys()]
                    update_query = text(f"""
                        UPDATE characters 
                        SET {", ".join(set_clauses)}
                        WHERE id = :id
                    """)
                    
                    params = {**updates, 'id': char_id}
                    await session.execute(update_query, params)
                    updated_count += 1
                    logger.info(f"Обновлен персонаж {char_id} ({name}): восстановили {list(updates.keys())}")
                except Exception as e:
                    logger.error(f"Ошибка обновления персонажа {char_id}: {e}")
                    await session.rollback()
        
        await session.commit()
        logger.info(f"Готово. Обновлено {updated_count} персонажей.")
        
if __name__ == "__main__":
    asyncio.run(restore_data())
