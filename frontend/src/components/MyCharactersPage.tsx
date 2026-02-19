import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { authManager } from '../utils/auth';
import { theme } from '../theme';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import { AuthModal } from './AuthModal';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 0;
  overflow-y: visible;
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
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
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
  font-size: ${theme.fontSize.base};
  margin-bottom: ${theme.spacing.lg};
`;

const CreateButton = styled.button`
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
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
  dislikes?: number;
  views: number;
  comments: number;
  personality_ru?: string;
  personality_en?: string;
  situation_ru?: string;
  situation_en?: string;
  instructions_ru?: string;
  instructions_en?: string;
  style_ru?: string;
  style_en?: string;
  appearance_ru?: string;
  appearance_en?: string;
  location_ru?: string;
  location_en?: string;
  translations?: any;
}

interface MyCharactersPageProps {
  onBackToMain: () => void;
  onCreateCharacter: () => void;
  onShop?: () => void;
  onProfile?: () => void;
  onEditCharacters?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
  onCharacterSelect: (character: Character) => void;
}

export const MyCharactersPage: React.FC<MyCharactersPageProps> = ({
  onBackToMain,
  onCreateCharacter,
  onShop,
  onProfile,
  onPhotoGeneration,
  onPaidAlbum,
  onCharacterSelect
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username: string, coins: number } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());
  const [characterRatings, setCharacterRatings] = useState<{ [key: number]: { likes: number, dislikes: number } }>({});

  // Используем ref для отслеживания, чтобы избежать повторных загрузок
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Загрузка рейтингов персонажей
  const loadCharacterRatings = useCallback(async (charactersList: Character[]) => {
    const ratings: { [key: number]: { likes: number, dislikes: number } } = {};

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
  }, []);

  // Загрузка избранных персонажей (мемоизирована)
  const loadFavorites = useCallback(async () => {
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
  }, []);

  // Загрузка персонажей пользователя (мемоизирована)
  const loadMyCharacters = useCallback(async () => {
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
      const currentUserId = userData?.id;

      if (!currentUserId) {

        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/v1/characters/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const charactersData = await response.json();

        // Защита от некорректных данных
        if (!Array.isArray(charactersData)) {

          setCharacters([]);
          setIsAuthenticated(true);
          return;
        }

        // Фильтруем только персонажей текущего пользователя по его ID
        const myCharacters = charactersData.filter((char: any) => {
          if (!char || !char.id) {
            return false;
          }
          return Number(char.user_id) === Number(currentUserId);
        });

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

        const formattedCharacters: Character[] = myCharacters
          .filter((char: any) => char && char.id != null) // Защита от null/undefined
          .map((char: any) => {
            const normalizedKey = (char.name || char.display_name || '').toLowerCase();
            const charName = char.name || char.display_name || 'Unknown';
            return {
              id: String(char.id || ''),
              name: charName,
              description: char.character_appearance || 'No description available',
              avatar: charName.charAt(0).toUpperCase(),
              photos: photosMap[normalizedKey] || [],
              tags: Array.isArray(char.tags) && char.tags.length ? char.tags : [],
              author: 'Me',
              likes: char.likes || 0,
              dislikes: char.dislikes || 0,
              views: char.views || 0,
              comments: char.comments || 0,
              prompt: char.prompt || char.full_prompt || '',
              // Bilingual fields
              personality_ru: char.personality_ru,
              personality_en: char.personality_en,
              situation_ru: char.situation_ru,
              situation_en: char.situation_en,
              instructions_ru: char.instructions_ru,
              instructions_en: char.instructions_en,
              style_ru: char.style_ru,
              style_en: char.style_en,
              appearance_ru: char.appearance_ru || char.character_appearance_ru,
              appearance_en: char.appearance_en || char.character_appearance_en,
              location_ru: char.location_ru,
              location_en: char.location_en,
              translations: char.translations
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
      isLoadingRef.current = false;
    }
  }, []);

  // Проверка авторизации (мемоизирована)
  const checkAuth = useCallback(async () => {
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
      } else if (response.status === 401) {
        // Только при 401 пытаемся обновить токен
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
              // Повторяем проверку с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {

          }
        }
        // Если refresh не удался, удаляем токены
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      } else {
        // Для других ошибок не удаляем токены

        setIsAuthenticated(false);
      }
    } catch (error) {
      // При сетевых ошибках не удаляем токены

      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }
  }, [loadFavorites]);

  // Обработчики
  const handleCardClick = useCallback((character: Character) => {
    onCharacterSelect(character);
  }, [onCharacterSelect]);

  const handleLogout = useCallback(() => {
    // Удаляем токен из localStorage
    localStorage.removeItem('authToken');
    // Перезагружаем страницу для обновления состояния
    window.location.reload();
  }, []);

  // Загрузка данных при монтировании (только один раз)
  useEffect(() => {
    // Предотвращаем повторную загрузку
    if (hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    hasLoadedRef.current = true;

    const initPage = async () => {
      try {
        await checkAuth();

        // Загружаем персонажей если есть токен
        const token = localStorage.getItem('authToken');
        if (token) {
          await loadMyCharacters();
        }
      } catch (error) {

        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    initPage();
  }, [checkAuth, loadMyCharacters]);

  // Показываем модалку ТОЛЬКО один раз после проверки
  useEffect(() => {
    if (authCheckComplete && !isAuthenticated && !isAuthModalOpen) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
    }
  }, [authCheckComplete, isAuthenticated, isAuthModalOpen]);

  if (!isAuthenticated) {
    return (
      <MainContainer>
        <BackgroundWrapper>
          <DarkVeil speed={1.1} />
        </BackgroundWrapper>
        <ContentWrapper>
          <CharactersGrid>
            <EmptyState>
              <EmptyTitle>Необходима авторизация</EmptyTitle>
              <EmptyDescription>
                Войдите в систему, чтобы просматривать и редактировать своих персонажей
              </EmptyDescription>
            </EmptyState>
          </CharactersGrid>
        </ContentWrapper>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <ContentWrapper>
        <div className="content-area vertical">
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
              characters
                .filter((character) => character && character.id) // Защита от пустых персонажей
                .map((character) => {
                  // Проверяем, находится ли персонаж в избранном
                  const characterId = typeof character.id === 'number'
                    ? character.id
                    : parseInt(String(character.id || ''), 10);
                  const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                  const rating = !isNaN(characterId) ? characterRatings[characterId] : null;

                  return (
                    <CharacterCard
                      key={character.id}
                      character={{
                        ...character,
                        likes: rating ? rating.likes : character.likes || 0,
                        dislikes: rating ? rating.dislikes : character.dislikes || 0
                      }}
                      onClick={handleCardClick}
                      isAuthenticated={isAuthenticated}
                      onPhotoGeneration={onPhotoGeneration}
                      onPaidAlbum={onPaidAlbum}
                      isFavorite={isFavorite}
                      onFavoriteToggle={loadFavorites}
                      onDelete={undefined}
                    />
                  );
                })
            )}
          </CharactersGrid>
        </div>
      </ContentWrapper>

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
    </MainContainer>
  );
};
