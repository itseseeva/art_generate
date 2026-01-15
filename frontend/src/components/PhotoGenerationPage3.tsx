import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Loader2 } from 'lucide-react';
import { FiX as CloseIcon } from 'react-icons/fi';
import { theme } from '../theme';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish, translateToRussian } from '../utils/translate';
import { GlobalHeader } from './GlobalHeader';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: rgba(20, 20, 20, 1);
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
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

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 600px;
  gap: 2rem;
  width: 100%;
  min-width: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ImagesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 0;
  flex: 1;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0;
`;

const ImageModal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
  cursor: pointer;
`;

const ModalImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const CloseButton = styled.button`
  position: fixed !important;
  top: 2rem !important;
  right: 2rem !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 2px solid rgba(255, 255, 255, 1) !important;
  color: rgba(20, 20, 20, 1) !important;
  width: 48px !important;
  height: 48px !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  font-size: 1.5rem;
  transition: all 0.3s ease;
  z-index: 100001 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  
  &:hover {
    background: rgba(255, 255, 255, 1) !important;
    transform: scale(1.1) !important;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.7) !important;
  }
  
  &:active {
    transform: scale(0.95) !important;
  }
  
  svg {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: none !important;
  }
`;

const ImagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.sm};
  width: 100%;
  align-content: start;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ImageCard = styled.div<{ $isSelected?: boolean }>`
  position: relative;
  overflow: hidden;
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  padding: 0; /* Убираем padding чтобы фото занимало всю карточку */
  border-radius: ${theme.borderRadius.lg};
  border: 2px solid ${props => props.$isSelected ? 'rgba(200, 200, 200, 0.8)' : 'rgba(100, 100, 100, 0.3)'};
  box-shadow: ${theme.colors.shadow.message};
  transition: ${theme.transition.fast};
  width: 100%;
  height: 300px; /* Фиксированная высота как на главной */
  min-width: 0; /* Позволяет карточке сжиматься в grid */
  cursor: pointer;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
    border-color: rgba(180, 180, 180, 0.6);
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: ${theme.borderRadius.lg};
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
  justify-content: flex-start;
  gap: 0.5rem;
  color: rgba(240, 240, 240, 1);
  font-size: 0.75rem;
  opacity: 0;
  transition: all 0.3s ease;

  ${ImageCard}:hover & {
    opacity: 1;
  }
`;

const OverlayActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`;

const OverlayButton = styled.button<{ $variant?: 'primary' | 'danger'; $isAdded?: boolean }>`
  background: ${({ $variant, $isAdded }) => 
    $variant === 'primary'
      ? ($isAdded ? 'rgba(100, 200, 100, 0.85)' : 'rgba(120, 120, 120, 0.85)')
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

  &:hover:not(:disabled) {
    background: ${({ $variant, $isAdded }) => 
      $variant === 'primary'
        ? ($isAdded ? 'rgba(120, 220, 120, 0.95)' : 'rgba(140, 140, 140, 0.95)')
        : $variant === 'danger'
        ? 'rgba(220, 120, 120, 0.95)'
        : 'rgba(80, 80, 80, 0.9)'};
    border-color: rgba(180, 180, 180, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PromptSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 600px;
  
  @media (max-width: 1200px) {
    min-width: 100%;
  }
`;

const PromptCard = styled.div`
  position: sticky;
  top: 2rem;
  background: rgba(30, 30, 30, 0.8);
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(100, 100, 100, 0.3);
  width: 100%;
  box-sizing: border-box;
`;

const PromptTitle = styled.h2`
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
`;

const PromptForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(240, 240, 240, 1);
`;

const Textarea = styled.textarea`
  min-height: 200px;
  resize: none;
  background: rgba(40, 40, 40, 0.5);
  color: rgba(240, 240, 240, 1);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  
  &::placeholder {
    color: rgba(160, 160, 160, 0.7);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(180, 180, 180, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GenerateButton = styled.button`
  width: 100%;
  background: rgba(120, 120, 120, 0.8);
  color: rgba(240, 240, 240, 1);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background: rgba(140, 140, 140, 0.9);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ContinueButton = styled.button<{ $isEnabled: boolean }>`
  width: 100%;
  background: ${props => props.$isEnabled ? 'rgba(120, 120, 120, 0.8)' : 'rgba(60, 60, 60, 0.8)'};
  color: ${props => props.$isEnabled ? 'rgba(240, 240, 240, 1)' : 'rgba(120, 120, 120, 1)'};
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: ${props => props.$isEnabled ? 'pointer' : 'not-allowed'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  
  &:hover:not(:disabled) {
    background: ${props => props.$isEnabled ? 'rgba(140, 140, 140, 0.9)' : 'rgba(60, 60, 60, 0.8)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TipsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background: rgba(40, 40, 40, 0.5);
  padding: 1rem;
`;

const TipsTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(240, 240, 240, 1);
  margin: 0;
`;

const TipsList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: rgba(160, 160, 160, 1);
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
  z-index: 99999;
  padding: ${theme.spacing.xl};
`;

const PromptModalOverlay = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.95) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 99999 !important;
  padding: ${theme.spacing.xl};
  visibility: visible !important;
  opacity: 1 !important;
`;

const PromptModalContent = styled.div`
  position: relative !important;
  max-width: 95vw;
  max-height: 95vh;
  display: flex !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: ${theme.spacing.xl};
  width: 100%;
  overflow: visible !important;
  visibility: visible !important;
  opacity: 1 !important;

  @media (max-width: 768px) {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    background: #000 !important;
    display: flex !important;
    flex-direction: column !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    overflow: hidden !important;
  }
`;

const PromptModalImageContainer = styled.div`
  flex: 1;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 300px;
  max-width: 70%;
  padding: ${theme.spacing.lg};
  overflow: visible !important;
  background: transparent !important;
  visibility: visible !important;
  opacity: 1 !important;

  @media (max-width: 768px) {
    width: 100% !important;
    max-width: 100% !important;
    flex: 1 !important;
    min-height: 0 !important;
    padding: 0 !important;
  }
`;

const PromptModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  width: auto;
  height: auto;
  min-width: 300px;
  min-height: 300px;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;

  @media (max-width: 768px) {
    max-height: 100% !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
  }
`;

const PromptPanel = styled.div`
  width: 600px;
  min-width: 525px;
  max-width: 45%;
  background: rgba(30, 30, 30, 0.95) !important;
  border: 2px solid rgba(150, 150, 150, 0.5) !important;
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  max-height: 95vh;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8) !important;
  backdrop-filter: blur(10px);
  visibility: visible !important;
  opacity: 1 !important;

  @media (max-width: 768px) {
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    max-height: 30vh !important;
    background: rgba(20, 20, 20, 0.95) !important;
    border: none !important;
    border-bottom: 1px solid rgba(251, 191, 36, 0.3) !important;
    border-radius: 0 !important;
    padding: ${theme.spacing.md} !important;
    z-index: 10 !important;
    flex-shrink: 0 !important;
  }
`;

const PromptPanelHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: #fbbf24;
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

const PromptLoading = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptError = styled.div`
  color: rgba(255, 100, 100, 1);
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptCloseButton = styled.button`
  position: absolute !important;
  top: ${theme.spacing.lg} !important;
  right: ${theme.spacing.lg} !important;
  background: rgba(40, 40, 40, 0.95) !important;
  border: 2px solid rgba(255, 255, 255, 0.5) !important;
  border-radius: 50% !important;
  width: 48px !important;
  height: 48px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  color: rgba(240, 240, 240, 1) !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  transition: all 0.3s ease;
  z-index: 100002 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
  visibility: visible !important;
  opacity: 1 !important;

  &:hover {
    background: rgba(60, 60, 60, 1);
    border-color: rgba(255, 255, 255, 0.8);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ModalContent = styled.div`
  background: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: rgba(240, 240, 240, 1);
  font-size: 1.5rem;
  font-weight: 600;
`;

const ModalText = styled.p`
  margin: 0;
  color: rgba(160, 160, 160, 1);
  font-size: 1rem;
  line-height: 1.6;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.$variant === 'primary' ? `
    background: rgba(120, 120, 120, 0.8);
    color: rgba(240, 240, 240, 1);
    
    &:hover {
      background: rgba(140, 140, 140, 0.9);
    }
  ` : `
    background: rgba(60, 60, 60, 0.8);
    color: rgba(200, 200, 200, 1);
    
    &:hover {
      background: rgba(80, 80, 80, 0.9);
    }
  `}
`;

const ErrorMessage = styled.div`
  color: rgba(255, 100, 100, 1);
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  color: rgba(200, 200, 200, 1);
  background: rgba(60, 60, 60, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  margin-top: 1rem;
`;

interface Character {
  id: string | number;
  name: string;
  description?: string;
  character_appearance?: string;
  location?: string;
}

interface PhotoGenerationPage3Props {
  character: Character;
  onBackToMain: () => void;
  onCreateCharacter?: () => void;
  onShop?: () => void;
  onProfile?: () => void;
  onChat?: (character: Character) => void;
  onPaidAlbumBuilder?: (character: Character) => void;
}

interface GeneratedPhoto {
  id: string;
  url: string;
  isSelected: boolean;
  isAdded: boolean;
}

export const PhotoGenerationPage3: React.FC<PhotoGenerationPage3Props> = ({
  character,
  onBackToMain,
  onCreateCharacter,
  onShop,
  onProfile,
  onChat,
  onPaidAlbumBuilder
}) => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0); // Счетчик текущих генераций
  const [generationProgress, setGenerationProgress] = useState(0); // Прогресс генерации в процентах
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{coins: number; subscription_type?: string} | null>(null);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [addedPhotos, setAddedPhotos] = useState<string[]>([]);
  const [showFreeSubscriptionModal, setShowFreeSubscriptionModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Загрузка настроек генерации
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/v1/fallback-settings/');
        if (response.ok) {
          const settings = await response.json();
          setGenerationSettings(settings);
        }
      } catch (error) {
        
      }
    };
    loadSettings();
  }, []);

  // Проверка авторизации и загрузка информации о пользователе
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch('/api/v1/auth/me/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          const subscriptionType = userData.subscription?.subscription_type || userData.subscription_type || 'free';
          
          setUserInfo({ 
            coins: userData.coins || 0,
            subscription_type: subscriptionType
          });
        }
      } catch (error) {
        
      }
    };
    checkAuth();
  }, []);

  // Установка дефолтного промпта (переводим на русский для отображения, если данные на английском)
  useEffect(() => {
    if (character) {
      const loadDefaultPrompt = async () => {
        const parts = [character.character_appearance, character.location].filter(p => p && p.trim());
        if (parts.length > 0) {
          const defaultPrompt = parts.join(' | ');
          // Проверяем, содержит ли текст кириллицу
          const hasCyrillic = /[а-яёА-ЯЁ]/.test(defaultPrompt);
          if (!hasCyrillic) {
            // Если нет кириллицы, переводим на русский для отображения
            const translatedPrompt = await translateToRussian(defaultPrompt);
            setPrompt(translatedPrompt);
          } else {
            // Если есть кириллица, используем как есть
            setPrompt(defaultPrompt);
          }
        } else {
          setPrompt('');
        }
      };
      loadDefaultPrompt();
    }
  }, [character]);

  // Генерация 1 фото через Stable Diffusion
  const handleGenerate = async () => {
    // Защита от множественных вызовов
    if (isGenerating) {
      
      return;
    }
    
    if (!prompt.trim()) return;

    if (!userInfo || userInfo.coins < 10) {
      setError('Недостаточно кредитов! Нужно 10 кредитов для генерации 1 фото.');
      return;
    }

    setIsGenerating(true);
    setGeneratingCount(1);
    setGenerationProgress(0);
    setError(null);
    setSuccess(null);

    // Запускаем мок-прогресс на 30 секунд
    let progressInterval: NodeJS.Timeout | null = null;
    const startTime = Date.now();
    const duration = 15000; // 15 секунд
    
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 99);
      setGenerationProgress(progress);
      
      if (progress >= 99) {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }
    }, 100); // Обновляем каждые 100мс для плавности

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');
      
      // Проверяем монеты перед генерацией
      const userResponse = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Ошибка проверки авторизации');
      }
      
      const userData = await userResponse.json();
      if (userData.coins < 10) {
        setError('Недостаточно кредитов! Нужно 10 кредитов для генерации 1 фото.');
        setUserInfo({ 
          coins: userData.coins || 0,
          subscription_type: userData.subscription?.subscription_type || userData.subscription_type || 'free'
        });
        setIsGenerating(false);
        setGeneratingCount(0);
        setGenerationProgress(0);
        clearInterval(progressInterval);
        return;
      }

      // Переводим промпт на английский перед отправкой
      // Если промпт был переведен на русский для отображения, переводим обратно на английский
      let finalPrompt = prompt.trim();
      const hasCyrillic = /[а-яёА-ЯЁ]/.test(finalPrompt);
      if (hasCyrillic) {
        // Если есть кириллица, переводим на английский
        finalPrompt = await translateToEnglish(finalPrompt);
      }
      // Если нет кириллицы, используем как есть (уже на английском)
      
      const requestBody: any = {
        character: character.name,
        prompt: finalPrompt,
        negative_prompt: generationSettings?.negative_prompt,
        width: generationSettings?.width,
        height: generationSettings?.height,
        steps: generationSettings?.steps,
        cfg_scale: generationSettings?.cfg_scale,
        use_default_prompts: false,
        model: selectedModel
      };

      // Отправляем запрос на генерацию
      const response = await fetch('/api/v1/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка генерации фото');
      }

      const result = await response.json();
      
      // Оптимистичное обновление кредитов сразу после успешной отправки запроса
      if (userInfo) {
        setUserInfo(prev => prev ? { 
          coins: Math.max(0, prev.coins - 10),
          subscription_type: prev.subscription_type
        } : null);
      }
      
      // Проверяем, есть ли task_id (асинхронная генерация) или сразу image_url (мок)
      if (result.task_id) {
        // Асинхронная генерация через Celery
        
        
        // Ждем завершения генерации (параллельно с прогрессом)
        const photoPromise = waitForGeneration(result.task_id, token);
        
        // Ждем только реальной генерации, без искусственной задержки
        const photo = await photoPromise;
        
        // Завершаем прогресс
        if (progressInterval) clearInterval(progressInterval);
        setGenerationProgress(100);
        
        if (photo) {
          
          // Добавляем фото сразу в список для отображения
          setImages(prev => {
            const updated = [...prev, photo];
            
            return updated;
          });
          setSuccess('Фото успешно сгенерировано!');
          
          // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
          try {
            const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                image_url: photo.url,
                character_name: character.name || null
              })
            });
            
            if (addToGalleryResponse.ok) {
              
            }
          } catch (galleryError) {
            
          }
          
          // Обновляем счетчик монет с сервера после успешной генерации
          try {
            const userResponse = await fetch('/api/v1/auth/me/', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUserInfo({ 
                coins: userData.coins || 0,
                subscription_type: userData.subscription?.subscription_type || userData.subscription_type || 'free'
              });
            }
          } catch (error) {
            
          }
        } else {
          
          throw new Error('Не удалось сгенерировать фото');
        }
      } else if (result.image_url) {
        // Мок или синхронная генерация
        
        
        // НЕ ждём искусственно - завершаем сразу после получения результата
        
        // Завершаем прогресс сразу
        if (progressInterval) clearInterval(progressInterval);
        setGenerationProgress(100);
        
        const newPhoto: GeneratedPhoto = {
          id: result.image_id || `${Date.now()}`,
          url: result.image_url,
          isSelected: false,
          isAdded: false
        };
        // Добавляем фото сразу в список для отображения
        setImages(prev => {
          const updated = [...prev, newPhoto];
          
          return updated;
        });
        setSuccess('Фото успешно сгенерировано!');
        
        // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
        try {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: result.image_url,
              character_name: character.name || null
            })
          });
          
          if (addToGalleryResponse.ok) {
            
          }
        } catch (galleryError) {
          
        }
        
        // Обновляем счетчик монет с сервера после успешной генерации
        try {
          const userResponse = await fetch('/api/v1/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserInfo({ 
              coins: userData.coins || 0,
              subscription_type: userData.subscription?.subscription_type || userData.subscription_type || 'free'
            });
          }
        } catch (error) {
          
        }
      } else {
        
        if (progressInterval) clearInterval(progressInterval);
        throw new Error('Не удалось получить изображение');
      }
      
      // Обновляем информацию о пользователе
      const finalUserResponse = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (finalUserResponse.ok) {
        const userData = await finalUserResponse.json();
        setUserInfo({ 
          coins: userData.coins || 0,
          subscription_type: userData.subscription?.subscription_type || userData.subscription_type || 'free'
        });
      }
      
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
      
      // Восстанавливаем монеты при ошибке (откат оптимистичного обновления)
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userResponse = await fetch('/api/v1/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserInfo({ 
              coins: userData.coins || 0,
              subscription_type: userData.subscription?.subscription_type || userData.subscription_type || 'free'
            });
          }
        }
      } catch (refreshError) {
        
      }
    } finally {
      // Даем время на завершение прогресса перед сбросом
      setTimeout(() => {
        setIsGenerating(false);
        setGeneratingCount(0);
        setGenerationProgress(0);
      }, 500);
    }
  };

  // Ожидание завершения генерации через task_id
  const waitForGeneration = async (taskId: string, token: string): Promise<GeneratedPhoto | null> => {
    const maxAttempts = 120; // 2 минуты максимум
    const delay = 1500; // 1.5 секунды между проверками (уменьшено для более быстрого отображения)

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
        
        // Логируем только важные статусы
        if (status.status === 'SUCCESS' || status.status === 'FAILURE') {
          
        }

        // Бэкенд возвращает результат в поле "result", а не "data"
        const resultData = status.result || status.data;
        
        // Проверяем SUCCESS статус
        if (status.status === 'SUCCESS') {
          
          
          if (!resultData) {
            
            // Продолжаем ждать, возможно результат еще не готов
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Проверяем разные варианты структуры ответа
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            
            return {
              id: imageId,
              url: imageUrl,
              isSelected: false,
              isAdded: false
            };
          } else {
            // Продолжаем ждать, возможно URL появится в следующем запросе
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || status.message || 'Ошибка генерации изображения');
        } else if (status.status === 'PENDING' || status.status === 'PROGRESS') {
          // Продолжаем ждать
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          // Неизвестный статус - логируем и продолжаем ждать
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } catch (err) {
        
        // При ошибке продолжаем попытки, но с небольшой задержкой
        await new Promise(resolve => setTimeout(resolve, delay));
        if (attempt === maxAttempts - 1) {
          throw err;
        }
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  // Обработчик кнопки "Продолжить"
  const handleContinue = () => {
    if (images.length === 0) return;
    
    // Безопасно получаем subscription_type
    const rawSubscriptionType = userInfo?.subscription_type;
    let subscriptionType = 'free'; // По умолчанию free
    
    if (rawSubscriptionType) {
      if (typeof rawSubscriptionType === 'string') {
        subscriptionType = rawSubscriptionType.toLowerCase().trim();
      } else {
        subscriptionType = String(rawSubscriptionType).toLowerCase().trim();
      }
    }
    
    
    
    // Только STANDARD и PREMIUM могут перейти на создание платного альбома
    // Проверяем явно только эти два типа, все остальное (FREE, BASE, undefined, null, '') показываем модальное окно
    const allowedTypes = ['standard', 'premium', 'standart']; // standart - опечатка для совместимости
    const isAllowed = allowedTypes.includes(subscriptionType);
    
    
    
    // ВАЖНО: Если не STANDARD или PREMIUM - показываем модальное окно и НЕ переходим дальше
    if (!isAllowed) {
      
      setShowFreeSubscriptionModal(true);
      return; // ОСТАНОВКА - не переходим дальше
    }
    
    // Только если isAllowed === true
    
    // Переходим на страницу создания платного альбома
    if (onPaidAlbumBuilder) {
      onPaidAlbumBuilder(character);
    } else {
      // Fallback: переход через URL
      window.location.href = `/paid-album-builder?character=${character.id || character.name}`;
    }
  };

  // Обработчик "Закончить Создание" - переход в чат
  const handleFinishCreation = () => {
    setShowFreeSubscriptionModal(false);
    
    // Небольшая задержка для закрытия модального окна
    setTimeout(() => {
      if (onChat && character) {
        
        // Убеждаемся, что у персонажа есть необходимые поля
        const characterForChat = {
          ...character,
          id: character.id || String(character.name),
          name: String(character.name || character.id)
        };
        onChat(characterForChat);
      } else {
        // Fallback: переход через URL
        const characterId = character?.id || character?.name;
        if (characterId) {
          
          window.location.href = `/chat?character=${characterId}`;
        } else {
          
        }
      }
    }, 100);
  };

  // Обработчик "Купить подписку"
  const handleBuySubscription = () => {
    setShowFreeSubscriptionModal(false);
    if (onShop) {
      onShop();
    } else {
      // Fallback: переход через URL
      window.location.href = '/shop';
    }
  };

  const handleOpenPhoto = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    
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

  useEffect(() => {
    
  }, [selectedPhoto]);

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

  // Добавление/удаление фото в карточку персонажа (toggle)
  const handleAddPhoto = async (photoId: string) => {
    const photo = images.find(p => p.id === photoId);
    if (!photo) return;

    const isCurrentlyAdded = photo.isAdded;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      if (isCurrentlyAdded) {
        // Удаляем фото из списка добавленных
        const newAddedPhotos = addedPhotos.filter(id => id !== photoId);
        setAddedPhotos(newAddedPhotos);
        setImages(prev => prev.map(p => 
          p.id === photoId ? { ...p, isAdded: false } : p
        ));

        // Обновляем на бэкенде - передаем объекты с id и url
        const photosToSend = images
          .filter(p => newAddedPhotos.includes(p.id))
          .map(p => ({ id: p.id, url: p.url }));
        
        const response = await fetch('/api/v1/characters/set-main-photos/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            character_name: character.name,
            photos: photosToSend
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Ошибка удаления фото');
        }

        setSuccess('Фото удалено из карточки персонажа!');
      } else {
        // Проверяем лимит перед добавлением
        if (addedPhotos.length >= 3) {
          setError('Можно добавить максимум 3 фото для карточки персонажа');
          return;
        }

        // Добавляем фото в список добавленных
        const newAddedPhotos = [...addedPhotos, photoId];
        setAddedPhotos(newAddedPhotos);
        setImages(prev => prev.map(p => 
          p.id === photoId ? { ...p, isAdded: true } : p
        ));

        // Сохраняем фото на бэкенде - передаем объекты с id и url
        const photosToSend = images
          .filter(p => newAddedPhotos.includes(p.id))
          .map(p => ({ id: p.id, url: p.url }));
        
        const response = await fetch('/api/v1/characters/set-main-photos/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            character_name: character.name,
            photos: photosToSend
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Ошибка сохранения фото');
        }

        setSuccess('Фото добавлено в карточку персонажа!');
        
        // Отправляем событие для обновления персонажей на главной странице
        window.dispatchEvent(new CustomEvent('character-photos-updated', { 
          detail: { characterName: character.name } 
        }));
        
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения фото');
      // Откатываем изменения при ошибке
      setAddedPhotos(prev => {
        if (isCurrentlyAdded) {
          return [...prev, photoId];
        } else {
          return prev.filter(id => id !== photoId);
        }
      });
      setImages(prev => prev.map(p => 
        p.id === photoId ? { ...p, isAdded: isCurrentlyAdded } : p
      ));
    }
  };

  return (
    <MainContainer>
      <GlobalHeader 
        onShop={onShop}
        onProfile={onProfile}
        onHome={onBackToMain}
        currentCharacterId={character?.id}
      />
      <ContentWrapper style={{ padding: '2rem' }}>
        <Header>
          <Title>Генератор фото</Title>
          <Subtitle>Введите промпт и создайте три уникальных изображения для персонажа {character.name} они будут на главной странице""</Subtitle>
        </Header>

        <GridContainer>
          {/* Left side - Generated images */}
          <ImagesSection>
            <SectionTitle>Сгенерированные фото</SectionTitle>

            {images.length > 0 && (
              <ImagesGrid>
                {images.map((image, index) => {
                  return (
                    <ImageCard 
                      key={image.id} 
                      $isSelected={!!image.isAdded}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        handleOpenPhoto(e, image.url);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Image
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        onLoad={() => {
                          
                        }}
                        onError={(e) => {
                          
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <PhotoOverlay>
                        <OverlayActions>
                          <OverlayButton
                            $variant="primary"
                            $isAdded={!!image.isAdded}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddPhoto(image.id);
                            }}
                            disabled={!image.isAdded && addedPhotos.length >= 3}
                          >
                            {image.isAdded ? 'Удалить' : 'Добавить'}
                          </OverlayButton>
                        </OverlayActions>
                      </PhotoOverlay>
                    </ImageCard>
                  );
                })}
              </ImagesGrid>
            )}

            {images.length > 0 && !isGenerating && (
              <>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {success && <SuccessMessage>{success}</SuccessMessage>}
                {addedPhotos.length > 0 && (
                  <div style={{ fontSize: '0.875rem', color: 'rgba(160, 160, 160, 1)', marginTop: '1rem' }}>
                    Добавлено фото: {addedPhotos.length}/3
                  </div>
                )}
              </>
            )}
          </ImagesSection>

          {/* Right side - Prompt input */}
          <PromptSection>
            <PromptCard>
              <PromptTitle>Создать изображение</PromptTitle>

              <PromptForm>
                <Label htmlFor="prompt">
                  Промпт
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="Опишите изображение, которое хотите создать..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />

                <Label htmlFor="model">
                  Модель генерации
                </Label>
                <select
                  id="model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                  disabled={isGenerating}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(22, 33, 62, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '0.5rem',
                    color: 'rgba(240, 240, 240, 1)',
                    fontSize: '0.875rem',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    width: '100%'
                  }}
                >
                  <option value="anime-realism">Сочетание аниме и реалистичных текстур</option>
                  <option value="anime">Классический аниме стиль</option>
                  <option value="realism">Максимальная фотореалистичность</option>
                </select>

                <GenerateButton
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || !!(userInfo && userInfo.coins < 10)}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} />
                      Генерация {Math.round(generationProgress)}%
                    </>
                  ) : (
                    "Сгенерировать"
                  )}
                </GenerateButton>

                <ContinueButton
                  onClick={handleContinue}
                  disabled={images.length === 0}
                  $isEnabled={images.length > 0}
                >
                  Продолжить
                </ContinueButton>

                {userInfo && (
                  <div style={{ fontSize: '0.875rem', color: 'rgba(160, 160, 160, 1)', transition: 'color 0.3s ease' }}>
                    Ваши кредиты: <span style={{ fontWeight: 600, color: userInfo.coins < 10 ? 'rgba(255, 100, 100, 1)' : 'rgba(200, 200, 200, 1)' }}>{userInfo.coins}</span> (нужно 10 кредитов для генерации 1 фото)
                  </div>
                )}

                <TipsCard>
                  <TipsTitle>Советы:</TipsTitle>
                  <TipsList>
                    <li>Будьте конкретны в описании</li>
                    <li>Укажите стиль (реализм, арт, абстракция)</li>
                    <li>Добавьте детали освещения и настроения</li>
                  </TipsList>
                </TipsCard>
              </PromptForm>
            </PromptCard>
          </PromptSection>
        </GridContainer>
      </ContentWrapper>

      {/* Модальное окно для Free и BASE подписки */}
      {showFreeSubscriptionModal && (
        <ModalOverlay onClick={() => setShowFreeSubscriptionModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Создание платного альбома</ModalTitle>
            <ModalText>
              {userInfo?.subscription_type?.toLowerCase() === 'base' 
                ? 'Создание платного альбома доступно только для подписок Standard и Premium. Оформите подписку, чтобы создавать платные альбомы и получать 15% от продаж.'
                : 'Вы не можете создать платный Альбом так как у вас подписка Free. Оформите подписку Standard или Premium, чтобы создавать платные альбомы и получать 15% от продаж.'}
            </ModalText>
            <ModalButtons>
              <ModalButton $variant="secondary" onClick={handleFinishCreation}>
                Закончить Создание
              </ModalButton>
              <ModalButton $variant="primary" onClick={handleBuySubscription}>
                Купить подписку
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Модальное окно для просмотра фото в полном размере */}
      {selectedImage && createPortal(
        <>
          <ImageModal 
            $isOpen={!!selectedImage}
            onClick={() => setSelectedImage(null)}
          >
            <ModalImage 
              src={selectedImage} 
              alt="Full size"
              onClick={(e) => e.stopPropagation()}
            />
          </ImageModal>
          <CloseButton 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setSelectedImage(null);
            }} 
            title="Закрыть (Esc)"
          >
            <CloseIcon size={24} />
          </CloseButton>
        </>,
        document.body
      )}
      
      {selectedPhoto && createPortal(
        <PromptModalOverlay onClick={() => {
          setSelectedPhoto(null);
          setSelectedPrompt(null);
          setPromptError(null);
          setIsLoadingPrompt(false);
        }}>
          <PromptModalContent onClick={(e) => e.stopPropagation()}>
            <PromptCloseButton 
              onClick={(e) => {
                e.stopPropagation();
              setSelectedPhoto(null);
              setSelectedPrompt(null);
              setPromptError(null);
              setIsLoadingPrompt(false);
              }}
              title="Закрыть (Esc)"
            >
              ×
            </PromptCloseButton>
            <PromptModalImageContainer>
              <PromptModalImage src={selectedPhoto} alt="Full size" />
            </PromptModalImageContainer>
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
                    ×
                  </button>
                </div>
              </PromptPanelHeader>
              {isLoadingPrompt ? (
                <PromptLoading>Загрузка промпта...</PromptLoading>
              ) : promptError ? (
                <PromptError>{promptError}</PromptError>
              ) : selectedPrompt ? (
                <PromptPanelText>{selectedPrompt}</PromptPanelText>
              ) : null}
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
                  zIndex: 100002,
                  fontWeight: '600'
                }}
              >
                Показать промпт
              </button>
            )}
          </PromptModalContent>
        </PromptModalOverlay>,
        document.body
      )}
    </MainContainer>
  );
};

