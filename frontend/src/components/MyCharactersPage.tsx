import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import { AuthModal } from './AuthModal';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
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

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: ${theme.colors.text.secondary};
`;

const EmptyTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  margin-bottom: ${theme.spacing.md};
`;

const EmptyDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  margin-bottom: ${theme.spacing.lg};
`;

const CreateButton = styled.button`
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.button};
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

interface MyCharactersPageProps {
  onBackToMain: () => void;
  onCreateCharacter: () => void;
  onShop?: () => void;
  onEditCharacters?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
  onCharacterSelect: (character: Character) => void;
}

export const MyCharactersPage: React.FC<MyCharactersPageProps> = ({
  onBackToMain,
  onCreateCharacter,
  onShop,
  onPhotoGeneration,
  onPaidAlbum,
  onCharacterSelect
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());

  // Загрузка персонажей пользователя
  const loadMyCharacters = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // Сначала получаем ID текущего пользователя
      const userResponse = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        setIsAuthenticated(false);
        return;
      }

      const userData = await userResponse.json();
      const currentUserId = userData.id;

      const response = await fetch('/api/v1/characters/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const charactersData = await response.json();
        // Фильтруем только персонажей текущего пользователя по его ID
        const myCharacters = charactersData.filter((char: any) => char.user_id === currentUserId);
        
        // Загружаем фото из main_photos (как на главной странице)
        const photosMap: Record<string, string[]> = {};
        
        for (const char of myCharacters) {
          if (!char || !char.main_photos) {
            continue;
          }

          const canonicalName = char.name || char.display_name;
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
        
        const formattedCharacters: Character[] = myCharacters.map((char: any) => {
          const normalizedKey = (char.name || char.display_name || '').toLowerCase();
          return {
          id: char.id.toString(),
            name: char.name || char.display_name,
          description: char.character_appearance || 'No description available',
            avatar: (char.name || char.display_name || '').charAt(0).toUpperCase(),
            photos: photosMap[normalizedKey] || [],
          tags: ['My Character'],
          author: 'Me',
          likes: 0,
          views: 0,
          comments: 0
          };
        });
        
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

  // Загрузка избранных персонажей
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

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUserInfo({
          username: userData.email,
          coins: userData.coins
        });
        setIsAuthenticated(true);
        // Загружаем избранные после успешной авторизации
        await loadFavorites();
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }
  };

  // Обработчики
  const handleCardClick = (character: Character) => {
    onCharacterSelect(character);
  };

  const handleLogout = () => {
    // Удаляем токен из localStorage
    localStorage.removeItem('authToken');
    // Перезагружаем страницу для обновления состояния
    window.location.reload();
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    const initPage = async () => {
      await checkAuth();
      
      // Загружаем персонажей если есть токен
      const token = localStorage.getItem('authToken');
      if (token) {
        await loadMyCharacters();
      }
    };
    
    initPage();
  }, []);

  // Показываем модалку ТОЛЬКО один раз после проверки
  useEffect(() => {
    if (authCheckComplete && !isAuthenticated && !isAuthModalOpen) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
    }
  }, [authCheckComplete]);

  if (!isAuthenticated) {
    return (
      <MainContainer>
        <CharactersGrid>
              <EmptyState>
                <EmptyTitle>Необходима авторизация</EmptyTitle>
                <EmptyDescription>
                  Войдите в систему, чтобы просматривать и редактировать своих персонажей
                </EmptyDescription>
              </EmptyState>
        </CharactersGrid>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
        <CharactersGrid>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#a8a8a8' }}>
              Загрузка персонажей...
            </div>
          ) : characters.length === 0 ? (
            <EmptyState>
              <EmptyTitle>У вас пока нет персонажей</EmptyTitle>
              <EmptyDescription>
                Создайте своего первого персонажа, чтобы начать общение
              </EmptyDescription>
              <CreateButton onClick={onCreateCharacter}>
                Создать персонажа
              </CreateButton>
            </EmptyState>
          ) : (
            characters.map((character) => {
              // Проверяем, находится ли персонаж в избранном
              const characterId = typeof character.id === 'number' 
                ? character.id 
                : parseInt(character.id, 10);
              const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
              
              return (
                <CharacterCard
                  key={character.id}
                  character={character}
                onClick={handleCardClick}
                isAuthenticated={isAuthenticated}
                onPhotoGeneration={onPhotoGeneration}
                onPaidAlbum={onPaidAlbum}
                  isFavorite={isFavorite}
                  onFavoriteToggle={loadFavorites}
                />
              );
            })
          )}
        </CharactersGrid>

        {/* Модальное окно авторизации */}
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Если закрыл без входа - на главную
            if (!isAuthenticated) {
              onBackToMain();
            }
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Диспатчим событие для обновления App.tsx
            window.dispatchEvent(new Event('auth-success'));
            // Перебрасываем на главную после входа
            onBackToMain();
          }}
          />
        )}
    </MainContainer>
  );
};
