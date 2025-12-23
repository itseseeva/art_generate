import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

const PageContainer = styled.div`
  width: 100vw;
  flex: 1;
  height: 100%;
  max-height: 100vh;
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
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Title = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${theme.colors.text.primary};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
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
        border-color: rgba(255, 255, 255, 0.12);

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

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `}
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 0.65fr 0.35fr;
  gap: ${theme.spacing.xl};
  flex: 1;
  min-height: 0;

  @media (max-width: 1440px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  background: rgba(22, 33, 62, 0.35);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  height: auto;
  max-height: 100%;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

const SectionTitle = styled.h2`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0;
  color: ${theme.colors.text.primary};
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};
  min-height: 520px;
`;

const PhotoCard = styled.div<{ $selected?: boolean }>`
  position: relative;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  border: 2px solid ${({ $selected }) => ($selected ? theme.colors.accent.primary : 'rgba(255, 255, 255, 0.08)')};
  box-shadow: ${theme.colors.shadow.card};
  cursor: pointer;
  transition: ${theme.transition.fast};
  min-height: 500px;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.35);
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  object-fit: cover;
  display: block;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.9));
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xs};
  opacity: 0;
  transition: ${theme.transition.fast};

  ${PhotoCard}:hover & {
    opacity: 1;
  }
`;

const Counter = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const InfoText = styled.p`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.text.muted};
  margin: 0;
`;

const ActionButtonsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
`;

const OverlayActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  min-width: 160px;

  & > button {
    white-space: nowrap;
  }
`;

const OverlayButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'rgba(129, 140, 248, 0.8)'
      : 'rgba(15, 23, 42, 0.7)'};
  color: ${theme.colors.text.primary};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.sm};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  cursor: pointer;
  transition: ${theme.transition.fast};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'rgba(99, 102, 241, 0.9)'
        : 'rgba(37, 47, 82, 0.9)'};
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const SavingIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.text.secondary};
  min-width: 160px;
  justify-content: center;
`;

const UpgradeNotice = styled.div`
  background: rgba(147, 197, 253, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const UpgradeTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
`;

const UpgradeText = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
`;

const UpgradeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 25, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(6px);
`;

const UpgradeModal = styled.div`
  width: min(480px, 90vw);
  background: rgba(17, 24, 39, 0.95);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.45);
  padding: ${theme.spacing.xxl};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const UpgradeModalTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
`;

const UpgradeActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const PreviewBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(6px);
`;

const PreviewContent = styled.div`
  position: relative;
  max-width: 80vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
   max-width: 100%;
  max-height: 100%;
`;

