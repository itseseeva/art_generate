import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from app.database.db import async_session_maker
from app.models.chat_history import ChatHistory
from app.models.user import Users
from sqlalchemy import select, desc

async def inspect_data():
    async with async_session_maker() as db:
        print("-" * 50)
        print("INSPECTING CHAT HISTORY (Last 10 entries with images)")
        print("-" * 50)
        
        stmt = (
            select(ChatHistory)
            .where(ChatHistory.image_url.isnot(None))
            .order_by(ChatHistory.created_at.desc())
            .limit(10)
        )
        result = await db.execute(stmt)
        records = result.scalars().all()
        
        for r in records:
            print(f"ID: {r.id}")
            print(f"User ID: {r.user_id}")
            print(f"Character: {r.character_name}")
            print(f"Image URL: {r.image_url}")
            print(f"Image Filename: {r.image_filename}")
            print(f"Content (len): {len(r.message_content) if r.message_content else 0}")
            print("-" * 30)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(inspect_data())
