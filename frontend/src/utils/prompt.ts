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
    console.log('[parsePromptResponse] Данные от сервера:', {
      ok: response.ok,
      success: data?.success,
      hasPrompt: !!data?.prompt,
      message: data?.message,
      characterName: data?.character_name
    });
    
    if (response.ok && data?.success && data.prompt) {
      console.log('[parsePromptResponse] Промпт найден, длина:', data.prompt.length);
      return {
        prompt: data.prompt,
        characterName: data.character_name ?? null,
        errorMessage: null
      };
    }

    console.log('[parsePromptResponse] Промпт не найден или ошибка');
    return {
      prompt: null,
      characterName: data?.character_name ?? null,
      errorMessage: data?.message || 'Промпт недоступен для этого изображения'
    };
  } catch (error) {
    console.error('[parsePromptResponse] Ошибка парсинга JSON:', error);
    return {
      prompt: null,
      characterName: null,
      errorMessage: 'Не удалось обработать ответ сервера'
    };
  }
};

export const fetchPromptByImage = async (imageUrl: string): Promise<PromptFetchResult> => {
  if (!imageUrl) {
    console.log('[fetchPromptByImage] URL изображения отсутствует');
    return {
      prompt: null,
      characterName: null,
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
      hasPrompt: !!result.prompt,
      hasErrorMessage: !!result.errorMessage,
      promptLength: result.prompt?.length || 0
    });
    return result;
  } catch (error) {
    console.error('[fetchPromptByImage] Критическая ошибка загрузки промпта:', {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      prompt: null,
      characterName: null,
      errorMessage: error instanceof Error ? error.message : 'Не удалось загрузить промпт'
    };
  }
};

