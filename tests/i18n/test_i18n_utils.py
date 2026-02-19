"""
Тесты для утилит i18n (определение языка и генерация мета-тегов)
"""
import pytest
from unittest.mock import Mock
from app.utils.i18n import (
    detect_language,
    get_meta_tags,
    get_hreflang_tags,
    get_footer_seo_text
)


class TestLanguageDetection:
    """Тесты определения языка пользователя"""
    
    def test_detect_russian_language(self):
        """Тест определения русского языка"""
        request = Mock()
        request.headers.get.return_value = "ru-RU,ru;q=0.9,en;q=0.8"
        
        language = detect_language(request)
        assert language == "ru"
    
    def test_detect_english_language(self):
        """Тест определения английского языка"""
        request = Mock()
        request.headers.get.return_value = "en-US,en;q=0.9"
        
        language = detect_language(request)
        assert language == "en"
    
    def test_detect_default_language_when_no_header(self):
        """Тест дефолтного языка при отсутствии заголовка"""
        request = Mock()
        request.headers.get.return_value = ""
        
        language = detect_language(request)
        assert language == "en"
    
    def test_detect_russian_in_mixed_languages(self):
        """Тест определения русского в смешанных языках"""
        request = Mock()
        request.headers.get.return_value = "fr-FR,ru;q=0.8,en;q=0.7"
        
        language = detect_language(request)
        assert language == "ru"


class TestMetaTags:
    """Тесты генерации мета-тегов"""
    
    def test_russian_meta_tags(self):
        """Тест генерации русских мета-тегов"""
        meta_tags = get_meta_tags(
            character_name="Сакура",
            character_description="Милая аниме девушка",
            character_id=1,
            language="ru"
        )
        
        assert "Чат с ИИ Сакура" in meta_tags["title"]
        assert "CandyGirlsChat" in meta_tags["title"]
        assert "Общайтесь с Сакура" in meta_tags["description"]
        assert meta_tags["og_url"] == "https://candygirlschat.com/characters?character=1"
    
    def test_english_meta_tags(self):
        """Тест генерации английских мета-тегов"""
        meta_tags = get_meta_tags(
            character_name="Sakura",
            character_description="Cute anime girl",
            character_id=1,
            language="en"
        )
        
        assert "Chat with AI Sakura" in meta_tags["title"]
        assert "CandyGirlsChat" in meta_tags["title"]
        assert "Chat with Sakura" in meta_tags["description"]
        assert "Personal AI character roleplay" in meta_tags["description"]
    
    def test_meta_tags_truncate_long_description(self):
        """Тест обрезки длинного описания"""
        long_description = "A" * 200
        meta_tags = get_meta_tags(
            character_name="Test",
            character_description=long_description,
            character_id=1,
            language="en"
        )
        
        assert len(meta_tags["description"]) < 200


class TestHreflangTags:
    """Тесты генерации hreflang тегов"""
    
    def test_hreflang_tags_structure(self):
        """Тест структуры hreflang тегов"""
        tags = get_hreflang_tags(character_id=123)
        
        assert len(tags) == 3
        assert any(tag["hreflang"] == "ru" for tag in tags)
        assert any(tag["hreflang"] == "en" for tag in tags)
        assert any(tag["hreflang"] == "x-default" for tag in tags)
    
    def test_hreflang_urls_format(self):
        """Тест формата URL в hreflang тегах"""
        tags = get_hreflang_tags(character_id=456)
        
        for tag in tags:
            assert "candygirlschat.com" in tag["href"]
            assert "character=456" in tag["href"]
            assert tag["rel"] == "alternate"


class TestFooterSeoText:
    """Тесты SEO текста футера"""
    
    def test_russian_footer_text(self):
        """Тест русского SEO текста"""
        text = get_footer_seo_text("ru")
        
        assert "CandyGirlsChat" in text
        assert "ролевого чата" in text
        assert "ИИ персонажами" in text
    
    def test_english_footer_text(self):
        """Тест английского SEO текста"""
        text = get_footer_seo_text("en")
        
        assert "CandyGirlsChat" in text
        assert "AI roleplay chat" in text
        assert "NSFW characters" in text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
