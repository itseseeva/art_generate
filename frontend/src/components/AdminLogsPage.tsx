/**
 * Страница логов для администраторов.
 * Показывает статистику: новые пользователи (24ч, 7д), куплено подписок.
 * Таблица пользователей с детальной информацией.
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

const TableCard = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin-top: ${theme.spacing.lg};
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${theme.fontSize.sm};
`;

const TableHeader = styled.thead`
  background: rgba(40, 40, 40, 0.8);
`;

const TableHeaderCell = styled.th`
  padding: ${theme.spacing.md};
  text-align: left;
  color: rgba(240, 240, 240, 1);
  font-weight: 600;
  border-bottom: 2px solid rgba(100, 100, 100, 0.3);
  white-space: nowrap;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(50, 50, 50, 0.5);
  }
`;

const TableCell = styled.td`
  padding: ${theme.spacing.md};
  color: rgba(220, 220, 220, 1);
  vertical-align: middle;
`;

const TableTitle = styled.h2`
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0 0 ${theme.spacing.md} 0;
`;

interface AdminLogsPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onProfile?: () => void;
}

interface UserTableItem {
  id: number;
  user: string;
  username?: string;
  email?: string;
  messages_count: number;
  subscription_type: string;
  photos_count: number;
  last_login: string | null;
}

interface AdminStats {
  new_users_24h: number;
  new_users_7d: number;
  subscriptions_purchased: number;
  new_registrations?: number;
  subscriptions_all_time?: {
    total_paid: number;
    standard: number;
    premium: number;
    pro: number;
  };
}

export const AdminLogsPage: React.FC<AdminLogsPageProps> = ({
  onBackToMain,
  onShop,
  onProfile,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersTable, setUsersTable] = useState<UserTableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

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
        new_registrations: data.new_registrations ?? 0,
        subscriptions_all_time: data.subscriptions_all_time ?? {
          total_paid: 0,
          standard: 0,
          premium: 0,
          pro: 0,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить статистику');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUsersTable = useCallback(async () => {
    setIsLoadingTable(true);
    setTableError(null);
    try {
      const response = await authManager.fetchWithAuth('/api/v1/admin/users-table?limit=1000');
      if (!response.ok) {
        if (response.status === 403) {
          console.error('[AdminLogs] Доступ запрещён для таблицы пользователей');
          setTableError('Доступ запрещён. Только для администраторов.');
          setUsersTable([]);
          return;
        }
        const errorText = await response.text();
        console.error(`[AdminLogs] Ошибка загрузки таблицы пользователей: ${response.status} - ${errorText}`);
        setTableError(`Ошибка загрузки: ${response.status}`);
        setUsersTable([]);
        return;
      }
      const data = await response.json();
      console.log('[AdminLogs] Загружено пользователей:', data.users?.length || 0);
      setUsersTable(data.users ?? []);
      setTableError(null);
    } catch (e) {
      console.error('[AdminLogs] Исключение при загрузке таблицы пользователей:', e);
      setTableError(e instanceof Error ? e.message : 'Не удалось загрузить таблицу');
      setUsersTable([]);
    } finally {
      setIsLoadingTable(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUsersTable();
  }, [loadStats, loadUsersTable]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Никогда';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Неизвестно';
    }
  };

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
          <>
            <StatsCard>
              <StatRow>
                <StatLabel>Новых пользователей за 24 часа</StatLabel>
                <StatValue>{stats.new_users_24h}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Новых пользователей за всё время</StatLabel>
                <StatValue>{stats.new_registrations ?? 0}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Зарегистрировалось за всё время</StatLabel>
                <StatValue>{stats.new_registrations ?? 0}</StatValue>
              </StatRow>
              <StatRow>
                <StatLabel>Куплено подписок (активные)</StatLabel>
                <StatValue>{stats.subscriptions_purchased}</StatValue>
              </StatRow>
              {stats.subscriptions_all_time && (
                <>
                  <StatRow>
                    <StatLabel>Купило подписку за всё время (всего)</StatLabel>
                    <StatValue>{stats.subscriptions_all_time.total_paid}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>Купило STANDARD за всё время</StatLabel>
                    <StatValue>{stats.subscriptions_all_time.standard}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>Купило PREMIUM за всё время</StatLabel>
                    <StatValue>{stats.subscriptions_all_time.premium}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatLabel>Купило PRO за всё время</StatLabel>
                    <StatValue>{stats.subscriptions_all_time.pro}</StatValue>
                  </StatRow>
                </>
              )}
            </StatsCard>

            <TableCard>
              <TableTitle>Таблица пользователей</TableTitle>
              {isLoadingTable ? (
                <LoadingSpinner size="md" text="Загрузка таблицы..." />
              ) : tableError ? (
                <ErrorMessage message={tableError} />
              ) : (
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHeaderCell>Пользователь</TableHeaderCell>
                      <TableHeaderCell>Сообщений</TableHeaderCell>
                      <TableHeaderCell>Подписка</TableHeaderCell>
                      <TableHeaderCell>Фото</TableHeaderCell>
                      <TableHeaderCell>Последний вход</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {usersTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} style={{ textAlign: 'center', padding: theme.spacing.xl }}>
                          Нет данных
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersTable.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.user}</TableCell>
                          <TableCell>{user.messages_count}</TableCell>
                          <TableCell>{user.subscription_type}</TableCell>
                          <TableCell>{user.photos_count}</TableCell>
                          <TableCell>{formatDate(user.last_login)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TableCard>
          </>
        )}
      </ContentContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
    </MainContainer>
  );
};
