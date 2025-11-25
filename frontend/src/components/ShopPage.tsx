import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AuthModal } from './AuthModal';
import { SuccessToast } from './SuccessToast';
import SplitText from './SplitText';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: rgba(20, 20, 20, 1);
  padding: 2rem;
  overflow-y: auto;
`;

const ContentWrapper = styled.div`
  max-width: 1280px;
  margin: 0 auto;
`;


const PageTitle = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: rgba(240, 240, 240, 1);
    margin-bottom: 0.5rem;
    margin: 0;
  }
  
  p {
    color: rgba(160, 160, 160, 1);
    font-size: 1rem;
    margin-top: 0.5rem;
  }
`;

const SubscriptionSection = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled.h4`
  color: rgba(240, 240, 240, 1);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const SubscriptionPlans = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PlanCard = styled.div<{ $isPopular?: boolean }>`
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid ${props => props.$isPopular 
    ? 'rgba(150, 150, 150, 0.6)' 
    : 'rgba(150, 150, 150, 0.3)'
  };
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(180, 180, 180, 0.5);
    transform: translateY(-5px);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  
  ${props => props.$isPopular && `
    &::before {
      content: 'Популярный';
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(60, 60, 60, 0.9);
      color: rgba(240, 240, 240, 1);
      padding: 0.5rem 1.5rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
  `}
`;

const PlanName = styled.h5`
  color: rgba(240, 240, 240, 1);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  margin-top: 1rem;
`;

const PlanPrice = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
  text-align: left;
`;

const PlanFeature = styled.li<{ $isAvailable?: boolean }>`
  color: ${props => props.$isAvailable === false ? 'rgba(120, 120, 120, 1)' : 'rgba(160, 160, 160, 1)'};
  font-size: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: ${props => props.$isAvailable === false ? "'✕'" : "'✓'"};
    color: ${props => props.$isAvailable === false ? 'rgba(200, 100, 100, 1)' : 'rgba(150, 150, 150, 1)'};
    font-size: 1.25rem;
    font-weight: 700;
  }
`;

const ActivateButton = styled.button`
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: rgba(120, 120, 120, 0.8);
  color: rgba(240, 240, 240, 1);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: rgba(140, 140, 140, 0.9);
    transform: scale(1.02);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.3);
  color: rgba(255, 100, 100, 1);
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  text-align: center;
  max-width: 600px;
  margin: 1.5rem auto;
`;

const CurrentSubscriptionCard = styled.div`
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
`;

const CurrentSubscriptionLabel = styled.div`
  color: rgba(160, 160, 160, 1);
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`;

const CurrentSubscriptionValue = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: 1.875rem;
  font-weight: 700;
