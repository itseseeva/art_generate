"""
Тесты для проверки автоматического переключения контента на основе заголовка Accept-Language.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import Mock, AsyncMock
from app.main import app
from app.database.db_depends import get_db
from app.chat_bot.models.models import CharacterDB, CharacterMainPhoto

@pytest.mark.asyncio
class TestLanguageSwitch:
    """Тесты переключения языка на основе Accept-Language."""

    @pytest.fixture(autouse=True)
    def setup_overrides(self):
        """Очистка переопределений зависимостей перед каждым тестом."""
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.fixture
    def mock_character_with_translations(self):
        """Фикстура персонажа с переводами."""
        character = Mock(spec=CharacterDB)
        character.id = 123
        character.name = "test_char"
        character.display_name = "Original Name"
        character.description = "Оригинальное описание"
        character.prompt = "Original prompt"
        character.translations = {
            "ru": {
                "name": "Русское Имя",
                "description": "Русское описание"
            },
            "en": {
                "name": "English Name",
                "description": "English description"
            }
        }
        return character

    @pytest.fixture
    def mock_photo(self):
        """Фикстура фото персонажа."""
        photo = Mock(spec=CharacterMainPhoto)
        photo.photo_url = "https://example.com/photo.jpg"
        return photo

    async def test_detect_language_ru(self, client: AsyncClient):
        """Тест определения русского языка по заголовку."""
        from app.utils.i18n import detect_language
        from fastapi import Request
        
        # Создаем фиктивный запрос
        request = Mock(spec=Request)
        request.headers = {"Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"}
        
        assert detect_language(request) == "ru"

    async def test_detect_language_en(self, client: AsyncClient):
        """Тест определения английского языка по заголовку."""
        from app.utils.i18n import detect_language
        from fastapi import Request
        
        # Создаем фиктивный запрос
        request = Mock(spec=Request)
        request.headers = {"Accept-Language": "en-US,en;q=0.9"}
        
        assert detect_language(request) == "en"

    async def test_seo_metadata_switching_to_ru(self, client: AsyncClient, mock_character_with_translations, mock_photo):
        """Проверка SEO метаданных при запросе с русским языком."""
        mock_session = AsyncMock()
        
        # Мокаем запрос персонажа
        mock_result = Mock()
        mock_result.scalar_one_or_none.side_effect = [mock_character_with_translations, mock_photo]
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = await client.get(
            "/seo-meta/character/123",
            headers={"Accept-Language": "ru-RU"}
        )
        
        assert response.status_code == 200
        # Проверяем наличие русского контента
        assert "Русское Имя" in response.text
        assert "Русское описание" in response.text
        assert 'lang="ru"' in response.text
        # Проверяем og:image
        assert "https://example.com/photo.jpg" in response.text

    async def test_seo_metadata_switching_to_en(self, client: AsyncClient, mock_character_with_translations, mock_photo):
        """Проверка SEO метаданных при запросе с английским языком."""
        mock_session = AsyncMock()
        
        # Мокаем запрос персонажа
        mock_result = Mock()
        mock_result.scalar_one_or_none.side_effect = [mock_character_with_translations, mock_photo]
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = await client.get(
            "/seo-meta/character/123",
            headers={"Accept-Language": "en-US"}
        )
        
        assert response.status_code == 200
        # Проверяем наличие английского контента
        assert "English Name" in response.text
        assert "English description" in response.text
        assert 'lang="en"' in response.text
        # Проверяем og:image
        assert "https://example.com/photo.jpg" in response.text

    async def test_sitemap_contains_both_languages(self, client: AsyncClient):
        """Проверка, что sitemap содержит и RU и EN ссылки."""
        # Для простоты мокаем пустой список персонажей, если не хотим глубоко лезть в БД
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.all.return_value = [] # Нет персонажей
        mock_result.scalars.return_value.all.return_value = [] # Нет тегов
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = await client.get("/sitemap.xml")
        assert response.status_code == 200
        assert "https://candygirlschat.com/ru/" in response.text
        assert "https://candygirlschat.com/en/" in response.text
        assert 'hreflang="ru"' in response.text
        assert 'hreflang="en"' in response.text
