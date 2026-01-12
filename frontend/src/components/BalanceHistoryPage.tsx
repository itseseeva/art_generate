import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { authManager } from '../utils/auth';
import { FiArrowLeft, FiDollarSign } from 'react-icons/fi';
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

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const HistoryItem = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: rgba(150, 150, 150, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const HistoryItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  flex: 1;
`;

const HistoryItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${theme.spacing.xs};
`;

const ReasonText = styled.div`
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
`;

const DateText = styled.div`
  font-size: ${theme.fontSize.sm};
  color: rgba(160, 160, 160, 1);
`;

const AmountText = styled.div<{ $isNegative: boolean }>`
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  color: ${props => props.$isNegative ? 'rgba(255, 100, 100, 1)' : 'rgba(100, 255, 100, 1)'};
`;

const BalanceText = styled.div`
  font-size: ${theme.fontSize.sm};
  color: rgba(180, 180, 180, 1);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.lg};
`;

interface BalanceHistoryItem {
  id: number;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

interface BalanceHistoryPageProps {
  onBackToMain?: () => void;
  onShop?: () => void;
  onProfile?: () => void;
}

export const BalanceHistoryPage: React.FC<BalanceHistoryPageProps> = ({
  onBackToMain,
  onShop,
  onProfile,
}) => {
  const [history, setHistory] = useState<BalanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadBalanceHistory();
  }, []);

  const loadBalanceHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = authManager.getToken();
      if (!token) {
        setError('Необходима авторизация');
        setIsLoading(false);
        return;
      }

      const response = await authManager.fetchWithAuth('/api/v1/balance/history?skip=0&limit=1000');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Необходима авторизация');
        } else {
          setError('Ошибка загрузки истории баланса');
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      // Обрабатываем разные форматы ответа API
      if (Array.isArray(data)) {
        setHistory(data);
        setTotal(data.length);
      } else if (data.history) {
        setHistory(Array.isArray(data.history) ? data.history : []);
        setTotal(data.total || (Array.isArray(data.history) ? data.history.length : 0));
      } else if (data.items) {
        setHistory(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total || (Array.isArray(data.items) ? data.items.length : 0));
      } else {
        setHistory([]);
        setTotal(0);
      }
    } catch (err) {
      
      setError('Ошибка загрузки истории баланса');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <MainContainer>
      <GlobalHeader
        onShop={onShop}
        onProfile={onProfile}
      />
      <ContentContainer>
        <PageTitle>
          <FiDollarSign size={32} />
          Списания
        </PageTitle>

        {isLoading ? (
          <LoadingSpinner size="lg" text="Загрузка списаний..." />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : history.length === 0 ? (
          <EmptyState>Списания отсутствуют</EmptyState>
        ) : (
          <>
            <div style={{ marginBottom: theme.spacing.lg, color: 'rgba(160, 160, 160, 1)', fontSize: theme.fontSize.sm }}>
              Всего записей: {total}
            </div>
            <HistoryList>
              {history.map((item) => (
                <HistoryItem key={item.id}>
                  <HistoryItemLeft>
                    <ReasonText>{item.reason}</ReasonText>
                    <DateText>{formatDate(item.created_at)}</DateText>
                  </HistoryItemLeft>
                  <HistoryItemRight>
                    <AmountText $isNegative={item.amount < 0}>
                      {item.amount > 0 ? '+' : ''}{item.amount} кредитов
                    </AmountText>
                    <BalanceText>
                      {item.balance_before} → {item.balance_after} кредитов
                    </BalanceText>
                  </HistoryItemRight>
                </HistoryItem>
              ))}
            </HistoryList>
          </>
        )}
      </ContentContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
    </MainContainer>
  );
};
