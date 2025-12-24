import React, { useCallback, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { FiX as CloseIcon, FiPlus as PlusIcon, FiTrash2 as TrashIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import { OptimizedImage } from './ui/OptimizedImage';

const MainContainer = styled.div`
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: ${theme.colors.background.primary};
`;


const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.xl};
`;

const GalleryHeader = styled.div`
  margin-bottom: ${theme.spacing.xl};
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.xl};
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: ${theme.spacing.xl};
  width: 100%;
`;

const ModalImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 70%;
`;

const ModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const PromptPanel = styled.div`
  width: 400px;
  min-width: 350px;
  max-width: 30%;
  background: rgba(30, 30, 30, 0.95);
  border: 2px solid rgba(150, 150, 150, 0.5);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
`;

const PromptPanelHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xl};
  font-weight: 800;
  margin: 0;
`;

const PromptPanelText = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.sm};
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: ${theme.spacing.md};
  background: rgba(40, 40, 40, 0.5);
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  font-family: 'Courier New', monospace;
  flex: 1;
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  transition: ${theme.transition.fast};
  z-index: 10001;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: ${theme.colors.accent.primary};
    transform: scale(1.1);
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
  
  const PAGE_SIZE = 20;

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
      console.error('[UserGalleryPage] Ошибка загрузки/перевода промпта:', error);
      setPromptError('Ошибка загрузки промпта');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleAddToGallery = async (e: React.MouseEvent, photo: UserPhoto) => {
    e.stopPropagation();
    
    if (!authToken) {
      setError('Необходима авторизация');
      return;
    }

    const imageUrl = photo.image_url || (photo.image_filename ? `http://localhost:8000/paid_gallery/${photo.image_filename}` : null);
    if (!imageUrl) {
      setError('Не удалось определить URL изображения');
      return;
    }

    setAddingPhotoIds(prev => new Set(prev).add(photo.id));

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/user-gallery/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
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
      console.log('[USER_GALLERY] Фото успешно добавлено в галерею');
      setAddedPhotoIds(prev => new Set(prev).add(photo.id));
    } catch (error) {
      console.error('[USER_GALLERY] Ошибка добавления фото в галерею:', error);
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
    
    if (!authToken) {
      setError('Необходима авторизация');
      return;
    }

    setDeletingPhotoIds(prev => new Set(prev).add(photo.id));

    try {
      const response = await fetch(`http://localhost:8000/api/v1/auth/user-gallery/${photo.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || 'Не удалось удалить фото из галереи';
        throw new Error(errorMessage);
      }

      // Удаляем фото из списка
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      setTotal(prev => Math.max(0, prev - 1));
      console.log('[USER_GALLERY] Фото успешно удалено из галереи');
    } catch (error) {
      console.error('[USER_GALLERY] Ошибка удаления фото из галереи:', error);
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
      if (!authToken) return;
      
      try {
        const response = await fetch('http://localhost:8000/api/v1/auth/me/', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error('[USER_GALLERY] Ошибка загрузки ID текущего пользователя:', error);
      }
    };
    
    loadCurrentUserId();
  }, [authToken]);

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
        const galleryResponse = await fetch('http://localhost:8000/api/v1/auth/user-gallery/', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
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
            const photoUrl = photo.image_url || (photo.image_filename ? `http://localhost:8000/paid_gallery/${photo.image_filename}` : null);
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
        console.error('[USER_GALLERY] Ошибка проверки своей галереи:', error);
      }
    };
    
    checkExistingPhotos();
  }, [authToken, currentUserId, userId]);

  const loadGallery = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!authToken) {
      setError('Необходима авторизация');
      setIsLoading(false);
      return;
    }

    // Предотвращаем множественные одновременные запросы
    if (offset === 0 && isLoadingRef.current) {
      console.log('[USER_GALLERY] Загрузка уже выполняется, пропускаем');
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

      // Если передан userId, загружаем галерею конкретного пользователя
      // Иначе загружаем свою галерею
      const baseUrl = userId 
        ? `http://localhost:8000/api/v1/auth/user-generated-photos/${userId}/`
        : 'http://localhost:8000/api/v1/auth/user-gallery/';
      
      // Добавляем параметры пагинации только для своей галереи
      const url = userId 
        ? baseUrl
        : `${baseUrl}?limit=${PAGE_SIZE}&offset=${offset}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

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
      console.log('[USER_GALLERY] Получены данные:', { userId, offset, data });
      
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
        console.warn('[USER_GALLERY] Не удалось определить формат данных');
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
      console.error('[GALLERY] Ошибка загрузки:', err);
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
      console.log('[USER_GALLERY] Галерея уже загружена, пропускаем');
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
    
    // Загружаем галерею только если есть токен авторизации
    if (authToken && !isLoadingRef.current) {
    loadGallery(0, false);
    } else if (!authToken) {
      setIsLoading(false);
      setError('Необходима авторизация');
    }
  }, [authToken, userId, loadGallery]);

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
                const imageUrl = photo.image_url || (photo.image_filename ? `http://localhost:8000/paid_gallery/${photo.image_filename}` : null);
                if (!imageUrl) {
                  console.warn('[USER_GALLERY] Photo without URL:', photo);
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
                        onLoad={() => console.log('[USER_GALLERY] Image loaded:', imageUrl, 'index:', index)}
                        onError={() => console.error('[USER_GALLERY] Image load error:', imageUrl, photo, 'index:', index)}
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

      {selectedPhoto && (
        <ModalOverlay onClick={() => {
          setSelectedPhoto(null);
          setSelectedPrompt(null);
          setPromptError(null);
          setIsLoadingPrompt(false);
        }}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={() => {
              setSelectedPhoto(null);
              setSelectedPrompt(null);
              setPromptError(null);
              setIsLoadingPrompt(false);
            }}>
              <CloseIcon />
            </CloseButton>
            <ModalImageContainer>
              <ModalImage src={selectedPhoto} alt="Full size" />
            </ModalImageContainer>
            <PromptPanel>
              <PromptPanelHeader>
                <PromptPanelTitle>Промпт для изображения</PromptPanelTitle>
              </PromptPanelHeader>
              {isLoadingPrompt ? (
                <PromptLoading>Загрузка промпта...</PromptLoading>
              ) : promptError ? (
                <PromptError>{promptError}</PromptError>
              ) : selectedPrompt ? (
                <PromptPanelText>{selectedPrompt}</PromptPanelText>
              ) : null}
            </PromptPanel>
          </ModalContent>
        </ModalOverlay>
      )}
    </MainContainer>
  );
};

