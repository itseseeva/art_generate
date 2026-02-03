import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
import { AuthModal } from './AuthModal';
import { TipCreatorModal } from './TipCreatorModal';
import { SuccessToast } from './SuccessToast';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { ConfirmModal } from './ConfirmModal';
import { GlobalHeader } from './GlobalHeader';
import { PhotoGenerationHelpModal } from './PhotoGenerationHelpModal';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { authManager } from '../utils/auth';
import { translateToEnglish } from '../utils/translate';
import { FiUnlock, FiLock, FiSettings } from 'react-icons/fi';
import { Plus, Sparkles, FolderOpen } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';
import { ModelSelectorModal } from './ModelSelectorModal';
import { ModelAccessDeniedModal } from './ModelAccessDeniedModal';
import { generationTracker } from '../utils/generationTracker';
import { BoosterOfferModal } from './BoosterOfferModal';

const MobileAlbumButtonsContainer = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    background: rgba(10, 10, 10, 0.4);
    backdrop-filter: blur(30px);
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const MobileAlbumButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  height: 42px;
  border: ${props => props.$variant === 'secondary' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'};
  border-radius: 12px;
  padding: 0 1rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Primary (Expand) - Gradient background */
  ${props => props.$variant !== 'secondary' && `
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.2);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.4);
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    }
  `}
  
  /* Secondary (Open) - Glassmorphism */
  ${props => props.$variant === 'secondary' && `
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
      background: rgba(30, 30, 30, 0.5);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
  `}

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${props => props.$variant === 'secondary' ? 'rgba(20, 20, 20, 0.2)' : '#4c4c4c'};
    transform: none;
    box-shadow: none;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
    flex-shrink: 0;
  }
`;

const PAID_ALBUM_COST = 300;

const Container = styled.div`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: visible;
  background: transparent;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex !important;
  flex-direction: column;
  background: transparent;
  border: none;
  border-radius: 0;
  margin-left: 0;
  box-shadow: none;
  overflow: visible;
  position: relative;
  z-index: 1;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 0;
`;

const ChatHeader = styled.div`
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  color: rgba(240, 240, 240, 1);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
`;

const HeaderContent = styled.div`
  flex: 1;
  text-align: center;
`;

const Title = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm};
  color: rgba(240, 240, 240, 1);
  text-shadow: none;
  font-family: inherit;
  letter-spacing: -0.5px;
  text-transform: none;
`;

const Subtitle = styled.p`
  font-size: ${theme.fontSize.sm};
  opacity: 0.9;
  font-weight: 300;
  color: rgba(160, 160, 160, 1);
  text-shadow: none;
  font-family: inherit;
  letter-spacing: 0;
`;

const CreatorInfoWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const CreatorAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
`;

const CreatorAvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.gradients.card};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.base};
  color: ${theme.colors.text.primary};
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
`;

const CreatorLink = styled.a`
  color: ${theme.colors.accent.primary};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${theme.colors.accent.secondary};
    text-decoration: underline;
  }
`;

const ClearChatButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.4) 0%, rgba(50, 50, 50, 0.3) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: rgba(220, 220, 220, 0.95);
  border: 1px solid rgba(120, 120, 120, 0.3);
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: none;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: linear-gradient(135deg, rgba(80, 80, 80, 0.5) 0%, rgba(70, 70, 70, 0.4) 100%);
    border-color: rgba(150, 150, 150, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);
    color: rgba(255, 255, 255, 1);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(40, 40, 40, 0.2);
    border-color: rgba(80, 80, 80, 0.2);
    transform: none;
  }
`;

const ChatMessagesArea = styled.div`
  flex: 1;
  display: flex !important;
  flex-direction: column;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: visible;
  min-height: 0;
  max-height: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  margin: 0;
  padding: 0;
  position: relative;
  z-index: 1;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100%;
`;

const ChatContentWrapper = styled.div`
  flex: 1;
  display: flex !important;
  gap: ${theme.spacing.lg};
  min-height: 0;
  min-width: 0;
  max-height: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  margin: 0;
  padding: 0;
  visibility: visible !important;
  opacity: 1 !important;
  overflow: visible;
  width: 100%;

  @media (max-width: 1280px) {
    flex-direction: column;
  }
`;

const CharacterCardWrapper = styled.div`
  width: 100%;
  margin-top: ${theme.spacing.md};
  padding-top: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  padding-left: 0;
  
  /* Ограничиваем ширину карточки, но даем место для кнопок рейтинга (35px + 35px) */
  > *:first-child {
    width: 270px;
    max-width: 270px;
    min-width: 200px;
  }
`;

const GenerationQueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 auto;
  width: 100%;
`;

const GenerationQueueIndicator = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(20, 20, 20, 0.6);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const QueueProgressBar = styled.div<{ $filled: number; $total: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => (props.$filled / props.$total) * 100}%;
  background: linear-gradient(90deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
  border-radius: 12px;
  box-shadow: 
    0 0 10px rgba(6, 182, 212, 0.5),
    0 0 20px rgba(139, 92, 246, 0.3),
    0 0 30px rgba(236, 72, 153, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      box-shadow: 
        0 0 10px rgba(6, 182, 212, 0.5),
        0 0 20px rgba(139, 92, 246, 0.3),
        0 0 30px rgba(236, 72, 153, 0.2);
    }
    50% {
      opacity: 0.9;
      box-shadow: 
        0 0 15px rgba(6, 182, 212, 0.7),
        0 0 30px rgba(139, 92, 246, 0.5),
        0 0 45px rgba(236, 72, 153, 0.3);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const QueueLabel = styled.div`
  font-size: 10px;
  color: rgba(160, 160, 160, 0.8);
  text-align: center;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const QueueCounter = styled.div`
  font-size: 11px;
  color: rgba(200, 200, 200, 0.9);
  text-align: center;
  font-weight: 600;
  margin-top: 4px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const QueueTitle = styled.div`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin-bottom: ${theme.spacing.xs};
`;

const QueueItem = styled.div`
  font-size: ${theme.fontSize.xs};
  color: rgba(200, 200, 200, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.xs} 0;
  border-bottom: 1px solid rgba(100, 100, 100, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const QueueValue = styled.span<{ $isLimit?: boolean }>`
  font-weight: ${props => props.$isLimit ? 700 : 600};
  color: ${props => props.$isLimit ? '#ffa500' : 'rgba(160, 200, 255, 1)'};
`;

const PaidAlbumPanel = styled.div`
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: rgba(18, 18, 18, 0.6);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  margin: ${theme.spacing.lg};

  @media (max-width: 1480px) {
    width: 280px;
    min-width: 280px;
  }

  @media (max-width: 1280px) {
    width: 100%;
    min-width: 0;
    margin: ${theme.spacing.md};
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const PaidAlbumTitle = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin-bottom: ${theme.spacing.sm};
  text-transform: none;
  letter-spacing: 0;
`;

const PaidAlbumDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(160, 160, 160, 1);
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.6;
`;

const PaidAlbumButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  height: 42px;
  border: ${props => props.$variant === 'secondary' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'};
  border-radius: 12px;
  padding: 0 1.25rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  margin-bottom: ${theme.spacing.sm};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Primary (Expand) - Gradient background */
  ${props => props.$variant !== 'secondary' && `
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.2);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 6px 30px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.4);
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    }
  `}
  
  /* Secondary (Open) - Glassmorphism */
  ${props => props.$variant === 'secondary' && `
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    
    &:hover:not(:disabled) {
      transform: scale(1.05);
      background: rgba(30, 30, 30, 0.5);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
  `}

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: ${props => props.$variant === 'secondary' ? 'rgba(20, 20, 20, 0.2)' : '#4c4c4c'};
    transform: none;
    box-shadow: none;
  }
  
  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
    flex-shrink: 0;
  }
`;

const PaidAlbumInfo = styled.div`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.text.muted};
  line-height: 1.6;
  margin-top: ${theme.spacing.sm};
`;

const PaidAlbumDisclaimer = styled.div`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.text.muted};
  line-height: 1.5;
  margin-top: ${theme.spacing.md};
  opacity: 0.9;
`;

const ShowBoosterButton = styled.button`
  width: 100%;
  height: 42px;
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 12px;
  padding: 0 1.25rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  margin-top: ${theme.spacing.lg};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(236, 72, 153, 0.3),
      transparent
    );
    animation: shimmer 3s infinite;
  }
  
  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
    border-color: rgba(236, 72, 153, 0.5);
    box-shadow: 0 4px 20px rgba(236, 72, 153, 0.3);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
    flex-shrink: 0;
  }
`;

const PaidAlbumError = styled.div`
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(239, 68, 68, 0.15);
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.xs};
`;

const UpgradeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const UpgradeModal = styled.div`
  width: min(480px, 92vw);
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
`;

const UpgradeModalTitle = styled.h3`
  margin: 0;
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
`;

const UpgradeModalText = styled.p`
  margin: 0;
  color: rgba(160, 160, 160, 1);
  line-height: 1.5;
  font-size: ${theme.fontSize.sm};
`;

const UpgradeModalActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
  generationTime?: number; // Время генерации изображения в секундах
  isGenerating?: boolean;
  progress?: number;
}

interface Character {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  avatar?: string;
  character_appearance?: string;
  location?: string;
  voice_url?: string;
  voice_id?: string;  // ID голоса из папки default_character_voices
  user_id?: number;
  raw?: any; // Исходные данные персонажа из API
  likes?: number;
  dislikes?: number;
  views?: number;
  comments?: number;
}

interface UserInfo {
  id: number;
  username: string;
  coins: number;
  avatar_url?: string | null;
  email?: string | null;
  is_admin?: boolean;
  subscription?: {
    subscription_type?: string;
  };
  subscription_type?: string;
}

interface PaidAlbumStatus {
  character: string;
  character_slug: string;
  unlocked: boolean;
  is_owner: boolean;
}

interface ChatContainerProps {
  onBackToMain?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onShop?: () => void;
  onProfile?: (userId: number) => void;
  onOwnProfile?: () => void;
  initialCharacter?: Character;
  onOpenPaidAlbum?: (character: Character) => void;
  onOpenPaidAlbumBuilder?: (character: Character) => void;
  onNavigate?: (page: string, character: Character) => void;
  subscriptionType?: 'free' | 'base' | 'standard' | 'premium';
}

// Styled components для выбора моделей изображения (как на странице создания)
const ModelSelectionContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: visible;
  padding-bottom: ${theme.spacing.md};
  padding-top: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const ModelCard = styled.div<{ $isSelected: boolean; $previewImage?: string; $showToast?: boolean }>`
  flex: 0 0 200px;
  height: 300px;
  background: ${props => props.$isSelected
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
    : 'rgba(30, 30, 30, 0.4)'};
  backdrop-filter: blur(8px);
  border: 2px solid ${props => props.$isSelected
    ? '#8b5cf6'
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.borderRadius.lg};
  padding: 0;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: ${props => props.$showToast ? 'visible' : 'hidden'};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url(${props => props.$previewImage});
    background-size: cover;
    background-position: center;
    opacity: 1;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.25);
    border-color: #8b5cf6;
    
    &::after {
      transform: scale(1.08);
    }
  }

  & > * {
    position: relative;
    z-index: 1;
  }
`;

const ModelInfoOverlay = styled.div`
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: ${theme.spacing.md};
  width: 100%;
`;

const ModelName = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`;

const ModelDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

// Styled components для дефолтных промптов (тегов)
const TagsContainer = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  max-height: ${props => props.$isExpanded ? '500px' : '36px'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
`;

const ExpandButton = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  transition: all 0.3s ease;

  &:hover {
    color: ${theme.colors.text.primary};
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

const TagButton = styled.button`
  background: rgba(40, 40, 40, 0.6);
  border: 1px solid rgba(80, 80, 80, 0.3);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 11px;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(60, 60, 60, 0.8);
    color: ${theme.colors.text.primary};
    border-color: rgba(100, 100, 100, 0.5);
  }
