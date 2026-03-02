import asyncio
import logging
import re
from sqlalchemy import text
from app.database.db import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def restore_from_desc():
    async with async_session_maker() as session:
        result = await session.execute(text("""
            SELECT id, name, description 
            FROM characters 
            WHERE description IS NOT NULL 
              AND description != '' 
              AND (personality_ru IS NULL OR situation_ru IS NULL)
        """))
        characters = result.fetchall()
        logger.info(f"Найдено {len(characters)} персонажей с description для парсинга.")
        
        updated_count = 0
        
        for char in characters:
            char_id = char[0]
            name = char[1]
            description = char[2]
            
            updates = {}
            
            # Пытаемся распарсить description
            if description:
                situation_match = re.search(r'(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий):\s*(.*?)(?=\n\n|\n|$)', description, flags=re.IGNORECASE | re.DOTALL)
                if situation_match:
                    updates['situation_ru'] = situation_match.group(1).strip()
                    
                personality_match = re.search(r'(?:Personality|Character|Описание характера|Характер|Личность):\s*(.*?)(?=\n\n|\n(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий)|$)', description, flags=re.IGNORECASE | re.DOTALL)
                if personality_match:
                    updates['personality_ru'] = personality_match.group(1).strip()
                
                instructions_match = re.search(r'(?:Instructions|Инструкции):\s*(.*?)(?=\n\n|\n|$)', description, flags=re.IGNORECASE | re.DOTALL)
                if instructions_match:
                    updates['instructions_ru'] = instructions_match.group(1).strip()
            
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
                    logger.info(f"Обновлен персонаж {char_id} ({name}): из description восстановили {list(updates.keys())}")
                except Exception as e:
                    logger.error(f"Ошибка обновления персонажа {char_id}: {e}")
                    await session.rollback()
        
        await session.commit()
        logger.info(f"Готово. Обновлено {updated_count} персонажей из description.")
        
if __name__ == "__main__":
    asyncio.run(restore_from_desc())
