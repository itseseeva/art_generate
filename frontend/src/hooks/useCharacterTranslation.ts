import { useTranslation } from 'react-i18next';
import { Character } from '../types/character';

export function useCharacterTranslation(character: Character) {
    const { i18n } = useTranslation();
    const currentLang = i18n.language?.split('-')[0] || 'en'; // 'ru', 'en'

    // Helper to get translated field
    const tChar = <T = string>(field: 'name' | 'description' | 'prompt' | 'situation' | 'instructions' | 'firstMessage' | 'personality' | 'appearance' | 'location' | 'tags' | 'style'): T => {
        if (!character) return undefined as any;

        // 1. Check for new bilingual fields first
        const field_ru = (character as any)[`${field}_ru`];
        const field_en = (character as any)[`${field}_en`];

        // ДИАГНОСТИКА — убери после нахождения проблемы
        if (field === 'name') {
            console.log(`[tChar] id=${character.id} name="${(character as any).name}" lang="${currentLang}" name_ru="${(character as any).name_ru}" name_en="${(character as any).name_en}"`);
        }

        if (currentLang === 'ru' && field_ru) return field_ru as T;
        if (currentLang === 'en' && field_en) return field_en as T;

        // 2. Fallback to old translations object if still present (for transition)
        if (character.translations?.[currentLang]?.[field as any]) {
            return (character.translations[currentLang] as any)[field];
        }

        // 3. Fallback to other language if current is missing
        if (currentLang === 'ru' && field_en) return field_en as T;
        if (currentLang === 'en' && field_ru) return field_ru as T;

        // 4. Default fallbacks
        const mapping: Record<string, string> = {
            'name': 'name',
            'description': 'description',
            'appearance': 'character_appearance',
            'location': 'location',
            'style': 'style'
        };

        if (field === 'name' && character.display_name) return character.display_name as T;
        if (field === 'tags' && character.tags) return character.tags as T;

        if (field === 'situation') {
            // Строго проверяем перевод для текущего языка
            const translatedForLang = currentLang === 'ru' 
                ? (field_ru || character.translations?.ru?.situation) 
                : (field_en || character.translations?.en?.situation);
                
            if (translatedForLang) return translatedForLang as T;

            const rawPrompt = character.raw?.prompt || character.raw?.full_prompt || '';
            const prompt = character.prompt || rawPrompt || character.description || '';

            // Регулярки для извлечения по языкам
            const ruMatch = prompt.match(/(?:[\[\]*#\s]*)(?:Ролевая ситуация|Ситуация|Сценарий)(?:[\[\]*#\s]*):\s*(.*?)(?=\n\n|\n(?:[\[\]*#\s]*)(?:Instructions|Инструкции|Personality|List|Character|Description|Appearance|Tags)|$)/is)?.[1]?.trim();
            const enMatch = prompt.match(/(?:[\[\]*#\s]*)(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario)(?:[\[\]*#\s]*):\s*(.*?)(?=\n\n|\n(?:[\[\]*#\s]*)(?:Instructions|Инструкции|Personality|List|Character|Description|Appearance|Tags)|$)/is)?.[1]?.trim();
            
            // Пытаемся извлечь ситуацию в соответствии с текущим языком
            if (currentLang === 'ru') {
                if (ruMatch) return ruMatch as T;
                // Фоллбэк на английский парсер только если нет русского перевода и паттерна
                if (enMatch) return enMatch as T;
                if (field_en) return field_en as T;
            } else {
                if (enMatch) return enMatch as T;
                // Фоллбэк на русский парсер только если нет английского перевода и паттерна
                if (ruMatch) return ruMatch as T;
                if (field_ru) return field_ru as T;
            }

            const name = character.display_name || character.name || '';
            const desc = character.description || '';
            if (desc && desc.toLowerCase() !== name.toLowerCase()) return desc as T;

            return undefined as any;
        }

        // For bilingual fields, do NOT fallback to the field name itself if they are missing
        if (['situation', 'personality', 'instructions', 'style'].includes(field)) {
            return undefined as any;
        }

        const targetField = mapping[field] || field;
        const originalValue = (character as any)[targetField];

        if (originalValue) return originalValue as T;

        return undefined as T;
    };

    return { tChar };
}
