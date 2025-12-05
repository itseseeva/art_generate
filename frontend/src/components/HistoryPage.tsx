import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { CharacterCard } from './CharacterCard';
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

interface HistoryPageProps {
  onBackToMain: () => void;
  onShop: () => void;
  onCreateCharacter: () => void;
  onEditCharacters: () => void;
  onOpenChat: (character: CharacterWithHistory) => void;
  onProfile?: () => void;
}

const extractPhotos = (source: any, fallbackImage?: string | null, characterName?: string): string[] => {
  const normalize = (raw: any, name?: string): string[] => {
    if (!raw) {
      return [];
    }
    if (Array.isArray(raw)) {
      const normalizedKey = (name || '').toLowerCase();
      return raw
        .map((entry: any) => {
          if (typeof entry === 'string') {
            return entry.startsWith('http') ? entry : `/static/photos/${normalizedKey}/${entry}.png`;
          }
          if (entry && typeof entry === 'object') {
            if (entry.url) {
              return entry.url;
            }
            if (entry.id) {
              return entry.url || `/static/photos/${normalizedKey}/${entry.id}.png`;
            }
            return entry.photo_url || entry.image_url || null;
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
        return normalize(JSON.parse(raw), name);
      } catch {
        return [];
      }
    }
    return [];
  };

  const charName = source?.name || characterName || '';

  // Если есть source, сначала ищем фото в нем
  if (source) {
    const candidates = [
      source.main_photos_parsed,
      source.main_photos,
      source.photos,
      source.main_photo_url,
      source.avatar_url,
    ];

    for (const candidate of candidates) {
      const parsed = normalize(candidate, charName);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    // Дополнительная обработка main_photos как строки JSON
    if (source.main_photos && typeof source.main_photos === 'string' && !source.main_photos.startsWith('http')) {
      try {
        const parsed = JSON.parse(source.main_photos);
        const parsedPhotos = normalize(parsed, charName);
        if (parsedPhotos.length > 0) {
          return parsedPhotos;
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    }
  }

  // Если ничего не найдено в source, используем fallbackImage
  if (fallbackImage && fallbackImage.startsWith('http')) {
    return [fallbackImage];
  }

  return [];
};

const buildCharacterData = (
  entry: HistoryCharacter,
  source?: any,
  characterPhotos?: {[key: string]: string[]}
): CharacterWithHistory => {
  // Используем display_name если есть, иначе name (как на MainPage)
  const rawName = source?.name || entry.name;
  const displayName = source?.display_name || source?.name || entry.name;
  
  // Для поиска фото используем rawName (как на MainPage)
  const mapKey = rawName.toLowerCase();
  const photos = characterPhotos?.[mapKey] || extractPhotos(source, entry.last_image_url, rawName);

  return {
    id: source?.id ? String(source.id) : displayName,
    name: displayName,
    description:
      source?.character_appearance ||
      source?.description ||
      'Описание будет добавлено позже',
    avatar: (displayName?.[0] || '?').toUpperCase(),
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

export const HistoryPage: React.FC<HistoryPageProps> = ({
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
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});

  // Загружаем фото персонажей по аналогии с MainPage
  const loadCharacterPhotos = async () => {
    try {
      // Загружаем фотографии из JSON файла как fallback
      let initialPhotos: {[key: string]: string[]} = {};
      const response = await fetch('/character-photos.json');
      if (response.ok) {
        initialPhotos = await response.json();
        console.log('[HISTORY] Загружены фото из JSON, ключей:', Object.keys(initialPhotos).length);
      }
      
      // Всегда загружаем свежие данные для получения актуальных фото
      const token = authManager.getToken();
      if (!token) {
        // Если нет токена, используем только фото из JSON
        if (Object.keys(initialPhotos).length > 0) {
          setCharacterPhotos(initialPhotos);
        }
        return;
      }

      const charactersResponse = await authManager.fetchWithAuth('/api/v1/characters/');
      if (!charactersResponse.ok) {
        // Если API не доступен, используем только фото из JSON
        if (Object.keys(initialPhotos).length > 0) {
          setCharacterPhotos(initialPhotos);
        }
        return;
      }

      const charactersData = await charactersResponse.json().catch(() => []);

      if (!Array.isArray(charactersData) || !charactersData.length) {
        // Если нет данных персонажей, используем только фото из JSON
        if (Object.keys(initialPhotos).length > 0) {
          setCharacterPhotos(initialPhotos);
        }
        return;
      }

      const photosMap: {[key: string]: string[]} = {};
      
      for (const char of charactersData) {
        if (!char || !char.main_photos) {
          continue;
        }

        // Используем name для ключа (как на MainPage) - именно name, не display_name
        const rawName = char.name || char.display_name || `character-${char.id || ''}`;
        if (!rawName) {
          continue;
        }

        let parsedPhotos: any[] = [];

        if (Array.isArray(char.main_photos)) {
          parsedPhotos = char.main_photos;
        } else if (typeof char.main_photos === 'string') {
          try {
            parsedPhotos = JSON.parse(char.main_photos);
          } catch (e) {
            console.error('Error parsing main_photos for character:', rawName, e);
            parsedPhotos = [];
          }
        } else {
          parsedPhotos = [char.main_photos];
        }

        // Используем name для ключа (как на MainPage) - именно name
        const normalizedKey = rawName.toLowerCase();
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
          console.log('[HISTORY] Загружены фото для:', rawName, 'ключ:', normalizedKey, 'фото:', photoUrls.length);
        }
      }

      // Обновляем состояние с новыми фото
      // Объединяем фото из JSON и из API (API имеет приоритет)
      const finalPhotos = { ...initialPhotos, ...photosMap };
      console.log('[HISTORY] Обновлено characterPhotos, ключей:', Object.keys(finalPhotos).length);
      setCharacterPhotos(finalPhotos);
    } catch (err) {
      console.error('Error loading character photos:', err);
    }
  };

  const loadCharacters = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = authManager.getToken();
        if (!token) {
          throw new Error('Необходимо войти, чтобы просматривать историю чатов');
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

        console.log('[HISTORY] History data:', historyData);
        console.log('[HISTORY] History response status:', historyResponse.status);
        console.log('[HISTORY] History response ok:', historyResponse.ok);
        console.log('[HISTORY] Characters count from history:', historyData?.characters?.length);
        console.log('[HISTORY] Can save history:', historyData?.can_save_history);
        
        // Проверяем, что ответ содержит массив characters
        if (!historyData?.characters) {
          console.warn('[HISTORY] В ответе нет массива characters:', historyData);
        }

        // Проверяем, что historyData содержит массив characters
        const historyList: HistoryCharacter[] = Array.isArray(historyData?.characters)
          ? historyData.characters
              .filter((entry: any) => {
                // Фильтруем только валидные записи с реальной историей
                if (typeof entry === 'string') {
                  return entry.trim().length > 0;
                }
                if (entry && typeof entry === 'object') {
                  // Проверяем, что есть имя и есть время последнего сообщения (реальный диалог)
                  const hasName = typeof entry.name === 'string' && entry.name.trim().length > 0;
                  const hasLastMessage = entry.last_message_at && entry.last_message_at.trim().length > 0;
                  return hasName && hasLastMessage;
                }
                return false;
              })
              .map((entry: any) =>
                typeof entry === 'string'
                  ? { name: entry.trim() }
                  : {
                      name: entry.name.trim(),
                      last_message_at: entry.last_message_at,
                      last_image_url: entry.last_image_url,
                    }
              )
          : [];

        console.log('[HISTORY] Загружено персонажей из истории:', historyList.length);
        console.log('[HISTORY] Список персонажей:', historyList.map(e => e.name));

        const charactersArray = Array.isArray(charactersData) ? charactersData : [];
        const charactersMap = new Map<string, any>();
        // Создаем карту по name (основной ключ) и display_name (дополнительный ключ)
        charactersArray.forEach((char: any) => {
          // Используем name для ключа (как на MainPage)
          const rawName = char.name;
          if (typeof rawName !== 'string' || !rawName.trim()) {
            return;
          }
          const key = rawName.trim().toLowerCase();
          if (key) {
            // Используем последнее значение, если есть дубликаты
            charactersMap.set(key, char);
          }
          // Также добавляем по display_name, если он отличается от name
          const displayName = char.display_name;
          if (displayName && typeof displayName === 'string' && displayName.trim().toLowerCase() !== key) {
            const displayKey = displayName.trim().toLowerCase();
            if (displayKey) {
              charactersMap.set(displayKey, char);
            }
          }
        });

        console.log('[HISTORY] Загружено персонажей из API:', charactersArray.length);
        console.log('[HISTORY] characterPhotos keys:', Object.keys(characterPhotos).length, 'keys:', Object.keys(characterPhotos).slice(0, 10));

        // Создаем данные персонажей, используя characterPhotos как на MainPage
        const formatted = historyList
          .map((entry) => {
            const entryName = entry.name?.trim();
            if (!entryName) {
              return null;
            }
            
            const key = entryName.toLowerCase();
            const match = charactersMap.get(key);
            
            // Если не нашли по точному совпадению, пробуем найти по display_name
            let finalMatch = match;
            if (!finalMatch) {
              for (const [mapKey, char] of charactersMap.entries()) {
                const charDisplayName = (char.display_name || char.name || '').toLowerCase();
                if (charDisplayName === key) {
                  finalMatch = char;
                  break;
                }
              }
            }
            
            const char = buildCharacterData(entry, finalMatch, characterPhotos);
            
            // Логируем для отладки
            console.log('[HISTORY] Персонаж:', char.name, 'фото:', char.photos?.length || 0, 'last_image_url:', entry.last_image_url);
            if (!char.photos || char.photos.length === 0) {
              const rawName = finalMatch?.name || entryName;
              const photoKey = rawName.toLowerCase();
              console.warn('[HISTORY] Нет фото для персонажа:', char.name, 'rawName:', rawName, 'photoKey:', photoKey, 'characterPhotos[photoKey]:', characterPhotos[photoKey], 'entry.last_image_url:', entry.last_image_url);
            }
            
            return char;
          })
          .filter((char): char is CharacterWithHistory => char !== null);

        console.log('[HISTORY] Итоговый список персонажей:', formatted.length);
        setCharacters(formatted);
      } catch (err) {
        console.error('[HISTORY] Ошибка загрузки:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

  // Загружаем фото при монтировании
  useEffect(() => {
    loadCharacterPhotos();
  }, []);

  // Используем ref для отслеживания первого вызова loadCharacters
  const photosLoadedRef = useRef(false);
  
  // Загружаем персонажей после загрузки фото (когда characterPhotos обновился)
  useEffect(() => {
    const photosKeys = Object.keys(characterPhotos);
    
    // Если фото загружены (даже если их нет), загружаем персонажей
    if (photosKeys.length > 0 || photosLoadedRef.current) {
      console.log('[HISTORY] characterPhotos обновлен, загружаем персонажей. Ключей:', photosKeys.length);
      photosLoadedRef.current = true;
      loadCharacters();
    } else if (!isLoading && !photosLoadedRef.current) {
      // Если фото не загружены, но загрузка завершена, все равно загружаем персонажей один раз
      // (фото могут быть не у всех персонажей)
      console.log('[HISTORY] Фото не загружены, но загружаем персонажей без фото (первый раз)');
      photosLoadedRef.current = true;
      loadCharacters();
    }
  }, [characterPhotos]);

  // Слушаем событие очистки истории из чата
  useEffect(() => {
    const handleHistoryCleared = async (event: CustomEvent) => {
      const { characterName } = event.detail;
      console.log('[HISTORY] Получено событие очистки истории для:', characterName);
      
      // Сразу удаляем персонажа локально для мгновенной обратной связи
      setCharacters(prev => {
        const filtered = prev.filter(char => {
          const charName = char.name.toLowerCase().trim();
          const charRawName = char.raw?.name?.toLowerCase().trim() || '';
          const charDisplayName = char.raw?.display_name?.toLowerCase().trim() || '';
          const eventName = characterName.toLowerCase().trim();
          // Сравниваем по name, display_name и raw name (как возвращается из API)
          const matches = charName === eventName || 
                         charRawName === eventName || 
                         charDisplayName === eventName;
          if (matches) {
            console.log('[HISTORY] Удаляем персонажа локально:', char.name, 'rawName:', charRawName, 'displayName:', charDisplayName, 'eventName:', eventName);
          }
          return !matches;
        });
        console.log('[HISTORY] Персонажей до удаления:', prev.length, 'после удаления:', filtered.length);
        return filtered;
      });
      
      // Перезагружаем список персонажей с сервера для синхронизации
      try {
        // Перезагружаем персонажей напрямую (не ждем обновления фото)
        await loadCharacters();
      } catch (err) {
        console.error('[HISTORY] Ошибка перезагрузки после очистки:', err);
      }
    };
    
    window.addEventListener('chat-history-cleared', handleHistoryCleared as EventListener);
    
    return () => {
      window.removeEventListener('chat-history-cleared', handleHistoryCleared as EventListener);
    };
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
          <PageTitle>История чатов</PageTitle>
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
                    showPromptButton={true}
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