`;

interface SubscriptionStats {
  subscription_type: string;
  monthly_credits: number;
  monthly_photos: number;
  used_credits: number;
  used_photos: number;
  credits_remaining: number;
  photos_remaining: number;
  days_left: number;
  is_active: boolean;
}

interface ShopPageProps {
  onBackToMain: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onProfile?: () => void;
  onShop?: () => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  onBackToMain,
  onCreateCharacter,
  onEditCharacters,
  onProfile,
  onShop
}) => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id?: number} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionStats();
    }
  }, [isAuthenticated, statsRefreshTrigger]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUpdate = () => {
      console.log('[SHOP] Получено событие обновления подписки');
      loadSubscriptionStats();
      checkAuth();
    };

    window.addEventListener('subscription-update', handleUpdate);
    return () => window.removeEventListener('subscription-update', handleUpdate);
  }, [isAuthenticated]);

  // Автообновление статистики каждые 10 секунд
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      console.log('[SHOP] Автообновление статистики подписки');
      loadSubscriptionStats();
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);
        return;
      }

      const response = await fetch('http://localhost:8000/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUserInfo({
          username: userData.email,
          coins: userData.coins || 0,
          id: userData.id
        });
        setIsAuthenticated(true);
        setBalanceRefreshTrigger(prev => prev + 1);
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      console.log('[SHOP] Загрузка статистики подписки...');
      const response = await fetch('http://localhost:8000/api/v1/profit/stats/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        console.log('[SHOP] Статистика получена:', statsData);
        setStats(statsData);
      } else {
        console.error('[SHOP] Ошибка получения статистики:', response.status);
      }
    } catch (error) {
      console.error('[SHOP] Ошибка загрузки статистики подписки:', error);
    }
  };

  const handleActivateSubscription = async (subscriptionType: string) => {
    // Требуем авторизацию, чтобы связать платёж с пользователем
    if (!isAuthenticated || !userInfo?.id) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    // QuickPay: платёжная ссылка, label включает план и userId
    try {
      const receiverWallet = '4100119070489003'; // получатель
      const amount = subscriptionType === 'premium' ? 10 : 599;
      const label = `plan:${subscriptionType};uid:${userInfo.id}`; // для серверной валидации уведомления
      const successURL = `${window.location.origin}/frontend/payment/success/`;
      const quickPayUrl =
        `https://yoomoney.ru/quickpay/confirm.xml` +
        `?receiver=${encodeURIComponent(receiverWallet)}` +
        `&quickpay-form=shop` + // тип формы (магазин/донат)
        `&targets=${encodeURIComponent(
          subscriptionType === 'premium'
            ? 'Оплата подписки PREMIUM на 30 дней'
            : 'Оплата подписки STANDARD на 30 дней'
        )}` +
        `&formcomment=${encodeURIComponent('Оплата подписки Spicychat')}` +
        `&short-dest=${encodeURIComponent('Подписка Spicychat')}` +
        `&sum=${encodeURIComponent(amount.toFixed(2))}` +
        `&label=${encodeURIComponent(label)}` +
        `&successURL=${encodeURIComponent(successURL)}`;

      window.location.href = quickPayUrl;
    } catch (err) {
      console.error('[SHOP] Ошибка формирования ссылки QuickPay:', err);
      setError('Не удалось открыть страницу оплаты YooMoney');
    }
  };

  return (
    <MainContainer>
      <ContentWrapper>
        <PageTitle>
          <h1>
            <SplitText text="Магазин" delay={50} />
          </h1>
          <p>Выберите подписку и получите доступ ко всем возможностям</p>
        </PageTitle>
        
        <CurrentSubscriptionCard>
          <CurrentSubscriptionLabel>Текущая подписка</CurrentSubscriptionLabel>
          <CurrentSubscriptionValue>
            {(stats?.subscription_type || 'free').toUpperCase()}
          </CurrentSubscriptionValue>
        </CurrentSubscriptionCard>
        
        <SubscriptionSection>
          <SectionTitle>
            <SplitText text="Планы подписки" delay={30} />
          </SectionTitle>
          
          <SubscriptionPlans>
            <PlanCard>
              <PlanName>Free</PlanName>
              <PlanPrice>Бесплатно</PlanPrice>
              <PlanFeatures>
                <PlanFeature>Все персонажи</PlanFeature>
                <PlanFeature>100 кредитов в месяц</PlanFeature>
                <PlanFeature>10 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature $isAvailable={false}>Сохранение истории сообщений</PlanFeature>
                <PlanFeature $isAvailable={false}>Возможность создавать платные альбомы</PlanFeature>
              </PlanFeatures>
              <ActivateButton 
                onClick={() => {}}
                disabled
              >
                Доступна при регистрации
              </ActivateButton>
            </PlanCard>
            
            <PlanCard $isPopular>
              <PlanName>Standard</PlanName>
              <PlanPrice>599₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>1000 кредитов в месяц</PlanFeature>
                <PlanFeature>100 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
              </PlanFeatures>
              <ActivateButton 
                onClick={() => handleActivateSubscription('standard')}
                disabled={isLoading || (stats?.subscription_type === 'standard')}
              >
                {stats?.subscription_type === 'standard' ? 'Активна' : (isLoading ? 'Активация...' : 'Активировать')}
              </ActivateButton>
            </PlanCard>
            
            <PlanCard>
              <PlanName>Premium</PlanName>
              <PlanPrice>1₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>5000 кредитов в месяц</PlanFeature>
                <PlanFeature>300 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Доступ ко всем платным альбомам</PlanFeature>
              </PlanFeatures>
              <ActivateButton 
                onClick={() => handleActivateSubscription('premium')}
                disabled={isLoading || (stats?.subscription_type === 'premium')}
              >
                {stats?.subscription_type === 'premium' ? 'Активна' : (isLoading ? 'Активация...' : 'Активировать')}
              </ActivateButton>
            </PlanCard>
          </SubscriptionPlans>

        </SubscriptionSection>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </ContentWrapper>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
          onAuthSuccess={(token) => {
            localStorage.setItem('authToken', token);
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            checkAuth();
          }}
        />
      )}

      {showSuccessToast && (
        <SuccessToast
          message={successMessage}
          amount={0}
          onClose={() => setShowSuccessToast(false)}
          duration={3000}
        />
      )}
    </MainContainer>
  );
};

