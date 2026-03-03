import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import sys

async def main():
    engine = create_async_engine('sqlite+aiosqlite:///app.db')
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT id, name, total_messages_count FROM characters LIMIT 10"))
        rows = result.fetchall()
        print("Characters and total_messages_count:")
        for row in rows:
            print(f"ID: {row[0]}, Name: {row[1]}, Count: {row[2]}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
