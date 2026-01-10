import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { SuccessToast } from './SuccessToast';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish, translateToRussian } from '../utils/translate';
import { useIsMobile } from '../hooks/useIsMobile';
import { FiX as CloseIcon } from 'react-icons/fi';

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
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: rgba(20, 20, 20, 1);
  padding: 2rem;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  min-height: 100%;
`;

const Header = styled.header`
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  margin-top: 0.5rem;
  color: rgba(160, 160, 160, 1);
  font-size: 1rem;

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
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

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
  }
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

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.75rem;
    max-height: 400px;
  }
  
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
  min-width: 140px;
  aspect-ratio: 2 / 3;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: 768px) {
    max-width: 100%;
  }

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

  @media (max-width: 768px) {
    opacity: 1;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.25rem 0.5rem;
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
  background: rgba(0, 0, 0, 1); /* Full black for mobile */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  padding: 0;
  width: 100vw;
  height: 100vh;
`;

const PreviewContent = styled.div`
  position: relative;
  max-width: 100vw;
  max-height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: ${theme.spacing.xl};
  width: 100%;
  min-width: 0;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
`;

const PreviewImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 70%;

  @media (max-width: 768px) {
    max-width: 100%;
    width: 100%;
    flex: 1;
    min-height: 0;
  }
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    max-height: 100%;
    width: auto;
    height: auto;
    border-radius: 0;
  }
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

  @media (max-width: 768px) {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    max-height: 30vh;
    background: rgba(20, 20, 20, 0.95);
    border: none;
    border-bottom: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 0;
    padding: ${theme.spacing.md};
    z-index: 10;
    flex-shrink: 0;
  }
`;

const PromptPanelHeader = styled.div`
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: #fbbf24;
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
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [promptLoadedFromDB, setPromptLoadedFromDB] = useState(false);

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
          
          const subscriptionType = userData.subscription?.subscription_type || 
                                  userData.subscription_type || 
                                  'free';
          
          const normalizedSubscription = String(subscriptionType).toLowerCase();
          
          setUserSubscription(normalizedSubscription);
        } else {
          
          setUserSubscription(null);
        }
      } catch (error) {
        
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

  // Загружаем данные персонажа из БД и устанавливаем промпт по умолчанию
  useEffect(() => {
    const loadCharacterData = async () => {
      if (!character?.name) {
        return;
      }

      // Сбрасываем флаг при смене персонажа
      setPromptLoadedFromDB(false);

      // Сначала используем данные из props для быстрого отображения
      const initialAppearance = character?.character_appearance 
        || character?.appearance 
        || '';
      const initialLocation = character?.location || '';
      
      if (initialAppearance || initialLocation) {
        const initialParts = [initialAppearance, initialLocation].filter(p => p && p.trim());
        const initialPrompt = initialParts.length > 0 ? initialParts.join(' | ') : '';
        if (initialPrompt) {
          setPrompt(initialPrompt);
        }
      }

      try {
        // Загружаем данные персонажа из API для получения актуальных данных
        const encodedName = encodeURIComponent(character.name);
        const response = await authManager.fetchWithAuth(`/api/v1/characters/${encodedName}`);
        if (response.ok) {
          const characterData = await response.json();
          
          // Проверяем все возможные варианты названия поля appearance
          const appearance = characterData?.character_appearance 
            || characterData?.appearance 
            || character?.appearance 
            || character?.character_appearance
            || '';
          const location = characterData?.location || character?.location || '';
          
          // Переводим на русский параллельно, если данные на английском
          const needsAppearanceTranslation = appearance && appearance.trim() && !/[а-яёА-ЯЁ]/.test(appearance);
          const needsLocationTranslation = location && location.trim() && !/[а-яёА-ЯЁ]/.test(location);
          
          let translatedAppearance = appearance;
          let translatedLocation = location;
          
          // Выполняем переводы параллельно для ускорения
          if (needsAppearanceTranslation || needsLocationTranslation) {
            const translations = await Promise.all([
              needsAppearanceTranslation ? translateToRussian(appearance) : Promise.resolve(appearance),
              needsLocationTranslation ? translateToRussian(location) : Promise.resolve(location)
            ]);
            translatedAppearance = translations[0];
            translatedLocation = translations[1];
          }
          
          // Устанавливаем промпт с переведенными данными
          const parts = [translatedAppearance, translatedLocation].filter(p => p && p.trim());
          const defaultPrompt = parts.length > 0 ? parts.join(' | ') : '';
          
          if (defaultPrompt) {
            setPrompt(defaultPrompt);
            setPromptLoadedFromDB(true);
          }
        }
      } catch (error) {
        
        // Если не удалось загрузить из API, используем данные из props
        if (character.appearance || character.location) {
          const appearance = character.appearance || '';
          const location = character.location || '';
          
          // Переводим на русский параллельно, если данные на английском
          const needsAppearanceTranslation = appearance && appearance.trim() && !/[а-яёА-ЯЁ]/.test(appearance);
          const needsLocationTranslation = location && location.trim() && !/[а-яёА-ЯЁ]/.test(location);
          
          let translatedAppearance = appearance;
          let translatedLocation = location;
          
          if (needsAppearanceTranslation || needsLocationTranslation) {
            const translations = await Promise.all([
              needsAppearanceTranslation ? translateToRussian(appearance) : Promise.resolve(appearance),
              needsLocationTranslation ? translateToRussian(location) : Promise.resolve(location)
            ]);
            translatedAppearance = translations[0];
            translatedLocation = translations[1];
          }
          
          const parts = [translatedAppearance, translatedLocation].filter(p => p && p.trim());
          const defaultPrompt = parts.length > 0 ? parts.join(' | ') : '';
          
          if (defaultPrompt) {
            setPrompt(defaultPrompt);
            setPromptLoadedFromDB(true);
          }
        }
      }
    };

    loadCharacterData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name]);

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
          
        }

        // Бэкенд возвращает результат в поле "result", а не "data"
        const resultData = status.result || status.data;
        
        if (status.status === 'SUCCESS' && resultData) {
          
          
          // Проверяем разные варианты структуры ответа
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            
            return {
              id: imageId,
              url: imageUrl,
              created_at: new Date().toISOString()
            };
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || 'Ошибка генерации изображения');
        } else if (status.status === 'PENDING' || status.status === 'PROGRESS') {
          // Продолжаем ждать - делаем задержку перед следующей проверкой
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } catch (err) {
        
        throw err;
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  const handleGeneratePhoto = async () => {
    // Защита от множественных вызовов
    if (isGenerating) {
      
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
      
      
      // Проверяем, есть ли task_id (асинхронная генерация) или сразу image_url (мок)
      if (result.task_id) {
        // Асинхронная генерация через Celery
        
        
        // Ждем завершения генерации (параллельно с прогрессом)
        const photoPromise = waitForGeneration(result.task_id, token);
        
        // Ждем только реальной генерации, без искусственной задержки
        const image = await photoPromise;
        
        // Завершаем прогресс
        stopFakeProgress(false);
        
        if (image) {
          
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
              
            }
          } catch (galleryError) {
            
          }
        } else {
          throw new Error('Не удалось получить изображение');
        }
      } else if (result.image_url || result.cloud_url || result.url) {
        // Мок или синхронная генерация
        
        
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
            
          }
        } catch (galleryError) {
          
        }
      } else {
        
        throw new Error('Сервер не вернул URL изображения или task_id');
      }
    } catch (generateError) {
      generationFailed = true;
      
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

    

    if (!canEdit) {
      
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
      
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить платный альбом');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = character?.display_name || character?.name || '';

  const handleOpenPreview = async (photo: PaidAlbumImage) => {
    setPreviewPhoto(photo);
    setIsPromptVisible(true);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(photo.url);
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
              onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
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
              <option value="anime-realism">Сочетание аниме и реалистичных текстур</option>
              <option value="anime">Классический аниме стиль</option>
              <option value="realism">Максимальная фотореалистичность</option>
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
            <PreviewClose onClick={handleClosePreview}>
              <CloseIcon />
            </PreviewClose>
            <PreviewImageContainer>
              <PreviewImage src={previewPhoto?.url || ''} alt={displayName} />
            </PreviewImageContainer>
            <PromptPanel style={{
              display: isPromptVisible ? 'flex' : 'none',
              visibility: isPromptVisible ? 'visible' : 'hidden'
            }}>
              <PromptPanelHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PromptPanelTitle>Промпт для изображения</PromptPanelTitle>
                  <button 
                    onClick={() => setIsPromptVisible(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Скрыть промпт"
                  >
                    <CloseIcon size={20} />
                  </button>
                </div>
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
            {!isPromptVisible && (
              <button
                onClick={() => setIsPromptVisible(true)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  zIndex: 10002,
                  fontWeight: '600'
                }}
              >
                Показать промпт
              </button>
            )}
          </PreviewContent>
        </PreviewBackdrop>
      )}
    </PageContainer>
  );
};


