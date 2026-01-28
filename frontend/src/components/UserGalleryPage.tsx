import React, { useCallback, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { FiX as CloseIcon, FiPlus as PlusIcon, FiTrash2 as TrashIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import { OptimizedImage } from './ui/OptimizedImage';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { PromptGlassModal } from './PromptGlassModal';

const MainContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: ${theme.colors.background.primary};
`;


const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.xl};

  @media (max-width: 768px) {
    padding: ${theme.spacing.md};
  }
`;

const GalleryHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};

  @media (max-width: 768px) {
    margin-bottom: ${theme.spacing.lg};
  }
`;

const GalleryTitle = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${theme.colors.text.primary};
  margin: 0 0 ${theme.spacing.md} 0;
`;

const GallerySubtitle = styled.p`
  font-size: ${theme.fontSize.base};
  color: ${theme.colors.text.secondary};
  margin: 0;
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
  align-content: start;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: ${theme.spacing.sm};
    margin-top: ${theme.spacing.lg};
  }
`;

const GalleryImage = styled.div`
  position: relative;
  width: 100%;
  max-width: 240px;
  height: 300px;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: rgba(22, 33, 62, 0.3);
  border: 2px solid rgba(102, 126, 234, 0.4);
  box-shadow: ${theme.colors.shadow.card};
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  margin: 0 auto;

  &:hover {
    transform: translateY(-3px);
    box-shadow: ${theme.colors.shadow.glow};
    border-color: rgba(102, 126, 234, 0.65);
  }
`;

const AddToGalleryButton = styled.button`
  position: absolute;
  bottom: ${theme.spacing.sm};
  left: 50%;
  transform: translateX(-50%);
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  white-space: nowrap;
  
  &:hover {
    background: rgba(0, 0, 0, 0.95);
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateX(-50%) translateY(-2px);
  }
  
  &:active {
    transform: translateX(-50%) translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: translateX(-50%);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  z-index: 100;
  pointer-events: auto;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 500;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  transform: translateY(10px);
  
  ${GalleryImage}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  &:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: translateY(0);
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const PromptLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
`;

const PromptError = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: ${theme.borderRadius.lg};
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.sm};
  text-align: center;
`;

const GalleryEmpty = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xxl};
  color: ${theme.colors.text.secondary};
`;

