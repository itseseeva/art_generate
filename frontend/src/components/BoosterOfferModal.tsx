import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Image, X, Sparkles, Mic, Crown } from 'lucide-react';
import { API_CONFIG } from '../config/api';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(30px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.7); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;

`;

const ModalContainer = styled(motion.div)`
  background: linear-gradient(160deg, #0a0a0d 0%, #12121a 50%, #0d0d12 100%);
  border-radius: 24px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  position: relative;
  border: 1px solid rgba(236, 72, 153, 0.25);
  box-shadow:
    0 15px 50px rgba(0, 0, 0, 0.7),
    0 0 30px rgba(139, 92, 246, 0.05);
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;


  @media (max-width: 520px) {
    padding: 1.5rem;
    max-width: 95%;
  }

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #ec4899, #8b5cf6, #ec4899);
    border-radius: 26px;
    z-index: -1;
    opacity: 0.15;
    background-size: 200%;
    animation: ${shimmer} 3s linear infinite;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
`;

const AdminTools = styled.div`
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const AdminTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: #fca5a5;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-align: center;
  margin-bottom: 0.25rem;
`;

const AdminButton = styled.button`
  width: 100%;
  padding: 0.6rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    transform: rotate(90deg);
  }
`;

/* Анимированные часы */
const ClockContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
`;

const ClockFace = styled.div<{ $expired?: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #2a2a3a 0%, #15151f 100%);
  border: 3px solid ${p => p.$expired ? 'rgba(100, 100, 100, 0.4)' : 'rgba(236, 72, 153, 0.5)'};
  position: relative;
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    ${p => p.$expired ? 'none' : '0 0 20px rgba(236, 72, 153, 0.3)'};
  ${p => !p.$expired && css`animation: ${pulseGlow} 2s ease-in-out infinite;`}

  /* Метки часов */
  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 8px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 1px;
  }
  &::after {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 8px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 1px;
  }
`;

const ClockMark = styled.div<{ $rotation: number }>`
  position: absolute;
  top: 8px;
  left: 50%;
  width: 2px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  transform-origin: 50% 52px;
  transform: translateX(-50%) rotate(${p => p.$rotation}deg);
`;

const ClockCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
  z-index: 5;
  box-shadow: 0 0 8px rgba(236, 72, 153, 0.6);
`;

const MinuteHand = styled.div<{ $rotation: number; $expired?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 3px;
  height: 40px;
  background: ${p => p.$expired ? 'rgba(100, 100, 100, 0.6)' : 'linear-gradient(180deg, #ec4899 0%, #a855f7 100%)'};
  border-radius: 2px;
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%) rotate(${p => p.$rotation}deg);
  z-index: 3;
  box-shadow: ${p => p.$expired ? 'none' : '0 0 10px rgba(236, 72, 153, 0.5)'};
  transition: transform 0.3s ease-out;
`;

const SecondHand = styled.div<{ $rotation: number; $expired?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.5px;
  height: 45px;
  background: ${p => p.$expired ? 'rgba(80, 80, 80, 0.5)' : '#f87171'};
  border-radius: 1px;
  transform-origin: 50% 100%;
  transform: translate(-50%, -100%) rotate(${p => p.$rotation}deg);
  z-index: 4;
  box-shadow: ${p => p.$expired ? 'none' : '0 0 6px rgba(248, 113, 113, 0.6)'};
`;

const TimerDisplay = styled.div<{ $expired?: boolean }>`
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: ${p => p.$expired ? 'rgba(100, 100, 100, 0.8)' : '#f87171'};
  letter-spacing: 1px;
  text-shadow: ${p => p.$expired ? 'none' : '0 0 8px rgba(248, 113, 113, 0.5)'};
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 0.5rem 0;
  text-align: center;
  background: linear-gradient(120deg, #f472b6 0%, #ec4899 30%, #c084fc 70%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;

  @media (max-width: 520px) {
    font-size: 1.3rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 1rem 0;
  background: linear-gradient(
    90deg,
    #f472b6 0%,
    #c084fc 25%,
    #60a5fa 50%,
    #c084fc 75%,
    #f472b6 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  animation: ${shimmer} 15s linear infinite;
`;

const Message = styled.p`
  font-size: 0.95rem;
  line-height: 1.7;
  text-align: center;
  margin: 0 0 1.5rem 0;
  color: rgba(255, 255, 255, 0.9);
`;

const MessageHighlight = styled.span`
  display: block;
  margin-top: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  background: linear-gradient(
    90deg,
    #fde047 0%,
    #f472b6 30%,
    #c084fc 60%,
    #fde047 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  animation: ${shimmer} 12s linear infinite;
`;

