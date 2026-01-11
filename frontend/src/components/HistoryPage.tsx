import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import '../styles/ContentArea.css';
import { useIsMobile } from '../hooks/useIsMobile';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: transparent;
`;

const CharactersGrid = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  align-content: start;

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: ${theme.spacing.sm};
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
`;

const MobileActionContainer = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    justify-content: flex-end;
  }
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
  const isMobile = useIsMobile();
  const [characters, setCharacters] = useState<CharacterWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characterPhotos, setCharacterPhotos] = useState<{[key: string]: string[]}>({});
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());

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

  // Загружаем фото персонажей по аналогии с MainPage
  const loadCharacterPhotos = async () => {
    try {
      // Загружаем фотографии из JSON файла как fallback
      let initialPhotos: {[key: string]: string[]} = {};
      const response = await fetch('/character-photos.json');
      if (response.ok) {
        initialPhotos = await response.json();
        
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
          
        }
      }

      // Обновляем состояние с новыми фото
      // Объединяем фото из JSON и из API (API имеет приоритет)
      const finalPhotos = { ...initialPhotos, ...photosMap };
      
      setCharacterPhotos(finalPhotos);
    } catch (err) {
      
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

        // Всегда загружаем с принудительным обновлением, чтобы очистить кэш
        const [historyResponse, charactersResponse] = await Promise.all([
          authManager.fetchWithAuth(`/api/v1/chat-history/characters?force_refresh=true&_t=${Date.now()}`),
          authManager.fetchWithAuth(`/api/v1/characters/?skip=0&limit=1000&force_refresh=true&_t=${Date.now()}`),
        ]);

        if (!historyResponse.ok) {
          throw new Error('Не удалось получить список персонажей с историей сообщений');
        }
        if (!charactersResponse.ok) {
          throw new Error('Не удалось загрузить информацию о персонажах');
        }

        const historyData = await historyResponse.json().catch(() => ({}));
        const charactersData = await charactersResponse.json().catch(() => []);

        
        
        
        
        
        
        // Проверяем, что ответ содержит массив characters
        if (!historyData?.characters) {
          
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
                  // Проверяем, что есть имя
                  const hasName = typeof entry.name === 'string' && entry.name.trim().length > 0;
                  if (!hasName) {
                    return false;
                  }
                  // Проверяем, что есть либо время последнего сообщения, либо картинка
                  // Это позволяет показывать персонажей с историей только из картинок
                  const hasLastMessage = entry.last_message_at && entry.last_message_at.trim().length > 0;
                  const hasImage = entry.last_image_url && entry.last_image_url.trim().length > 0;
                  return hasLastMessage || hasImage;
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
            
            // КРИТИЧЕСКИ ВАЖНО: Если персонаж не найден в списке существующих персонажей,
            // проверяем, может быть проблема с сопоставлением имен
            if (!finalMatch) {
              
              
              
              
              // Пробуем найти по частичному совпадению (без учета регистра и пробелов)
              const normalizedEntryName = entryName.toLowerCase().replace(/\s+/g, '');
              let foundByPartial = false;
              for (const [mapKey, char] of charactersMap.entries()) {
                const normalizedMapName = (char.name || '').toLowerCase().replace(/\s+/g, '');
                if (normalizedMapName === normalizedEntryName || normalizedMapName.includes(normalizedEntryName) || normalizedEntryName.includes(normalizedMapName)) {
                  
                  finalMatch = char;
                  foundByPartial = true;
                  break;
                }
              }
              
              // Если все равно не нашли, создаем базовый объект персонажа из данных истории
              if (!foundByPartial) {
                
                // Создаем минимальный объект персонажа из данных истории
                finalMatch = {
                  name: entryName,
                  display_name: entryName,
                  id: null,
                  prompt: '',
                  appearance: '',
                  location: '',
                  is_nsfw: false,
                  photos: entry.last_image_url ? [entry.last_image_url] : []
                };
              }
            }
            
            const char = buildCharacterData(entry, finalMatch, characterPhotos);
            
            // Логируем для отладки
            
            if (!char.photos || char.photos.length === 0) {
              const rawName = finalMatch?.name || entryName;
              const photoKey = rawName.toLowerCase();
              
            }
            
            return char;
          })
          .filter((char): char is CharacterWithHistory => char !== null);

        
        setCharacters(formatted);
      } catch (err) {
        
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки');
      } finally {
        setIsLoading(false);
      }
    };

  // Загружаем фото и избранные при монтировании
  useEffect(() => {
    loadCharacterPhotos();
    loadFavorites();
  }, []);

  // Используем ref для отслеживания первого вызова loadCharacters
  const photosLoadedRef = useRef(false);
  
  // Загружаем персонажей после загрузки фото (когда characterPhotos обновился)
  useEffect(() => {
    const photosKeys = Object.keys(characterPhotos);
    
    // Если фото загружены (даже если их нет), загружаем персонажей
    if (photosKeys.length > 0 || photosLoadedRef.current) {
      
      photosLoadedRef.current = true;
      loadCharacters();
    } else if (!isLoading && !photosLoadedRef.current) {
      // Если фото не загружены, но загрузка завершена, все равно загружаем персонажей один раз
      // (фото могут быть не у всех персонажей)
      
      photosLoadedRef.current = true;
      loadCharacters();
    }
  }, [characterPhotos]);

  // Слушаем событие очистки истории из чата
  useEffect(() => {
    const handleHistoryCleared = async (event: CustomEvent) => {
      const { characterName } = event.detail;
      
      
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
            
          }
          return !matches;
        });
        
        return filtered;
      });
      
      // Перезагружаем список персонажей с сервера для синхронизации
      try {
        // Перезагружаем персонажей напрямую (не ждем обновления фото)
        await loadCharacters();
      } catch (err) {
        
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
          leftContent={
            !isMobile && characters.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={async () => {
                    if (!window.confirm('Вы уверены, что хотите удалить всю историю чатов? Это действие нельзя отменить.')) {
                      return;
                    }
                    try {
                      const token = authManager.getToken();
                      if (!token) {
                        setError('Необходима авторизация');
                        return;
                      }
                      const response = await authManager.fetchWithAuth('/api/v1/chat-history/clear-all-history', {
                        method: 'POST'
                      });
                      if (response.ok) {
                        // Очищаем список персонажей и перезагружаем
                        setCharacters([]);
                        await loadCharacters();
                      } else {
                        const errorData = await response.json().catch(() => ({}));
                        setError(errorData.detail || 'Не удалось удалить историю');
                      }
                    } catch (err) {
                      setError('Ошибка при удалении истории');
                    }
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ff5c5c',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                >
                  Удалить все
                </button>
              </div>
            )
          }
        />

        {isMobile && characters.length > 0 && (
          <MobileActionContainer>
            <button
              onClick={async () => {
                if (!window.confirm('Вы уверены, что хотите удалить всю историю чатов? Это действие нельзя отменить.')) {
                  return;
                }
                try {
                  const token = authManager.getToken();
                  if (!token) {
                    setError('Необходима авторизация');
                    return;
                  }
                  const response = await authManager.fetchWithAuth('/api/v1/chat-history/clear-all-history', {
                    method: 'POST'
                  });
                  if (response.ok) {
                    setCharacters([]);
                    await loadCharacters();
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.detail || 'Не удалось удалить историю');
                  }
                } catch (err) {
                  setError('Ошибка при удалении истории');
                }
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ff4d4d',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Удалить всю историю
            </button>
          </MobileActionContainer>
        )}

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
              characters.map((character) => {
                // Проверяем, находится ли персонаж в избранном
                const characterId = typeof character.id === 'number' 
                  ? character.id 
                  : parseInt(character.id, 10);
                const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                
                return (
                <CardWrapper key={character.id}>
                  <CharacterCard
                    character={character}
                    onClick={() => onOpenChat(character)}
                    showPromptButton={true}
                      isFavorite={isFavorite}
                      onFavoriteToggle={loadFavorites}
                  />
                  <LastMessage>
                    {character.lastMessageAt
                      ? `Последнее сообщение: ${new Date(character.lastMessageAt).toLocaleString()}`
                      : 'История появится после первого сообщения'}
                  </LastMessage>
                </CardWrapper>
                );
              })
            )}
          </CharactersGrid>
        )}
      </div>
    </MainContainer>
  );
};

