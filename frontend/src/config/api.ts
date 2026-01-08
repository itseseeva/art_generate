// API конфигурация для фронтенда
// Используем переменную окружения VITE_API_URL или DOMAIN из .env
const getApiBaseUrl = (): string => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const domain = import.meta.env.DOMAIN || import.meta.env.VITE_DOMAIN;
  
  // В production режиме всегда используем домен или относительный путь
  if (import.meta.env.PROD) {
    // Если VITE_API_URL задан и это не IP адрес
    if (viteApiUrl !== undefined && viteApiUrl !== '') {
      // Проверяем, не является ли это IP адресом (Mixed Content проблема)
      const ipPattern = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/;
      if (ipPattern.test(viteApiUrl)) {
        console.warn('[API Config] IP адрес обнаружен в VITE_API_URL, используем относительный путь для избежания Mixed Content');
        return ''; // Используем относительный путь вместо IP
      }
      // Если это домен - используем его
      return viteApiUrl;
    }
    
    // Если задан домен, проверяем формат
    if (domain) {
      // Если это полный URL (начинается с http:// или https://)
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        // Если это localhost или IP - используем как есть
        if (domain.includes('localhost') || /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/.test(domain)) {
          return domain;
        }
        // Иначе добавляем /api
        return `${domain}/api`;
      }
      // Если это просто домен (например, cherrylust.art), формируем URL с https и /api
      return `https://${domain}/api`;
    }
    
    // В production по умолчанию используем относительный путь (через nginx proxy)
    // Это самый безопасный вариант - избегает Mixed Content
    return '';
  }
  
  // В development режиме
  // Если VITE_API_URL явно задан (даже пустая строка), используем его
  if (viteApiUrl !== undefined && viteApiUrl !== '') {
    return viteApiUrl;
  }
  
  // Если задан DOMAIN, используем его
  if (domain) {
    // Если это полный URL (начинается с http:// или https://)
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain;
    }
    // Если это просто домен, добавляем http://
    return `http://${domain}`;
  }
  
  // В development используем localhost по умолчанию
  return 'http://localhost:8000';
};

const baseUrl = getApiBaseUrl();

// Логируем используемый BASE_URL для отладки (только в development)
if (import.meta.env.DEV) {
  console.log('[API Config] BASE_URL:', baseUrl || '(относительный путь)');
}

export const API_CONFIG = {
  BASE_URL: baseUrl,
  
  // Аутентификация
  LOGIN: '/api/v1/auth/login/',
  REGISTER: '/api/v1/auth/register/',
  SET_USERNAME: '/api/v1/auth/set-username/',
  GOOGLE_AUTH: '/auth/google/',
  UNLOCK_USER_GALLERY: '/api/v1/auth/unlock-user-gallery/',
  USER_GALLERY: '/api/v1/auth/user-gallery/',
  ADD_PHOTO_TO_GALLERY: '/api/v1/auth/user-gallery/add/',
  USER_GENERATED_PHOTOS: (userId: number) => `/api/v1/auth/user-generated-photos/${userId}/`,
  
  // Платный альбом
  PAID_GALLERY_PHOTOS: (character: string) => `/api/v1/paid-gallery/${character}/photos`,
  
  // Персонажи
  CHARACTERS: '/api/v1/characters/',
  CHARACTER_CREATE: '/api/v1/characters/create/',
  CHARACTER_EDIT: (name: string) => `/api/v1/characters/${name}/user-edit`,
  CHARACTER_SET_PHOTOS: '/api/v1/characters/set-main-photos/',
  CHARACTER_PHOTOS: (name: string) => `/api/v1/characters/${name}/photos/`,
  CHARACTER_MAIN_PHOTOS: (name: string) => `/api/v1/characters/${name}/main-photos/`,
  FAVORITES: '/api/v1/characters/favorites/',
  ADD_FAVORITE: (characterId: number) => `/api/v1/characters/favorites/${characterId}`,
  REMOVE_FAVORITE: (characterId: number) => `/api/v1/characters/favorites/${characterId}`,
  CHECK_FAVORITE: (characterId: number) => `/api/v1/characters/favorites/check/${characterId}`,
  LIKE_CHARACTER: (characterId: number) => `/api/v1/characters/character-ratings/${characterId}/like`,
  DISLIKE_CHARACTER: (characterId: number) => `/api/v1/characters/character-ratings/${characterId}/dislike`,
  GET_CHARACTER_RATINGS: (characterId: number) => `/api/v1/characters/character-ratings/${characterId}`,
  
  // Генерация изображений
  GENERATE_IMAGE: '/api/v1/generate-image/',
  
  // Платежи
  YOOKASSA_CREATE_PAYMENT: '/api/v1/kassa/create_payment/',
  FALLBACK_SETTINGS: '/api/v1/fallback-settings/',
  
  // Чат
  CHAT: '/chat',
  
  // Делаем полные URL
  get AUTH_LOGIN() { return this.BASE_URL + this.LOGIN; },
  get AUTH_REGISTER() { return this.BASE_URL + this.REGISTER; },
  get AUTH_GOOGLE() { return this.BASE_URL + this.GOOGLE_AUTH; },
  get CHARACTERS_FULL() { return this.BASE_URL + this.CHARACTERS; },
  get CHARACTER_CREATE_FULL() { return this.BASE_URL + this.CHARACTER_CREATE; },
  CHARACTER_EDIT_FULL: (name: string) => API_CONFIG.BASE_URL + API_CONFIG.CHARACTER_EDIT(name),
  get CHARACTER_SET_PHOTOS_FULL() { return this.BASE_URL + this.CHARACTER_SET_PHOTOS; },
  CHARACTER_PHOTOS_FULL: (name: string) => API_CONFIG.BASE_URL + API_CONFIG.CHARACTER_PHOTOS(name),
  CHARACTER_MAIN_PHOTOS_FULL: (name: string) => API_CONFIG.BASE_URL + API_CONFIG.CHARACTER_MAIN_PHOTOS(name),
  get GENERATE_IMAGE_FULL() { return this.BASE_URL + this.GENERATE_IMAGE; },
  get FALLBACK_SETTINGS_FULL() { return this.BASE_URL + this.FALLBACK_SETTINGS; },
  get CHAT_FULL() { return this.BASE_URL + this.CHAT; },
};

// Вспомогательные функции для API запросов
export const api = {
  // Делает запрос к API с правильным базовым URL
  request: async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : API_CONFIG.BASE_URL + endpoint;
    return fetch(url, options);
  },
  
  // Делает запрос с аутентификацией
  requestWithAuth: async (endpoint: string, token: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : API_CONFIG.BASE_URL + endpoint;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  },
};
