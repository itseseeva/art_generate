import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'motion/react';
import { FiHeart } from 'react-icons/fi';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { ShopModal } from './ShopModal';
import { AuthModal } from './AuthModal';
import { PhotoGenerationPage } from './PhotoGenerationPage';
import { Footer } from './Footer';
import { GlobalHeader } from './GlobalHeader';
import Switcher4 from './Switcher4';
import { NSFWWarningModal } from './NSFWWarningModal';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import '../styles/ContentArea.css';
import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
  
  @media (max-width: 768px) {
    overflow: visible;
  }
`;

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const FooterWrapper = styled.div`
  width: 100%;
  margin-top: auto;
  flex-shrink: 0;
`;

const HeaderWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  background: transparent;
`;


const NavButton = styled.button`
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: transform ${theme.transition.fast};
  position: relative;
  
  /* Градиентный текст */
  background: linear-gradient(135deg, #a8a8a8, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    
    /* Более яркий градиент при hover */
    background: linear-gradient(135deg, #ffffff, rgba(102, 126, 234, 0.9));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    /* Показываем светящуюся линию */
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.sm};
  border-bottom: 1px solid rgba(130, 130, 130, 0.3);
  background: rgba(15, 15, 15, 0.5);
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 2px solid ${props => props.$active ? 'rgba(102, 126, 234, 0.8)' : 'rgba(70, 70, 70, 0.8)'};
  border-radius: ${theme.borderRadius.md};
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(76, 81, 191, 0.2) 100%)' 
    : 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%)'};
  color: ${props => props.$active ? 'rgba(240, 240, 240, 1)' : 'rgba(160, 160, 160, 1)'};
  font-size: ${theme.fontSize.sm};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(102, 126, 234, 0.9);
    background: ${props => props.$active 
      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(76, 81, 191, 0.3) 100%)' 
      : 'linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%)'};
    color: rgba(240, 240, 240, 1);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  overflow-y: visible;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0;
  align-content: start;
  width: 100%;
  min-height: 0;
  
  @media (max-width: 768px) {
    flex: none;
    overflow-y: visible;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5),
                0 0 40px rgba(139, 92, 246, 0.3),
                0 0 60px rgba(139, 92, 246, 0.2),
                inset 0 0 20px rgba(139, 92, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.7),
                0 0 60px rgba(139, 92, 246, 0.5),
                0 0 90px rgba(139, 92, 246, 0.3),
                inset 0 0 30px rgba(139, 92, 246, 0.2);
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const floatAnimation = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
`;

