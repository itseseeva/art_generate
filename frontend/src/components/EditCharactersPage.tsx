import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { CharacterCard } from './CharacterCard';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import SplitText from './SplitText';
import { authManager } from '../utils/auth';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
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
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const CharactersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  align-content: start;
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
  const [userInfo, setUserInfo] = useState<{username: string, coins: number} | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});

  // Загрузка фото персонажей
  const loadCharacterPhotos = async (userId: number) => {
    if (!userId) {
      return {};
    }

    try {
      const charactersResponse = await authManager.fetchWithAuth('/api/v1/characters/');
      
      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json();
        console.log('Characters data from API:', charactersData);
        const photosMap: {[key: string]: string[]} = {};
        
        // Фильтруем только персонажей текущего пользователя
        const myCharacters = charactersData.filter((char: any) => char.user_id === userId);
        
        for (const char of myCharacters) {
          console.log(`Character ${char.name}:`, char);
          if (!char.main_photos) {
            console.log(`No main_photos for character: ${char.name}`);
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

            console.log(`Photo URLs for ${char.name}:`, photoUrls);
            photosMap[char.name.toLowerCase()] = photoUrls;
          } catch (e) {
            console.error('Error parsing main_photos for character:', char.name, e);
          }
        }
        
        console.log('Final photos map:', photosMap);
        setCharacterPhotos(photosMap);
        return photosMap;
      } else {
        console.error('Failed to load characters');
        return {};
      }
    } catch (error) {
      console.error('Ошибка загрузки фотографий персонажей:', error);
      return {};
    }
  };

  // Загрузка персонажей пользователя
  const loadMyCharacters = async (userId: number) => {
    if (!userId) {
      return;
    }

    try {
      setIsLoading(true);
      const photosMap = await loadCharacterPhotos(userId); // Загружаем фото
      
      const response = await authManager.fetchWithAuth('/api/v1/characters/');

      if (response.ok) {
        const charactersData = await response.json();
        // Фильтруем только персонажей текущего пользователя
        const myCharacters = charactersData.filter((char: any) => char.user_id === userId);
        
        const formattedCharacters: Character[] = myCharacters.map((char: any) => ({
          id: char.id.toString(),
          name: char.name,
          description: char.character_appearance || 'No description available',
          avatar: char.name.charAt(0).toUpperCase(),
          photos: photosMap[char.name.toLowerCase()] || [],
          tags: ['My Character'],
          author: 'Me',
          likes: 0,
          views: 0,
          comments: 0
        }));
        
        setCharacters(formattedCharacters);
        setIsAuthenticated(true);
      } else {
        console.error('Failed to load characters:', response.status);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading characters:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const { isAuthenticated, userInfo } = await authManager.checkAuth();
      
      setIsAuthenticated(isAuthenticated);
      if (isAuthenticated && userInfo) {
        setCurrentUserId(userInfo.id);
        setUserInfo({
          username: userInfo.email,
          coins: userInfo.coins
        });
        return userInfo.id as number;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
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

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    loadMyCharacters(currentUserId);
  }, [currentUserId]);

  const handleLogout = () => {
    authManager.clearTokens();
    setIsAuthenticated(false);
    setCurrentUserId(null);
    setCharacters([]);
    setCharacterPhotos({});
    setIsLoading(false);
  };

  const handleCharacterClick = (character: Character) => {
    onEditCharacter(character);
  };

  return (
    <MainContainer>
      <div className="content-area vertical">
        <GlobalHeader 
          onShop={onShop}
          onLogin={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthMode('register');
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onProfile={onProfile}
          onBalance={() => alert('Баланс пользователя')}
          leftContent={
            <>
              <BackButton onClick={onBackToMain}>← Назад</BackButton>
              <PageTitle>Редактирование персонажей</PageTitle>
            </>
          }
        />
        
        <MainContent>
          {isLoading ? (
            <LoadingSpinner>Загрузка персонажей...</LoadingSpinner>
          ) : characters.length === 0 ? (
            <EmptyState>
              <EmptyTitle>У вас пока нет персонажей</EmptyTitle>
              <EmptyDescription>
                Создайте своего первого персонажа, чтобы начать редактирование
              </EmptyDescription>
              <CreateButton onClick={onCreateCharacter}>
                Создать персонажа
              </CreateButton>
            </EmptyState>
          ) : (
            <CharactersGrid>
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onClick={handleCharacterClick}
                  showEditButton={false} // Не показываем кнопки редактирования, так как клик по карточке уже ведет к редактированию
                />
              ))}
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
          }}
          onAuthSuccess={({ accessToken, refreshToken }) => {
            authManager.setTokens(accessToken, refreshToken);
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            checkAuth();
          }}
        />
      )}
    </MainContainer>
  );
};
