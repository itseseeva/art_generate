import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import '../styles/ContentArea.css';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
`;


const Header = styled.div`
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(6px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  z-index: 10;
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

const CharactersGrid = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${theme.spacing.lg};
  align-content: start;
`;

const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const LastMessage = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  padding: 0 ${theme.spacing.xs};
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: ${theme.colors.text.secondary};
`;

export interface CharacterWithHistory {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos: string[];
  tags: string[];
  author: string;
  likes: number;
  views: number;
  comments: number;
  mode?: 'safe' | 'nsfw';
  lastMessageAt?: string | null;
  raw?: any;
}

interface HistoryCharacter {
  name: string;
  last_message_at?: string | null;
  last_image_url?: string | null;
}

interface MessagesPageProps {
  onBackToMain: () => void;
  onShop: () => void;
  onCreateCharacter: () => void;
  onEditCharacters: () => void;
  onOpenChat?: (character: any) => void;
  onProfile?: () => void;
  onOpenChat: (character: CharacterWithHistory) => void;
}

const extractPhotos = (source: any, fallbackImage?: string | null): string[] => {
  if (!source) {
    return fallbackImage && fallbackImage.startsWith('http') ? [fallbackImage] : [];
  }

  const normalize = (raw: any): string[] => {
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      return raw
        .map((entry) => {
          if (typeof entry === 'string') {
            return entry.startsWith('http') ? entry : null;
          }
          if (entry && typeof entry === 'object') {
            return entry.url || entry.photo_url || entry.image_url || null;
          }
          return null;
        })
        .filter((url): url is string => Boolean(url));
    }
    if (typeof raw === 'string') {
      if (raw.trim().startsWith('http')) {
        return [raw.trim()];
      }
      try {
        return normalize(JSON.parse(raw));
      } catch {
        return [];
      }
    }
    return [];
  };

  const candidates = [
    source.main_photos_parsed,
    source.main_photos,
    source.photos,
    source.main_photo_url,
    source.avatar_url,
  ];

  for (const candidate of candidates) {
    const parsed = normalize(candidate);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (fallbackImage && fallbackImage.startsWith('http')) {
    return [fallbackImage];
  }

  return [];
};

const buildCharacterData = (
  entry: HistoryCharacter,
  source?: any
): CharacterWithHistory => {
  const name = source?.name || entry.name;
  const photos = extractPhotos(source, entry.last_image_url);

  return {
    id: source?.id ? String(source.id) : name,
    name,
    description:
      source?.character_appearance ||
      source?.description ||
      'Описание будет добавлено позже',
    avatar: (name?.[0] || '?').toUpperCase(),
    photos,
    tags: Array.isArray(source?.tags) ? source.tags : [],
    author: source?.author || source?.created_by || 'Unknown',
    likes: source?.likes || 0,
    views: source?.views || 0,
    comments: source?.comments || 0,
    mode: source?.is_nsfw ? 'nsfw' : 'safe',
    lastMessageAt: entry.last_message_at ?? null,
    raw: source,
  };
};

export const MessagesPage: React.FC<MessagesPageProps> = ({
  onBackToMain,
  onShop,
  onCreateCharacter,
  onEditCharacters,
  onProfile,
  onOpenChat
}) => {
  const [characters, setCharacters] = useState<CharacterWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharacters = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = authManager.getToken();
        if (!token) {
          throw new Error('Необходимо войти, чтобы просматривать сообщения');
        }

        const [historyResponse, charactersResponse] = await Promise.all([
          authManager.fetchWithAuth('/api/v1/chat-history/characters'),
          authManager.fetchWithAuth('/api/v1/characters/'),
        ]);

        if (!historyResponse.ok) {
          throw new Error('Не удалось получить список персонажей с историей сообщений');
        }
        if (!charactersResponse.ok) {
          throw new Error('Не удалось загрузить информацию о персонажах');
        }

        const historyData = await historyResponse.json().catch(() => ({}));
        const charactersData = await charactersResponse.json().catch(() => []);

        const historyList: HistoryCharacter[] = Array.isArray(historyData?.characters)
          ? historyData.characters
              .filter((entry: any) => typeof entry === 'string' || (entry && entry.name))
              .map((entry: any) =>
                typeof entry === 'string'
                  ? { name: entry }
                  : {
                      name: entry.name,
                      last_message_at: entry.last_message_at,
                      last_image_url: entry.last_image_url,
                    }
              )
          : [];

        const charactersArray = Array.isArray(charactersData) ? charactersData : [];
        const charactersMap = new Map<string, any>();
        charactersArray.forEach((char: any) => {
          if (typeof char?.name !== 'string') {
            return;
          }
          const key = char.name.trim().toLowerCase();
          if (key) {
            charactersMap.set(key, char);
          }
        });

        const formatted = historyList.map((entry) => {
          const key = entry.name?.trim().toLowerCase();
          const match = key ? charactersMap.get(key) : undefined;
          return buildCharacterData(entry, match);
        });

        setCharacters(formatted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

    loadCharacters();
  }, []);

  return (
    <MainContainer>
      <div className="content-area vertical">
        <GlobalHeader
          onShop={onShop}
          onProfile={onProfile}
          onLogout={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.reload();
          }}
        />

        <Header>
          <BackButton onClick={onBackToMain}>← Назад</BackButton>
          <PageTitle>Сообщения</PageTitle>
          <div />
        </Header>

        {error && (
          <div style={{ padding: '1rem' }}>
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner text="Загружаем историю сообщений..." />
        ) : (
          <CharactersGrid>
            {characters.length === 0 ? (
              <EmptyState>
                Пока у вас нет сохранённых переписок. Начните диалог с любым персонажем!
              </EmptyState>
            ) : (
              characters.map((character) => (
                <CardWrapper key={character.id}>
                  <CharacterCard
                    character={character}
                    onClick={() => onOpenChat(character)}
                  />
                  <LastMessage>
                    {character.lastMessageAt
                      ? `Последнее сообщение: ${new Date(character.lastMessageAt).toLocaleString()}`
                      : 'История появится после первого сообщения'}
                  </LastMessage>
                </CardWrapper>
              ))
            )}
          </CharactersGrid>
        )}
      </div>
    </MainContainer>
  );
};


