// API конфигурация для фронтенда
// Используем переменную окружения VITE_API_URL или VITE_DOMAIN из .env
const getApiBaseUrl = (): string => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const viteDomain = import.meta.env.VITE_DOMAIN;
  
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
    
    // Если задан домен, формируем URL с https
    if (viteDomain) {
      return `https://${viteDomain}`;
    }
    
    // В production по умолчанию используем относительный путь (через nginx proxy)
    // Это самый безопасный вариант - избегает Mixed Content
    return '';
  }
  
  // В development режиме
  // Если VITE_API_URL явно задан (даже пустая строка), используем его
  if (viteApiUrl !== undefined) {
    // Если пустая строка - используем относительный путь
    if (viteApiUrl === '') {
      return '';
    }
    return viteApiUrl;
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
