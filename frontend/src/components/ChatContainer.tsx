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
import { GlobalHeader } from './GlobalHeader';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { authManager } from '../utils/auth';
import { FiUnlock, FiLock, FiImage } from 'react-icons/fi';
import { CharacterCard } from './CharacterCard';
import { API_CONFIG } from '../config/api';

const PAID_ALBUM_COST = 200;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #151515 100%);
  background-attachment: fixed;

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
  background: transparent;
  border: none;
  border-radius: 0;
  margin-left: 0;
  box-shadow: none;
  overflow: hidden;
  position: relative;

  /* Адаптивность для мобильных устройств */
  @media (max-width: 1024px) {
    height: auto;
    flex: 1;
    border-radius: 0;
    margin-left: 0;
    margin-top: 0;
  }
`;

const ChatHeader = styled.div`
  background: linear-gradient(180deg, rgba(30, 30, 30, 0.95) 0%, rgba(25, 25, 25, 0.9) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* Важно для flex-элементов */
  background: transparent;
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

const CharacterCardWrapper = styled.div`
  width: 100%;
  margin-top: ${theme.spacing.xl};
  padding-top: ${theme.spacing.xl};
  border-top: 1px solid rgba(150, 150, 150, 0.2);
  display: flex;
  justify-content: center;
  
  /* Ограничиваем ширину карточки как на главной странице (minmax(200px, 1fr)) */
  > * {
    width: 200px;
    max-width: 200px;
    min-width: 200px;
  }
`;

const PaidAlbumPanel = styled.div`
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

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

const PaidAlbumBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  background: rgba(60, 60, 60, 0.5);
  color: rgba(200, 200, 200, 1);
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
  transition: all 0.3s ease;
  border: 1px solid transparent;
  margin-bottom: ${theme.spacing.md};

  ${({ $variant }) =>
    $variant === 'secondary'
      ? `
        background: rgba(60, 60, 60, 0.8);
        border-color: rgba(150, 150, 150, 0.3);
        color: rgba(200, 200, 200, 1);

        &:hover {
          border-color: rgba(180, 180, 180, 0.5);
          color: rgba(240, 240, 240, 1);
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
  subscriptionType?: 'free' | 'base' | 'standard' | 'premium';
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
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    initialCharacter || null
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
  const [fetchedSubscriptionType, setFetchedSubscriptionType] = useState<string>('free');
  const [characterPhotos, setCharacterPhotos] = useState<string[]>([]);
  const [isCharacterFavorite, setIsCharacterFavorite] = useState<boolean>(false);

  // Загружаем тип подписки из API
  useEffect(() => {
    const loadSubscriptionType = async () => {
      if (!isAuthenticated) {
        setFetchedSubscriptionType('free');
        return;
      }

      try {
        const token = authManager.getToken();
        if (!token) {
          setFetchedSubscriptionType('free');
          return;
        }

        const response = await fetch('http://localhost:8000/api/v1/profit/stats/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
      const statsData = await response.json();
      const subType = statsData?.subscription_type || 'free';
      setFetchedSubscriptionType(subType);
        } else {
          setFetchedSubscriptionType('free');
        }
      } catch (error) {
        console.error('[CHAT] Ошибка загрузки типа подписки:', error);
        setFetchedSubscriptionType('free');
      }
    };

    loadSubscriptionType();
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
  

  const updateMessageProgressContent = useCallback((messageId: string, value: number) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId && !msg.imageUrl
          ? { ...msg, content: `Генерация изображения... ${value}%` }
          : msg
      )
    );
  }, []);

  const startFakeMessageProgress = useCallback((messageId: string) => {
    const existingInterval = messageProgressIntervals.current[messageId];
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    messageProgressValues.current[messageId] = 0;
    updateMessageProgressContent(messageId, 0);
    messageProgressIntervals.current[messageId] = setInterval(() => {
      const current = messageProgressValues.current[messageId] ?? 0;
      const next = Math.min(current + 1, 99);
      messageProgressValues.current[messageId] = next;
      updateMessageProgressContent(messageId, next);
    }, 300);
  }, [updateMessageProgressContent]);

  const stopFakeMessageProgress = useCallback((messageId: string, immediate = false) => {
    const interval = messageProgressIntervals.current[messageId];
    if (interval) {
      clearInterval(interval);
      delete messageProgressIntervals.current[messageId];
    }
    delete messageProgressValues.current[messageId];
    if (!immediate) {
      updateMessageProgressContent(messageId, 100);
    }
  }, [updateMessageProgressContent]);

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
      console.error('Ошибка получения статуса платного альбома:', error);
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
    }
    notifyUsageUpdate();
    if (currentCharacter?.name) {
      fetchPaidAlbumStatus(currentCharacter.name);
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
    
    loadModelInfo();
    loadCharacterData(currentCharacter.name);
    loadChatHistory(currentCharacter.name); // Загружаем историю чатов при инициализации
  }, []);

  useEffect(() => {
    if (!currentCharacter?.name) {
      setPaidAlbumStatus(null);
      return;
    }

    if (isAuthenticated) {
      fetchPaidAlbumStatus(currentCharacter.name);
    } else {
      setPaidAlbumStatus(null);
    }
  }, [currentCharacter?.name, isAuthenticated, fetchPaidAlbumStatus, balanceRefreshTrigger]);

  // Загружаем состояние избранного при изменении персонажа или авторизации
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!currentCharacter?.id || !isAuthenticated) {
        console.log('[FAVORITE] Skipping favorite check - no character id or not authenticated', {
          hasId: !!currentCharacter?.id,
          isAuthenticated,
          characterId: currentCharacter?.id
        });
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
            console.warn('[FAVORITE] Invalid character id format:', currentCharacter.id);
            setIsCharacterFavorite(false);
            return;
          }
        } else {
          console.warn('[FAVORITE] Unknown character id type:', typeof currentCharacter.id);
          setIsCharacterFavorite(false);
          return;
        }
        
        console.log('[FAVORITE] Checking favorite status for character id:', characterId);
        const favoriteResponse = await authManager.fetchWithAuth(
          API_CONFIG.CHECK_FAVORITE(characterId)
        );
        if (favoriteResponse.ok) {
          const favoriteData = await favoriteResponse.json();
          const isFavorite = favoriteData?.is_favorite || false;
          console.log('[FAVORITE] Favorite status loaded:', isFavorite);
          setIsCharacterFavorite(isFavorite);
        } else {
          console.warn('[FAVORITE] Failed to check favorite status:', favoriteResponse.status);
          setIsCharacterFavorite(false);
        }
      } catch (error) {
        console.error('[FAVORITE] Error checking favorite status:', error);
        setIsCharacterFavorite(false);
      }
    };

    loadFavoriteStatus();
  }, [currentCharacter?.id, isAuthenticated]);

  useEffect(() => {
    return () => {
      Object.values(messageProgressIntervals.current).forEach(clearInterval);
      messageProgressIntervals.current = {};
      messageProgressValues.current = {};
    };
  }, []);

  const checkAuth = async (): Promise<UserInfo | null> => {
    try {
      const token = authManager.getToken();
      if (!token) {
        // Нет токена - пользователь не авторизован
        setIsAuthenticated(false);
        setUserInfo(null);
        return null;
      }

      // Проверяем токен через API
      const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
      
      if (response.ok) {
        const userData = await response.json();
        const info: UserInfo = {
          id: userData.id,
          username: userData.username || 'Пользователь',
          coins: userData.coins || 0
        };
        setUserInfo(info);
        setIsAuthenticated(true);
        return info;
      } else {
        // Токен недействителен
        authManager.clearTokens();
        setIsAuthenticated(false);
        setUserInfo(null);
        return null;
      }
    } catch (error) {
      // Только логируем ошибку, не показываем в консоли для неавторизованных пользователей
      if (authManager.getToken()) {
        console.error('Ошибка проверки авторизации:', error);
      }
      authManager.clearTokens();
      setIsAuthenticated(false);
      setUserInfo(null);
      return null;
    }
  };

  const loadModelInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/models/');
      if (response.ok) {
        const models = await response.json();
        setModelInfo(`${models.length} модель(ей) доступно`);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о моделях:', error);
      setModelInfo('Информация недоступна');
    }
  };

  const loadCharacterData = async (characterIdentifier: string) => {
    try {
      const safeIdentifier = encodeURIComponent(characterIdentifier);
      const response = await fetch(`http://localhost:8000/api/v1/characters/${safeIdentifier}/with-creator`);
      if (response.ok) {
        const characterData = await response.json();
        const situation = extractRolePlayingSituation(characterData.prompt || '');
        setCharacterSituation(situation);
        
        // Обновляем currentCharacter с полными данными, включая id
        // Преобразуем id в строку, если он число (для совместимости с интерфейсом Character)
        const characterId = characterData.id 
          ? (typeof characterData.id === 'number' ? characterData.id.toString() : characterData.id)
          : currentCharacter?.id;
        
        console.log('[LOAD_CHARACTER_DATA] Updating currentCharacter with id:', characterData.id, 'converted to:', characterId);
        
        if (currentCharacter) {
          const updatedCharacter = {
            ...currentCharacter,
            id: characterId || currentCharacter.id,
            name: characterData.name || currentCharacter.name,
            display_name: characterData.display_name || characterData.name || currentCharacter.display_name,
            description: characterData.description || currentCharacter.description,
            avatar: characterData.avatar || currentCharacter.avatar,
            user_id: characterData.user_id || (currentCharacter as any).user_id,
            character_appearance: characterData.character_appearance || '',
            location: characterData.location || ''
          };
          console.log('[LOAD_CHARACTER_DATA] Setting currentCharacter with id:', updatedCharacter.id);
          setCurrentCharacter(updatedCharacter);
        }
        
        // Загружаем состояние избранного сразу после получения id
        if (characterData.id && isAuthenticated) {
          try {
            const favoriteCharacterId = typeof characterData.id === 'number' 
              ? characterData.id 
              : parseInt(characterData.id, 10);
            
            if (!isNaN(favoriteCharacterId)) {
              console.log('[LOAD_CHARACTER_DATA] Loading favorite status for id:', favoriteCharacterId);
              const favoriteResponse = await authManager.fetchWithAuth(
                API_CONFIG.CHECK_FAVORITE(favoriteCharacterId)
              );
              if (favoriteResponse.ok) {
                const favoriteData = await favoriteResponse.json();
                const isFavorite = favoriteData?.is_favorite || false;
                console.log('[LOAD_CHARACTER_DATA] Favorite status loaded:', isFavorite);
                setIsCharacterFavorite(isFavorite);
              } else {
                console.warn('[LOAD_CHARACTER_DATA] Failed to load favorite status:', favoriteResponse.status);
                setIsCharacterFavorite(false);
              }
            } else {
              console.warn('[LOAD_CHARACTER_DATA] Invalid character id for favorite check:', characterData.id);
              setIsCharacterFavorite(false);
            }
          } catch (error) {
            console.error('[LOAD_CHARACTER_DATA] Error checking favorite status:', error);
            setIsCharacterFavorite(false);
          }
        } else {
          console.log('[LOAD_CHARACTER_DATA] Skipping favorite check - no id or not authenticated', {
            hasId: !!characterData.id,
            isAuthenticated
          });
          setIsCharacterFavorite(false);
        }
        
        // Сохраняем информацию о создателе
        if (characterData.creator_info) {
          
          // Сохраняем информацию о создателе, даже если username null
          // (пользователь может еще не установить username после OAuth входа)
          setCreatorInfo(characterData.creator_info);
        } else {
          console.log('[CHAT] No creator info in response');
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
              console.error('Error parsing main_photos:', e);
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
        console.warn(`Не удалось загрузить данные персонажа ${characterIdentifier}`);
        setCharacterSituation(null);
        setCreatorInfo(null);
        setCharacterPhotos([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных персонажа:', error);
      setCharacterSituation(null);
      setCreatorInfo(null);
      setCharacterPhotos([]);
    }
  };

  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [imagePromptInput, setImagePromptInput] = useState('');

  const handleGenerateImage = async (userPrompt?: string) => {
    // Если промпт не передан - открываем модалку
    if (!userPrompt) {
      // Предзаполняем промпт из базы
      const appearance = (currentCharacter as any)?.character_appearance || '';
      const location = (currentCharacter as any)?.location || '';
      const defaultPrompt = `${appearance} ${location}`.trim() || 'portrait, high quality, detailed';
      setImagePromptInput(defaultPrompt);
      setIsImagePromptModalOpen(true);
      return;
    }
    
    const trimmedPrompt = userPrompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    // Защита от дублирования запросов
    if (isGeneratingImage) {
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

    const assistantMessageId = `image-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: 'Генерация изображения... 0%',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    startFakeMessageProgress(assistantMessageId);
    setIsLoading(true);
    setIsGeneratingImage(true);
    setError(null);

    let generationFailed = false;

    try {
      const requestBody = {
        prompt: trimmedPrompt,
        character: currentCharacter.name,
        use_default_prompts: true,
        user_id: userInfo?.id
        // Размеры берутся из generation_defaults.py (768x1344)
      };

      const response = await fetch('/api/v1/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка генерации изображения');
      }

      const data = await response.json();
      console.log('[CHAT] Ответ от API генерации:', data);
      console.log('[CHAT] Доступные ключи в ответе:', Object.keys(data));
      
      // Проверяем, пришел ли синхронный ответ с URL или асинхронный с task_id
      let generatedImageUrl = data.cloud_url || data.image_url;
      
      // Если пришел task_id, опрашиваем статус до получения изображения
      if (!generatedImageUrl && data.task_id) {
        console.log('[CHAT] Получен task_id, начинаем опрос статуса:', data.task_id);
        const statusUrl = data.status_url || `/api/v1/generation-status/${data.task_id}`;
        
        // Опрашиваем статус с интервалом
        const maxAttempts = 120; // Максимум 2 минуты (120 * 1 секунда)
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Ждем 1 секунду
          
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
            console.log('[CHAT] Статус генерации:', statusData.status);
            console.log('[CHAT] Полный ответ статуса:', JSON.stringify(statusData, null, 2));
            
            if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
              // URL может быть в result.image_url, result.cloud_url или напрямую в statusData
              const result = statusData.result || {};
              generatedImageUrl = result.image_url || result.cloud_url || statusData.image_url || statusData.cloud_url;
              
              console.log('[CHAT] Извлеченный URL из result:', result.image_url || result.cloud_url);
              console.log('[CHAT] Извлеченный URL из statusData:', statusData.image_url || statusData.cloud_url);
              console.log('[CHAT] Финальный URL:', generatedImageUrl);
              
              if (generatedImageUrl) {
                console.log('[CHAT] Изображение готово:', generatedImageUrl);
                break;
              } else {
                console.warn('[CHAT] URL не найден в ответе, продолжаем опрос...');
              }
            } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
              throw new Error(statusData.message || statusData.error || 'Ошибка генерации изображения');
            }
            
            // Обновляем прогресс на основе статуса
            if (statusData.progress !== undefined) {
              const progressValue = Math.min(statusData.progress, 99);
              updateMessageProgressContent(assistantMessageId, progressValue);
            }
            
            attempts++;
          } catch (error) {
            console.error('[CHAT] Ошибка при проверке статуса:', error);
            throw error;
          }
        }
        
        if (!generatedImageUrl) {
          throw new Error('Превышено время ожидания генерации изображения');
        }
      }

      if (!generatedImageUrl) {
        console.error('[CHAT] ОШИБКА: URL изображения не найден в ответе!');
        console.error('[CHAT] Полный ответ:', JSON.stringify(data, null, 2));
        throw new Error('Не удалось получить изображение');
      }

      stopFakeMessageProgress(assistantMessageId, true);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: '',
                imageUrl: generatedImageUrl
              }
            : msg
        )
      );

      // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
      try {
        const token = authManager.getToken();
        if (token) {
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
            console.log('[CHAT] Фото добавлено в галерею пользователя и будет видно в /history');
          }
        }
      } catch (galleryError) {
        console.warn('[CHAT] Не удалось добавить фото в галерею:', galleryError);
      }

      if (isAuthenticated) {
        await refreshUserStats();
      }
    } catch (error) {
      generationFailed = true;
      stopFakeMessageProgress(assistantMessageId, true);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка генерации изображения';
      setError(errorMessage);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      setIsGeneratingImage(false);
      if (generationFailed) {
        stopFakeMessageProgress(assistantMessageId, true);
      }
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

    // Отправляем обычное сообщение без изображения
    await sendChatMessage(message, false);
  };

  // Функция перевода текста с русского на английский
  const translateToEnglish = async (text: string): Promise<string> => {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Проверяем, содержит ли текст русские буквы
    const hasRussian = /[а-яА-ЯёЁ]/.test(text);
    if (!hasRussian) {
      // Если нет русских букв, возвращаем как есть
      return text;
    }

    try {
      // Используем бесплатный API перевода (MyMemory Translation API)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`
      );
      
      if (!response.ok) {
        console.warn('[TRANSLATE] Ошибка перевода, используем оригинальный текст');
        return text;
      }
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        console.log('[TRANSLATE] Переведено:', text.substring(0, 50), '->', translated.substring(0, 50));
        return translated;
      } else {
        console.warn('[TRANSLATE] Перевод не получен, используем оригинальный текст');
        return text;
      }
    } catch (error) {
      console.error('[TRANSLATE] Ошибка перевода:', error);
      // В случае ошибки возвращаем оригинальный текст
      return text;
    }
  };

  const sendChatMessage = async (message: string, generateImage: boolean = false) => {
    // Разрешаем пустое сообщение, если запрашивается генерация фото
    // Фото = текст для истории чата
    if (!message.trim() && !generateImage) return;

    // Убеждаемся, что characterPhotos загружены перед отправкой сообщения
    if (currentCharacter && (!characterPhotos || characterPhotos.length === 0)) {
      await loadCharacterData(currentCharacter.name);
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

    // Сохраняем оригинальное сообщение для отображения пользователю
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: originalMessage, // Показываем оригинальный текст пользователю
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Создаем пустое сообщение ассистента для стриминга
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Переводим сообщение с русского на английский перед отправкой модели
      const translatedMessage = await translateToEnglish(originalMessage);
      console.log('[CHAT] Оригинальное сообщение:', originalMessage.substring(0, 100));
      console.log('[CHAT] Переведенное сообщение:', translatedMessage.substring(0, 100));

      // Используем /chat эндпоинт который поддерживает генерацию изображений
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const authToken = authManager.getToken();
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: translatedMessage, // Отправляем переведенное сообщение модели
          character: currentCharacter.name,
          generate_image: generateImage,
          user_id: effectiveUserId,
          image_prompt: generateImage ? translatedMessage : undefined // Используем переведенный промпт для генерации изображения
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка отправки сообщения');
      }

      // Обрабатываем обычный JSON ответ
      const data = await response.json();
      
      if (data.response) {
        // Обновляем сообщение ассистента с полным ответом и изображением (если есть)
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: data.response,
                imageUrl: data.image_url || data.cloud_url || undefined
              }
            : msg
        ));
        
        setIsLoading(false);
      } else {
        throw new Error('Некорректный ответ от сервера');
      }

      // Обновляем информацию о пользователе после отправки сообщения
      if (isAuthenticated) {
        await refreshUserStats();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
      // Удаляем пустое сообщение ассистента в случае ошибки
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatHistory = async (characterName: string) => {
    try {
      console.log(`Loading chat history for character: ${characterName}`);
      const token = authManager.getToken();
      const response = await fetch(`http://localhost:8000/api/v1/characters/${characterName}/chat-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history loaded:', data);

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
              console.log('[HISTORY] Сообщение с фото:', {
                id: msg.id,
                hasImageUrl: !!imageUrl,
                originalContent: rawContent.substring(0, 100),
                finalContent: finalContent,
                willRenderImageOnly: !finalContent || finalContent.trim() === ''
              });
            }

            return {
              id: msg.id.toString(),
              type: msg.type === 'assistant' ? 'assistant' : 'user',
              content: finalContent,
              timestamp: new Date(msg.timestamp),
              imageUrl: imageUrl
            };
          });
          
          setMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} messages from history`);
        } else {
          setMessages([]);
          console.log('No chat history found');
        }
      } else {
        console.error('Failed to load chat history:', response.status);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([]);
    }
  };

  const handleCharacterSelect = (character: Character) => {
    console.log('[CHARACTER SELECT] Выбран персонаж:', character.name);
    setCurrentCharacter(character);
    setMessages([]); // Очищаем историю при смене персонажа
    loadCharacterData(character.name); // Загружаем данные нового персонажа
    loadChatHistory(character.name); // Загружаем историю чатов с новым персонажем
    fetchPaidAlbumStatus(character.name);
  };

  // Обновляем персонажа если изменился initialCharacter
  useEffect(() => {
    if (initialCharacter) {
      console.log('[CHARACTER UPDATE] Обновление персонажа из props:', initialCharacter.name);
      setCurrentCharacter(initialCharacter);
      loadCharacterData(initialCharacter.name);
      loadChatHistory(initialCharacter.name);
      fetchPaidAlbumStatus(initialCharacter.name);
    }
  }, [initialCharacter?.name, fetchPaidAlbumStatus]);

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
      if (currentCharacter?.name) {
        fetchPaidAlbumStatus(currentCharacter.name);
      }
    } else {
      // Если checkAuth не сработал, устанавливаем состояние вручную
      console.warn('[AUTH] checkAuth вернул null, но токены сохранены');
      setIsAuthenticated(true);
    }
  };

  const handleOpenPaidAlbumView = () => {
    if (!currentCharacter) {
      return;
    }

    if (normalizedSubscriptionType === 'free' && !paidAlbumStatus?.unlocked) {
      setPaidAlbumError('Откройте доступ к альбому, оплатив 200 кредитов, или оформите подписку Standard/Premium.');
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
      setIsUpgradeModalOpen(true);
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
        console.log('[CHAT] Получен обновленный баланс из ответа:', data.coins);
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
      
      await fetchPaidAlbumStatus(currentCharacter.name);
      handleOpenPaidAlbumView();
    } catch (error) {
      console.error('Ошибка разблокировки платного альбома:', error);
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
      // Получаем текущие фото из платного альбома
      const currentPhotosResponse = await fetch(
        `http://localhost:8000/api/v1/paid-gallery/${characterName}`,
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
        `http://localhost:8000/api/v1/paid-gallery/${characterName}/photos`,
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

      // Обновляем статус альбома
      await fetchPaidAlbumStatus(characterName);
      
      console.log('[CHAT] Фото успешно добавлено в платный альбом');
    } catch (error) {
      console.error('[CHAT] Ошибка при добавлении фото в альбом:', error);
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
        'http://localhost:8000/api/v1/auth/user-gallery/add/',
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
      console.error('[CHAT] Ошибка при добавлении фото в галерею:', error);
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
        console.log('Неизвестное действие:', action);
    }
  };

  const clearChat = async () => {
    try {
      if (!currentCharacter) return;
      
      console.log(`Clearing chat history for character: ${currentCharacter.name}`);

      const token = authManager.getToken();
      if (!token) {
        console.error('No token available');
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
        console.log('Chat history cleared:', data);
        
        // Очищаем локальное состояние
        setMessages([]);
        setError(null);
        
        // Диспатчим событие для обновления страницы истории
        // Используем name (как возвращается из API истории), а не display_name
        const characterName = currentCharacter.name;
        console.log('[CHAT] Отправляем событие очистки истории для:', characterName, 'display_name:', currentCharacter.display_name);
        window.dispatchEvent(new CustomEvent('chat-history-cleared', {
          detail: { characterName: characterName }
        }));
        
      } else {
        console.error('Failed to clear chat history:', response.status);
        // Все равно очищаем локальное состояние
        setMessages([]);
        setError(null);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
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

  // Если персонаж не загружен, показываем только загрузку
  if (!currentCharacter) {
  return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        width: '100vw',
        background: 'rgba(20, 20, 20, 1)'
      }}>
        <LoadingSpinner size="lg" text="Загрузка персонажа..." />
      </div>
    );
  }

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
          onProfile={onOwnProfile}
          onBalance={() => alert('Баланс пользователя')}
          refreshTrigger={balanceRefreshTrigger}
        />
        
        <ChatContentWrapper>
          <ChatMessagesArea>
            <ChatArea 
              messages={messages}
              isLoading={isLoading}
              isGeneratingImage={isGeneratingImage}
              characterSituation={characterSituation ?? undefined}
              characterName={currentCharacter?.name}
              characterAvatar={characterPhotos && characterPhotos.length > 0 ? characterPhotos[0] : undefined}
              isCharacterOwner={paidAlbumStatus?.is_owner ?? false}
              isAuthenticated={isAuthenticated}
              onAddToPaidAlbum={handleAddToPaidAlbum}
              onAddToGallery={handleAddToGallery}
              creatorInfo={creatorInfo}
            />
            
            {error && (
              <ErrorMessage 
                message={error}
                onClose={() => setError(null)}
              />
            )}
            
            <MessageInput 
              onSendMessage={handleSendMessage}
              onGenerateImage={() => {
                // Открываем модалку с предзаполненным промптом
                const appearance = (currentCharacter as any)?.character_appearance || '';
                const location = (currentCharacter as any)?.location || '';
                const defaultPrompt = `${appearance} ${location}`.trim() || 'portrait, high quality, detailed';
                setImagePromptInput(defaultPrompt);
                setIsImagePromptModalOpen(true);
              }}
              onClearChat={clearChat}
              onTipCreator={() => {
                console.log('[TIP BUTTON] Нажата кнопка благодарности');
                console.log('[TIP BUTTON] Текущий персонаж name:', currentCharacter.name);
                console.log('[TIP BUTTON] Текущий персонаж полностью:', currentCharacter);
                if (!isAuthenticated) {
                  console.log('[TIP BUTTON] Пользователь не авторизован - показываем AuthModal');
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                } else {
                  console.log('[TIP BUTTON] Пользователь авторизован - открываем TipModal');
                  setIsTipModalOpen(true);
                }
              }}
              disabled={isLoading || isGeneratingImage}
              placeholder={`Напишите сообщение ${currentCharacter.name}...`}
              hasMessages={messages.length > 0}
            />
          </ChatMessagesArea>

          <PaidAlbumPanel>
            <PaidAlbumTitle>
              Разблокируйте обнажённые фото {albumCharacterName}
            </PaidAlbumTitle>
            <PaidAlbumBadge>
              <FiImage size={16} />
              Стоимость: {PAID_ALBUM_COST} кредитов
            </PaidAlbumBadge>
            <PaidAlbumDescription>
              Доступ к эксклюзивному альбому персонажа. После разблокировки фотографии будут доступны всегда.
            </PaidAlbumDescription>

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
                    console.log('[CHAT] Opening profile for creator:', creatorInfo.id);
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
              const isOwnerByCharacter = currentCharacter?.user_id && userInfo && currentCharacter.user_id === userInfo.id;
              const isOwner = paidAlbumStatus?.is_owner || isOwnerByCreatorInfo || isOwnerByCharacter;
              
              
              // ПРИОРИТЕТ 1: Если пользователь является создателем
              if (isOwner) {
                // Если есть подписка STANDARD/PREMIUM - показываем кнопку "Расширить альбом"
                if (canCreatePaidAlbum) {
                  return (
                    <>
                      {isPaidAlbumUnlocked && (
                <PaidAlbumButton onClick={handleOpenPaidAlbumView}>
                  <FiUnlock />
                  Открыть альбом
                </PaidAlbumButton>
                      )}
                      <PaidAlbumButton 
                        $variant={isPaidAlbumUnlocked ? "secondary" : undefined}
                        onClick={handleOpenPaidAlbumBuilderView}
                      >
                    <FiImage />
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
                          onClick={handleOpenPaidAlbumView}
                        >
                          <FiUnlock />
                          Открыть
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
                        $variant="secondary"
                        onClick={() => setIsUpgradeModalOpen(true)}
                      >
                        <FiImage />
                        Расширить альбом
                      </PaidAlbumButton>
                      <PaidAlbumInfo>
                        Для создания платного альбома нужна подписка Standard или Premium.
                      </PaidAlbumInfo>
                      {paidAlbumError && <PaidAlbumError>{paidAlbumError}</PaidAlbumError>}
                    </>
                  );
                }
                
                // Для FREE подписки показываем обычную кнопку разблокировки и ниже "Расширить альбом"
                // Для PREMIUM показываем "Открыть" вместо "Разблокировать"
                return (
                  <>
                    {isPaidAlbumUnlocked || normalizedSubscriptionType === 'premium' ? (
                      <PaidAlbumButton
                        onClick={handleOpenPaidAlbumView}
                      >
                        <FiUnlock />
                        Открыть
                      </PaidAlbumButton>
                    ) : (
                      <PaidAlbumButton
                        onClick={handleUnlockPaidAlbum}
                        disabled={isUnlockingAlbum || userCoins < PAID_ALBUM_COST}
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
                      $variant="secondary"
                      onClick={() => setIsUpgradeModalOpen(true)}
                    >
                      <FiImage />
                      Расширить альбом
                    </PaidAlbumButton>
                    <PaidAlbumInfo>
                      Доступно кредитов: {userCoins}. Разблокировка за 200 кредитов.
                    </PaidAlbumInfo>
                    <PaidAlbumInfo>
                      Для создания платного альбома нужна подписка Standard или Premium.
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
                {isPaidAlbumUnlocked || normalizedSubscriptionType === 'premium' ? (
                  <PaidAlbumButton
                    onClick={handleOpenPaidAlbumView}
                  >
                    <FiUnlock />
                    Открыть
                  </PaidAlbumButton>
                ) : (
                  <PaidAlbumButton
                    onClick={handleUnlockPaidAlbum}
                    disabled={isUnlockingAlbum || userCoins < PAID_ALBUM_COST}
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
                      $variant="secondary"
                      onClick={() => {
                        if (canCreatePaidAlbum) {
                          handleOpenPaidAlbumBuilderView();
                        } else {
                          setIsUpgradeModalOpen(true);
                        }
                      }}
                    >
                      <FiImage />
                      Расширить альбом
                    </PaidAlbumButton>
                  )}
                <PaidAlbumInfo>
                 Доступно кредитов: {userCoins}. Разблокировка за 200 кредитов.
                </PaidAlbumInfo>
                  {isOwner && !canCreatePaidAlbum && (
                  <PaidAlbumInfo>
                    Для создания платного альбома нужна подписка Standard или Premium.
                  </PaidAlbumInfo>
                )}
                {paidAlbumError && <PaidAlbumError>{paidAlbumError}</PaidAlbumError>}
              </>
              );
            })()}
            
            {/* Карточка персонажа внизу панели */}
            {currentCharacter && (
              <CharacterCardWrapper>
                <CharacterCard
                  character={{
                    id: currentCharacter.id,
                    name: currentCharacter.name,
                    display_name: currentCharacter.display_name || currentCharacter.name,
                    description: currentCharacter.description || '',
                    avatar: currentCharacter.avatar || currentCharacter.name.charAt(0).toUpperCase(),
                    photos: characterPhotos,
                    tags: [],
                    author: creatorInfo?.username || 'Unknown',
                    likes: 0,
                    views: 0,
                    comments: 0
                  }}
                  onClick={() => {}}
                  isAuthenticated={isAuthenticated}
                  isFavorite={isCharacterFavorite}
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
                        console.error('Error updating favorite status:', error);
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
          </PaidAlbumPanel>
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
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            background: 'rgba(20, 20, 25, 0.85)',
            backdropFilter: 'blur(20px)',
            padding: '2rem',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '90%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.5rem' }}>
              Генерация фото персонажа
            </h3>
            <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Стоимость: 30 монет. Опишите желаемое изображение или отредактируйте предзаполненный промпт.
            </p>
            <textarea
              value={imagePromptInput}
              onChange={(e) => setImagePromptInput(e.target.value)}
              placeholder="Опишите желаемое изображение..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '1rem',
                background: 'rgba(15, 15, 20, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                resize: 'vertical',
                marginBottom: '1.5rem',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  if (imagePromptInput.trim()) {
                    setIsImagePromptModalOpen(false);
                    handleGenerateImage(imagePromptInput);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(100, 100, 110, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(120, 120, 130, 1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 100, 110, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Сгенерировать
              </button>
              <button
                onClick={() => setIsImagePromptModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(80, 80, 80, 0.8)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100, 100, 100, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(80, 80, 80, 0.8)'}
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
          onModeChange={setAuthMode}
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
            console.log('[TIP MODAL] Закрытие модалки. Текущий персонаж:', currentCharacter.name);
            console.log('[TIP MODAL] currentCharacter полностью:', currentCharacter);
            setIsTipModalOpen(false);
          }}
          characterName={currentCharacter.name}
          characterDisplayName={currentCharacter.display_name || currentCharacter.name}
          userBalance={userInfo.coins}
          onSuccess={(newBalance, amount) => {
            // Обновляем локальный баланс
            setUserInfo({ ...userInfo, coins: newBalance });
            // Обновляем данные пользователя и подписки
            refreshUserStats();
            // Показываем toast
            setTipAmount(amount);
            setShowSuccessToast(true);
            setIsTipModalOpen(false);
          }}
        />
      )}

      {showSuccessToast && (
        <SuccessToast
          message="Спасибо за поддержку!"
          amount={tipAmount}
          onClose={() => setShowSuccessToast(false)}
          duration={3000}
        />
      )}
    </Container>
  );
};