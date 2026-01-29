import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { theme } from '../theme';
import { FiX } from 'react-icons/fi';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';

// Функция для проверки премиальных голосов (права доступа)
const isPremiumVoice = (voiceName?: string): boolean => {
  if (!voiceName) return false;
  const name = voiceName.toLowerCase();
  return name.includes('мита') || name.includes('meet') || name === 'мика' || name === 'ника';
};

// Для оформления: Ника — без красной обводки, зелёная галочка; права только для премиум сохраняются
const isPremiumVoiceForStyle = (voiceName?: string): boolean => {
  if (!voiceName) return false;
  const name = voiceName.toLowerCase();
  if (name === 'ника') return false;
  return name.includes('мита') || name.includes('meet') || name === 'мика';
};

// Функция для получения пути к фото голоса
const getVoicePhotoPath = (voiceName: string): string => {
  // Убираем расширение если есть и нормализуем имя
  const normalizedName = voiceName.replace(/\.(mp3|wav|ogg)$/i, '');
  // В Vite файлы из public доступны по корневому пути
  // Пробуем сначала .png, так как файлы в формате PNG
  return `/default_voice_photo/${normalizedName}.png`;
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  max-width: 980px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(236, 72, 153, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
`;

const ModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(to right, #fff, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.primary};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button<{ $isActive: boolean }>`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${props => props.$isActive ? '#ec4899' : 'transparent'};
  color: ${props => props.$isActive ? '#ec4899' : 'rgba(255, 255, 255, 0.6)'};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;

  &:hover {
    color: #ec4899;
    border-bottom-color: ${props => props.$isActive ? '#ec4899' : 'rgba(236, 72, 153, 0.5)'};
  }

  &:focus,
  &:active {
    outline: none;
  }
`;

const VoicesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: ${theme.spacing.md};
  align-items: start;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ExpandButton = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: ${theme.spacing.md};
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  transition: all 0.3s ease;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  
  &:hover {
    color: ${theme.colors.text.primary};
    background: rgba(255, 255, 255, 0.05);
  }

  svg {
    transform: rotate(${props => props.$isExpanded ? '180deg' : '0deg'});
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: ${props => props.$isExpanded ? 'none' : 'arrowBounce 2s infinite'};
  }

  @keyframes arrowBounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    40% {
      transform: translateY(5px) rotate(0deg);
    }
    60% {
      transform: translateY(3px) rotate(0deg);
    }
  }
`;

const VoicePhotoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin: 8px;
  overflow: visible;
  z-index: 1;
`;

const VoicePhotoContainer = styled.div<{ $isSelected: boolean; $isPlaying: boolean; $voiceName?: string; $isUserVoice?: boolean }>`
  position: relative;
  width: 74px;
  height: 74px;
  min-width: 74px;
  min-height: 74px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${props => {
    const playingScale = props.$isPlaying ? 1.05 : 1;
    return `scale(${playingScale})`;
  }};
  overflow: visible;
  border-radius: 50%;
  
  /* Анимированная градиентная рамка для премиальных голосов (не для Ника) */
  ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    if (!isPremium) return '';
    return `
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% + 12px);
        height: calc(100% + 12px);
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          #ff0000 0%,
          #ff4444 25%,
          #ff6666 50%,
          #ff0000 75%,
          #cc0000 100%,
          #ff0000
        );
        z-index: 2;
        pointer-events: none;
        animation: rotateGradientBorder 3s linear infinite;
        padding: 3px;
        -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }
      
      @keyframes rotateGradientBorder {
        0% {
          background: conic-gradient(from 0deg, #ff0000 0%, #ff4444 25%, #ff6666 50%, #ff0000 75%, #cc0000 100%, #ff0000);
        }
        100% {
          background: conic-gradient(from 360deg, #ff0000 0%, #ff4444 25%, #ff6666 50%, #ff0000 75%, #cc0000 100%, #ff0000);
        }
      }
    `;
  }}
  
  /* Обычная рамка выбора (для не премиальных и для Ника) */
  ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    if (isPremium) return '';
    return `
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% + 8px);
        height: calc(100% + 8px);
        border-radius: 50%;
        border: 3px solid ${props.$isSelected ? '#ffd700' : 'transparent'};
        opacity: ${props.$isSelected ? '1' : '0'};
        z-index: 3;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
    `;
  }}
  
  /* Статичное красное свечение для премиальных голосов (не для Ника) */
  ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    if (!isPremium) return '';
    return `
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.4),
                  0 0 40px rgba(255, 0, 0, 0.3),
                  0 0 60px rgba(255, 0, 0, 0.2);
    `;
  }}
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    return isPremium ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 215, 0, 0.5)';
  }};
    opacity: ${props => props.$isPlaying ? '1' : '0'};
    animation: ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    return props.$isPlaying ? (isPremium ? 'redPulseWave 1.2s ease-out infinite' : 'pulseWave 1.2s ease-out infinite') : 'none';
  }};
    z-index: 0;
    pointer-events: none;
  }
  
  @keyframes pulseWave {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
      border-width: 3px;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0.4;
      border-width: 2px;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
      border-width: 1px;
    }
  }
  
  @keyframes redPulseWave {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
      border-width: 3px;
      border-color: rgba(255, 0, 0, 0.5);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0.4;
      border-width: 2px;
      border-color: rgba(255, 0, 0, 0.4);
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
      border-width: 1px;
      border-color: rgba(255, 0, 0, 0.3);
    }
  }
