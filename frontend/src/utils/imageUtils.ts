/**
 * Утилиты для работы с изображениями
 */

/**
 * Преобразует URL изображения в WebP формат, если это возможно
 * @param imageUrl - Оригинальный URL изображения
 * @returns URL с расширением .webp или оригинальный URL
 */
export const getWebPImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return imageUrl;
  
  // Если URL уже содержит .webp, возвращаем как есть
  if (imageUrl.includes('.webp')) {
    return imageUrl;
  }
  
  // Если URL начинается с http:// или https://, заменяем расширение
  const imageExtensions = /\.(jpg|jpeg|png|gif)$/i;
  if (imageExtensions.test(imageUrl)) {
    return imageUrl.replace(imageExtensions, '.webp');
  }
  
  // Если расширение не найдено, возвращаем оригинальный URL
  return imageUrl;
};

/**
 * Получает URL изображения с поддержкой WebP через проверку доступности
 * @param imageUrl - Оригинальный URL изображения
 * @returns Promise с URL (WebP если доступен, иначе оригинал)
 */
export const getOptimizedImageUrl = async (imageUrl: string): Promise<string> => {
  if (!imageUrl) return imageUrl;
  
  const webpUrl = getWebPImageUrl(imageUrl);
  
  // Если URL не изменился, возвращаем оригинал
  if (webpUrl === imageUrl) {
    return imageUrl;
  }
  
  // Проверяем доступность WebP версии
  try {
    const response = await fetch(webpUrl, { method: 'HEAD' });
    if (response.ok) {
      return webpUrl;
    }
  } catch (error) {
    // Игнорируем ошибки и возвращаем оригинальный URL
    
  }
  
  return imageUrl;
};

