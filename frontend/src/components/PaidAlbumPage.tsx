import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { GlobalHeader } from './GlobalHeader';
import { FiImage as ImageIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import { API_CONFIG } from '../config/api';
import { useIsMobile } from '../hooks/useIsMobile';
import { PromptGlassModal } from './PromptGlassModal';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: relative;
`;

const HeaderWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  background: transparent;
`;

const PageContainer = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: ${theme.spacing.xl};
  box-sizing: border-box;
  gap: ${theme.spacing.xl};
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const Title = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${theme.colors.text.primary};

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Description = styled.p`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.sm};
  max-width: 640px;

  @media (max-width: 768px) {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const UpgradeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 25, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const UpgradeModal = styled.div`
  width: min(480px, 90vw);
  background: rgba(17, 24, 39, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.55);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const UpgradeTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
`;

const UpgradeText = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
`;

const UpgradeActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-transform: uppercase;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid transparent;
  cursor: pointer;
  transition: ${theme.transition.fast};

  ${({ $variant }) => 
    $variant === 'secondary'
      ? `
        background: transparent;
        color: ${theme.colors.text.secondary};
        border-color: rgba(255, 255, 255, 0.15);

        &:hover {
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.accent.primary};
        }
      `
      : `
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: ${theme.colors.text.primary};
        box-shadow: ${theme.colors.shadow.button};

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(99, 102, 241, 0.35);
        }
      `};
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.sm};
  flex: 1;
  padding-right: ${theme.spacing.lg};
  align-items: flex-start;
  align-content: start;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    padding-right: 0;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.375rem;
  }
`;

const Card = styled.div`
  position: relative;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: rgba(22, 33, 62, 0.3);
  border: 2px solid rgba(102, 126, 234, 0.4);
  box-shadow: ${theme.colors.shadow.card};
  cursor: pointer;
  width: 100%;
  height: 300px;
  transition: ${theme.transition.fast};

  @media (max-width: 768px) {
    height: 200px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
    border-color: rgba(102, 126, 234, 0.6);
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const CardOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xs};
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.9));
  opacity: 0;
  transition: ${theme.transition.fast};

  ${Card}:hover & {
    opacity: 1;
  }

  @media (max-width: 768px) {
    opacity: 1;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.25rem 0.5rem;
  }