`;

const VoicePhoto = styled.img<{ $voiceName?: string; $isSelected?: boolean }>`
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  border-radius: 50%;
  object-fit: cover;
  object-position: center;
  position: relative;
  z-index: 2;
  
  /* Компенсация смещения для Миты (изображение смещено влево в PNG файле) */
  transform: ${props => {
    const name = props.$voiceName?.toLowerCase() || '';
    if (name.includes('мита') || name.includes('mita')) {
      return 'translateX(8px)'; // Сдвигаем вправо чтобы отцентровать
    }
    return 'none';
  }};
  
  /* Эффект Shimmer для премиальных голосов (не для Ника) */
  ${props => {
    const isPremium = isPremiumVoiceForStyle(props.$voiceName);
    if (!isPremium) return '';
    return `
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.5),
          rgba(255, 215, 0, 0.3),
          transparent
        );
        animation: shimmerMove 4s ease-in-out infinite;
        z-index: 4;
        pointer-events: none;
        border-radius: 50%;
      }
      
      @keyframes shimmerMove {
        0% {
          left: -100%;
        }
        50% {
          left: 100%;
        }
        100% {
          left: 100%;
        }
      }
    `;
  }}
`;

const VoiceCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  transition: all 0.3s ease;
  border-radius: ${theme.borderRadius.lg};
  position: relative;
  width: 100%;
  min-height: 200px;
`;

const VoiceName = styled.div`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-align: center;
  color: ${theme.colors.text.primary};
  word-break: break-word;
  max-width: 100%;
  margin-bottom: ${theme.spacing.xs};
`;

const VoiceCheckmark = styled.div<{ $show: boolean; $isPremium?: boolean }>`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
  opacity: ${props => props.$show ? '1' : '0'};
  transition: opacity 0.3s ease;
  animation: ${props => props.$show ? 'checkmarkAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none'};
  
  @keyframes checkmarkAppear {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(10deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.7), 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 14px;
    border: 3px solid #4ade80;
    border-top: none;
    border-left: none;
    transform: rotate(45deg) translate(-2px, -2px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    filter: drop-shadow(0 0 3px rgba(74, 222, 128, 0.9));
  }
`;

const SaveButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${theme.spacing.lg} 0;
  margin-top: ${theme.spacing.xl};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  border: none;
  color: #000;
  cursor: pointer;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #ffed4e 0%, #ffd700 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(236, 72, 153, 0.3);
  border-top-color: #ec4899;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const PremiumModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const PremiumModalContent = styled.div`
  background: linear-gradient(135deg, rgba(20, 10, 30, 0.95) 0%, rgba(30, 20, 50, 0.95) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 24px;
  padding: 32px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.2);
  position: relative;
  text-align: center;
  animation: slideUp 0.3s ease;
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const PremiumModalIcon = styled.div`
  width: 70px;
  height: 70px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
    }
  }
`;

const PremiumModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #a78bfa, #c084fc, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PremiumModalText = styled.p`
  font-size: 16px;
  color: rgba(200, 200, 200, 0.9);
  line-height: 1.6;
  margin: 0 0 32px 0;
`;

const PremiumModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const PremiumModalButton = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  min-width: 100px;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, #ecc94b, #d69e2e);
    color: #000000;
    box-shadow: 0 4px 12px rgba(236, 201, 75, 0.3);
    
    &:hover {
      box-shadow: 0 6px 16px rgba(236, 201, 75, 0.5);
      background: linear-gradient(135deg, #f6e05e, #ecc94b);
    }
  ` : `
    background: rgba(139, 92, 246, 0.1);
    color: rgba(220, 220, 220, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.3);
    
    &:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.5);
      color: #ffffff;
    }
  `}
  
  &:active {
    transform: translateY(0);
  }
`;

interface Voice {
  id: string;
  name: string;
  url: string;
  preview_url?: string;
  photo_url?: string;
  is_user_voice?: boolean;
  is_public?: boolean;
  is_owner?: boolean;
  creator_username?: string | null;
  creator_id?: number;
  user_voice_id?: number;
}

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoice: (voiceId: string | null, voiceUrl: string | null) => void;
  currentVoiceUrl?: string;
  userInfo?: {
    subscription?: {
      subscription_type?: string;
    };
    subscription_type?: string;
  } | null;
  onShop?: () => void;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectVoice,
  currentVoiceUrl,
  userInfo,
  onShop
}) => {
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'default' | 'user'>('default');
  const [playingVoiceUrl, setPlayingVoiceUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVoices();
      setIsExpanded(false); // Сбрасываем состояние раскрытия при открытии
    }
  }, [isOpen]);

  useEffect(() => {
    setIsExpanded(false); // Сбрасываем состояние раскрытия при смене вкладки
  }, [activeTab]);

  const loadVoices = async () => {
    setIsLoading(true);
    try {
      const token = authManager.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-voices`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data);
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };


  const handlePlayPreview = async (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();

    const audioUrlToPlay = voice.preview_url || voice.url;

    if (playingVoiceUrl === audioUrlToPlay) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingVoiceUrl(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    try {
      const fullUrl = audioUrlToPlay.startsWith('http')
        ? audioUrlToPlay
        : `${API_CONFIG.BASE_URL}${audioUrlToPlay}`;
      const audio = new Audio(fullUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceUrl(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingVoiceUrl(null);
        audioRef.current = null;
      };

      await audio.play();
      setPlayingVoiceUrl(audioUrlToPlay);
    } catch (error) {
      setPlayingVoiceUrl(null);
    }
  };

  const handleSelectVoice = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const handleSaveVoice = () => {
    if (selectedVoice) {
      // Останавливаем воспроизведение превью при сохранении выбора
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setPlayingVoiceUrl(null);

      // Проверяем, является ли голос премиальным
      if (isPremiumVoice(selectedVoice.name)) {
        // Проверяем подписку
        const subscriptionType = userInfo?.subscription?.subscription_type ||
          (userInfo as any)?.subscription_type ||
          'free';

        const isPremiumUser = ['pro', 'premium'].includes(subscriptionType.toLowerCase());

        if (!isPremiumUser) {
          setShowPremiumModal(true);
          return;
        }
      }

      if (selectedVoice.is_user_voice) {
        onSelectVoice(null, selectedVoice.url);
      } else {
        onSelectVoice(selectedVoice.id, null);
      }
      onClose();
    }
  };

  const defaultVoices = availableVoices.filter(v => !v.is_user_voice);
  const userVoices = availableVoices.filter(v => v.is_user_voice);

  const isVoiceSelected = (voice: Voice): boolean => {
    if (voice.is_user_voice) {
      return currentVoiceUrl === voice.url;
    } else {
      const voiceUrl = `/default_character_voices/${voice.id}`;
      return currentVoiceUrl === voiceUrl || currentVoiceUrl?.includes(voice.id);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Выберите голос</ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <TabsContainer>
          <Tab
            $isActive={activeTab === 'default'}
            onClick={() => { setActiveTab('default'); setIsExpanded(false); }}
          >
            Стандартные ({defaultVoices.length})
          </Tab>
          <Tab
            $isActive={activeTab === 'user'}
            onClick={() => setActiveTab('user')}
          >
            Пользовательские ({userVoices.length})
          </Tab>
        </TabsContainer>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <VoicesGrid>
              {(activeTab === 'default'
                ? defaultVoices
                : (userVoices.length > 6 && !isExpanded ? userVoices.slice(0, 6) : userVoices)
              ).map((voice) => {
                const audioUrlToPlay = voice.preview_url || voice.url;
                const isPlaying = playingVoiceUrl === audioUrlToPlay;
                const isSelected = isVoiceSelected(voice);
                // Рамка показывается только для выбранного в модальном окне голоса (с галочкой)
                const isSelectedInModal = selectedVoice?.id === voice.id || (voice.is_user_voice && selectedVoice?.url === voice.url);

                const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K';
                const photoPath = voice.is_user_voice
                  ? (voice.photo_url
                    ? (voice.photo_url.startsWith('http') ? voice.photo_url : `${API_CONFIG.BASE_URL}${voice.photo_url}`)
                    : defaultPlaceholder)
                  : getVoicePhotoPath(voice.name);

                return (
                  <VoiceCard
                    key={voice.id}
                  >
                    <VoiceName>{voice.name}</VoiceName>
                    {voice.is_user_voice && voice.creator_username && (
                      <div style={{
                        fontSize: theme.fontSize.xs,
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginTop: '-8px',
                        marginBottom: theme.spacing.xs
                      }}>
                        @{voice.creator_username}
                      </div>
                    )}
                    <VoicePhotoWrapper>
                      <VoicePhotoContainer
                        $isSelected={isSelectedInModal}
                        $isPlaying={isPlaying}
                        $voiceName={voice.name}
                        $isUserVoice={voice.is_user_voice}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectVoice(voice);
                          handlePlayPreview(voice, e);
                        }}
                      >
                        <VoicePhoto
                          src={photoPath}
                          alt={voice.name}
                          $voiceName={voice.name}
                          $isSelected={isSelectedInModal}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const normalizedName = voice.name.replace(/\.(mp3|wav|ogg)$/i, '');
                            const extensions = ['.png', '.jpg', '.jpeg', '.webp'];
                            let currentIndex = extensions.findIndex(ext => target.src.includes(ext));
                            if (currentIndex === -1) currentIndex = 0;
                            if (currentIndex < extensions.length - 1) {
                              target.src = `/default_voice_photo/${normalizedName}${extensions[currentIndex + 1]}`;
                            } else {
                              target.src = defaultPlaceholder;
                            }
                          }}
                        />
                        <VoiceCheckmark
                          $show={isSelectedInModal}
                          $isPremium={false}
                        />
                      </VoicePhotoContainer>
                    </VoicePhotoWrapper>
                  </VoiceCard>
                );
              })}
            </VoicesGrid>
            {activeTab === 'user' && userVoices.length > 6 && (
              <ExpandButton
                $isExpanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <span>{isExpanded ? 'Скрыть остальные голоса' : 'Показать остальные голоса'}</span>
              </ExpandButton>
            )}
          </>
        )}
        {selectedVoice && (
          <SaveButtonContainer>
            <SaveButton onClick={handleSaveVoice}>
              Сохранить
            </SaveButton>
          </SaveButtonContainer>
        )}
      </ModalContent>

      {showPremiumModal && (
        <PremiumModalOverlay onClick={() => setShowPremiumModal(false)}>
          <PremiumModalContent onClick={(e) => e.stopPropagation()}>
            <PremiumModalTitle>Голос только для Premium</PremiumModalTitle>
            <PremiumModalText>
              Оформите подписку PREMIUM, чтобы использовать премиальные голоса, или выберите другой голос.
            </PremiumModalText>
            <PremiumModalButtons>
              <PremiumModalButton
                $primary
                onClick={() => {
                  setShowPremiumModal(false);
                  if (onShop) onShop();
                }}
              >
                Перейти в магазин
              </PremiumModalButton>
              <PremiumModalButton onClick={() => setShowPremiumModal(false)}>
                Закрыть
              </PremiumModalButton>
            </PremiumModalButtons>
          </PremiumModalContent>
        </PremiumModalOverlay>
      )}
    </ModalOverlay>
  );
};