`;

export const ChatContainer: React.FC<ChatContainerProps> = ({
  onBackToMain,
  onCreateCharacter,
  onEditCharacters,
  onShop,
  onProfile,
  onOwnProfile,
  initialCharacter,
  onOpenPaidAlbum,
  onOpenPaidAlbumBuilder,
  onNavigate,
  subscriptionType = 'free'
}) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const isLoadingHistoryRef = useRef<string | null>(null); // Отслеживаем, для какого персонажа идет загрузка истории
  const lastLoadedCharacterRef = useRef<string | null>(null); // Отслеживаем последнего загруженного персонажа, чтобы избежать бесконечных запросов

  // Утилита для дедупликации сообщений по ID и URL изображения
  const deduplicateMessages = (msgs: Message[]): Message[] => {
    const seenIds = new Map<string, Message>();
    const seenUrls = new Set<string>();

    for (const msg of msgs) {
      // Нормализуем URL для сравнения (убираем query параметры и якоря)
      const normalizedUrl = msg.imageUrl ? msg.imageUrl.split('?')[0].split('#')[0] : null;

      // Если есть imageUrl, проверяем дубликаты по URL (высокий приоритет)
      if (normalizedUrl && seenUrls.has(normalizedUrl)) {

        continue; // Пропускаем дубликат по URL
      }

      // Проверяем дубликаты по ID
      const existing = seenIds.get(msg.id);
      if (!existing) {
        seenIds.set(msg.id, msg);
        if (normalizedUrl) {
          seenUrls.add(normalizedUrl);
        }
      } else {
        // Если ID уже есть, оставляем сообщение с большим количеством данных
        // Приоритет: imageUrl > generationTime > существующее сообщение
        const shouldReplace =
          (msg.imageUrl && !existing.imageUrl) ||
          (msg.imageUrl && msg.generationTime && !existing.generationTime) ||
          (msg.generationTime && !existing.generationTime && msg.imageUrl === existing.imageUrl);

        if (shouldReplace) {
          seenIds.set(msg.id, msg);
          if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
          }

        }
      }
    }
    return Array.from(seenIds.values());
  };
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    initialCharacter || null
  );
  const isLoadingFromUrlRef = useRef(false); // Флаг для отслеживания загрузки из URL

  // Выбранный голос для текущего персонажа (локально для пользователя)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedVoiceUrl, setSelectedVoiceUrl] = useState<string | null>(null);

  // Состояние для хранения отредактированного промпта в рамках сессии (для текущего персонажа)
  const [sessionPrompt, setSessionPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Очередь активных генераций: Set с ID сообщений, которые генерируются
  const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipType, setTipType] = useState<'photo' | 'voice' | ''>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [modelInfo, setModelInfo] = useState<string>('Загрузка...');

  // Сбрасываем sessionPrompt при смене персонажа
  useEffect(() => {
    setSessionPrompt(null);
  }, [currentCharacter?.id]);

  // Загружаем выбранный голос из localStorage при смене персонажа
  useEffect(() => {
    if (currentCharacter && userInfo) {
      const characterName = currentCharacter.name || currentCharacter.raw?.name;
      const userId = userInfo.id;
      if (characterName && userId) {
        const storageKey = `selected_voice_${characterName}_${userId}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            setSelectedVoiceId(data.voiceId || null);
            setSelectedVoiceUrl(data.voiceUrl || null);
          } catch (e) {
          }
        } else {
          // Если нет сохраненного голоса, сбрасываем
          setSelectedVoiceId(null);
          setSelectedVoiceUrl(null);
        }
      }
    } else {
      // Если нет персонажа или пользователя, сбрасываем
      setSelectedVoiceId(null);
      setSelectedVoiceUrl(null);
    }
  }, [currentCharacter?.id, currentCharacter?.name, userInfo?.id]);

  // Сохраняем выбранный голос в localStorage
  const saveSelectedVoice = useCallback((voiceId: string | null, voiceUrl: string | null) => {
    if (currentCharacter && userInfo) {
      const characterName = currentCharacter.name || currentCharacter.raw?.name;
      const userId = userInfo.id;
      if (characterName && userId) {
        const storageKey = `selected_voice_${characterName}_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify({ voiceId, voiceUrl }));
        setSelectedVoiceId(voiceId);
        setSelectedVoiceUrl(voiceUrl);
      }
    }
  }, [currentCharacter, userInfo]);
  const [characterSituation, setCharacterSituation] = useState<string | null>(null);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [creatorInfo, setCreatorInfo] = useState<{ id: number; username: string | null; avatar_url: string | null } | null>(null);
  const [paidAlbumStatus, setPaidAlbumStatus] = useState<PaidAlbumStatus | null>(null);
  const [isUnlockingAlbum, setIsUnlockingAlbum] = useState(false);
  const [paidAlbumError, setPaidAlbumError] = useState<string | null>(null);
  // УДАЛЕНЫ: messageProgressIntervals и messageProgressValues - больше не используем фейковый прогресс
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [fetchedSubscriptionType, setFetchedSubscriptionType] = useState<string>('free');
  const [characterPhotos, setCharacterPhotos] = useState<string[]>([]);
  const [isCharacterFavorite, setIsCharacterFavorite] = useState<boolean>(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isBoosterOfferOpen, setIsBoosterOfferOpen] = useState(false);
  const [boosterLimitType, setBoosterLimitType] = useState<'messages' | 'photos' | 'voice'>('messages');
  const [isBoosterInfoMode, setIsBoosterInfoMode] = useState(false);
  const [boosterVariantOverride, setBoosterVariantOverride] = useState<'booster' | 'out_of_limits' | 'info' | 'album_access' | null>(null);
  const SUBSCRIPTION_STATS_KEY = 'chat_subscription_stats';

  const [subscriptionStats, setSubscriptionStatsState] = useState<{
    monthly_messages?: number;
    used_messages?: number;
    monthly_photos?: number;
    used_photos?: number;
    images_limit?: number;
    images_used?: number;
    voice_limit?: number;
    voice_used?: number;
    photos_pack?: number;
  } | null>(() => {
    try {
      const s = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SUBSCRIPTION_STATS_KEY) : null;
      const parsed = s ? JSON.parse(s) : null;
      console.log('[SUBSCRIPTION_INIT] Загружены данные из sessionStorage:', parsed);
      return parsed;
    } catch {
      console.log('[SUBSCRIPTION_INIT] Ошибка чтения из sessionStorage');
      return null;
    }
  });

  const setSubscriptionStats = useCallback((update: React.SetStateAction<typeof subscriptionStats>) => {
    setSubscriptionStatsState(prev => {
      const next = typeof update === 'function' ? (update as (p: typeof prev) => typeof prev)(prev) : update;
      console.log('[SUBSCRIPTION_UPDATE] Обновление stats:', { prev, next });
      try {
        if (next) {
          sessionStorage.setItem(SUBSCRIPTION_STATS_KEY, JSON.stringify(next));
          console.log('[SUBSCRIPTION_UPDATE] Сохранено в sessionStorage:', next);
        } else {
          sessionStorage.removeItem(SUBSCRIPTION_STATS_KEY);
          console.log('[SUBSCRIPTION_UPDATE] Удалено из sessionStorage');
        }
      } catch (e) {
        console.error('[SUBSCRIPTION_UPDATE] Ошибка записи в sessionStorage:', e);
      }
      return next;
    });
  }, []);

  const [selectedChatModel, setSelectedChatModel] = useState<string>(() => {
    const saved = localStorage.getItem('selectedChatModel');
    return saved || 'sao10k/l3-euryale-70b';
  });
  // Функция для определения языка по умолчанию
  const getDefaultLanguage = (): 'ru' | 'en' => {
    // Сначала проверяем localStorage
    const savedLanguage = localStorage.getItem('targetLanguage');
    if (savedLanguage === 'ru' || savedLanguage === 'en') {
      return savedLanguage as 'ru' | 'en';
    }

    // Если в localStorage нет, определяем по языку браузера
    const browserLanguage = navigator.language || navigator.languages?.[0] || 'en';
    const languageCode = browserLanguage.toLowerCase().split('-')[0];

    // Если язык начинается с 'ru', ставим RU, иначе EN
    if (languageCode === 'ru') {
      return 'ru';
    }

    return 'en';
  };

  const [targetLanguage, setTargetLanguage] = useState<'ru' | 'en'>(getDefaultLanguage());
  const [isLanguageChangeModalOpen, setIsLanguageChangeModalOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<'ru' | 'en' | null>(null);

  // Сохраняем выбор языка в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);

  // Режим краткости ответов
  const [brevityMode, setBrevityMode] = useState<'brief' | 'normal'>(() => {
    const saved = localStorage.getItem('brevityMode');
    return (saved === 'normal' || saved === 'brief') ? saved : 'brief'; // Default 'brief'
  });

  // Сохраняем режим краткости
  useEffect(() => {
    localStorage.setItem('brevityMode', brevityMode);
  }, [brevityMode]);

  // Фиксированный лимит токенов (750) - пользователь не может менять
  // Увеличили с 600 до 750, чтобы избежать обрывов на полуслове
  const maxTokens = 750;

  // Загружаем статистику подписки и тип подписки при авторизации и изменении баланса
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!isAuthenticated) {
        setFetchedSubscriptionType('free');
        setSubscriptionStats(null);
        return;
      }

      try {
        const token = authManager.getToken();
        if (!token) {
          setFetchedSubscriptionType('free');
          setSubscriptionStats(null);
          return;
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const statsData = await response.json();
          console.log('[SUBSCRIPTION_FETCH] Получены данные с бэкенда:', statsData);
          const subType = statsData?.subscription_type || 'free';
          setFetchedSubscriptionType(subType);

          // Мерджим с существующими данными, используя Math.max для used полей
          setSubscriptionStats((prev) => {
            if (!prev) {
              console.log('[SUBSCRIPTION_FETCH] Нет предыдущих данных, используем данные с сервера');
              return statsData;
            }
            const prevUsedMessages = prev.used_messages ?? 0;
            const prevUsedPhotos = prev.used_photos ?? 0;
            const serverUsedMessages = statsData.used_messages ?? 0;
            const serverUsedPhotos = statsData.used_photos ?? 0;
            const merged = {
              ...statsData,
              used_messages: Math.max(serverUsedMessages, prevUsedMessages),
              used_photos: Math.max(serverUsedPhotos, prevUsedPhotos)
            };
            console.log('[SUBSCRIPTION_FETCH] Мердж данных:', {
              prev: { used_messages: prevUsedMessages, used_photos: prevUsedPhotos },
              server: { used_messages: serverUsedMessages, used_photos: serverUsedPhotos },
              result: { used_messages: merged.used_messages, used_photos: merged.used_photos }
            });
            return merged;
          });
        } else {
          console.log('[SUBSCRIPTION_FETCH] Ответ не OK, статус:', response.status);
          setFetchedSubscriptionType('free');
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики подписки:', error);
        setFetchedSubscriptionType('free');
      }
    };

    loadSubscriptionData();
  }, [isAuthenticated, balanceRefreshTrigger]);

  // Используем переданный subscriptionType или загруженный из API
  const effectiveSubscriptionType = subscriptionType !== 'free' ? subscriptionType : fetchedSubscriptionType;

  const normalizedSubscriptionType = useMemo<'free' | 'base' | 'standard' | 'premium'>(() => {
    const normalized = effectiveSubscriptionType.toLowerCase();
    if (normalized === 'standard' || normalized === 'premium') {
      return normalized;
    }
    if (normalized === 'base') {
      return 'base';
    }
    return 'free';
  }, [effectiveSubscriptionType]);



  const canCreatePaidAlbum = normalizedSubscriptionType === 'standard' || normalizedSubscriptionType === 'premium';

  // Получаем лимит очереди генераций на основе подписки
  const getGenerationQueueLimit = useMemo(() => {
    const subType = normalizedSubscriptionType;
    if (subType === 'premium') {
      return 5; // PREMIUM: 5 фото одновременно
    } else if (subType === 'standard') {
      return 3; // STANDARD: 3 фото одновременно
    }
    return 1; // FREE/BASE: только 1 фото одновременно
  }, [normalizedSubscriptionType]);

  // Храним время начала генерации для каждого сообщения
  const generationStartTimesRef = useRef<Map<string, number>>(new Map());
  // Храним интервалы прогресса для каждого сообщения
  const progressIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const updateMessageProgressContent = useCallback((messageId: string, value: number, usePlaceholder: boolean = false) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId && !msg.imageUrl) {
          const startTime = generationStartTimesRef.current.get(messageId);
          let displayProgress = value;

          // Если нужно использовать заглушку, вычисляем её
          if (usePlaceholder && startTime) {
            const elapsed = Date.now() - startTime;
            const placeholderDuration = 8000; // Строго 8 секунд (8000 миллисекунд)

            if (elapsed < placeholderDuration) {
              // Заглушка: от 0% до 100% строго за 8 секунд
              // elapsed в миллисекундах, placeholderDuration тоже в миллисекундах
              const placeholderProgress = (elapsed / placeholderDuration) * 100;
              // Используем ТОЛЬКО заглушку в первые 8 секунд, реальный прогресс игнорируем
              displayProgress = Math.min(100, placeholderProgress); // Ограничиваем максимум 100%
            } else {
              // После строго 8 секунд используем реальный прогресс
              displayProgress = value;
              // Останавливаем интервал заглушки
              const interval = progressIntervalsRef.current.get(messageId);
              if (interval) {
                clearInterval(interval);
                progressIntervalsRef.current.delete(messageId);
              }
            }
          } else {
            // Если заглушка отключена, используем реальный прогресс
            displayProgress = value;
            // Останавливаем интервал заглушки
            const interval = progressIntervalsRef.current.get(messageId);
            if (interval) {
              clearInterval(interval);
              progressIntervalsRef.current.delete(messageId);
            }
          }

          return { ...msg, content: `${Math.round(displayProgress)}%` };
        }
        return msg;
      })
    );
  }, []);

  const handleOutOfLimits = useCallback((type: 'messages' | 'photos' | 'voice') => {
    setBoosterLimitType(type);
    setIsBoosterOfferOpen(true);
  }, []);

  // Функция для запуска прогресса заглушки с интервалом
  const startPlaceholderProgress = useCallback((messageId: string) => {
    // Останавливаем предыдущий интервал если есть
    const existingInterval = progressIntervalsRef.current.get(messageId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Запускаем интервал для обновления прогресса каждые 50ms
    const interval = setInterval(() => {
      const startTime = generationStartTimesRef.current.get(messageId);
      if (!startTime) {
        clearInterval(interval);
        progressIntervalsRef.current.delete(messageId);
        return;
      }

      const elapsed = Date.now() - startTime;
      const placeholderDuration = 8000; // 8 секунд

      if (elapsed < placeholderDuration) {
        // Вычисляем прогресс заглушки: от 0% до 100% за 8 секунд
        const placeholderProgress = (elapsed / placeholderDuration) * 100;
        const displayProgress = Math.min(100, Math.round(placeholderProgress));

        // Обновляем сообщение напрямую
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId && !msg.imageUrl) {
              return { ...msg, content: `${displayProgress}%` };
            }
            return msg;
          })
        );
      } else {
        // Заглушка завершена, останавливаем интервал
        clearInterval(interval);
        progressIntervalsRef.current.delete(messageId);
      }
    }, 50); // Обновляем каждые 50ms для плавной анимации

    progressIntervalsRef.current.set(messageId, interval);
  }, []);

  // Функция для остановки прогресса заглушки
  const stopPlaceholderProgress = useCallback((messageId: string) => {
    const interval = progressIntervalsRef.current.get(messageId);
    if (interval) {
      clearInterval(interval);
      progressIntervalsRef.current.delete(messageId);
    }
  }, []);

  // УДАЛЕНЫ: startFakeMessageProgress и stopFakeMessageProgress
  // Теперь используем только реальный прогресс из RunPod API

  const fetchPaidAlbumStatus = useCallback(async (characterName: string) => {
    if (!characterName) {
      setPaidAlbumStatus(null);
      return;
    }

    const token = authManager.getToken();
    if (!token) {
      setPaidAlbumStatus(null);
      return;
    }

    try {
      const encodedName = encodeURIComponent(characterName);
      const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}/status/`);
      if (!response.ok) {
        setPaidAlbumStatus(null);
        return;
      }

      const data = await response.json();
      setPaidAlbumStatus(data);
      if (data?.unlocked || data?.is_owner) {
        setPaidAlbumError(null);
      }
    } catch (error) {

      setPaidAlbumStatus(null);
    }
  }, []);

  const notifyUsageUpdate = () => {
    window.dispatchEvent(new CustomEvent('subscription-update'));
  };

  const refreshUserStats = async (): Promise<UserInfo | null> => {
    const info = await checkAuth();
    if (info) {
      setBalanceRefreshTrigger(prev => prev + 1);
      // Диспатчим событие обновления баланса
      window.dispatchEvent(new Event('balance-update'));
      // Обновляем статистику подписки
      await loadSubscriptionStats();
    }
    notifyUsageUpdate();
    if (currentCharacter?.raw?.name || currentCharacter?.name) {
      const identifier = currentCharacter.raw?.name || currentCharacter.name;
      fetchPaidAlbumStatus(identifier);
    }
    return info;
  };

  // Проверка авторизации при загрузке
  useEffect(() => {
    // Проверяем токены в URL параметрах (после OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Сохраняем токены в менеджере аутентификации
      authManager.setTokens(accessToken, refreshToken);

      // Очищаем URL от токенов
      window.history.replaceState({}, document.title, window.location.pathname);
      window.history.pushState({}, document.title, window.location.pathname);

      // Проверяем авторизацию
      refreshUserStats();
    } else {
      // Обычная проверка авторизации
      refreshUserStats();
    }

    // КРИТИЧНО: Определяем эффективного персонажа (currentCharacter или initialCharacter)
    const effectiveCharacter = currentCharacter || initialCharacter;

    if (!effectiveCharacter) {

      return;
    }

    // Если currentCharacter не установлен, но есть initialCharacter, устанавливаем его СРАЗУ
    if (!currentCharacter && initialCharacter) {

      setCurrentCharacter(initialCharacter);
      // Используем initialCharacter для дальнейшей обработки
      const characterIdentifier = initialCharacter.raw?.name || initialCharacter.name;
      if (!characterIdentifier) {

        return;
      }

      // Проверяем, не загружали ли мы уже этого персонажа
      if (lastLoadedCharacterRef.current === characterIdentifier) {

        return;
      }



      // Отмечаем, что мы загружаем этого персонажа
      lastLoadedCharacterRef.current = characterIdentifier;

      // Сбрасываем флаг загрузки перед началом новой загрузки
      isLoadingHistoryRef.current = null;

      loadModelInfo();
      loadCharacterData(characterIdentifier);
      loadChatHistory(characterIdentifier, initialCharacter);
      return; // Выходим, чтобы не выполнять код ниже
    }

    const characterIdentifier = effectiveCharacter.raw?.name || effectiveCharacter.name;
    if (!characterIdentifier) {

      return;
    }

    // Проверяем, не загружали ли мы уже этого персонажа
    if (lastLoadedCharacterRef.current === characterIdentifier) {

      return;
    }



    // Отмечаем, что мы загружаем этого персонажа
    lastLoadedCharacterRef.current = characterIdentifier;

    // Сбрасываем флаг загрузки перед началом новой загрузки
    isLoadingHistoryRef.current = null;

    loadModelInfo();
    loadCharacterData(characterIdentifier);
    loadChatHistory(characterIdentifier, effectiveCharacter); // Загружаем историю чатов при инициализации
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    (currentCharacter?.raw?.name || currentCharacter?.name) ?? '',
    (initialCharacter?.raw?.name || initialCharacter?.name) ?? ''
  ]); // Используем только идентификаторы персонажей, функции мемоизированы

  // Используем useRef для отслеживания последнего загруженного статуса альбома
  const lastPaidAlbumStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentCharacter?.name) {
      setPaidAlbumStatus(null);
      lastPaidAlbumStatusRef.current = null;
      return;
    }

    if (isAuthenticated) {
      const identifier = currentCharacter.raw?.name || currentCharacter.name;
      if (identifier && lastPaidAlbumStatusRef.current !== identifier) {
        lastPaidAlbumStatusRef.current = identifier;
        fetchPaidAlbumStatus(identifier);
      }
    } else {
      setPaidAlbumStatus(null);
      lastPaidAlbumStatusRef.current = null;
    }
  }, [currentCharacter?.name, currentCharacter?.raw?.name, isAuthenticated, balanceRefreshTrigger]);

  // Храним связь между taskId и messageId для обновления сообщений
  const taskIdToMessageIdRef = useRef<Map<string, string>>(new Map());

  // Слушатель для обновления сообщений при получении готового изображения из generationTracker
  useEffect(() => {
    const unsubscribe = generationTracker.addListener((taskId, imageUrl, characterName, characterId) => {
      // Проверяем, что это изображение для текущего персонажа
      const currentCharacterName = currentCharacter?.raw?.name || currentCharacter?.name;
      const currentCharacterId = currentCharacter?.raw?.id || currentCharacter?.id;

      const isForCurrentCharacter =
        (characterName && currentCharacterName && characterName.toLowerCase() === currentCharacterName.toLowerCase()) ||
        (characterId && currentCharacterId && String(characterId) === String(currentCharacterId));

      if (!isForCurrentCharacter) {
        return; // Это изображение не для текущего персонажа
      }

      // Получаем messageId для этого taskId
      const messageId = taskIdToMessageIdRef.current.get(taskId);

      if (messageId) {
        // Обновляем конкретное сообщение по messageId
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                imageUrl: imageUrl,
                content: '', // Очищаем контент, если есть изображение
                isGenerating: false,
                progress: undefined
              };
            }
            return msg;
          })
        );

        // Удаляем из карты после обновления
        taskIdToMessageIdRef.current.delete(taskId);
      } else {
        // Если messageId не найден, ищем последнее сообщение ассистента без изображения
        setMessages(prev => {
          // Ищем последнее сообщение ассистента без imageUrl
          let found = false;
          const updated = prev.map(msg => {
            if (!found && msg.type === 'assistant' && !msg.imageUrl) {
              found = true;
              return {
                ...msg,
                imageUrl: imageUrl,
                content: '',
                isGenerating: false,
                progress: undefined
              };
            }
            return msg;
          });

          // Если не нашли подходящее сообщение, добавляем новое
          if (!found) {
            updated.push({
              id: `generated-${taskId}`,
              type: 'assistant',
              content: '',
              timestamp: new Date(),
              imageUrl: imageUrl
            });
          }

          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCharacter]);

  // Загружаем состояние избранного при изменении персонажа или авторизации
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!currentCharacter?.id || !isAuthenticated) {

        setIsCharacterFavorite(false);
        return;
      }

      try {
        // Преобразуем id в число для API
        let characterId: number;
        if (typeof currentCharacter.id === 'number') {
          characterId = currentCharacter.id;
        } else if (typeof currentCharacter.id === 'string') {
          characterId = parseInt(currentCharacter.id, 10);
          if (isNaN(characterId)) {

            setIsCharacterFavorite(false);
            return;
          }
        } else {

          setIsCharacterFavorite(false);
          return;
        }


        const favoriteResponse = await authManager.fetchWithAuth(
          API_CONFIG.CHECK_FAVORITE(characterId)
        );
        if (favoriteResponse.ok) {
          const favoriteData = await favoriteResponse.json();
          const isFavorite = favoriteData?.is_favorite || false;

          setIsCharacterFavorite(isFavorite);
        } else {

          setIsCharacterFavorite(false);
        }
      } catch (error) {

        setIsCharacterFavorite(false);
      }
    };

    loadFavoriteStatus();
  }, [currentCharacter?.id, isAuthenticated]);

  useEffect(() => {
    return () => {
      // УДАЛЕНА очистка фейкового прогресса - больше не используется
    };
  }, []);

  const loadSubscriptionStats = useCallback(async () => {
    try {
      const token = authManager.getToken();
      if (!token) {
        console.log('[LOAD_STATS] Нет токена, выход');
        return;
      }

      console.log('[LOAD_STATS] Запрос к /api/v1/profit/stats/');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        console.log('[LOAD_STATS] Получены данные:', stats);
        setSubscriptionStats((prev) => {
          if (!prev) {
            console.log('[LOAD_STATS] Нет предыдущих данных, используем сервер');
            return stats;
          }
          const prevUsedMessages = prev.used_messages ?? 0;
          const prevUsedPhotos = prev.used_photos ?? 0;
          const serverUsedMessages = stats.used_messages ?? 0;
          const serverUsedPhotos = stats.used_photos ?? 0;
          const merged = {
            ...stats,
            used_messages: Math.max(serverUsedMessages, prevUsedMessages),
            used_photos: Math.max(serverUsedPhotos, prevUsedPhotos)
          };
          console.log('[LOAD_STATS] Мердж:', { prev: prevUsedMessages, server: serverUsedMessages, result: merged.used_messages });
          return merged;
        });
      } else {
        console.log('[LOAD_STATS] Ответ не OK, статус:', response.status);
      }
    } catch (error) {
      console.error('[LOAD_STATS] Ошибка загрузки статистики подписки:', error);
    }
  }, []);

  // Слушаем события обновления подписки
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      console.log('[CHAT_CONTAINER] Получено событие subscription-update, обновляем статистику');
      loadSubscriptionStats();
    };

    window.addEventListener('subscription-update', handleSubscriptionUpdate);
    return () => {
      window.removeEventListener('subscription-update', handleSubscriptionUpdate);
    };
  }, [loadSubscriptionStats]);

  const checkAuth = async (): Promise<UserInfo | null> => {
    try {
      const token = authManager.getToken();
      if (!token) {
        // Нет токена - пользователь не авторизован
        setIsAuthenticated(false);
        setUserInfo(null);
        setSubscriptionStats(null);
        return null;
      }

      // Проверяем токен через API
      const response = await authManager.fetchWithAuth('/api/v1/auth/me/');

      if (response.ok) {
        const userData = await response.json();
        const info: UserInfo = {
          id: userData.id,
          username: userData.username || 'Пользователь',
          coins: userData.coins || 0,
          avatar_url: userData.avatar_url || null,
          email: userData.email || null,
          is_admin: userData.is_admin || false,
          subscription: userData.subscription || undefined,
          subscription_type: userData.subscription_type || userData.subscription?.subscription_type || undefined
        };
        setUserInfo(info);
        setIsAuthenticated(true);

        // Загружаем статистику подписки
        await loadSubscriptionStats();

        return info;
      } else {
        // Токен недействителен
        authManager.clearTokens();
        setIsAuthenticated(false);
        setUserInfo(null);
        setSubscriptionStats(null);
        return null;
      }
    } catch (error) {
      // Только логируем ошибку, не показываем в консоли для неавторизованных пользователей
      if (authManager.getToken()) {

      }
      authManager.clearTokens();
      setIsAuthenticated(false);
      setUserInfo(null);
      setSubscriptionStats(null);
      return null;
    }
  };

  const loadModelInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/models/`);
      if (response.ok) {
        const models = await response.json();
        setModelInfo(`${models.length} модель(ей) доступно`);
      }
    } catch (error) {

      setModelInfo('Информация недоступна');
    }
  }, []);

  // Используем useRef для отслеживания загрузки данных персонажа
  const isLoadingCharacterDataRef = useRef<string | null>(null);

  const loadCharacterData = useCallback(async (characterIdentifier: string) => {
    try {
      // Проверяем, что identifier не пустой
      if (!characterIdentifier || characterIdentifier.trim() === '') {
        return;
      }

      // Проверяем, не загружаем ли мы уже этого персонажа
      if (isLoadingCharacterDataRef.current === characterIdentifier) {
        return;
      }

      isLoadingCharacterDataRef.current = characterIdentifier;

      const safeIdentifier = encodeURIComponent(characterIdentifier);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${safeIdentifier}/with-creator`);

      if (response.status === 404) {

        setError(`Персонаж "${characterIdentifier}" не найден. Возможно, он был удален.`);
        setCurrentCharacter(null);
        isLoadingCharacterDataRef.current = null;
        return;
      }

      if (response.ok) {
        const characterData = await response.json();

        const situation = extractRolePlayingSituation(characterData.prompt || '');
        setCharacterSituation(situation);

        // Обновляем currentCharacter с полными данными, включая id
        // Преобразуем id в строку, если он число (для совместимости с интерфейсом Character)
        const characterId = characterData.id
          ? (typeof characterData.id === 'number' ? characterData.id.toString() : characterData.id)
          : currentCharacter?.id;



        // Создаем или обновляем объект персонажа
        const updatedCharacter = currentCharacter ? {
          ...currentCharacter,
          id: characterId || currentCharacter.id,
          name: characterData.name || currentCharacter.name,
          display_name: characterData.display_name || characterData.name || currentCharacter.display_name,
          description: characterData.description || currentCharacter.description,
          avatar: characterData.avatar || currentCharacter.avatar,
          user_id: characterData.user_id || (currentCharacter as any).user_id,
          character_appearance: characterData.character_appearance || '',
          location: characterData.location || '',
          voice_url: characterData.voice_url,
          voice_id: characterData.voice_id,
          likes: characterData.likes !== undefined ? characterData.likes : (currentCharacter.likes || 0),
          dislikes: characterData.dislikes !== undefined ? characterData.dislikes : ((currentCharacter as any).dislikes || 0),
          views: characterData.views !== undefined ? characterData.views : (currentCharacter.views || 0),
          comments: characterData.comments !== undefined ? characterData.comments : (currentCharacter.comments || 0),
          raw: characterData // Сохраняем raw данные для правильной работы с именем
        } : {
          id: characterId || characterData.id?.toString() || '',
          name: characterData.name || '',
          display_name: characterData.display_name || characterData.name || '',
          description: characterData.description || '',
          avatar: characterData.avatar || '',
          user_id: characterData.user_id,
          character_appearance: characterData.character_appearance || '',
          location: characterData.location || '',
          voice_url: characterData.voice_url,
          voice_id: characterData.voice_id,
          likes: characterData.likes || 0,
          dislikes: characterData.dislikes || 0,
          views: characterData.views || 0,
          comments: characterData.comments || 0,
          raw: characterData // Сохраняем raw данные для правильной работы с именем
        };

        // Проверяем, изменились ли данные перед обновлением, чтобы избежать бесконечного цикла
        const currentId = currentCharacter?.id;
        const currentName = currentCharacter?.name;
        const currentRawName = currentCharacter?.raw?.name;
        const newId = updatedCharacter.id;
        const newName = updatedCharacter.name;
        const newRawName = updatedCharacter.raw?.name;

        // Обновляем только если данные действительно изменились
        // КРИТИЧНО: Также проверяем изменение voice_id и voice_url
        const currentVoiceId = currentCharacter?.voice_id;
        const newVoiceId = updatedCharacter.voice_id;
        const currentVoiceUrl = currentCharacter?.voice_url;
        const newVoiceUrl = updatedCharacter.voice_url;

        // Проверяем изменение likes и dislikes
        const currentLikes = currentCharacter?.likes ?? 0;
        const newLikes = updatedCharacter.likes ?? 0;
        const currentDislikes = (currentCharacter as any)?.dislikes ?? 0;
        const newDislikes = updatedCharacter.dislikes ?? 0;

        const hasChanged =
          currentId !== newId ||
          currentName !== newName ||
          currentRawName !== newRawName ||
          currentVoiceId !== newVoiceId ||
          currentVoiceUrl !== newVoiceUrl ||
          currentLikes !== newLikes ||
          currentDislikes !== newDislikes ||
          !currentCharacter; // Или если персонаж еще не загружен

        if (hasChanged) {
          setCurrentCharacter(updatedCharacter);
        }

        // Сбрасываем флаг загрузки после успешной загрузки
        isLoadingCharacterDataRef.current = null;

        // Загружаем состояние избранного сразу после получения id
        if (characterData.id && isAuthenticated) {
          try {
            const favoriteCharacterId = typeof characterData.id === 'number'
              ? characterData.id
              : parseInt(characterData.id, 10);

            if (!isNaN(favoriteCharacterId)) {

              const favoriteResponse = await authManager.fetchWithAuth(
                API_CONFIG.CHECK_FAVORITE(favoriteCharacterId)
              );
              if (favoriteResponse.ok) {
                const favoriteData = await favoriteResponse.json();
                const isFavorite = favoriteData?.is_favorite || false;

                setIsCharacterFavorite(isFavorite);
              } else {

                setIsCharacterFavorite(false);
              }
            } else {

              setIsCharacterFavorite(false);
            }
          } catch (error) {

            setIsCharacterFavorite(false);
          }
        } else {

          setIsCharacterFavorite(false);
        }

        // Сохраняем информацию о создателе
        if (characterData.creator_info) {

          // Сохраняем информацию о создателе, даже если username null
          // (пользователь может еще не установить username после OAuth входа)
          setCreatorInfo(characterData.creator_info);
        } else {

          setCreatorInfo(null);
        }

        // Загружаем главные фото персонажа
        if (characterData.main_photos) {
          let parsedPhotos: any[] = [];
          if (Array.isArray(characterData.main_photos)) {
            parsedPhotos = characterData.main_photos;
          } else if (typeof characterData.main_photos === 'string') {
            try {
              parsedPhotos = JSON.parse(characterData.main_photos);
            } catch (e) {

              parsedPhotos = [];
            }
          }

          const photoUrls = parsedPhotos
            .map((photo: any) => {
              if (!photo) return null;
              if (typeof photo === 'string') {
                return photo.startsWith('http') ? photo : `/static/photos/${characterIdentifier.toLowerCase()}/${photo}.png`;
              }
              if (photo.url) return photo.url;
              if (photo.id) return `/static/photos/${characterIdentifier.toLowerCase()}/${photo.id}.png`;
              return null;
            })
            .filter((url): url is string => Boolean(url));

          setCharacterPhotos(photoUrls);
        } else {
          setCharacterPhotos([]);
        }
      } else {

        const errorText = await response.text().catch(() => 'Неизвестная ошибка');
        setError(`Не удалось загрузить данные персонажа: ${errorText || `Ошибка ${response.status}`}`);
        setCurrentCharacter(null);
        setCharacterSituation(null);
        setCreatorInfo(null);
        setCharacterPhotos([]);
      }
    } catch (error) {

      setError(error instanceof Error ? error.message : 'Не удалось загрузить данные персонажа');
      setCurrentCharacter(null);
      setCharacterSituation(null);
      setCreatorInfo(null);
      setCharacterPhotos([]);
      // Сбрасываем флаг загрузки при ошибке
      isLoadingCharacterDataRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // currentCharacter не в зависимостях, чтобы избежать циклов

  // Обработчик события обновления персонажа
  useEffect(() => {
    const handleCharacterUpdated = (event: CustomEvent) => {
      const { characterName, characterId } = event.detail || {};

      // Проверяем, что это обновление текущего персонажа
      const currentName = currentCharacter?.raw?.name || currentCharacter?.name;
      const currentId = currentCharacter?.raw?.id || currentCharacter?.id;

      if ((characterName && currentName && characterName === currentName) ||
        (characterId && currentId && String(characterId) === String(currentId))) {

        // Сбрасываем флаг загрузки, чтобы разрешить повторную загрузку
        isLoadingCharacterDataRef.current = null;

        // Принудительно перезагружаем данные персонажа
        const identifier = characterName || characterId?.toString() || currentName;
        if (identifier) {
          loadCharacterData(identifier);
        }
      } else {
      }
    };

    window.addEventListener('character-updated', handleCharacterUpdated as EventListener);

    return () => {
      window.removeEventListener('character-updated', handleCharacterUpdated as EventListener);
    };
  }, [currentCharacter, loadCharacterData]);

  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [isPhotoGenerationHelpModalOpen, setIsPhotoGenerationHelpModalOpen] = useState(false);
  const [imagePromptInput, setImagePromptInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  // Сохраняем отредактированные промпты для каждого персонажа (ключ - имя персонажа)
  // Загружаем из localStorage при инициализации
  const loadPromptsFromStorage = (): Record<string, string> => {
    try {
      const stored = localStorage.getItem('modifiedPrompts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {

    }
    return {};
  };

  const [modifiedPrompts, setModifiedPrompts] = useState<Record<string, string>>(loadPromptsFromStorage());
  // Используем ref для синхронного доступа к промптам (чтобы избежать проблем с асинхронным обновлением state)
  const modifiedPromptsRef = useRef<Record<string, string>>(loadPromptsFromStorage());

  // Вспомогательная функция для получения имени персонажа (используем везде одинаково)
  // НЕ используем useCallback, чтобы всегда получать актуальные значения
  const getCharacterName = () => {
    const characterForData = currentCharacter || initialCharacter;
    // Используем ту же логику, что и для characterIdentifier в других местах
    const name = characterForData?.name
      || (characterForData as any)?.raw?.name
      || '';
    return name;
  };

  // Синхронизируем ref с state при изменении modifiedPrompts и сохраняем в localStorage
  useEffect(() => {
    modifiedPromptsRef.current = modifiedPrompts;
    // Сохраняем в localStorage для надежности
    try {
      localStorage.setItem('modifiedPrompts', JSON.stringify(modifiedPrompts));
    } catch (e) {

    }
  }, [modifiedPrompts]);

  // Функция для получения начального промпта (sessionPrompt или данные из БД)
  const getInitialPrompt = (): string => {
    // Если есть сохраненный промпт в сессии, используем его
    if (sessionPrompt && sessionPrompt.trim()) {
      return sessionPrompt;
    }

    // Иначе формируем из данных персонажа
    const characterForData = currentCharacter || initialCharacter;
    const appearance = (characterForData as any)?.character_appearance
      || (characterForData as any)?.raw?.character_appearance
      || (characterForData as any)?.appearance
      || '';
    const location = (characterForData as any)?.location
      || (characterForData as any)?.raw?.location
      || '';

    const parts: string[] = [];
    if (appearance && appearance.trim()) {
      parts.push(appearance.trim());
    }
    if (location && location.trim()) {
      parts.push(location.trim());
    }

    return parts.length > 0 ? parts.join('\n') : '';
  };

  // Обновляем imagePromptInput при открытии модального окна, чтобы использовать актуальный sessionPrompt
  useEffect(() => {
    if (isImagePromptModalOpen) {
      // Используем sessionPrompt напрямую, если он есть, иначе данные из БД
      if (sessionPrompt && sessionPrompt.trim()) {
        setImagePromptInput(sessionPrompt);
      } else {
        // Формируем из данных персонажа
        const characterForData = currentCharacter || initialCharacter;
        const appearance = (characterForData as any)?.character_appearance
          || (characterForData as any)?.raw?.character_appearance
          || (characterForData as any)?.appearance
          || '';
        const location = (characterForData as any)?.location
          || (characterForData as any)?.raw?.location
          || '';
        const parts = [appearance, location].filter(p => p && p.trim());
        const defaultPrompt = parts.length > 0 ? parts.join('\n') : '';
        setImagePromptInput(defaultPrompt);
      }
    }
  }, [isImagePromptModalOpen, sessionPrompt, currentCharacter?.id, currentCharacter?.character_appearance, currentCharacter?.location]);

  // Функция для опроса статуса генерации изображения (используется из SSE потока)
  const pollImageGenerationStatus = async (taskId: string, messageId: string, token?: string) => {
    const statusUrl = `/api/v1/generation-status/${taskId}`;
    const maxAttempts = 60; // Максимум 2 минуты (60 * 2 секунды)
    const pollInterval = 2000; // Опрашиваем каждые 2 секунды
    let attempts = 0;
    let generatedImageUrl: string | undefined = undefined;
    let generationTime: number | undefined = undefined;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const statusResponse = await fetch(statusUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        });

        if (!statusResponse.ok) {
          throw new Error('Ошибка проверки статуса генерации');
        }

        const statusData = await statusResponse.json();

        // Извлекаем прогресс из ответа
        let progressValue: number | undefined = undefined;

        if (statusData.status === 'generating' && statusData.result?.progress !== undefined) {
          const rawProgress = typeof statusData.result.progress === 'number'
            ? statusData.result.progress
            : parseInt(String(statusData.result.progress).replace('%', ''), 10);
          progressValue = Math.min(99, Math.max(0, rawProgress));
        } else if (statusData.status === 'generating' && statusData.progress !== undefined && statusData.progress !== null) {
          const rawProgress = typeof statusData.progress === 'number'
            ? statusData.progress
            : parseInt(String(statusData.progress).replace('%', ''), 10);
          progressValue = Math.min(99, Math.max(0, rawProgress));
        }

        // Обновляем прогресс, если он валиден и мы все еще генерируем
        // Не используем заглушку на клиенте, так как она реализована на бэкенде
        if (progressValue !== undefined && !isNaN(progressValue)) {
          // Гарантируем, что прогресс не идет назад
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId && msg.isGenerating) {
              const currentMsgProgress = msg.progress || 0;
              if (progressValue > currentMsgProgress) {
                return { ...msg, progress: progressValue };
              }
            }
            return msg;
          }));
        } else if (statusData.status === 'generating') {
          // Если прогресс не пришел, но статус generating, оставляем как есть или показываем 5%
          // (но бэкенд должен возвращать прогресс)
        }

        // Обрабатываем статус "generating" - продолжаем опрос
        if (statusData.status === 'generating') {
          attempts++;
          continue;
        }

        if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
          // При успешном завершении устанавливаем прогресс в 100%
          stopPlaceholderProgress(messageId);
          updateMessageProgressContent(messageId, 100, false);
          generationStartTimesRef.current.delete(messageId);

          const result = statusData.result || {};
          generatedImageUrl = result.image_url || result.cloud_url || statusData.image_url || statusData.cloud_url;
          generationTime = result.generation_time || statusData.generation_time;

          if (generatedImageUrl) {
            // НЕ удаляем генерацию из трекера здесь - пусть generationTracker сам уведомит слушателей
            // generationTracker.removeGeneration(taskId);

            // Останавливаем прогресс заглушки
            stopPlaceholderProgress(messageId);
            setMessages(prev => prev.map(msg =>
              msg.id === messageId
                ? {
                  ...msg,
                  content: '',
                  imageUrl: generatedImageUrl,
                  ...(generationTime !== undefined && generationTime !== null ? { generationTime } : {})
                }
                : msg
            ));
            setActiveGenerations(prev => {
              const newSet = new Set(prev);
              newSet.delete(messageId);
              if (newSet.size === 0) setIsLoading(false);
              return newSet;
            });

            // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
            try {
              if (token) {
                const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    image_url: generatedImageUrl,
                    character_name: currentCharacter?.name || null
                  })
                });

                if (addToGalleryResponse.ok) {

                }
              }
            } catch (galleryError) {

            }

            // Обновляем счётчики после успешной генерации
            await loadSubscriptionStats();
            break;
          }
        } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
          // Удаляем генерацию из трекера при ошибке (только при ошибке)
          generationTracker.removeGeneration(taskId);

          stopPlaceholderProgress(messageId);
          setError(statusData.message || statusData.error || 'Ошибка генерации изображения');
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
          setActiveGenerations(prev => {
            const newSet = new Set(prev);
            newSet.delete(messageId);
            if (newSet.size === 0) setIsLoading(false);
            return newSet;
          });
          generationStartTimesRef.current.delete(messageId);
          await loadSubscriptionStats();
          return;
        }

        attempts++;
      } catch (error) {
        // Не удаляем из трекера при ошибке опроса - продолжаем отслеживать
        // generationTracker.removeGeneration(taskId);

        setError('Ошибка проверки статуса генерации');
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        setActiveGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          if (newSet.size === 0) setIsLoading(false);
          return newSet;
        });
        generationStartTimesRef.current.delete(messageId);
        return;
      }
    }

    if (!generatedImageUrl) {
      // Не удаляем из трекера при таймауте - продолжаем отслеживать в фоне
      // generationTracker.removeGeneration(taskId);

      stopPlaceholderProgress(messageId);
      setError('Превышено время ожидания генерации изображения');
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setActiveGenerations(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        if (newSet.size === 0) setIsLoading(false);
        return newSet;
      });
      generationStartTimesRef.current.delete(messageId);
    }
  };

  const handleGenerateImage = async (userPrompt?: string) => {
    // Если промпт не передан - открываем модалку
    if (!userPrompt) {
      // Используем getInitialPrompt() для получения начального промпта
      // Это может быть sessionPrompt (если был отредактирован) или данные из БД
      const initialPrompt = getInitialPrompt();
      setImagePromptInput(initialPrompt);
      setIsImagePromptModalOpen(true);
      return;
    }

    const trimmedPrompt = userPrompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    // Промпт уже сохранен в обработчике кнопки перед вызовом handleGenerateImage
    // Здесь мы только используем его для генерации

    // Проверяем лимит очереди генераций
    if (activeGenerations.size >= getGenerationQueueLimit) {
      const limitText = getGenerationQueueLimit === 1 ? 'одно фото' : `${getGenerationQueueLimit} фото`;
      setError(`Максимум ${limitText} могут генерироваться одновременно. Дождитесь завершения текущих генераций.`);
      return;
    }

    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    const token = authManager.getToken();
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Проверяем лимиты для FREE пользователей: модалка только когда лимит реально 0
    if (normalizedSubscriptionType === 'free' && subscriptionStats) {
      const photosRemaining = Math.max(0, (subscriptionStats.monthly_photos ?? 5) - (subscriptionStats.used_photos ?? 0));

      if (photosRemaining === 0) {
        setBoosterLimitType('photos');
        setIsBoosterOfferOpen(true);
        return;
      }
    }

    // Промпт для генерации фото не должен попадать в чат - это только для генерации изображения
    // Создаем только сообщение ассистента с прогрессом генерации

    const assistantMessageId = `image-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '0%', // Начинаем с 0%
      timestamp: new Date()
    };

    setMessages(prev => deduplicateMessages([...prev, assistantMessage]));

    // Добавляем генерацию в очередь активных
    setActiveGenerations(prev => new Set(prev).add(assistantMessageId));

    // Оптимистичное обновление счётчика генераций для FREE
    if (normalizedSubscriptionType === 'free') {
      setSubscriptionStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          used_photos: (prev.used_photos ?? 0) + 1
        };
      });
    }

    // УБРАН ФЕЙКОВЫЙ ПРОГРЕСС - используем только реальный из RunPod API
    setIsLoading(true);
    setError(null);

    let generationFailed = false;

    try {
      // Используем оригинальный промпт на русском языке
      // Убеждаемся, что модель валидна
      const validModel = selectedModel === 'anime' || selectedModel === 'anime-realism' || selectedModel === 'realism'
        ? selectedModel
        : 'anime-realism';

      const requestBody = {
        prompt: trimmedPrompt,
        custom_prompt: trimmedPrompt, // Передаем отредактированный промпт как custom_prompt
        character: currentCharacter.name,
        use_default_prompts: false, // Используем промпт как есть, без добавления данных персонажа
        user_id: userInfo?.id,
        model: validModel
        // Размеры берутся из generation_defaults.py (768x1344)
      };




      // Запоминаем время начала генерации СРАЗУ после создания сообщения (до отправки запроса)
      // Это нужно для правильного отображения прогресса заглушки
      generationStartTimesRef.current.set(assistantMessageId, Date.now());
      // Запускаем интервал для плавного обновления прогресса заглушки
      startPlaceholderProgress(assistantMessageId);



      const response = await fetch('/api/v1/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();

        } catch (e) {
          const text = await response.text();

          errorData = { detail: text || 'Ошибка генерации изображения' };
        }

        // Если это ошибка валидации, показываем детали
        if (response.status === 422 && errorData.detail) {
          const validationErrors = Array.isArray(errorData.detail) ? errorData.detail : [errorData.detail];
          const errorMessages = validationErrors.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.loc && err.msg) {
              return `${err.loc.join('.')}: ${err.msg}`;
            }
            return JSON.stringify(err);
          }).join('; ');
          throw new Error(`Ошибка валидации: ${errorMessages}`);
        }

        throw new Error(errorData.detail || errorData.message || 'Ошибка генерации изображения');
      }

      const data = await response.json();



      // Проверяем, пришел ли синхронный ответ с URL или асинхронный с task_id
      let generatedImageUrl = data.cloud_url || data.image_url;
      let generationTime: number | undefined = data.generation_time; // Время генерации в секундах


      // Если пришел task_id, опрашиваем статус до получения изображения
      if (!generatedImageUrl && data.task_id) {
        // Добавляем генерацию в трекер для отслеживания даже после выхода из чата
        const characterName = currentCharacter?.raw?.name || currentCharacter?.name;
        const characterId = currentCharacter?.raw?.id || currentCharacter?.id;
        // Сохраняем связь между taskId и messageId
        taskIdToMessageIdRef.current.set(data.task_id, assistantMessageId);
        generationTracker.addGeneration(
          data.task_id,
          assistantMessageId,
          characterName || undefined,
          characterId || undefined,
          token
        );

        const statusUrl = data.status_url || `/api/v1/generation-status/${data.task_id}`;

        // Опрашиваем статус с интервалом
        const maxAttempts = 60; // Максимум 2 минуты (60 * 2 секунды)
        const pollInterval = 2000; // Опрашиваем каждые 2 секунды (вместо 1 секунды)
        let attempts = 0;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval)); // Ждем 2 секунды

          try {
            const statusResponse = await fetch(statusUrl, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!statusResponse.ok) {
              throw new Error('Ошибка проверки статуса генерации');
            }

            const statusData = await statusResponse.json();

            // ЛОГИРУЕМ ПОЛНЫЙ ОТВЕТ для отладки (только первые несколько раз)
            if (attempts < 3 || attempts % 10 === 0) {

            }

            // ИЗВЛЕКАЕМ ПРОГРЕСС ИЗ ОТВЕТА RUNPOD API
            // Прогресс может быть в разных местах ответа
            let progressValue: number | undefined = undefined;

            // КРИТИЧЕСКИ ВАЖНО: Проверяем статус "generating" (новый статус из бэкенда)
            if (statusData.status === 'generating' && statusData.result?.progress !== undefined) {
              const rawProgress = typeof statusData.result.progress === 'number'
                ? statusData.result.progress
                : parseInt(String(statusData.result.progress).replace('%', ''), 10);
              // Ограничиваем прогресс до 99% для статуса "generating", 100% только при SUCCESS
              progressValue = Math.min(99, Math.max(0, rawProgress));

            }

            // 1. Проверяем прямое поле progress (только для статуса "generating", чтобы не показывать >99%)
            if (progressValue === undefined && statusData.status === 'generating' && statusData.progress !== undefined && statusData.progress !== null) {
              const rawProgress = typeof statusData.progress === 'number'
                ? statusData.progress
                : parseInt(String(statusData.progress).replace('%', ''), 10);
              progressValue = Math.min(99, Math.max(0, rawProgress));

            }

            // 2. Проверяем в result.progress (для статуса "generating")
            if (progressValue === undefined && statusData.status === 'generating' && statusData.result?.progress !== undefined) {
              const rawProgress = typeof statusData.result.progress === 'number'
                ? statusData.result.progress
                : parseInt(String(statusData.result.progress).replace('%', ''), 10);
              progressValue = Math.min(99, Math.max(0, rawProgress));

            }

            // 3. Проверяем в output.progress (RunPod может возвращать прогресс здесь) - только для "generating"
            if (progressValue === undefined && statusData.status === 'generating' && statusData.output !== undefined) {
              // output может быть строкой "90%" или объектом с полем progress
              if (typeof statusData.output === 'string') {
                const match = statusData.output.match(/(\d+)%/);
                if (match) {
                  const rawProgress = parseInt(match[1], 10);
                  progressValue = Math.min(99, Math.max(0, rawProgress));

                }
              } else if (typeof statusData.output === 'object' && statusData.output.progress !== undefined) {
                const rawProgress = typeof statusData.output.progress === 'number'
                  ? statusData.output.progress
                  : parseInt(String(statusData.output.progress).replace('%', ''), 10);
                progressValue = Math.min(99, Math.max(0, rawProgress));

              }
            }

            // 4. Пытаемся извлечь из строки status (например, "IN_PROGRESS 50%") - только для "generating"
            if (progressValue === undefined && statusData.status === 'generating' && typeof statusData.status === 'string') {
              const progressMatch = statusData.status.match(/(\d+)%/);
              if (progressMatch) {
                const rawProgress = parseInt(progressMatch[1], 10);
                progressValue = Math.min(99, Math.max(0, rawProgress));

              }
            }

            // Определяем, нужно ли использовать заглушку (строго первые 10 секунд)
            const startTime = generationStartTimesRef.current.get(assistantMessageId);
            const elapsed = startTime ? Date.now() - startTime : 0;
            const placeholderDuration = 10000; // Строго 10 секунд
            const usePlaceholder = elapsed < placeholderDuration;

            // Обновляем прогресс если он найден
            if (progressValue !== undefined && !isNaN(progressValue)) {
              // В первые 8 секунд используем заглушку, после - реальный прогресс
              updateMessageProgressContent(assistantMessageId, progressValue, usePlaceholder);
              if (attempts % 5 === 0) {  // Логируем каждые 5 попыток

              }
            } else {
              // Если прогресс не найден, используем заглушку в первые 8 секунд
              if (usePlaceholder) {
                updateMessageProgressContent(assistantMessageId, 0, true);
              }

              // Если прогресс не найден, логируем для отладки
              if (attempts % 10 === 0) {

              }
            }

            // Логируем только при изменении статуса или при завершении
            if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED' || statusData.status === 'FAILURE' || statusData.status === 'generating' || attempts % 10 === 0) {

            }

            // Обрабатываем статус "generating" - продолжаем опрос
            if (statusData.status === 'generating') {
              // Продолжаем опрос, прогресс уже обновлен выше
              attempts++;
              continue;
            }

            if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
              // При успешном завершении устанавливаем прогресс в 100% (без заглушки)
              stopPlaceholderProgress(assistantMessageId);
              updateMessageProgressContent(assistantMessageId, 100, false);
              // Удаляем время начала генерации
              generationStartTimesRef.current.delete(assistantMessageId);

              // URL может быть в result.image_url, result.cloud_url или напрямую в statusData
              const result = statusData.result || {};
              generatedImageUrl = result.image_url || result.cloud_url || statusData.image_url || statusData.cloud_url;
              const resultGenerationTime = result.generation_time || statusData.generation_time;

              if (resultGenerationTime !== undefined) {
                generationTime = resultGenerationTime;
              }

              // Логируем только финальный результат


              if (generatedImageUrl) {

                break;
              } else {

              }
            } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
              throw new Error(statusData.message || statusData.error || 'Ошибка генерации изображения');
            }

            attempts++;
          } catch (error) {

            throw error;
          }
        }

        if (!generatedImageUrl) {
          throw new Error('Превышено время ожидания генерации изображения');
        }
      }

      if (!generatedImageUrl) {
        throw new Error('Не удалось получить изображение');
      }

      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              content: '',
              imageUrl: generatedImageUrl,
              ...(generationTime !== undefined && generationTime !== null ? { generationTime } : {})
            };
          }
          return msg;
        })
      );

      // Удаляем генерацию из очереди активных после успешного завершения
      setActiveGenerations(prev => {
        const newSet = new Set(prev);
        newSet.delete(assistantMessageId);
        // Обновляем isLoading только если нет активных генераций
        if (newSet.size === 0) {
          setIsLoading(false);
        }
        return newSet;
      });

      // Очищаем время начала генерации
      stopPlaceholderProgress(assistantMessageId);
      generationStartTimesRef.current.delete(assistantMessageId);

      // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
      // Для генераций из чата всегда добавляем в галерею (add_to_gallery по умолчанию true)
      try {
        const token = authManager.getToken();
        if (token && generatedImageUrl) {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: generatedImageUrl,
              character_name: currentCharacter.name
            })
          });

          if (addToGalleryResponse.ok) {

          }
        }
      } catch (galleryError) {

      }

      // ИСТОРИЯ ЧАТА: История уже сохраняется на бэкенде в /generation-status эндпоинте
      // Убрано двойное сохранение на фронтенде, чтобы избежать дублирования сообщений
      // История сохраняется через ImageGenerationHistoryService в main.py при завершении генерации


      if (isAuthenticated) {
        await refreshUserStats();
      }
    } catch (error) {
      generationFailed = true;
      stopPlaceholderProgress(assistantMessageId);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка генерации изображения';
      const isPhotoLimit = /лимит генераций|лимита подписки для генерации|недостаточно монет для генерации/i.test(errorMessage);
      if (isPhotoLimit) {
        setBoosterLimitType('photos');
        setIsBoosterOfferOpen(true);
        setError(null);
      } else {
        setError(errorMessage);
      }
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));

      generationStartTimesRef.current.delete(assistantMessageId);

      if (normalizedSubscriptionType === 'free') {
        setSubscriptionStats(prev => {
          if (!prev) return prev;
          const current = prev.used_photos ?? 0;
          return { ...prev, used_photos: Math.max(0, current - 1) };
        });
      }
    } finally {
      // Удаляем генерацию из очереди активных
      setActiveGenerations(prev => {
        const newSet = new Set(prev);
        newSet.delete(assistantMessageId);
        // Обновляем isLoading только если нет активных генераций
        if (newSet.size === 0) {
          setIsLoading(false);
        }
        return newSet;
      });
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Проверяем авторизацию - сначала проверяем токен, потом состояние
    const token = authManager.getToken();
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Если токен есть, но состояние не обновлено, обновляем его
    if (!isAuthenticated) {
      const userInfo = await checkAuth();
      if (!userInfo) {
        setAuthMode('login');
        setIsAuthModalOpen(true);
        return;
      }
    }

    // Проверяем лимиты для FREE пользователей: модалка только когда лимит реально 0
    if (normalizedSubscriptionType === 'free' && subscriptionStats) {
      const messagesRemaining = Math.max(0, (subscriptionStats.monthly_messages ?? 10) - (subscriptionStats.used_messages ?? 0));

      if (messagesRemaining === 0) {
        setBoosterLimitType('messages');
        setIsBoosterOfferOpen(true);
        return;
      }
    }

    // Отправляем обычное сообщение без изображения
    await sendChatMessage(message, false);
  };

  const sendChatMessage = async (message: string, generateImage: boolean = false) => {
    // Разрешаем пустое сообщение, если запрашивается генерация фото
    // Фото = текст для истории чата
    if (!message.trim() && !generateImage) return;

    // Убеждаемся, что characterPhotos загружены перед отправкой сообщения
    if (currentCharacter && (!characterPhotos || characterPhotos.length === 0)) {
      const characterIdentifier = currentCharacter.raw?.name || currentCharacter.name;
      await loadCharacterData(characterIdentifier);
    }

    let effectiveUserId = userInfo?.id;
    if (!effectiveUserId) {
      const refreshed = await checkAuth();
      effectiveUserId = refreshed?.id;
      if (!effectiveUserId) {
        setError('Не удалось получить данные пользователя. Повторите попытку входа.');
        return;
      }
    }

    // Если сообщение пустое, но запрашивается генерация фото, создаем сообщение с промптом
    const originalMessage = message.trim() || (generateImage ? 'Генерация изображения' : '');

    // Промпт для генерации фото не должен попадать в чат как сообщение пользователя
    // Добавляем сообщение пользователя только если есть текст (для чата с текстовой моделью)
    // Если только генерация фото без текста - сообщение пользователя не добавляем в чат
    let userMessage: Message | null = null;
    if (message.trim()) {
      // Если есть текст сообщения - это сообщение в чат (с генерацией фото или без)
      userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: originalMessage,
        timestamp: new Date()
      };
      setMessages(prev => deduplicateMessages([...prev, userMessage!]));
    }
    // Если только generateImage без текста - не добавляем сообщение пользователя в чат
    setIsLoading(true);
    setError(null);

    // Создаем пустое сообщение ассистента для стриминга
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: generateImage ? '0%' : '', // Если генерация изображения, начинаем с прогресса
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Если генерация изображения, добавляем в очередь активных генераций и запускаем прогресс
    if (generateImage) {
      setActiveGenerations(prev => new Set(prev).add(assistantMessageId));
      // Запоминаем время начала генерации сразу после создания сообщения
      generationStartTimesRef.current.set(assistantMessageId, Date.now());
      // Запускаем интервал для плавного обновления прогресса заглушки
      startPlaceholderProgress(assistantMessageId);
    }

    try {
      // Используем /chat эндпоинт который поддерживает генерацию изображений
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const authToken = authManager.getToken();
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      // Включаем стриминг для всех запросов
      // 

      // Передаем выбранную модель только для PREMIUM подписки
      const requestBody: any = {
        message: originalMessage, // Отправляем оригинальное сообщение
        character: currentCharacter.name,
        generate_image: generateImage,
        user_id: effectiveUserId,
        image_prompt: generateImage ? originalMessage : undefined,
        target_language: targetLanguage, // Передаем выбранный язык
        stream: true // Включаем стриминг
      };

      // Добавляем модель только для PREMIUM
      if (normalizedSubscriptionType === 'premium' && selectedChatModel) {
        requestBody.model = selectedChatModel;
      }

      // Добавляем фиксированный лимит токенов (600)
      requestBody.max_tokens = maxTokens;

      // Добавляем режим краткости (влияет на system prompt)
      if (brevityMode) {
        requestBody.brevity_mode = brevityMode;
      }

      // Оптимистичное обновление счётчиков для FREE: число меняется сразу при действии
      if (normalizedSubscriptionType === 'free') {
        setSubscriptionStats(prev => {
          if (!prev) return prev;
          const next = { ...prev };
          if (originalMessage.trim()) next.used_messages = (next.used_messages ?? 0) + 1;
          if (generateImage) next.used_photos = (next.used_photos ?? 0) + 1;
          return next;
        });
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      // Проверяем, является ли ответ SSE потоком
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        // Обработка 401 - неавторизован
        if (response.status === 401) {
          authManager.clearTokens();
          setAuthMode('login');
          setIsAuthModalOpen(true);
          setError('Сессия истекла. Пожалуйста, войдите снова.');
          // Удаляем сообщения пользователя (если было) и ассистента
          setMessages(prev => prev.filter(msg =>
            (userMessage ? msg.id !== userMessage.id : true) && msg.id !== assistantMessageId
          ));
          setIsLoading(false);
          return;
        }

        // Обработка 403 - недостаточно ресурсов
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({ detail: '' }));
          const detail = (errorData.detail || '').toString();
          const isMessageLimit = /лимит сообщений исчерпан/i.test(detail);
          const isPhotoLimit = /лимит генераций|лимита подписки для генерации/i.test(detail);

          if (isMessageLimit || isPhotoLimit) {
            setBoosterLimitType(isPhotoLimit ? 'photos' : 'messages');
            setIsBoosterOfferOpen(true);
            setError(null);
          } else {
            setError(detail || 'Недостаточно кредитов подписки или монет для отправки сообщения! Нужно 2 кредита или 2 монеты.');
            await refreshUserStats();
          }
          setMessages(prev => prev.filter(msg =>
            (userMessage ? msg.id !== userMessage.id : true) && msg.id !== assistantMessageId
          ));
          setIsLoading(false);
          return;
        }

        // Обработка 404 - чат не найден, создаем новый
        if (response.status === 404) {
          // Удаляем текущий chat_id из состояния, чтобы создать новый
          // Это произойдет автоматически при следующем запросе
          setError('Чат не найден. Создаю новый чат...');
          // Повторяем запрос через небольшую задержку
          setTimeout(() => {
            sendChatMessage(message, generateImage);
          }, 500);
          return;
        }

        // Если это не SSE, пытаемся получить JSON ошибку
        if (!contentType || !contentType.includes('text/event-stream')) {
          const errorData = await response.json().catch(() => ({ detail: 'Ошибка отправки сообщения' }));
          throw new Error(errorData.detail || `Ошибка отправки сообщения (${response.status})`);
        } else {
          // Если это SSE с ошибкой, обрабатываем её в потоке
          // (ошибка будет обработана в цикле чтения)
        }
      }
      if (contentType && contentType.includes('text/event-stream')) {
        // Обрабатываем SSE поток
        // Сразу передаём клон потока трекеру — он получит task_id даже если пользователь выйдет из чата
        if (generateImage) {
          const characterName = currentCharacter?.raw?.name || currentCharacter?.name;
          const characterId = currentCharacter?.raw?.id || currentCharacter?.id;
          generationTracker.trackStreamForTaskId(response.clone(), {
            characterName: characterName || undefined,
            characterId: characterId || undefined,
            token: authToken || undefined,
            messageId: assistantMessageId
          });
        }
        const isImageGeneration = generateImage;
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = ''; // Накопленный контент для обновления

        if (!reader) {
          throw new Error('Не удалось получить поток данных');
        }

        while (true) {
          const { done, value } = await reader.read();


          if (done) {
            break;
          }

          // Декодируем чанк
          const decodedChunk = decoder.decode(value, { stream: true });
          buffer += decodedChunk;

          // Обрабатываем все полные строки
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Сохраняем неполную строку обратно в буфер


          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataString = line.slice(6);
                const data = JSON.parse(dataString);

                if (data.error) {
                  setIsLoading(false);
                  throw new Error(data.error);
                }

                // Обработка генерации изображений: если пришел task_id, запускаем опрос статуса
                if (isImageGeneration && data.task_id && !data.image_url && !data.cloud_url) {
                  // Добавляем генерацию в трекер для отслеживания даже после выхода из чата
                  const characterName = currentCharacter?.raw?.name || currentCharacter?.name;
                  const characterId = currentCharacter?.raw?.id || currentCharacter?.id;
                  // Сохраняем связь между taskId и messageId
                  taskIdToMessageIdRef.current.set(data.task_id, assistantMessageId);
                  generationTracker.addGeneration(
                    data.task_id,
                    assistantMessageId,
                    characterName || undefined,
                    characterId || undefined,
                    authToken || undefined
                  );
                  // Запускаем опрос статуса генерации в фоне
                  pollImageGenerationStatus(data.task_id, assistantMessageId, authToken || undefined);
                  continue;
                }

                // Обработка готового изображения из потока
                if (isImageGeneration && (data.image_url || data.cloud_url)) {
                  const imageUrl = data.image_url || data.cloud_url;
                  // 
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {
                        ...msg,
                        content: '',
                        imageUrl: imageUrl,
                        generationTime: data.generation_time
                      }
                      : msg
                  ));
                  setActiveGenerations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(assistantMessageId);
                    if (newSet.size === 0) setIsLoading(false);
                    return newSet;
                  });
                  stopPlaceholderProgress(assistantMessageId);
                  generationStartTimesRef.current.delete(assistantMessageId);

                  // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
                  try {
                    if (authToken) {
                      const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                          image_url: imageUrl,
                          character_name: currentCharacter?.name || null
                        })
                      });

                      if (addToGalleryResponse.ok) {
                        // 
                      }
                    }
                  } catch (galleryError) {

                  }

                  continue;
                }


                if (data.content) {
                  // Накопляем контент только если это не генерация изображения
                  if (!isImageGeneration) {
                    accumulatedContent += data.content;

                    // Обновляем сообщение ассистента с накопленным контентом
                    setMessages(prev => {
                      const messageIndex = prev.findIndex(msg => msg.id === assistantMessageId);
                      if (messageIndex === -1) {
                        return prev;
                      }

                      const updated = [...prev];
                      updated[messageIndex] = {
                        ...updated[messageIndex],
                        content: accumulatedContent
                      };

                      return updated;
                    });
                  }
                }

                if (data.done) {
                  // Стриминг завершен
                  if (!isImageGeneration) {
                    setIsLoading(false);
                  }
                  break;
                }
              } catch (e) {
                // Если это ошибка из данных, пробрасываем её дальше
                if (e instanceof Error && e.message) {
                  setIsLoading(false);
                  throw e;
                }
                // Иначе это ошибка парсинга, просто логируем

              }
            }
          }
        }

        // Обрабатываем оставшийся буфер
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulatedContent += data.content;
                  setMessages(prev => {
                    const messageIndex = prev.findIndex(msg => msg.id === assistantMessageId);
                    if (messageIndex === -1) {
                      return prev;
                    }
                    const updated = [...prev];
                    updated[messageIndex] = {
                      ...updated[messageIndex],
                      content: accumulatedContent
                    };
                    return updated;
                  });
                }
              } catch (e) {

              }
            }
          }
        }

        setIsLoading(false);
      } else {
        // Обрабатываем обычный JSON ответ (fallback)
        const data = await response.json();

        if (data.response) {
          // Обновляем сообщение ассистента с полным ответом и изображением (если есть)
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                ...msg,
                content: data.response,
                imageUrl: data.image_url || data.cloud_url || undefined,
                generationTime: data.generation_time
              }
              : msg
          ));

          setIsLoading(false);
        } else {
          throw new Error('Некорректный ответ от сервера');
        }
      }

      // После успешной отправки не вызываем refreshUserStats() — счётчики уже обновлены
      // оптимистично, а повторный запрос к /api/v1/profit/stats/ часто возвращает старые
      // данные (кэш/реплика) и «откатывает» отображение. При ошибке откат делаем в catch.
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка отправки сообщения';
      const isMessageLimit = /лимит сообщений исчерпан/i.test(errorMessage);
      const isPhotoLimit = /лимит генераций|лимита подписки для генерации/i.test(errorMessage);

      if (isMessageLimit || isPhotoLimit) {
        setBoosterLimitType(isPhotoLimit ? 'photos' : 'messages');
        setIsBoosterOfferOpen(true);
        setError(null);
      } else {
        setError(errorMessage);
        if (normalizedSubscriptionType === 'free') {
          await loadSubscriptionStats();
        }
      }

      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));

      // Если была генерация изображения, удаляем из очереди
      if (generateImage) {
        setActiveGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(assistantMessageId);
          return newSet;
        });
        generationStartTimesRef.current.delete(assistantMessageId);
        stopPlaceholderProgress(assistantMessageId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = useCallback(async (characterName: string, expectedCharacter?: Character | null) => {
    // Используем raw.name из expectedCharacter если передан, иначе из currentCharacter, иначе используем переданный name
    // Важно: identifier должен быть реальным именем из БД, не display_name
    let identifier = characterName; // По умолчанию используем переданный name

    if (expectedCharacter?.raw?.name) {
      identifier = expectedCharacter.raw.name;
    } else if (currentCharacter?.raw?.name) {
      identifier = currentCharacter.raw.name;
    } else if (expectedCharacter?.name && expectedCharacter.name !== expectedCharacter.display_name) {
      // Если name отличается от display_name, используем name (это может быть реальное имя из БД)
      identifier = expectedCharacter.name;
    } else if (currentCharacter?.name && currentCharacter.name !== currentCharacter.display_name) {
      identifier = currentCharacter.name;
    }

    // Проверяем, что identifier не пустой
    if (!identifier || identifier.trim() === '') {

      return;
    }

    // Проверяем, есть ли сохраненная история после оплаты в localStorage
    try {
      const savedHistory = localStorage.getItem('pending_chat_history');
      if (savedHistory) {
        const historyData = JSON.parse(savedHistory);

        // Проверяем, что история не старше 1 часа (защита от устаревших данных)
        const maxAge = 60 * 60 * 1000; // 1 час в миллисекундах
        const age = Date.now() - (historyData.timestamp || 0);

        if (age > maxAge) {
          console.log('[CHAT_RESTORE] История устарела, очищаем localStorage');
          localStorage.removeItem('pending_chat_history');
        } else {
          // Проверяем, что это история для бустера (не для других типов оплаты)
          if (historyData.type !== 'booster_payment') {
            console.log('[CHAT_RESTORE] Неизвестный тип истории, игнорируем');
            localStorage.removeItem('pending_chat_history');
          } else {
            // Проверяем, что история для текущего персонажа
            const savedCharacterId = historyData.characterId;
            const currentCharacterId = expectedCharacter?.id || expectedCharacter?.name || currentCharacter?.id || currentCharacter?.name;

            if (savedCharacterId === currentCharacterId || savedCharacterId === identifier) {
              console.log('[CHAT_RESTORE] Восстановление истории чата из localStorage:', historyData);

              // Восстанавливаем сообщения
              const restoredMessages: Message[] = historyData.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }));

              setMessages(restoredMessages);

              // Очищаем localStorage после успешного восстановления
              localStorage.removeItem('pending_chat_history');
              console.log('[CHAT_RESTORE] История успешно восстановлена и очищена из localStorage');

              isLoadingHistoryRef.current = null;
              return; // Не загружаем историю с сервера, используем восстановленную
            } else {
              console.log('[CHAT_RESTORE] История для другого персонажа, игнорируем');
            }
          }
        }
      }
    } catch (e) {
      console.error('[CHAT_RESTORE] Ошибка восстановления истории:', e);
      // Продолжаем загрузку с сервера при ошибке
    }

    // Отмечаем, что начинаем загрузку истории для этого персонажа
    // Сохраняем identifier в начале для проверки в конце
    const loadIdentifier = identifier;
    isLoadingHistoryRef.current = loadIdentifier;

    try {


      const token = authManager.getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(identifier)}/chat-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (response.status === 404) {

        setMessages([]);
        isLoadingHistoryRef.current = null;
        return;
      }

      if (!response.ok) {

        setMessages([]);
        isLoadingHistoryRef.current = null;
        return;
      }

      if (response.ok) {
        const data = await response.json();


        if (data.messages && data.messages.length > 0) {
          // Преобразуем сообщения в формат, ожидаемый компонентом
          const formattedMessages: Message[] = data.messages.map((msg: any) => {
            const rawContent = typeof msg.content === 'string' ? msg.content : '';
            // Проверяем image_url из API ответа (приоритет) или из content
            let imageUrl = msg.image_url;

            // Если image_url нет в ответе, пытаемся извлечь из content
            if (!imageUrl) {
              const imageMatch = rawContent.match(/\[image:(.*?)\]/);
              if (imageMatch) {
                imageUrl = imageMatch[1].trim();
              }
            }

            // Очищаем content от [image:url] если он там есть
            let cleanedContent = rawContent.replace(/\n?\[image:.*?\]/g, '').trim();

            // Если есть imageUrl, content должен быть полностью пустым (скрываем промпт)
            // Если imageUrl нет, используем очищенный content
            const finalContent = imageUrl ? '' : cleanedContent;

            // Логируем для отладки
            if (imageUrl) {

            }

            return {
              id: msg.id.toString(),
              type: msg.type === 'assistant' ? 'assistant' : 'user',
              content: finalContent,
              timestamp: new Date(msg.timestamp),
              imageUrl: imageUrl,
              generationTime: msg.generation_time !== undefined && msg.generation_time !== null
                ? (typeof msg.generation_time === 'number' ? msg.generation_time : parseFloat(msg.generation_time))
                : undefined
            };
          });

          // Улучшенная дедупликация: сначала по URL изображения, потом по ID
          const seenUrls = new Set<string>();
          const seenIds = new Map<string, Message>();
          const uniqueMessages: Message[] = [];

          for (const msg of formattedMessages) {
            // Нормализуем URL для сравнения (убираем query параметры и якоря)
            const normalizedUrl = msg.imageUrl ? msg.imageUrl.split('?')[0].split('#')[0] : null;

            // Если есть imageUrl, проверяем дубликаты по URL (приоритет)
            if (normalizedUrl) {
              if (seenUrls.has(normalizedUrl)) {

                continue; // Пропускаем дубликат по URL
              }
              seenUrls.add(normalizedUrl);
            }

            // Проверяем дубликаты по ID
            const existing = seenIds.get(msg.id);
            if (existing) {
              // Если ID уже был, оставляем сообщение с большим количеством данных (приоритет imageUrl и generationTime)
              if ((msg.imageUrl && !existing.imageUrl) ||
                (msg.generationTime && !existing.generationTime) ||
                (msg.imageUrl && msg.generationTime && (!existing.generationTime))) {
                // Заменяем на более полную версию
                const index = uniqueMessages.findIndex(m => m.id === msg.id);
                if (index !== -1) {
                  uniqueMessages[index] = msg;
                  seenIds.set(msg.id, msg);

                }
              }
              continue;
            }

            seenIds.set(msg.id, msg);
            uniqueMessages.push(msg);
          }

          const finalMessages = deduplicateMessages(uniqueMessages);

          // Проверяем активные генерации и обновляем сообщения, если изображения готовы
          // Это нужно для случая, когда пользователь вернулся в чат после генерации
          const activeGenerations = generationTracker.getGenerations();
          for (const [taskId, generation] of activeGenerations.entries()) {
            const genCharacterName = generation.characterName;
            const genCharacterId = generation.characterId;
            const currentCharacterName = expectedCharacter?.raw?.name || expectedCharacter?.name || currentCharacter?.raw?.name || currentCharacter?.name;
            const currentCharacterId = expectedCharacter?.raw?.id || expectedCharacter?.id || currentCharacter?.raw?.id || currentCharacter?.id;

            const isForCurrentCharacter =
              (genCharacterName && currentCharacterName && genCharacterName.toLowerCase() === currentCharacterName.toLowerCase()) ||
              (genCharacterId && currentCharacterId && String(genCharacterId) === String(currentCharacterId));

            if (isForCurrentCharacter) {
              // Проверяем статус генерации
              const checkGenerationStatus = async () => {
                try {
                  const statusUrl = `/api/v1/generation-status/${taskId}`;
                  const token = authManager.getToken();
                  const response = await fetch(statusUrl, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                  });

                  if (response.ok) {
                    const statusData = await response.json();
                    if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
                      const result = statusData.result || {};
                      const imageUrl = result.image_url || result.cloud_url || statusData.image_url || statusData.cloud_url;

                      if (imageUrl) {
                        // Обновляем сообщение с готовым изображением
                        const messageId = generation.messageId;
                        setMessages(prev =>
                          prev.map(msg => {
                            if (msg.id === messageId) {
                              return {
                                ...msg,
                                imageUrl: imageUrl,
                                content: '',
                                isGenerating: false,
                                progress: undefined
                              };
                            }
                            return msg;
                          })
                        );
                      }
                    }
                  }
                } catch (error) {
                  // Игнорируем ошибки проверки статуса
                }
              };

              // Проверяем статус асинхронно
              checkGenerationStatus();
            }
          }

          // Устанавливаем messages синхронно, чтобы избежать race condition
          // Проверяем, что мы все еще загружаем историю для того же персонажа (защита от race condition)
          // Используем loadIdentifier, сохраненный в начале функции
          // Учитываем как currentCharacter, так и expectedCharacter (который может быть передан при загрузке)
          const currentIdentifier = currentCharacter?.raw?.name || currentCharacter?.name;
          const expectedIdentifier = expectedCharacter?.raw?.name || expectedCharacter?.name;
          const matchesCurrent = currentIdentifier === loadIdentifier;
          const matchesExpected = expectedIdentifier === loadIdentifier;

          // КРИТИЧНО: Всегда устанавливаем сообщения, если мы их загрузили
          // Упрощаем логику до максимума - устанавливаем сообщения ВСЕГДА, если они есть
          // Это важно, чтобы сообщения отображались даже при race conditions


          // КРИТИЧНО: Всегда устанавливаем сообщения, если они загружены
          // Не проверяем условия - просто устанавливаем
          setMessages(finalMessages);
          isLoadingHistoryRef.current = null;

        } else {
          const currentIdentifier = currentCharacter?.raw?.name || currentCharacter?.name;
          const expectedIdentifier = expectedCharacter?.raw?.name || expectedCharacter?.name;
          const matchesCurrent = currentIdentifier === loadIdentifier;
          const matchesExpected = expectedIdentifier === loadIdentifier;

          // КРИТИЧНО: Всегда устанавливаем пустой массив, если истории нет

          setMessages([]);
          isLoadingHistoryRef.current = null;
        }
      } else {

        // КРИТИЧНО: Всегда устанавливаем пустой массив при ошибке
        setMessages([]);
      }
    } catch (error) {

      // КРИТИЧНО: Всегда устанавливаем пустой массив при ошибке
      setMessages([]);
    } finally {
      // Сбрасываем флаг загрузки только если это была загрузка для текущего идентификатора
      if (isLoadingHistoryRef.current === loadIdentifier) {
        isLoadingHistoryRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Функция не зависит от внешних переменных, использует только параметры

  const handleCharacterSelect = (character: Character) => {
    const characterIdentifier = character.raw?.name || character.name;


    // Проверяем, не загружали ли мы уже этого персонажа
    if (lastLoadedCharacterRef.current === characterIdentifier) {

      return;
    }

    // Очищаем messages только если персонаж действительно изменился
    const isDifferentCharacter = currentCharacter?.name !== character.name ||
      currentCharacter?.raw?.name !== character.raw?.name;
    if (isDifferentCharacter) {

      setMessages([]);
    }

    lastLoadedCharacterRef.current = characterIdentifier;
    setCurrentCharacter(character);
    loadCharacterData(characterIdentifier); // Загружаем данные нового персонажа
    loadChatHistory(characterIdentifier, character); // Загружаем историю чатов с новым персонажем, передаем character для правильного identifier
    fetchPaidAlbumStatus(characterIdentifier);
  };

  // Мемоизируем идентификатор персонажа из initialCharacter, чтобы избежать лишних перезагрузок
  const initialCharacterIdentifier = useMemo(() => {
    return initialCharacter ? (initialCharacter.raw?.name || initialCharacter.name) : null;
  }, [initialCharacter?.raw?.name, initialCharacter?.name]);

  // Обновляем персонажа если изменился initialCharacter
  useEffect(() => {

    if (initialCharacterIdentifier) {
      const characterIdentifier = initialCharacterIdentifier;


      // Проверяем, изменился ли персонаж действительно (сравниваем по raw.name или name)
      const currentIdentifier = currentCharacter?.raw?.name || currentCharacter?.name;
      const newIdentifier = initialCharacter.raw?.name || initialCharacter.name;
      const isNewCharacter = currentIdentifier !== newIdentifier;

      if (isNewCharacter) {

        // НЕ сбрасываем isLoadingHistoryRef здесь - это вызовет race condition
        // Вместо этого сбросим его только в самом начале loadChatHistory
        setMessages([]); // Очищаем только при реальной смене персонажа
      } else {

      }

      // Проверяем, не загружали ли мы уже этого персонажа
      if (lastLoadedCharacterRef.current !== characterIdentifier) {
        lastLoadedCharacterRef.current = characterIdentifier;
        setCurrentCharacter(initialCharacter);
        loadCharacterData(characterIdentifier);
        // Загружаем историю всегда, даже если персонаж не изменился (на случай, если история обновилась)
        loadChatHistory(characterIdentifier, initialCharacter); // Передаем initialCharacter для правильного identifier
        fetchPaidAlbumStatus(characterIdentifier);
      } else {

      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCharacterIdentifier]); // Используем только идентификатор, функции мемоизированы

  // Загружаем персонажа из URL, если initialCharacter не передан
  useEffect(() => {

    // Если initialCharacter не передан и currentCharacter тоже null, пытаемся загрузить из URL
    // Также проверяем, что мы еще не загружали из URL
    if (!initialCharacter && !currentCharacter && !isLoadingFromUrlRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character');

      if (characterId) {

        isLoadingFromUrlRef.current = true; // Устанавливаем флаг загрузки

        // Функция для загрузки персонажа по ID
        const loadCharacterFromUrl = async () => {
          try {
            // Сначала проверяем localStorage
            const savedCharacter = localStorage.getItem(`character_${characterId}`);
            if (savedCharacter) {
              try {
                const character = JSON.parse(savedCharacter);

                setCurrentCharacter(character);

                // Используем raw.name (реальное имя из БД) для загрузки истории
                // Если raw.name нет, используем name, но лучше загрузить полные данные через loadCharacterData
                const characterIdentifier = character.raw?.name || character.name;


                if (characterIdentifier) {
                  // Проверяем, не загружали ли мы уже этого персонажа
                  if (lastLoadedCharacterRef.current !== characterIdentifier) {
                    lastLoadedCharacterRef.current = characterIdentifier;
                    setCurrentCharacter(character);
                    // loadCharacterData обновит данные персонажа, включая raw
                    loadCharacterData(characterIdentifier);
                    // Передаем character для правильного определения identifier в loadChatHistory
                    loadChatHistory(characterIdentifier, character);
                    if (fetchPaidAlbumStatus) {
                      fetchPaidAlbumStatus(characterIdentifier);
                    }
                  } else {

                    setCurrentCharacter(character); // Устанавливаем персонажа, но не загружаем данные повторно
                  }
                } else {

                  // Если нет identifier, загружаем из API
                  throw new Error('No identifier in localStorage character');
                }
                return;
              } catch (parseError) {

                // Продолжаем загрузку из API
              }
            }

            // Если не найден в localStorage или ошибка парсинга, загружаем из API с полными данными
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterId)}/with-creator`);
            if (response.ok) {
              const characterData = await response.json();


              // Создаем объект персонажа с правильной структурой
              const character = {
                id: characterData.id?.toString() || characterId,
                name: characterData.name || '',
                display_name: characterData.display_name || characterData.name || '',
                description: characterData.description || '',
                avatar: characterData.avatar || '',
                raw: characterData // Сохраняем raw данные для правильной работы с именем
              };

              // Сохраняем в localStorage для будущего использования
              try {
                localStorage.setItem(`character_${characterId}`, JSON.stringify(character));

              } catch (storageError) {

              }

              setCurrentCharacter(character);

              // Используем raw.name (реальное имя из БД) для загрузки истории
              const characterIdentifier = characterData.name || characterId;


              if (characterIdentifier) {
                // Проверяем, не загружали ли мы уже этого персонажа
                if (lastLoadedCharacterRef.current !== characterIdentifier) {
                  lastLoadedCharacterRef.current = characterIdentifier;
                  setCurrentCharacter(character);
                  // loadCharacterData обновит данные персонажа, включая raw
                  loadCharacterData(characterIdentifier);
                  // Передаем character с raw данными для правильного определения identifier в loadChatHistory
                  loadChatHistory(characterIdentifier, character);
                  fetchPaidAlbumStatus(characterIdentifier);
                } else {

                  setCurrentCharacter(character); // Устанавливаем персонажа, но не загружаем данные повторно
                }
              } else {

                setError('Не удалось определить идентификатор персонажа');
              }
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');


              // Если персонаж не найден (404), показываем ошибку и очищаем localStorage
              if (response.status === 404) {

                try {
                  localStorage.removeItem(`character_${characterId}`);
                } catch (e) {

                }
                // Устанавливаем ошибку, чтобы показать сообщение пользователю
                setError(`Персонаж с ID "${characterId}" не найден. Возможно, он был удален.`);
                // Не устанавливаем currentCharacter, чтобы показать сообщение об ошибке
              } else {
                setError(`Не удалось загрузить персонажа: ${errorText || 'Неизвестная ошибка'}`);
              }
            }
          } catch (error) {

            setError(error instanceof Error ? error.message : 'Не удалось загрузить персонажа');
          } finally {
            isLoadingFromUrlRef.current = false; // Сбрасываем флаг загрузки
          }
        };

        loadCharacterFromUrl();
      } else {

        // Если нет параметра character и нет initialCharacter, показываем ошибку
        if (!initialCharacter) {
          setError('Персонаж не выбран. Выберите персонажа на главной странице.');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCharacter?.name, initialCharacter?.id]); // Загружаем из URL только если initialCharacter изменился или отсутствует

  const handleAuthSuccess = async (accessToken: string, refreshToken?: string) => {
    // Сохраняем токены
    authManager.setTokens(accessToken, refreshToken);
    setIsAuthModalOpen(false);
    setAuthMode('login');

    // Небольшая задержка, чтобы токены успели сохраниться в localStorage
    await new Promise(resolve => setTimeout(resolve, 100));

    // Обновляем состояние аутентификации через checkAuth для надежности
    const userInfo = await checkAuth();
    if (userInfo) {
      setIsAuthenticated(true);
      setUserInfo(userInfo);
      refreshUserStats(); // Обновляем информацию о пользователе
      if (currentCharacter?.raw?.name || currentCharacter?.name) {
        const identifier = currentCharacter.raw?.name || currentCharacter.name;
        fetchPaidAlbumStatus(identifier);
      }
    } else {
      // Если checkAuth не сработал, устанавливаем состояние вручную

      setIsAuthenticated(true);
    }
  };

  const handleOpenPaidAlbumView = () => {
    if (!currentCharacter) {
      return;
    }

    if (normalizedSubscriptionType === 'free' && !paidAlbumStatus?.unlocked) {
      setPaidAlbumError(`Откройте доступ к альбому, оплатив ${PAID_ALBUM_COST} кредитов, или оформите подписку Standard/Premium.`);
      return;
    }

    if (onOpenPaidAlbum) {
      onOpenPaidAlbum(currentCharacter);
      return;
    }
    if (onNavigate) {
      onNavigate('paid-album', currentCharacter);
    }
  };

  const handleOpenPaidAlbumBuilderView = () => {
    if (!currentCharacter) {
      return;
    }

    if (!canCreatePaidAlbum) {
      setPaidAlbumError(null);
      setIsUpgradeModalOpen(true);
      return;
    }

    if (onOpenPaidAlbumBuilder) {
      onOpenPaidAlbumBuilder(currentCharacter);
      return;
    }
    if (onNavigate) {
      onNavigate('paid-album-builder', currentCharacter);
      return;
    }
    if (onOpenPaidAlbum) {
      onOpenPaidAlbum(currentCharacter);
    }
  };

  const handleUnlockPaidAlbum = async () => {
    if (!currentCharacter?.name) {
      return;
    }

    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Проверка подписки: разблокировать альбом могут только пользователи с подпиской Standard или Premium
    if (normalizedSubscriptionType !== 'standard' && normalizedSubscriptionType !== 'premium') {
      setBoosterVariantOverride('album_access');
      setIsBoosterOfferOpen(true);
      return;
    }

    if (userCoins < PAID_ALBUM_COST) {
      setPaidAlbumError(`Недостаточно кредитов. Нужно ${PAID_ALBUM_COST}, доступно ${userCoins}.`);
      return;
    }

    setPaidAlbumError(null);
    setIsUnlockingAlbum(true);
    try {
      const response = await authManager.fetchWithAuth('/api/v1/paid-gallery/unlock/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ character_name: currentCharacter.name })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = (data && (data.detail || data.message)) || 'Не удалось разблокировать альбом';
        throw new Error(message);
      }

      // Если в ответе есть обновленный баланс, используем его для немедленного обновления
      if (data.coins !== undefined && typeof data.coins === 'number') {

        // Диспатчим событие с новым балансом для немедленного обновления
        window.dispatchEvent(new CustomEvent('balance-update', { detail: { coins: data.coins } }));
        // Не отправляем второе событие, так как баланс уже обновлен
      } else {
        // Если баланса нет в ответе, обновляем через API
        await refreshUserStats();
        setTimeout(() => {
          window.dispatchEvent(new Event('balance-update'));
        }, 200);
      }

      const identifier = currentCharacter.raw?.name || currentCharacter.name;
      await fetchPaidAlbumStatus(identifier);
      handleOpenPaidAlbumView();
    } catch (error) {

      setPaidAlbumError(error instanceof Error ? error.message : 'Не удалось разблокировать альбом');
    } finally {
      setIsUnlockingAlbum(false);
    }
  };

  const handleAddToPaidAlbum = useCallback(async (imageUrl: string, characterName: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      throw new Error('Необходима авторизация');
    }

    const token = authManager.getToken();
    if (!token) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      throw new Error('Необходима авторизация');
    }

    try {
      const encodedName = encodeURIComponent(characterName);
      // Получаем текущие фото из платного альбома
      const currentPhotosResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${encodedName}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!currentPhotosResponse.ok) {
        if (currentPhotosResponse.status === 403) {
          throw new Error('Сначала разблокируйте платный альбом персонажа');
        }
        throw new Error('Не удалось получить текущие фото альбома');
      }

      const currentData = await currentPhotosResponse.json();
      const currentPhotos = currentData.images || [];

      // Проверяем, не превышен ли лимит
      if (currentPhotos.length >= 20) {
        throw new Error('В платном альбоме может быть не более 20 фотографий');
      }

      // Проверяем, нет ли уже этого фото
      const photoExists = currentPhotos.some((photo: any) => photo.url === imageUrl);
      if (photoExists) {
        throw new Error('Это фото уже добавлено в платный альбом');
      }

      // Добавляем новое фото
      const newPhotos = [
        ...currentPhotos,
        {
          id: `photo_${Date.now()}`,
          url: imageUrl
        }
      ];

      // Отправляем обновленный список фото
      const saveResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${encodedName}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            photos: newPhotos
          })
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Не удалось добавить фото в платный альбом');
      }

      // Обновляем статус альбома (используем raw.name если доступен)
      const identifier = currentCharacter?.raw?.name || characterName;
      await fetchPaidAlbumStatus(identifier);


    } catch (error) {

      throw error;
    }
  }, [isAuthenticated, fetchPaidAlbumStatus]);

  const handleAddToGallery = useCallback(async (imageUrl: string, characterName: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      throw new Error('Необходима авторизация');
    }

    const token = authManager.getToken();
    if (!token) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      throw new Error('Необходима авторизация');
    }

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
            character_name: characterName || null
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'Не удалось добавить фото в галерею';
        // Если фото уже добавлено, это не критическая ошибка - просто возвращаемся
        if (response.status === 400 && (errorMessage.includes('уже добавлено') || errorMessage.includes('already'))) {
          // Фото уже в галереи - это нормально, не показываем ошибку
          return;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Обновляем счетчик фото в профиле
      window.dispatchEvent(new CustomEvent('gallery-update'));
    } catch (error) {

      throw error;
    }
  }, [isAuthenticated]);

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'gallery':
        window.open('/paid_gallery/', '_blank');
        break;
      case 'shop':
        if (onShop) {
          onShop();
        } else {
          alert('Функция магазина будет реализована в следующих версиях');
        }
        break;
      case 'create':
        alert('Функция создания персонажа будет реализована в следующих версиях');
        break;
      case 'clear':
        clearChat();
        break;
      default:

    }
  };

  const handleLanguageChange = (newLanguage: 'ru' | 'en') => {
    // Если язык не изменился, ничего не делаем
    if (newLanguage === targetLanguage) {
      return;
    }

    // Если есть сообщения в чате, показываем модальное окно
    if (messages.length > 0) {
      setPendingLanguage(newLanguage);
      setIsLanguageChangeModalOpen(true);
    } else {
      // Если сообщений нет, просто меняем язык (сохранение в localStorage произойдет автоматически через useEffect)
      setTargetLanguage(newLanguage);
    }
  };

  const handleConfirmLanguageChange = async () => {
    if (pendingLanguage) {
      // Очищаем чат перед сменой языка
      await clearChat();
      // Меняем язык
      setTargetLanguage(pendingLanguage);
      // Закрываем модальное окно
      setIsLanguageChangeModalOpen(false);
      setPendingLanguage(null);
    }
  };

  const handleCancelLanguageChange = () => {
    setIsLanguageChangeModalOpen(false);
    setPendingLanguage(null);
  };

  const clearChat = async () => {
    try {
      if (!currentCharacter) return;



      const token = authManager.getToken();
      if (!token) {

        return;
      }

      // Очищаем историю в базе данных через правильный endpoint
      const response = await authManager.fetchWithAuth(
        `/api/v1/chat-history/clear-history`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            character_name: currentCharacter.name,
            session_id: 'default'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();


        // Очищаем локальное состояние
        setMessages([]);
        setError(null);

        // Диспатчим событие для обновления страницы истории
        // Используем name (как возвращается из API истории), а не display_name
        const characterName = currentCharacter.name;

        window.dispatchEvent(new CustomEvent('chat-history-cleared', {
          detail: { characterName: characterName }
        }));

      } else {

        // Все равно очищаем локальное состояние
        setMessages([]);
        setError(null);
      }
    } catch (error) {

      // Все равно очищаем локальное состояние
      setMessages([]);
      setError(null);
    }
  };

  const albumCharacterName = currentCharacter?.display_name || currentCharacter?.name || '';
  const userCoins = userInfo?.coins ?? 0;
  const isPaidAlbumUnlocked = useMemo(() => {
    if (paidAlbumStatus?.unlocked) {
      return true;
    }

    if (paidAlbumStatus?.is_owner && normalizedSubscriptionType !== 'free') {
      return true;
    }

    // Для PREMIUM пользователей альбомы всегда открыты
    if (normalizedSubscriptionType === 'premium') {
      return true;
    }

    return false;
  }, [paidAlbumStatus?.unlocked, paidAlbumStatus?.is_owner, normalizedSubscriptionType]);
  const canExpandAlbum = Boolean(paidAlbumStatus?.is_owner && canCreatePaidAlbum);

  // КРИТИЧЕСКИ ВАЖНО: Guard clauses для предотвращения белого экрана
  // Показываем спиннер только если персонаж еще не загружен И идет загрузка
  // Если персонаж уже есть, показываем интерфейс даже при isLoading (например, при генерации изображения)
  // Если персонаж не найден (есть ошибка), показываем сообщение об ошибке

  // Используем currentCharacter или initialCharacter для проверки
  const effectiveCharacterForRender = currentCharacter || initialCharacter;

  // Если есть сообщения, но нет персонажа - все равно показываем интерфейс (персонаж может загружаться)
  // Это важно, чтобы сообщения отображались даже если персонаж еще загружается
  const hasMessages = messages.length > 0;


  // УБРАНО: проверки, которые блокируют отображение чата
  // Чат всегда должен отображаться, даже если персонаж еще загружается или есть ошибки
  // Показываем спиннер ТОЛЬКО если идет загрузка И нет персонажа, нет сообщений И нет ошибки
  // Если есть хотя бы что-то одно (персонаж ИЛИ сообщения) - показываем интерфейс
  // const shouldShowLoading = isLoading && !effectiveCharacterForRender && !hasMessages && !error;

  // if (shouldShowLoading) {
  //   
  //   return (
  //     <div style={{ 
  //       display: 'flex', 
  //       alignItems: 'center', 
  //       justifyContent: 'center', 
  //       height: '100vh', 
  //       width: '100vw',
  //       color: '#fff', 
  //       flexDirection: 'column', 
  //       gap: '1rem',
  //       backgroundColor: '#0a0a0a'
  //     }}>
  //       <LoadingSpinner size="lg" text={isLoading ? 'Загрузка данных персонажа...' : 'Инициализация чата...'} />
  //     </div>
  //   );
  // }

  // Если есть ошибка и нет персонажа/сообщений - показываем ошибку
  // if (error && !effectiveCharacterForRender && !hasMessages) {
  //   
  //   return (
  //     <div style={{ 
  //       display: 'flex', 
  //       alignItems: 'center', 
  //       justifyContent: 'center', 
  //       height: '100vh', 
  //       width: '100vw',
  //       color: '#fff', 
  //       flexDirection: 'column', 
  //       gap: '1rem',
  //       backgroundColor: '#0a0a0a'
  //     }}>
  //       <ErrorMessage message={error} onClose={() => setError(null)} />
  //       {onBackToMain && (
  //         <button 
  //           onClick={() => onBackToMain()}
  //           style={{ 
  //             marginTop: '1rem', 
  //             padding: '0.5rem 1rem', 
  //             cursor: 'pointer',
  //             background: 'rgba(100, 100, 100, 0.3)',
  //             border: '1px solid rgba(150, 150, 150, 0.3)',
  //             borderRadius: '0.5rem',
  //             color: '#fff',
  //             fontSize: '1rem',
  //             fontWeight: 600
  //           }}
  //         >
  //           Вернуться на главную
  //         </button>
  //       )}
  //     </div>
  //   );
  // }

  // Если дошли сюда - значит есть персонаж ИЛИ сообщения - показываем интерфейс
  // Используем effectiveCharacterForRender для рендера
  const characterForRender = currentCharacter || initialCharacter;

  // Проверка владельца персонажа
  const isOwnerByCreatorInfo = creatorInfo && userInfo && creatorInfo.id === userInfo.id;
  const isOwnerByCharacter = (characterForRender as any)?.user_id && userInfo && (characterForRender as any).user_id === userInfo.id;
  const isOwner = paidAlbumStatus?.is_owner || isOwnerByCreatorInfo || isOwnerByCharacter;

  // Дедупликация сообщений перед рендером - используем useMemo для оптимизации
  // Улучшенная дедупликация: для изображений используем content+imageUrl, для текста - id
  const uniqueMessages = useMemo(() => {
    try {
      if (!messages || !Array.isArray(messages)) {
        return [];
      }
      const seen = new Set<string>();
      return messages.filter(m => {
        if (!m) return false;
        // Для сообщений с изображением используем content + imageUrl для обнаружения дубликатов
        // Для текстовых сообщений используем id
        const key = m.imageUrl && m.imageUrl.trim() !== ''
          ? `${m.content || ''}_${m.imageUrl.split('?')[0].split('#')[0]}`
          : m.id;

        if (seen.has(key)) {

          return false;
        }
        seen.add(key);
        return true;
      });
    } catch (error) {

      // В случае ошибки возвращаем пустой массив или оригинальный массив, если он валиден
      if (!messages || !Array.isArray(messages)) {
        return [];
      }
      const seenIds = new Set<string>();
      return messages.filter(msg => {
        if (!msg || seenIds.has(msg.id)) {
          return false;
        }
        seenIds.add(msg.id);
        return true;
      });
    }
  }, [messages]);

  return (
    <Container>
      <MainContent>
        <GlobalHeader
          onShop={onShop}
          onLogin={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthMode('register');
            setIsAuthModalOpen(true);
          }}
          onLogout={() => {
            authManager.clearTokens();
            setIsAuthenticated(false);
            setUserInfo(null);
            setBalanceRefreshTrigger(prev => prev + 1);
          }}
          onProfile={onOwnProfile || (() => userInfo?.id && onProfile?.(userInfo.id))}
          onBalance={() => alert('Баланс пользователя')}
          refreshTrigger={balanceRefreshTrigger}
          currentCharacterId={currentCharacter?.id}
          isOnChatPage={true}
        />

        {/* Кнопки альбома для мобильных устройств - под хедером */}
        <MobileAlbumButtonsContainer>
          {isPaidAlbumUnlocked || (normalizedSubscriptionType as string) === 'premium' ? (
            <MobileAlbumButton
              $variant="secondary"
              onClick={handleOpenPaidAlbumView}
            >
              <FolderOpen />
              Открыть альбом
            </MobileAlbumButton>
          ) : (
            <MobileAlbumButton
              onClick={handleUnlockPaidAlbum}
              disabled={isUnlockingAlbum}
            >
              {isUnlockingAlbum ? (
                <>
                  <LoadingSpinner size="sm" />
                  Разблокируем...
                </>
              ) : (
                <>
                  <FiLock />
                  Разблокировать
                </>
              )}
            </MobileAlbumButton>
          )}

          {/* Кнопка расширения для владельца */}
          {isOwner && (
            <MobileAlbumButton
              onClick={() => {
                if (canCreatePaidAlbum) {
                  handleOpenPaidAlbumBuilderView();
                } else {
                  setIsUpgradeModalOpen(true);
                }
              }}
            >
              <Sparkles />
              Расширить альбом
            </MobileAlbumButton>
          )}
        </MobileAlbumButtonsContainer>

        <ChatContentWrapper>
          <ChatMessagesArea style={{ zIndex: 10, position: 'relative' }}>
            <ChatArea
              onSendMessage={handleSendMessage}
              messages={uniqueMessages}
              isLoading={isLoading}
              isGeneratingImage={activeGenerations.size > 0}
              characterSituation={characterSituation ?? undefined}
              characterName={characterForRender?.name || ''}
              characterAvatar={characterPhotos && characterPhotos.length > 0 ? characterPhotos[0] : undefined}
              voiceUrl={(() => {
                // Сначала используем voice_url (обязательно для user_voice_*, для дефолтов бэкенд тоже его отдаёт)
                if (currentCharacter?.voice_url) return currentCharacter.voice_url;
                const vid = currentCharacter?.voice_id;
                if (vid && typeof vid === 'string' && !vid.startsWith('user_voice_'))
                  return `/default_character_voices/${vid}`;
                return undefined;
              })()}
              userAvatar={userInfo?.avatar_url || undefined}
              userUsername={userInfo?.username || undefined}
              userEmail={userInfo?.email || undefined}
              isCharacterOwner={paidAlbumStatus?.is_owner ?? false}
              isAuthenticated={isAuthenticated}
              isAdmin={userInfo?.is_admin ?? false}
              onAddToPaidAlbum={handleAddToPaidAlbum}
              onAddToGallery={handleAddToGallery}
              creatorInfo={creatorInfo}
              userInfo={userInfo}
              onShop={onShop}
              selectedVoiceId={selectedVoiceId}
              selectedVoiceUrl={selectedVoiceUrl}
              onSelectVoice={saveSelectedVoice}
              onOutOfLimits={handleOutOfLimits}
            />

            {error && (
              <ErrorMessage
                message={error}
                onClose={() => setError(null)}
              />
            )}

            <MessageInput
              onSendMessage={handleSendMessage}
              onShop={onShop}
              targetLanguage={targetLanguage}
              onLanguageChange={handleLanguageChange}
              isPremium={normalizedSubscriptionType === 'premium'}
              subscriptionType={normalizedSubscriptionType}
              brevityMode={brevityMode}
              onBrevityModeChange={setBrevityMode}
              onSelectModel={() => setIsModelSelectorOpen(true)}
              messagesRemaining={
                normalizedSubscriptionType === 'free'
                  ? Math.max(0, (subscriptionStats?.monthly_messages ?? 5) - (subscriptionStats?.used_messages ?? 0))
                  : undefined
              }
              photosRemaining={
                normalizedSubscriptionType === 'free'
                  ? Math.max(0, (subscriptionStats?.monthly_photos ?? 5) - (subscriptionStats?.used_photos ?? 0))
                  : undefined
              }
              imagesRemaining={
                subscriptionStats && subscriptionStats.images_limit !== undefined
                  ? Math.max(0, (subscriptionStats.images_limit ?? 0) - (subscriptionStats.images_used ?? 0))
                  : undefined
              }
              voiceRemaining={
                subscriptionStats && subscriptionStats.voice_limit !== undefined
                  ? Math.max(0, (subscriptionStats.voice_limit ?? 0) - (subscriptionStats.voice_used ?? 0))
                  : (normalizedSubscriptionType === 'free' ? 5 : undefined)
              }
              onGenerateImage={() => {
                // Открываем модалку с предзаполненным промптом из данных персонажа (проверяем несколько источников)
                const characterForData = currentCharacter || initialCharacter;
                const appearance = (characterForData as any)?.character_appearance
                  || (characterForData as any)?.raw?.character_appearance
                  || (characterForData as any)?.appearance
                  || '';
                const location = (characterForData as any)?.location
                  || (characterForData as any)?.raw?.location
                  || '';
                const parts = [appearance, location].filter(p => p && p.trim());
                const defaultPrompt = parts.length > 0 ? parts.join('\n') : '';

                setImagePromptInput(defaultPrompt);
                setIsImagePromptModalOpen(true);
              }}
              onShowHelp={() => {
                setIsPhotoGenerationHelpModalOpen(true);
              }}
              onClearChat={clearChat}
              onTipCreator={() => {



                if (!isAuthenticated) {

                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                } else {

                  setIsTipModalOpen(true);
                }
              }}
              onShowComments={() => {
                if (!isAuthenticated) {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                } else {
                  const characterForComments = currentCharacter || initialCharacter;
                  if (characterForComments && onNavigate) {
                    onNavigate('character-comments', characterForComments);
                  } else {
                    // Fallback: переход через URL
                    const characterName = characterForComments?.name || characterForComments?.id || '';
                    if (characterName) {
                      window.location.href = `/character-comments?character=${encodeURIComponent(characterName)}`;
                    }
                  }
                }
              }}
              disabled={isLoading && activeGenerations.size === 0}
              disableImageGeneration={activeGenerations.size >= getGenerationQueueLimit}
              placeholder={`Напишите сообщение ${characterForRender?.name || 'персонажу'}...`}
              hasMessages={messages.length > 0}
            />
          </ChatMessagesArea>

          {(!isMobile || messages.length === 0) && (
            <PaidAlbumPanel>
              {/* Индикатор очереди генераций - вверху панели */}
              <GenerationQueueContainer>
                <QueueLabel>ОЧЕРЕДЬ ГЕНЕРАЦИИ</QueueLabel>
                <GenerationQueueIndicator>
                  <QueueProgressBar
                    $filled={activeGenerations.size}
                    $total={getGenerationQueueLimit}
                  />
                </GenerationQueueIndicator>
                <QueueCounter>
                  Queue: {activeGenerations.size}/{getGenerationQueueLimit}
                </QueueCounter>
              </GenerationQueueContainer>

              {/* Карточка персонажа сразу после очереди */}
              {currentCharacter && (
                <CharacterCardWrapper>
                  <CharacterCard
                    character={{
                      id: currentCharacter.id,
                      name: currentCharacter.name,
                      description: currentCharacter.description || '',
                      avatar: currentCharacter.avatar || currentCharacter.name.charAt(0).toUpperCase(),
                      photos: characterPhotos,
                      tags: [],
                      author: creatorInfo?.username || 'Unknown',
                      likes: currentCharacter.likes || 0,
                      dislikes: currentCharacter.dislikes || 0,
                      views: currentCharacter.views || 0,
                      comments: currentCharacter.comments || 0
                    }}
                    onClick={() => { }}
                    isAuthenticated={isAuthenticated}
                    isFavorite={isCharacterFavorite}
                    showRatings={true}
                    onFavoriteToggle={async () => {
                      // Обновляем состояние избранного после переключения, загружая актуальное состояние с сервера
                      if (currentCharacter?.id) {
                        try {
                          const characterId = typeof currentCharacter.id === 'number'
                            ? currentCharacter.id
                            : parseInt(currentCharacter.id, 10);

                          if (!isNaN(characterId)) {
                            const favoriteResponse = await authManager.fetchWithAuth(
                              API_CONFIG.CHECK_FAVORITE(characterId)
                            );
                            if (favoriteResponse.ok) {
                              const favoriteData = await favoriteResponse.json();
                              setIsCharacterFavorite(favoriteData?.is_favorite || false);
                            }
                          }
                        } catch (error) {

                          // В случае ошибки просто переключаем состояние локально
                          setIsCharacterFavorite(!isCharacterFavorite);
                        }
                      } else {
                        setIsCharacterFavorite(!isCharacterFavorite);
                      }
                    }}
                    onPhotoGeneration={() => {
                      if (onOpenPaidAlbumBuilder && currentCharacter) {
                        onOpenPaidAlbumBuilder(currentCharacter);
                      }
                    }}
                    onPaidAlbum={() => {
                      if (onOpenPaidAlbum && currentCharacter) {
                        onOpenPaidAlbum(currentCharacter);
                      } else {
                        handleOpenPaidAlbumView();
                      }
                    }}
                  />
                </CharacterCardWrapper>
              )}

              {creatorInfo && (
                <CreatorInfoWrapper>
                  {creatorInfo.avatar_url ? (
                    <CreatorAvatar
                      src={creatorInfo.avatar_url}
                      alt={creatorInfo.username || 'Создатель'}
                    />
                  ) : (
                    <CreatorAvatarPlaceholder>
                      {(creatorInfo.username || String(creatorInfo.id)).charAt(0).toUpperCase()}
                    </CreatorAvatarPlaceholder>
                  )}
                  <span>Создал: </span>
                  <CreatorLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();

                      if (onProfile) {
                        onProfile(creatorInfo.id);
                      } else {
                        window.dispatchEvent(new CustomEvent('navigate-to-profile', {
                          detail: { userId: creatorInfo.id }
                        }));
                      }
                    }}
                  >
                    {creatorInfo.username && creatorInfo.username.trim() ? creatorInfo.username : `user_${creatorInfo.id}`}
                  </CreatorLink>
                </CreatorInfoWrapper>
              )}

              {(() => {
                // Альтернативная проверка владельца через creatorInfo
                const isOwnerByCreatorInfo = creatorInfo && userInfo && creatorInfo.id === userInfo.id;
                // Также проверяем через currentCharacter.user_id, если есть
                const isOwnerByCharacter = characterForRender?.user_id && userInfo && characterForRender.user_id === userInfo.id;
                const isOwner = paidAlbumStatus?.is_owner || isOwnerByCreatorInfo || isOwnerByCharacter;


                // ПРИОРИТЕТ 1: Если пользователь является создателем
                if (isOwner) {
                  // Если есть подписка STANDARD/PREMIUM - показываем кнопку "Расширить альбом"
                  if (canCreatePaidAlbum) {
                    return (
                      <>
                        {isPaidAlbumUnlocked && (
                          <PaidAlbumButton
                            $variant="secondary"
                            onClick={handleOpenPaidAlbumView}
                          >
                            <FolderOpen />
                            Открыть альбом
                          </PaidAlbumButton>
                        )}
                        <PaidAlbumButton
                          onClick={handleOpenPaidAlbumBuilderView}
                        >
                          <Sparkles />
                          Расширить альбом
                        </PaidAlbumButton>
                        {!isPaidAlbumUnlocked && (
                          <PaidAlbumInfo>
                            Вы создатель этого персонажа. Можете создать платный альбом и добавлять в него фотографии.
                          </PaidAlbumInfo>
                        )}
                        {isPaidAlbumUnlocked && (
                          <PaidAlbumInfo>
                            Альбом разблокирован. Вы можете расширить коллекцию фотографий.
                          </PaidAlbumInfo>
                        )}
                      </>
                    );
                  }

                  // Если нет подписки STANDARD/PREMIUM - показываем кнопку "Разблокировать" и ниже "Расширить альбом"
                  // Для BASE подписки показываем кнопку "Разблокировать" с модальным окном
                  if (normalizedSubscriptionType === 'base') {
                    return (
                      <>
                        {isPaidAlbumUnlocked ? (
                          <PaidAlbumButton
                            $variant="secondary"
                            onClick={handleOpenPaidAlbumView}
                          >
                            <FolderOpen />
                            Открыть альбом
                          </PaidAlbumButton>
                        ) : (
                          <PaidAlbumButton
                            onClick={handleUnlockPaidAlbum}
                          >
                            <FiLock />
                            Разблокировать
                          </PaidAlbumButton>
                        )}
                        <PaidAlbumButton
                          onClick={() => setIsUpgradeModalOpen(true)}
                        >
                          <Sparkles />
                          Расширить альбом
                        </PaidAlbumButton>
                        {paidAlbumError && <PaidAlbumError>{paidAlbumError}</PaidAlbumError>}
                      </>
                    );
                  }

                  // Для FREE подписки показываем обычную кнопку разблокировки и ниже "Расширить альбом"
                  // Для PREMIUM показываем "Открыть" вместо "Разблокировать"
                  return (
                    <>
                      {isPaidAlbumUnlocked || (normalizedSubscriptionType as string) === 'premium' ? (
                        <PaidAlbumButton
                          $variant="secondary"
                          onClick={handleOpenPaidAlbumView}
                        >
                          <FolderOpen />
                          Открыть альбом
                        </PaidAlbumButton>
                      ) : (
                        <PaidAlbumButton
                          onClick={handleUnlockPaidAlbum}
                          disabled={isUnlockingAlbum}
                        >
                          {isUnlockingAlbum ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Разблокируем...
                            </>
                          ) : (
                            <>
                              <FiLock />
                              Разблокировать
                            </>
                          )}
                        </PaidAlbumButton>
                      )}
                      <PaidAlbumButton
                        onClick={() => setIsUpgradeModalOpen(true)}
                      >
                        <Sparkles />
                        Расширить альбом
                      </PaidAlbumButton>
                      <PaidAlbumInfo>
                        Доступно кредитов: {userCoins}. Разблокировка за {PAID_ALBUM_COST} кредитов.
                      </PaidAlbumInfo>
                      {paidAlbumError && <PaidAlbumError>{paidAlbumError}</PaidAlbumError>}
                    </>
                  );
                }

                // Обычный пользователь, альбом не разблокирован
                // Но если пользователь является создателем, показываем кнопку "Расширить альбом" ниже
                // Для PREMIUM показываем "Открыть" вместо "Разблокировать"
                return (
                  <>
                    {isPaidAlbumUnlocked || (normalizedSubscriptionType as string) === 'premium' ? (
                      <PaidAlbumButton
                        $variant="secondary"
                        onClick={handleOpenPaidAlbumView}
                      >
                        <FolderOpen />
                        Открыть альбом
                      </PaidAlbumButton>
                    ) : (
                      <PaidAlbumButton
                        onClick={handleUnlockPaidAlbum}
                        disabled={isUnlockingAlbum}
                      >
                        {isUnlockingAlbum ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Разблокируем...
                          </>
                        ) : (
                          <>
                            <FiLock />
                            Разблокировать
                          </>
                        )}
                      </PaidAlbumButton>
                    )}
                    {/* Показываем кнопку "Расширить альбом" для создателя, даже если он не в блоке isOwner */}
                    {isOwner && (
                      <PaidAlbumButton
                        onClick={() => {
                          if (canCreatePaidAlbum) {
                            handleOpenPaidAlbumBuilderView();
                          } else {
                            setIsUpgradeModalOpen(true);
                          }
                        }}
                      >
                        <Sparkles />
                        Расширить альбом
                      </PaidAlbumButton>
                    )}
                    <PaidAlbumInfo>
                      Доступно кредитов: {userCoins}. Разблокировка за {PAID_ALBUM_COST} кредитов.
                    </PaidAlbumInfo>
                    {paidAlbumError && <PaidAlbumError>{paidAlbumError}</PaidAlbumError>}
                  </>
                );
              })()}

              {/* Кнопка "Показать бустер" */}
              <ShowBoosterButton
                onClick={() => {
                  setBoosterLimitType('messages');
                  setIsBoosterInfoMode(true);
                  setIsBoosterOfferOpen(true);
                }}
              >
                <Sparkles />
                Показать бустер
              </ShowBoosterButton>

            </PaidAlbumPanel>
          )}
        </ChatContentWrapper>
      </MainContent>

      {isUpgradeModalOpen && (
        <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
          <UpgradeModal onClick={(e) => e.stopPropagation()}>
            <UpgradeModalTitle>
              {normalizedSubscriptionType === 'base'
                ? 'Платные альбомы недоступны'
                : 'Разблокировка альбома недоступна'}
            </UpgradeModalTitle>
            <UpgradeModalText>
              {' '}
              {normalizedSubscriptionType === 'base'
                ? 'Платные альбомы доступны только для подписчиков Standard и Premium. Оформите подписку, чтобы создавать и расширять платные альбомы.'
                : 'Разблокировка и добавление фотографий в альбом доступны только подписчикам Standard и Premium. Оформите подписку, чтобы получить доступ к этой функции.'}
            </UpgradeModalText>
            <UpgradeModalActions>
              <PaidAlbumButton onClick={() => {
                setIsUpgradeModalOpen(false);
                onShop?.();
              }}>
                {normalizedSubscriptionType === 'base' ? 'Перейти в магазин' : 'Оформить подписку'}
              </PaidAlbumButton>
              <PaidAlbumButton
                $variant="secondary"
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                Понятно
              </PaidAlbumButton>
            </UpgradeModalActions>
          </UpgradeModal>
        </UpgradeOverlay>
      )}

      {/* Модальное окно помощи по генерации фото */}
      <PhotoGenerationHelpModal
        isOpen={isPhotoGenerationHelpModalOpen}
        onClose={() => setIsPhotoGenerationHelpModalOpen(false)}
      />

      {/* Модалка для ввода промпта генерации */}
      {isImagePromptModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(12px)',
          padding: isMobile ? '10px' : '0'
        }}>
          <div style={{
            background: 'rgba(20, 20, 25, 0.85)',
            backdropFilter: 'blur(20px)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '16px',
            maxWidth: '900px',
            width: isMobile ? '100%' : '90%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
            maxHeight: isMobile ? '90vh' : 'auto',
            overflowY: isMobile ? 'auto' : 'visible',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
              Генерация фото персонажа
            </h3>
            <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Стоимость: 30 монет. Опишите желаемое изображение или отредактируйте предзаполненный промпт.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                color: '#fff',
                fontSize: '0.9rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FiSettings size={14} /> Выберите стиль
              </label>
              <ModelSelectionContainer>
                <ModelCard
                  $isSelected={selectedModel === 'anime-realism'}
                  $previewImage="/анимереализм.jpg"
                  onClick={() => setSelectedModel('anime-realism')}
                >
                  <ModelInfoOverlay>
                    <ModelName>Аниме + Реализм</ModelName>
                    <ModelDescription>Сбалансированный стиль</ModelDescription>
                  </ModelInfoOverlay>
                </ModelCard>

                <ModelCard
                  $isSelected={selectedModel === 'anime'}
                  $previewImage="/аниме.png"
                  onClick={() => setSelectedModel('anime')}
                >
                  <ModelInfoOverlay>
                    <ModelName>Аниме</ModelName>
                    <ModelDescription>Классический 2D стиль</ModelDescription>
                  </ModelInfoOverlay>
                </ModelCard>
              </ModelSelectionContainer>
            </div>
            <textarea
              value={imagePromptInput}
              onChange={(e) => setImagePromptInput(e.target.value)}
              placeholder="Опишите желаемое изображение..."
              style={{
                width: '100%',
                minHeight: isMobile ? '120px' : '200px',
                padding: '1rem',
                background: 'rgba(15, 15, 20, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                resize: 'vertical',
                marginBottom: '0.5rem',
                fontFamily: 'inherit'
              }}
            />

            {/* Теги-помощники */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <TagsContainer $isExpanded={isTagsExpanded}>
                {[
                  // Нормальные промпты
                  { label: 'Высокая детализация', value: 'высокая детализация, реализм, 8к разрешение' },
                  { label: 'Киберпанк', value: 'стиль киберпанк, неоновое освещение, футуристично' },
                  { label: 'Фэнтези', value: 'фэнтези стиль, магическая атмосфера' },
                  { label: 'Портрет', value: 'крупный план, детальное лицо, выразительный взгляд' },
                  { label: 'В полный рост', value: 'в полный рост, изящная поза' },
                  { label: 'Аниме стиль', value: 'красивый аниме стиль, четкие линии, яркие цвета' },
                  { label: 'Реализм', value: 'фотореалистично, натуральные текстуры кожи' },
                  { label: 'Кинематографично', value: 'кинематографичный свет, глубокие тени, драматично' },
                  { label: 'На пляже', value: 'на берегу океана, золотой песок, закатное солнце' },
                  { label: 'В городе', value: 'на оживленной улице города, ночные огни, боке' },
                  { label: 'В лесу', value: 'в сказочном лесу, лучи солнца сквозь листву' },
                  { label: 'Офисный стиль', value: 'в строгом офисном костюме, деловая обстановка' },
                  { label: 'Летнее платье', value: 'в легком летнем платье, летящая ткань' },
                  { label: 'Вечерний свет', value: 'мягкий вечерний свет, теплые тона' },
                  { label: 'Зима', value: 'зимний пейзаж, падающий снег, меховая одежда' },
                  { label: 'Элегантный образ', value: 'элегантная поза, утонченный стиль, изысканность' },
                  { label: 'Портрет крупным планом', value: 'крупный план лица, выразительный взгляд, детализированные черты' },
                  { label: 'В парке', value: 'в городском парке, зеленая трава, солнечный свет' },
                  { label: 'В кафе', value: 'в уютном кафе, теплая атмосфера, приятная обстановка' },
                  { label: 'На природе', value: 'на природе, свежий воздух, красивые пейзажи' },
                  { label: 'Вечерний наряд', value: 'в красивом вечернем наряде, элегантный стиль' },
                  { label: 'Повседневный образ', value: 'в повседневной одежде, комфортный стиль' },
                  { label: 'Спортивный стиль', value: 'в спортивной одежде, активный образ жизни' },
                  { label: 'Романтичная атмосфера', value: 'романтичная обстановка, мягкое освещение, уют' }
                ].map((tag, idx) => (
                  <TagButton
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const separator = imagePromptInput.length > 0 && !imagePromptInput.endsWith(', ') && !imagePromptInput.endsWith(',') ? ', ' : '';
                      const newValue = imagePromptInput + separator + tag.value;
                      setImagePromptInput(newValue);
                    }}
                  >
                    <Plus size={10} /> {tag.label}
                  </TagButton>
                ))}
              </TagsContainer>
              <ExpandButton
                $isExpanded={isTagsExpanded}
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </ExpandButton>
            </div>
            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => {
                  // Сброс промпта к дефолтным данным из БД
                  const characterForData = currentCharacter || initialCharacter;
                  const appearance = (characterForData as any)?.character_appearance
                    || (characterForData as any)?.raw?.character_appearance
                    || (characterForData as any)?.appearance
                    || '';
                  const location = (characterForData as any)?.location
                    || (characterForData as any)?.raw?.location
                    || '';
                  const parts = [appearance, location].filter(p => p && p.trim());
                  const defaultPrompt = parts.length > 0 ? parts.join('\n') : '';
                  setImagePromptInput(defaultPrompt);
                  setSessionPrompt(null); // Сбрасываем сохраненный промпт
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.9))',
                  border: '1px solid rgba(139, 92, 246, 0.6)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: isMobile ? '100%' : 'auto',
                  order: isMobile ? 3 : 1,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(99, 102, 241, 1))';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.9))';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
              >
                Сбросить
              </button>
              <button
                onClick={() => {
                  // Проверяем очередь только при клике
                  if (activeGenerations.size >= getGenerationQueueLimit) {
                    setError(`Максимум ${getGenerationQueueLimit} ${getGenerationQueueLimit === 1 ? 'фото может' : 'фото могут'} генерироваться одновременно. Дождитесь завершения текущих генераций.`);
                    return;
                  }
                  if (imagePromptInput.trim()) {
                    // Сохраняем промпт в sessionPrompt перед генерацией
                    const promptToSave = imagePromptInput.trim();
                    setSessionPrompt(promptToSave);
                    setIsImagePromptModalOpen(false);
                    handleGenerateImage(promptToSave);
                  }
                }}
                disabled={!imagePromptInput.trim()}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  background: !imagePromptInput.trim()
                    ? 'rgba(60, 60, 60, 0.5)'
                    : 'linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9))',
                  border: !imagePromptInput.trim()
                    ? '1px solid rgba(80, 80, 80, 0.5)'
                    : '1px solid rgba(251, 191, 36, 0.6)',
                  borderRadius: '8px',
                  color: !imagePromptInput.trim() ? 'rgba(150, 150, 150, 0.5)' : '#1a1a1a',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: !imagePromptInput.trim()
                    ? 'not-allowed'
                    : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: !imagePromptInput.trim() ? 0.6 : 1,
                  width: isMobile ? '100%' : 'auto',
                  order: isMobile ? 1 : 2,
                  boxShadow: !imagePromptInput.trim()
                    ? 'none'
                    : '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(234, 179, 8, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (imagePromptInput.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 1), rgba(251, 191, 36, 1))';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 179, 8, 0.4)';
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.9)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (imagePromptInput.trim()) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9))';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(234, 179, 8, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }
                }}
                onMouseDown={(e) => {
                  if (imagePromptInput.trim()) {
                    e.currentTarget.style.transform = 'scale(0.98)';
                  }
                }}
                onMouseUp={(e) => {
                  if (imagePromptInput.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
              >
                Сгенерировать
              </button>
              <button
                onClick={() => setIsImagePromptModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.9))',
                  border: '1px solid rgba(139, 92, 246, 0.6)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: isMobile ? '100%' : 'auto',
                  order: isMobile ? 2 : 3,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(99, 102, 241, 1))';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.9))';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {isTipModalOpen && userInfo && (
        <TipCreatorModal
          isOpen={isTipModalOpen}
          onClose={() => {


            setIsTipModalOpen(false);
          }}
          characterName={currentCharacter.name}
          characterDisplayName={currentCharacter.display_name || currentCharacter.name}
          photoGenerations={
            subscriptionStats
              ? Math.max(0, (subscriptionStats.monthly_photos || 0) + (subscriptionStats.photos_pack || 0) - (subscriptionStats.used_photos || 0))
              : 0
          }
          voiceGenerations={
            subscriptionStats
              ? Math.max(0, (subscriptionStats.voice_limit || 0) - (subscriptionStats.voice_used || 0))
              : 0
          }
          onSuccess={(tipType, senderRemaining, amount) => {
            // Обновляем данные пользователя и подписки
            refreshUserStats();
            // Показываем toast с типом благодарности
            setTipAmount(amount);
            setTipType(tipType);
            setShowSuccessToast(true);
            setIsTipModalOpen(false);
          }}
        />
      )}

      {showSuccessToast && (
        <SuccessToast
          message="Спасибо за поддержку!"
          amount={tipAmount}
          tipType={tipType || undefined}
          onClose={() => setShowSuccessToast(false)}
          duration={3000}
        />
      )}

      {isLanguageChangeModalOpen && (
        <ConfirmModal
          isOpen={isLanguageChangeModalOpen}
          title="Смена языка"
          message="История чата с персонажем будет удалена, если вы хотите общаться на другом языке. Продолжить?"
          confirmText="Продолжить"
          cancelText="Отмена"
          onConfirm={handleConfirmLanguageChange}
          onCancel={handleCancelLanguageChange}
        />
      )}

      {isModelSelectorOpen && (
        <ModelSelectorModal
          isOpen={isModelSelectorOpen}
          selectedModel={selectedChatModel}
          onSelectModel={(model) => {
            setSelectedChatModel(model);
            localStorage.setItem('selectedChatModel', model);
          }}
          onClose={() => setIsModelSelectorOpen(false)}
          isPremium={(normalizedSubscriptionType as string) === 'premium'}
          onOpenPremiumModal={() => setIsUpgradeModalOpen(true)}
        />
      )}

      <BoosterOfferModal
        isOpen={isBoosterOfferOpen}
        onClose={() => {
          setIsBoosterOfferOpen(false);
          setIsBoosterInfoMode(false);
          setBoosterVariantOverride(null);
        }}
        limitType={boosterLimitType}
        variant={
          boosterVariantOverride || (
            isBoosterInfoMode
              ? 'info'
              : subscriptionStats &&
                ((subscriptionStats.monthly_messages ?? 5) > 5 ||
                  (subscriptionStats.monthly_photos ?? 5) > 5 ||
                  (subscriptionStats.voice_limit ?? 0) > 5)
                ? 'out_of_limits'
                : 'booster'
          )
        }
        chatHistory={messages}
        characterId={currentCharacter?.id || currentCharacter?.name}
        userId={userInfo?.id}
        isAdmin={userInfo?.is_admin}
      />


    </Container>
  );
};