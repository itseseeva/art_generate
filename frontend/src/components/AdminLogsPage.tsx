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

interface User {
  id: number;
  email: string;
  username: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  coins: number;
  country: string | null;
  created_at: string | null;
  total_messages_sent: number;
  subscription: {
    type: string;
    status: string;
    used_credits: number;
    used_photos: number;
    monthly_credits: number;
    monthly_photos: number;
  } | null;
}

interface UserDetails {
  user: {
    id: number;
    email: string;
    username: string | null;
    is_active: boolean;
    is_verified: boolean;
    is_admin: boolean;
    coins: number;
    country: string | null;
    registration_ip: string | null;
    fingerprint_id: string | null;
    total_messages_sent: number;
    created_at: string | null;
  };
  subscription: {
    type: string;
    status: string;
    monthly_credits: number;
    monthly_photos: number;
    used_credits: number;
    used_photos: number;
    max_message_length: number;
    activated_at: string | null;
    expires_at: string | null;
  } | null;
  activity: {
    total_messages: number;
    messages_24h: number;
    last_message_at: string | null;
    total_images: number;
    images_24h: number;
    total_characters: number;
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

const SearchInput = styled.input`
  width: 100%;
  max-width: 400px;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.md};
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: rgba(167, 139, 250, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const UsersTable = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  margin-bottom: 2rem;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

const TableRow = styled.div<{ $clickable?: boolean }>`
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    background: ${props => props.$clickable ? 'rgba(167, 139, 250, 0.1)' : 'transparent'};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.div`
  color: #ffffff;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Badge = styled.span<{ $type?: 'success' | 'warning' | 'error' | 'info' }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-block;
  
  ${props => {
    switch(props.$type) {
      case 'success':
        return 'background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3);';
      case 'warning':
        return 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3);';
      case 'error':
        return 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);';
      case 'info':
      default:
        return 'background: rgba(167, 139, 250, 0.2); color: #a78bfa; border: 1px solid rgba(167, 139, 250, 0.3);';
    }
  }}
`;

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
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d3f 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.xl};
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: color 0.2s ease;

