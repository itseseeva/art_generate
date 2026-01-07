import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

import { Footer } from './Footer';
import { AuthModal } from './AuthModal';
import { API_CONFIG } from '../config/api';

const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: ${theme.colors.text.primary};
  background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

const Content = styled.div`
  flex: 1;
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
  position: relative;
  
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
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  color: #b8b8b8;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 4rem;
  font-weight: 300;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{ $highlight?: boolean }>`
  background: ${props => props.$highlight 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'};
  border: 2px solid ${props => props.$highlight 
    ? 'rgba(139, 92, 246, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$highlight 
    ? '0 20px 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
    : '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'};
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$highlight 
      ? 'linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)' 
      : 'transparent'};
    opacity: ${props => props.$highlight ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: ${props => props.$highlight 
      ? 'rgba(139, 92, 246, 0.6)' 
      : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$highlight 
      ? '0 25px 70px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
      : '0 15px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  }
  
  ${props => props.$highlight && `
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

const PlanName = styled.h3`
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
`;

const Price = styled.div`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  
  span {
    font-size: 1.1rem;
    color: #888888;
    font-weight: 400;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  flex: 1;
`;

const Feature = styled.li`
  margin-bottom: 1.25rem;
  color: #d1d1d1;
  display: flex;
  align-items: flex-start;
  font-size: 1.05rem;
  line-height: 1.5;
  
  &:before {
    content: '✓';
    color: #8b5cf6;
    margin-right: 0.75rem;
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }
`;

const InfoBlock = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  padding: 2.5rem;
  border-radius: 20px;
  margin-top: 2rem;
  border: 1px solid rgba(139, 92, 246, 0.2);
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

const InfoTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
`;

const InfoText = styled.p`
  color: #d1d1d1;
  line-height: 1.8;
  font-size: 1.05rem;
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
  margin-top: auto;
  
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

const SubscriptionSection = styled.div`
  max-width: 1200px;
  margin: 2rem auto 0;
`;

const SectionTitle = styled.h4`
  color: #ffffff;
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SubscriptionPlans = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const PackageCard = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
`;

const PackageName = styled.h5`
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  margin-top: 0;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PackagePrice = styled.div`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
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

export const TariffsPage: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id?: number} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);
  const [creditPackages, setCreditPackages] = useState<Array<{id: string; name: string; credits: number; price: number; price_per_credit: number; description: string}>>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionStats();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCreditPackages();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
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
        } else {
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

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики подписки:', error);
    }
  };

  const handleActivateSubscription = async (subscriptionType: string) => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    
    let currentUserId = userInfo?.id;
    if (!currentUserId) {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          currentUserId = userData.id;
          setUserInfo({
            username: userData.email,
            coins: userData.coins || 0,
            id: userData.id
          });
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to fetch user info:', e);
      }
    }

    if (!currentUserId) {
      console.error('Не удалось определить пользователя для оплаты.');
      return;
    }
    
    setSelectedPlanForPayment(selectedPlanForPayment === subscriptionType ? null : subscriptionType);
  };

  const handleYoumoneyPayment = (subscriptionType: string) => {
    const currentUserId = userInfo?.id;
    if (!currentUserId) return;

    try {
      const receiverWallet = '4100119070489003';
      const amount = subscriptionType === 'premium' ? 1299 : 599;
      const label = `plan:${subscriptionType};uid:${currentUserId}`;
      const successURL = `${window.location.origin}/frontend/payment/success/`;
      const quickPayUrl =
        `https://yoomoney.ru/quickpay/confirm.xml` +
        `?receiver=${encodeURIComponent(receiverWallet)}` +
        `&quickpay-form=shop` +
        `&payment-type=AC` +
        `&targets=${encodeURIComponent(
          subscriptionType === 'premium'
            ? 'Оплата подписки PREMIUM на 30 дней'
            : 'Оплата подписки STANDARD на 30 дней'
        )}` +
        `&formcomment=${encodeURIComponent('Оплата подписки Spicychat')}` +
        `&short-dest=${encodeURIComponent('Подписка Spicychat')}` +
        `&sum=${amount.toFixed(2)}` +
        `&label=${encodeURIComponent(label)}` +
        `&successURL=${encodeURIComponent(successURL)}`;

      window.location.href = quickPayUrl;
    } catch (err) {
      console.error('Ошибка формирования ссылки QuickPay:', err);
    }
  };

  const loadCreditPackages = async () => {
    try {
      setIsLoadingPackages(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/subscription/credit-packages/`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.packages) {
          setCreditPackages(data.packages);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки пакетов кредитов:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const handleCreditTopUpPayment = (packageId: string, price: number, credits: number) => {
    const currentUserId = userInfo?.id;
    if (!currentUserId) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const receiverWallet = '4100119070489003';
      const label = `type:topup;package:${packageId};uid:${currentUserId}`;
      const successURL = `${window.location.origin}/tariffs`;
      const quickPayUrl =
        `https://yoomoney.ru/quickpay/confirm.xml` +
        `?receiver=${encodeURIComponent(receiverWallet)}` +
        `&quickpay-form=shop` +
        `&targets=${encodeURIComponent(`Покупка ${credits} кредитов`)}` +
        `&formcomment=${encodeURIComponent('Пополнение баланса Spicychat')}` +
        `&short-dest=${encodeURIComponent('Пополнение баланса')}` +
        `&sum=${encodeURIComponent(price.toFixed(2))}` +
        `&label=${encodeURIComponent(label)}` +
        `&successURL=${encodeURIComponent(successURL)}`;

      window.location.href = quickPayUrl;
    } catch (err) {
      console.error('Ошибка формирования ссылки QuickPay для пакета:', err);
    }
  };

  return (
    <Container>
      <Content>
        <Title>Тарифные планы</Title>
        <Subtitle>Выберите подходящий план для ваших творческих задач. НДС не облагается.</Subtitle>

        <Grid>
          <Card>
            <PlanName>Free</PlanName>
            <Price>Бесплатно</Price>
            <FeatureList>
              <Feature>100 кредитов</Feature>
              <Feature>5 генераций фото</Feature>
              <Feature>Доступ ко всем персонажам</Feature>
              <Feature>Возможность создать своих персонажей</Feature>
              <Feature>Премиум модель с ограничением на 20 сообщений</Feature>
            </FeatureList>
            <ActivateButton disabled>
              Доступна при регистрации
            </ActivateButton>
          </Card>

          <Card $highlight>
            <PlanName>Стандарт</PlanName>
            <Price>599₽ <span>/ месяц</span></Price>
            <FeatureList>
              <Feature>1000 кредитов</Feature>
              <Feature>Доступ ко всем персонажам</Feature>
              <Feature>Сохранение истории сообщений</Feature>
              <Feature>Создание платных альбомов</Feature>
              <Feature>Стандартная модель, память 2000 слов</Feature>
            </FeatureList>
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
          </Card>

          <Card>
            <PlanName>Премиум</PlanName>
            <Price>1299₽ <span>/ месяц</span></Price>
            <FeatureList>
              <Feature>5000 кредитов</Feature>
              <Feature>Доступ ко всем персонажам</Feature>
              <Feature>Сохранение истории сообщений</Feature>
              <Feature>Создание платных альбомов</Feature>
              <Feature>Доступ ко всем платным альбомам</Feature>
              <Feature>Доступ ко всем галереям пользователей</Feature>
              <Feature>Премиум модель, память 6000 слов</Feature>
            </FeatureList>
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
          </Card>
        </Grid>

        <InfoBlock>
          <InfoTitle>Информация о доставке</InfoTitle>
          <InfoText>
            Доступ к услугам предоставляется автоматически в личном кабинете пользователя сразу после подтверждения оплаты.
            Никаких дополнительных действий не требуется. История ваших генераций и баланс обновляются мгновенно.
          </InfoText>
        </InfoBlock>

        {/* Секция разовой докупки кредитов */}
        {isAuthenticated && stats?.is_active && (
          <SubscriptionSection>
            <SectionTitle>Докупить кредиты</SectionTitle>
            <p style={{ 
              textAlign: 'center', 
              color: '#b8b8b8', 
              fontSize: '1.1rem', 
              marginBottom: '2rem',
              maxWidth: '800px',
              margin: '0 auto 2rem'
            }}>
              Закончились кредиты? Докупите пакет и продолжайте общение! Кредиты суммируются с текущим балансом.
            </p>
            
            <SubscriptionPlans>
              {isLoadingPackages ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '2rem', gridColumn: '1 / -1' }}>
                  Загрузка пакетов...
                </div>
              ) : (() => {
                  try {
                    const safePackages = Array.isArray(creditPackages) ? creditPackages : [];
                    if (safePackages.length > 0) {
                      return safePackages.map((pkg: any) => (
                        <PackageCard key={pkg.id}>
                          <PackageName>{pkg.name}</PackageName>
                          <PackagePrice>{pkg.price}₽</PackagePrice>
                          <div style={{ 
                            fontSize: '1rem', 
                            color: '#a78bfa', 
                            marginBottom: '1rem',
                            textAlign: 'center',
                            fontWeight: 600
                          }}>
                            {pkg.credits} кредитов
                          </div>
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: '#888', 
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}>
                            {pkg.description}
                          </div>
                          <ActivateButton
                            onClick={() => handleCreditTopUpPayment(pkg.id, pkg.price, pkg.credits)}
                            disabled={isLoadingPackages}
                          >
                            Купить за {pkg.price}₽
                          </ActivateButton>
                        </PackageCard>
                      ));
                    } else {
                      return (
                        <div style={{ textAlign: 'center', color: '#888', padding: '2rem', gridColumn: '1 / -1' }}>
                          Пакеты временно недоступны
                        </div>
                      );
                    }
                  } catch (e) {
                    return (
                      <div style={{ textAlign: 'center', color: '#888', padding: '2rem', gridColumn: '1 / -1' }}>
                        Ошибка загрузки пакетов
                      </div>
                    );
                  }
                })()}
            </SubscriptionPlans>
          </SubscriptionSection>
        )}
      </Content>
      <Footer />

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
    </Container>
  );
};

