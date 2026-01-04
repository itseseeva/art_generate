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
import { ConfirmModal } from './ConfirmModal';
import { GlobalHeader } from './GlobalHeader';
import { PhotoGenerationHelpModal } from './PhotoGenerationHelpModal';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { authManager } from '../utils/auth';
import { translateToEnglish } from '../utils/translate';
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
  background: #0a0a0a;

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
  display: flex !important;
  flex-direction: column;
  background: transparent;
  border: none;
  border-radius: 0;
  margin-left: 0;
  box-shadow: none;
  overflow: hidden;
  position: relative;
  z-index: 1;
  visibility: visible !important;
  opacity: 1 !important;

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
  display: flex !important;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  height: 100%;
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
  height: 100%;
  max-height: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  margin: 0;
  padding: 0;
  visibility: visible !important;
  opacity: 1 !important;
  overflow: hidden;
  width: 100%;

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
  align-items: flex-start;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  padding-left: 0;
  
  /* Ограничиваем ширину карточки как на главной странице (minmax(200px, 1fr)) */
  > *:first-child {
    width: 200px;
    max-width: 200px;
    min-width: 200px;
  }
`;

const GenerationQueueIndicator = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  align-items: center;
  justify-content: center;
  margin: 0 auto;
`;

const QueueBar = styled.div<{ $isFilled: boolean }>`
  width: 8px;
  height: 20px;
  background: ${props => props.$isFilled ? '#FFD700' : 'rgba(150, 150, 150, 0.5)'};
  border-radius: 2px;
  transition: background 0.2s ease;
`;

