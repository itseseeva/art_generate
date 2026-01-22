import { API_CONFIG } from '../config/api';
import { authManager } from './auth';

export type PromptFetchResult = {
  hasPrompt: boolean;
  prompt: string | null;
  promptLength: number;
  characterName: string | null;
  hasErrorMessage: boolean;
  errorMessage: string | null;
};

const buildPromptEndpoint = (imageUrl: string): string => 
  `${API_CONFIG.BASE_URL}/api/v1/chat-history/prompt-by-image?image_url=${encodeURIComponent(imageUrl)}`;

const parsePromptResponse = async (response: Response): Promise<PromptFetchResult> => {
  try {
    const data = await response.json();
    
    if (response.ok && data?.success && data.prompt) {
      const prompt = data.prompt || '';
      return {
        hasPrompt: true,
        prompt: prompt,
        promptLength: prompt.length,
        characterName: data.character_name ?? null,
        hasErrorMessage: false,
        errorMessage: null
      };
    }

    const errorMsg = data?.message || 'Промпт недоступен для этого изображения';
    return {
      hasPrompt: false,
      prompt: null,
      promptLength: 0,
      characterName: data?.character_name ?? null,
      hasErrorMessage: true,
      errorMessage: errorMsg
    };
  } catch (error) {
    return {
      hasPrompt: false,
      prompt: null,
      promptLength: 0,
      characterName: null,
      hasErrorMessage: true,
      errorMessage: 'Не удалось обработать ответ сервера'
    };
  }
};

export const fetchPromptByImage = async (imageUrl: string): Promise<PromptFetchResult> => {
  if (!imageUrl) {
    return {
      hasPrompt: false,
      prompt: null,
      promptLength: 0,
      characterName: null,
      hasErrorMessage: true,
      errorMessage: 'URL изображения отсутствует'
    };
  }

  const endpoint = buildPromptEndpoint(imageUrl);

  try {
    // Промпт доступен для всех, включая неавторизованных пользователей
    // Используем обычный fetch, если нет токена, иначе используем авторизованный запрос
    const token = authManager.getToken();
    let response: Response;
    
    if (token) {
      // Если есть токен, используем авторизованный запрос
      response = await authManager.fetchWithAuth(endpoint);
    } else {
      // Если нет токена, используем обычный fetch
      response = await fetch(endpoint);
    }
    
    const result = await parsePromptResponse(response);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Не удалось загрузить промпт';
    return {
      hasPrompt: false,
      prompt: null,
      promptLength: 0,
      characterName: null,
      hasErrorMessage: true,
      errorMessage: errorMsg
    };
  }
};

