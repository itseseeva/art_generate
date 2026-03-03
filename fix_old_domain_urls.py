"""
Скрипт для замены всех URL с доменом cherrylust.art на static.candygirlschat.com в базе данных.
Запускать на VPS в директории проекта:
    python fix_old_domain_urls.py
"""
import asyncio
import os
import re
import json

# Загружаем переменные окружения из .env если есть
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

OLD_DOMAIN = "cherrylust.art"
CDN_DOMAIN = os.getenv("CDN_DOMAIN", "https://static.candygirlschat.com").rstrip("/")
DB_URL = os.getenv("DATABASE_URL", "").replace("+asyncpg", "")  # psycopg2 синхронный

print(f"CDN_DOMAIN = {CDN_DOMAIN}")
print(f"DB_URL = {DB_URL[:40]}...")


def convert_url(url: str) -> str:
    """Конвертирует старый URL cherrylust.art в CDN."""
    if not url or OLD_DOMAIN not in url:
        return url
    if "/media/" in url:
        object_key = url.split("/media/")[-1]
    else:
        object_key = url.split(f"{OLD_DOMAIN}/")[-1]
    return f"{CDN_DOMAIN}/{object_key}"


async def main():
    try:
        import asyncpg
    except ImportError:
        print("Устанавливаем asyncpg...")
        os.system("pip install asyncpg")
        import asyncpg

    # Async DB URL
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL не задан!")
        return

    # Конвертируем к asyncpg формату
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    elif db_url.startswith("postgresql://"):
        pass
    else:
        print(f"ERROR: Неизвестный формат DATABASE_URL: {db_url[:40]}")
        return

    conn = await asyncpg.connect(db_url)
    print(f"✅ Подключились к БД")

    total_updated = 0

    # 1. Таблица chat_history — поле image_url
    print("\n📋 Обновляем chat_history.image_url...")
    rows = await conn.fetch(
        f"SELECT id, image_url FROM chat_history WHERE image_url LIKE '%{OLD_DOMAIN}%'"
    )
    print(f"   Найдено: {len(rows)} записей")
    for row in rows:
        new_url = convert_url(row["image_url"])
        await conn.execute(
            "UPDATE chat_history SET image_url = $1 WHERE id = $2",
            new_url, row["id"]
        )
    total_updated += len(rows)
    print(f"   ✅ Обновлено: {len(rows)}")

    # 2. Таблица user_gallery — поле image_url
    print("\n📋 Обновляем user_gallery.image_url...")
    try:
        rows = await conn.fetch(
            f"SELECT id, image_url FROM user_gallery WHERE image_url LIKE '%{OLD_DOMAIN}%'"
        )
        print(f"   Найдено: {len(rows)} записей")
        for row in rows:
            new_url = convert_url(row["image_url"])
            await conn.execute(
                "UPDATE user_gallery SET image_url = $1 WHERE id = $2",
                new_url, row["id"]
            )
        total_updated += len(rows)
        print(f"   ✅ Обновлено: {len(rows)}")
    except Exception as e:
        print(f"   ⚠️  user_gallery: {e}")

    # 3. Таблица image_generation_history — поле image_url
    print("\n📋 Обновляем image_generation_history.image_url...")
    try:
        rows = await conn.fetch(
            f"SELECT id, image_url FROM image_generation_history WHERE image_url LIKE '%{OLD_DOMAIN}%'"
        )
        print(f"   Найдено: {len(rows)} записей")
        for row in rows:
            new_url = convert_url(row["image_url"])
            await conn.execute(
                "UPDATE image_generation_history SET image_url = $1 WHERE id = $2",
                new_url, row["id"]
            )
        total_updated += len(rows)
        print(f"   ✅ Обновлено: {len(rows)}")
    except Exception as e:
        print(f"   ⚠️  image_generation_history: {e}")

    # 4. Таблица characters — поле photos (JSON массив)
    print("\n📋 Обновляем characters.photos (JSON)...")
    try:
        rows = await conn.fetch(
            f"SELECT id, photos FROM characters WHERE photos::text LIKE '%{OLD_DOMAIN}%'"
        )
        print(f"   Найдено: {len(rows)} персонажей")
        for row in rows:
            try:
                photos = json.loads(row["photos"]) if isinstance(row["photos"], str) else row["photos"]
                if isinstance(photos, list):
                    new_photos = [convert_url(p) if isinstance(p, str) else p for p in photos]
                    await conn.execute(
                        "UPDATE characters SET photos = $1 WHERE id = $2",
                        json.dumps(new_photos), row["id"]
                    )
            except Exception as pe:
                print(f"   ⚠️  character id={row['id']}: {pe}")
        total_updated += len(rows)
        print(f"   ✅ Обновлено: {len(rows)}")
    except Exception as e:
        print(f"   ⚠️  characters.photos: {e}")

    # 5. Таблица characters — поле main_photos (JSON)
    print("\n📋 Обновляем characters.main_photos (JSON)...")
    try:
        rows = await conn.fetch(
            f"SELECT id, main_photos FROM characters WHERE main_photos::text LIKE '%{OLD_DOMAIN}%'"
        )
        print(f"   Найдено: {len(rows)} персонажей")
        for row in rows:
            try:
                raw = row["main_photos"]
                if isinstance(raw, str):
                    raw_str = raw
                else:
                    raw_str = json.dumps(raw)

                # Заменяем все вхождения старого домена в JSON-строке
                new_raw_str = raw_str.replace(
                    f"https://{OLD_DOMAIN}/media/",
                    f"{CDN_DOMAIN}/"
                ).replace(
                    f"http://{OLD_DOMAIN}/media/",
                    f"{CDN_DOMAIN}/"
                ).replace(
                    f"https://{OLD_DOMAIN}/",
                    f"{CDN_DOMAIN}/"
                )

                await conn.execute(
                    "UPDATE characters SET main_photos = $1 WHERE id = $2",
                    new_raw_str, row["id"]
                )
            except Exception as pe:
                print(f"   ⚠️  character id={row['id']}: {pe}")
        total_updated += len(rows)
        print(f"   ✅ Обновлено: {len(rows)}")
    except Exception as e:
        print(f"   ⚠️  characters.main_photos: {e}")

    # 6. Таблица paid_album_photos — поле url/image_url
    print("\n📋 Обновляем paid_album_photos...")
    try:
        # Проверяем какие поля есть
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_name='paid_album_photos'"
        )
        col_names = [c["column_name"] for c in cols]
        url_col = "url" if "url" in col_names else "image_url" if "image_url" in col_names else None
        if url_col:
            rows = await conn.fetch(
                f"SELECT id, {url_col} FROM paid_album_photos WHERE {url_col} LIKE '%{OLD_DOMAIN}%'"
            )
            print(f"   Найдено: {len(rows)} записей")
            for row in rows:
                new_url = convert_url(row[url_col])
                await conn.execute(
                    f"UPDATE paid_album_photos SET {url_col} = $1 WHERE id = $2",
                    new_url, row["id"]
                )
            total_updated += len(rows)
            print(f"   ✅ Обновлено: {len(rows)}")
    except Exception as e:
        print(f"   ⚠️  paid_album_photos: {e}")

    # 7. Таблица users — поле avatar_url (аватары пользователей)
    print("\n📋 Обновляем users.avatar_url...")
    try:
        cols = await conn.fetch(
            "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
        )
        col_names = [c["column_name"] for c in cols]
        avatar_col = next((c for c in ["avatar_url", "avatar", "photo_url"] if c in col_names), None)
        if avatar_col:
            rows = await conn.fetch(
                f"SELECT id, {avatar_col} FROM users WHERE {avatar_col} LIKE '%{OLD_DOMAIN}%'"
            )
            print(f"   Найдено: {len(rows)} пользователей")
            for row in rows:
                new_url = convert_url(row[avatar_col])
                await conn.execute(
                    f"UPDATE users SET {avatar_col} = $1 WHERE id = $2",
                    new_url, row["id"]
                )
            total_updated += len(rows)
            print(f"   ✅ Обновлено: {len(rows)}")
        else:
            print(f"   ⚠️  Колонка с аватаром не найдена. Есть: {col_names}")
    except Exception as e:
        print(f"   ⚠️  users: {e}")

    await conn.close()

    print(f"\n🎉 Готово! Всего обновлено {total_updated} записей.")
    print(f"   Все URL {OLD_DOMAIN} заменены на {CDN_DOMAIN}")


if __name__ == "__main__":
    asyncio.run(main())
