/**
 * Утилиты для подсчета токенов CLIP и ограничения длины промптов.
 * CLIP токенизатор имеет ограничение в 77 токенов.
 */

/**
 * Подсчитывает приблизительное количество CLIP токенов в тексте.
 * Это приближение, так как точный подсчет требует токенизатора CLIP.
 * 
 * @param text - Текст для подсчета токенов
 * @returns Приблизительное количество токенов
 */
export function countCLIPTokens(text: string): number {
  if (!text || !text.trim()) {
    return 0;
  }

  // Нормализуем текст: убираем лишние пробелы
  const normalized = text.trim().replace(/\s+/g, ' ');
  
  // Разбиваем на слова
  const words = normalized.split(/\s+/);
  
  let tokenCount = 0;
  
  for (const word of words) {
    // Каждое слово - минимум 1 токен
    tokenCount += 1;
    
    // Длинные слова (больше 6 символов) разбиваются на подтокены
    // Каждые 4 символа сверх 6 символов = дополнительный подтокен
    if (word.length > 6) {
      const subTokens = Math.ceil((word.length - 6) / 4);
      tokenCount += subTokens;
    }
    
    // Пунктуация добавляет примерно 0.5 токена за символ
    const punctuationMatches = word.match(/[.,!?;:()[\]{}\-_=+*&^%$#@~`|\\/"'<>]/g);
    if (punctuationMatches) {
      tokenCount += punctuationMatches.length * 0.5;
    }
  }
  
  // Округляем вверх до ближайшего целого
  return Math.ceil(tokenCount);
}

/**
 * Проверяет, превышает ли текст лимит токенов.
 * 
 * @param text - Текст для проверки
 * @param limit - Лимит токенов (по умолчанию 77)
 * @returns true если превышает лимит, false иначе
 */
export function exceedsTokenLimit(text: string, limit: number = 77): boolean {
  return countCLIPTokens(text) > limit;
}

/**
 * Обрезает текст до указанного лимита токенов.
 * 
 * @param text - Текст для обрезки
 * @param limit - Максимальное количество токенов (по умолчанию 77)
 * @returns Обрезанный текст
 */
export function truncateToTokenLimit(text: string, limit: number = 77): string {
  if (!text || !text.trim()) {
    return text;
  }

  // Если текст уже в пределах лимита, возвращаем как есть
  if (!exceedsTokenLimit(text, limit)) {
    return text;
  }

  // Бинарный поиск для нахождения максимальной длины, которая не превышает лимит
  let left = 0;
  let right = text.length;
  let bestLength = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const truncated = text.substring(0, mid);
    const tokens = countCLIPTokens(truncated);

    if (tokens <= limit) {
      bestLength = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Обрезаем до найденной длины и убираем последнее неполное слово
  let truncated = text.substring(0, bestLength);
  
  // Ищем последний пробел, чтобы не обрезать слово посередине
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex > 0 && truncated.length < text.length) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }

  return truncated.trim();
}
