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
import { FiArrowLeft, FiBarChart2, FiX } from 'react-icons/fi';
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

const TableRow = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  transition: background 0.2s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.xl};
`;

const ModalContent = styled.div`
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 1400px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ModalBody = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const PhotosColumn = styled.div`
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  overflow-y: auto;
  padding-right: ${theme.spacing.md};
  border-right: 1px solid rgba(100, 100, 100, 0.3);
`;

const MessagesColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 0;
`;

const ColumnTitle = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0 0 ${theme.spacing.md} 0;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
  position: sticky;
  top: 0;
  background: rgba(30, 30, 30, 0.95);
  z-index: 10;
`;

const PhotoCard = styled.div`
  background: rgba(40, 40, 40, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(50, 50, 50, 0.9);
    border-color: rgba(139, 92, 246, 0.4);
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: auto;
  max-height: 300px;
  object-fit: contain;
  border-radius: ${theme.borderRadius.sm};
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`;

const PhotoMeta = styled.div`
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.sm};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(100, 100, 100, 0.3);
`;

const ModalTitle = styled.h2`
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0;
`;

const CloseButton = styled.button`
  background: rgba(50, 50, 50, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.4);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  cursor: pointer;
  font-size: ${theme.fontSize.base};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(60, 60, 60, 0.9);
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

const MessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const MessageItem = styled.div<{ $isUser?: boolean }>`
  background: ${props => props.$isUser
    ? 'rgba(139, 92, 246, 0.08)'
    : 'rgba(50, 50, 50, 0.5)'};
  border: 1px solid ${props => props.$isUser
    ? 'rgba(139, 92, 246, 0.25)'
    : 'rgba(100, 100, 100, 0.3)'};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-left: 3px solid ${props => props.$isUser
    ? 'rgba(139, 92, 246, 0.7)'
    : 'transparent'};
  line-height: 1.5;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.sm};
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
`;

const CharacterName = styled.span`
  font-weight: 600;
  color: rgba(139, 92, 246, 1);
  font-size: ${theme.fontSize.sm};
`;

const MessageDate = styled.span`
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.xs};
  white-space: nowrap;
`;

const MessageContent = styled.div`
  color: rgba(220, 220, 220, 1);
  font-size: ${theme.fontSize.sm};
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: ${theme.spacing.sm};
  line-height: 1.55;
`;



const MessageType = styled.span<{ $isUser?: boolean }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  background: ${props => props.$isUser
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(100, 100, 100, 0.3)'};
  color: ${props => props.$isUser
    ? 'rgba(167, 139, 250, 1)'
    : 'rgba(200, 200, 200, 1)'};
  margin-bottom: ${theme.spacing.xs};
`;

const CharacterSection = styled.div`
  margin-bottom: ${theme.spacing.xl};
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  background: rgba(20, 20, 20, 0.5);
`;

const CharacterSectionHeader = styled.div<{ $isExpanded: boolean }>`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(40, 40, 40, 0.8);
  border-bottom: ${props => props.$isExpanded ? '1px solid rgba(100, 100, 100, 0.3)' : 'none'};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(50, 50, 50, 0.9);
  }
`;

const CharacterHeaderInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const CharacterHeaderTitle = styled.div`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: rgba(139, 92, 246, 1);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CharacterHeaderStats = styled.div`
  font-size: ${theme.fontSize.sm};
  color: rgba(160, 160, 160, 1);
