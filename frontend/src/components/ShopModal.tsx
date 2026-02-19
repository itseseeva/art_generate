import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.gradients.card};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.colors.shadow.card};
  border: 1px solid ${theme.colors.border.accent};
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const ModalTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: ${theme.fontSize.xl};
  cursor: pointer;
  color: ${theme.colors.text.muted};
  transition: ${theme.transition.fast};
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const StatsSection = styled.div`
  background: ${theme.colors.background.tertiary};
  border: 1px solid ${theme.colors.border.accent};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const StatsTitle = styled.h4`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
`;

const StatLabel = styled.div`
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

const SubscriptionSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h4`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
`;

const SubscriptionPlans = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
`;

const PlanCard = styled.div<{ $isPopular?: boolean; $popularText?: string }>`
  background: ${theme.colors.background.secondary};
  border: 2px solid ${props => props.$isPopular
    ? theme.colors.accent.primary
    : theme.colors.border.primary
  };
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  text-align: center;
  position: relative;
  transition: ${theme.transition.fast};
  
  &:hover {
    border-color: ${theme.colors.accent.primary};
    transform: translateY(-2px);
  }
  
  ${props => props.$isPopular && `
    &::before {
      content: '${props.$popularText}';
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: ${theme.colors.accent.primary};
      color: ${theme.colors.text.primary};
      padding: ${theme.spacing.xs} ${theme.spacing.sm};
      border-radius: ${theme.borderRadius.md};
      font-size: ${theme.fontSize.xs};
      font-weight: 600;
    }
  `}
`;

const PlanName = styled.h5`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
`;

const PlanPrice = styled.div`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin-bottom: ${theme.spacing.md};
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: ${theme.spacing.lg};
`;

const PlanFeature = styled.li`
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.sm};
  margin-bottom: ${theme.spacing.xs};
  
  &::before {
    content: '✓';
    color: ${theme.colors.accent.primary};
    margin-right: ${theme.spacing.sm};
  }
`;

const ActivateButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    background: ${theme.colors.gradients.buttonHover};
    box-shadow: ${theme.colors.shadow.button};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.sm};
  text-align: center;
`;

interface SubscriptionStats {
  used_credits: number;
  total_credits: number;
  used_photos: number;
  total_photos: number;
  days_left: number;
}

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onActivateSubscription: (type: string) => Promise<void>;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onActivateSubscription
}) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadSubscriptionStats();
    }
  }, [isOpen, isAuthenticated]);

  const loadSubscriptionStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/v1/subscription/stats/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {

    }
  };

  const handleActivateSubscription = async (subscriptionType: string) => {
    if (!isAuthenticated) {
      setError(t('shop.errors.loginRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onActivateSubscription(subscriptionType);
      await loadSubscriptionStats(); // Обновляем статистику
    } catch (error) {
      setError(error instanceof Error ? error.message : t('shop.errors.activationError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{t('nav.shop')}</ModalTitle>
          <CloseButton onClick={handleClose}>×</CloseButton>
        </ModalHeader>

        {isAuthenticated && stats && (
          <StatsSection>
            <StatsTitle>{t('shop.stats.title')}</StatsTitle>
            <StatsGrid>
              <StatItem>
                <StatValue>{stats.used_credits || 0}</StatValue>
                <StatLabel>{t('shop.stats.usedCredits')}</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{stats.total_credits || 100}</StatValue>
                <StatLabel>{t('shop.stats.totalCredits')}</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{stats.used_photos || 0}</StatValue>
                <StatLabel>{t('shop.stats.usedPhotos')}</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{stats.total_photos || 10}</StatValue>
                <StatLabel>{t('shop.stats.totalPhotos')}</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{stats.days_left || 30}</StatValue>
                <StatLabel>{t('shop.stats.daysLeft')}</StatLabel>
              </StatItem>
            </StatsGrid>
          </StatsSection>
        )}

        <SubscriptionSection>
          <SectionTitle>{t('shop.plans.title')}</SectionTitle>
          <SubscriptionPlans>
            <PlanCard>
              <PlanName>{t('shop.plans.basic.name')}</PlanName>
              <PlanPrice>299₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>{t('shop.plans.basic.features.credits')}</PlanFeature>
                <PlanFeature>{t('shop.plans.basic.features.photos')}</PlanFeature>
                <PlanFeature>{t('shop.plans.basic.features.characters')}</PlanFeature>
                <PlanFeature>{t('shop.plans.basic.features.support')}</PlanFeature>
              </PlanFeatures>
              <ActivateButton
                onClick={() => handleActivateSubscription('basic')}
                disabled={isLoading}
              >
                {isLoading ? t('shop.buttons.activating') : t('shop.buttons.activate')}
              </ActivateButton>
            </PlanCard>

            <PlanCard $isPopular $popularText={t('shop.popular')}>
              <PlanName>{t('shop.plans.premium.name')}</PlanName>
              <PlanPrice>1299₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>{t('shop.plans.premium.features.credits')}</PlanFeature>
                <PlanFeature>{t('shop.plans.premium.features.photos')}</PlanFeature>
                <PlanFeature>{t('shop.plans.premium.features.characters')}</PlanFeature>
                <PlanFeature>{t('shop.plans.premium.features.support')}</PlanFeature>
                <PlanFeature>{t('shop.plans.premium.features.exclusive')}</PlanFeature>
              </PlanFeatures>
              <ActivateButton
                onClick={() => handleActivateSubscription('premium')}
                disabled={isLoading}
              >
                {isLoading ? t('shop.buttons.activating') : t('shop.buttons.activate')}
              </ActivateButton>
            </PlanCard>

            <PlanCard>
              <PlanName>{t('shop.plans.vip.name')}</PlanName>
              <PlanPrice>999₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>{t('shop.plans.vip.features.credits')}</PlanFeature>
                <PlanFeature>{t('shop.plans.vip.features.characters')}</PlanFeature>
                <PlanFeature>{t('shop.plans.vip.features.manager')}</PlanFeature>
                <PlanFeature>{t('shop.plans.vip.features.earlyAccess')}</PlanFeature>
                <PlanFeature>{t('shop.plans.vip.features.custom')}</PlanFeature>
              </PlanFeatures>
              <ActivateButton
                onClick={() => handleActivateSubscription('vip')}
                disabled={isLoading}
              >
                {isLoading ? t('shop.buttons.activating') : t('shop.buttons.activate')}
              </ActivateButton>
            </PlanCard>
          </SubscriptionPlans>
        </SubscriptionSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </ModalContent>
    </ModalOverlay>
  );
};
