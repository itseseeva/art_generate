import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiAlertCircle as AlertIcon, FiShoppingBag as ShopIcon, FiUnlock as UnlockIcon } from 'react-icons/fi';
import { authManager } from '../utils/auth';
import { useTranslation } from 'react-i18next';

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

const NotificationContent = styled.div<{ $variant?: 'warning' | 'success' | 'default' }>`
  background: ${props => props.$variant === 'warning'
    ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)'
    : props.$variant === 'success'
      ? 'linear-gradient(135deg, rgba(20, 40, 30, 0.95) 0%, rgba(15, 30, 20, 0.95) 100%)'
      : 'linear-gradient(135deg, rgba(40, 20, 50, 0.95) 0%, rgba(30, 15, 40, 0.95) 100%)'};
  border: 2px solid ${props => props.$variant === 'warning'
    ? 'rgba(150, 150, 150, 0.5)'
    : props.$variant === 'success'
      ? 'rgba(34, 197, 94, 0.5)'
      : 'rgba(139, 92, 246, 0.5)'};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  box-shadow: ${props => props.$variant === 'warning'
    ? '0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    : props.$variant === 'success'
      ? '0 20px 60px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      : '0 20px 60px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.lg};
  text-align: center;
`;

const IconWrapper = styled.div<{ $variant?: 'warning' | 'success' | 'default' }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${props => props.$variant === 'success'
    ? 'rgba(34, 197, 94, 0.2)'
    : 'rgba(139, 92, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$variant === 'success'
    ? 'rgba(34, 197, 94, 1)'
    : 'rgba(236, 72, 153, 1)'};
  
  svg {
    width: 32px;
    height: 32px;
  }
`;

const NotificationTitle = styled.h2<{ $variant?: 'warning' | 'success' | 'default' }>`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: ${props => props.$variant === 'success'
    ? 'rgba(34, 197, 94, 1)'
    : 'rgba(236, 72, 153, 1)'};
  margin: 0;
`;

const NotificationMessage = styled.p<{ $variant?: 'warning' | 'success' | 'default' }>`
  font-size: ${theme.fontSize.base};
  color: ${props => props.$variant === 'warning'
    ? 'rgba(200, 200, 200, 1)'
    : props.$variant === 'success'
      ? 'rgba(180, 220, 200, 1)'
      : 'rgba(200, 200, 200, 1)'};
  margin: 0;
  line-height: 1.6;
`;

const NotificationButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  width: 100%;
  margin-top: ${theme.spacing.md};
`;

const NotificationButton = styled.button<{ $variant?: 'warning' | 'success' | 'default' }>`
  flex: 1;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: ${props => props.$variant === 'warning'
    ? 'linear-gradient(135deg, rgba(150, 150, 150, 0.8) 0%, rgba(120, 120, 120, 0.8) 100%)'
    : props.$variant === 'success'
      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%)'
      : 'linear-gradient(135deg, rgba(236, 72, 153, 0.9) 0%, rgba(219, 39, 119, 0.9) 100%)'};
  border: 1px solid ${props => props.$variant === 'warning'
    ? 'rgba(150, 150, 150, 0.5)'
    : props.$variant === 'success'
      ? 'rgba(34, 197, 94, 0.5)'
      : 'rgba(236, 72, 153, 0.5)'};
  border-radius: ${theme.borderRadius.lg};
  color: #ffffff;
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  
  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'warning'
    ? 'linear-gradient(135deg, rgba(150, 150, 150, 1) 0%, rgba(120, 120, 120, 1) 100%)'
    : props.$variant === 'success'
      ? 'linear-gradient(135deg, rgba(34, 197, 94, 1) 0%, rgba(22, 163, 74, 1) 100%)'
      : 'linear-gradient(135deg, rgba(236, 72, 153, 1) 0%, rgba(219, 39, 119, 1) 100%)'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const NotificationCancelButton = styled.button<{ $variant?: 'warning' | 'success' | 'default' }>`
  flex: 1;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.lg};
  color: rgba(200, 200, 200, 1);
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(240, 240, 240, 1);
  }
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
  const { t } = useTranslation();
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {

    }
  }, [isOpen, characterName, subscriptionType, userCoins]);

  if (!isOpen) return null;

  const normalizedSubscriptionType = subscriptionType?.toLowerCase() || 'free';
  const isFree = normalizedSubscriptionType === 'free';
  const isStandard = normalizedSubscriptionType === 'standard';
  const isPremium = normalizedSubscriptionType === 'premium';

  const handleUnlock = async () => {
    if (isPurchasing) return;

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

  // Для FREE пользователей - показываем предупреждение о необходимости подписки
  if (isFree) {
    return (
      <>
        <NotificationOverlay onClick={onClose} />
        <NotificationContainer $isClosing={false}>
          <NotificationContent $variant="success">
            <IconWrapper $variant="success">
              <UnlockIcon />
            </IconWrapper>
            <NotificationTitle $variant="success">{t('album.purchase.title')}</NotificationTitle>
            <NotificationMessage $variant="success">
              {t('album.purchase.onlyForSubscribers')}
            </NotificationMessage>
            <NotificationMessage $variant="success">
              {t('album.purchase.standardPremiumRequired')}
            </NotificationMessage>
            <NotificationButtonGroup>
              <NotificationButton onClick={handleShopClick} $variant="success">
                <ShopIcon />
                {t('album.purchase.subscribe')}
              </NotificationButton>
              <NotificationCancelButton onClick={onClose}>
                {t('common.cancel')}
              </NotificationCancelButton>
            </NotificationButtonGroup>
          </NotificationContent>
        </NotificationContainer>
      </>
    );
  }

  // Для STANDARD и PREMIUM пользователей - показываем, что альбом бесплатен
  if (isStandard || isPremium) {
    return (
      <>
        <NotificationOverlay onClick={onClose} />
        <NotificationContainer $isClosing={false}>
          <NotificationContent $variant="success">
            <IconWrapper $variant="success">
              <UnlockIcon />
            </IconWrapper>
            <NotificationTitle $variant="success">{t('album.purchase.unlockTitle')}</NotificationTitle>
            <NotificationMessage $variant="success">
              {t('album.purchase.standardPremiumFree', { name: characterName, type: subscriptionType.toUpperCase() })}
              {t('album.purchase.clickUnlock')}
            </NotificationMessage>
            <NotificationButtonGroup>
              <NotificationButton
                onClick={handleUnlock}
                disabled={isPurchasing || isLoading}
                $variant="success"
              >
                {isPurchasing || isLoading ? t('album.purchase.unlocking') : t('album.purchase.unlock')}
              </NotificationButton>
              <NotificationCancelButton onClick={onClose}>
                {t('common.cancel')}
              </NotificationCancelButton>
            </NotificationButtonGroup>
          </NotificationContent>
        </NotificationContainer>
      </>
    );
  }

  // Не должно показываться для других случаев
  return null;
};
