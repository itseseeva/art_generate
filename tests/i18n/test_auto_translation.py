"""
Тесты для автоматического перевода описаний персонажей
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.scripts.auto_translate_descriptions import (
    translate_with_retry,
    auto_translate_descriptions
)


class TestTranslateWithRetry:
    """Тесты функции перевода с повторными попытками"""
    
    @pytest.mark.asyncio
    async def test_translate_cyrillic_text(self):
        """Тест перевода текста с кириллицей"""
        with patch('app.scripts.auto_translate_descriptions.GoogleTranslator') as mock_translator:
            mock_instance = Mock()
            mock_instance.translate.return_value = "Hello world"
            mock_translator.return_value = mock_instance
            
            result = await translate_with_retry("Привет мир")
            
            assert result == "Hello world"
            mock_instance.translate.assert_called_once_with("Привет мир")
    
    @pytest.mark.asyncio
    async def test_skip_non_cyrillic_text(self):
        """Тест пропуска текста без кириллицы"""
        result = await translate_with_retry("Hello world")
        assert result == "Hello world"
    
    @pytest.mark.asyncio
    async def test_handle_empty_text(self):
        """Тест обработки пустого текста"""
        assert await translate_with_retry("") == ""
        assert await translate_with_retry(None) == ""
        assert await translate_with_retry("   ") == ""
    
    @pytest.mark.asyncio
    async def test_retry_on_network_error(self):
        """Тест повторных попыток при сетевой ошибке"""
        with patch('app.scripts.auto_translate_descriptions.GoogleTranslator') as mock_translator:
            mock_instance = Mock()
            # Первая попытка - ошибка, вторая - успех
            mock_instance.translate.side_effect = [
                Exception("Connection reset by peer"),
                "Translated text"
            ]
            mock_translator.return_value = mock_instance
            
            result = await translate_with_retry("Тест")
            
            assert result == "Translated text"
            assert mock_instance.translate.call_count == 2
    
    @pytest.mark.asyncio
    async def test_fallback_to_original_on_max_retries(self):
        """Тест возврата оригинала после исчерпания попыток"""
        with patch('app.scripts.auto_translate_descriptions.GoogleTranslator') as mock_translator:
            mock_instance = Mock()
            mock_instance.translate.side_effect = Exception("Connection error")
            mock_translator.return_value = mock_instance
            
            result = await translate_with_retry("Тест", max_attempts=2)
            
            # Должен вернуть оригинал после неудачных попыток
            assert result == "Тест"
            assert mock_instance.translate.call_count == 2
    
    @pytest.mark.asyncio
    async def test_retry_only_on_network_errors(self):
        """Тест что retry происходит только для сетевых ошибок"""
        with patch('app.scripts.auto_translate_descriptions.GoogleTranslator') as mock_translator:
            mock_instance = Mock()
            # Не сетевая ошибка - не должно быть retry
            mock_instance.translate.side_effect = ValueError("Invalid input")
            mock_translator.return_value = mock_instance
            
            with pytest.raises(ValueError):
                await translate_with_retry("Тест", max_attempts=3)
            
            # Только одна попытка, без retry
            assert mock_instance.translate.call_count == 1


class TestAutoTranslateDescriptions:
    """Тесты функции автоматического перевода всех описаний"""
    
    @pytest.mark.asyncio
    async def test_translate_characters_without_english(self):
        """Тест перевода персонажей без английского описания"""
        # Мокаем сессию БД
        mock_session = AsyncMock()
        
        # Создаем мок персонажей
        char1 = Mock()
        char1.id = 1
        char1.name = "sakura"
        char1.description = "Милая девушка"
        char1.description_en = None
        
        char2 = Mock()
        char2.id = 2
        char2.name = "yuki"
        char2.description = "Добрая подруга"
        char2.description_en = None
        
        # Настраиваем мок результата запроса
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = [char1, char2]
        mock_session.execute.return_value = mock_result
        
        with patch('app.scripts.auto_translate_descriptions.async_session_maker') as mock_maker:
            mock_maker.return_value.__aenter__.return_value = mock_session
            
            with patch('app.scripts.auto_translate_descriptions.translate_with_retry') as mock_translate:
                mock_translate.side_effect = ["Cute girl", "Kind friend"]
                
                await auto_translate_descriptions()
                
                # Проверяем, что перевод вызван для обоих персонажей
                assert mock_translate.call_count == 2
                assert mock_session.execute.call_count >= 2  # SELECT + UPDATE запросы
                mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_skip_characters_with_english(self):
        """Тест пропуска персонажей с английским описанием"""
        mock_session = AsyncMock()
        
        # Мок результата - нет персонажей без английского
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = mock_result
        
        with patch('app.scripts.auto_translate_descriptions.async_session_maker') as mock_maker:
            mock_maker.return_value.__aenter__.return_value = mock_session
            
            with patch('app.scripts.auto_translate_descriptions.translate_with_retry') as mock_translate:
                await auto_translate_descriptions()
                
                # Перевод не должен вызываться
                mock_translate.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_rollback_on_error(self):
        """Тест отката транзакции при ошибке"""
        mock_session = AsyncMock()
        mock_session.execute.side_effect = Exception("Database error")
        
        with patch('app.scripts.auto_translate_descriptions.async_session_maker') as mock_maker:
            mock_maker.return_value.__aenter__.return_value = mock_session
            
            with pytest.raises(Exception):
                await auto_translate_descriptions()
            
            mock_session.rollback.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
