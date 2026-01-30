import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiX, FiImage, FiFolder, FiVolume2, FiPlay, FiPause, FiSettings } from 'react-icons/fi';
import { Plus, Loader2 } from 'lucide-react';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import { CircularProgress } from './ui/CircularProgress';
import { useIsMobile } from '../hooks/useIsMobile';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { PromptGlassModal } from './PromptGlassModal';
import { VoiceSelectorModal } from './VoiceSelectorModal';

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex !important;
  align-items: flex-start;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  position: relative;
  z-index: 10;
  width: 100%;
  /* DEBUG: Принудительные стили видимости */
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 50px !important;
`;

const MessageWithButtons = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  max-width: 75%;
  flex-shrink: 1;

  @media (max-width: 768px) {
    max-width: 85%;
  }
`;

const MessageContent = styled.div<{ $isUser: boolean; $imageOnly?: boolean }>`
  max-width: ${props => props.$imageOnly ? 'none' : '100%'};
  padding: ${props => props.$imageOnly ? '0 !important' : theme.spacing.lg};
  border-radius: ${props => props.$imageOnly
    ? '0'
    : props.$isUser
      ? `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm} ${theme.borderRadius.xl}`
      : `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm}`
  };
  background: ${props => props.$imageOnly
    ? 'transparent !important'
    : props.$isUser
      ? 'rgba(50, 50, 50, 0.6)'
      : 'rgba(30, 30, 30, 0.6)'
  };
  backdrop-filter: ${props => props.$imageOnly ? 'none' : 'blur(15px)'};
  -webkit-backdrop-filter: ${props => props.$imageOnly ? 'none' : 'blur(15px)'};
  color: rgba(240, 240, 240, 1) !important;
  border: ${props => props.$imageOnly
    ? 'none !important'
    : `1px solid ${props.$isUser
      ? 'rgba(60, 60, 60, 0.5)'
      : 'rgba(40, 40, 40, 0.5)'
    }`
  };
  box-shadow: ${props => props.$imageOnly
    ? 'none !important'
    : '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  };
  position: relative;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.7;
  transition: all 0.3s ease;
  /* DEBUG: Принудительные стили видимости */
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  z-index: 10;
  min-height: 40px !important;
  min-width: 0;

  @media (max-width: 768px) {
    padding: ${props => props.$imageOnly ? '0 !important' : '10px 14px'};
    line-height: 1.5;
    font-size: 0.95rem;
  }
  
  &:hover {
    ${props => !props.$imageOnly && `
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      border-color: ${props.$isUser
      ? 'rgba(70, 70, 70, 0.7)'
      : 'rgba(50, 50, 50, 0.7)'
    };
    `}
  }
`;

const MessageText = styled.div`
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  margin-bottom: ${theme.spacing.md};
  position: relative;
  flex: 1;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  /* DEBUG: Принудительные стили видимости */
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  color: rgba(240, 240, 240, 1) !important;
  min-height: 20px !important;
`;

const ImageContainer = styled.div`
  position: relative;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease;
  background: transparent !important;
  border: none !important;
  cursor: pointer;
  pointer-events: auto;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const MessageImage = styled.img`
  max-width: min(600px, 100%);
  max-height: 600px;
  width: auto;
  height: auto;
  display: block !important;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
  object-fit: contain;
  cursor: pointer;
  transition: all 0.2s ease;
  pointer-events: auto;
  user-select: none;

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 400px;
  }
  
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
  }
`;

const ImageButtons = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  justify-content: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  
  ${ImageContainer}:hover & {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    opacity: 1;
  }
`;

const ImageButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: rgba(100, 100, 100, 0.9);
  border: 1px solid rgba(150, 150, 150, 1);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover:not(:disabled) {
    background: rgba(120, 120, 120, 1);
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MessageTime = styled.div<{ $isUser: boolean }>`
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  margin-top: ${theme.spacing.sm};
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const Avatar = styled.div<{ $isUser: boolean; $avatarUrl?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    if (props.$avatarUrl) {
      return 'transparent';
    }
    return props.$isUser
      ? 'rgba(60, 60, 60, 0.8)'
      : 'rgba(40, 40, 40, 0.8)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${theme.fontSize.lg};
  color: rgba(240, 240, 240, 1);
  border: 1px solid ${props => props.$isUser
    ? 'rgba(70, 70, 70, 0.6)'
    : 'rgba(50, 50, 50, 0.6)'
  };
  flex-shrink: 0;
  overflow: hidden;

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: ${theme.fontSize.base};
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${theme.borderRadius.full};
`;

const CreditCost = styled.span`
  font-size: 10px;
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  font-weight: 500;
  color: #ec4899;
  transition: all 0.2s ease-in-out;
`;

const VoiceButton = styled.button`
  background: rgba(236, 72, 153, 0.15);
  border: 1px solid rgba(236, 72, 153, 0.3);
  color: #ec4899;
  cursor: pointer;
  padding: 8px 12px;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  border-radius: 12px;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 600;
  backdrop-filter: blur(5px);
  min-width: 150px;
  /* DEBUG: Принудительные стили видимости */
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 10 !important;
  
  &:hover:not(:disabled) {
    background: rgba(236, 72, 153, 0.25);
    border-color: rgba(236, 72, 153, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.2);

    ${CreditCost} {
      opacity: 0.8;
      max-height: 20px;
      margin-top: 4px;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const VoiceButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WaveformContainer = styled.div<{ $isPlaying: boolean }>`
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%);
  display: ${props => props.$isPlaying ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 16px;
  z-index: 10;
  pointer-events: none;
`;

const WaveformBar = styled.div<{ $delay: number; $isPremium?: boolean }>`
  width: 4px;
  background: ${props => props.$isPremium
    ? 'linear-gradient(to top, #ff0000, #ff4444, #ff0000)'
    : 'linear-gradient(to top, #ffd700, #ffed4e, #ffd700)'};
  border-radius: 2px;
  box-shadow: ${props => props.$isPremium
    ? '0 0 8px rgba(255, 0, 0, 0.6)'
    : '0 0 8px rgba(255, 215, 0, 0.6)'};
  animation: waveform ${props => 0.4 + props.$delay * 0.08}s ease-in-out infinite;
  animation-delay: ${props => props.$delay * 0.08}s;
  
  @keyframes waveform {
    0%, 100% {
      height: 6px;
      opacity: 0.7;
    }
    50% {
      height: 16px;
      opacity: 1;
    }
  }
`;

const RepeatButton = styled(VoiceButton)`
  position: relative;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  min-width: 120px;
  overflow: visible;
  
  &:hover:not(:disabled) {
    background: rgba(16, 185, 129, 0.25);
    border-color: rgba(16, 185, 129, 0.5);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  }
`;

const SelectVoiceButton = styled(VoiceButton)`
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  min-width: 120px;
  
  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }
`;

const MessageButtonsRow = styled.div`
  display: flex !important;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
  /* DEBUG: Принудительные стили видимости для кнопок голоса */
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 100 !important;
  min-height: 40px !important;
`;

// Удалены FullscreenOverlay и FullscreenImage, теперь используем ModalOverlay и ModalImage

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xl};
  right: ${theme.spacing.xl};
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 60, 60, 0.9);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.full};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xl};
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  z-index: 10001;
  
  &:hover {
    background: rgba(80, 80, 80, 0.95);
    border-color: rgba(180, 180, 180, 0.5);
    transform: scale(1.1);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: ${theme.spacing.xl};
`;

const ErrorModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100001;
  padding: ${theme.spacing.xl};
`;

const ErrorModalContent = styled.div`
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ErrorModalTitle = styled.h2`
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
`;

const ErrorModalMessage = styled.div`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorModalCloseButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
  }
`;

const ModalContent = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  max-height: 90vh;
  gap: ${theme.spacing.lg};
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    max-height: 100vh;
  }
`;

const ModalImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  
  img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: center;
  }

  @media (max-width: 768px) {
    max-height: none;
    height: auto;
    
    img {
      max-width: 100vw;
      max-height: 100vh;
      width: auto;
      height: auto;
    }
  }
`;

const ModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    max-height: 100%;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
`;

const PromptPanel = styled.div`
  width: 400px;
  min-width: 350px;
  max-width: 30%;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.colors.shadow.glow};
  transition: all ${theme.transition.fast};
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const PromptPanelTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const PromptCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.primary};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transition.fast};
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const PromptPanelText = styled.div`
  flex: 1;
  overflow-y: auto;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  padding: ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.5);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid rgba(100, 100, 100, 0.3);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.5);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 4px;
    
    &:hover {
      background: rgba(139, 92, 246, 0.7);
    }
  }
`;

const PromptLoading = styled.div`
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptError = styled.div`
  color: ${theme.colors.status.error || '#ff6b6b'};
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

interface MessageProps {
  message: {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string;
    generationTime?: number; // Время генерации изображения в секундах
  };
  characterName?: string;
  characterAvatar?: string;
  voiceUrl?: string;
  userAvatar?: string;
  userUsername?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  isTyping?: boolean;
  isAdmin?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
  userInfo?: {
    subscription?: {
      subscription_type?: string;
    };
    subscription_type?: string;
  } | null;
  onShop?: () => void;
  selectedVoiceId?: string | null;
  selectedVoiceUrl?: string | null;
  onSelectVoice?: (voiceId: string | null, voiceUrl: string | null) => void;
}

const TypingCursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 18px;
  background-color: ${theme.colors.primary || '#8b5cf6'};
  margin-left: 4px;
  vertical-align: middle;
  border-radius: 2px;
  box-shadow: 0 0 8px ${theme.colors.primary || '#8b5cf6'};
  animation: blink 1s infinite;

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

