import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
import { AuthModal } from './AuthModal';
import { TipCreatorModal } from './TipCreatorModal';
import { SuccessToast } from './SuccessToast';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { CompactSidebar } from './CompactSidebar';
import { GlobalHeader } from './GlobalHeader';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { authManager } from '../utils/auth';
import { FiUnlock, FiLock, FiImage } from 'react-icons/fi';

const PAID_ALBUM_COST = 200;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
  background: transparent;

  /* Адаптивность для мобильных устройств */
  @media (max-width: 1024px) {
    height: auto;
    min-height: 100vh;
    flex-direction: column;
  }
`;

const MainContent = styled.div`
  flex: 1;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent !important; /* Принудительно прозрачный */
  border: none;
  border-radius: ${theme.borderRadius.xl} 0 0 ${theme.borderRadius.xl};
  margin-left: ${theme.spacing.md};
  box-shadow: none;
  overflow: hidden;
  position: relative;

  /* Адаптивность для мобильных устройств */
  @media (max-width: 1024px) {
    height: auto;
    flex: 1;
    border-radius: 0;
    margin-left: 0;
    margin-top: ${theme.spacing.md};
  }
`;

const ChatHeader = styled.div`
  background: transparent !important; /* Принудительно прозрачный */
  color: rgba(255, 255, 255, 0.8);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: none;
  box-shadow: none;
  
`;

const HeaderContent = styled.div`
  flex: 1;
  text-align: center;
`;

const Title = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  color: rgba(255, 255, 255, 0.9);
  text-shadow: none;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  font-size: ${theme.fontSize.sm};
  opacity: 0.9;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: none;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
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
  background: rgba(22, 33, 62, 0.2);
  backdrop-filter: blur(5px);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: none;
  
  &:hover {
    background: rgba(22, 33, 62, 0.3);
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: none;
    transform: translateY(-1px);
    color: rgba(255, 255, 255, 1);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: none;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(22, 33, 62, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;

const ChatMessagesArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* Важно для flex-элементов */
  background: transparent !important; /* Принудительно прозрачный */
  position: relative;
`;

const ChatContentWrapper = styled.div`
  flex: 1;
  display: flex;
  gap: ${theme.spacing.lg};
  min-height: 0;

  @media (max-width: 1280px) {
    flex-direction: column;
  }
`;

const PaidAlbumPanel = styled.div`
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: rgba(22, 33, 62, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  box-shadow: ${theme.colors.shadow.card};

  @media (max-width: 1480px) {
    width: 280px;
    min-width: 280px;
  }

  @media (max-width: 1280px) {
    width: 100%;
    min-width: 0;
    order: -1;
  }
`;

const PaidAlbumTitle = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.sm};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PaidAlbumDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.6;
`;

const PaidAlbumBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  background: rgba(139, 92, 246, 0.15);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
`;

const PaidAlbumButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: ${theme.transition.fast};
  border: 1px solid transparent;
  margin-bottom: ${theme.spacing.md};

  ${({ $variant }) =>
    $variant === 'secondary'
      ? `
        background: transparent;
        border-color: rgba(255, 255, 255, 0.12);
        color: ${theme.colors.text.secondary};

        &:hover {
          border-color: ${theme.colors.accent.primary};
          color: ${theme.colors.text.primary};
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

const PaidAlbumInfo = styled.div`
  font-size: ${theme.fontSize.xs};
  color: ${theme.colors.text.muted};
  line-height: 1.6;
  margin-top: ${theme.spacing.sm};
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
  background: rgba(10, 15, 25, 0.8);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const UpgradeModal = styled.div`
  width: min(480px, 92vw);
  background: rgba(17, 24, 39, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.55);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const UpgradeModalTitle = styled.h3`
  margin: 0;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
`;

const UpgradeModalText = styled.p`
  margin: 0;
  color: ${theme.colors.text.secondary};
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
}

interface Character {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  avatar?: string;
}

interface UserInfo {
  id: number;
  username: string;
  coins: number;
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
  subscriptionType?: 'free' | 'standard' | 'premium';
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<Character>(
    initialCharacter || {
      id: 'anna',
      name: 'Anna',
      description: 'Дружелюбный помощник с теплым характером'
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [modelInfo, setModelInfo] = useState<string>('Загрузка...');
  const [characterSituation, setCharacterSituation] = useState<string | null>(null);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [creatorInfo, setCreatorInfo] = useState<{ id: number; username: string | null; avatar_url: string | null } | null>(null);
  const [paidAlbumStatus, setPaidAlbumStatus] = useState<PaidAlbumStatus | null>(null);
  const [isUnlockingAlbum, setIsUnlockingAlbum] = useState(false);
  const [paidAlbumError, setPaidAlbumError] = useState<string | null>(null);
  const messageProgressIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const messageProgressValues = useRef<Record<string, number>>({});
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const normalizedSubscriptionType = useMemo<'free' | 'standard' | 'premium'>(() => {
    const normalized = subscriptionType.toLowerCase();
    if (normalized === 'standard' || normalized === 'premium') {
      return normalized;
    }
    return 'free';
  }, [subscriptionType]);

  const canCreatePaidAlbum = normalizedSubscriptionType !== 'free';

  const updateMessageProgressContent = useCallback((messageId: string, value: number) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId && !msg.imageUrl
          ? { ...msg, content: `Генерация изображения... ${value}%` }
          : msg
      )
    );
  }, []);

