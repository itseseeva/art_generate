import { API_CONFIG } from '../config/api';
import { authManager } from './auth';

export type PromptFetchResult = {
  prompt: string | null;
  characterName: string | null;
  errorMessage: string | null;
};

const buildPromptEndpoint = (imageUrl: string): string => 
  `${API_CONFIG.BASE_URL}/api/v1/chat-history/prompt-by-image?image_url=${encodeURIComponent(imageUrl)}`;

const parsePromptResponse = async (response: Response): Promise<PromptFetchResult> => {
  try {
    const data = await response.json();
    if (response.ok && data?.success && data.prompt) {
      return {
        prompt: data.prompt,
        characterName: data.character_name ?? null,
        errorMessage: null
      };
    }

    return {
      prompt: null,
      characterName: data?.character_name ?? null,
      errorMessage: data?.message || 'Промпт недоступен для этого изображения'
    };
  } catch (error) {
    
    return {
      prompt: null,
      characterName: null,
      errorMessage: 'Не удалось обработать ответ сервера'
    };
  }
};

export const fetchPromptByImage = async (imageUrl: string): Promise<PromptFetchResult> => {
  if (!imageUrl) {
    return {
      prompt: null,
      characterName: null,
      errorMessage: 'URL изображения отсутствует'
    };
  }

  const endpoint = buildPromptEndpoint(imageUrl);

  try {
    const response = await authManager.fetchWithAuth(endpoint);
    return parsePromptResponse(response);
  } catch (error) {
    console.error('[fetchPromptByImage] Ошибка загрузки промпта:', error);
    return {
      prompt: null,
      characterName: null,
      errorMessage: error instanceof Error ? error.message : 'Не удалось загрузить промпт'
    };
  }
};

