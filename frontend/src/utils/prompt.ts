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
    console.error('[PROMPT] Ошибка чтения ответа:', error);
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

  const token = authManager.getToken();
  if (!token) {
    return {
      prompt: null,
      characterName: null,
      errorMessage: 'Необходима авторизация'
    };
  }

  const endpoint = buildPromptEndpoint(imageUrl);
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  try {
    const response = await fetch(endpoint, { headers });
    return parsePromptResponse(response);
  } catch (error) {
    console.error('[PROMPT] Ошибка запроса промпта:', error);
    return {
      prompt: null,
      characterName: null,
      errorMessage: 'Не удалось загрузить промпт'
    };
  }
};

