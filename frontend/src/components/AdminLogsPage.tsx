import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';

interface AdminLogsPageProps {
  onBackToMain: () => void;
}

interface AdminStats {
  total_visits: number;
  new_registrations: number;
  new_users_24h: number;
  new_users_7d: number;
  subscriptions_purchased: number;
  subscriptions: {
    free: number;
    standard: number;
    premium: number;
    total_paid: number;
  };
  registrations_by_country: Array<{
    country: string;
    count: number;
  }>;
  content: {
    total_characters: number;
    total_images: number;
    total_messages: number;
  };
  activity: {
    active_users_24h: number;
  };
  economy: {
    total_coins: number;
  };
}

const PageContainer = styled.div`
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  padding: 2rem;
  color: #ffffff;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.md};
  color: #ffffff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ResetButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: ${theme.borderRadius.md};
  color: #ef4444;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div<{ $highlight?: boolean }>`
  background: ${props => props.$highlight 
    ? 'rgba(167, 139, 250, 0.1)' 
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$highlight 
    ? 'rgba(167, 139, 250, 0.3)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.borderRadius.lg};
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.lg};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #ffffff;
`;

const CountryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CountryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.borderRadius.md};
`;

const CountryName = styled.span`
  color: #ffffff;
  font-weight: 500;
`;

const CountryCount = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
`;

const LoadingText = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 2rem;
`;

const ErrorText = styled.div`
  text-align: center;
  color: #ff6b6b;
  padding: 2rem;
`;

const SectionSubtitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 500;
  margin: 1.5rem 0 1rem 0;
  color: rgba(255, 255, 255, 0.8);
`;

export const AdminLogsPage: React.FC<AdminLogsPageProps> = ({ onBackToMain }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await authManager.fetchWithAuth('/api/v1/admin/stats/');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Доступ запрещен. Только для администраторов.');
        } else {
          setError('Ошибка загрузки статистики');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('[ADMIN LOGS] Error fetching stats:', err);
      setError('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirm('ВНИМАНИЕ! Это удалит всех пользователей кроме админов. Вы уверены?')) {
      return;
    }

    if (!confirm('Это необратимая операция! Подтвердите еще раз.')) {
      return;
    }

    try {
      setIsResetting(true);
      const response = await authManager.fetchWithAuth('/api/v1/admin/reset-stats/', {
        method: 'POST'
      });

      if (response.ok) {
        alert('Статистика успешно сброшена');
        await fetchStats();
      } else {
        const data = await response.json();
        alert(`Ошибка: ${data.detail || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('[ADMIN LOGS] Error resetting stats:', err);
      alert('Ошибка сброса статистики');
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={onBackToMain}>← Назад</BackButton>
        <Title>Панель администратора</Title>
        <ResetButton onClick={handleResetStats} disabled={isResetting}>
          {isResetting ? 'Сброс...' : 'Сбросить статистику'}
        </ResetButton>
      </Header>

      {loading && <LoadingText>Загрузка статистики...</LoadingText>}
      {error && <ErrorText>{error}</ErrorText>}

      {stats && !loading && !error && (
        <>
          <SectionSubtitle>Пользователи</SectionSubtitle>
          <StatsGrid>
            <StatCard>
              <StatLabel>Всего пользователей</StatLabel>
              <StatValue>{stats.total_visits}</StatValue>
            </StatCard>
            <StatCard $highlight>
              <StatLabel>Новых за 24 часа</StatLabel>
              <StatValue>{stats.new_users_24h}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Новых за 7 дней</StatLabel>
              <StatValue>{stats.new_users_7d}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Активных за 24 часа</StatLabel>
              <StatValue>{stats.activity.active_users_24h}</StatValue>
            </StatCard>
          </StatsGrid>

          <SectionSubtitle>Подписки</SectionSubtitle>
          <StatsGrid>
            <StatCard $highlight>
              <StatLabel>Платных подписок</StatLabel>
              <StatValue>{stats.subscriptions.total_paid}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>FREE</StatLabel>
              <StatValue>{stats.subscriptions.free}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>STANDARD</StatLabel>
              <StatValue>{stats.subscriptions.standard}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>PREMIUM</StatLabel>
              <StatValue>{stats.subscriptions.premium}</StatValue>
            </StatCard>
          </StatsGrid>

          <SectionSubtitle>Контент</SectionSubtitle>
          <StatsGrid>
            <StatCard>
              <StatLabel>Создано персонажей</StatLabel>
              <StatValue>{stats.content.total_characters}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Сгенерировано изображений</StatLabel>
              <StatValue>{stats.content.total_images}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Сообщений в чате</StatLabel>
              <StatValue>{stats.content.total_messages}</StatValue>
            </StatCard>
            <StatCard>
              <StatLabel>Монет в системе</StatLabel>
              <StatValue>{stats.economy.total_coins}</StatValue>
            </StatCard>
          </StatsGrid>

          {stats.registrations_by_country.length > 0 && (
            <Section>
              <SectionTitle>Регистрации по странам</SectionTitle>
              <CountryList>
                {stats.registrations_by_country.map((item, index) => (
                  <CountryItem key={index}>
                    <CountryName>{item.country || 'Неизвестно'}</CountryName>
                    <CountryCount>{item.count}</CountryCount>
                  </CountryItem>
                ))}
              </CountryList>
            </Section>
          )}
        </>
      )}
    </PageContainer>
  );
};