`;

const ExpandIcon = styled.span<{ $isExpanded: boolean }>`
  font-size: ${theme.fontSize.xl};
  color: rgba(200, 200, 200, 1);
  transition: transform 0.2s ease;
  transform: ${props => props.$isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const CharacterMessagesContainer = styled.div<{ $isExpanded: boolean }>`
  display: ${props => props.$isExpanded ? 'block' : 'none'};
  padding: ${theme.spacing.lg};
  max-height: 600px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(139, 92, 246, 0.5);
    }
  }
`;

const ConversationDivider = styled.div`
  display: flex;
  align-items: center;
  margin: ${theme.spacing.lg} 0;
  gap: ${theme.spacing.md};
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      rgba(139, 92, 246, 0.3),
      transparent
    );
  }
`;

const ConversationDividerText = styled.span`
  font-size: ${theme.fontSize.xs};
  color: rgba(139, 92, 246, 0.7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
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
  purchased_booster?: boolean;
  subscription?: {
    type: string;
    images_limit: number;
    images_used: number;
    voice_limit: number;
    voice_used: number;
  } | null;
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [userMessages, setUserMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());

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
          setTableError('Доступ запрещён. Только для администраторов.');
          setUsersTable([]);
          return;
        }
        const errorText = await response.text();
        setTableError(`Ошибка загрузки: ${response.status}`);
        setUsersTable([]);
        return;
      }
      const data = await response.json();
      setUsersTable(data.users ?? []);
      setTableError(null);
    } catch (e) {
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

  const loadUserMessages = useCallback(async (userId: number, username: string) => {
    setIsLoadingMessages(true);
    setMessagesError(null);
    setSelectedUserId(userId);
    setSelectedUsername(username);

    try {
      const response = await authManager.fetchWithAuth(`/api/v1/admin/users/${userId}/messages?limit=1000`);
      if (!response.ok) {
        if (response.status === 403) {
          setMessagesError('Доступ запрещён. Только для администраторов.');
        } else {
          const data = await response.json().catch(() => ({}));
          setMessagesError((data.detail as string) || `Ошибка ${response.status}`);
        }
        setUserMessages([]);
        return;
      }
      const data = await response.json();
      setUserMessages(data.messages || []);
      setMessagesError(null);
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : 'Не удалось загрузить сообщения');
      setUserMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleUserClick = (user: UserTableItem) => {
    loadUserMessages(user.id, user.user);
  };

  const closeModal = () => {
    setSelectedUserId(null);
    setSelectedUsername('');
    setUserMessages([]);
    setMessagesError(null);
    setExpandedCharacters(new Set());
  };

  const toggleCharacterSection = (characterName: string) => {
    setExpandedCharacters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(characterName)) {
        newSet.delete(characterName);
      } else {
        newSet.add(characterName);
      }
      return newSet;
    });
  };

  // Group messages by character
  const groupMessagesByCharacter = (messages: any[]) => {
    const grouped: Record<string, any[]> = {};

    messages.forEach(msg => {
      const characterName = msg.character_name || 'Неизвестный персонаж';
      if (!grouped[characterName]) {
        grouped[characterName] = [];
      }
      grouped[characterName].push(msg);
    });

    return grouped;
  };

  // Check if there's a significant time gap between messages (more than 1 hour)
  const hasTimeGap = (msg1: any, msg2: any): boolean => {
    if (!msg1.created_at || !msg2.created_at) return false;
    const time1 = new Date(msg1.created_at).getTime();
    const time2 = new Date(msg2.created_at).getTime();
    const hourInMs = 60 * 60 * 1000;
    return Math.abs(time2 - time1) > hourInMs;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return `${diffMins} мин назад`;
      } else if (diffHours < 24) {
        return `${diffHours} ч назад`;
      } else if (diffDays < 7) {
        return `${diffDays} дн назад`;
      } else {
        return formatDate(dateString);
      }
    } catch {
      return formatDate(dateString);
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
                      <TableHeaderCell>Фото (мес)</TableHeaderCell>
                      <TableHeaderCell>Голос (мес)</TableHeaderCell>
                      <TableHeaderCell>Бустер 69₽</TableHeaderCell>
                      <TableHeaderCell>Последний вход</TableHeaderCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {usersTable.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} style={{ textAlign: 'center', padding: theme.spacing.xl }}>
                          Нет данных
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersTable.map((user) => (
                        <TableRow
                          key={user.id}
                          $clickable={true}
                          onClick={() => handleUserClick(user)}
                        >
                          <TableCell>{user.user}</TableCell>
                          <TableCell>{user.messages_count}</TableCell>
                          <TableCell>
                            <span style={{
                              color: user.subscription_type.toLowerCase() === 'premium' ? '#a78bfa' :
                                user.subscription_type.toLowerCase() === 'standard' ? '#fbbf24' : '#888'
                            }}>
                              {user.subscription_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            {user.subscription ? (
                              <span style={{ color: user.subscription.images_used >= user.subscription.images_limit ? '#ef4444' : '#22c55e' }}>
                                {user.subscription.images_used} / {user.subscription.images_limit}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {user.subscription ? (
                              <span style={{ color: user.subscription.voice_used >= user.subscription.voice_limit ? '#ef4444' : '#22c55e' }}>
                                {user.subscription.voice_used} / {user.subscription.voice_limit}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{user.purchased_booster ? '✅ Да' : '❌ Нет'}</TableCell>
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

      {selectedUserId !== null && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Сообщения пользователя: {selectedUsername}</ModalTitle>
              <CloseButton onClick={closeModal}>
                <FiX size={20} />
              </CloseButton>
            </ModalHeader>

            {isLoadingMessages ? (
              <LoadingSpinner size="md" text="Загрузка сообщений..." />
            ) : messagesError ? (
              <ErrorMessage message={messagesError} />
            ) : userMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: theme.spacing.xl, color: 'rgba(160, 160, 160, 1)' }}>
                Нет сообщений
              </div>
            ) : (() => {
              // Separate photos and text messages
              const photoMessages = userMessages.filter(msg => msg.image_url);
              const groupedMessages = groupMessagesByCharacter(userMessages);
              const characterNames = Object.keys(groupedMessages).sort();

              // Auto-expand all character sections by default
              if (expandedCharacters.size === 0 && characterNames.length > 0) {
                setExpandedCharacters(new Set(characterNames));
              }

              return (
                <ModalBody>
                  {/* Left Column: Photos */}
                  <PhotosColumn>
                    <ColumnTitle>🖼️ Фото генерации ({photoMessages.length})</ColumnTitle>
                    {photoMessages.length === 0 ? (
                      <EmptyState>Нет сгенерированных фото</EmptyState>
                    ) : (
                      photoMessages.map((msg) => (
                        <PhotoCard key={msg.id}>
                          <PhotoImage
                            src={msg.image_url}
                            alt="Сгенерированное фото"
                            onClick={() => window.open(msg.image_url, '_blank', 'noopener')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <PhotoMeta>
                            <span>{msg.character_name || 'Неизвестно'}</span>
                            <span>{formatRelativeTime(msg.created_at)}</span>
                          </PhotoMeta>
                          {msg.generation_time && (
                            <PhotoMeta>
                              <span>⏱️ {msg.generation_time}с</span>
                            </PhotoMeta>
                          )}
                        </PhotoCard>
                      ))
                    )}
                  </PhotosColumn>

                  {/* Right Column: Messages */}
                  <MessagesColumn>
                    <ColumnTitle>💬 Сообщения</ColumnTitle>
                    <MessagesList>
                      {userMessages
                        .filter(msg => !msg.image_url) // Filter out photo messages if they are mixed in
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Sort by date descending (newest first)
                        .map((msg, index, array) => {
                          const currentDate = new Date(msg.created_at).toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });

                          const prevMsg = index > 0 ? array[index - 1] : null;
                          const prevDate = prevMsg
                            ? new Date(prevMsg.created_at).toLocaleDateString('ru-RU', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                            : null;

                          const showDateDivider = currentDate !== prevDate;

                          return (
                            <React.Fragment key={msg.id}>
                              {showDateDivider && (
                                <ConversationDivider>
                                  <ConversationDividerText>
                                    {currentDate}
                                  </ConversationDividerText>
                                </ConversationDivider>
                              )}

                              <MessageItem $isUser={msg.message_type === 'user'}>
                                <MessageHeader>
                                  <div>
                                    <MessageType $isUser={msg.message_type === 'user'}>
                                      {msg.message_type === 'user' ? 'Пользователь' : 'Персонаж'}
                                    </MessageType>
                                    {msg.character_name && (
                                      <span style={{ marginLeft: '8px', color: 'rgba(139, 92, 246, 0.8)', fontSize: '11px', fontWeight: 600 }}>
                                        {msg.character_name}
                                      </span>
                                    )}
                                  </div>
                                  <MessageDate>{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</MessageDate>
                                </MessageHeader>
                                <MessageContent>{msg.message_content || '(пустое сообщение)'}</MessageContent>
                              </MessageItem>
                            </React.Fragment>
                          );
                        })}
                    </MessagesList>
                  </MessagesColumn>
                </ModalBody>
              );
            })()}
          </ModalContent>
        </ModalOverlay>
      )}
    </MainContainer>
  );
};
