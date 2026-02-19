"""
Тесты для SEO эндпоинта /seo-meta/character/{id}
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock
from app.main import app
from app.database.db_depends import get_db


class TestSEOEndpoint:
    """Тесты SEO эндпоинта"""
    
    @pytest.fixture(autouse=True)
    def setup_overrides(self):
        """Очистка переопределений зависимостей перед каждым тестом"""
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}
    
    @pytest.fixture
    def client(self):
        """Фикстура тестового клиента"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_character(self):
        """Фикстура мок персонажа"""
        character = Mock()
        character.id = 1
        character.name = "sakura"
        character.display_name = "Sakura"
        character.description = "Милая аниме девушка"
        character.description_en = "Cute anime girl"
        character.prompt = "You are a friendly AI character"
        return character

    def test_seo_endpoint_russian_bot(self, client, mock_character):
        """Тест SEO эндпоинта для русского бота"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_character
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = client.get(
            "/seo-meta/character/1",
            headers={"Accept-Language": "ru-RU"}
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "Чат с ИИ Sakura" in response.text
        assert "Милая аниме девушка" in response.text

    def test_seo_endpoint_english_bot(self, client, mock_character):
        """Тест SEO эндпоинта для английского бота"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_character
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = client.get(
            "/seo-meta/character/1",
            headers={"Accept-Language": "en-US"}
        )
        
        assert response.status_code == 200
        assert "Chat with AI Sakura" in response.text
        assert "Cute anime girl" in response.text

    def test_seo_endpoint_hreflang_tags(self, client, mock_character):
        """Тест наличия hreflang тегов"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = mock_character
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = client.get("/seo-meta/character/1")
        
        assert 'hreflang="ru"' in response.text
        assert 'hreflang="en"' in response.text
        assert 'hreflang="x-default"' in response.text

    def test_seo_endpoint_character_not_found(self, client):
        """Тест 404 при отсутствии персонажа"""
        mock_session = AsyncMock()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
            
        async def override_get_db():
            yield mock_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        response = client.get("/seo-meta/character/999")
        
        assert response.status_code == 404
        assert "Character not found" in response.json()["detail"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
