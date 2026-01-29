import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiAlertCircle as AlertIcon, FiShoppingBag as ShopIcon, FiLock as LockIcon } from 'react-icons/fi';
import { authManager } from '../utils/auth';

const NotificationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotificationContainer = styled.div<{ $isClosing?: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  width: 90%;
  max-width: 500px;
  animation: ${props => props.$isClosing ? 'slideOut 0.3s ease-out forwards' : 'slideIn 0.3s ease-out'};
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -60%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -60%);
    }
  }
`;

const NotificationContent = styled.div<{ $variant?: 'warning' | 'default' }>`
  background: ${props => props.$variant === 'warning' 
    ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)'};
  border: 2px solid ${props => props.$variant === 'warning' 
    ? 'rgba(150, 150, 150, 0.5)'
    : 'rgba(150, 150, 150, 0.3)'};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  box-shadow: ${props => props.$variant === 'warning'
    ? '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    : '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
  text-align: center;
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(80, 80, 80, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 200, 200, 1);
  
  svg {
    width: 32px;
    height: 32px;
  }
`;

const NotificationTitle = styled.h2<{ $variant?: 'warning' | 'default' }>`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${props => props.$variant === 'warning' 
    ? 'rgba(240, 240, 240, 1)'
    : 'rgba(240, 240, 240, 1)'};
  margin: 0;
`;

const NotificationMessage = styled.p<{ $variant?: 'warning' | 'default' }>`
  font-size: ${theme.fontSize.base};
  color: ${props => props.$variant === 'warning' 
    ? 'rgba(200, 200, 200, 1)'
    : 'rgba(200, 200, 200, 1)'};
  margin: 0;
  line-height: 1.6;
`;

const NotificationButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  width: 100%;
  justify-content: center;
`;

const NotificationButton = styled.button<{ $variant?: 'warning' | 'default' }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: ${props => props.$variant === 'warning'
    ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.8) 0%, rgba(80, 80, 80, 0.8) 100%)'
    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)'};
  border: 1px solid ${props => props.$variant === 'warning'
    ? 'rgba(150, 150, 150, 0.5)'
    : 'rgba(139, 92, 246, 0.5)'};
  border-radius: ${theme.borderRadius.lg};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$variant === 'warning'
      ? 'linear-gradient(135deg, rgba(120, 120, 120, 0.9) 0%, rgba(100, 100, 100, 0.9) 100%)'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%)'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const NotificationCancelButton = styled.button<{ $variant?: 'warning' | 'default' }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: transparent;
  border: 1px solid ${props => props.$variant === 'warning'
    ? 'rgba(150, 150, 150, 0.5)'
    : 'rgba(150, 150, 150, 0.3)'};
  border-radius: ${theme.borderRadius.lg};
  color: ${props => props.$variant === 'warning'
    ? 'rgba(200, 200, 200, 1)'
    : 'rgba(200, 200, 200, 1)'};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(80, 80, 80, 0.3);
    border-color: rgba(150, 150, 150, 0.7);
  }
`;

const PriceInfo = styled.div`
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin-top: ${theme.spacing.sm};
`;

interface PaidAlbumPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => Promise<void>;
  onOpenShop?: () => void;
  characterName: string;
  subscriptionType?: string;
  userCoins?: number;
  isLoading?: boolean;
}

export const PaidAlbumPurchaseModal: React.FC<PaidAlbumPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchase,
  onOpenShop,
  characterName,
  subscriptionType = 'free',
  userCoins = 0,
  isLoading = false
}) => {
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      
    }
  }, [isOpen, characterName, subscriptionType, userCoins]);

  if (!isOpen) return null;

  const normalizedSubscriptionType = subscriptionType?.toLowerCase() || 'free';
  const PAID_ALBUM_COST = 300;
  const canAfford = userCoins >= PAID_ALBUM_COST;
  const isFree = normalizedSubscriptionType === 'free';
  const isStandard = normalizedSubscriptionType === 'standard';
  const isPremium = normalizedSubscriptionType === 'premium';

  const handlePurchase = async () => {
    if (!canAfford || isPurchasing) return;
    
    setIsPurchasing(true);
    try {
      await onPurchase();
      onClose();
    } catch (error) {
      
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleShopClick = () => {
    if (onOpenShop) {
      onOpenShop();
    }
    onClose();
  };

  // Для FREE пользователей - показываем предупреждение
  if (isFree) {
    return (
      <>
        <NotificationOverlay onClick={onClose} />
        <NotificationContainer $isClosing={false}>
          <NotificationContent $variant="warning">
            <IconWrapper>
              <AlertIcon />
            </IconWrapper>
            <NotificationTitle $variant="warning">Требуется подписка</NotificationTitle>
            <NotificationMessage $variant="warning">
              Для покупки альбома персонажа "{characterName}" необходима подписка STANDARD или PREMIUM.
              Перейдите в магазин, чтобы оформить подписку.
            </NotificationMessage>
            <NotificationButtonGroup>
              <NotificationButton onClick={handleShopClick} $variant="warning">
                <ShopIcon />
                Магазин
              </NotificationButton>
              <NotificationCancelButton onClick={onClose} $variant="warning">
                Отмена
              </NotificationCancelButton>
            </NotificationButtonGroup>
          </NotificationContent>
        </NotificationContainer>
      </>
    );
  }

  // Для STANDARD пользователей - показываем предложение купить
  if (isStandard) {
    return (
      <>
        <NotificationOverlay onClick={onClose} />
        <NotificationContainer $isClosing={false}>
          <NotificationContent>
            <IconWrapper>
              <LockIcon />
            </IconWrapper>
            <NotificationTitle>Купить альбом</NotificationTitle>
            <NotificationMessage>
              Открыть альбом персонажа "{characterName}" за {PAID_ALBUM_COST} кредитов?
            </NotificationMessage>
            <PriceInfo>
              У вас: {userCoins} кредитов
            </PriceInfo>
            {!canAfford && (
              <NotificationMessage style={{ color: 'rgba(239, 68, 68, 1)', fontSize: theme.fontSize.sm }}>
                Недостаточно кредитов. Нужно {PAID_ALBUM_COST}, доступно {userCoins}.
              </NotificationMessage>
            )}
            <NotificationButtonGroup>
              <NotificationButton 
                onClick={handlePurchase} 
                disabled={!canAfford || isPurchasing || isLoading}
              >
                {isPurchasing || isLoading ? 'Покупка...' : 'Купить'}
              </NotificationButton>
              <NotificationCancelButton onClick={onClose}>
                Отмена
              </NotificationCancelButton>
            </NotificationButtonGroup>
          </NotificationContent>
        </NotificationContainer>
      </>
    );
  }

  // Для PREMIUM - не должно показываться, так как альбомы открыты автоматически
  return null;
};

