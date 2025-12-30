"""
Простая система для персонажей чат-бота.
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import importlib
from typing import Dict, Any
from pydantic import BaseModel


@dataclass
class CharacterTraits:
    """Черты характера персонажа."""
    personality: str
    background: str
    speaking_style: str
    interests: List[str]
    mood: str
    additional_context: Optional[Dict[str, Any]] = None
    age: Optional[str] = None
    profession: Optional[str] = None
    behavior: Optional[str] = None
    appearance: Optional[str] = None
    voice: Optional[str] = None
    rules: Optional[str] = None
    context: Optional[str] = None


class Character:
    """Класс персонажа."""
    
    def __init__(self, name: str, traits: CharacterTraits):
        self.name = name
        self.traits = traits
        self.conversation_history: List[Dict[str, str]] = []
    
    def get_system_prompt(self) -> str:
        """Генерирует system prompt для персонажа из структурированных полей."""
        parts = [
            f"Имя: {self.name}",
            f"Возраст: {self.traits.age}" if self.traits.age else None,
            f"Профессия: {self.traits.profession}" if self.traits.profession else None,
            f"Личность: {self.traits.personality}",
            f"Предыстория: {self.traits.background}",
            f"Стиль речи: {self.traits.speaking_style}" if self.traits.speaking_style else None,
            f"Интересы: {', '.join(self.traits.interests)}" if self.traits.interests else None,
            f"Настроение: {self.traits.mood}" if self.traits.mood else None,
            f"Поведение: {self.traits.behavior}" if self.traits.behavior else None,
            f"Внешность: {self.traits.appearance}" if self.traits.appearance else None,
            f"Голос: {self.traits.voice}" if self.traits.voice else None,
            f"\nПРАВИЛА:\n{self.traits.rules}" if self.traits.rules else None,
            f"\nКОНТЕКСТ:\n{self.traits.context}" if self.traits.context else None
        ]
        return '\n'.join([p for p in parts if p])
    
    def add_message(self, role: str, content: str):
        """Добавляет сообщение в историю диалога."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": "2024-01-01T12:00:00"
        })
    
    def get_conversation_history(self, max_messages: int = 8) -> List[Dict[str, str]]:
        """Возвращает последние сообщения из истории."""
        return self.conversation_history[-max_messages:] if self.conversation_history else []
    
    def to_dict(self) -> Dict[str, Any]:
        """Конвертирует персонажа в словарь для API."""
        return {
            "name": self.name,
            "personality": self.traits.personality,
            "background": self.traits.background,
            "speaking_style": self.traits.speaking_style,
            "interests": self.traits.interests,
            "mood": self.traits.mood,
            "additional_context": self.traits.additional_context or {}
        }
    
    @classmethod
    def create(cls, name: str) -> 'Character':
        """Создает персонажа по имени из файла characters/name.py."""
        character_files = {
            "анна": "anna",
            "anna": "anna",
            "Анна": "anna"
        }
        file_name = character_files.get(name.lower())
        if not file_name:
            raise ValueError(f"Персонаж '{name}' не найден. Добавьте его в маппинг character_files")
        try:
            module = importlib.import_module(f".characters.{file_name}", package="app.chat_bot.models")
            char_data = module.get_character_data()
            traits = CharacterTraits(
                personality=char_data["personality"],
                background=char_data["background"],
                speaking_style=char_data["speaking_style"],
                interests=char_data["interests"],
                mood=char_data["mood"],
                additional_context=char_data.get("additional_context"),
                age=char_data.get("age"),
                profession=char_data.get("profession"),
                behavior=char_data.get("behavior"),
                appearance=char_data.get("appearance"),
                voice=char_data.get("voice"),
                rules=char_data.get("rules"),
                context=char_data.get("context")
            )
            return cls(char_data["name"], traits)
        except ImportError:
            raise ValueError(f"Файл characters/{file_name}.py не найден")
        except AttributeError:
            raise ValueError(f"В файле characters/{file_name}.py отсутствует функция get_character_data()")


# Создаем Анну
anna = Character.create("Анна")

# В будущем можно добавить других персонажей:
# maria = Character.create("Мария")  # если есть файл characters/maria.py