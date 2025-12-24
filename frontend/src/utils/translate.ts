/**
 * Утилита для перевода текста с русского на английский.
 * Используется для автоматического перевода промптов перед генерацией изображений.
 */

/**
 * Переводит текст с русского на английский через API бэкенда.
 * 
 * @param text - Текст для перевода
 * @returns Переведенный текст на английском языке
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) {
    return text;
  }

  // Проверяем, содержит ли текст кириллицу
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(text);
  if (!hasCyrillic) {
    // Если нет кириллицы, считаем что текст уже на английском
    return text;
  }

  try {
    const response = await fetch('/api/v1/translate/ru-en', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      console.warn('[TRANSLATE] Ошибка перевода, используем оригинальный текст');
      return text;
    }

    const data = await response.json();
    return data.translated_text || text;
  } catch (error) {
    console.error('[TRANSLATE] Ошибка перевода:', error);
    // В случае ошибки возвращаем оригинальный текст
    return text;
  }
}

/**
 * Переводит несколько текстов одновременно.
 * 
 * @param texts - Массив текстов для перевода
 * @returns Массив переведенных текстов
 */
export async function translateMultipleToEnglish(texts: string[]): Promise<string[]> {
  const translations = await Promise.all(
    texts.map(text => translateToEnglish(text))
  );
  return translations;
}

/**
 * Переводит текст с английского на русский через API бэкенда.
 * 
 * @param text - Текст для перевода
 * @returns Переведенный текст на русском языке
 */
export async function translateToRussian(text: string): Promise<string> {
  if (!text || !text.trim()) {
    return text;
  }

  // Проверяем, содержит ли текст кириллицу
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(text);
  if (hasCyrillic) {
    // Если есть кириллица, считаем что текст уже на русском
    return text;
  }

  try {
    const response = await fetch('/api/v1/translate/en-ru', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      console.warn('[TRANSLATE] Ошибка перевода, используем оригинальный текст');
      return text;
    }

    const data = await response.json();
    return data.translated_text || text;
  } catch (error) {
    console.error('[TRANSLATE] Ошибка перевода:', error);
    // В случае ошибки возвращаем оригинальный текст
    return text;
  }
}