const LoadMoreButton = styled.button`
  margin: ${theme.spacing.xl} auto;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(102, 126, 234, 0.8);
  border: 2px solid rgba(102, 126, 234, 0.5);
  border-radius: ${theme.borderRadius.lg};
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
  
  &:hover:not(:disabled) {
    background: rgba(102, 126, 234, 1);
    border-color: rgba(102, 126, 234, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface UserGalleryPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  userId?: number; // ID пользователя, чью галерею нужно показать (если не указан - показываем свою)
}

interface UserPhoto {
  id: number;
  image_url: string | null;
  image_filename: string | null;
  character_name: string;
  created_at: string;
}

export const UserGalleryPage: React.FC<UserGalleryPageProps> = ({
  onBackToMain,
  onShop,
  onCreateCharacter,
  onEditCharacters,
  userId
}) => {
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [addingPhotoIds, setAddingPhotoIds] = useState<Set<number>>(new Set());
  const [addedPhotoIds, setAddedPhotoIds] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<Set<number>>(new Set());
  const photosCacheRef = useRef<Map<string, { photos: UserPhoto[], total: number }>>(new Map());
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const isLoadingRef = useRef(false);
  const lastLoadedUserIdRef = useRef<string | number | undefined>(undefined);
  
  const PAGE_SIZE = 12;

  // Обновляем authToken при изменении в localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('authToken'));
    };
    
    // Проверяем токен при монтировании
    handleStorageChange();
    
    // Слушаем изменения в localStorage
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleOpenPhoto = async (imageUrl: string) => {
    setSelectedPhoto(imageUrl);
    setIsPromptVisible(true);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(imageUrl);
      if (prompt) {
        // Переводим промпт на русский для отображения
        const translatedPrompt = await translateToRussian(prompt);
        setSelectedPrompt(translatedPrompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
    } catch (error) {
      
      setPromptError('Ошибка загрузки промпта');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleAddToGallery = async (e: React.MouseEvent, photo: UserPhoto) => {
    e.stopPropagation();

    const imageUrl = photo.image_url || (photo.image_filename ? `${API_CONFIG.BASE_URL}/paid_gallery/${photo.image_filename}` : null);
    if (!imageUrl) {
      setError('Не удалось определить URL изображения');
      return;
    }

    setAddingPhotoIds(prev => new Set(prev).add(photo.id));

    try {
      const response = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/add/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          character_name: photo.character_name || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || 'Не удалось добавить фото в галерею';
        throw new Error(errorMessage);
      }

      // Показываем успешное сообщение и скрываем кнопку
      
      setAddedPhotoIds(prev => new Set(prev).add(photo.id));
    } catch (error) {
      
      setError(error instanceof Error ? error.message : 'Не удалось добавить фото в галерею');
    } finally {
      setAddingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photo.id);
        return newSet;
      });
    }
  };

  const handleDeletePhoto = async (e: React.MouseEvent, photo: UserPhoto) => {
    e.stopPropagation();

    setDeletingPhotoIds(prev => new Set(prev).add(photo.id));

    try {
      const response = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/${photo.id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || 'Не удалось удалить фото из галереи';
        throw new Error(errorMessage);
      }

      // Удаляем фото из списка
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setTotal(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      
      setError(error instanceof Error ? error.message : 'Не удалось удалить фото из галереи');
    } finally {
      setDeletingPhotoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(photo.id);
        return newSet;
      });
    }
  };

  // Загружаем ID текущего пользователя
  useEffect(() => {
    const loadCurrentUserId = async () => {
      try {
        const response = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`);
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        
      }
    };
    
    loadCurrentUserId();
  }, []);

  // Проверяем, какие фото уже есть в галерее текущего пользователя
  const photosRef = useRef<UserPhoto[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    const checkExistingPhotos = async () => {
      if (!authToken || !currentUserId || !userId || userId === currentUserId) {
        return;
      }

      // Используем ref для получения актуального списка фото без добавления в зависимости
      const currentPhotos = photosRef.current;
      if (currentPhotos.length === 0) {
        return;
      }

      try {
        const galleryResponse = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/`);
        
        if (galleryResponse.ok) {
          const galleryData = await galleryResponse.json();
          const myGalleryPhotos = galleryData.photos || [];
          const myGalleryUrls = new Set(
            myGalleryPhotos
              .map((photo: any) => photo.image_url)
              .filter((url: any): url is string => Boolean(url))
          );
          
          // Добавляем в addedPhotoIds те фото, которые уже есть в нашей галерее
          const alreadyAddedIds = new Set<number>();
          currentPhotos.forEach(photo => {
            const photoUrl = photo.image_url || (photo.image_filename ? `${API_CONFIG.BASE_URL}/paid_gallery/${photo.image_filename}` : null);
            if (photoUrl && myGalleryUrls.has(photoUrl)) {
              alreadyAddedIds.add(photo.id);
            }
          });
          
          if (alreadyAddedIds.size > 0) {
            setAddedPhotoIds(prev => {
              const newSet = new Set(prev);
              alreadyAddedIds.forEach(id => newSet.add(id));
              return newSet;
            });
          }
        }
      } catch (error) {
        
      }
    };
    
    checkExistingPhotos();
  }, [currentUserId, userId]);

  const loadGallery = useCallback(async (offset: number = 0, append: boolean = false) => {
    // Предотвращаем множественные одновременные запросы
    if (offset === 0 && isLoadingRef.current) {
      return;
    }

    if (offset === 0) {
      isLoadingRef.current = true;
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      // НЕ используем кеш при первой загрузке - всегда загружаем свежие данные
      // Кеш может содержать устаревшие данные при обновлении страницы

      // Если передан userId, загружаем галерею конкретного пользователя (с пагинацией)
      // Иначе загружаем свою галерею
      const baseUrl = userId 
        ? `${API_CONFIG.BASE_URL}/api/v1/auth/user-generated-photos/${userId}/`
        : `${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/`;
      
      // Пагинация для обеих галерей — меньше данных за раз, быстрее отображение
      const url = `${baseUrl}?limit=${PAGE_SIZE}&offset=${offset}`;
      
      const response = await authManager.fetchWithAuth(url);

      if (!response.ok) {
        if (response.status === 403) {
          // Если галерея не разблокирована, просто показываем пустую галерею
          setPhotos([]);
          setTotal(0);
          setHasMore(false);
          setError(null);
          return;
        }
        throw new Error('Не удалось загрузить галерею');
      }

      const data = await response.json();
      
      
      let newPhotos: UserPhoto[] = [];
      let totalCount = 0;
      
      // Если это endpoint для другого пользователя, данные могут быть в другом формате
      if (userId && data.photos) {
        newPhotos = data.photos || [];
        totalCount = data.total || newPhotos.length;
      } else if (userId && Array.isArray(data)) {
        // Если приходит массив напрямую (старый формат)
        newPhotos = data;
        totalCount = data.length;
      } else if (!userId && data.photos) {
        // Своя галерея с пагинацией
        newPhotos = data.photos || [];
        totalCount = data.total || 0;
      } else {
        
        newPhotos = [];
        totalCount = 0;
      }

      if (append) {
        setPhotos(prev => [...prev, ...newPhotos]);
      } else {
        setPhotos(newPhotos);
      }
      
      setTotal(totalCount);
      setHasMore(offset + newPhotos.length < totalCount);

      // Кешируем только первую страницу для будущего использования
      if (offset === 0) {
        const cacheKey = `${userId || 'me'}_${offset}`;
        photosCacheRef.current.set(cacheKey, { photos: newPhotos, total: totalCount });
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке галереи');
      
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [authToken, userId]);

  useEffect(() => {
    // Проверяем, не загружали ли мы уже эту галерею
    const currentUserIdKey = userId || 'me';
    if (lastLoadedUserIdRef.current === currentUserIdKey && photos.length > 0) {
      
      return;
    }

    // Очищаем кеш при смене userId или при монтировании компонента
    if (lastLoadedUserIdRef.current !== currentUserIdKey) {
    photosCacheRef.current.clear();
    setPhotos([]);
    setTotal(0);
    setHasMore(true);
      lastLoadedUserIdRef.current = currentUserIdKey;
    }
    
    // Загружаем галерею
    if (!isLoadingRef.current) {
      loadGallery(0, false);
    }
  }, [userId, loadGallery]);

  // Синхронизация состояния авторизации
  useEffect(() => {
    const unsubscribe = authManager.subscribeAuthChanges((state) => {
      if (!state.isAuthenticated) {
        // Если пользователь вышел, очищаем данные
        setPhotos([]);
        setTotal(0);
        setCurrentUserId(null);
        setAddedPhotoIds(new Set());
        photosCacheRef.current.clear();
        lastLoadedUserIdRef.current = undefined;
      } else {
        // Если пользователь вошел, перезагружаем данные
        lastLoadedUserIdRef.current = undefined;
        loadGallery(0, false);
        const loadCurrentUserId = async () => {
          try {
            const response = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`);
            if (response.ok) {
              const userData = await response.json();
              setCurrentUserId(userData.id);
            }
          } catch (error) {
            // Игнорируем ошибки
          }
        };
        loadCurrentUserId();
      }
    });

    return unsubscribe;
  }, [loadGallery]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadGallery(photos.length, true);
    }
  }, [loadGallery, photos.length, isLoadingMore, hasMore]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPhoto) {
        setSelectedPhoto(null);
        setSelectedPrompt(null);
        setPromptError(null);
        setIsLoadingPrompt(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPhoto]);

  return (
    <MainContainer>
      <div className="content-area vertical">
        <GlobalHeader
          onShop={onShop}
          onLogin={() => {}}
          onRegister={() => {}}
          onLogout={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.reload();
          }}
          onProfile={() => {
            // Используем глобальное событие для навигации к профилю
            window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { userId: undefined } }));
          }}
          onBalance={() => {}}
          refreshTrigger={0}
        />

        <MainContent>
          <GalleryHeader>
            <GalleryTitle>Галерея пользователя </GalleryTitle>
            <GallerySubtitle>Все фото, которые вы сгенерировали ({total > 0 ? total : photos.length})</GallerySubtitle>
          </GalleryHeader>

          {isLoading ? (
            <LoadingContainer>Загрузка...</LoadingContainer>
          ) : error ? (
            <GalleryEmpty>{error}</GalleryEmpty>
          ) : photos.length === 0 ? (
            <GalleryEmpty></GalleryEmpty>
          ) : (
            <>
            <GalleryGrid>
              {photos.map((photo, index) => {
                let imageUrl = photo.image_url || (photo.image_filename ? `${API_CONFIG.BASE_URL}/paid_gallery/${photo.image_filename}` : null);
                
                // Конвертируем старые Yandex.Cloud URL в новые через прокси
                if (imageUrl && imageUrl.includes('.storage.yandexcloud.net/')) {
                  // Извлекаем object_key из URL и создаем прокси URL
                  if (imageUrl.includes('.storage.yandexcloud.net/')) {
                    const objectKey = imageUrl.split('.storage.yandexcloud.net/')[1];
                    imageUrl = `${API_CONFIG.BASE_URL}/media/${objectKey}`;
                  } else if (imageUrl.includes('storage.yandexcloud.net/')) {
                    const pathParts = imageUrl.split('storage.yandexcloud.net/')[1].split('/', 1);
                    if (pathParts.length > 0) {
                      const afterBucket = imageUrl.split('storage.yandexcloud.net/')[1].split('/', 1)[1];
                      if (afterBucket) {
                        imageUrl = `${API_CONFIG.BASE_URL}/media/${afterBucket}`;
                      }
                    }
                  }
                }
                
                if (!imageUrl) {
                  
                  return null;
                }
                
                // Показываем кнопку "Добавить в галерею" только для чужих пользователей и если фото еще не добавлено
                const isOtherUserGallery = userId && currentUserId && userId !== currentUserId;
                const isMyGallery = !userId || (currentUserId && userId === currentUserId);
                const isAdding = addingPhotoIds.has(photo.id);
                const isAdded = addedPhotoIds.has(photo.id);
                const isDeleting = deletingPhotoIds.has(photo.id);
                
                // Первые 12 изображений загружаем сразу (eager), остальные - lazy
                const shouldLoadEager = index < 12;
                
                return (
                  <GalleryImage key={photo.id} onClick={() => handleOpenPhoto(imageUrl)}>
                      <OptimizedImage 
                        src={imageUrl} 
                        alt={photo.character_name}
                        style={{ width: '100%', height: '100%' }}
                        eager={shouldLoadEager}
                      />
                    {isOtherUserGallery && !isAdded && (
                      <AddToGalleryButton
                        onClick={(e) => handleAddToGallery(e, photo)}
                        disabled={isAdding}
                        title="Добавить в мою галерею"
                      >
                        <PlusIcon />
                        {isAdding ? 'Добавление...' : 'Добавить в галерею'}
                      </AddToGalleryButton>
                    )}
                    {isMyGallery && (
                      <DeleteButton
                        onClick={(e) => handleDeletePhoto(e, photo)}
                        disabled={isDeleting}
                        title="Удалить из галереи"
                      >
                        <TrashIcon />
                        {isDeleting ? 'Удаление...' : 'Удалить'}
                      </DeleteButton>
                    )}
                  </GalleryImage>
                );
              })}
            </GalleryGrid>
              {hasMore && (
                <LoadMoreButton 
                  onClick={handleLoadMore} 
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Загрузка...' : 'Загрузить еще'}
                </LoadMoreButton>
              )}
            </>
          )}
        </MainContent>
      </div>

      <PromptGlassModal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        imageUrl={selectedPhoto || ''}
        imageAlt="Full size"
        promptText={selectedPrompt}
        isLoading={isLoadingPrompt}
        error={promptError}
      />
    </MainContainer>
  );
};