`;

const OverlayActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const OverlayButton = styled.button`
  background: rgba(102, 126, 234, 0.9);
  color: ${theme.colors.text.primary};
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: ${theme.borderRadius.sm};
  padding: 0.15rem ${theme.spacing.sm};
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  line-height: 1.1;
  min-width: 72px;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(102, 126, 234, 1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  color: ${theme.colors.text.secondary};
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
`;

interface PaidAlbumImage {
  id: string;
  url: string;
  created_at?: string;
}

interface PaidAlbumPageProps {
  character: {
    name: string;
    display_name?: string;
  } | null;
  onBackToMain: () => void;
  onShop?: () => void;
  onProfile?: () => void;
  onHome?: () => void;
  onBackToChat?: () => void;
  onOpenBuilder?: (character: { name: string; display_name?: string }) => void;
  canEditAlbum?: boolean;
  onUpgradeSubscription?: () => void;
}

export const PaidAlbumPage: React.FC<PaidAlbumPageProps> = ({
  character,
  onBackToChat,
  onBackToMain,
  onShop,
  onProfile,
  onHome,
  onOpenBuilder,
  canEditAlbum = false,
  onUpgradeSubscription
}) => {
  const isMobile = useIsMobile();
  const [images, setImages] = useState<PaidAlbumImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PaidAlbumImage | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [addingToGallery, setAddingToGallery] = useState<string | null>(null);
  const [galleryImageUrls, setGalleryImageUrls] = useState<Set<string>>(new Set());
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  const handleOpenImage = async (image: PaidAlbumImage) => {
    setPreviewImage(image);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(image.url);
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

  // Загружаем список фото из галереи пользователя
  const loadUserGallery = React.useCallback(async () => {
    const token = authManager.getToken();
    if (!token) {
      return;
    }

    try {
      const response = await authManager.fetchWithAuth('/api/v1/auth/user-gallery/');
      if (response.ok) {
        const data = await response.json();
        const photos = data.photos || [];
        // Создаем Set из URL'ов фото для быстрой проверки
        const urls = new Set<string>(photos.map((photo: any) => photo.image_url).filter((url: any): url is string => Boolean(url)));
        setGalleryImageUrls(urls);
      }
    } catch (err) {
      
    }
  }, []);

  useEffect(() => {
    loadUserGallery();

    // Слушаем событие обновления галереи
    const handleGalleryUpdate = () => {
      loadUserGallery();
    };

    window.addEventListener('gallery-update', handleGalleryUpdate);
    return () => {
      window.removeEventListener('gallery-update', handleGalleryUpdate);
    };
  }, [loadUserGallery]);

  useEffect(() => {
    const loadAlbum = async () => {
      if (!character?.name) {
        return;
      }

      // Даем время для загрузки токена после перезагрузки страницы
      await new Promise(resolve => setTimeout(resolve, 500));

      // Проверяем наличие токена перед загрузкой
      const token = authManager.getToken();
      if (!token) {
        // Пытаемся обновить токен через refresh token
        const refreshToken = authManager.getRefreshToken();
        if (refreshToken) {
          try {
            await authManager.refreshAccessToken();
          } catch (error) {
            
            setError('Требуется авторизация для просмотра платного альбома');
            setIsLoading(false);
            return;
          }
        } else {
          setError('Требуется авторизация для просмотра платного альбома');
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const encodedName = encodeURIComponent(character.name);
        const statusResponse = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}/status/`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setIsOwner(Boolean(statusData?.is_owner));
        }

        const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = (data && (data.detail || data.message)) || 'Не удалось загрузить платный альбом';
          throw new Error(message);
        }

        const data = await response.json();
        const loadedImages = Array.isArray(data.images) ? data.images : [];
        // Обрабатываем URL'ы, чтобы они были абсолютными
        const processedImages = loadedImages.map((img: any) => {
          let imageUrl: string | null = null;
          
          if (typeof img === 'string') {
            imageUrl = img;
          } else if (img && typeof img === 'object') {
            imageUrl = img.url || null;
          }
          
          if (!imageUrl) {
            return null;
          }
          
          // Конвертируем старые Yandex.Cloud URL в новые через прокси
          if (imageUrl.includes('.storage.yandexcloud.net/')) {
            // Извлекаем object_key из URL и создаем прокси URL
            const objectKey = imageUrl.split('.storage.yandexcloud.net/')[1];
            if (objectKey) {
              imageUrl = `${API_CONFIG.BASE_URL}/media/${objectKey}`;
            }
          } else if (imageUrl.includes('storage.yandexcloud.net/')) {
            const pathParts = imageUrl.split('storage.yandexcloud.net/')[1].split('/', 1);
            if (pathParts.length > 0) {
              const afterBucket = imageUrl.split('storage.yandexcloud.net/')[1].split('/', 1)[1];
              if (afterBucket) {
                imageUrl = `${API_CONFIG.BASE_URL}/media/${afterBucket}`;
              }
            }
          } else if (!imageUrl.startsWith('http')) {
            // Если это относительный путь, добавляем BASE_URL
            imageUrl = imageUrl.startsWith('/') ? `${API_CONFIG.BASE_URL}${imageUrl}` : `${API_CONFIG.BASE_URL}/${imageUrl}`;
          }
          
          return {
            id: typeof img === 'string' 
              ? img.split('/').pop()?.split('.')[0] || img
              : (img.id || imageUrl?.split('/').pop()?.split('.')[0] || `${Date.now()}-${Math.random()}`),
            url: imageUrl,
            created_at: typeof img === 'object' && img.created_at ? img.created_at : new Date().toISOString()
          };
        }).filter((img: any): img is PaidAlbumImage => img !== null);
        setImages(processedImages);
      } catch (albumError) {
        
        setError(albumError instanceof Error ? albumError.message : 'Не удалось загрузить платный альбом');
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbum();
  }, [character?.name]);

  const displayName = character?.display_name || character?.name || '';

  const handleAddToGallery = async (imageUrl: string, imageId: string) => {
    const token = authManager.getToken();
    if (!token) {
      alert('Необходима авторизация');
      return;
    }

    if (!character?.name) {
      alert('Персонаж не выбран');
      return;
    }

    // Кнопка показывается только для не-владельцев, добавляем в галерею пользователя
    setAddingToGallery(imageId);
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/add/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            image_url: imageUrl,
            character_name: character.name || null
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || 'Не удалось добавить фото в галерею';
        // Если фото уже добавлено, это не критическая ошибка
        if (response.status === 400 && (errorMessage.includes('уже добавлено') || errorMessage.includes('already'))) {
          setGalleryImageUrls(prev => new Set(prev).add(imageUrl));
          return;
        }
        throw new Error(errorMessage);
      }

      // Обновляем состояние и галерею
      setGalleryImageUrls(prev => new Set(prev).add(imageUrl));
      window.dispatchEvent(new CustomEvent('gallery-update'));
    } catch (err: any) {
      alert(err.message || 'Не удалось добавить фото в галерею');
    } finally {
      setAddingToGallery(null);
    }
  };

  return (
    <MainContainer>
      <HeaderWrapper>
        <GlobalHeader 
          onShop={onShop}
          onProfile={onProfile}
          onHome={onHome || onBackToMain}
        />
      </HeaderWrapper>
      <PageContainer>
        <Header>
        <div>
          <Title>Платный альбом {displayName}</Title>
          <Description>
            Здесь собраны фотографии персонажа, которые создал пользователь. В альбоме не содержатся фотографии 18+ и откровенного контента.
          </Description>
        </div>

        <Actions>
          {isOwner && onOpenBuilder && character && (
            <ActionButton
              onClick={() => {
                if (!canEditAlbum) {
                  setIsUpgradeModalOpen(true);
                  return;
                }

                onOpenBuilder(character);
              }}
            >
              Добавить фото
            </ActionButton>
          )}
          <ActionButton $variant="secondary" onClick={onBackToChat}>
            Вернуться в чат
          </ActionButton>
          <ActionButton $variant="secondary" onClick={onBackToMain}>
            На главную
          </ActionButton>
        </Actions>
      </Header>

      {isLoading ? (
        <LoadingSpinner text="Загружаем альбом..." />
      ) : error ? (
        <ErrorMessage message={error} onClose={() => setError(null)} />
      ) : images.length === 0 ? (
        <EmptyState>
          <strong>В альбоме пока нет фотографий</strong>
          {isOwner ? (
            <span>Добавьте изображения, чтобы платный альбом выглядел привлекательно.</span>
          ) : (
            <span>Создатель персонажа ещё не добавил платные фотографии.</span>
          )}
        </EmptyState>
      ) : (
        <GalleryGrid>
          {images.map((image) => (
            <Card key={image.id} onClick={() => handleOpenImage(image)}>
              <CardImage
                src={image.url}
                alt={displayName}
                loading="lazy"
              />
              <CardOverlay>
                <OverlayActions>
                  {!isOwner && !galleryImageUrls.has(image.url) && (
                    <OverlayButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGallery(image.url, image.id);
                      }}
                      disabled={addingToGallery === image.id}
                    >
                      <ImageIcon />
                      {addingToGallery === image.id ? 'Добавление...' : 'В галерею'}
                    </OverlayButton>
                  )}
                </OverlayActions>
              </CardOverlay>
            </Card>
          ))}
        </GalleryGrid>
      )}

      <PromptGlassModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        imageAlt={displayName}
        promptText={selectedPrompt}
        isLoading={isLoadingPrompt}
        error={promptError}
      />

      </PageContainer>
      {isUpgradeModalOpen && (
        <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
          <UpgradeModal onClick={(e) => e.stopPropagation()}>
            <UpgradeTitle>Разблокировка альбома недоступна</UpgradeTitle>
            <UpgradeText>
              В альбоме не содержатся фотографии 18+ и откровенного контента. Разблокировка и добавление фотографий в альбом доступны только подписчикам Standard и Premium. Оформите подписку, чтобы получить доступ к этой функции.
            </UpgradeText>
            <UpgradeActions>
              <ActionButton onClick={() => {
                setIsUpgradeModalOpen(false);
                onUpgradeSubscription?.();
              }}>
                Оформить подписку
              </ActionButton>
              <ActionButton $variant="secondary" onClick={() => setIsUpgradeModalOpen(false)}>
                Понятно
              </ActionButton>
            </UpgradeActions>
          </UpgradeModal>
        </UpgradeOverlay>
      )}
    </MainContainer>
  );
};