const CreateCharacterCardWrapper = styled.div`
  position: relative;
  height: 300px;
  width: 100%;
  min-width: 200px;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[]; // Array of photos for slideshow
  tags: string[];
  author: string;
  likes: number;
  views: number;
  comments: number;
  is_nsfw?: boolean;
}

// Mock character data - only originals
const mockCharacters: Character[] = [
  {
    id: 'anna',
    name: 'Anna',
    description: 'Friendly assistant with warm character',
    avatar: 'A',
    photos: [], // Will be filled dynamically
    tags: ['Friendly', 'Assistant'],
    author: 'AI',
    likes: 1200,
    views: 5000,
    comments: 150,
  },
  {
    id: 'caitlin',
    name: 'Caitlin',
    description: 'Mysterious and wise mentor',
    avatar: 'C',
    photos: [], // Will be filled dynamically
    tags: ['Wise', 'Mentor'],
    author: 'AI',
    likes: 980,
    views: 4100,
    comments: 90,
  },
  {
    id: '3',
    name: 'Christina',
    description: 'Wise mentor and philosopher',
    avatar: 'C',
    photos: [], // Will be filled dynamically
    tags: ['Mentor', 'Wise'],
    author: 'System',
    likes: 2100,
    views: 28900,
    comments: 67
  },
  {
    id: '4',
    name: 'Nadya1',
    description: 'Technical expert and programmer',
    avatar: 'N',
    photos: [], // Will be filled dynamically
    tags: ['Programmer', 'Technical'],
    author: 'System',
    likes: 1750,
    views: 19800,
    comments: 54
  }
];

interface MainPageProps {
  onCharacterSelect?: (character: Character) => void;
  onMyCharacters?: () => void;
  onCreateCharacter?: () => void;
  onShop?: () => void;
  onProfile?: () => void;
  onMessages?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
  onEditCharacters?: () => void;
  onFavorites?: () => void;
  onHistory?: () => void;
  onHome?: () => void;
  onPaymentMethod?: (subscriptionType: string) => void;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onLogin?: () => void;
}

export const MainPage: React.FC<MainPageProps> = ({ 
  onCharacterSelect, 
  onMyCharacters, 
  onCreateCharacter,
  onShop,
  onProfile,
  onMessages,
  onPhotoGeneration,
  onPaidAlbum,
  onEditCharacters,
  onFavorites,
  onHistory,
  onHome,
  onPaymentMethod,
  contentMode = 'safe',
  onContentModeChange,
  onRegister,
  onLogout,
  onLogin
}) => {
  const isMobile = useIsMobile();
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isPhotoGenerationOpen, setIsPhotoGenerationOpen] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, is_admin?: boolean, id?: number} | null>(null);
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [cachedRawCharacters, setCachedRawCharacters] = useState<any[]>([]);
  const charactersGridRef = useRef<HTMLDivElement>(null);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());
  const [sortFilter, setSortFilter] = useState<'all' | 'popular'>('popular');
  const [characterRatings, setCharacterRatings] = useState<{[key: number]: {likes: number, dislikes: number}}>({});

  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<'safe' | 'nsfw' | null>(null);

  const fetchCharactersFromApi = async (forceRefresh: boolean = false): Promise<any[]> => {
    const endpoints = [
      API_CONFIG.CHARACTERS, // Используем прокси через Vite
      '/api/v1/characters/', // Правильный endpoint
      '/api/characters/' // Fallback endpoint
    ];

    for (const endpoint of endpoints) {
      try {
        // Добавляем параметр для принудительного обновления (обход кэша)
        // Всегда добавляем timestamp для обхода кэша браузера
        // И параметр force_refresh для очистки Redis кэша на бэкенде
        const url = `${endpoint}?skip=0&limit=1000&force_refresh=${forceRefresh ? 'true' : 'false'}&_t=${Date.now()}`;
        
        const response = await fetch(url, {
          cache: 'no-cache', // Всегда обходим кэш браузера
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          continue;
        }
        const payload = await response.json();
        
        console.log(`[MainPage] Response from ${endpoint}:`, {
          isArray: Array.isArray(payload),
          length: Array.isArray(payload) ? payload.length : (payload?.characters?.length || 0),
          firstChar: Array.isArray(payload) && payload.length > 0 ? {
            id: payload[0].id,
            name: payload[0].name,
            is_nsfw: payload[0].is_nsfw
          } : null
        });
        
        if (Array.isArray(payload)) {
          if (payload.length > 0) {
            console.log(`[MainPage] Loaded ${payload.length} characters from ${endpoint}`);
          }
          return payload;
        }
        if (payload && Array.isArray(payload.characters)) {
          if (payload.characters.length > 0) {
            console.log(`[MainPage] Loaded ${payload.characters.length} characters from ${endpoint}`);
          }
          return payload.characters;
        }
      } catch (error) {
        // Ошибка игнорируется, продолжаем цикл
      }
    }
    return [];
  };

  // Load characters from API
  const loadCharacters = async (forceRefresh: boolean = false) => {
    try {
      // Показываем индикатор загрузки только при первой загрузке или принудительном обновлении
      // Если данные уже есть в кэше, не показываем индикатор
      if (forceRefresh || characters.length === 0) {
      setIsLoadingCharacters(true);
      }
      const charactersData = await fetchCharactersFromApi(forceRefresh);

      console.log(`[MainPage] loadCharacters: received ${charactersData.length} characters from API`);

      if (!charactersData.length) {
        console.warn('[MainPage] No characters received from API');
        setCharacters([]);
        setCachedRawCharacters([]);
        return;
      }

      setCachedRawCharacters(charactersData);

      // КРИТИЧЕСКИ ВАЖНО: Все персонажи показываются на главной странице независимо от наличия истории чата
      // История чата - это дополнительная информация, которая не влияет на отображение персонажей на главной странице
      // Персонажи с историей должны оставаться на главной странице так же, как и персонажи без истории
      const formattedCharacters: Character[] = charactersData
        .map((char: any, index: number) => {
        const rawName = char.name || char.display_name || `character-${index + 1}`;
        const displayName = char.display_name || char.name || rawName;
        const normalizedId = (char.id ?? rawName ?? index).toString();
        const mapKey = rawName.toLowerCase();

        return {
          id: normalizedId,
          name: displayName,
          description: char.description || char.character_appearance || 'No description available',
          avatar: displayName.charAt(0).toUpperCase(),
          photos: characterPhotos[mapKey] || [],
          tags: Array.isArray(char.tags) && char.tags.length
            ? char.tags
            : [char.user_id ? 'User Created' : 'System'],
          author: char.user_id ? 'User' : 'System',
          likes: Number(char.likes) || 0,
          views: Number(char.views) || 0,
            comments: Number(char.comments) || 0,
            is_nsfw: char.is_nsfw === true, // Явная проверка: только true считается NSFW
          raw: char // Сохраняем raw данные для доступа к user_id
        };
        })
        .filter((char: any) => {
          // Фильтруем персонажей ТОЛЬКО по режиму NSFW
          // НЕ фильтруем по наличию истории - все персонажи должны показываться независимо от истории
          // В режиме NSFW показываем только персонажей с is_nsfw === true
          // В режиме SAFE показываем персонажей с is_nsfw !== true (включая null/undefined)
          const isNsfw = char.is_nsfw === true;
          const shouldShow = contentMode === 'nsfw' ? isNsfw : !isNsfw;
          
          return shouldShow;
      });

      console.log(`[MainPage] Formatted ${formattedCharacters.length} characters (contentMode: ${contentMode})`);
      setCharacters(formattedCharacters);
      
      // Загружаем рейтинги для всех персонажей
      await loadCharacterRatings(formattedCharacters);
    } catch (error) {
      
      // Не показываем моковых персонажей - показываем пустой список
      setCharacters([]);
      setCachedRawCharacters([]);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  // Загрузка рейтингов персонажей
  const loadCharacterRatings = async (charactersList: Character[]) => {
    const ratings: {[key: number]: {likes: number, dislikes: number}} = {};
    
    for (const char of charactersList) {
      const characterId = typeof char.id === 'number' ? char.id : parseInt(char.id, 10);
      if (isNaN(characterId)) continue;
      
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.GET_CHARACTER_RATINGS(characterId)}`, {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          ratings[characterId] = {
            likes: data.likes || 0,
            dislikes: data.dislikes || 0
          };
        }
      } catch (error) {
        
      }
    }
    
    setCharacterRatings(ratings);
  };

  // Load character photos
  const loadCharacterPhotos = async () => {
    try {
      const photosMap: {[key: string]: string[]} = {};
      
      // Загружаем данные персонажей - ГЛАВНЫЙ источник фото
      const charactersData = await fetchCharactersFromApi();

      if (charactersData.length) {
        for (const char of charactersData) {
          if (!char) {
            continue;
          }

          const canonicalName = (char.name || char.display_name);
          if (!canonicalName) {
            continue;
          }

          const normalizedKey = canonicalName.toLowerCase();
          let parsedPhotos: any[] = [];

          // Обрабатываем main_photos из БД (основной источник)
          if (char.main_photos) {
            if (Array.isArray(char.main_photos)) {
              parsedPhotos = char.main_photos;
            } else if (typeof char.main_photos === 'string' && char.main_photos.trim()) {
              try {
                parsedPhotos = JSON.parse(char.main_photos);
              } catch (e) {
                
                parsedPhotos = [];
              }
            }
          }

          const photoUrls = parsedPhotos
            .map((photo: any) => {
              if (!photo) {
                return null;
              }

              let photoUrl = null;

              // Если это объект с url полем, используем url
              if (typeof photo === 'object' && photo.url) {
                photoUrl = photo.url;
              }
              // Если это строка и начинается с http, это полный URL
              else if (typeof photo === 'string') {
                photoUrl = photo.startsWith('http')
                  ? photo
                  : `/static/photos/${normalizedKey}/${photo}.png`;
              }

              // Конвертируем старые Yandex.Cloud URL в прокси URL
              if (photoUrl && photoUrl.includes('storage.yandexcloud.net/')) {
                if (photoUrl.includes('.storage.yandexcloud.net/')) {
                  // Формат: https://bucket-name.storage.yandexcloud.net/path/to/file
                  const objectKey = photoUrl.split('.storage.yandexcloud.net/')[1];
                  if (objectKey) {
                    photoUrl = `${API_CONFIG.BASE_URL}/media/${objectKey}`;
                  }
                } else {
                  // Формат: https://storage.yandexcloud.net/bucket-name/path/to/file
                  const parts = photoUrl.split('storage.yandexcloud.net/')[1];
                  if (parts) {
                    // Пропускаем bucket-name и берем остальное
                    const pathSegments = parts.split('/');
                    if (pathSegments.length > 1) {
                      const objectKey = pathSegments.slice(1).join('/');
                      photoUrl = `${API_CONFIG.BASE_URL}/media/${objectKey}`;
                    }
                  }
                }
              }

              return photoUrl;
            })
            .filter((url): url is string => Boolean(url));

          // Сохраняем фото для персонажа
          if (photoUrls.length > 0) {
            photosMap[normalizedKey] = photoUrls;
          }
        }
      }
      
      // Дополнительно пытаемся загрузить из API endpoint (fallback)
      try {
        const photosResponse = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/photos`);
        if (photosResponse.ok) {
          const apiPhotos = await photosResponse.json();
          for (const [key, photos] of Object.entries(apiPhotos)) {
            const normalizedKey = key.toLowerCase();
            if (Array.isArray(photos) && photos.length > 0) {
              // Добавляем только если нет фото из БД
              if (!photosMap[normalizedKey] || photosMap[normalizedKey].length === 0) {
                photosMap[normalizedKey] = photos as string[];
              }
            }
          }
        }
      } catch (apiError) {
        
      }
      
      // JSON файл как последний fallback
      try {
        const response = await fetch('/character-photos.json');
        if (response.ok) {
          const jsonPhotos = await response.json();
          for (const [key, photos] of Object.entries(jsonPhotos)) {
            const normalizedKey = key.toLowerCase();
            if (Array.isArray(photos) && photos.length > 0) {
              // Добавляем только если нет фото из других источников
              if (!photosMap[normalizedKey] || photosMap[normalizedKey].length === 0) {
                photosMap[normalizedKey] = photos as string[];
              }
            }
          }
        }
      } catch (jsonError) {
        
      }

      // Обновляем состояние с фото
      setCharacterPhotos(prev => ({ ...prev, ...photosMap }));
      
      setCharacters(prev => prev
        .map(char => {
          const key = char.name.toLowerCase();
          return {
            ...char,
            photos: photosMap[key] || char.photos || []
          };
        })
        .filter((char: any) => {
          // Фильтруем персонажей по режиму NSFW
          const isNsfw = char.is_nsfw === true; // Явная проверка: только true считается NSFW
          return contentMode === 'nsfw' ? isNsfw : !isNsfw;
        }));
    } catch (error) {
      
    }
  };

  // Автоматическое обновление фотографий каждые 30 секунд
  React.useEffect(() => {
    const loadData = async () => {
      // Всегда загружаем с принудительным обновлением при первой загрузке
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
    };
    
    loadData();
    
    const interval = setInterval(() => {
      loadCharacterPhotos();
    }, 30000); // Обновляем каждые 30 секунд

    // Слушаем события обновления фото персонажа и создания персонажа
    const handlePhotoUpdate = async () => {
      
      // Даем время бэкенду сохранить изменения и очистить кэш
      await new Promise(resolve => setTimeout(resolve, 500));
      // Принудительно перезагружаем данные, игнорируя кэш
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
    };
    
    const handleCharacterCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Даем время бэкенду сохранить персонажа и очистить кэш
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Принудительно перезагружаем персонажей из API, игнорируя кэш
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
      
    };
    
    window.addEventListener('character-photos-updated', handlePhotoUpdate);
    window.addEventListener('character-created', handleCharacterCreated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('character-photos-updated', handlePhotoUpdate);
      window.removeEventListener('character-created', handleCharacterCreated);
    };
  }, [contentMode]); // Перезагружаем при изменении режима

  // Проверка авторизации при загрузке
  React.useEffect(() => {
    // Проверяем токены в URL параметрах (после OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Сохраняем токены через authManager
      authManager.setTokens(accessToken, refreshToken);
      
      // Очищаем URL от токенов
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Проверяем авторизацию
      checkAuth();
    } else {
      // Обычная проверка авторизации
      checkAuth();
    }
    
    // Загружаем фотографии персонажей
    loadCharacterPhotos();
  }, []);

  // Загружаем список избранных персонажей
  const loadFavorites = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setFavoriteCharacterIds(new Set());
        return;
      }

      const response = await fetch(API_CONFIG.FAVORITES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const favorites = await response.json();
        // Извлекаем ID избранных персонажей
        const favoriteIds = new Set<number>(
          favorites.map((char: any) => {
            const id = typeof char.id === 'number' ? char.id : parseInt(char.id, 10);
            return isNaN(id) ? null : id;
          }).filter((id: number | null): id is number => id !== null)
        );
        setFavoriteCharacterIds(favoriteIds);
      } else {
        setFavoriteCharacterIds(new Set());
      }
    } catch (error) {
      
      setFavoriteCharacterIds(new Set());
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Нет токена - пользователь не авторизован
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData) {
          setIsAuthenticated(true);
          setUserCoins(userData.coins || 0);
          setUserInfo({
            username: userData.username || userData.email || 'Пользователь',
            coins: userData.coins || 0,
            is_admin: userData.is_admin || false,
            id: userData.id
          });
          // Загружаем избранные после успешной авторизации
          await loadFavorites();
        } else {
          
          setIsAuthenticated(false);
          setUserInfo(null);
          setFavoriteCharacterIds(new Set());
        }
      } else if (response.status === 401) {
        // Только при 401 (Unauthorized) пытаемся обновить токен
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch('/api/v1/auth/refresh/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (refreshResponse.ok) {
              const tokenData = await refreshResponse.json();
              authManager.setTokens(tokenData.access_token, tokenData.refresh_token);
              // Повторяем проверку авторизации с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {
            
          }
        }
        // Если refresh не удался, удаляем токены
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
      } else {
        // Для других ошибок (500, 502, и т.д.) не удаляем токены, только сбрасываем состояние
        
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
      }
    } catch (error) {
      // При сетевых ошибках не удаляем токены
      if (localStorage.getItem('authToken')) {
        
      }
      setIsAuthenticated(false);
      setUserInfo(null);
      setFavoriteCharacterIds(new Set());
    }
  };

  const handleCharacterClick = (character: Character) => {
    // Переходим к чату с выбранным персонажем
    
    if (onCharacterSelect) {
      onCharacterSelect(character);
    }
  };

  // Обработчик удаления персонажа (для админов и создателей персонажей)
  const handleDeleteCharacter = async (character: Character) => {
    const characterName = character.name || (character as any).raw?.name;
    if (!characterName) {
      
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        
        // Обновляем список персонажей
        await loadCharacters(true);
        // Отправляем событие для обновления других страниц
        window.dispatchEvent(new CustomEvent('character-deleted', {
          detail: { characterName }
        }));
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
        
        alert(`Ошибка удаления персонажа: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      
      alert('Ошибка при удалении персонажа. Попробуйте позже.');
    }
  };

  // Проверяем, может ли пользователь удалить персонажа (админ или создатель)
  const canDeleteCharacter = (character: Character): boolean => {
    if (!userInfo || !isAuthenticated) {
      return false;
    }
    
    // Админы могут удалять всех персонажей
    if (userInfo.is_admin === true) {
      return true;
    }
    
    // Создатели могут удалять только своих персонажей
    const characterUserId = (character as any).raw?.user_id || (character as any).user_id;
    const currentUserId = userInfo.id;
    
    // Проверяем совпадение ID (конвертируем в числа для надежности)
    if (characterUserId !== undefined && currentUserId !== undefined) {
      const charUserIdNum = Number(characterUserId);
      const currUserIdNum = Number(currentUserId);
      if (!isNaN(charUserIdNum) && !isNaN(currUserIdNum) && charUserIdNum === currUserIdNum) {
        return true;
      }
    }
    
    return false;
  };

  const handleCreateCharacter = () => {
    if (onCreateCharacter) {
      onCreateCharacter();
    }
  };

  const handleShop = () => {
    setIsShopModalOpen(true);
  };

  const handleLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleRegister = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    // Перезагружаем страницу для обновления состояния
    window.location.reload();
  };

  const handleAuthSuccess = (accessToken: string, refreshToken?: string) => {
    authManager.setTokens(accessToken, refreshToken);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    checkAuth(); // Обновляем информацию о пользователе
  };

  const handleBackFromPhotoGeneration = () => {
    setIsPhotoGenerationOpen(false);
    setCreatedCharacter(null);
  };

  const handleActivateSubscription = async (subscriptionType: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Must be logged in');

    const response = await fetch('/api/v1/subscription/activate/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription_type: subscriptionType
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Ошибка активации подписки');
    }

    // Обновляем статистику
    await checkAuth();
  };

  // Объединяем персонажей с их фотографиями и рейтингами
  const charactersWithPhotos = characters
    .map(character => {
      const characterId = typeof character.id === 'number' ? character.id : parseInt(character.id, 10);
      const rating = !isNaN(characterId) ? characterRatings[characterId] : null;
      
      return {
        ...character,
        photos: characterPhotos[character.name.toLowerCase()] || [],
        likes: rating ? rating.likes : character.likes || 0
      };
    })
    .sort((a, b) => {
      if (sortFilter === 'popular') {
        // Сортируем по количеству лайков (по убыванию)
        return (b.likes || 0) - (a.likes || 0);
      }
      // При фильтре 'all' оставляем исходный порядок
      return 0;
    });

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <ContentWrapper>
        <HeaderWrapper>
          <GlobalHeader 
            onShop={onShop || handleShop}
            onProfile={onProfile}
            onLogin={onLogin || handleLogin}
            onRegister={onRegister || handleRegister}
            onLogout={onLogout}
            onHome={onHome}
          />
        </HeaderWrapper>
      {showNSFWWarning && (
        <NSFWWarningModal
          onConfirm={() => {
            setShowNSFWWarning(false);
            if (pendingMode) {
              onContentModeChange?.(pendingMode);
              setPendingMode(null);
            }
          }}
          onCancel={() => {
            setShowNSFWWarning(false);
            setPendingMode(null);
          }}
        />
      )}

      <ContentArea>
      {isPhotoGenerationOpen && createdCharacter ? (
        <PhotoGenerationPage
          character={createdCharacter}
          onBackToMain={handleBackFromPhotoGeneration}
          onCreateCharacter={handleCreateCharacter}
          onShop={handleShop}
        />
      ) : (
        <>
          <CharactersGrid ref={charactersGridRef}>
                {isLoadingCharacters ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#a8a8a8' }}>
                    Loading characters...
                  </div>
                ) : (
                  <>
                    <CreateCharacterCardWrapper>
                      <motion.div
                        onClick={() => onCreateCharacter && onCreateCharacter()}
                        className="relative h-full w-full min-w-[200px] cursor-pointer rounded-lg overflow-hidden group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Фон DarkVeil как на странице магазина */}
                        <div className="absolute inset-0 rounded-lg overflow-hidden">
                          <DarkVeil speed={1.1} />
                        </div>
                        
                        {/* Glassmorphism слой поверх фона */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 rounded-lg transition-all duration-300 group-hover:border-white/30 group-hover:from-purple-500/30 group-hover:via-indigo-500/30 group-hover:to-purple-500/30" />
                        
                        {/* Контент */}
                        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-1 sm:gap-2 md:gap-4 p-2 sm:p-3 md:p-6">
                          {/* Анимированная иконка сердечка */}
                          <motion.div
                            className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/30 flex items-center justify-center drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                            animate={{
                              scale: [1, 1.08, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            <motion.div
                              className="text-white group-hover:text-red-500 transition-colors duration-300"
                              animate={{
                                opacity: [0.9, 1, 0.9]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <FiHeart className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                            </motion.div>
                          </motion.div>
                          
                          {/* Текст */}
                          <h3 className="text-xs sm:text-sm md:text-lg lg:text-2xl font-semibold text-white text-center leading-tight tracking-wide font-sans max-w-[140px] sm:max-w-[160px] md:max-w-[180px] px-1 sm:px-2">
                            Создай свою девушку
                          </h3>
                        </div>
                      </motion.div>
                    </CreateCharacterCardWrapper>
                    {charactersWithPhotos.map((character) => {
                    // Проверяем, находится ли персонаж в избранном
                    const characterId = typeof character.id === 'number' 
                      ? character.id 
                      : parseInt(character.id, 10);
                    const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                    
                    // Проверяем, может ли пользователь удалить персонажа
                    const canDelete = canDeleteCharacter(character);
                    const deleteHandler = canDelete ? handleDeleteCharacter : undefined;
                    
                    return (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        onClick={handleCharacterClick}
                        isAuthenticated={isAuthenticated}
                        onPhotoGeneration={onPhotoGeneration}
                        onPaidAlbum={onPaidAlbum}
                        showPromptButton={true}
                        isFavorite={isFavorite}
                        onFavoriteToggle={loadFavorites}
                        onDelete={deleteHandler}
                        userInfo={userInfo}
                        onNsfwToggle={async () => {
                          // Перезагружаем список персонажей после изменения NSFW статуса
                          await loadCharacters();
                        }}
                      />
                    );
                  })}
                  </>
                )}
              </CharactersGrid>
          
          <ShopModal
            isOpen={isShopModalOpen}
            onClose={() => setIsShopModalOpen(false)}
            isAuthenticated={isAuthenticated}
            onActivateSubscription={onPaymentMethod ? async (type: string) => {
              if (onPaymentMethod) {
                onPaymentMethod(type);
              }
            } : handleActivateSubscription}
          />
          
          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onAuthSuccess={handleAuthSuccess}
              mode={authModalMode}
            />
          )}
        </>
      )}
      </ContentArea>
      <FooterWrapper>
        <Footer />
      </FooterWrapper>
      </ContentWrapper>
    </MainContainer>
  );
};
