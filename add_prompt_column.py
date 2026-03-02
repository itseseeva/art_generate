import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def add_column():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE paid_album_photos ADD COLUMN prompt TEXT;"))
            print("Column 'prompt' added successfully.")
        except Exception as e:
            if 'already exists' in str(e).lower():
                print("Column 'prompt' already exists.")
            else:
                print(f"Error: {e}")

asyncio.run(add_column())
