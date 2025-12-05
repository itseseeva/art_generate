import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AuthModal } from './AuthModal';
import { SuccessToast } from './SuccessToast';
import SplitText from './SplitText';

const MainContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
  padding: 4rem 2rem;
  overflow-y: auto;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const PageTitle = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  
  h1 {
    font-size: 3.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
    margin: 0;
    position: relative;
    margin-bottom: 1rem;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 150px;
      height: 3px;
      background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
      border-radius: 2px;
    }
  }
  
  p {
    color: #b8b8b8;
    font-size: 1.3rem;
    margin-top: 2rem;
    font-weight: 300;
  }
`;

const SubscriptionSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h4`
  color: #ffffff;
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 3rem;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SubscriptionPlans = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlanCard = styled.div<{ $isPopular?: boolean }>`
  background: ${props => props.$isPopular 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'};
  border: 2px solid ${props => props.$isPopular 
    ? 'rgba(139, 92, 246, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  padding: 2.5rem;
  text-align: center;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isPopular 
    ? '0 20px 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
    : '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$isPopular 
      ? 'linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)' 
      : 'transparent'};
    opacity: ${props => props.$isPopular ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: ${props => props.$isPopular 
      ? 'rgba(139, 92, 246, 0.6)' 
      : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$isPopular 
      ? '0 25px 70px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
      : '0 15px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  }
  
  ${props => props.$isPopular && `
    &::after {
      content: 'ПОПУЛЯРНЫЙ';
      position: absolute;
      top: 20px;
      right: -35px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      padding: 5px 40px;
      font-size: 0.75rem;
      font-weight: 700;
      transform: rotate(45deg);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
  `}
`;

const PlanName = styled.h5`
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  margin-top: 0;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PlanPrice = styled.div`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  text-align: left;
  flex: 1;
`;

const PlanFeature = styled.li<{ $isAvailable?: boolean }>`
  color: ${props => props.$isAvailable === false ? '#666666' : '#d1d1d1'};
  font-size: 1.05rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: flex-start;
  line-height: 1.5;
  
  &::before {
    content: ${props => props.$isAvailable === false ? "'✕'" : "'✓'"};
    color: ${props => props.$isAvailable === false ? 'rgba(200, 100, 100, 1)' : '#8b5cf6'};
    margin-right: 0.75rem;
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
    text-shadow: ${props => props.$isAvailable === false ? 'none' : '0 0 10px rgba(139, 92, 246, 0.5)'};
  }
`;

const PaymentButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const PaymentButton = styled.button`
  width: 100%;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
`;

const PaymentLogo = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
  background: white;
  border-radius: 4px;
  padding: 2px;
`;

const ActivateButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%);
  color: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }
  
  &:disabled {
    background: rgba(60, 60, 60, 0.5);
    border-color: rgba(100, 100, 100, 0.3);
    color: #888888;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 3rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
  }
