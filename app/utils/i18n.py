"""
Утилита для определения языка пользователя и работы с мультиязычным контентом.
"""
from typing import Literal
from fastapi import Request

LanguageCode = Literal["ru", "en"]


def detect_language(request: Request) -> LanguageCode:
    """
    Определяет предпочитаемый язык пользователя по заголовку Accept-Language.
    
    Args:
        request: FastAPI Request объект
        
    Returns:
        "ru" если в Accept-Language есть 'ru', иначе "en" (по умолчанию)
    """
    accept_language = request.headers.get("Accept-Language", "").lower()
    
    # Проверяем наличие 'ru' в заголовке
    if "ru" in accept_language:
        return "ru"
    
    # По умолчанию английский для международной аудитории
    return "en"


def get_meta_tags(
    character_name: str,
    character_description: str,
    character_id: int,
    language: LanguageCode,
    og_image: str = None,
    base_url: str = "https://candygirlschat.com"
) -> dict:
    """
    Генерирует мета-теги для SEO на указанном языке.
    
    Args:
        character_name: Имя персонажа
        character_description: Описание персонажа
        character_id: ID персонажа
        language: Код языка ("ru" или "en")
        og_image: URL изображения для Open Graph
        base_url: Базовый URL сайта
        
    Returns:
        Словарь с мета-тегами
    """
    if language == "ru":
        title = f"Чат с ИИ {character_name} — CandyGirlsChat"
        description = f"Общайтесь с {character_name} на CandyGirlsChat. {character_description}"
        site_name = "CandyGirlsChat — Чат с ИИ персонажами"
    else:  # en
        title = f"Chat with AI {character_name} — CandyGirlsChat"
        description = f"Chat with {character_name} on CandyGirlsChat. Personal AI character roleplay. {character_description}"
        site_name = "CandyGirlsChat — AI Character Chat"
    
    # Ограничиваем общую длину описания до 160 символов
    if len(description) > 160:
        description = description[:157] + "..."
    
    # Результирующий словарь
    tags = {
        "title": title,
        "description": description,
        "og_title": title,
        "og_description": description,
        "og_site_name": site_name,
        "og_url": f"{base_url}/{language}/chat?character={character_id}",
        "og_type": "website",
    }
    
    # Добавляем изображение, если оно есть
    if og_image:
        tags["og_image"] = og_image
        tags["twitter_image"] = og_image
    else:
        # Дефолтное изображение (логотип)
        default_logo = f"{base_url}/logo-cherry.png"
        tags["og_image"] = default_logo
        tags["twitter_image"] = default_logo
        
    return tags


def get_hreflang_tags(character_id: int, base_url: str = "https://candygirlschat.com") -> list[dict]:
    """
    Генерирует hreflang теги для SEO.
    
    Args:
        character_id: ID персонажа
        base_url: Базовый URL сайта
        
    Returns:
        Список словарей с hreflang тегами
    """
    return [
        {
            "rel": "alternate",
            "hreflang": "ru",
            "href": f"{base_url}/ru/chat?character={character_id}"
        },
        {
            "rel": "alternate",
            "hreflang": "en",
            "href": f"{base_url}/en/chat?character={character_id}"
        },
        {
            "rel": "alternate",
            "hreflang": "x-default",
            "href": f"{base_url}/ru/chat?character={character_id}"
        }
    ]


def get_footer_seo_text(language: LanguageCode) -> str:
    """
    Возвращает SEO текст для футера на указанном языке.
    
    Args:
        language: Код языка ("ru" или "en")
        
    Returns:
        SEO текст для футера
    """
    if language == "ru":
        return (
            "CandyGirlsChat — лучшая платформа для ролевого чата с ИИ персонажами без цензуры. "
            "Общайтесь с AI аниме девушками, виртуальными вайфу и уникальными персонажами "
            "бесплатно и без регистрации. Наш продвинутый ИИ обеспечивает лучший опыт "
            "виртуального общения на русском и английском языках."
        )
    else:  # en
        return (
            "CandyGirlsChat is the ultimate platform for AI roleplay chat with NSFW characters. "
            "Experience no-filter AI chat on any topic. Chat with AI anime girls, virtual waifus, "
            "and unique characters for free and without registration. Our advanced AI provides "
            "the best virtual companion experience in English and Russian."
        )
