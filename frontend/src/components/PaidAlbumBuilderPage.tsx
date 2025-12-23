import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { SuccessToast } from './SuccessToast';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish } from '../utils/translate';

const UpgradeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const UpgradeModal = styled.div`
  width: min(480px, 90vw);
  background: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.5);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const UpgradeTitle = styled.h3`
  margin: 0;
  color: rgba(240, 240, 240, 1);
  font-size: 1.5rem;
  font-weight: 700;
`;

const UpgradeText = styled.p`
  margin: 0;
  color: rgba(160, 160, 160, 1);
  font-size: 0.875rem;
  line-height: 1.6;
`;

const UpgradeActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const PageContainer = styled.div`
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  background: rgba(20, 20, 20, 1);
  padding: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  width: 100%;
  min-height: 100%;
`;

const Header = styled.header`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin: 0;
`;

const Subtitle = styled.p`
  margin-top: 0.5rem;
  color: rgba(160, 160, 160, 1);
  font-size: 1rem;
`;


const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;

  ${({ $variant }) =>
    $variant === 'secondary'
      ? `
        background: rgba(60, 60, 60, 0.8);
        color: rgba(200, 200, 200, 1);
        border-color: rgba(150, 150, 150, 0.3);

        &:hover {
          color: rgba(240, 240, 240, 1);
          border-color: rgba(180, 180, 180, 0.5);
          background: rgba(80, 80, 80, 0.9);
        }
      `
      : `
        background: rgba(120, 120, 120, 0.8);
        color: rgba(240, 240, 240, 1);
        border: none;

        &:hover:not(:disabled) {
          background: rgba(140, 140, 140, 0.9);
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}
`;

const Layout = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.div`
  background: rgba(40, 40, 40, 0.5);
  border-radius: 0.5rem;
  padding: 2rem;
  border: 1px solid rgba(150, 150, 150, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0;
`;

const PromptArea = styled.textarea`
  background: rgba(30, 30, 30, 0.8);
  border-radius: 0.5rem;
  border: 1px solid rgba(150, 150, 150, 0.3);
  padding: 0.75rem;
  color: rgba(240, 240, 240, 1);
  min-height: 140px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: rgba(180, 180, 180, 0.6);
  }

  &::placeholder {
    color: rgba(160, 160, 160, 0.7);
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  align-items: start;
  justify-items: center;
  max-height: calc(100vh - 20rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 30, 30, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(150, 150, 150, 0.5);
    border-radius: 4px;
    
    &:hover {
      background: rgba(180, 180, 180, 0.7);
    }
  }
`;

const PhotoCard = styled.div<{ $selected?: boolean }>`
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 2px solid ${({ $selected }) => ($selected ? 'rgba(180, 180, 180, 0.6)' : 'rgba(150, 150, 150, 0.3)')};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 220px;
  min-width: 200px;
  aspect-ratio: 2 / 3;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    border-color: rgba(180, 180, 180, 0.5);
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.9));
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: rgba(240, 240, 240, 1);
  font-size: 0.75rem;
  opacity: 0;
  transition: all 0.3s ease;

  ${PhotoCard}:hover & {
    opacity: 1;
  }
`;

const PromptModal = styled.div`
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
  z-index: 10001;
  padding: ${theme.spacing.xl};
  animation: fadeIn 0.3s ease-out;
  margin: 0;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const PromptModalContent = styled.div`
  background: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  margin: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const PromptModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
  text-align: center;
`;

const PromptModalTitle = styled.h3`
  color: rgba(240, 240, 240, 1);
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 auto;
  letter-spacing: -0.5px;
  text-align: center;
`;

const PromptText = styled.div`
  color: rgba(160, 160, 160, 1);
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0 auto;
  padding: 1.5rem;
  background: rgba(30, 30, 30, 0.8);
  border-radius: 0.5rem;
  border: 1px solid rgba(150, 150, 150, 0.3);
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  position: relative;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
`;

