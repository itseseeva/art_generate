import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { authManager } from '../utils/auth';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { CharacterCard } from './CharacterCard';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import SplitText from './SplitText';
import { API_CONFIG } from '../config/api';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
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
  display: flex;
  flex-direction: column;
`;


const Header = styled.div`
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border.accent};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  cursor: pointer;
  transition: color ${theme.transition.fast};
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const PageTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  margin: 0;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.accent};
`;

const UserName = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const UserCoins = styled.span`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
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

const MainContent = styled.div`
  flex: 1;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const CharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0;
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  overflow-y: auto;
  align-content: start;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    margin-top: ${theme.spacing.md};
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: ${theme.fontSize.lg};
  color: ${theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
`;

const EmptyTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  margin-bottom: ${theme.spacing.md};
`;

const EmptyDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  margin-bottom: ${theme.spacing.xl};
`;

const CreateButton = styled.button`
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[];
  tags: string[];
  author: string;
  likes: number;
  dislikes?: number;
  views: number;
  comments: number;
}

interface EditCharactersPageProps {
  onBackToMain: () => void;
  onCreateCharacter: () => void;
  onShop: () => void;
  onEditCharacter: (character: Character) => void;
  onProfile?: () => void;
}

export const EditCharactersPage: React.FC<EditCharactersPageProps> = ({
  onBackToMain,
  onCreateCharacter,
  onShop,
  onEditCharacter,
  onProfile
}) => {
  useEffect(() => {
    window.history.pushState({ page: 'edit-characters' }, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page === 'edit-characters') {
        onBackToMain();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackToMain]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, is_admin?: boolean} | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());
  const [characterRatings, setCharacterRatings] = useState<{[key: number]: {likes: number, dislikes: number}}>({});

  // Загрузка фото персонажей
  const loadCharacterPhotos = async (userId: number, isAdmin: boolean = false) => {
    if (!userId) {
      return {};
    }

    try {
      // Используем force_refresh=true чтобы получить актуальный список после редактирования
      const charactersResponse = await authManager.fetchWithAuth(`/api/v1/characters/?force_refresh=true&_t=${Date.now()}`);
      
      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json();
        
        const photosMap: {[key: string]: string[]} = {};
        
        // Для админов загружаем всех персонажей, для обычных пользователей - только своих
        const myCharacters = isAdmin 
          ? charactersData 
          : charactersData.filter((char: any) => char.user_id === userId);
        
        for (const char of myCharacters) {
          
          if (!char.main_photos) {
            
            continue;
          }

          try {
            const rawValue = typeof char.main_photos === 'string'
              ? JSON.parse(char.main_photos)
              : char.main_photos;

            const normalized = Array.isArray(rawValue) ? rawValue : [];
            const photoUrls = normalized
              .map((entry: any) => {
                if (!entry) {
                  return null;
                }

                if (typeof entry === 'string') {
                  return entry;
                }

                if (typeof entry === 'object') {
                  return entry.url || entry.photo_url || null;
                }

                return null;
              })
              .filter((url): url is string => Boolean(url) && url.startsWith('http'));

            
            photosMap[char.name.toLowerCase()] = photoUrls;
          } catch (e) {
            
          }
        }
        
        
        setCharacterPhotos(photosMap);
        return photosMap;
      } else {
        
        return {};
      }
    } catch (error) {
      
      return {};
    }
  };

  // Загрузка персонажей пользователя
  const loadMyCharacters = async (userId: number, isAdmin: boolean = false) => {
    if (!userId) {
      return;
    }

    try {
      setIsLoading(true);
      const photosMap = await loadCharacterPhotos(userId, isAdmin); // Загружаем фото
      
      // Используем force_refresh=true чтобы получить актуальный список после редактирования
      const response = await authManager.fetchWithAuth(`/api/v1/characters/?force_refresh=true&_t=${Date.now()}`);

      if (response.ok) {
        const charactersData = await response.json();
        // Для админов загружаем всех персонажей, для обычных пользователей - только своих
        const myCharacters = isAdmin 
          ? charactersData 
          : charactersData.filter((char: any) => char.user_id === userId);
        
        const formattedCharacters: Character[] = myCharacters.map((char: any) => {
          const isOwnCharacter = char.user_id === userId;
          return {
            id: char.id ? char.id.toString() : char.name, // Используем id если есть, иначе имя как fallback
            name: char.name,
            description: char.character_appearance || 'No description available',
            avatar: char.name.charAt(0).toUpperCase(),
            photos: photosMap[char.name.toLowerCase()] || [],
            tags: isOwnCharacter ? ['My Character'] : ['Character'],
            author: isOwnCharacter ? 'Me' : (char.author || 'Unknown'),
            likes: char.likes || 0,
            dislikes: char.dislikes || 0,
            views: char.views || 0,
            comments: char.comments || 0
          };
        });
        
        // Загружаем рейтинги для всех персонажей
        await loadCharacterRatings(formattedCharacters);
        
        setCharacters(formattedCharacters);
        setIsAuthenticated(true);
      } else {
        
        setIsAuthenticated(false);
      }
    } catch (error) {
      
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
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
        // Игнорируем ошибки
      }
    }
    
    setCharacterRatings(ratings);
  };

  // Загрузка избранных персонажей
  const loadFavorites = async () => {
    try {
      const token = authManager.getToken();
      if (!token) {
        setFavoriteCharacterIds(new Set());
        return;
      }

      const response = await authManager.fetchWithAuth(API_CONFIG.FAVORITES);
      
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

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const { isAuthenticated, userInfo } = await authManager.checkAuth();
      
      setIsAuthenticated(isAuthenticated);
      if (isAuthenticated && userInfo) {
        setCurrentUserId(userInfo.id);
        const isAdmin = userInfo.is_admin === true;
        setUserInfo({
          username: userInfo.email,
          coins: userInfo.coins,
          is_admin: isAdmin
        });
        // Загружаем избранные после успешной авторизации
        await loadFavorites();
        return userInfo.id as number;
      }
    } catch (error) {
      
      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }

    setCurrentUserId(null);
    return null;
  };

  useEffect(() => {
    const bootstrap = async () => {
      const userId = await checkAuth();
      if (!userId) {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  // Показываем модалку ТОЛЬКО один раз после проверки
  useEffect(() => {
    if (authCheckComplete && !isAuthenticated && !isAuthModalOpen) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
    }
  }, [authCheckComplete]);

  useEffect(() => {
    if (!currentUserId || !userInfo) {
      return;
    }
    const isAdmin = userInfo.is_admin === true;
    loadMyCharacters(currentUserId, isAdmin);
  }, [currentUserId, userInfo]);

  const handleLogout = async () => {
    try {
      await authManager.logout();
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setCharacters([]);
      setCharacterPhotos({});
      setIsLoading(false);
      window.location.href = '/';
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
  };

  const handleCharacterClick = (character: Character) => {
    onEditCharacter(character);
  };

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <ContentWrapper>
      <div className="content-area vertical">
        <GlobalHeader 
          onShop={onShop}
          onProfile={onProfile}
          onLogin={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthMode('register');
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onBalance={() => alert('Баланс пользователя')}
        />
        
        <MainContent>
          {isLoading ? (
            <LoadingSpinner>Загрузка персонажей...</LoadingSpinner>
          ) : characters.length === 0 ? (
            <EmptyState>
              <EmptyTitle>{userInfo?.is_admin ? 'Персонажей не найдено' : 'У вас пока нет персонажей'}</EmptyTitle>
              <EmptyDescription>
                {userInfo?.is_admin 
                  ? 'В системе пока нет персонажей для редактирования'
                  : 'Создайте своего первого персонажа, чтобы начать редактирование'
                }
              </EmptyDescription>
              {!userInfo?.is_admin && (
                <CreateButton onClick={onCreateCharacter}>
                  Создать персонажа
                </CreateButton>
              )}
            </EmptyState>
          ) : (
            <CharactersGrid>
              {characters.map((character) => {
                // Добавляем фото к персонажу
                const characterWithPhotos = {
                  ...character,
                  photos: characterPhotos[character.name.toLowerCase()] || []
                };
                
                // Проверяем, находится ли персонаж в избранном
                const characterId = typeof character.id === 'number' 
                  ? character.id 
                  : parseInt(character.id, 10);
                const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                const rating = !isNaN(characterId) ? characterRatings[characterId] : null;
                
                return (
                <CharacterCard
                  key={character.id}
                    character={{
                      ...characterWithPhotos,
                      likes: rating ? rating.likes : characterWithPhotos.likes || 0,
                      dislikes: rating ? rating.dislikes : characterWithPhotos.dislikes || 0
                    }}
                  onClick={handleCharacterClick}
                  showEditButton={false}
                  isFavorite={isFavorite}
                  onFavoriteToggle={loadFavorites}
                />
                );
              })}
            </CharactersGrid>
          )}
        </MainContent>
      </div>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Если закрыл без входа - на главную
            if (!isAuthenticated) {
              onBackToMain();
            }
          }}
          onAuthSuccess={({ accessToken, refreshToken }) => {
            authManager.setTokens(accessToken, refreshToken);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Диспатчим событие для обновления App.tsx
            window.dispatchEvent(new Event('auth-success'));
            // Перебрасываем на главную после входа
            onBackToMain();
          }}
        />
      )}
      </ContentWrapper>
    </MainContainer>
  );
};
