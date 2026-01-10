/**
 * Утилиты для работы с персонажами
 */

/**
 * Извлекает Role-playing Situation из промпта персонажа
 * @param prompt - Полный промпт персонажа
 * @returns Role-playing Situation или null если не найдено
 */
export const extractRolePlayingSituation = (prompt: string): string | null => {
  if (!prompt) return null;
  
  try {
    // Ищем секцию "Role-playing Situation:" в промпте
    const situationMatch = prompt.match(/Role-playing Situation:\s*(.*?)(?=\n\nInstructions:|$)/s);
    
    if (situationMatch && situationMatch[1]) {
      return situationMatch[1].trim();
    }
    
    return null;
  } catch (error) {
    
    return null;
  }
};

/**
 * Извлекает все основные поля персонажа из промпта
 * @param prompt - Полный промпт персонажа
 * @returns Объект с извлеченными полями
 */
export const extractCharacterFields = (prompt: string) => {
  if (!prompt) return {};
  
  try {
    const fields: Record<string, string> = {};
    
    // Извлекаем Personality and Character
    const personalityMatch = prompt.match(/Personality and Character:\s*(.*?)(?=\n\nRole-playing Situation:|$)/s);
    if (personalityMatch && personalityMatch[1]) {
      fields.personality = personalityMatch[1].trim();
    }
    
    // Извлекаем Role-playing Situation
    const situationMatch = prompt.match(/Role-playing Situation:\s*(.*?)(?=\n\nInstructions:|$)/s);
    if (situationMatch && situationMatch[1]) {
      fields.situation = situationMatch[1].trim();
    }
    
    // Извлекаем Instructions
    const instructionsMatch = prompt.match(/Instructions:\s*(.*?)(?=\n\nResponse Style:|$)/s);
    if (instructionsMatch && instructionsMatch[1]) {
      fields.instructions = instructionsMatch[1].trim();
    }
    
    // Извлекаем Response Style
    const styleMatch = prompt.match(/Response Style:\s*(.*?)(?=\n\nIMPORTANT:|$)/s);
    if (styleMatch && styleMatch[1]) {
      fields.style = styleMatch[1].trim();
    }
    
    return fields;
  } catch (error) {
    
    return {};
  }
};