const GlossyText = styled.strong`
  font-weight: 700;
  background: linear-gradient(
    90deg,
    #fde047 0%,
    #f472b6 30%,
    #c084fc 60%,
    #fde047 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  animation: ${shimmer} 12s linear infinite;
`;

const OfferBox = styled.div`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const OfferTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
`;

const OfferItems = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;

  @media (max-width: 400px) {
    gap: 1rem;
  }
`;

const OfferItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);

  svg {
    width: 20px;
    height: 20px;
    color: #c084fc;
  }

  span {
    font-weight: 700;
    color: #e879f9;
    font-size: 1.15rem;
  }
`;

const SbpLogo = styled.img`
  width: 34px;
  height: 34px;
  object-fit: contain;
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
`;

const ButtonPrice = styled.span`
  font-size: 1.2rem;
  font-weight: 800;
  color: #fde047;
  text-shadow: 0 0 10px rgba(253, 224, 71, 0.4);
`;

const PayButton = styled.button`
  width: 100%;
  padding: 0.7rem 2rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: white;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ec4899 0%, #c084fc 50%, #a855f7 100%);
  box-shadow:
    0 4px 20px rgba(236, 72, 153, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }

  &:hover:not(:disabled)::before {
    transform: translateX(100%);
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(236, 72, 153, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeclineButton = styled.button`
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const ButtonsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 0.7rem 2rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: white;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ec4899 0%, #c084fc 50%, #a855f7 100%);
  box-shadow:
    0 4px 20px rgba(236, 72, 153, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(236, 72, 153, 0.5);
  }

  &:active {
    transform: translateY(0);
  }