  &:hover {
    color: #ffffff;
  }
`;

const DetailSection = styled.div`
  margin-bottom: 1.5rem;
`;

const DetailTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0.75rem;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const DetailItem = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: ${theme.borderRadius.md};
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const DetailLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
  font-size: 1rem;
  color: #ffffff;
  font-weight: 600;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const PageButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.md};
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const AdminLogsPage: React.FC<AdminLogsPageProps> = ({ onBackToMain }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersLimit] = useState(20);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const skip = usersPage * usersLimit;
      const searchParam = usersSearch ? `&search=${encodeURIComponent(usersSearch)}` : '';
      const response = await authManager.fetchWithAuth(
        `/api/v1/admin/users/?skip=${skip}&limit=${usersLimit}${searchParam}`
      );
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки пользователей');
      }

      const data = await response.json();
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (err) {
      console.error('[ADMIN] Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      setUserDetailsLoading(true);
      const response = await authManager.fetchWithAuth(`/api/v1/admin/users/${userId}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки информации о пользователе');
      }

      const data = await response.json();
      setSelectedUser(data);
      setShowUserModal(true);
    } catch (err) {
      console.error('[ADMIN] Error fetching user details:', err);
      alert('Ошибка загрузки информации о пользователе');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [usersPage, usersSearch]);

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

          <SectionSubtitle>Пользователи</SectionSubtitle>
          <SearchInput
            type="text"
            placeholder="Поиск по email или username..."
            value={usersSearch}
            onChange={(e) => {
              setUsersSearch(e.target.value);
              setUsersPage(0);
            }}
          />
          
          {usersLoading ? (
            <LoadingText>Загрузка пользователей...</LoadingText>
          ) : (
            <>
              <UsersTable>
                <TableHeader>
                  <div>Email</div>
                  <div>Username</div>
                  <div>Подписка</div>
                  <div>Монеты</div>
                  <div>Страна</div>
                  <div>Статус</div>
                </TableHeader>
                {users.map(user => (
                  <TableRow 
                    key={user.id} 
                    $clickable={true}
                    onClick={() => fetchUserDetails(user.id)}
                  >
                    <TableCell title={user.email}>{user.email}</TableCell>
                    <TableCell>{user.username || '—'}</TableCell>
                    <TableCell>
                      <Badge $type={
                        user.subscription?.type === 'premium' ? 'success' :
                        user.subscription?.type === 'standard' ? 'info' :
                        'warning'
                      }>
                        {user.subscription?.type?.toUpperCase() || 'FREE'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.coins}</TableCell>
                    <TableCell>{user.country || '—'}</TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge $type="error">ADMIN</Badge>
                      ) : user.is_verified ? (
                        <Badge $type="success">✓</Badge>
                      ) : (
                        <Badge $type="warning">⚠</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </UsersTable>

              <Pagination>
                <PageButton
                  onClick={() => setUsersPage(p => Math.max(0, p - 1))}
                  disabled={usersPage === 0}
                >
                  ← Назад
                </PageButton>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Страница {usersPage + 1} из {Math.ceil(usersTotal / usersLimit) || 1}
                </span>
                <PageButton
                  onClick={() => setUsersPage(p => p + 1)}
                  disabled={(usersPage + 1) * usersLimit >= usersTotal}
                >
                  Вперед →
                </PageButton>
              </Pagination>
            </>
          )}
        </>
      )}

      {showUserModal && selectedUser && (
        <ModalOverlay onClick={() => setShowUserModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedUser.user.email}</ModalTitle>
              <CloseButton onClick={() => setShowUserModal(false)}>×</CloseButton>
            </ModalHeader>

            <DetailSection>
              <DetailTitle>Основная информация</DetailTitle>
              <DetailGrid>
                <DetailItem>
                  <DetailLabel>ID</DetailLabel>
                  <DetailValue>{selectedUser.user.id}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Username</DetailLabel>
                  <DetailValue>{selectedUser.user.username || '—'}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Монеты</DetailLabel>
                  <DetailValue>{selectedUser.user.coins}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Страна</DetailLabel>
                  <DetailValue>{selectedUser.user.country || '—'}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Дата регистрации</DetailLabel>
                  <DetailValue>
                    {selectedUser.user.created_at 
                      ? new Date(selectedUser.user.created_at).toLocaleDateString('ru-RU')
                      : '—'}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>IP регистрации</DetailLabel>
                  <DetailValue>{selectedUser.user.registration_ip || '—'}</DetailValue>
                </DetailItem>
              </DetailGrid>
            </DetailSection>

            {selectedUser.subscription && (
              <DetailSection>
                <DetailTitle>Подписка</DetailTitle>
                <DetailGrid>
                  <DetailItem>
                    <DetailLabel>Тип</DetailLabel>
                    <DetailValue>
                      <Badge $type={
                        selectedUser.subscription.type === 'premium' ? 'success' :
                        selectedUser.subscription.type === 'standard' ? 'info' :
                        'warning'
                      }>
                        {selectedUser.subscription.type.toUpperCase()}
                      </Badge>
                    </DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Статус</DetailLabel>
                    <DetailValue>
                      <Badge $type={selectedUser.subscription.status === 'active' ? 'success' : 'error'}>
                        {selectedUser.subscription.status}
                      </Badge>
                    </DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Использовано кредитов</DetailLabel>
                    <DetailValue>
                      {selectedUser.subscription.used_credits} / {selectedUser.subscription.monthly_credits}
                    </DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Использовано фото</DetailLabel>
                    <DetailValue>
                      {selectedUser.subscription.used_photos} / {selectedUser.subscription.monthly_photos}
                    </DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Макс. длина сообщения</DetailLabel>
                    <DetailValue>{selectedUser.subscription.max_message_length}</DetailValue>
                  </DetailItem>
                  <DetailItem>
                    <DetailLabel>Истекает</DetailLabel>
                    <DetailValue>
                      {selectedUser.subscription.expires_at 
                        ? new Date(selectedUser.subscription.expires_at).toLocaleDateString('ru-RU')
                        : '—'}
                    </DetailValue>
                  </DetailItem>
                </DetailGrid>
              </DetailSection>
            )}

            <DetailSection>
              <DetailTitle>Активность</DetailTitle>
              <DetailGrid>
                <DetailItem>
                  <DetailLabel>Всего сообщений</DetailLabel>
                  <DetailValue>{selectedUser.activity.total_messages}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Сообщений за 24ч</DetailLabel>
                  <DetailValue>{selectedUser.activity.messages_24h}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Последнее сообщение</DetailLabel>
                  <DetailValue>
                    {selectedUser.activity.last_message_at 
                      ? new Date(selectedUser.activity.last_message_at).toLocaleString('ru-RU')
                      : '—'}
                  </DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Всего изображений</DetailLabel>
                  <DetailValue>{selectedUser.activity.total_images}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Изображений за 24ч</DetailLabel>
                  <DetailValue>{selectedUser.activity.images_24h}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>Создано персонажей</DetailLabel>
                  <DetailValue>{selectedUser.activity.total_characters}</DetailValue>
                </DetailItem>
              </DetailGrid>
            </DetailSection>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};
