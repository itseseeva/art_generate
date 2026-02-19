import asyncio
import os
import sys
from sqlalchemy import select

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.database.db import async_session_maker
from app.models.character import Character

async def main():
    async with async_session_maker() as session:
        # Try to find "Chicken" or "Курица"
        stmt = select(Character).where(
            Character.name.ilike('%Chicken%') | 
            Character.name.ilike('%Курица%')
        )
        result = await session.execute(stmt)
        char = result.scalars().first()
        
        if char:
            print(f"Found Character: {char.name} (ID: {char.id})")
            print(f"Avatar: {char.avatar_path}")
            # Try to print first photo if available
            # Note: This depends on how photos are stored (json or separate table)
            # Assuming simple check on char object or related
            print("Character data loaded.")
        else:
            print("Character 'Chicken' or 'Курица' not found.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
