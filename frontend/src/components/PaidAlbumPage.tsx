import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { FiImage as ImageIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';

const PageContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: ${theme.spacing.xl};
  box-sizing: border-box;
  gap: ${theme.spacing.xl};
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.sm};
  max-width: 640px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${theme.spacing.lg};
  flex: 1;
  padding-right: ${theme.spacing.lg};
  align-items: flex-start;
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
  max-width: 220px;
  min-width: 180px;
  height: 300px;
  transition: ${theme.transition.fast};

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

const PreviewBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  padding: ${theme.spacing.xl};
`;

const PreviewContent = styled.div`
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: ${theme.spacing.xl};
  width: 100%;
`;

const PreviewImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 70%;
`;

const PreviewImage = styled.img`
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

const PreviewClose = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(244, 63, 94, 0.4);
  background: rgba(244, 63, 94, 0.2);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10;

  &:hover {
    background: rgba(244, 63, 94, 0.4);
    border-color: rgba(244, 63, 94, 0.6);
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 4px 12px rgba(244, 63, 94, 0.4);
  }
  
  &:active {
    transform: scale(0.95) rotate(90deg);
  }
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
  onBackToChat?: () => void;
  onOpenBuilder?: (character: { name: string; display_name?: string }) => void;
  canEditAlbum?: boolean;
  onUpgradeSubscription?: () => void;
}

export const PaidAlbumPage: React.FC<PaidAlbumPageProps> = ({
  character,
  onBackToChat,
  onBackToMain,
  onOpenBuilder,
  canEditAlbum = false,
  onUpgradeSubscription
}) => {
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
        setSelectedPrompt(prompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
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
      console.error('[PAID_ALBUM] Ошибка загрузки галереи пользователя:', err);
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
            console.error('Failed to refresh token:', error);
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
        setImages(Array.isArray(data.images) ? data.images : []);
      } catch (albumError) {
        console.error('Ошибка загрузки платного альбома:', albumError);
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

    setAddingToGallery(imageId);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/user-gallery/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image_url: imageUrl,
          character_name: character?.name || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Не удалось добавить фото в галерею';
        // Если фото уже добавлено, это не критическая ошибка
        if (response.status === 400 && (errorMessage.includes('уже добавлено') || errorMessage.includes('already'))) {
          // Фото уже в галерее - это нормально
          return;
        }
        throw new Error(errorMessage);
      }

      // Добавляем URL в Set, чтобы скрыть кнопку
      setGalleryImageUrls(prev => new Set(prev).add(imageUrl));
      
      // Обновляем счетчик фото в профиле
      window.dispatchEvent(new CustomEvent('gallery-update'));
    } catch (err: any) {
      console.error('[PAID_ALBUM] Ошибка при добавлении фото в галерею:', err);
      if (!err.message?.includes('уже добавлено') && !err.message?.includes('already')) {
        alert(err.message || 'Не удалось добавить фото в галерею');
      } else {
        // Если фото уже добавлено, добавляем его в Set
        setGalleryImageUrls(prev => new Set(prev).add(imageUrl));
      }
    } finally {
      setAddingToGallery(null);
    }
  };

  return (
    <PageContainer>
      <Header>
        <div>
          <Title>Платный альбом {displayName}</Title>
          <Description>
            Здесь собраны эксклюзивные фотографии персонажа. Альбом доступен только пользователям, которые его разблокировали.
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
                  {!galleryImageUrls.has(image.url) && (
                    <OverlayButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToGallery(image.url, image.id);
                      }}
                      disabled={addingToGallery === image.id}
                    >
                      <ImageIcon />
                      {addingToGallery === image.id ? 'Добавление...' : 'Добавить в галерею'}
                    </OverlayButton>
                  )}
                </OverlayActions>
              </CardOverlay>
            </Card>
          ))}
        </GalleryGrid>
      )}

      {previewImage && (
        <PreviewBackdrop onClick={() => {
          setPreviewImage(null);
          setSelectedPrompt(null);
          setPromptError(null);
          setIsLoadingPrompt(false);
        }}>
          <PreviewContent onClick={(event) => event.stopPropagation()}>
            <PreviewClose onClick={() => {
              setPreviewImage(null);
              setSelectedPrompt(null);
              setPromptError(null);
              setIsLoadingPrompt(false);
            }}>×</PreviewClose>
            <PreviewImageContainer>
              <PreviewImage src={previewImage.url} alt={displayName} />
            </PreviewImageContainer>
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
          </PreviewContent>
        </PreviewBackdrop>
      )}

      {isUpgradeModalOpen && (
        <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
          <UpgradeModal onClick={(e) => e.stopPropagation()}>
            <UpgradeTitle>Создание платного альбома недоступно</UpgradeTitle>
            <UpgradeText>
              Добавление фотографий доступно только подписчикам Standard и Premium. Оформите подписку, чтобы получать 15% от продаж альбома.
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

    </PageContainer>
  );
};


