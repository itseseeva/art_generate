import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { FiX as CloseIcon, FiPlus as PlusIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';

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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
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
  const authToken = localStorage.getItem('authToken');

  const handleOpenPhoto = async (imageUrl: string) => {
    setSelectedPhoto(imageUrl);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(imageUrl);
      if (prompt) {
        setSelectedPrompt(prompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
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
  useEffect(() => {
    const checkExistingPhotos = async () => {
      if (!authToken || !currentUserId || !userId || userId === currentUserId || photos.length === 0) {
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
          photos.forEach(photo => {
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
  }, [authToken, currentUserId, userId, photos]);

  const loadGallery = useCallback(async () => {
    if (!authToken) {
      setError('Необходима авторизация');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Если передан userId, загружаем галерею конкретного пользователя
      // Иначе загружаем свою галерею
      const url = userId 
        ? `http://localhost:8000/api/v1/auth/user-generated-photos/${userId}/`
        : 'http://localhost:8000/api/v1/auth/user-gallery/';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          // Если галерея не разблокирована, просто показываем пустую галерею
          // Уведомление уже было показано на странице профиля при нажатии на кнопку
          setPhotos([]);
          setError(null);
          return;
        }
        throw new Error('Не удалось загрузить галерею');
      }

      const data = await response.json();
      console.log('[USER_GALLERY] Получены данные:', { userId, data, hasPhotos: !!data.photos, photosCount: data.photos?.length || 0 });
      
      // Если это endpoint для другого пользователя, данные могут быть в другом формате
      if (userId && data.photos) {
        console.log('[USER_GALLERY] Устанавливаем фото из data.photos:', data.photos.length);
        setPhotos(data.photos || []);
      } else if (userId && Array.isArray(data)) {
        // Если приходит массив напрямую
        console.log('[USER_GALLERY] Устанавливаем фото из массива:', data.length);
        setPhotos(data);
      } else if (!userId && data.photos) {
        console.log('[USER_GALLERY] Устанавливаем свою галерею:', data.photos.length);
        setPhotos(data.photos || []);
      } else {
        console.warn('[USER_GALLERY] Не удалось определить формат данных, устанавливаем пустой массив');
        setPhotos([]);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке галереи');
      console.error('[GALLERY] Ошибка загрузки:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, userId]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

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
            <GallerySubtitle>Все фото, которые вы сгенерировали ({photos.length})</GallerySubtitle>
          </GalleryHeader>

          {isLoading ? (
            <LoadingContainer>Загрузка...</LoadingContainer>
          ) : error ? (
            <GalleryEmpty>{error}</GalleryEmpty>
          ) : photos.length === 0 ? (
            <GalleryEmpty></GalleryEmpty>
          ) : (
            <GalleryGrid>
              {photos.map((photo) => {
                const imageUrl = photo.image_url || (photo.image_filename ? `http://localhost:8000/paid_gallery/${photo.image_filename}` : null);
                if (!imageUrl) return null;
                
                // Показываем кнопку "Добавить в галерею" только для чужих пользователей и если фото еще не добавлено
                const isOtherUserGallery = userId && currentUserId && userId !== currentUserId;
                const isAdding = addingPhotoIds.has(photo.id);
                const isAdded = addedPhotoIds.has(photo.id);
                
                return (
                  <GalleryImage key={photo.id} onClick={() => handleOpenPhoto(imageUrl)}>
                    <img src={imageUrl} alt={photo.character_name} />
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
                  </GalleryImage>
                );
              })}
            </GalleryGrid>
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

