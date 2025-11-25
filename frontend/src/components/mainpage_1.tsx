import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { CompactSidebar } from './CompactSidebar';
import { CharacterCard } from './CharacterCard';
import { ShopModal } from './ShopModal';
import { AuthModal } from './AuthModal';
import { PhotoGenerationPage } from './PhotoGenerationPage';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent; /* Fully transparent */
  overflow: hidden;
`;

const Header = styled.div`
  background: rgba(102, 126, 234, 0.1); /* Very transparent */
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border.accent};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const UserName = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const UserCoins = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const PlanBadge = styled.button`
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

const AuthButton = styled.button`
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
  margin-left: ${theme.spacing.sm};
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
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  align-content: start;
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
}

export const MainPage: React.FC<MainPageProps> = ({ onCharacterSelect, onMyCharacters, onCreateCharacter }) => {
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPhotoGenerationOpen, setIsPhotoGenerationOpen] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number} | null>(null);
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);

  // Load characters from API
  const loadCharacters = async () => {
    try {
      setIsLoadingCharacters(true);
      const response = await fetch('/api/v1/characters/');
      if (response.ok) {
        const charactersData = await response.json();
        // Преобразуем данные из API в формат Character
        const formattedCharacters: Character[] = charactersData.map((char: any) => ({
          id: char.id.toString(),
          name: char.name,
          description: char.character_appearance || 'No description available',
          avatar: char.name.charAt(0).toUpperCase(),
          photos: [], // Будет обновлено после загрузки фото
          tags: ['User Created'],
          author: char.user_id ? 'User' : 'System',
          likes: 0,
          views: 0,
          comments: 0
        }));
        setCharacters(formattedCharacters);
      } else {
        console.error('Failed to load characters:', response.status);
        // Fallback to mock characters if API fails
        setCharacters(mockCharacters);
      }
    } catch (error) {
      console.error('Error loading characters:', error);
      // Fallback to mock characters if API fails
      setCharacters(mockCharacters);
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
      
      // Загружаем главные фото персонажей из API
      const charactersResponse = await fetch('/api/v1/characters/');
      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json();
        console.log('Characters data from API:', charactersData);
        const photosMap: {[key: string]: string[]} = {};
        
        for (const char of charactersData) {
          console.log(`Character ${char.name}:`, char);
          if (char.main_photos) {
            try {
              const mainPhotoIds = JSON.parse(char.main_photos);
              console.log(`Main photo IDs for ${char.name}:`, mainPhotoIds);
              const photoUrls = mainPhotoIds.map((id: string) => 
                `/static/photos/${char.name.toLowerCase()}/${id}.png`
              );
              console.log(`Photo URLs for ${char.name}:`, photoUrls);
              photosMap[char.name.toLowerCase()] = photoUrls;
            } catch (e) {
              console.error('Error parsing main_photos for character:', char.name, e);
            }
          } else {
            console.log(`No main_photos for character: ${char.name}`);
          }
        }
        
        console.log('Final photos map:', photosMap);
        
        // Объединяем с существующими фото
        setCharacterPhotos(prev => ({ ...prev, ...photosMap }));
        
        // Обновляем фото в персонажах
        setCharacters(prev => {
          const updated = prev.map(char => ({
            ...char,
            photos: photosMap[char.name.toLowerCase()] || char.photos
          }));
          console.log('Updated characters with photos:', updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки фотографий персонажей:', error);
    }
  };

  // Автоматическое обновление фотографий каждые 30 секунд
  React.useEffect(() => {
    const loadData = async () => {
      await loadCharacterPhotos(); // Сначала загружаем фото
      await loadCharacters(); // Потом персонажей
    };
    
    loadData();
    
    const interval = setInterval(() => {
      loadCharacterPhotos();
    }, 30000); // Обновляем каждые 30 секунд

    return () => clearInterval(interval);
  }, []);

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

      const response = await fetch('/auth/me/', {
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
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('authToken');
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
      {isPhotoGenerationOpen && createdCharacter ? (
        <PhotoGenerationPage
          character={createdCharacter}
          onBackToMain={handleBackFromPhotoGeneration}
          onCreateCharacter={handleCreateCharacter}
          onShop={handleShop}
        />
      ) : (
        <>
          <CompactSidebar 
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onMyCharacters={onMyCharacters || (() => {})}
          />
          
          <ContentArea>
            <Header>
              <div></div>
              
              <RightSection>
                {isAuthenticated && userInfo && (
                  <UserInfo>
                