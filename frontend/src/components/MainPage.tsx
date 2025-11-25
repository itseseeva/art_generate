import React, { useState } from 'react';
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
  contentMode = 'safe'
}) => {
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isPhotoGenerationOpen, setIsPhotoGenerationOpen] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number} | null>(null);
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  const [cachedRawCharacters, setCachedRawCharacters] = useState<any[]>([]);

  const fetchCharactersFromApi = async (forceRefresh: boolean = false): Promise<any[]> => {
    const endpoints = [
      API_CONFIG.CHARACTERS, // Используем прокси через Vite
      '/api/v1/characters/', // Правильный endpoint
      '/api/characters/' // Fallback endpoint
    ];

    for (const endpoint of endpoints) {
      try {
        // Добавляем параметр для принудительного обновления (обход кэша)
        const url = forceRefresh 
          ? `${endpoint}?t=${Date.now()}&skip=0&limit=1000`
          : `${endpoint}?skip=0&limit=1000`;
        
        const response = await fetch(url, {
          cache: forceRefresh ? 'no-cache' : 'default',
          headers: forceRefresh ? {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          } : {}
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
      setIsLoadingCharacters(true);
      const charactersData = await fetchCharactersFromApi(forceRefresh);

      if (!charactersData.length) {
        console.error('Failed to load characters: пустой ответ');
        setCharacters(mockCharacters);
        setCachedRawCharacters([]);
        return;
      }

      setCachedRawCharacters(charactersData);

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
            is_nsfw: char.is_nsfw === true // Явная проверка: только true считается NSFW
        };
        })
        .filter((char: any) => {
          // Фильтруем персонажей по режиму NSFW
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
      // Fallback to mock characters if API fails
      setCharacters(mockCharacters);
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

  // Автоматическое обновление фотографий каждые 30 секунд
  React.useEffect(() => {
    const loadData = async () => {
      await loadCharacters();
      await loadCharacterPhotos();
    };
    
    loadData();
    
    const interval = setInterval(() => {
      loadCharacterPhotos();
    }, 30000); // Обновляем каждые 30 секунд

    // Слушаем события обновления фото персонажа и создания персонажа
    const handlePhotoUpdate = () => {
      console.log('Получено событие обновления фото персонажа, перезагружаем...');
      loadData();
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

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Нет токена - пользователь не авторизован
        setIsAuthenticated(false);
        setUserInfo(null);
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        setUserCoins(userData.coins || 0);
        setUserInfo({
          username: userData.username || userData.email || 'Пользователь',
          coins: userData.coins || 0
        });
      } else {
        // Токен недействителен
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      // Только логируем ошибку, не показываем в консоли для неавторизованных пользователей
      if (localStorage.getItem('authToken')) {
        console.error('Ошибка проверки авторизации:', error);
      }
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  };

  const handleCharacterClick = (character: Character) => {
    // Переходим к чату с выбранным персонажем
    console.log('Selected character:', character);
    if (onCharacterSelect) {
      onCharacterSelect(character);
    }
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

  const handleAuthSuccess = (token: string) => {
    localStorage.setItem('authToken', token);
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
      {isPhotoGenerationOpen && createdCharacter ? (
        <PhotoGenerationPage
          character={createdCharacter}
          onBackToMain={handleBackFromPhotoGeneration}
          onCreateCharacter={handleCreateCharacter}
          onShop={handleShop}
        />
      ) : (
        <>
              <CharactersGrid>
                {isLoadingCharacters ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#a8a8a8' }}>
                    Loading characters...
                  </div>
                ) : (
                  charactersWithPhotos.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onClick={handleCharacterClick}
                      isAuthenticated={isAuthenticated}
                      onPhotoGeneration={onPhotoGeneration}
                      onPaidAlbum={onPaidAlbum}
                      showPromptButton={true}
                    />
                  ))
                )}
              </CharactersGrid>
          
          <ShopModal
            isOpen={isShopModalOpen}
            onClose={() => setIsShopModalOpen(false)}
            isAuthenticated={isAuthenticated}
            onActivateSubscription={handleActivateSubscription}
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
