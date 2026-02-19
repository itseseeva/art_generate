import React, { useEffect, useState, useRef } from 'react';
import { useGridColumns } from '../hooks/useGridColumns';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
// GlobalHeader import removed
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import '../styles/ContentArea.css';
import { useIsMobile } from '../hooks/useIsMobile';
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
  padding: 40px 16px 24px;
  overflow-y: visible;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
  width: 100%;

  @media (max-width: 768px) {
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
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
  gap: 0;
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
  dislikes?: number;
  views: number;
  comments: number;
  mode?: 'safe' | 'nsfw';
  lastMessageAt?: string | null;
  messageCount?: number;
  raw?: any;
  // Bilingual fields
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

interface HistoryCharacter {
  name: string;
  last_message_at?: string | null;
  last_image_url?: string | null;
  message_count?: number;
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
  characterPhotos?: { [key: string]: string[] }
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
    dislikes: source?.dislikes || 0,
    views: source?.views || 0,
    comments: source?.comments || 0,
    mode: source?.is_nsfw ? 'nsfw' : 'safe',
    lastMessageAt: entry.last_message_at ?? null,
    messageCount: entry.message_count,
    raw: source,
    // Preserving bilingual fields from source
    personality_ru: source?.personality_ru,
    personality_en: source?.personality_en,
    situation_ru: source?.situation_ru,
    situation_en: source?.situation_en,
    instructions_ru: source?.instructions_ru,
    instructions_en: source?.instructions_en,
    style_ru: source?.style_ru,
    style_en: source?.style_en,
    appearance_ru: source?.appearance_ru || source?.character_appearance_ru,
    appearance_en: source?.appearance_en || source?.character_appearance_en,
    location_ru: source?.location_ru,
    location_en: source?.location_en,
    translations: source?.translations
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
  const [characterPhotos, setCharacterPhotos] = useState<{ [key: string]: string[] }>({});
  const [favoriteCharacterIds, setFavoriteCharacterIds] = useState<Set<number>>(new Set());
  const [characterRatings, setCharacterRatings] = useState<{ [key: number]: { likes: number, dislikes: number } }>({});
  const charactersGridRef = useRef<HTMLDivElement>(null);
  const columnsCount = useGridColumns(charactersGridRef);

  // Загрузка рейтингов персонажей
  const loadCharacterRatings = async (charactersList: CharacterWithHistory[]) => {
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
  };

  // Загрузка избранных персонажей
  const loadFavorites = async () => {
    try {
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
      let initialPhotos: { [key: string]: string[] } = {};
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

      const photosMap: { [key: string]: string[] } = {};

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
            // Доверяем бэкенду, фильтруем только явно битые записи без имени
            if (typeof entry === 'string') {
              return entry.trim().length > 0;
            }
            if (entry && typeof entry === 'object') {
              return typeof entry.name === 'string' && entry.name.trim().length > 0;
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
                message_count: entry.message_count,
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

      // Загружаем рейтинги для всех персонажей
      await loadCharacterRatings(formatted);
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

  // Синхронизация состояния авторизации
  useEffect(() => {
    const unsubscribe = authManager.subscribeAuthChanges((state) => {
      if (!state.isAuthenticated) {
        // Если пользователь вышел, очищаем данные
        setCharacters([]);
        setFavoriteCharacterIds(new Set());
        setCharacterPhotos({});
      } else {
        // Если пользователь вошел, перезагружаем данные
        loadCharacterPhotos();
        loadFavorites();
      }
    });

    return unsubscribe;
  }, []);

  // Используем ref для отслеживания первого вызова loadCharacters
  const photosLoadedRef = useRef(false);

  // Загружаем персонажей после небольшой задержки для загрузки фото
  useEffect(() => {
    // Даем время на загрузку фото, но не блокируем загрузку истории
    const timer = setTimeout(() => {
      if (!photosLoadedRef.current) {
        photosLoadedRef.current = true;
        loadCharacters();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Перезагружаем персонажей при обновлении фото (если они уже были загружены)
  useEffect(() => {
    if (photosLoadedRef.current && Object.keys(characterPhotos).length > 0) {
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

  const isAuthenticated = !!authManager.getToken();

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <ContentWrapper>
        <div className="content-area vertical">
          {createPortal(
            !isMobile && characters.length > 0 && (
              <div style={{ display: 'none' }}></div> // Скрываем глобальную кнопку удаления
            ),
            document.getElementById('header-left-portal') || document.body
          )}

          {isMobile && characters.length > 0 && (
            // Скрываем мобильную кнопку удаления
            null
          )}

          {error && (
            <div style={{ padding: '1rem' }}>
              <ErrorMessage message={error} onClose={() => setError(null)} />
            </div>
          )}

          {!isAuthenticated ? (
            <CharactersGrid>
              <EmptyState>
                У вас пока нет переписки с персонажами
              </EmptyState>
            </CharactersGrid>
          ) : isLoading ? (
            <LoadingSpinner text="Загружаем историю сообщений..." />
          ) : (
            <CharactersGrid ref={charactersGridRef}>
              {characters.length === 0 ? (
                <EmptyState>
                  Пока у вас нет сохранённых переписок. Начните диалог с любым персонажем!
                </EmptyState>
              ) : (
                characters.map((character, i) => {
                  // Проверяем, находится ли персонаж в избранном
                  const characterId = typeof character.id === 'number'
                    ? character.id
                    : parseInt(character.id, 10);
                  const isFavorite = !isNaN(characterId) && favoriteCharacterIds.has(characterId);
                  const rating = !isNaN(characterId) ? characterRatings[characterId] : null;

                  return (
                    <CardWrapper key={character.id} style={{ gap: 0 }}>
                      <CharacterCard
                        character={{
                          ...character,
                          likes: rating ? rating.likes : character.likes || 0,
                          dislikes: rating ? rating.dislikes : character.dislikes || 0
                        }}
                        onClick={() => onOpenChat(character)}
                        isFavorite={isFavorite}
                        onFavoriteToggle={loadFavorites}
                        showEditButton={true} // Включаем отображение кнопок действий
                        isRight={(i + 1) % columnsCount !== 0}
                        onDelete={async (char) => {
                          if (!window.confirm(`Вы уверены, что хотите удалить историю с персонажем ${char.name}?`)) {
                            return;
                          }
                          try {
                            const token = authManager.getToken();
                            if (!token) return;

                            // Используем имя из raw или name
                            const charName = char.raw?.name || char.name;

                            const response = await authManager.fetchWithAuth(`/api/v1/characters/${charName}/chat-history`, {
                              method: 'DELETE'
                            });

                            if (response.ok) {
                              // Удаляем персонажа из локального состояния
                              setCharacters(prev => prev.filter(c => c.id !== char.id));
                            } else {
                              const errorData = await response.json().catch(() => ({}));
                              setError(errorData.detail || 'Не удалось удалить историю');
                            }
                          } catch (err) {
                            setError('Ошибка при удалении истории');
                          }
                        }}
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
      </ContentWrapper>
    </MainContainer>
  );
};

