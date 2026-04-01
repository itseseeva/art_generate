import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Kohkau11999@localhost:5432/art_generate_db"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        # Add image_url_en if not exists
        await conn.execute(text("ALTER TABLE promo_slider_items ADD COLUMN IF NOT EXISTS image_url_en VARCHAR;"))
        
        # Make fields nullable
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN title_ru DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN title_en DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN subtitle_ru DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN subtitle_en DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN button_text_ru DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE promo_slider_items ALTER COLUMN button_text_en DROP NOT NULL;"))
        
        print("Migration completed successfully.")
    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(migrate())
    except Exception as e:
        print(f"Migration failed: {e}")