const PreviewClose = styled.button`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  cursor: pointer;
  transition: ${theme.transition.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

interface PhotoItem {
  id: string;
  url: string;
  created_at?: string;
}

interface MainPhotoSelectionPageProps {
  character: {
    name: string;
    display_name?: string;
    appearance?: string | null;
    location?: string | null;
  } | null;
  onContinue: (character: { name: string; display_name?: string; appearance?: string | null; location?: string | null }) => void;
  onBackToMain: () => void;
  onSkip?: (character: { name: string; display_name?: string; appearance?: string | null; location?: string | null }) => void;
  canCreatePaidAlbum: boolean;
  onUpgradeSubscription?: () => void;
}

const MAX_MAIN_PHOTOS = 3;

export const MainPhotoSelectionPage: React.FC<MainPhotoSelectionPageProps> = ({
  character,
  onContinue,
  onBackToMain,
  onSkip,
  canCreatePaidAlbum,
  onUpgradeSubscription,
}) => {
  const [availablePhotos, setAvailablePhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const characterName = character?.display_name || character?.name || '';

  useEffect(() => {
    return () => {
      if (fakeProgressIntervalRef.current) {
        clearInterval(fakeProgressIntervalRef.current);
        fakeProgressIntervalRef.current = null;
      }
      if (fakeProgressTimeoutRef.current) {
        clearTimeout(fakeProgressTimeoutRef.current);
        fakeProgressTimeoutRef.current = null;
      }
    };
  }, []);

  const startFakeProgress = useCallback(() => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }

    setFakeProgress(0);
    fakeProgressIntervalRef.current = setInterval(() => {
      setFakeProgress(prev => (prev >= 95 ? prev : prev + 1));
    }, 300);

    fakeProgressTimeoutRef.current = setTimeout(() => {
      setFakeProgress(99);
    }, 30_000);
  }, []);

  const stopFakeProgress = useCallback((finalValue: number) => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    setFakeProgress(finalValue);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!character?.name) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const mainResponse = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_MAIN_PHOTOS_FULL(character.name));
        if (mainResponse.ok) {
          const mainData = await mainResponse.json();
          setSelectedPhotos(Array.isArray(mainData.photos) ? mainData.photos : []);
        } else if (mainResponse.status === 404) {
          setSelectedPhotos([]);
        } else {
          console.warn('Не удалось загрузить главные фотографии персонажа', mainResponse.status);
          setSelectedPhotos([]);
        }

        const galleryResponse = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_PHOTOS_FULL(character.name));
        if (galleryResponse.ok) {
          const galleryData = await galleryResponse.json();
          const rawPhotos = (Array.isArray(galleryData)
            ? galleryData
            : galleryData?.images || galleryData?.photos || []) as Array<Record<string, unknown> | string>;
          const photos: PhotoItem[] = rawPhotos
            .map((item) => {
              if (typeof item === 'string') {
                return {
                  id: item,
                  url: item,
                } as PhotoItem;
              }

              const record = item ?? {};
              const idValue = record.id ?? record.photo_id ?? record.url ?? record.photo_url ?? '';
              const urlValue = typeof record.url === 'string'
                ? record.url
                : typeof record.photo_url === 'string'
                  ? record.photo_url
                  : '';

              if (!urlValue) {
                return null;
              }

              return {
                id: String(idValue || urlValue),
                url: urlValue,
                created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
              } as PhotoItem;
            })
            .filter((item): item is PhotoItem => Boolean(item && item.url));
          setAvailablePhotos(photos);
        } else if (galleryResponse.status === 404) {
          setAvailablePhotos([]);
        } else {
          console.warn('Не удалось загрузить фотографии персонажа', galleryResponse.status);
          setAvailablePhotos([]);
        }
      } catch (loadError) {
        console.error('Ошибка загрузки фото персонажа:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить фотографии');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [character?.name]);

  const toggleSelection = async (photo: PhotoItem) => {
    if (!character?.name) {
      setError('Не удалось определить персонажа для сохранения фотографий.');
      return;
    }

    const photoKey = photo.id || photo.url;

    if (isSaving) {
      return;
    }

    setError(null);

    const prevSelected = selectedPhotos;
    const exists = prevSelected.some(item => item.id === photo.id || item.url === photo.url);
    let nextSelected: PhotoItem[];

    if (exists) {
      nextSelected = prevSelected.filter(item => item.id !== photo.id && item.url !== photo.url);
    } else {
      if (prevSelected.length >= MAX_MAIN_PHOTOS) {
        setError(`Можно выбрать максимум ${MAX_MAIN_PHOTOS} фотографии.`);
        return;
      }
      nextSelected = [...prevSelected, photo];
    }

    setSelectedPhotos(nextSelected);
    setIsSaving(true);
    setPendingPhotoId(photoKey);

    try {
      const response = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character_name: character.name,
          photos: nextSelected
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (data && (data.detail || data.message)) || 'Не удалось обновить главные фотографии';
        throw new Error(message);
      }
    } catch (toggleError) {
      console.error('Ошибка сохранения главных фотографий:', toggleError);
      setSelectedPhotos(prevSelected);
      setError(toggleError instanceof Error ? toggleError.message : 'Не удалось обновить главные фотографии');
    } finally {
      setIsSaving(false);
      setPendingPhotoId(null);
    }
  };

  const handleGeneratePhoto = async () => {
    if (!character?.name) {
      return;
    }

    setIsGenerating(true);
    startFakeProgress();
    setError(null);

    try {
      let effectivePrompt = prompt.trim();
      if (!effectivePrompt) {
        const parts = [character.appearance, character.location].filter(p => p && p.trim());
        effectivePrompt = parts.length > 0 ? parts.join(' | ') : '';
      }

      const response = await authManager.fetchWithAuth(API_CONFIG.GENERATE_IMAGE_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character: character.name,
          prompt: effectivePrompt,
          use_default_prompts: false,
          model: 'anime-realism'  // Дефолтная модель для MainPhotoSelectionPage
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = (data && (data.detail || data.message)) || 'Не удалось сгенерировать изображение';
        throw new Error(message);
      }

      const result = await response.json();
      if (!result.image_url) {
        throw new Error('Сервер не вернул URL изображения');
      }

      const photo: PhotoItem = {
        id: result.image_id || `${Date.now()}`,
        url: result.image_url,
        created_at: new Date().toISOString()
      };

      setAvailablePhotos(prev => [photo, ...prev]);
      setError(null);
      stopFakeProgress(100);
    } catch (generateError) {
      console.error('Ошибка генерации фото:', generateError);
      setError(generateError instanceof Error ? generateError.message : 'Не удалось сгенерировать фото');
      stopFakeProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkip = () => {
    if (!character) {
      return;
    }

    if (canCreatePaidAlbum) {
      onContinue(character);
      return;
    }

    setIsUpgradeModalOpen(true);
  };

  const orderedAvailablePhotos = useMemo(() => {
    return availablePhotos;
  }, [availablePhotos]);

  const handleOpenPreview = (photo: PhotoItem) => {
    setPreviewPhoto(photo);
  };

  const handleClosePreview = () => setPreviewPhoto(null);

  return (
    <PageContainer>
      <Header>
        <Title>Выберите главные фотографии {characterName}</Title>
        <Subtitle>До трёх снимков будут отображаться на карточке персонажа. Вы можете сгенерировать новые изображения или выбрать из уже созданных.</Subtitle>

        <Actions>
          <ActionButton $variant="secondary" onClick={handleSkip}>
            Пропустить
          </ActionButton>
          <ActionButton $variant="secondary" onClick={onBackToMain}>
            На главную
          </ActionButton>
        </Actions>
      </Header>

      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
      {!canCreatePaidAlbum && (
        <UpgradeNotice>
          <UpgradeTitle>Создание платного альбома недоступно</UpgradeTitle>
          <UpgradeText>
            Оформите подписку Standard или Premium, чтобы собирать платные альбомы и добавлять больше фото.
          </UpgradeText>
          <ActionButton
            onClick={() => onUpgradeSubscription?.()}
            style={{ alignSelf: 'flex-start', padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontSize: theme.fontSize.xs }}
          >
            Оформить подписку
          </ActionButton>
        </UpgradeNotice>
      )}

      {isLoading ? (
        <LoadingSpinner text="Загружаем фотографии персонажа..." />
      ) : (
        <Layout>
          <Section>
            <SectionHeader>
              <SectionTitle>Доступные изображения</SectionTitle>
              <Counter>Выбрано {selectedPhotos.length} / {MAX_MAIN_PHOTOS}</Counter>
            </SectionHeader>
            <InfoText>Нажмите на изображение, чтобы добавить или удалить его из карточки.</InfoText>

            <PhotoGrid>
              {orderedAvailablePhotos.map(photo => {
                const photoKey = photo.id || photo.url;
                const isSelected = selectedPhotos.some(item => item.id === photo.id || item.url === photo.url);
                const isPending = pendingPhotoId === photoKey && isSaving;

                return (
                  <PhotoCard
                    key={photo.id}
                    $selected={isSelected}
                  >
                    <PhotoImage
                      src={photo.url}
                      alt={characterName}
                      loading="lazy"
                      onClick={() => handleOpenPreview(photo)}
                    />
                    <PhotoOverlay>
                      <span>
                        {isSelected ? 'Добавлено в карточку' : 'Ещё не выбрано'}
                      </span>
                      {isPending ? (
                        <SavingIndicator>
                          <LoadingSpinner size="sm" variant="dots" />
                          <span>Сохраняем...</span>
                        </SavingIndicator>
                      ) : (
                        <OverlayActions>
                          <OverlayButton
                            $variant="primary"
                            onClick={() => toggleSelection(photo)}
                            disabled={isSaving}
                          >
                            {isSelected ? 'Убрать' : 'Добавить'}
                          </OverlayButton>
                          <OverlayButton onClick={() => handleOpenPreview(photo)}>
                            Просмотр
                          </OverlayButton>
                        </OverlayActions>
                      )}
                    </PhotoOverlay>
                  </PhotoCard>
                );
              })}
            </PhotoGrid>
          </Section>

          <Section>
            <SectionTitle>Промпт для генерации</SectionTitle>
            <textarea
              style={{
                minHeight: '120px',
                resize: 'vertical',
                borderRadius: theme.borderRadius.lg,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(22, 33, 62, 0.3)',
                padding: theme.spacing.md,
                color: theme.colors.text.primary,
              }}
              placeholder="Опишите желаемое изображение..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <InfoText>
              Если поле оставить пустым, мы используем описание внешности и окружения персонажа.
            </InfoText>

            <ActionButtonsRow>
              <ActionButton onClick={handleGeneratePhoto} disabled={isGenerating} style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing.sm }}>
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" /> Генерация... {fakeProgress}%
                  </>
                ) : (
                  'Сгенерировать фото (30 кредитов)'
                )}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  if (!character) {
                    return;
                  }

                  if (canCreatePaidAlbum) {
                    onContinue(character);
                    return;
                  }

                  setIsUpgradeModalOpen(true);
                }}
              >
                Продолжить
              </ActionButton>
            </ActionButtonsRow>

            <InfoText>
              Изменения сохраняются автоматически при добавлении или удалении фотографии из карточки персонажа.
            </InfoText>
            {!canCreatePaidAlbum && (
              <InfoText>
                Для создания платного альбома оформите подписку Standard или Premium.
              </InfoText>
            )}
          </Section>
        </Layout>
      )}

      {previewPhoto && (
        <PreviewBackdrop onClick={handleClosePreview}>
          <PreviewContent onClick={(event) => event.stopPropagation()}>
            <PreviewClose onClick={handleClosePreview}>×</PreviewClose>
            <PreviewImage src={previewPhoto.url} alt={characterName} />
          </PreviewContent>
        </PreviewBackdrop>
      )}

      {isUpgradeModalOpen && (
        <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
          <UpgradeModal onClick={(e) => e.stopPropagation()}>
            <UpgradeModalTitle>Третья стадия недоступна</UpgradeModalTitle>
            <UpgradeText>
              Платный альбом — третья стадия создания персонажа. Для подписчиков Standard и Premium он даёт 15% от продаж. Оформите подписку, чтобы продолжить.
            </UpgradeText>
            <UpgradeActions>
              <ActionButton onClick={() => {
                setIsUpgradeModalOpen(false);
                onUpgradeSubscription?.();
              }}>
                Оформить подписку
              </ActionButton>
              <ActionButton $variant="secondary" onClick={() => {
                setIsUpgradeModalOpen(false);
                if (character && onSkip) {
                  onSkip(character);
                  return;
                }

                if (character) {
                  onContinue(character);
                  return;
                }

                onBackToMain();
              }}>
                Продолжить без альбома
              </ActionButton>
            </UpgradeActions>
          </UpgradeModal>
        </UpgradeOverlay>
      )}
    </PageContainer>
  );
};