`;

const CurrentSubscriptionLabel = styled.div`
  color: #888888;
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  font-weight: 600;
`;

const CurrentSubscriptionValue = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 2.5rem;
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
  onPaymentMethod?: (subscriptionType: string) => void;
  isAuthenticated?: boolean;
  userInfo?: {username: string, coins: number, id?: number} | null;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  onBackToMain,
  onCreateCharacter,
  onEditCharacters,
  onProfile,
  onShop,
  onPaymentMethod,
  isAuthenticated: propIsAuthenticated,
  userInfo: propUserInfo
}) => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false);
  const [userInfo, setUserInfo] = useState(propUserInfo || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);

  useEffect(() => {
    if (propIsAuthenticated !== undefined) {
      setIsAuthenticated(propIsAuthenticated);
    }
    if (propUserInfo !== undefined) {
      setUserInfo(propUserInfo);
    }
  }, [propIsAuthenticated, propUserInfo]);

  useEffect(() => {
    if (propIsAuthenticated === undefined) {
      checkAuth();
    }
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
      // Диспатчим событие обновления баланса
      window.dispatchEvent(new Event('balance-update'));
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
        if (userData) {
          setUserInfo({
            username: userData.email,
            coins: userData.coins || 0,
            id: userData.id
          });
          setIsAuthenticated(true);
          setBalanceRefreshTrigger(prev => prev + 1);
        } else {
          console.error('[SHOP] Auth check returned empty data');
          setIsAuthenticated(false);
          setUserInfo(null);
        }
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
    const token = localStorage.getItem('authToken');
    
    // Если нет токена, тогда требуем вход
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    
    // Если есть токен, но нет userInfo, пробуем загрузить его
    let currentUserId = userInfo?.id;
    if (!currentUserId) {
      try {
        const response = await fetch('http://localhost:8000/api/v1/auth/me/', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          currentUserId = userData.id;
          // Обновляем стейт на будущее
          setUserInfo({
            username: userData.email,
            coins: userData.coins || 0,
            id: userData.id
          });
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('[SHOP] Failed to fetch user info:', e);
      }
    }

    // Если все еще нет ID, просто выводим ошибку, но не открываем окно входа
    if (!currentUserId) {
      console.error('[SHOP] Не удалось определить пользователя для оплаты.');
      setError('Ошибка: не удалось определить пользователя. Попробуйте обновить страницу.');
      return;
    }
    
    // Раскрываем кнопки оплаты для выбранного плана
    setSelectedPlanForPayment(selectedPlanForPayment === subscriptionType ? null : subscriptionType);
  };

  const handleYoumoneyPayment = (subscriptionType: string) => {
    const currentUserId = userInfo?.id;
    if (!currentUserId) return;

    try {
      const receiverWallet = '4100119070489003';
      const amount = subscriptionType === 'premium' ? 1499 : 699;
      const label = `plan:${subscriptionType};uid:${currentUserId}`;
      const successURL = `${window.location.origin}/frontend/payment/success/`;
      const quickPayUrl =
        `https://yoomoney.ru/quickpay/confirm.xml` +
        `?receiver=${encodeURIComponent(receiverWallet)}` +
        `&quickpay-form=shop` +
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
              <PlanPrice>699₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>1000 кредитов в месяц</PlanFeature>
                <PlanFeature>100 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
                <PlanFeature>Память: Последние 20 сообщений в контексте</PlanFeature>
                <PlanFeature>Максимум токенов: 200 токенов на ответ</PlanFeature>
              </PlanFeatures>
              <ActivateButton 
                onClick={() => handleActivateSubscription('standard')}
                disabled={isLoading || (stats?.subscription_type === 'standard')}
              >
                {stats?.subscription_type === 'standard' ? 'Активна' : (selectedPlanForPayment === 'standard' ? 'Скрыть способы оплаты' : 'Активировать')}
              </ActivateButton>
              
              {selectedPlanForPayment === 'standard' && (
                <PaymentButtonsContainer>
                  <PaymentButton onClick={() => handleYoumoneyPayment('standard')}>
                    <PaymentLogo src="/logo/yoomoneyIcon.svg" alt="YooMoney" />
                    Банковская карта (РФ)
                  </PaymentButton>
                </PaymentButtonsContainer>
              )}
            </PlanCard>
            
            <PlanCard>
              <PlanName>Premium</PlanName>
              <PlanPrice>1499₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>5000 кредитов в месяц</PlanFeature>
                <PlanFeature>300 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Доступ ко всем платным альбомам</PlanFeature>
                <PlanFeature>Доступ ко всем галереям пользователей</PlanFeature>
                <PlanFeature>Расширенная память: Последние 40 сообщений в контексте</PlanFeature>
                <PlanFeature>Максимум токенов: 450 токенов на ответ</PlanFeature>
              </PlanFeatures>
              <ActivateButton 
                onClick={() => handleActivateSubscription('premium')}
                disabled={isLoading || (stats?.subscription_type === 'premium')}
              >
                {stats?.subscription_type === 'premium' ? 'Активна' : (selectedPlanForPayment === 'premium' ? 'Скрыть способы оплаты' : 'Активировать')}
              </ActivateButton>

              {selectedPlanForPayment === 'premium' && (
                <PaymentButtonsContainer>
                  <PaymentButton onClick={() => handleYoumoneyPayment('premium')}>
                    <PaymentLogo src="/logo/yoomoneyIcon.svg" alt="YooMoney" />
                    Банковская карта (РФ)
                  </PaymentButton>
                </PaymentButtonsContainer>
              )}
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
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
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