const QueueLabel = styled.div`
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  text-align: center;
  margin-top: 8px;
  font-weight: 500;
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
  background: rgba(18, 18, 18, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(50, 50, 50, 0.6);
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
    order: -1;
    margin: ${theme.spacing.md};
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
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  margin-bottom: ${theme.spacing.sm};

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
  generationTime?: number; // Время генерации изображения в секундах
}

interface Character {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  avatar?: string;
  raw?: any; // Исходные данные персонажа из API
}

interface UserInfo {
  id: number;
  username: string;
  coins: number;
  avatar_url?: string | null;
  email?: string | null;
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
        console.log(`[DEDUP] Дубликат по URL пропущен: ${normalizedUrl.substring(0, 50)}...`);
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
          console.log(`[DEDUP] Заменено сообщение ${msg.id} на более полную версию`);
        }
      }
    }
    return Array.from(seenIds.values());
  };
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(
    initialCharacter || null
  );
  const isLoadingFromUrlRef = useRef(false); // Флаг для отслеживания загрузки из URL
  
  // Состояние для хранения отредактированного промпта в рамках сессии (для текущего персонажа)
  const [sessionPrompt, setSessionPrompt] = useState<string | null>(null);
  
  // Сбрасываем sessionPrompt при смене персонажа
  useEffect(() => {
    setSessionPrompt(null);
  }, [currentCharacter?.id]);
  const [isLoading, setIsLoading] = useState(false);
  // Очередь активных генераций: Set с ID сообщений, которые генерируются
  const [activeGenerations, setActiveGenerations] = useState<Set<string>>(new Set());
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
  // УДАЛЕНЫ: messageProgressIntervals и messageProgressValues - больше не используем фейковый прогресс
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [fetchedSubscriptionType, setFetchedSubscriptionType] = useState<string>('free');
  const [characterPhotos, setCharacterPhotos] = useState<string[]>([]);
  const [isCharacterFavorite, setIsCharacterFavorite] = useState<boolean>(false);
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

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
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
      console.log('[CHAT INIT] No character available (neither currentCharacter nor initialCharacter)');
      return;
    }
    
    // Если currentCharacter не установлен, но есть initialCharacter, устанавливаем его СРАЗУ
    if (!currentCharacter && initialCharacter) {
      console.log('[CHAT INIT] Setting currentCharacter from initialCharacter:', initialCharacter);
      setCurrentCharacter(initialCharacter);
      // Используем initialCharacter для дальнейшей обработки
      const characterIdentifier = initialCharacter.raw?.name || initialCharacter.name;
    if (!characterIdentifier) {
        console.warn('[CHAT INIT] No character identifier found in initialCharacter');
        return;
      }
      
      // Проверяем, не загружали ли мы уже этого персонажа
      if (lastLoadedCharacterRef.current === characterIdentifier) {
        console.log('[CHAT INIT] Character already loaded, skipping initialization:', characterIdentifier);
        return;
      }
      
      console.log('[CHAT INIT] Инициализация чата с персонажем из initialCharacter:', { 
        name: initialCharacter.name,
        display_name: initialCharacter.display_name,
        rawName: initialCharacter.raw?.name,
        identifier: characterIdentifier
      });
      
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
      console.warn('[CHAT INIT] No character identifier found');
      return;
    }

    // Проверяем, не загружали ли мы уже этого персонажа
    if (lastLoadedCharacterRef.current === characterIdentifier) {
      console.log('[CHAT INIT] Character already loaded, skipping initialization:', characterIdentifier);
      return;
    }
    
    console.log('[CHAT INIT] Инициализация чата с персонажем:', { 
      name: effectiveCharacter.name,
      display_name: effectiveCharacter.display_name,
      rawName: effectiveCharacter.raw?.name,
      identifier: characterIdentifier
    });
    
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
      // УДАЛЕНА очистка фейкового прогресса - больше не используется
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
          coins: userData.coins || 0,
          avatar_url: userData.avatar_url || null,
          email: userData.email || null
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

  const loadModelInfo = useCallback(async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/models/`);
      if (response.ok) {
        const models = await response.json();
        setModelInfo(`${models.length} модель(ей) доступно`);
      }
    } catch (error) {
      console.error('Ошибка загрузки информации о моделях:', error);
      setModelInfo('Информация недоступна');
    }
  }, []);

  // Используем useRef для отслеживания загрузки данных персонажа
  const isLoadingCharacterDataRef = useRef<string | null>(null);

  const loadCharacterData = useCallback(async (characterIdentifier: string) => {
    try {
      // Проверяем, что identifier не пустой
      if (!characterIdentifier || characterIdentifier.trim() === '') {
        console.warn('[LOAD_CHARACTER_DATA] Empty identifier, skipping data load');
        return;
      }
      
      // Проверяем, не загружаем ли мы уже этого персонажа
      if (isLoadingCharacterDataRef.current === characterIdentifier) {
        console.log('[LOAD_CHARACTER_DATA] Already loading this character, skipping:', characterIdentifier);
        return;
      }
      
      isLoadingCharacterDataRef.current = characterIdentifier;
      
      const safeIdentifier = encodeURIComponent(characterIdentifier);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${safeIdentifier}/with-creator`);
      
      if (response.status === 404) {
        console.warn(`[LOAD_CHARACTER_DATA] Персонаж "${characterIdentifier}" не найден (404)`);
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
        
        console.log('[LOAD_CHARACTER_DATA] Updating currentCharacter with id:', characterData.id, 'converted to:', characterId);
        
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
        const hasChanged = 
          currentId !== newId || 
          currentName !== newName || 
          currentRawName !== newRawName ||
          !currentCharacter; // Или если персонаж еще не загружен
        
        if (hasChanged) {
          console.log('[LOAD_CHARACTER_DATA] Setting currentCharacter with id:', updatedCharacter.id, 'name:', updatedCharacter.name, 'raw.name:', updatedCharacter.raw?.name);
          setCurrentCharacter(updatedCharacter);
        } else {
          console.log('[LOAD_CHARACTER_DATA] Character data unchanged, skipping update to avoid infinite loop');
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
        console.warn(`[LOAD_CHARACTER_DATA] Не удалось загрузить данные персонажа ${characterIdentifier}, статус: ${response.status}`);
        const errorText = await response.text().catch(() => 'Неизвестная ошибка');
        setError(`Не удалось загрузить данные персонажа: ${errorText || `Ошибка ${response.status}`}`);
        setCurrentCharacter(null);
        setCharacterSituation(null);
        setCreatorInfo(null);
        setCharacterPhotos([]);
      }
    } catch (error) {
      console.error('[LOAD_CHARACTER_DATA] Error loading character data:', error);
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

  const [isImagePromptModalOpen, setIsImagePromptModalOpen] = useState(false);
  const [isPhotoGenerationHelpModalOpen, setIsPhotoGenerationHelpModalOpen] = useState(false);
  const [imagePromptInput, setImagePromptInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  // Сохраняем отредактированные промпты для каждого персонажа (ключ - имя персонажа)
  // Загружаем из localStorage при инициализации
  const loadPromptsFromStorage = (): Record<string, string> => {
    try {
      const stored = localStorage.getItem('modifiedPrompts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[PROMPT] Ошибка загрузки промптов из localStorage:', e);
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
      console.error('[PROMPT] Ошибка сохранения промптов в localStorage:', e);
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

        // Определяем, нужно ли использовать заглушку (строго первые 8 секунд)
        const startTime = generationStartTimesRef.current.get(messageId);
        const elapsed = startTime ? Date.now() - startTime : 0;
        const placeholderDuration = 8000; // Строго 8 секунд
        const usePlaceholder = elapsed < placeholderDuration;

        // Обновляем прогресс
        if (progressValue !== undefined && !isNaN(progressValue)) {
          updateMessageProgressContent(messageId, progressValue, usePlaceholder);
        } else if (usePlaceholder) {
          updateMessageProgressContent(messageId, 0, true);
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
                    console.log('[STREAM] Фото добавлено в галерею пользователя через pollImageGenerationStatus');
                  }
                }
              } catch (galleryError) {
                console.warn('[STREAM] Не удалось добавить фото в галерею:', galleryError);
              }
              
              break;
            }
        } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
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
          return;
        }

        attempts++;
      } catch (error) {
        console.error('[STREAM] Ошибка при проверке статуса генерации:', error);
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
      
      console.log('[GENERATE_IMAGE] Отправка запроса с моделью:', validModel, 'selectedModel:', selectedModel, 'type:', typeof selectedModel);
      console.log('[GENERATE_IMAGE] Полный requestBody:', JSON.stringify(requestBody, null, 2));

      // Запоминаем время начала генерации СРАЗУ после создания сообщения (до отправки запроса)
      // Это нужно для правильного отображения прогресса заглушки
      generationStartTimesRef.current.set(assistantMessageId, Date.now());
      // Запускаем интервал для плавного обновления прогресса заглушки
      startPlaceholderProgress(assistantMessageId);

      console.log('[GENERATE_IMAGE] Отправка запроса:', JSON.stringify(requestBody, null, 2));

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
          console.error('[GENERATE_IMAGE] Ошибка ответа:', response.status, errorData);
        } catch (e) {
          const text = await response.text();
          console.error('[GENERATE_IMAGE] Ошибка парсинга ответа:', response.status, text);
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
      console.log('[CHAT] Ответ от API генерации:', data);
      console.log('[CHAT] Доступные ключи в ответе:', Object.keys(data));
      
      // Проверяем, пришел ли синхронный ответ с URL или асинхронный с task_id
      let generatedImageUrl = data.cloud_url || data.image_url;
      let generationTime: number | undefined = data.generation_time; // Время генерации в секундах
      console.log('[CHAT] Инициализация generationTime из data:', generationTime);
      
      // Если пришел task_id, опрашиваем статус до получения изображения
      if (!generatedImageUrl && data.task_id) {
        console.log('[CHAT] Получен task_id, начинаем опрос статуса:', data.task_id);
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
              console.log('[CHAT] Полный ответ от API статуса:', JSON.stringify(statusData, null, 2));
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
              console.log(`[CHAT] ✓ Получен реальный прогресс из API (generating): ${progressValue}%`);
            }
            
            // 1. Проверяем прямое поле progress (только для статуса "generating", чтобы не показывать >99%)
            if (progressValue === undefined && statusData.status === 'generating' && statusData.progress !== undefined && statusData.progress !== null) {
              const rawProgress = typeof statusData.progress === 'number'
                ? statusData.progress
                : parseInt(String(statusData.progress).replace('%', ''), 10);
              progressValue = Math.min(99, Math.max(0, rawProgress));
              console.log(`[CHAT] ✓ Прогресс из statusData.progress: ${progressValue}%`);
            }

            // 2. Проверяем в result.progress (для статуса "generating")
            if (progressValue === undefined && statusData.status === 'generating' && statusData.result?.progress !== undefined) {
              const rawProgress = typeof statusData.result.progress === 'number'
                ? statusData.result.progress
                : parseInt(String(statusData.result.progress).replace('%', ''), 10);
              progressValue = Math.min(99, Math.max(0, rawProgress));
              console.log(`[CHAT] ✓ Прогресс из result.progress: ${progressValue}%`);
            }

            // 3. Проверяем в output.progress (RunPod может возвращать прогресс здесь) - только для "generating"
            if (progressValue === undefined && statusData.status === 'generating' && statusData.output !== undefined) {
              // output может быть строкой "90%" или объектом с полем progress
              if (typeof statusData.output === 'string') {
                const match = statusData.output.match(/(\d+)%/);
                if (match) {
                  const rawProgress = parseInt(match[1], 10);
                  progressValue = Math.min(99, Math.max(0, rawProgress));
                  console.log(`[CHAT] ✓ Прогресс из output (строка): ${progressValue}%`);
                }
              } else if (typeof statusData.output === 'object' && statusData.output.progress !== undefined) {
                const rawProgress = typeof statusData.output.progress === 'number'
                  ? statusData.output.progress
                  : parseInt(String(statusData.output.progress).replace('%', ''), 10);
                progressValue = Math.min(99, Math.max(0, rawProgress));
                console.log(`[CHAT] ✓ Прогресс из output.progress: ${progressValue}%`);
              }
            }

            // 4. Пытаемся извлечь из строки status (например, "IN_PROGRESS 50%") - только для "generating"
            if (progressValue === undefined && statusData.status === 'generating' && typeof statusData.status === 'string') {
              const progressMatch = statusData.status.match(/(\d+)%/);
              if (progressMatch) {
                const rawProgress = parseInt(progressMatch[1], 10);
                progressValue = Math.min(99, Math.max(0, rawProgress));
                console.log(`[CHAT] ✓ Прогресс из status (строка): ${progressValue}%`);
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
                console.log(`[CHAT] ✓ Реальный прогресс из RunPod: ${progressValue}%, используем заглушку: ${usePlaceholder}`);
              }
            } else {
              // Если прогресс не найден, используем заглушку в первые 8 секунд
              if (usePlaceholder) {
                updateMessageProgressContent(assistantMessageId, 0, true);
              }
              
              // Если прогресс не найден, логируем для отладки
              if (attempts % 10 === 0) {
                console.log('[CHAT] Прогресс не найден в ответе:', {
                  status: statusData.status,
                  result: statusData.result,
                  progress: statusData.progress
                });
              }
            }
            
            // Логируем только при изменении статуса или при завершении
            if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED' || statusData.status === 'FAILURE' || statusData.status === 'generating' || attempts % 10 === 0) {
              console.log('[CHAT] Статус генерации:', statusData.status, progressValue !== undefined ? `Прогресс: ${progressValue}%` : '');
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
              console.log('[CHAT] ✓ Генерация завершена:', {
                imageUrl: generatedImageUrl,
                generationTime: generationTime
              });
              
              if (generatedImageUrl) {
                console.log('[CHAT] Изображение готово:', generatedImageUrl);
                break;
              } else {
                console.warn('[CHAT] URL не найден в ответе, продолжаем опрос...');
              }
            } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
              throw new Error(statusData.message || statusData.error || 'Ошибка генерации изображения');
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

      // ИСТОРИЯ ЧАТА: История уже сохраняется на бэкенде в /generation-status эндпоинте
      // Убрано двойное сохранение на фронтенде, чтобы избежать дублирования сообщений
      // История сохраняется через ImageGenerationHistoryService в main.py при завершении генерации
      console.log('[CHAT] История будет сохранена автоматически на бэкенде через /generation-status');

      if (isAuthenticated) {
        await refreshUserStats();
      }
    } catch (error) {
      generationFailed = true;
      stopPlaceholderProgress(assistantMessageId);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка генерации изображения';
      setError(errorMessage);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      // Очищаем время начала генерации при ошибке
      generationStartTimesRef.current.delete(assistantMessageId);
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

    // Сохраняем оригинальное сообщение для отображения пользователю
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: originalMessage, // Показываем оригинальный текст пользователю
      timestamp: new Date()
    };

    setMessages(prev => deduplicateMessages([...prev, userMessage]));
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
      console.log('[STREAM] Отправка запроса с stream=true, targetLanguage:', targetLanguage);
      const response = await fetch(`${API_CONFIG.BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: originalMessage, // Отправляем оригинальное сообщение
          character: currentCharacter.name,
          generate_image: generateImage,
          user_id: effectiveUserId,
          image_prompt: generateImage ? originalMessage : undefined,
          target_language: targetLanguage, // Передаем выбранный язык
          stream: true // Включаем стриминг
        })
      });
      
      console.log('[STREAM] Получен ответ, Content-Type:', response.headers.get('content-type'));

      // Проверяем, является ли ответ SSE потоком
      const contentType = response.headers.get('content-type');
      console.log('[STREAM] Content-Type:', contentType);

      if (!response.ok) {
        // Если это не SSE, пытаемся получить JSON ошибку
        if (!contentType || !contentType.includes('text/event-stream')) {
          const errorData = await response.json().catch(() => ({ detail: 'Ошибка отправки сообщения' }));
        throw new Error(errorData.detail || 'Ошибка отправки сообщения');
        } else {
          // Если это SSE с ошибкой, обрабатываем её в потоке
          // (ошибка будет обработана в цикле чтения)
        }
      }
      if (contentType && contentType.includes('text/event-stream')) {
        // Обрабатываем SSE поток
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
          buffer += decoder.decode(value, { stream: true });
          
          // Обрабатываем все полные строки
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Сохраняем неполную строку обратно в буфер

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.error) {
                  setIsLoading(false);
                  throw new Error(data.error);
                }
                
                // Обработка генерации изображений: если пришел task_id, запускаем опрос статуса
                if (generateImage && data.task_id && !data.image_url && !data.cloud_url) {
                  console.log('[STREAM] Получен task_id для генерации изображения:', data.task_id);
                  // Запускаем опрос статуса генерации в фоне
                  pollImageGenerationStatus(data.task_id, assistantMessageId, authToken || undefined);
                  continue;
                }
                
                // Обработка готового изображения из потока
                if (generateImage && (data.image_url || data.cloud_url)) {
                  const imageUrl = data.image_url || data.cloud_url;
                  console.log('[STREAM] Получено изображение из потока:', imageUrl);
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
                        console.log('[STREAM] Фото добавлено в галерею пользователя из SSE потока');
                      }
                    }
                  } catch (galleryError) {
                    console.warn('[STREAM] Не удалось добавить фото в галерею:', galleryError);
                  }
                  
                  continue;
                }
                
                if (data.content) {
                  // Накопляем контент только если это не генерация изображения
                  if (!generateImage) {
                  accumulatedContent += data.content;
                  console.log('[STREAM] Получен чанк:', data.content.substring(0, 50), 'накоплено:', accumulatedContent.length, 'символов');
                  
                  // Обновляем сообщение ассистента с накопленным контентом
                  setMessages(prev => {
                    const messageIndex = prev.findIndex(msg => msg.id === assistantMessageId);
                    if (messageIndex === -1) {
                      console.warn('[STREAM] Сообщение с id', assistantMessageId, 'не найдено в состоянии');
                      return prev;
                    }
                    
                    const updated = [...prev];
                    updated[messageIndex] = {
                      ...updated[messageIndex],
                      content: accumulatedContent
                    };
                    
                    console.log('[STREAM] Обновлено сообщение:', assistantMessageId, 'новый content length:', accumulatedContent.length);
                    return updated;
                  });
                  }
                }
                
                if (data.done) {
                  // Стриминг завершен
                  console.log('[STREAM] Стриминг завершен, финальный контент:', accumulatedContent.length, 'символов');
                  if (!generateImage) {
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
                console.error('[STREAM] Ошибка парсинга SSE:', e, line);
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
                console.error('[STREAM] Ошибка парсинга последнего чанка:', e);
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
      console.warn('[CHAT HISTORY] Empty identifier, skipping history load', { characterName, expectedCharacter, currentCharacter });
      return;
    }
    
    console.log('[CHAT HISTORY] Starting loadChatHistory', { characterName, identifier, hasExpectedCharacter: !!expectedCharacter, hasCurrentCharacter: !!currentCharacter });
    
    // Отмечаем, что начинаем загрузку истории для этого персонажа
    // Сохраняем identifier в начале для проверки в конце
    const loadIdentifier = identifier;
    isLoadingHistoryRef.current = loadIdentifier;
    
    try {
      console.log('[CHAT HISTORY] Fetching history for:', { 
        characterName, 
        identifier,
        loadIdentifier,
        currentCharacterName: currentCharacter?.name,
        currentCharacterRawName: currentCharacter?.raw?.name,
        expectedCharacterName: expectedCharacter?.name,
        expectedCharacterRawName: expectedCharacter?.raw?.name,
        currentCharacterId: currentCharacter?.id,
        expectedCharacterId: expectedCharacter?.id,
        displayName: expectedCharacter?.display_name || currentCharacter?.display_name
      });
      
      const token = authManager.getToken();
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(identifier)}/chat-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      
      if (response.status === 404) {
        console.log('[CHAT HISTORY] Персонаж не найден (404), показываем пустую историю');
        setMessages([]);
        isLoadingHistoryRef.current = null;
        return;
      }
      
      if (!response.ok) {
        console.error('[CHAT HISTORY] Ошибка загрузки истории:', response.status, response.statusText);
        setMessages([]);
        isLoadingHistoryRef.current = null;
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('[CHAT HISTORY] History response data:', { 
          messagesCount: data.messages?.length || 0,
          hasMessages: !!data.messages?.length,
          sessionId: data.session_id,
          characterName: data.character_name,
          responseStatus: response.status
        });

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
                console.log(`[HISTORY] Дубликат по URL пропущен: ${normalizedUrl.substring(0, 50)}...`);
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
                  console.log(`[HISTORY] Заменено сообщение ${msg.id} на более полную версию (imageUrl: ${!!msg.imageUrl}, generationTime: ${msg.generationTime})`);
                }
              }
              continue;
            }
            
            seenIds.set(msg.id, msg);
            uniqueMessages.push(msg);
          }
          
          const finalMessages = deduplicateMessages(uniqueMessages);
          console.log('[CHAT HISTORY] Setting messages to:', { 
            count: finalMessages.length,
            messageIds: finalMessages.map(m => m.id),
            firstMessage: finalMessages[0] ? { id: finalMessages[0].id, type: finalMessages[0].type, hasImage: !!finalMessages[0].imageUrl } : null,
            lastMessage: finalMessages[finalMessages.length - 1] ? { id: finalMessages[finalMessages.length - 1].id, type: finalMessages[finalMessages.length - 1].type } : null
          });
          
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
          console.log(`[CHAT HISTORY] Preparing to set ${finalMessages.length} messages`, {
            loadIdentifier,
            currentIdentifier,
            expectedIdentifier,
            matchesCurrent,
            matchesExpected,
            hasCurrentCharacter: !!currentCharacter,
            hasExpectedCharacter: !!expectedCharacter,
            isLoadingHistoryRef: isLoadingHistoryRef.current
          });
          
          // КРИТИЧНО: Всегда устанавливаем сообщения, если они загружены
          // Не проверяем условия - просто устанавливаем
            setMessages(finalMessages);
          isLoadingHistoryRef.current = null;
          console.log(`[CHAT HISTORY] ✓ Loaded and set ${finalMessages.length} unique messages from history`);
          } else {
          const currentIdentifier = currentCharacter?.raw?.name || currentCharacter?.name;
          const expectedIdentifier = expectedCharacter?.raw?.name || expectedCharacter?.name;
          const matchesCurrent = currentIdentifier === loadIdentifier;
          const matchesExpected = expectedIdentifier === loadIdentifier;
          
          // КРИТИЧНО: Всегда устанавливаем пустой массив, если истории нет
            console.log('[CHAT HISTORY] No chat history found - setting empty messages array');
            setMessages([]);
          isLoadingHistoryRef.current = null;
        }
      } else {
        console.error('[CHAT HISTORY] Failed to load chat history:', response.status, 'for identifier:', loadIdentifier);
        // КРИТИЧНО: Всегда устанавливаем пустой массив при ошибке
          setMessages([]);
      }
    } catch (error) {
      console.error('[CHAT HISTORY] Error loading chat history:', error, 'for identifier:', loadIdentifier);
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
    console.log('[CHARACTER SELECT] Выбран персонаж:', { 
      name: character.name,
      display_name: character.display_name,
      rawName: character.raw?.name,
      identifier: characterIdentifier,
      currentMessagesCount: messages.length
    });
    
    // Проверяем, не загружали ли мы уже этого персонажа
    if (lastLoadedCharacterRef.current === characterIdentifier) {
      console.log('[CHARACTER SELECT] Character already loaded, skipping reload:', characterIdentifier);
      return;
    }
    
    // Очищаем messages только если персонаж действительно изменился
    const isDifferentCharacter = currentCharacter?.name !== character.name || 
                                 currentCharacter?.raw?.name !== character.raw?.name;
    if (isDifferentCharacter) {
      console.log('[CHARACTER SELECT] Персонаж изменился - очищаем messages');
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
    console.log('[CHARACTER UPDATE] useEffect triggered, initialCharacter:', initialCharacter ? { name: initialCharacter.name, id: initialCharacter.id } : null, 'currentCharacter:', currentCharacter ? { name: currentCharacter.name, id: currentCharacter.id } : null);
    if (initialCharacterIdentifier) {
      const characterIdentifier = initialCharacterIdentifier;
      console.log('[CHARACTER UPDATE] Обновление персонажа из props:', { 
        name: initialCharacter.name,
        display_name: initialCharacter.display_name,
        rawName: initialCharacter.raw?.name,
        identifier: characterIdentifier,
        currentMessagesCount: messages.length,
        currentCharacterName: currentCharacter?.name,
        currentCharacterRawName: currentCharacter?.raw?.name
      });
      
      // Проверяем, изменился ли персонаж действительно (сравниваем по raw.name или name)
      const currentIdentifier = currentCharacter?.raw?.name || currentCharacter?.name;
      const newIdentifier = initialCharacter.raw?.name || initialCharacter.name;
      const isNewCharacter = currentIdentifier !== newIdentifier;
      
      if (isNewCharacter) {
        console.log('[CHARACTER UPDATE] Новый персонаж - очищаем messages перед загрузкой истории');
        // НЕ сбрасываем isLoadingHistoryRef здесь - это вызовет race condition
        // Вместо этого сбросим его только в самом начале loadChatHistory
        setMessages([]); // Очищаем только при реальной смене персонажа
      } else {
        console.log('[CHARACTER UPDATE] Персонаж не изменился - не очищаем messages');
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
        console.log('[CHARACTER UPDATE] Character already loaded, skipping reload:', characterIdentifier);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCharacterIdentifier]); // Используем только идентификатор, функции мемоизированы

  // Загружаем персонажа из URL, если initialCharacter не передан
  useEffect(() => {
    console.log('[URL LOAD] useEffect triggered, initialCharacter:', initialCharacter ? { name: initialCharacter.name, id: initialCharacter.id } : null, 'currentCharacter:', currentCharacter ? { name: currentCharacter.name, id: currentCharacter.id } : null, 'isLoadingFromUrl:', isLoadingFromUrlRef.current);
    // Если initialCharacter не передан и currentCharacter тоже null, пытаемся загрузить из URL
    // Также проверяем, что мы еще не загружали из URL
    if (!initialCharacter && !currentCharacter && !isLoadingFromUrlRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterId = urlParams.get('character');
      
      if (characterId) {
      console.log('[CHAT] Загрузка персонажа из URL параметра:', characterId);
      isLoadingFromUrlRef.current = true; // Устанавливаем флаг загрузки
      
      // Функция для загрузки персонажа по ID
      const loadCharacterFromUrl = async () => {
          try {
            // Сначала проверяем localStorage
            const savedCharacter = localStorage.getItem(`character_${characterId}`);
            if (savedCharacter) {
              try {
                const character = JSON.parse(savedCharacter);
                console.log('[CHAT] Персонаж найден в localStorage:', character);
                setCurrentCharacter(character);
                
                // Используем raw.name (реальное имя из БД) для загрузки истории
                // Если raw.name нет, используем name, но лучше загрузить полные данные через loadCharacterData
                const characterIdentifier = character.raw?.name || character.name;
                console.log('[CHAT] Используем identifier для истории из localStorage:', characterIdentifier);
                
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
                    console.log('[URL LOAD] Character already loaded from localStorage, skipping reload:', characterIdentifier);
                    setCurrentCharacter(character); // Устанавливаем персонажа, но не загружаем данные повторно
                  }
                } else {
                  console.warn('[CHAT] Не удалось определить identifier для персонажа из localStorage, загружаем из API');
                  // Если нет identifier, загружаем из API
                  throw new Error('No identifier in localStorage character');
                }
                return;
              } catch (parseError) {
                console.warn('[CHAT] Ошибка парсинга персонажа из localStorage, загружаем из API:', parseError);
                // Продолжаем загрузку из API
              }
            }

            // Если не найден в localStorage или ошибка парсинга, загружаем из API с полными данными
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterId)}/with-creator`);
            if (response.ok) {
              const characterData = await response.json();
              console.log('[CHAT] Персонаж загружен из API:', characterData);
              
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
                console.log('[CHAT] Персонаж сохранен в localStorage');
              } catch (storageError) {
                console.warn('[CHAT] Не удалось сохранить персонажа в localStorage:', storageError);
              }
              
              setCurrentCharacter(character);
              
              // Используем raw.name (реальное имя из БД) для загрузки истории
              const characterIdentifier = characterData.name || characterId;
              console.log('[CHAT] Используем identifier для истории:', characterIdentifier);
              
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
                  console.log('[URL LOAD] Character already loaded from API, skipping reload:', characterIdentifier);
                  setCurrentCharacter(character); // Устанавливаем персонажа, но не загружаем данные повторно
                }
              } else {
                console.error('[CHAT] Не удалось определить identifier для персонажа из API');
                setError('Не удалось определить идентификатор персонажа');
              }
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.error('[CHAT] Не удалось загрузить персонажа из API:', response.status, errorText);
              
              // Если персонаж не найден (404), показываем ошибку и очищаем localStorage
              if (response.status === 404) {
                console.log('[CHAT] Персонаж не найден (404), очищаем localStorage и показываем ошибку');
                try {
                  localStorage.removeItem(`character_${characterId}`);
                } catch (e) {
                  console.warn('[CHAT] Не удалось очистить localStorage:', e);
                }
                // Устанавливаем ошибку, чтобы показать сообщение пользователю
                setError(`Персонаж с ID "${characterId}" не найден. Возможно, он был удален.`);
                // Не устанавливаем currentCharacter, чтобы показать сообщение об ошибке
              } else {
                setError(`Не удалось загрузить персонажа: ${errorText || 'Неизвестная ошибка'}`);
              }
            }
          } catch (error) {
            console.error('[CHAT] Ошибка загрузки персонажа из URL:', error);
            setError(error instanceof Error ? error.message : 'Не удалось загрузить персонажа');
          } finally {
            isLoadingFromUrlRef.current = false; // Сбрасываем флаг загрузки
          }
        };

        loadCharacterFromUrl();
      } else {
        console.log('[CHAT] Нет параметра character в URL');
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
      
      const identifier = currentCharacter.raw?.name || currentCharacter.name;
      await fetchPaidAlbumStatus(identifier);
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
        `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${characterName}`,
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
        `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${characterName}/photos`,
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
  //   console.log('[CHAT RENDER] Showing loading - no character, no messages, no error');
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
  //   console.log('[CHAT RENDER] Showing error - has error, no character, no messages');
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
          console.log(`[DEDUP] Дубликат пропущен: ${key.substring(0, 50)}...`);
          return false;
        }
        seen.add(key);
        return true;
      });
    } catch (error) {
      console.error('[CHAT] Ошибка дедупликации сообщений:', error);
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
          onProfile={onOwnProfile}
          onBalance={() => alert('Баланс пользователя')}
          refreshTrigger={balanceRefreshTrigger}
        />
        
        <ChatContentWrapper>
          <ChatMessagesArea style={{ zIndex: 10, position: 'relative' }}>
            <ChatArea 
              messages={uniqueMessages}
              isLoading={isLoading}
              isGeneratingImage={activeGenerations.size > 0}
              characterSituation={characterSituation ?? undefined}
              characterName={characterForRender?.name || ''}
              characterAvatar={characterPhotos && characterPhotos.length > 0 ? characterPhotos[0] : undefined}
              userAvatar={userInfo?.avatar_url || undefined}
              userUsername={userInfo?.username || undefined}
              userEmail={userInfo?.email || undefined}
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
              targetLanguage={targetLanguage}
              onLanguageChange={handleLanguageChange}
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
                console.log('[GENERATE_IMAGE] Предзаполнение промпта из кнопки:', { appearance, location, defaultPrompt });
                setImagePromptInput(defaultPrompt);
                setIsImagePromptModalOpen(true);
              }}
              onShowHelp={() => {
                setIsPhotoGenerationHelpModalOpen(true);
              }}
              onClearChat={clearChat}
              onTipCreator={() => {
                console.log('[TIP BUTTON] Нажата кнопка благодарности');
                console.log('[TIP BUTTON] Текущий персонаж name:', characterForRender?.name);
                console.log('[TIP BUTTON] Текущий персонаж полностью:', characterForRender);
                if (!isAuthenticated) {
                  console.log('[TIP BUTTON] Пользователь не авторизован - показываем AuthModal');
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                } else {
                  console.log('[TIP BUTTON] Пользователь авторизован - открываем TipModal');
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
              const isOwnerByCharacter = characterForRender?.user_id && userInfo && characterForRender.user_id === userInfo.id;
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
            
            {/* Индикатор очереди генераций - в самом низу панели */}
                <GenerationQueueIndicator>
                  {Array.from({ length: getGenerationQueueLimit }).map((_, index) => (
                    <QueueBar 
                      key={index} 
                      $isFilled={index < activeGenerations.size}
                    />
                  ))}
                </GenerationQueueIndicator>
                <QueueLabel>Очередь генерации</QueueLabel>
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
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            background: 'rgba(20, 20, 25, 0.85)',
            backdropFilter: 'blur(20px)',
            padding: '2rem',
            borderRadius: '16px',
            maxWidth: '900px',
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
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                Модель генерации:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(15, 15, 20, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                <option value="anime-realism">Аниме реализм</option>
                <option value="anime">Аниме</option>
                <option value="realism">Реализм</option>
              </select>
            </div>
            <textarea
              value={imagePromptInput}
              onChange={(e) => setImagePromptInput(e.target.value)}
              placeholder="Опишите желаемое изображение..."
              style={{
                width: '100%',
                minHeight: '200px',
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
                  padding: '0.75rem 1.5rem',
                  background: !imagePromptInput.trim()
                    ? 'rgba(60, 60, 60, 0.5)'
                    : 'rgba(100, 100, 110, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: !imagePromptInput.trim()
                    ? 'not-allowed'
                    : 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: !imagePromptInput.trim() ? 0.6 : 1
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
    </Container>
  );
};