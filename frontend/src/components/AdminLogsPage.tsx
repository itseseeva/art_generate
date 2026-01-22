/**
 * Страница логов для администраторов.
 * Показывает статистику: новые пользователи (24ч, 7д), куплено подписок.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { authManager } from '../utils/auth';
import { FiArrowLeft, FiBarChart2 } from 'react-icons/fi';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
  position: relative;
`;

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.xl};
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
`;

const PageTitle = styled.h1`
  font-size: ${theme.fontSize['3xl']};
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin: 0 0 ${theme.spacing.lg} 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
  background: rgba(50, 50, 50, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.4);
  border-radius: ${theme.borderRadius.lg};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(60, 60, 60, 0.9);
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const StatsCard = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: ${theme.fontSize.base};

  &:last-child {
    border-bottom: none;
  }
`;

const StatLabel = styled.span`
  color: rgba(200, 200, 200, 1);
`;

const StatValue = styled.span`
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
`;

interface AdminLogsPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onProfile?: () => void;
}

interface AdminStats {
  new_users_24h: number;
  new_users_7d: number;
  subscriptions_purchased: number;
}

export const AdminLogsPage: React.FC<AdminLogsPageProps> = ({
  onBackToMain,
  onShop,
  onProfile,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authManager.fetchWithAuth('/api/v1/admin/stats');
      if (!response.ok) {
        if (response.status === 403) {
          setError('Доступ запрещён. Только для администраторов.');
        } else {
          const data = await response.json().catch(() => ({}));
          setError((data.detail as string) || `Ошибка ${response.status}`);
        }
        setStats(null);
        return;
      }
      const data = await response.json();
      setStats({
        new_users_24h: data.new_users_24h ?? 0,
        new_users_7d: data.new_users_7d ?? 0,
        subscriptions_purchased: data.subscriptions_purchased ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить статистику');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <MainContainer>
      <GlobalHeader
        onShop={onShop}
        onProfile={onProfile}
        onHome={onBackToMain}
      />
      <ContentContainer>
        <BackButton type="button" onClick={onBackToMain}>
          <FiArrowLeft size={20} />
          Назад
        </BackButton>
        <PageTitle>
          <FiBarChart2 size={32} />
          Логи
        </PageTitle>

        {isLoading && (
          <LoadingSpinner size="lg" text="Загрузка..." />
        )}
        {!isLoading && error && (
          <ErrorMessage message={error} />
        )}
        {!isLoading && !error && stats && (
          <StatsCard>
            <StatRow>
              <StatLabel>Новых пользователей (24 ч)</StatLabel>
              <StatValue>{stats.new_users_24h}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>Новых пользователей (7 дней)</StatLabel>
              <StatValue>{stats.new_users_7d}</StatValue>
            </StatRow>
            <StatRow>
              <StatLabel>Куплено подписок</StatLabel>
              <StatValue>{stats.subscriptions_purchased}</StatValue>
            </StatRow>
          </StatsCard>
        )}
      </ContentContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
    </MainContainer>
  );
};
