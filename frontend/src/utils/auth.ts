/**
 * Утилиты для работы с аутентификацией и токенами
 */

import { API_CONFIG } from '../config/api';

type AuthChangeDetail = {
  isAuthenticated: boolean;
};

const AUTH_CHANGE_EVENT = 'auth:change';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

class AuthManager {
  private static instance: AuthManager;
  private refreshPromise: Promise<TokenResponse> | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private eventTarget: EventTarget = new EventTarget();

  private constructor() {
    // Автоматически обновляем токен каждые 30 минут
    this.startAutoRefresh();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Получает токен из localStorage
   */
  public getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Получает refresh token из localStorage
   */
  public getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Сохраняет токены в localStorage
   */
  public setTokens(accessToken: string, refreshToken?: string | null): void {
    localStorage.setItem('authToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
    this.startAutoRefresh();
    this.notifyAuthChange({ isAuthenticated: true });
  }

  /**
   * Удаляет токены из localStorage
   */
  public clearTokens(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    this.stopAutoRefresh();
    this.notifyAuthChange({ isAuthenticated: false });
  }

  /**
   * Подписка на изменение статуса аутентификации
   */
  public subscribeAuthChanges(callback: (detail: AuthChangeDetail) => void): () => void {
    const handler = ((event: Event) => {
      const customEvent = event as CustomEvent<AuthChangeDetail>;
      callback(customEvent.detail);
    }) as EventListener;

    this.eventTarget.addEventListener(AUTH_CHANGE_EVENT, handler);

    return () => {
      this.eventTarget.removeEventListener(AUTH_CHANGE_EVENT, handler);
    };
  }

  private notifyAuthChange(detail: AuthChangeDetail): void {
    const event = new CustomEvent<AuthChangeDetail>(AUTH_CHANGE_EVENT, { detail });
    this.eventTarget.dispatchEvent(event);
  }

  /**
   * Запускает автоматическое обновление токенов каждые 30 минут
   */
  private startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
      const token = this.getToken();
      if (token && !this.isTokenExpired(token)) {
        try {
          
          await this.refreshAccessToken();
        } catch (error) {
          
        }
      }
    }, 30 * 60 * 1000); // 30 минут
  }

  /**
   * Останавливает автоматическое обновление токенов
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Проверяет, истек ли токен
   */
  public isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Конвертируем в миллисекунды
      const now = Date.now();
      return exp < now;
    } catch (error) {
      
      return true; // Если не можем распарсить, считаем токен истекшим
    }
  }

  /**
   * Обновляет токен используя refresh token
   */
  public async refreshAccessToken(): Promise<TokenResponse> {
    // Если уже идет процесс обновления, ждем его завершения
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await fetch(API_CONFIG.BASE_URL + '/api/v1/auth/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData: TokenResponse = await response.json();
      
      // Сохраняем новые токены
      this.setTokens(tokenData.access_token, tokenData.refresh_token);
      
      return tokenData;
    } catch (error) {
      
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Выполняет запрос с автоматическим обновлением токена при необходимости
   */
  public async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getToken();
    
    // Если токена нет, пытаемся обновить его через refresh
    if (!token) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const newTokens = await this.refreshAccessToken();
          token = newTokens.access_token;
        } catch (error) {
          
          this.clearTokens();
          throw new Error('No access token available');
        }
      } else {
        this.clearTokens();
        throw new Error('No access token available');
      }
    }

    // Проверяем, истек ли токен
    if (this.isTokenExpired(token)) {
      
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const newTokens = await this.refreshAccessToken();
          token = newTokens.access_token;
        } catch (error) {
          
          this.clearTokens();
          // Не выбрасываем ошибку сразу, пытаемся использовать старый токен
          
        }
      } else {
        
        this.clearTokens();
      }
    }

    // Добавляем токен в заголовки
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url.startsWith('http') ? url : API_CONFIG.BASE_URL + url, {
      ...options,
      headers
    });

    // Если получили 401, пытаемся обновить токен и повторить запрос
    if (response.status === 401) {
      
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        
        this.clearTokens();
        throw new Error('Authentication failed: No refresh token');
      }
      
      try {
        const newTokens = await this.refreshAccessToken();
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newTokens.access_token}`
        };

        return fetch(url.startsWith('http') ? url : API_CONFIG.BASE_URL + url, {
          ...options,
          headers: newHeaders
        });
      } catch (error) {
        
        this.clearTokens();
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  /**
   * Проверяет авторизацию пользователя
   */
  public async checkAuth(): Promise<{ isAuthenticated: boolean; userInfo: any }> {
    try {
      const token = this.getToken();
      
      
      if (!token) {
        return {
          isAuthenticated: false,
          userInfo: null
        };
      }
      
      const response = await this.fetchWithAuth(API_CONFIG.BASE_URL + '/api/v1/auth/me/');
      
      
      
      if (response.ok) {
        const userData = await response.json();
        
        return {
          isAuthenticated: true,
          userInfo: userData
        };
      } else {
        
        this.clearTokens();
        return {
          isAuthenticated: false,
          userInfo: null
        };
      }
    } catch (error) {
      
      this.clearTokens();
      return {
        isAuthenticated: false,
        userInfo: null
      };
    }
  }

  /**
   * Выход из системы
   */
  public async logout(): Promise<void> {
    try {
      // Пытаемся вызвать API для выхода (если есть такой endpoint)
      const token = this.getToken();
      if (token) {
        try {
          await fetch(API_CONFIG.BASE_URL + '/api/v1/auth/logout/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          // Игнорируем ошибки API, все равно очищаем токены локально
          
        }
      }
    } catch (error) {
      
    } finally {
      // Всегда очищаем токены локально
      this.clearTokens();
    }
  }
}

// Экспортируем singleton instance
export const authManager = AuthManager.getInstance();

// Экспортируем типы
export type { TokenResponse };
