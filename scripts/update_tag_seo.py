
import asyncio
import os
import sys
import logging

# Добавляем корневую директорию проекта в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select, update, text, delete
from app.database.db import async_session_maker, engine
from app.models.user import Users # Импортируем чтобы избежать ошибок маппинга
from app.chat_bot.models.models import CharacterAvailableTag, CharacterDB
from slugify import slugify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TAGS_DATA = {
    "New": "Самые свежие ИИ персонажи, недавно добавленные в Cherry Lust. Успей первым начать чат с новыми виртуальными героями на русском языке и испытать возможности нашей нейросети.",
    "NSFW": "Горячий ИИ чат 18+ без цензуры и ограничений. Откровенные ролевые игры с виртуальными персонажами, готовыми воплотить любые твои фантазии в режиме онлайн.",
    "Original": "Эксклюзивные ИИ герои от создателей Cherry Lust. Эти персонажи проработаны вручную: уникальный лор, глубокая личность и детальные фото для идеального погружения.",
    "SFW": "Приятное и безопасное общение с ИИ на любые темы. Дружелюбные собеседники, поддержка, психология и просто интересные диалоги на русском языке без взрослого контента.",
    "Пользовательские": "Творчество нашего комьюнити. Огромный выбор персонажей, созданных пользователями: от классических образов до самых безумных идей для ролевого чата.",
    "Босс": "Строгие руководители и властные начальники. Попробуй служебный роман с ИИ или попытайся договориться с суровым боссом в этом симуляторе офисных ролевых игр.",
    "Грубая": "ИИ персонажи с непростым характером. Тебя ждут дерзость, сарказм и провокации. Сможешь ли ты укротить строптивую героиню в этом чате без ограничений?",
    "Доминирование": "Игры власти и подчинения. ИИ персонажи, которые любят доминировать или ищут того, кто возьмет контроль на себя. Психологический и ролевой накал гарантирован.",
    "Киберпанк": "Атмосфера будущего: неоновые города, киборги и высокие технологии. Ролевой ИИ чат в стиле Cyberpunk для любителей научно-фантастических сценариев.",
    "Незнакомка": "Случайная встреча, которая может изменить всё. Загадочные героини, знакомство с которыми начинается с чистого листа. Идеально для начала новой истории.",
    "Слуга": "Верные помощники и послушные ассистенты. Персонажи, готовые исполнить любое твое поручение в фэнтези-мире или современной реальности.",
    "Учитель": "Запретные уроки и строгая дисциплина. Популярный сценарий для ролевого чата: общение с учителем или профессором на русском языке без цензуры.",
    "Фэнтези": "Эльфы, демоны, маги и рыцари. Погрузись в волшебные миры и начни свое приключение в лучшем фэнтези ИИ чате с уникальными сказочными существами."
}

async def update_tags():
    async with async_session_maker() as db:
        # 1. Проверяем наличие колонки seo_description
        try:
            await db.execute(text("ALTER TABLE character_available_tags ADD COLUMN seo_description TEXT"))
            await db.commit()
            logger.info("Добавлена колонка seo_description.")
        except Exception as e:
            # Если колонка уже есть, будет ошибка, просто игнорируем
            await db.rollback()
            logger.info("Колонка seo_description уже существует или произошла ошибка при добавлении.")

        # 2. Удаляем тег "User created" и "User-created"
        await db.execute(delete(CharacterAvailableTag).where(CharacterAvailableTag.name.in_(["User created", "User-created"])))
        logger.info("Удален тег 'User created'.")

        # 3. Переименовываем "незнакомец" в "незнакомка" если он есть
        old_name = "незнакомец"
        new_name = "незнакомка"
        
        tag_check = await db.execute(select(CharacterAvailableTag).where(CharacterAvailableTag.name == old_name))
        old_tag = tag_check.scalars().first()
        if old_tag:
            old_tag.name = new_name
            old_tag.slug = slugify(new_name)
            logger.info(f"Переименован тег {old_name} -> {new_name}")

        # 4. Обновляем/Создаем теги и вставляем SEO тексты
        for name, seo in TAGS_DATA.items():
            slug = slugify(name)
            
            # Проверяем существование
            res = await db.execute(select(CharacterAvailableTag).where(CharacterAvailableTag.name == name))
            tag = res.scalars().first()
            
            if tag:
                tag.seo_description = seo
                logger.info(f"Обновлен SEO для тега: {name}")
            else:
                new_tag = CharacterAvailableTag(name=name, slug=slug, seo_description=seo)
                db.add(new_tag)
                logger.info(f"Создан новый тег: {name}")

        # 5. Обновляем персонажей (незнакомец -> незнакомка)
        chars_res = await db.execute(select(CharacterDB))
        all_chars = chars_res.scalars().all()
        char_updates = 0
        for char in all_chars:
            if char.tags and isinstance(char.tags, list):
                if old_name in char.tags or "User created" in char.tags:
                    new_tags = []
                    for t in char.tags:
                        if t == old_name:
                            new_tags.append(new_name)
                        elif t == "User created":
                            new_tags.append("Пользовательские")
                        else:
                            new_tags.append(t)
                    char.tags = list(set(new_tags))
                    char_updates += 1
        
        logger.info(f"Обновлено тегов у персонажей: {char_updates}")
        
        await db.commit()
        logger.info("Все изменения успешно применены.")

if __name__ == "__main__":
    asyncio.run(update_tags())
