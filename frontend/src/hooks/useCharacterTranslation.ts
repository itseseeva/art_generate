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
            const translated = field_ru || field_en || (character.translations?.[currentLang]?.situation);
            if (translated) return translated as T;

            const prompt = character.prompt || character.raw?.prompt || '';
            // Robust extraction: matches various English and Russian labels case-insensitively
            // Supports: Role-playing Situation, Roleplay Situation, Roleplay, Situation, Scenario and Russian equivalents
            // Also handles markdown like **Role-playing Situation** or [Roleplay]
            const extracted = prompt.match(/(?:[\[\]*#\s]*)(?:Role-playing Situation|Roleplay Situation|Roleplay|Situation|Scenario|Ролевая ситуация|Ситуация|Сценарий)(?:[\[\]*#\s]*):\s*(.*?)(?=\n\n|\n(?:[\[\]*#\s]*)(?:Instructions|Инструкции|Personality|List|Character|Description|Appearance|Tags)|$)/is)?.[1]?.trim();
            if (extracted) return extracted as T;

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