const MessageComponent: React.FC<MessageProps> = ({
  message,
  characterName,
  characterAvatar,
  voiceUrl,
  userAvatar,
  userUsername,
  userEmail,
  isAuthenticated,
  isCharacterOwner,
  isTyping,
  isAdmin,
  onAddToGallery,
  onAddToPaidAlbum,
  userInfo,
  onShop,
  selectedVoiceId: propSelectedVoiceId,
  selectedVoiceUrl: propSelectedVoiceUrl,
  onSelectVoice
}) => {
  // Функция для получения первой буквы из username или email
  const getUserInitial = (): string => {
    if (userUsername) {
      return userUsername.charAt(0).toUpperCase();
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };
  // Определяем тип сообщения: учитываем и type, и role
  // По умолчанию считаем assistant, если явно не указано user
  const messageType = message.type || (message as any).role;
  const isUser = messageType === 'user';
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Безопасная проверка imageUrl - должна быть выполнена до использования
  const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';

  // Проверяем, является ли сообщение прогрессом генерации
  const isGenerationProgress = message.content && /^\d+%$/.test(message.content.trim()) && !hasValidImageUrl;

  // Проверяем условия для отображения кнопки голоса
  const hasContent = message.content && message.content.trim().length > 0;
  const shouldShowVoiceButton = !isUser && hasContent && !isGenerationProgress;

  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [isAddingToPaidAlbum, setIsAddingToPaidAlbum] = useState(false);
  const [isAddingToGallery, setIsAddingToGallery] = useState(false);
  const [isAddedToGallery, setIsAddedToGallery] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const [isVoiceSelectorOpen, setIsVoiceSelectorOpen] = useState(false);
  
  // Используем переданные из ChatContainer значения или локальные (для обратной совместимости)
  const selectedVoiceId = propSelectedVoiceId ?? null;
  const selectedVoiceUrl = propSelectedVoiceUrl ?? null;

  // Функция для создания стабильного ключа на основе characterName и content
  // Это позволяет находить audioUrl даже после обновления страницы, когда ID сообщения может измениться
  const getStorageKey = useCallback(() => {
    if (!characterName || !message.content || !message.content.trim()) {
      // Если нет characterName или content, используем message.id как fallback
      const fallbackKey = `audio_url_${message.id}`;
      return fallbackKey;
    }
    // Нормализуем content: убираем лишние пробелы и берем первые 200 символов
    const normalizedContent = message.content.trim().replace(/\s+/g, ' ').substring(0, 200);
    // Создаем ключ на основе characterName и нормализованного content
    const str = `${characterName}_${normalizedContent}`;
    // Простая hash функция для создания более короткого ключа
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const storageKey = `audio_url_${Math.abs(hash)}`;
    return storageKey;
  }, [characterName, message.content, message.id]);

  // Восстанавливаем audioUrl из localStorage при монтировании компонента
  useEffect(() => {
    const storageKey = getStorageKey();
    let savedAudioUrl = localStorage.getItem(storageKey);
    
    // Если не найден по основному ключу, пробуем найти по message.id (fallback для старых записей)
    if (!savedAudioUrl && message.id) {
      const fallbackKey = `audio_url_${message.id}`;
      savedAudioUrl = localStorage.getItem(fallbackKey);
      if (savedAudioUrl) {
        // Мигрируем на новый ключ
        localStorage.setItem(storageKey, savedAudioUrl);
        localStorage.removeItem(fallbackKey);
      }
    }
    
    if (savedAudioUrl) {
      setAudioUrl(savedAudioUrl);
    } else {
    }
  }, [getStorageKey, message.id]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleGenerateVoice = async (e?: React.MouseEvent, paramVoiceId?: string | null, paramVoiceUrl?: string | null) => {
    if (e) {
      e.stopPropagation();
    }
    if (!message.content || isVoiceLoading) return;

    // Logic moved to Repeat button
    // if (audioUrl) { ... } - removed to allow regeneration

    // Если уже играет - останавливаем перед новой генерацией
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setIsVoiceLoading(true);
    try {
      const token = authManager.getToken();
      // Очищаем текст от лишних символов для TTS (например, Markdown)
      const cleanText = message.content.replace(/[\*\_\~]/g, '');

      // Определяем какой голос использовать: переданный параметр, выбранный в модальном окне или текущий
      let finalVoiceUrl: string | null = null;
      
      // Сначала проверяем переданные параметры функции (для обратной совместимости)
      if (paramVoiceId !== undefined && paramVoiceId !== null) {
        finalVoiceUrl = `/default_character_voices/${paramVoiceId}`;
      } else if (paramVoiceUrl !== undefined && paramVoiceUrl !== null) {
        finalVoiceUrl = paramVoiceUrl;
      }
      // Затем проверяем сохраненные значения из state компонента (выбранные в модальном окне)
      else if (selectedVoiceId) {
        finalVoiceUrl = `/default_character_voices/${selectedVoiceId}`;
      } else if (selectedVoiceUrl) {
        finalVoiceUrl = selectedVoiceUrl;
      }
      // Если ничего не выбрано, используем голос по умолчанию
      else {
        finalVoiceUrl = voiceUrl || "/default_character_voices/[Mita Miside (Russian voice)]Ммм........упим_.mp3";
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/chat/generate_voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: cleanText,
          voice_url: finalVoiceUrl // Используем выбранный голос или голос по умолчанию
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Ошибка генерации голоса');
      }

      const data = await response.json();
      if (data.status === 'success' && data.audio_url) {
        // Формируем полный URL для аудио
        // Если BASE_URL пустой (относительный путь), используем data.audio_url как есть
        // Если BASE_URL задан, добавляем его к audio_url
        const fullAudioUrl = API_CONFIG.BASE_URL 
          ? `${API_CONFIG.BASE_URL}${data.audio_url}` 
          : data.audio_url;
        
        
        setAudioUrl(fullAudioUrl);
        
        // Сохраняем audioUrl в localStorage для восстановления после обновления страницы
        // Используем стабильный ключ на основе characterName и content
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, fullAudioUrl);

        // Обновляем баланс пользователя если он вернулся в ответе
        if (data.remaining_coins !== undefined) {
          window.dispatchEvent(new CustomEvent('balance-update', { detail: { coins: data.remaining_coins } }));
        }

        // Проигрываем аудио
        const audio = new Audio(fullAudioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
        };
        audio.onpause = () => {
          setIsPlaying(false);
        };
        audio.onerror = (e) => {
          setIsPlaying(false);
          setErrorModalMessage(`Ошибка воспроизведения аудио: ${audio.error?.message || 'Неизвестная ошибка'}`);
        };
        audio.onloadstart = () => {
        };
        audio.oncanplay = () => {
        };
        audio.onloadeddata = () => {
        };
        
        // Автоматически воспроизводим после загрузки
        audio.load();
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          setIsPlaying(false);
          setErrorModalMessage(`Не удалось воспроизвести аудио: ${error.message || 'Неизвестная ошибка'}`);
        });
      }
    } catch (error) {
      setErrorModalMessage(error instanceof Error ? error.message : 'Не удалось сгенерировать голос');
    } finally {
      setIsVoiceLoading(false);
    }
  };

  const timeString = message.timestamp.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const progressMatch = isGenerationProgress ? message.content.match(/(\d+)%/) : null;
  const progressValue = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  const handleImageClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (message.imageUrl && hasValidImageUrl) {
      setIsFullscreen(true);
      setIsPromptVisible(true);
      setSelectedPrompt(null);
      setPromptError(null);
      setIsLoadingPrompt(true);

      try {
        const { prompt, errorMessage } = await fetchPromptByImage(message.imageUrl);

        if (prompt) {
          // Переводим промпт на русский для отображения
          const translatedPrompt = await translateToRussian(prompt);
          setSelectedPrompt(translatedPrompt);
        } else {
          setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
        }
      } catch (error) {
        setPromptError('Не удалось загрузить промпт');
      } finally {
        setIsLoadingPrompt(false);
      }
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(false);
  };

  const handleClosePrompt = () => {
    setIsPromptVisible(false);
  };

  // Обработка клавиши Escape для закрытия модального окна
  useEffect(() => {
    if (!isFullscreen && !errorModalMessage) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          handleCloseFullscreen();
        }
        if (errorModalMessage) {
          setErrorModalMessage(null);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen, errorModalMessage]);

  const [isAddedToPaidAlbum, setIsAddedToPaidAlbum] = useState(false);

  // Функция для нормализации URL (убираем параметры запроса и нормализуем)
  const normalizeUrl = useCallback((url: string): string => {
    if (!url) return '';
    try {
      // Если URL относительный, делаем его абсолютным
      let absoluteUrl = url;
      if (!url.startsWith('http')) {
        absoluteUrl = `${window.location.origin}${url.startsWith('/') ? url : '/' + url}`;
      }
      const urlObj = new URL(absoluteUrl);
      // Убираем параметры запроса для сравнения, нормализуем путь
      const normalized = `${urlObj.origin}${urlObj.pathname}`.toLowerCase().replace(/\/$/, '');
      return normalized;
    } catch {
      // Если не валидный URL, возвращаем нормализованную версию
      const cleaned = url.split('?')[0].split('#')[0].toLowerCase().trim();
      // Если относительный путь, добавляем origin
      if (cleaned.startsWith('/')) {
        return `${window.location.origin}${cleaned}`.toLowerCase();
      }
      return cleaned;
    }
  }, []);

  // Проверяем, добавлено ли фото уже в альбом при загрузке компонента
  // Только для владельцев персонажа - остальным эта проверка не нужна
  useEffect(() => {
    const checkIfPhotoInAlbum = async () => {
      const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
      // Добавляем проверку isCharacterOwner - только владельцы могут добавлять фото в альбом
      if (!hasValidImageUrl || !characterName || !isAuthenticated || !onAddToPaidAlbum || !isCharacterOwner) {
        return;
      }

      try {
        const token = authManager.getToken();
        if (!token) {
          return;
        }

        const encodedName = encodeURIComponent(characterName);
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${encodedName}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const photos = data.images || [];
          const normalizedMessageUrl = normalizeUrl(message.imageUrl);

          // Проверяем как точное совпадение, так и нормализованное
          const photoExists = photos.some((photo: any) => {
            if (!photo) return false;

            // Поддерживаем разные форматы: photo.url, photo.image_url, photo.photo_url
            const photoUrl = photo.url || photo.image_url || photo.photo_url;
            if (!photoUrl) return false;

            // Точное совпадение
            if (photoUrl === message.imageUrl) return true;

            // Нормализованное сравнение
            const normalizedPhotoUrl = normalizeUrl(photoUrl);
            if (normalizedPhotoUrl === normalizedMessageUrl) return true;

            // Сравнение без учета протокола и домена (только путь)
            const messagePath = message.imageUrl.split('?')[0].split('#')[0];
            const photoPath = photoUrl.split('?')[0].split('#')[0];
            if (messagePath === photoPath) return true;

            // Сравнение последней части пути (имя файла)
            const messageFileName = messagePath.split('/').pop();
            const photoFileName = photoPath.split('/').pop();
            if (messageFileName && photoFileName && messageFileName === photoFileName) return true;

            return false;
          });

          if (photoExists) {
            setIsAddedToPaidAlbum(true);
          }
        }
      } catch (error) {
        // Игнорируем ошибки при проверке
      }
    };

    checkIfPhotoInAlbum();
  }, [message.imageUrl, characterName, isAuthenticated, onAddToPaidAlbum, isCharacterOwner, normalizeUrl]);

  const handleAddToPaidAlbumClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
    if (!hasValidImageUrl || !characterName || !onAddToPaidAlbum || !isAuthenticated || isAddedToPaidAlbum) {
      return;
    }

    setIsAddingToPaidAlbum(true);
    try {
      await onAddToPaidAlbum(message.imageUrl!, characterName);
      // Устанавливаем состояние сразу после успешного добавления
      setIsAddedToPaidAlbum(true);

      // Дополнительно проверяем через небольшую задержку, чтобы убедиться
      setTimeout(async () => {
        try {
          const token = authManager.getToken();
          if (!token) return;

          const encodedName = encodeURIComponent(characterName);
          const response = await fetch(
            `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${encodedName}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            const photos = data.images || [];
            const normalizedMessageUrl = normalizeUrl(message.imageUrl!);

            const photoExists = photos.some((photo: any) => {
              if (!photo) return false;

              // Поддерживаем разные форматы: photo.url, photo.image_url, photo.photo_url
              const photoUrl = photo.url || photo.image_url || photo.photo_url;
              if (!photoUrl) return false;

              // Точное совпадение
              if (photoUrl === message.imageUrl) return true;

              // Нормализованное сравнение
              const normalizedPhotoUrl = normalizeUrl(photoUrl);
              if (normalizedPhotoUrl === normalizedMessageUrl) return true;

              // Сравнение без учета протокола и домена (только путь)
              const messagePath = message.imageUrl!.split('?')[0].split('#')[0];
              const photoPath = photoUrl.split('?')[0].split('#')[0];
              if (messagePath === photoPath) return true;

              // Сравнение последней части пути (имя файла)
              const messageFileName = messagePath.split('/').pop();
              const photoFileName = photoPath.split('/').pop();
              if (messageFileName && photoFileName && messageFileName === photoFileName) return true;

              return false;
            });

            if (photoExists) {
              setIsAddedToPaidAlbum(true);
            }
          }
        } catch (error) {
          // Игнорируем ошибки при дополнительной проверке
        }
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить фото в платный альбом';
      setErrorModalMessage(errorMessage);
      // Не устанавливаем isAddedToPaidAlbum в true при ошибке
    } finally {
      setIsAddingToPaidAlbum(false);
    }
  };

  const handleAddToGalleryClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
    if (!hasValidImageUrl || !characterName || !onAddToGallery || !isAuthenticated) {
      return;
    }

    setIsAddingToGallery(true);
    try {
      await onAddToGallery(message.imageUrl!, characterName);
      setIsAddedToGallery(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось добавить фото в альбом');
    } finally {
      setIsAddingToGallery(false);
    }
  };


  // Для прогресса генерации - отображаем БЕЗ MessageContent контейнера (прозрачный фон)
  // Убираем аватар при генерации фото
  if (isGenerationProgress && !hasValidImageUrl) {
    return (
      <>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          marginBottom: '0.5rem',
          width: '100%',
          gap: '1rem'
        }}>
          <CircularProgress progress={progressValue} size={60} showLabel={false} />
        </div>
      </>
    );
  }

  // Для фото без текста - чистое отображение (v2)
  // Проверяем, что content пустой или содержит только пробелы
  // Убираем аватар при генерации фото
  const hasOnlyImage = hasValidImageUrl && (!message.content || message.content.trim() === '');

  if (hasOnlyImage) {
    return (
      <>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          marginBottom: '0.5rem',
          width: '100%',
          gap: '1rem'
        }}>
          <div style={{
            position: 'relative',
            background: 'transparent',
            padding: 0,
            border: 'none',
            boxShadow: 'none'
          }}>
            <ImageContainer
              onClick={hasValidImageUrl ? handleImageClick : undefined}
              style={{ cursor: hasValidImageUrl ? 'pointer' : 'default' }}
            >
              <MessageImage
                src={hasValidImageUrl ? message.imageUrl : undefined}
                alt="Generated image"
                onClick={hasValidImageUrl ? handleImageClick : undefined}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {message.generationTime !== undefined && message.generationTime !== null && message.generationTime > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  pointerEvents: 'none',
                  zIndex: 10,
                  backdropFilter: 'blur(4px)'
                }}>
                  ⏱ {message.generationTime < 60
                    ? `${Math.round(message.generationTime)}с`
                    : `${Math.round(message.generationTime / 60)}м ${Math.round(message.generationTime % 60)}с`}
                </div>
              )}
              {isAuthenticated && characterName && onAddToPaidAlbum && !isAddedToPaidAlbum && isCharacterOwner && (
                <ImageButtons onClick={(e) => e.stopPropagation()}>
                  <ImageButton
                    onClick={handleAddToPaidAlbumClick}
                    disabled={isAddingToPaidAlbum}
                    title="Добавить в альбом"
                  >
                    <Plus size={14} />
                    {isAddingToPaidAlbum ? 'Добавление...' : 'В альбом'}
                  </ImageButton>
                </ImageButtons>
              )}
            </ImageContainer>
          </div>
        </div>
        <PromptGlassModal
          isOpen={isFullscreen && !!message.imageUrl}
          onClose={handleCloseFullscreen}
          imageUrl={message.imageUrl || ''}
          imageAlt="Fullscreen image"
          promptText={selectedPrompt}
          isLoading={isLoadingPrompt}
          error={promptError}
        />

        {errorModalMessage && createPortal(
          <ErrorModalOverlay onClick={() => setErrorModalMessage(null)}>
            <ErrorModalContent onClick={(e) => e.stopPropagation()}>
              <ErrorModalTitle>Ошибка</ErrorModalTitle>
              <ErrorModalMessage>{errorModalMessage}</ErrorModalMessage>
              <ErrorModalCloseButton onClick={() => setErrorModalMessage(null)}>
                Закрыть
              </ErrorModalCloseButton>
            </ErrorModalContent>
          </ErrorModalOverlay>,
          document.body
        )}
      </>
    );
  }

  // Обычное сообщение с текстом

  return (
    <>
      <MessageContainer $isUser={isUser}>
        {/* Аватар модели слева */}
        {!isUser && (
          <Avatar $isUser={false} $avatarUrl={characterAvatar}>
            {characterAvatar ? (
              <AvatarImage src={characterAvatar} alt={characterName || 'Character'} />
            ) : (
              'AI'
            )}
          </Avatar>
        )}

        <MessageContent
          $isUser={isUser}
          $imageOnly={false}
        >
          {message.content && !isGenerationProgress && (
            <>
              <MessageText>
                {message.content}
                {isTyping && <TypingCursor />}
              </MessageText>
              {shouldShowVoiceButton && (
                <MessageButtonsRow>
                  <VoiceButton onClick={handleGenerateVoice} disabled={isVoiceLoading}>
                    {isVoiceLoading ? (
                      <VoiceButtonContent>
                        <Loader2 className="animate-spin" />
                        <span>Генерация...</span>
                      </VoiceButtonContent>
                    ) : (
                      <>
                        <VoiceButtonContent>
                          <FiVolume2 />
                          <span>{audioUrl ? 'Перегенерировать' : 'Сгенерировать голос'}</span>
                        </VoiceButtonContent>
                        <CreditCost>
                          {Math.max(1, Math.ceil((message.content.replace(/[\*\_\~]/g, '').length) / 30))} кредитов
                        </CreditCost>
                      </>
                    )}
                  </VoiceButton>

                  <RepeatButton
                    onClick={() => {
                      if (isPlaying && audioRef.current) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                      } else if (audioUrl) {
                        // Если audioRef.current существует, используем его, иначе создаем новый
                        if (audioRef.current) {
                          // Если аудио уже загружено, просто воспроизводим
                          audioRef.current.currentTime = 0; // Сбрасываем на начало
                          audioRef.current.play().then(() => {
                            setIsPlaying(true);
                          }).catch((error) => {
                            setIsPlaying(false);
                          });
                        } else {
                          // Создаем новый Audio объект
                          const audio = new Audio(audioUrl);
                          audioRef.current = audio;
                          audio.onended = () => {
                            setIsPlaying(false);
                          };
                          audio.onpause = () => {
                            setIsPlaying(false);
                          };
                          audio.onerror = (e) => {
                            setIsPlaying(false);
                            setErrorModalMessage('Ошибка воспроизведения аудио. Попробуйте перегенерировать голос.');
                          };
                          audio.play().then(() => {
                            setIsPlaying(true);
                          }).catch((error) => {
                            setIsPlaying(false);
                            setErrorModalMessage('Не удалось воспроизвести аудио. Попробуйте перегенерировать голос.');
                          });
                        }
                      }
                    }}
                    disabled={!audioUrl}
                  >
                    <VoiceButtonContent>
                      {isPlaying ? <FiPause /> : <FiPlay />}
                      <span>{isPlaying ? 'Остановить' : 'Повторить'}</span>
                    </VoiceButtonContent>
                    {isPlaying && (
                      <WaveformContainer $isPlaying={isPlaying}>
                        {[...Array(5)].map((_, i) => (
                          <WaveformBar key={i} $delay={i} $isPremium={false} />
                        ))}
                      </WaveformContainer>
                    )}
                  </RepeatButton>

                  <SelectVoiceButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVoiceSelectorOpen(true);
                    }}
                  >
                    <VoiceButtonContent>
                      <FiSettings />
                      <span>Выбрать голос</span>
                    </VoiceButtonContent>
                  </SelectVoiceButton>
                </MessageButtonsRow>
              )}
            </>
          )}

          {hasValidImageUrl && (
            <ImageContainer
              onClick={handleImageClick}
              style={{
                margin: '0',
                padding: '0',
                background: 'transparent',
                border: 'none'
              }}
            >
              <MessageImage
                src={message.imageUrl!}
                alt="Generated image"
                onClick={handleImageClick}
                style={{
                  maxWidth: '600px',
                  maxHeight: '600px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                  display: 'block',
                  margin: '0',
                  padding: '0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </ImageContainer>
          )}

          {/* Время не показываем если только фото без текста */}
          {(message.content || !hasValidImageUrl) && (
            <MessageTime $isUser={isUser}>
              {timeString}
            </MessageTime>
          )}
        </MessageContent>

        {/* Аватар пользователя справа */}
        {isUser && (message.content || !hasValidImageUrl) && (
          <Avatar $isUser={true} $avatarUrl={userAvatar}>
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt="User" />
            ) : (
              getUserInitial()
            )}
          </Avatar>
        )}
      </MessageContainer>

      <PromptGlassModal
        isOpen={isFullscreen && hasValidImageUrl}
        onClose={handleCloseFullscreen}
        imageUrl={message.imageUrl || ''}
        imageAlt="Fullscreen image"
        promptText={selectedPrompt}
        isLoading={isLoadingPrompt}
        error={promptError}
      />

      {errorModalMessage && createPortal(
        <ErrorModalOverlay onClick={() => setErrorModalMessage(null)}>
          <ErrorModalContent onClick={(e) => e.stopPropagation()}>
            <ErrorModalTitle>Ошибка</ErrorModalTitle>
            <ErrorModalMessage>{errorModalMessage}</ErrorModalMessage>
            <ErrorModalCloseButton onClick={() => setErrorModalMessage(null)}>
              Закрыть
            </ErrorModalCloseButton>
          </ErrorModalContent>
        </ErrorModalOverlay>,
        document.body
      )}

      <VoiceSelectorModal
        isOpen={isVoiceSelectorOpen}
        onClose={() => setIsVoiceSelectorOpen(false)}
        onSelectVoice={(voiceId, voiceUrl) => {
          setIsVoiceSelectorOpen(false);
          // Сохраняем выбранный голос через callback в ChatContainer
          // Голос будет использован при следующей генерации для всех сообщений
          if (onSelectVoice) {
            onSelectVoice(voiceId, voiceUrl);
          }
        }}
        currentVoiceUrl={voiceUrl}
        userInfo={userInfo}
        onShop={onShop}
      />
    </>
  );
};

// Мемоизируем компонент для предотвращения лишних перерендеров
export const Message = memo(MessageComponent);
