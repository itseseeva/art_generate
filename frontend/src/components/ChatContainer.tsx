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

const PAID_ALBUM_COST = 200;

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;
  background: rgba(20, 20, 20, 1);

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
  background: rgba(20, 20, 20, 1);
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
  background: rgba(30, 30, 30, 0.8);
  color: rgba(240, 240, 240, 1);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  text-align: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
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
  color: rgba(240, 240, 240, 1);
  text-shadow: none;
  font-family: inherit;
  letter-spacing: 0;
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
  background: rgba(20, 20, 20, 1);
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
        // Сохраняем информацию о создателе
        if (characterData.creator_info) {
          console.log('[CHAT] Creator info loaded:', JSON.stringify(characterData.creator_info, null, 2));
          console.log('[CHAT] Username value:', characterData.creator_info.username);
          console.log('[CHAT] Username type:', typeof characterData.creator_info.username);
          console.log('[CHAT] Username is null?', characterData.creator_info.username === null);
          console.log('[CHAT] Username is undefined?', characterData.creator_info.username === undefined);
          console.log('[CHAT] User ID:', characterData.creator_info.id);
          
          // Сохраняем информацию о создателе, даже если username null
          // (пользователь может еще не установить username после OAuth входа)
          setCreatorInfo(characterData.creator_info);
        } else {
          console.log('[CHAT] No creator info in response');
          setCreatorInfo(null);
        }
      } else {
        console.warn(`Не удалось загрузить данные персонажа ${characterIdentifier}`);
        setCharacterSituation(null);
        setCreatorInfo(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных персонажа:', error);
      setCharacterSituation(null);
      setCreatorInfo(null);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
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
      const generatedImageUrl = data.cloud_url || data.image_url;

      if (!generatedImageUrl) {
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

    // Проверяем авторизацию
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    // Отправляем обычное сообщение без изображения
    await sendChatMessage(message, false);
  };

  const sendChatMessage = async (message: string, generateImage: boolean = false) => {
    if (!message.trim()) return;

    let effectiveUserId = userInfo?.id;
    if (!effectiveUserId) {
      const refreshed = await checkAuth();
      effectiveUserId = refreshed?.id;
      if (!effectiveUserId) {
        setError('Не удалось получить данные пользователя. Повторите попытку входа.');
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
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
          message: message,
          character: currentCharacter.name,
          generate_image: generateImage,
          user_id: effectiveUserId,
          image_prompt: generateImage ? message : undefined
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
            const imageMatch = rawContent.match(/\[image:(.*)\]$/);
            const cleanedContent = rawContent.replace(/\n?\[image:.*\]$/, '').trim();

            return {
              id: msg.id.toString(),
              type: msg.type === 'assistant' ? 'assistant' : 'user',
              content: cleanedContent,
              timestamp: new Date(msg.timestamp),
              imageUrl: imageMatch ? imageMatch[1].trim() : undefined
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

  const handleAuthSuccess = ({ accessToken, refreshToken }: { accessToken: string; refreshToken?: string }) => {
    authManager.setTokens(accessToken, refreshToken);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    setAuthMode('login');
    refreshUserStats(); // Обновляем информацию о пользователе
    if (currentCharacter?.name) {
      fetchPaidAlbumStatus(currentCharacter.name);
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

      await refreshUserStats();
      await fetchPaidAlbumStatus(currentCharacter.name);
      // Диспатчим событие обновления баланса
      window.dispatchEvent(new Event('balance-update'));
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
      
      alert('Фото успешно добавлено в платный альбом');
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

      const headers: HeadersInit = {};
      const token = authManager.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Очищаем историю в базе данных
      const response = await fetch(`http://localhost:8000/api/v1/characters/${currentCharacter.name}/chat-history`, {
        method: 'DELETE',
        headers: Object.keys(headers).length ? headers : undefined
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history cleared:', data);
        
        // Очищаем локальное состояние
        setMessages([]);
        setError(null);
        
        console.log('Chat history cleared successfully');
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
              onGenerateImage={handleGenerateImage}
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
              disabled={isLoading}
              placeholder={`Напишите сообщение ${currentCharacter.name}...`}
              currentCharacter={currentCharacter.name}
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
                      console.log('[CHAT] Calling onProfile with userId:', creatorInfo.id);
                      onProfile(creatorInfo.id);
                    } else {
                      console.log('[CHAT] Using navigate-to-profile event');
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
                      <PaidAlbumButton
                        onClick={handleUnlockPaidAlbum}
                      >
                        <FiLock />
                        Разблокировать
                      </PaidAlbumButton>
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
                return (
                  <>
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
                    <PaidAlbumButton
                      $variant="secondary"
                      onClick={() => setIsUpgradeModalOpen(true)}
                    >
                      <FiImage />
                      Расширить альбом
                    </PaidAlbumButton>
                    <PaidAlbumInfo>
                      Доступно кредитов: {userCoins}. Не хватает? Пополните баланс или оформите подписку, чтобы получать больше монет.
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
              return (
                <>
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
                    Доступно кредитов: {userCoins}. Не хватает? Пополните баланс или оформите подписку, чтобы получать больше монет.
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