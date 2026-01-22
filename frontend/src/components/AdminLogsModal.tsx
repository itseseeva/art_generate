import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { X } from 'lucide-react';

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
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.gradients.card};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  box-shadow: ${theme.colors.shadow.card};
  border: 1px solid ${theme.colors.border.accent};
  max-width: 600px;
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
  cursor: pointer;
  color: ${theme.colors.text.muted};
  transition: ${theme.transition.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

const LoadingText = styled.div`
  color: ${theme.colors.text.muted};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const ErrorText = styled.div`
  color: ${theme.colors.error};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

interface AdminLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminStats {
  subscriptions_purchased: number;
  new_users_24h: number;
  new_users_7d: number;
  subscriptions: {
    free: number;
    standard: number;
    premium: number;
    total_paid: number;
  };
}

export const AdminLogsModal: React.FC<AdminLogsModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authManager.fetchWithAuth('/api/v1/admin/stats/');
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Статистика</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </ModalHeader>

        {loading && <LoadingText>Загрузка...</LoadingText>}
        
        {error && <ErrorText>{error}</ErrorText>}

        {stats && !loading && !error && (
          <>
            <StatsSection>
              <StatsTitle>Подписки</StatsTitle>
              <StatsGrid>
                <StatItem>
                  <StatValue>{stats.subscriptions_purchased}</StatValue>
                  <StatLabel>Куплено подписок</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{stats.subscriptions.standard}</StatValue>
                  <StatLabel>Standard</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{stats.subscriptions.premium}</StatValue>
                  <StatLabel>Premium</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{stats.subscriptions.free}</StatValue>
                  <StatLabel>Free</StatLabel>
                </StatItem>
              </StatsGrid>
            </StatsSection>

            <StatsSection>
              <StatsTitle>Новые пользователи</StatsTitle>
              <StatsGrid>
                <StatItem>
                  <StatValue>{stats.new_users_24h}</StatValue>
                  <StatLabel>За последние 24 часа</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{stats.new_users_7d}</StatValue>
                  <StatLabel>За последние 7 дней</StatLabel>
                </StatItem>
              </StatsGrid>
            </StatsSection>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