const PromptCloseButton = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(60, 60, 60, 0.8);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(240, 240, 240, 1);
  font-size: 1.25rem;
  transition: all 0.3s ease;
  z-index: 10;

  &:hover {
    background: rgba(80, 80, 80, 0.9);
    border-color: rgba(180, 180, 180, 0.5);
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }
  
  &:active {
    transform: scale(0.95) rotate(90deg);
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

const Counter = styled.div`
  font-size: 0.875rem;
  color: rgba(160, 160, 160, 1);
  margin-bottom: 1rem;
  text-align: center;
  padding: 0.5rem 0.75rem;
  background: rgba(40, 40, 40, 0.5);
  border-radius: 0.375rem;
  border: 1px solid rgba(150, 150, 150, 0.3);
`;

const LimitWarning = styled.div`
  font-size: 0.75rem;
  color: rgba(200, 150, 100, 1);
`;

const InfoText = styled.p`
  font-size: 0.75rem;
  color: rgba(160, 160, 160, 1);
  margin: 0;
`;

const OverlayActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const OverlayButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'rgba(120, 120, 120, 0.85)'
      : $variant === 'danger'
      ? 'rgba(200, 100, 100, 0.9)'
      : 'rgba(60, 60, 60, 0.7)'};
  color: rgba(240, 240, 240, 1);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.25rem;
  padding: 0.15rem 0.5rem;
  font-size: 0.65rem;
  cursor: pointer;
  transition: all 0.3s ease;
  line-height: 1.1;
  min-width: 72px;
  justify-content: center;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'rgba(140, 140, 140, 0.95)'
        : $variant === 'danger'
        ? 'rgba(220, 120, 120, 0.95)'
        : 'rgba(80, 80, 80, 0.9)'};
    border-color: rgba(180, 180, 180, 0.5);
  }
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
  min-width: 0;
`;

const PreviewImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 60%;
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
  max-width: 35%;
  flex-shrink: 0;
  background: rgba(30, 30, 30, 0.95);
  border: 2px solid rgba(150, 150, 150, 0.5);
  border-radius: 0.5rem;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 10001;
`;

const PromptPanelHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: rgba(240, 240, 240, 1);
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
`;

const PromptPanelText = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: 0.875rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: 0.75rem;
  background: rgba(40, 40, 40, 0.5);
  border-radius: 0.5rem;
  border: 1px solid rgba(150, 150, 150, 0.3);
  font-family: 'Courier New', monospace;
  flex: 1;
`;

const PreviewClose = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(150, 150, 150, 0.3);
  background: rgba(60, 60, 60, 0.8);
  color: rgba(240, 240, 240, 1);
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(80, 80, 80, 0.9);
    border-color: rgba(180, 180, 180, 0.5);
  }
