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
    console.log('[parsePromptResponse] Данные от сервера:', {
      ok: response.ok,
      success: data?.success,
      hasPrompt: !!data?.prompt,
      message: data?.message,
      characterName: data?.character_name
    });
    
    if (response.ok && data?.success && data.prompt) {
      const prompt = data.prompt || '';
      console.log('[parsePromptResponse] Промпт найден, длина:', prompt.length);
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
    console.log('[parsePromptResponse] Промпт не найден или ошибка');
    return {
      hasPrompt: false,
      prompt: null,
      promptLength: 0,
      characterName: data?.character_name ?? null,
      hasErrorMessage: true,
      errorMessage: errorMsg
    };
  } catch (error) {
    console.error('[parsePromptResponse] Ошибка парсинга JSON:', error);
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
    console.log('[fetchPromptByImage] URL изображения отсутствует');
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
  console.log('[fetchPromptByImage] Запрос промпта для изображения:', imageUrl);
  console.log('[fetchPromptByImage] Endpoint:', endpoint);

  try {
    const response = await authManager.fetchWithAuth(endpoint);
    console.log('[fetchPromptByImage] Ответ от сервера:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    const result = await parsePromptResponse(response);
    console.log('[fetchPromptByImage] Результат парсинга:', {
      hasPrompt: result.hasPrompt,
      hasErrorMessage: result.hasErrorMessage,
      promptLength: result.promptLength
    });
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Не удалось загрузить промпт';
    console.error('[fetchPromptByImage] Критическая ошибка загрузки промпта:', {
      error: error,
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined
    });
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