`;

interface BoosterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'messages' | 'photos' | 'voice';
  /** 'booster' — предложение буста за 69 ₽; 'out_of_limits' — лимиты кончились после буста, кнопки Магазин и Подписка; 'info' — показать информацию о бустере; 'album_access' — уведомление о доступе к альбому; 'album_add' — доступ к добавлению в альбом */
  variant?: 'booster' | 'out_of_limits' | 'info' | 'album_access' | 'album_add';
  /** Текущая история чата для сохранения перед оплатой */
  chatHistory?: Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string;
    generationTime?: number;
    isGenerating?: boolean;
    progress?: number;
  }>;
  /** ID/имя персонажа для сохранения контекста */
  characterId?: string;
  /** ID пользователя для привязки таймера */
  userId?: number;
  /** Является ли пользователь администратором */
  isAdmin?: boolean;
  onShop?: () => void;
}

const OFFER_DURATION = 30 * 60; // 30 минут

export const BoosterOfferModal: React.FC<BoosterOfferModalProps> = ({
  isOpen,
  onClose,
  limitType,
  variant = 'booster',
  chatHistory,
  characterId,
  userId,
  isAdmin,
  onShop
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OFFER_DURATION);
  const [offerExpired, setOfferExpired] = useState(false);
  const isOutOfLimits = variant === 'out_of_limits';
  const isInfoMode = variant === 'info';
  const isAlbumAccess = variant === 'album_access';
  const isAlbumAdd = variant === 'album_add';

  // ... (useEffect omitted, implied unchanged if not targeting it)

  // We need to keep the useEffect, so I will only replace the top part and let the rest match context.
  // Actually, replace_file_content replaces the block. I need to be careful with maintaining useEffect.
  // The instruction said "Add onShop to interface".


  useEffect(() => {
    if (!isOpen || isOutOfLimits || isInfoMode || isAlbumAccess || isAlbumAdd) {
      setTimeLeft(OFFER_DURATION);
      setOfferExpired(false);
      return;
    }

    const storageKey = `booster_offer_start_${limitType}${userId ? `_${userId}` : ''}`;
    const savedStartTime = localStorage.getItem(storageKey);
    let startTime: number;
    if (savedStartTime) {
      startTime = parseInt(savedStartTime, 10);
    } else {
      startTime = Date.now();
      localStorage.setItem(storageKey, startTime.toString());
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, OFFER_DURATION - elapsed);
    setTimeLeft(remaining);
    if (remaining === 0) {
      setOfferExpired(true);
      return;
    }

    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startTime) / 1000);
      const newRemaining = Math.max(0, OFFER_DURATION - newElapsed);
      setTimeLeft(newRemaining);
      if (newRemaining === 0) setOfferExpired(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, limitType, isOutOfLimits, userId, isInfoMode, isAlbumAccess, isAlbumAdd]);

  const handlePurchase = async () => {
    if (offerExpired) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Необходимо авторизоваться');
        return;
      }

      // Сохраняем историю чата и текущий URL в localStorage перед переходом на оплату
      if (chatHistory && chatHistory.length > 0 && characterId) {
        const currentUrl = window.location.pathname + window.location.search;
        const chatHistoryData = {
          messages: chatHistory,
          characterId: characterId,
          returnUrl: currentUrl,
          timestamp: Date.now(),
          type: 'booster_payment'
        };
        localStorage.setItem('pending_chat_history', JSON.stringify(chatHistoryData));
        console.log('[BOOSTER_PAYMENT] История чата сохранена в localStorage:', chatHistoryData);
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 69,
          description: 'Бустер: 30 сообщений + 10 фото + 10 голосовых',
          payment_type: 'booster',
          payment_method: 'sbp',
          character_id: characterId || undefined
        })
      });
      if (!response.ok) throw new Error('Ошибка создания платежа');
      const data = await response.json();
      const storageKey = `booster_offer_start_${limitType}${userId ? `_${userId}` : ''}`;
      localStorage.removeItem(storageKey);
      window.location.href = data.confirmation_url;
    } catch (error) {
      console.error('Ошибка при создании платежа:', error);
      alert('Произошла ошибка. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminGrantBooster = async () => {
    if (!userId || !isAdmin) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/admin/grant-booster/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Ошибка начисления бустера');
      alert('Бустер успешно начислен (Admin Mode)');
      onClose();
      // Можно было бы обновить стейт здесь, но бэкенд шлет WebSocket обновление
    } catch (error) {
      console.error('Ошибка при начислении бустера:', error);
      alert('Ошибка при начислении бустера');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Вычисляем углы стрелок на основе оставшегося времени
  // Минутная стрелка: полный оборот за 30 минут (360° / 30 мин = 12° в минуту)
  const minutesLeft = timeLeft / 60;
  const minuteRotation = (30 - minutesLeft) * 12; // Начинаем с 12 часов и движемся по часовой

  // Секундная стрелка: полный оборот за 60 секунд (6° в секунду)
  const secondsLeft = timeLeft % 60;
  const secondRotation = (60 - secondsLeft) * 6;

  if (!isOpen) return null;

  const messageText = isAlbumAccess || isAlbumAdd
    ? (isAlbumAdd
      ? 'Для добавления фотографий в альбом этого персонажа необходима подписка STANDARD или PREMIUM.\n'
      : 'Для просмотра этого альбома необходима подписка STANDARD или PREMIUM.\n')
    : isOutOfLimits
      ? (limitType === 'messages'
        ? 'Сообщения снова закончились. Оформите подписку в магазине.'
        : limitType === 'photos'
          ? 'Генерации снова закончились. Оформите подписку в магазине.'
          : 'Голосовые генерации снова закончились. Оформите подписку в магазине.')
      : (limitType === 'messages'
        ? 'Твои бесплатные сообщения закончились, но я не хочу прерывать нашу игру.'
        : limitType === 'photos'
          ? 'Твои бесплатные генерации закончились, но я не хочу прерывать нашу игру.'
          : 'Твои бесплатные голосовые генерации закончились, но я не хочу прерывать нашу игру.');

  const handleGoToSubscription = () => {
    onClose();
    window.location.href = isOutOfLimits ? '/shop' : '/shop?tab=subscription';
  };

  const handleStandardPurchase = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Необходимо авторизоваться');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 449,
          description: 'Оплата подписки STANDARD на 30 дней',
          plan: 'standard',
          payment_type: 'subscription',
          payment_method: 'sbp',
          character_id: characterId || undefined
        })
      });

      if (!response.ok) throw new Error('Ошибка создания платежа');

      const data = await response.json();
      window.location.href = data.confirmation_url;
    } catch (error) {
      console.error('Ошибка при создании платежа:', error);
      alert('Произошла ошибка. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <CloseButton onClick={onClose}>
              <X size={20} strokeWidth={2.5} />
            </CloseButton>

            {!isOutOfLimits && !isAlbumAccess && !isAlbumAdd && (
              <ClockContainer>
                <ClockFace $expired={offerExpired}>
                  <ClockMark $rotation={90} />
                  <ClockMark $rotation={270} />
                  <MinuteHand $rotation={minuteRotation} $expired={offerExpired} />
                  <SecondHand $rotation={secondRotation} $expired={offerExpired} />
                  <ClockCenter />
                  <TimerDisplay $expired={offerExpired}>
                    {offerExpired ? '00:00' : formatTime(timeLeft)}
                  </TimerDisplay>
                </ClockFace>
              </ClockContainer>
            )}

            <Title>
              {isAlbumAdd ? 'Добавление в альбом' : isAlbumAccess ? 'Доступ к альбому' : isOutOfLimits ? 'Лимиты закончились' : 'Кажется, нам только стало интересно...'}
            </Title>
            <Subtitle>
              {isAlbumAccess || isAlbumAdd ? 'Только для подписчиков' : isOutOfLimits ? 'Продолжи общение' : 'Специальное предложение только для тебя'}
            </Subtitle>

            <Message>
              {isInfoMode
                ? 'Получи дополнительные возможности для продолжения общения!'
                : messageText.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < messageText.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              {!isOutOfLimits && !isInfoMode && !isAlbumAccess && !isAlbumAdd && (
                <MessageHighlight>Специально для тебя — секретный доступ:</MessageHighlight>
              )}
            </Message>

            {!isOutOfLimits && !isInfoMode && !isAlbumAccess && !isAlbumAdd && (
              <OfferBox>
                <OfferTitle>Держи ещё:</OfferTitle>
                <OfferItems>
                  <OfferItem>
                    <MessageSquare strokeWidth={2.2} />
                    <span>30</span> сообщений
                  </OfferItem>
                  <OfferItem>
                    <Image strokeWidth={2.2} />
                    <span>10</span> фото
                  </OfferItem>
                  <OfferItem>
                    <Mic strokeWidth={2.2} />
                    <span>10</span> голосовых
                  </OfferItem>
                </OfferItems>
              </OfferBox>
            )}

            {isInfoMode && (
              <OfferBox>
                <OfferTitle>Бустер включает:</OfferTitle>
                <OfferItems>
                  <OfferItem>
                    <MessageSquare strokeWidth={2.2} />
                    <span>30</span> сообщений
                  </OfferItem>
                  <OfferItem>
                    <Image strokeWidth={2.2} />
                    <span>10</span> фото
                  </OfferItem>
                  <OfferItem>
                    <Mic strokeWidth={2.2} />
                    <span>10</span> голосовых
                  </OfferItem>
                </OfferItems>
              </OfferBox>
            )}

            {isOutOfLimits || isAlbumAccess || isAlbumAdd ? (
              <>
                <ButtonsRow>
                  <ActionButton onClick={handleGoToSubscription}>
                    {isOutOfLimits ? 'В магазин' : 'Оформить подписку'}
                  </ActionButton>
                </ButtonsRow>

              </>
            ) : (
              <>
                <PayButton
                  onClick={handlePurchase}
                  disabled={isLoading || (!isInfoMode && offerExpired)}
                >
                  {(!isInfoMode && offerExpired) ? (
                    'Предложение истекло'
                  ) : isLoading ? (
                    'Создание платежа...'
                  ) : (
                    <ButtonContent>
                      <SbpLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                      <ButtonPrice>69 ₽</ButtonPrice>
                    </ButtonContent>
                  )}
                </PayButton>

                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '0.8rem',
                  margin: '0.5rem 0',
                  fontWeight: 600
                }}>
                  ИЛИ
                </div>

                <OfferBox style={{ marginTop: '0', marginBottom: '1rem', padding: '1rem', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    top: '-14px',
                    right: '-8px',
                    transform: 'rotate(12deg)',
                    filter: 'drop-shadow(0 0 10px rgba(253, 224, 71, 0.4))'
                  }}>
                    <Crown size={34} color="#fde047" fill="rgba(253, 224, 71, 0.2)" strokeWidth={2} />
                  </div>
                  <OfferItems style={{ marginBottom: '1rem' }}>
                    <OfferItem>
                      <Image strokeWidth={2.2} />
                      <GlossyText style={{ fontSize: '1.2rem' }}>100 фото</GlossyText>
                    </OfferItem>
                    <OfferItem>
                      <Mic strokeWidth={2.2} />
                      <GlossyText style={{ fontSize: '1.2rem' }}>100 голосовых</GlossyText>
                    </OfferItem>
                  </OfferItems>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#d1d1d1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontWeight: 500,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '1rem'
                  }}>
                    <GlossyText style={{ fontSize: '1rem' }}>Безлимитные сообщения</GlossyText>
                    <GlossyText>Расширенная память</GlossyText>
                    <GlossyText>Доступ к текстовым Premium моделям</GlossyText>
                    <GlossyText>Доступ ко всем альбомам</GlossyText>
                  </div>
                </OfferBox>

                <PayButton
                  onClick={handleStandardPurchase}
                  style={{
                    marginTop: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0'
                  }}
                >
                  <ButtonContent style={{ marginBottom: '0' }}>
                    <SbpLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                    <ButtonPrice>449 ₽</ButtonPrice>
                  </ButtonContent>
                </PayButton>

                {isAdmin && (
                  <AdminTools>
                    <AdminTitle>Панель администратора</AdminTitle>
                    <AdminButton onClick={handleAdminGrantBooster} disabled={isLoading}>
                      {isLoading ? 'Загрузка...' : 'Начислить Бустер (Тест)'}
                    </AdminButton>
                  </AdminTools>
                )}

              </>
            )}
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
};