`;

interface PaidAlbumImage {
  id: string;
  url: string;
  created_at?: string;
}

interface PaidAlbumBuilderPageProps {
  character: {
    name: string;
    display_name?: string;
    appearance?: string;
    location?: string;
  } | null;
  onBackToAlbum: () => void;
  onBackToMain: () => void;
  onBackToChat?: () => void;
  canEditAlbum?: boolean;
  onUpgradeSubscription?: () => void;
}

const MAX_PAID_ALBUM_PHOTOS = 20;

export const PaidAlbumBuilderPage: React.FC<PaidAlbumBuilderPageProps> = ({
  character,
  onBackToAlbum,
  onBackToMain,
  onBackToChat,
  canEditAlbum = false,
  onUpgradeSubscription
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPhotos, setGeneratedPhotos] = useState<PaidAlbumImage[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PaidAlbumImage[]>([]);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<PaidAlbumImage | null>(null);
  const [fakeProgress, setFakeProgress] = useState(0);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime'>('anime-realism');

  // Проверка подписки пользователя
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setUserSubscription(null);
          return;
        }

        const response = await fetch('/api/v1/auth/me/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('User data from /api/v1/auth/me/:', userData);
          const subscriptionType = userData.subscription?.subscription_type || 
                                  userData.subscription_type || 
                                  'free';
          console.log('User subscription type (raw):', subscriptionType);
          const normalizedSubscription = String(subscriptionType).toLowerCase();
          console.log('User subscription type (normalized):', normalizedSubscription);
          setUserSubscription(normalizedSubscription);
        } else {
          console.log('Failed to get user data, status:', response.status);
          setUserSubscription(null);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setUserSubscription(null);
      }
    };

    checkSubscription();
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
    
    // Моковый прогресс на 15 секунд
    const duration = 15000; // 15 секунд
    const interval = 300; // Обновление каждые 300ms
    const steps = duration / interval; // 100 шагов
    const increment = 100 / steps; // ~1% за шаг
    
    let currentProgress = 0;
    fakeProgressIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (fakeProgressIntervalRef.current) {
          clearInterval(fakeProgressIntervalRef.current);
          fakeProgressIntervalRef.current = null;
        }
      }
      setFakeProgress(Math.min(100, Math.round(currentProgress)));
    }, interval);
  }, []);

  const stopFakeProgress = useCallback((immediate: boolean) => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    if (immediate) {
      setFakeProgress(0);
      return;
    }
    setFakeProgress(100);
    fakeProgressTimeoutRef.current = setTimeout(() => {
      setFakeProgress(0);
      fakeProgressTimeoutRef.current = null;
    }, 500);
  }, []);

  useEffect(() => {
    const loadExistingAlbum = async () => {
      if (!character?.name) {
        return;
      }

      try {
        setAlbumLoading(true);
        const encodedName = encodeURIComponent(character.name);
        const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить платный альбом');
        }
        const data = await response.json();
        setSelectedPhotos(Array.isArray(data.images) ? data.images : []);
      } catch (albumError) {
        console.error('Ошибка загрузки платного альбома:', albumError);
        setError(albumError instanceof Error ? albumError.message : 'Не удалось загрузить платный альбом');
      } finally {
        setAlbumLoading(false);
      }
    };

    loadExistingAlbum();
  }, [character?.name]);

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

  // Ожидание завершения генерации через task_id
  const waitForGeneration = async (taskId: string, token: string): Promise<PaidAlbumImage | null> => {
    const maxAttempts = 120; // 2 минуты максимум
    const delay = 2000; // 2 секунды между проверками (увеличено с 1 секунды)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/v1/generation-status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Ошибка проверки статуса генерации');
        }

        const status = await response.json();
        
        // Логируем только при изменении статуса или раз в 5 попыток
        if (attempt % 5 === 0 || status.status === 'SUCCESS' || status.status === 'FAILURE') {
          console.log(`Generation status [attempt ${attempt + 1}]:`, status.status, status.message || '');
        }

        // Бэкенд возвращает результат в поле "result", а не "data"
        const resultData = status.result || status.data;
        
        if (status.status === 'SUCCESS' && resultData) {
          console.log('Generation result data:', resultData);
          
          // Проверяем разные варианты структуры ответа
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            console.log('Photo generated successfully:', { imageUrl, imageId });
            return {
              id: imageId,
              url: imageUrl,
              created_at: new Date().toISOString()
            };
          } else {
            console.error('No image URL in result:', resultData);
            console.error('Available keys:', Object.keys(resultData));
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || 'Ошибка генерации изображения');
        } else if (status.status === 'PENDING' || status.status === 'PROGRESS') {
          // Продолжаем ждать - делаем задержку перед следующей проверкой
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } catch (err) {
        console.error('Error checking generation status:', err);
        throw err;
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  const handleGeneratePhoto = async () => {
    // Защита от множественных вызовов
    if (isGenerating) {
      console.log('Generation already in progress, ignoring duplicate call');
      return;
    }

    if (!character?.name) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    startFakeProgress();

    let generationFailed = false;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      let effectivePrompt = prompt.trim();
      if (!effectivePrompt) {
        const parts = [character.appearance, character.location].filter(p => p && p.trim());
        effectivePrompt = parts.length > 0 ? parts.join(' | ') : '';
      }
      
      // Переводим промпт на английский перед отправкой
      effectivePrompt = await translateToEnglish(effectivePrompt);

      const response = await fetch('/api/v1/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character: character.name,
          prompt: effectivePrompt,
          use_default_prompts: false,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = (data && (data.detail || data.message)) || 'Не удалось сгенерировать изображение';
        throw new Error(message);
      }

      const result = await response.json();
      console.log('Generation response:', result);
      
      // Проверяем, есть ли task_id (асинхронная генерация) или сразу image_url (мок)
      if (result.task_id) {
        // Асинхронная генерация через Celery
        console.log('Waiting for generation, task_id:', result.task_id);
        
        // Ждем завершения генерации (параллельно с прогрессом)
        const photoPromise = waitForGeneration(result.task_id, token);
        
        // Ждем только реальной генерации, без искусственной задержки
        const image = await photoPromise;
        
        // Завершаем прогресс
        stopFakeProgress(false);
        
        if (image) {
          console.log('Photo generated:', image);
          setGeneratedPhotos(prev => [image, ...prev]);
          
          // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
          try {
            const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                image_url: image.url,
                character_name: character.name || null
              })
            });
            
            if (addToGalleryResponse.ok) {
              console.log('[PaidAlbumBuilderPage] Фото добавлено в галерею пользователя');
            }
          } catch (galleryError) {
            console.warn('[PaidAlbumBuilderPage] Не удалось добавить фото в галерею:', galleryError);
          }
        } else {
          throw new Error('Не удалось получить изображение');
        }
      } else if (result.image_url || result.cloud_url || result.url) {
        // Мок или синхронная генерация
        console.log('Photo generated synchronously:', result.image_url || result.cloud_url || result.url);
        
        const imageUrl = result.image_url || result.cloud_url || result.url;
        const image: PaidAlbumImage = {
          id: result.image_id || result.id || `${Date.now()}`,
          url: imageUrl,
          created_at: new Date().toISOString()
        };

        setGeneratedPhotos(prev => [image, ...prev]);
        
        // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
        try {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: imageUrl,
              character_name: character.name || null
            })
          });
          
          if (addToGalleryResponse.ok) {
            console.log('[PaidAlbumBuilderPage] Фото добавлено в галерею пользователя (синхронная генерация)');
          }
        } catch (galleryError) {
          console.warn('[PaidAlbumBuilderPage] Не удалось добавить фото в галерею:', galleryError);
        }
      } else {
        console.error('No task_id or image_url in result:', result);
        throw new Error('Сервер не вернул URL изображения или task_id');
      }
    } catch (generateError) {
      generationFailed = true;
      console.error('Ошибка генерации фото:', generateError);
      setError(generateError instanceof Error ? generateError.message : 'Не удалось сгенерировать фото');
    } finally {
      setIsGenerating(false);
      stopFakeProgress(generationFailed);
    }
  };

  const togglePhotoSelection = (photo: PaidAlbumImage) => {
    setError(null);
    setSuccess(null);

    // Проверяем подписку пользователя
    const subscriptionType = (userSubscription || '').toLowerCase();
    const hasValidSubscription = subscriptionType === 'standard' || 
                                  subscriptionType === 'premium' || 
                                  subscriptionType === 'pro' ||
                                  subscriptionType === 'standart'; // Вариант с опечаткой
    
    // Используем canEditAlbum из пропсов или проверку подписки
    const canEdit = canEditAlbum || hasValidSubscription;

    console.log('Toggle photo selection check:', {
      userSubscription,
      subscriptionType,
      hasValidSubscription,
      canEditAlbum,
      canEdit
    });

    if (!canEdit) {
      console.log('Cannot edit album. Subscription:', subscriptionType, 'canEditAlbum:', canEditAlbum);
      setIsUpgradeModalOpen(true);
      return;
    }

    const exists = selectedPhotos.some(item => item.id === photo.id || item.url === photo.url);
    if (exists) {
      setSelectedPhotos(prev => prev.filter(item => item.id !== photo.id && item.url !== photo.url));
      return;
    }

    if (selectedPhotos.length >= MAX_PAID_ALBUM_PHOTOS) {
      setError(`В платном альбоме может быть не более ${MAX_PAID_ALBUM_PHOTOS} фотографий`);
      return;
    }

    setSelectedPhotos(prev => [...prev, photo]);
  };

  const handleSaveAlbum = async () => {
    if (!character?.name) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodeURIComponent(character.name)}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photos: selectedPhotos
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (data && (data.detail || data.message)) || 'Не удалось сохранить платный альбом';
        throw new Error(message);
      }

      setSelectedPhotos(Array.isArray(data.photos) ? data.photos : selectedPhotos);
      setSuccess('Платный альбом сохранён');
    } catch (saveError) {
      console.error('Ошибка сохранения платного альбома:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить платный альбом');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = character?.display_name || character?.name || '';

  const handleOpenPreview = async (photo: PaidAlbumImage) => {
    setPreviewPhoto(photo);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(photo.url);
      if (prompt) {
        setSelectedPrompt(prompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewPhoto(null);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(false);
  };

  // Обработка Escape для закрытия модального окна
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewPhoto) {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewPhoto]);

  return (
    <PageContainer>
      <ContentWrapper>
        <Header>
          <Title>Платный альбом {displayName}</Title>
          <Subtitle>Сгенерируйте новые изображения и выберите до 20 фотографий для платного альбома персонажа. Если кто-то купит ваш альбом, вы получите 15%</Subtitle>
        </Header>

        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {isUpgradeModalOpen && (
        <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
          <UpgradeModal onClick={(e) => e.stopPropagation()}>
            <UpgradeTitle>Платный альбом недоступен</UpgradeTitle>
            <UpgradeText>
              Добавление фотографий в платный альбом доступно только подписчикам Standard и Premium. Оформите подписку, чтобы получать 15% от продаж.
            </UpgradeText>
            <UpgradeActions>
              <ActionButton onClick={() => {
                setIsUpgradeModalOpen(false);
                onUpgradeSubscription?.();
                onBackToMain();
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

      <Layout>
        <Section>
          <SectionTitle>Сгенерировать новые фотографии</SectionTitle>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: 'rgba(240, 240, 240, 1)', 
              fontSize: '0.875rem',
              fontWeight: 600
            }}>
              Модель генерации:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime')}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(150, 150, 150, 0.3)',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="anime-realism">Больше реализма</option>
              <option value="anime">Больше аниме</option>
            </select>
          </div>
          <PromptArea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Опишите изображение, которое хотите получить..."
          />
          <InfoText>
            Используйте подробное описание внешности, окружения и атмосферы. Если оставить поле пустым, будут использованы описания персонажа.
          </InfoText>
          <ActionButton onClick={handleGeneratePhoto} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" /> Генерация... {fakeProgress}%
              </>
            ) : (
              'Сгенерировать фото'
            )}
          </ActionButton>

          <SectionTitle>Свежие изображения</SectionTitle>
          {isGenerating && generatedPhotos.length === 0 ? (
            <LoadingSpinner text={`Генерация изображения... ${fakeProgress}%`} />
          ) : (
            <PhotoGrid>
          {generatedPhotos.map(photo => (
            <PhotoCard
              key={`generated-${photo.id}`}
              $selected={selectedPhotos.some(item => item.id === photo.id)}
              onClick={() => handleOpenPreview(photo)}
            >
              <PhotoImage
                src={photo.url}
                alt={displayName}
                loading="lazy"
              />
              <PhotoOverlay>
                <OverlayActions>
                  <OverlayButton
                    $variant="primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePhotoSelection(photo);
                    }}
                  >
                    {selectedPhotos.some(item => item.id === photo.id)
                      ? 'Убрать'
                      : 'Добавить'}
                  </OverlayButton>
                </OverlayActions>
              </PhotoOverlay>
            </PhotoCard>
          ))}
            </PhotoGrid>
          )}
        </Section>

        <Section>
          <SectionTitle>Фотографии в платном альбоме</SectionTitle>
          <Counter>
            Выбрано {selectedPhotos.length} / {MAX_PAID_ALBUM_PHOTOS}
          </Counter>
          {selectedPhotos.length >= MAX_PAID_ALBUM_PHOTOS && (
            <LimitWarning>Достигнут лимит. Удалите лишние изображения перед добавлением новых.</LimitWarning>
          )}

          {albumLoading ? (
            <LoadingSpinner text="Загружаем текущий альбом..." />
          ) : selectedPhotos.length === 0 ? (
            <InfoText>Добавьте первые изображения в платный альбом.</InfoText>
          ) : (
            <PhotoGrid>
              {selectedPhotos.map(photo => (
                <PhotoCard
                  key={`selected-${photo.id}`}
                  $selected
                  onClick={() => handleOpenPreview(photo)}
                >
                  <PhotoImage
                    src={photo.url}
                    alt={displayName}
                    loading="lazy"
                  />
                  <PhotoOverlay>
                    <OverlayActions>
                      <OverlayButton
                        $variant="danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePhotoSelection(photo);
                        }}
                      >
                        Удалить
                      </OverlayButton>
                    </OverlayActions>
                  </PhotoOverlay>
                </PhotoCard>
              ))}
            </PhotoGrid>
          )}

          <ActionButton onClick={handleSaveAlbum} disabled={isSaving}>
            {isSaving ? 'Сохраняем...' : 'Сохранить альбом'}
          </ActionButton>
          
          <ActionButton 
            $variant="secondary" 
            onClick={() => onBackToChat?.()}
            style={{ marginTop: '0.75rem' }}
          >
            Вернуться в чат
          </ActionButton>
          
          <ActionButton 
            $variant="secondary" 
            onClick={onBackToMain}
            style={{ marginTop: '0.75rem' }}
          >
            На главную
          </ActionButton>
        </Section>
      </Layout>
      </ContentWrapper>

      {success && (
        <SuccessToast
          message={success || ''}
          amount={0}
          onClose={() => setSuccess(null)}
          duration={2500}
        />
      )}

      {previewPhoto && (
        <PreviewBackdrop onClick={handleClosePreview}>
          <PreviewContent onClick={(event) => event.stopPropagation()}>
            <PreviewClose onClick={handleClosePreview}>×</PreviewClose>
            <PreviewImageContainer>
              <PreviewImage src={previewPhoto?.url || ''} alt={displayName} />
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
              ) : (
                <PromptPanelText style={{ color: 'rgba(160, 160, 160, 0.6)' }}>
                  Промпт не найден для этого изображения
                </PromptPanelText>
              )}
            </PromptPanel>
          </PreviewContent>
        </PreviewBackdrop>
      )}
    </PageContainer>
  );
};


