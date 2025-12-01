import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { CharacterCard } from './CharacterCard';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { GlobalHeader } from './GlobalHeader';

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

const Title = styled.h1`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0;
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
  font-size: ${theme.fontSize.xl};
  margin-bottom: ${theme.spacing.md};
`;

const EmptyDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
`;

interface Character {
  id: number;
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

interface FavoritesPageProps {
  onBackToMain: () => void;
  onCharacterSelect: (character: Character) => void;
  onShop?: () => void;
  onPhotoGeneration?: (character: Character) => void;
  onPaidAlbum?: (character: Character) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  onBackToMain,
  onCharacterSelect,
  onShop,
  onPhotoGeneration,
  onPaidAlbum
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        
        // Преобразуем данные в формат Character
        const formattedCharacters: Character[] = data.map((char: any) => {
          const normalizedKey = (char.name || char.display_name || '').toLowerCase();
          return {
            id: char.id,
            name: char.name || char.display_name,
            description: char.description || char.character_appearance || '',
            avatar: (char.name || char.display_name || '').charAt(0).toUpperCase(),
            photos: photosMap[normalizedKey] || [],
            tags: [],
            author: char.user_id ? 'Пользователь' : 'Система',
            likes: 0,
            views: 0,
            comments: 0
          };
        });
        
        setCharacters(formattedCharacters);
      } else {
        console.error('Error loading favorites:', response.status);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
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
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <div className="content-area vertical">
        <GlobalHeader 
          onShop={onShop}
          leftContent={<Title>Избранное</Title>}
        />
        
        <CharactersGrid>
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
            characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onClick={onCharacterSelect}
                isAuthenticated={isAuthenticated}
                onPhotoGeneration={onPhotoGeneration}
                onPaidAlbum={onPaidAlbum}
                isFavorite={true}
                onFavoriteToggle={loadFavorites}
              />
            ))
          )}
        </CharactersGrid>
      </div>
    </MainContainer>
  );
};

