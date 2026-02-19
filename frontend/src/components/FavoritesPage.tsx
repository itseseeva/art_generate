import React, { useState, useEffect, useRef } from 'react';
import { useGridColumns } from '../hooks/useGridColumns';
import styled from 'styled-components';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { CharacterCard } from './CharacterCard';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: transparent;
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

const Header = styled.div`
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border.accent};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0;
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: 40px 16px 24px;
  overflow-y: visible;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
  position: relative;
  z-index: 1;
  width: 100%;

  @media (max-width: 768px) {
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
  font-size: ${theme.fontSize.xl};
  margin-bottom: ${theme.spacing.md};
`;

const EmptyDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
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

interface FavoritesPageProps {
  onBackToMain: () => void;
  onCharacterSelect: (character: Character) => void;
  onProfile?: () => void;
  onShop?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  onBackToMain,
  onCharacterSelect,
  onProfile,
  onShop,
  onPhotoGeneration,
  onPaidAlbum
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [characterRatings, setCharacterRatings] = useState<{ [key: string]: { likes: number, dislikes: number } }>({});
  const charactersGridRef = useRef<HTMLDivElement>(null);
  const columnsCount = useGridColumns(charactersGridRef);

  useEffect(() => {
    const checkAuth = async () => {
      const token = authManager.getToken();
      setIsAuthenticated(!!token);

      if (token) {
        await loadFavorites();
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Загрузка рейтингов персонажей
  const loadCharacterRatings = async (charactersList: Character[]) => {
    const ratings: { [key: string]: { likes: number, dislikes: number } } = {};

    for (const char of charactersList) {
      const characterId = char.id;
      if (!characterId) continue;

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.GET_CHARACTER_RATINGS(parseInt(characterId, 10))}`, {
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

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const response = await authManager.fetchWithAuth(API_CONFIG.FAVORITES);

      if (response.ok) {
        const data = await response.json();

        // Загружаем фото из main_photos (как на главной странице)
        const photosMap: Record<string, string[]> = {};

        for (const char of data) {
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

        // Преобразуем данные в формат Character
        const formattedCharacters: Character[] = data.map((char: any) => {
          const normalizedKey = (char.name || char.display_name || '').toLowerCase();
          return {
            id: String(char.id),
            name: char.name || char.display_name,
            description: char.description || char.character_appearance || '',
            avatar: (char.name || char.display_name || '').charAt(0).toUpperCase(),
            photos: photosMap[normalizedKey] || [],
            tags: [],
            author: char.user_id ? 'Пользователь' : 'Система',
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
      } else {

      }
    } catch (error) {

    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <MainContainer>
        <div className="content-area vertical">
          <Header>
            <Title>Избранное</Title>
          </Header>
          <EmptyState>
            <EmptyTitle>Необходима авторизация</EmptyTitle>
            <EmptyDescription>
              Войдите в систему, чтобы просматривать избранных персонажей
            </EmptyDescription>
          </EmptyState>
        </div>
        <BackgroundWrapper>
          <DarkVeil speed={1.1} />
        </BackgroundWrapper>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <div className="content-area vertical">

        <CharactersGrid ref={charactersGridRef}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#a8a8a8' }}>
              Загрузка избранных персонажей...
            </div>
          ) : characters.length === 0 ? (
            <EmptyState>
              <EmptyTitle>Нет избранных персонажей</EmptyTitle>
              <EmptyDescription>
                Добавьте персонажей в избранное, нажав на кнопку с сердечком на карточке персонажа
              </EmptyDescription>
            </EmptyState>
          ) : (
            characters.map((character, i) => {
              const characterId = typeof character.id === 'number' ? character.id : parseInt(String(character.id), 10);
              const rating = !isNaN(characterId) ? characterRatings[characterId] : null;

              return (
                <CharacterCard
                  key={character.id}
                  character={{
                    ...character,
                    likes: rating ? rating.likes : character.likes || 0,
                    dislikes: rating ? rating.dislikes : character.dislikes || 0
                  }}
                  onClick={onCharacterSelect}
                  isAuthenticated={isAuthenticated}
                  onPhotoGeneration={onPhotoGeneration}
                  onPaidAlbum={onPaidAlbum}
                  isFavorite={true}
                  onFavoriteToggle={loadFavorites}
                  isRight={(i + 1) % columnsCount !== 0}
                />
              );
            })
          )}
        </CharactersGrid>
      </div>
    </MainContainer>
  );
};

