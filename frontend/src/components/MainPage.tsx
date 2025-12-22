import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { ShopModal } from './ShopModal';
import { AuthModal } from './AuthModal';
import { PhotoGenerationPage } from './PhotoGenerationPage';
import { API_CONFIG } from '../config/api';
import '../styles/ContentArea.css';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
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

const HeaderLinks = styled.div<{ $isVisible: boolean }>`
  display: ${props => props.$isVisible ? 'flex' : 'none'};
  gap: 1.5rem;
  padding: 1rem 2rem;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  transition: all 0.3s ease-in-out;
`;

const HeaderLink = styled.a`
  color: ${theme.colors.text.secondary};
  text-decoration: none;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  transition: color ${theme.transition.fast};
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.sm};
  align-content: start;
  width: 100%;
  height: 100%;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  contentMode = 'safe'
}) => {
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const charactersGridRef = useRef<HTMLDivElement>(null);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());

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
          console.warn(`Не удалось загрузить персонажей с ${endpoint}: ${response.status}`);
          continue;
        }
        const payload = await response.json();
        console.log(`Загружено персонажей с ${endpoint}:`, Array.isArray(payload) ? payload.length : payload?.characters?.length || 0);
        
        if (Array.isArray(payload)) {
          return payload;
        }
        if (payload && Array.isArray(payload.characters)) {
          return payload.characters;
        }
      } catch (error) {
        console.error(`Ошибка запроса персонажей (${endpoint}):`, error);
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

      if (!charactersData.length) {
        console.log('Нет персонажей в базе данных');
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
          console.log(`Character ${char.name}: is_nsfw=${char.is_nsfw}, contentMode=${contentMode}, shouldShow=${shouldShow}`);
          return shouldShow;
      });

      setCharacters(formattedCharacters);
    } catch (error) {
      console.error('Error loading characters:', error);
      // Не показываем моковых персонажей - показываем пустой список
      setCharacters([]);
      setCachedRawCharacters([]);
    } finally {
      setIsLoadingCharacters(false);
    }
  };

  // Load character photos
  const loadCharacterPhotos = async () => {
    try {
      // Загружаем фотографии из JSON файла как fallback
      const response = await fetch('/character-photos.json');
      if (response.ok) {
        const photos = await response.json();
        setCharacterPhotos(photos);
      }
      
      // Всегда загружаем свежие данные для получения актуальных фото
      const charactersData = await fetchCharactersFromApi();

      if (!charactersData.length) {
        console.warn('Не удалось загрузить фотографии: нет данных персонажей');
        return;
      }

        const photosMap: {[key: string]: string[]} = {};
        
        for (const char of charactersData) {
        if (!char || !char.main_photos) {
          continue;
        }

        const canonicalName = (char.name || char.display_name);
        if (!canonicalName) {
          continue;
        }

        let parsedPhotos: any[] = [];

        if (Array.isArray(char.main_photos)) {
          parsedPhotos = char.main_photos;
        } else if (typeof char.main_photos === 'string') {
          try {
            parsedPhotos = JSON.parse(char.main_photos);
            } catch (e) {
            console.error('Error parsing main_photos for character:', canonicalName, e);
            parsedPhotos = [];
            }
          } else {
          parsedPhotos = [char.main_photos];
        }

        const normalizedKey = canonicalName.toLowerCase();
        const photoUrls = parsedPhotos
          .map((photo: any) => {
            if (!photo) {
              return null;
            }

            if (typeof photo === 'string') {
              return photo.startsWith('http')
                ? photo
                : `/static/photos/${normalizedKey}/${photo}.png`;
          }

            if (photo.url) {
              return photo.url;
            }

            if (photo.id) {
              return `/static/photos/${normalizedKey}/${photo.id}.png`;
            }

            return null;
          })
          .filter((url): url is string => Boolean(url));

        if (photoUrls.length) {
          photosMap[normalizedKey] = photoUrls;
        }
      }

      if (!Object.keys(photosMap).length) {
        return;
      }

        setCharacterPhotos(prev => ({ ...prev, ...photosMap }));
        
      setCharacters(prev => prev
        .map(char => {
        const key = char.name.toLowerCase();
        return {
            ...char,
          photos: photosMap[key] || char.photos
        };
        })
        .filter((char: any) => {
          // Фильтруем персонажей по режиму NSFW
          const isNsfw = char.is_nsfw === true; // Явная проверка: только true считается NSFW
          return contentMode === 'nsfw' ? isNsfw : !isNsfw;
          }));
    } catch (error) {
      console.error('Ошибка загрузки фотографий персонажей:', error);
    }
  };

  // Отслеживание скролла для скрытия/показа панели
  useEffect(() => {
    const handleScroll = () => {
      const charactersGrid = charactersGridRef.current;
      if (!charactersGrid) return;
      
      const currentScrollY = charactersGrid.scrollTop;
      
      // ЕДИНСТВЕННОЕ условие для показа панели - доскроллили до самого верха (в пределах 10px)
      if (currentScrollY <= 10) {
        setIsHeaderVisible(true);
      } 
      // Если скроллим вниз и прошли больше 100px - скрываем панель
      else if (currentScrollY > 100) {
        setIsHeaderVisible(false);
      }
      // Во всех остальных случаях (скроллим вверх, но не дошли до верха, или скроллим вниз, но еще не прошли 100px) - НЕ меняем состояние
      
      lastScrollY.current = currentScrollY;
    };

    const charactersGrid = charactersGridRef.current;
    if (charactersGrid) {
      // Проверяем начальное состояние
      const initialScrollY = charactersGrid.scrollTop;
      if (initialScrollY <= 10) {
        setIsHeaderVisible(true);
      } else {
        setIsHeaderVisible(false);
      }
      lastScrollY.current = initialScrollY;
      
      charactersGrid.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        charactersGrid.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

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
      console.log('Получено событие обновления фото персонажа, перезагружаем...');
      // Даем время бэкенду сохранить изменения и очистить кэш
      await new Promise(resolve => setTimeout(resolve, 500));
      // Принудительно перезагружаем данные, игнорируя кэш
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
    };
    
    const handleCharacterCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Получено событие создания персонажа, перезагружаем...', customEvent?.detail);
      // Даем время бэкенду сохранить персонажа и очистить кэш
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Принудительно перезагружаем персонажей из API, игнорируя кэш
      await loadCharacters(true); // forceRefresh = true
      await loadCharacterPhotos();
      console.log('Персонажи перезагружены после создания');
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
      // Сохраняем токены в localStorage
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
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
      console.error('Error loading favorites:', error);
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
          console.error('Auth check returned empty data');
          setIsAuthenticated(false);
          setUserInfo(null);
          setFavoriteCharacterIds(new Set());
        }
      } else {
        // Токен недействителен
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
        setFavoriteCharacterIds(new Set());
      }
    } catch (error) {
      // Только логируем ошибку, не показываем в консоли для неавторизованных пользователей
      if (localStorage.getItem('authToken')) {
        console.error('Ошибка проверки авторизации:', error);
      }
      setIsAuthenticated(false);
      setUserInfo(null);
      setFavoriteCharacterIds(new Set());
    }
  };

  const handleCharacterClick = (character: Character) => {
    // Переходим к чату с выбранным персонажем
    console.log('Selected character:', character);
    if (onCharacterSelect) {
      onCharacterSelect(character);
    }
  };

  // Обработчик удаления персонажа (для админов и создателей персонажей)
  const handleDeleteCharacter = async (character: Character) => {
    const characterName = character.name || (character as any).raw?.name;
    if (!characterName) {
      console.error('[MAIN] Не удалось определить имя персонажа для удаления');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('[MAIN] Нет токена для удаления персонажа');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/v1/characters/${encodeURIComponent(characterName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('[MAIN] Персонаж успешно удален:', characterName);
        // Обновляем список персонажей
        await loadCharacters(true);
        // Отправляем событие для обновления других страниц
        window.dispatchEvent(new CustomEvent('character-deleted', {
          detail: { characterName }
        }));
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
        console.error('[MAIN] Ошибка удаления персонажа:', errorData);
        alert(`Ошибка удаления персонажа: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('[MAIN] Ошибка при удалении персонажа:', error);
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
    localStorage.setItem('authToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
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

  // Объединяем персонажей с их фотографиями
  const charactersWithPhotos = characters.map(character => ({
    ...character,
    photos: characterPhotos[character.name.toLowerCase()] || []
  }));

  return (
    <MainContainer>
      <ContentArea>
      <HeaderLinks $isVisible={isHeaderVisible}>
        <HeaderLink href="/how-it-works">Как это работает</HeaderLink>
        <HeaderLink href="/about">О сервисе</HeaderLink>
        <HeaderLink href="/tariffs">Тарифы</HeaderLink>
        <HeaderLink href="/legal">Оферта / Реквизиты</HeaderLink>
      </HeaderLinks>
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
                  charactersWithPhotos.map((character) => {
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
                      />
                    );
                  })
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
    </MainContainer>
  );
};
