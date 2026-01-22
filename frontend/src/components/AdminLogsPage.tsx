import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { GlobalHeader } from './GlobalHeader';
import { useIsMobile } from '../hooks/useIsMobile';
import { FiArrowLeft, FiUser, FiMapPin, FiCreditCard, FiMessageSquare, FiChevronRight } from 'react-icons/fi';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: relative;
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  gap: 2rem;
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  min-height: 600px;
`;

const PageTitle = styled.h1`
  color: #ffffff;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 2;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 2px solid rgba(60, 60, 60, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
`;

const StatValue = styled.div`
  color: #ffffff;
  font-size: 2rem;
  font-weight: 700;
`;

const UsersTable = styled.div`
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 2px solid rgba(60, 60, 60, 0.9);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  z-index: 1;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 50px 1fr 150px 120px 100px 100px 100px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(30, 30, 30, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
`;

const UserRow = styled.div<{ $isClickable?: boolean }>`
  display: grid;
  grid-template-columns: 50px 1fr 150px 120px 100px 100px 100px 80px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.$isClickable ? 'rgba(40, 40, 40, 0.5)' : 'transparent'};
  }

  &:last-child {
    border-bottom: none;
  }
  
  &[colspan] {
    grid-column: 1 / -1;
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 0.9rem;
`;

const UserId = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
`;

const UserEmail = styled.div`
  color: #ffffff;
  font-weight: 500;
`;

const UserUsername = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
`;

const CountryBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
`;

const StatusBadge = styled.div<{ $isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.$isActive ? '#22c55e' : '#ef4444'};
  border: 1px solid ${props => props.$isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const SubscriptionBadge = styled.div<{ $hasSubscription?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$hasSubscription ? 'rgba(139, 92, 246, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
  color: ${props => props.$hasSubscription ? '#8b5cf6' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${props => props.$hasSubscription ? 'rgba(139, 92, 246, 0.3)' : 'rgba(100, 100, 100, 0.3)'};
`;

const ChatBadge = styled.div<{ $hasChat?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$hasChat ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
  color: ${props => props.$hasChat ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${props => props.$hasChat ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 100, 100, 0.3)'};
`;

const MessagesCount = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
  color: rgba(255, 255, 255, 0.6);
  position: relative;
  z-index: 1;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: #ef4444;
  position: relative;
  z-index: 1;
`;

const UserModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 2px solid rgba(60, 60, 60, 0.9);
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s ease;

  &:hover {
    color: #ffffff;
  }
`;

const ModalSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const InfoValue = styled.div`
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
`;

interface User {
  id: number;
  email: string;
  username: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  coins: number;
  country: string | null;
  created_at: string;
  total_messages_sent: number;
  subscription: {
    type: string;
    status: string;
  } | null;
  has_subscription: boolean;
  has_chat: boolean;
  chat_sessions_count: number;
  total_chat_messages: number;
}

interface AdminLogsPageProps {
  onBack: () => void;
  onProfile?: (userId?: number) => void;
}

export const AdminLogsPage: React.FC<AdminLogsPageProps> = ({ onBack, onProfile }) => {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    withSubscription: 0,
    withChat: 0,
    totalMessages: 0
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await loadUsers();
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[AdminLogsPage] Начинаем загрузку пользователей...');
      const response = await authManager.fetchWithAuth(`${API_CONFIG.BASE_URL}/api/v1/admin/users?limit=1000`);
      
      console.log('[AdminLogsPage] Ответ получен:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Не удалось загрузить список пользователей';
        
        if (response.status === 403) {
          errorMessage = 'Доступ запрещен. Только для администраторов.';
        } else if (response.status === 401) {
          errorMessage = 'Необходима авторизация.';
        } else {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        }
        
        console.error('[AdminLogsPage] Ошибка загрузки:', response.status, errorMessage);
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[AdminLogsPage] Загружено пользователей:', data.total, 'Данные:', data);
      console.log('[AdminLogsPage] Количество пользователей в массиве:', data.users?.length || 0);
      
      const usersList = data.users || [];
      console.log('[AdminLogsPage] Устанавливаем пользователей в состояние, количество:', usersList.length);
      setUsers(usersList);
      
      // Подсчитываем статистику
      const total = data.total || 0;
      const withSubscription = usersList.filter((u: User) => u.has_subscription).length;
      const withChat = usersList.filter((u: User) => u.has_chat).length;
      const totalMessages = usersList.reduce((sum: number, u: User) => sum + (u.total_chat_messages || 0), 0);
      
      console.log('[AdminLogsPage] Статистика:', { total, withSubscription, withChat, totalMessages });
      
      setStats({
        total,
        withSubscription,
        withChat,
        totalMessages
      });
      
      console.log('[AdminLogsPage] Состояние обновлено, loading будет установлен в false');
    } catch (err: any) {
      console.error('[AdminLogsPage] Ошибка:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
      console.log('[AdminLogsPage] Загрузка завершена, loading:', false);
    }
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Отладочное логирование состояния
  useEffect(() => {
    const shouldRender = !loading && !error && users.length > 0;
    console.log('[AdminLogsPage] Состояние компонента:', {
      loading,
      error,
      usersCount: users.length,
      stats,
      shouldRenderContent: shouldRender,
      usersArray: users.slice(0, 3) // Первые 3 пользователя для проверки
    });
    
    if (shouldRender) {
      console.log('[AdminLogsPage] ✅ Контент должен отображаться!');
    } else {
      console.log('[AdminLogsPage] ❌ Контент НЕ должен отображаться:', {
        loading,
        error,
        usersLength: users.length
      });
    }
  }, [loading, error, users, stats]);

  console.log('[AdminLogsPage] РЕНДЕР компонента, состояние:', { loading, error, usersCount: users.length });

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
      padding: '20px',
      position: 'relative',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ff0000',
        color: '#ffffff',
        padding: '20px',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px'
      }}>
        КОМПОНЕНТ АДМИН ЛОГОВ РЕНДЕРИТСЯ!
      </div>
      
      <div style={{
        background: '#00ff00',
        color: '#000000',
        padding: '15px',
        marginBottom: '20px',
        fontSize: '16px'
      }}>
        Состояние: loading={String(loading)}, error={error || 'нет'}, users={users.length}
      </div>
      
      <MainContainer>
        <GlobalHeader
          onHome={onBack}
          refreshTrigger={0}
        />
        <ContentWrapper>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '2rem',
            position: 'relative',
            zIndex: 10
          }}>
            <BackButton onClick={onBack}>
              <FiArrowLeft size={16} />
              Назад
            </BackButton>
            <PageTitle>Логи пользователей</PageTitle>
          </div>
        

        {loading && (
          <LoadingContainer>Загрузка данных...</LoadingContainer>
        )}

        {error && (
          <ErrorContainer>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ошибка загрузки</div>
            <div style={{ fontSize: '0.9rem', color: 'rgba(239, 68, 68, 0.8)' }}>{error}</div>
            <button onClick={loadUsers} style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              color: '#8b5cf6',
              cursor: 'pointer',
              marginTop: '1rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
            }}
            >
              Попробовать снова
            </button>
          </ErrorContainer>
        )}

        {!loading && !error && users.length === 0 && (
          <div style={{
            padding: '4rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Нет данных</div>
            <div style={{ fontSize: '0.9rem' }}>Пользователи не найдены</div>
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <>
            <StatsContainer style={{ display: 'grid', visibility: 'visible', opacity: 1 }}>
              <StatCard style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                <StatLabel>Всего пользователей</StatLabel>
                <StatValue>{stats.total}</StatValue>
              </StatCard>
              <StatCard style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                <StatLabel>С подпиской</StatLabel>
                <StatValue>{stats.withSubscription}</StatValue>
              </StatCard>
              <StatCard style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                <StatLabel>Общались в чате</StatLabel>
                <StatValue>{stats.withChat}</StatValue>
              </StatCard>
              <StatCard style={{ display: 'flex', visibility: 'visible', opacity: 1 }}>
                <StatLabel>Всего сообщений</StatLabel>
                <StatValue>{stats.totalMessages}</StatValue>
              </StatCard>
            </StatsContainer>

            <UsersTable style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
              <TableHeader style={{ display: 'grid', visibility: 'visible', opacity: 1 }}>
                <div>ID</div>
                <div>Пользователь</div>
                <div>Страна</div>
                <div>Подписка</div>
                <div>Чат</div>
                <div>Сообщения</div>
                <div>Статус</div>
                <div></div>
              </TableHeader>
              {users.length > 0 ? users.map((user) => (
                <UserRow key={user.id} $isClickable onClick={() => handleUserClick(user)}>
                  <UserCell>
                    <UserId>{user.id}</UserId>
                  </UserCell>
                  <UserCell>
                    <div>
                      <UserEmail>{user.email}</UserEmail>
                      {user.username && <UserUsername>@{user.username}</UserUsername>}
                    </div>
                  </UserCell>
                  <UserCell>
                    <CountryBadge>
                      <FiMapPin size={14} />
                      {user.country || 'Не указано'}
                    </CountryBadge>
                  </UserCell>
                  <UserCell>
                    <SubscriptionBadge $hasSubscription={user.has_subscription}>
                      <FiCreditCard size={12} />
                      {user.has_subscription ? (user.subscription?.type || 'Да') : 'Нет'}
                    </SubscriptionBadge>
                  </UserCell>
                  <UserCell>
                    <ChatBadge $hasChat={user.has_chat}>
                      <FiMessageSquare size={12} />
                      {user.has_chat ? 'Да' : 'Нет'}
                    </ChatBadge>
                  </UserCell>
                  <UserCell>
                    <MessagesCount>{user.total_chat_messages}</MessagesCount>
                  </UserCell>
                  <UserCell>
                    <StatusBadge $isActive={user.is_active}>
                      {user.is_active ? 'Активен' : 'Неактивен'}
                    </StatusBadge>
                  </UserCell>
                  <UserCell>
                    <FiChevronRight size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </UserCell>
                </UserRow>
              )) : (
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  Нет пользователей для отображения
                </div>
              )}
            </UsersTable>
          </>
        )}

        {selectedUser && (
          <UserModal onClick={handleCloseModal}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Детали пользователя</ModalTitle>
                <CloseButton onClick={handleCloseModal}>×</CloseButton>
              </ModalHeader>

              <ModalSection>
                <SectionTitle>Основная информация</SectionTitle>
                <InfoRow>
                  <InfoLabel>ID</InfoLabel>
                  <InfoValue>{selectedUser.id}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>{selectedUser.email}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Username</InfoLabel>
                  <InfoValue>{selectedUser.username || 'Не указан'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Страна</InfoLabel>
                  <InfoValue>{selectedUser.country || 'Не указана'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Дата регистрации</InfoLabel>
                  <InfoValue>{formatDate(selectedUser.created_at)}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Монеты</InfoLabel>
                  <InfoValue>{selectedUser.coins}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Статус</InfoLabel>
                  <InfoValue>{selectedUser.is_active ? 'Активен' : 'Неактивен'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Верифицирован</InfoLabel>
                  <InfoValue>{selectedUser.is_verified ? 'Да' : 'Нет'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Администратор</InfoLabel>
                  <InfoValue>{selectedUser.is_admin ? 'Да' : 'Нет'}</InfoValue>
                </InfoRow>
              </ModalSection>

              <ModalSection>
                <SectionTitle>Подписка</SectionTitle>
                <InfoRow>
                  <InfoLabel>Тип подписки</InfoLabel>
                  <InfoValue>
                    {selectedUser.has_subscription 
                      ? (selectedUser.subscription?.type || 'Не указано')
                      : 'Нет подписки'}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Статус подписки</InfoLabel>
                  <InfoValue>
                    {selectedUser.subscription?.status || 'Не указано'}
                  </InfoValue>
                </InfoRow>
              </ModalSection>

              <ModalSection>
                <SectionTitle>Активность в чате</SectionTitle>
                <InfoRow>
                  <InfoLabel>Общался в чате</InfoLabel>
                  <InfoValue>{selectedUser.has_chat ? 'Да' : 'Нет'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Количество сессий</InfoLabel>
                  <InfoValue>{selectedUser.chat_sessions_count}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Всего сообщений</InfoLabel>
                  <InfoValue>{selectedUser.total_chat_messages}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Всего отправлено (всего)</InfoLabel>
                  <InfoValue>{selectedUser.total_messages_sent}</InfoValue>
                </InfoRow>
              </ModalSection>

              {onProfile && (
                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    onClick={() => {
                      handleCloseModal();
                      onProfile(selectedUser.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(139, 92, 246, 0.2)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#8b5cf6',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    Открыть профиль
                  </button>
                </div>
              )}
            </ModalContent>
          </UserModal>
        )}
      </ContentWrapper>
    </MainContainer>
    </div>
  );
};
