import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AuthModal } from './AuthModal';
import { SuccessToast } from './SuccessToast';
import SplitText from './SplitText';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';

const MainContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
  padding: 1.5rem 1rem;
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
  padding-top: 3rem;
`;

const PageTitle = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.02em;
    margin: 0;
    position: relative;
    margin-bottom: 0.5rem;
    
    &::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
      border-radius: 2px;
    }
  }
  
  p {
    color: #b8b8b8;
    font-size: 0.9rem;
    margin-top: 0.5rem;
    font-weight: 300;
  }
`;

const SubscriptionSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h4`
  color: #ffffff;
  font-size: 1.25rem;
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
  gap: 1rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const PlanCard = styled.div<{ $isPopular?: boolean }>`
  background: ${props => props.$isPopular 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'};
  border: 2px solid ${props => props.$isPopular 
    ? 'rgba(139, 92, 246, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isPopular 
    ? '0 10px 30px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
    : '0 5px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => props.$isPopular 
      ? 'linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)' 
      : 'transparent'};
    opacity: ${props => props.$isPopular ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: ${props => props.$isPopular 
      ? 'rgba(139, 92, 246, 0.6)' 
      : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$isPopular 
      ? '0 15px 40px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
      : '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  }
  
  ${props => props.$isPopular && `
    &::after {
      content: 'ПОПУЛЯРНЫЙ';
      position: absolute;
      top: 12px;
      right: -30px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      padding: 3px 32px;
      font-size: 0.65rem;
      font-weight: 700;
      transform: rotate(45deg);
      box-shadow: 0 3px 8px rgba(139, 92, 246, 0.4);
    }
  `}
`;

const PlanName = styled.h5`
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  margin-top: 0;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PlanPrice = styled.div`
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
`;

const PlanFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
  text-align: left;
  flex: 1;
`;

const PlanFeature = styled.li<{ $isAvailable?: boolean; $isHighlighted?: boolean }>`
  color: ${props => {
    if (props.$isAvailable === false) return '#666666';
    if (props.$isHighlighted) return '#ffffff';
    return '#d1d1d1';
  }};
  font-size: ${props => props.$isHighlighted ? '0.85rem' : '0.75rem'};
  font-weight: ${props => props.$isHighlighted ? '600' : '400'};
  margin-bottom: 0.5rem;
  display: flex;
  align-items: flex-start;
  line-height: 1.4;
  
  ${props => props.$isHighlighted && `
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid rgba(139, 92, 246, 0.4);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
    margin-top: 0.25rem;
    margin-bottom: 0.75rem;
    position: relative;
  `}
  
  &::before {
    content: ${props => props.$isAvailable === false ? "'✕'" : "'✓'"};
    color: ${props => {
      if (props.$isAvailable === false) return 'rgba(200, 100, 100, 1)';
      if (props.$isHighlighted) return '#a78bfa';
      return '#8b5cf6';
    }};
    margin-right: 0.5rem;
    font-weight: bold;
    font-size: ${props => props.$isHighlighted ? '0.9rem' : '0.8rem'};
    flex-shrink: 0;
    margin-top: 1px;
    text-shadow: ${props => {
      if (props.$isAvailable === false) return 'none';
      if (props.$isHighlighted) return '0 0 10px rgba(139, 92, 246, 0.8)';
      return '0 0 8px rgba(139, 92, 246, 0.5)';
    }};
  }
`;

const PaymentButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const PaymentButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  background: #343042;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const TestPaymentButton = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%);
  border: 2px solid rgba(255, 193, 7, 0.5);
  border-radius: 12px;
  color: #ffc107;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &::before {
    content: '🧪';
    margin-right: 0.25rem;
  }
  
  &:hover {
    transform: translateY(-2px);
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 152, 0, 0.3) 100%);
    border-color: rgba(255, 193, 7, 0.7);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
  }
`;

const TestPaymentLabel = styled.div`
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: #ffc107;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  font-weight: 600;
`;

const PaymentLogo = styled.img`
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
  flex-shrink: 0;
  background: transparent;
  display: block;
  
  &[src=""] {
    display: none;
  }
`;

const RenewalInfo = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  color: #a78bfa;
  text-align: center;
  line-height: 1.4;
`;

const ActivateButton = styled.button`
  width: 100%;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%);
  color: #ffffff;
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
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
  border-radius: 8px;
  padding: 0.5rem 0.875rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: absolute;
  top: 0;
  right: 0;
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
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
  font-weight: 600;
`;

const CurrentSubscriptionValue = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 0.875rem;
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
  expires_at?: string | null;
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
  const [selectedCreditPackage, setSelectedCreditPackage] = useState<{id: string, price: number, credits: number} | null>(null);
  // Инициализируем creditPackages с пустым массивом для предотвращения ошибок
  const [creditPackages, setCreditPackages] = useState<Array<{id: string; name: string; credits: number; price: number; price_per_credit: number; description: string}>>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  
  // Защита от undefined - убеждаемся, что creditPackages всегда массив
  // Вычисляем это значение каждый раз при рендере для безопасности
  const getSafeCreditPackages = () => {
    try {
      return Array.isArray(creditPackages) ? creditPackages : [];
    } catch (e) {
      return [];
    }
  };

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
    // Загружаем пакеты всегда, независимо от статуса подписки
    loadCreditPackages();
    
    // Проверяем, вернулись ли мы с YooMoney после оплаты
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment') === 'success';
    
    if (paymentSuccess) {
      // Очищаем URL от параметров и восстанавливаем правильное состояние
      window.history.replaceState({ page: 'shop' }, '', '/shop');
      
      // Обновляем баланс и статистику подписки
      if (isAuthenticated) {
        setBalanceRefreshTrigger(prev => prev + 1);
        setStatsRefreshTrigger(prev => prev + 1);
        
        // Показываем сообщение об успехе
        setSuccessMessage('Оплата успешно обработана! Ваш баланс обновлен.');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      }
    }
    
    // Обработка кнопки "назад" в браузере
    const handlePopState = (event: PopStateEvent) => {
      // Если вернулись с оплаты (из внешнего сайта), восстанавливаем состояние shop
      if (event.state && event.state.page === 'shop') {
        // Страница уже должна быть shop, просто обновляем данные
        if (isAuthenticated) {
          loadSubscriptionStats();
          loadCreditPackages();
        }
      } else if (!event.state || !event.state.page) {
        // Если нет состояния, но мы на /shop, восстанавливаем состояние
        if (window.location.pathname.includes('/shop')) {
          window.history.replaceState({ page: 'shop' }, '', '/shop');
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

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
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        console.log('[SHOP] Статистика получена:', statsData);
        console.log('[SHOP] is_active:', statsData.is_active);
        console.log('[SHOP] subscription_type:', statsData.subscription_type);
        console.log('[SHOP] expires_at:', statsData.expires_at);
        setStats(statsData);
      } else {
        console.error('[SHOP] Ошибка получения статистики:', response.status);
      }
    } catch (error) {
      console.error('[SHOP] Ошибка загрузки статистики подписки:', error);
    }
  };

  const loadCreditPackages = async () => {
    try {
      setIsLoadingPackages(true);
      console.log('[SHOP] Загрузка пакетов кредитов...');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/subscription/credit-packages/`);
      console.log('[SHOP] Ответ сервера:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SHOP] Данные пакетов:', data);
        if (data.success && data.packages) {
          console.log('[SHOP] Установка пакетов:', data.packages);
          setCreditPackages(data.packages);
        } else {
          console.warn('[SHOP] Неожиданный формат данных:', data);
        }
      } else {
        const errorText = await response.text();
        console.error('[SHOP] Ошибка ответа сервера:', response.status, errorText);
      }
    } catch (error) {
      console.error('[SHOP] Ошибка загрузки пакетов кредитов:', error);
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
      const successURL = `${window.location.origin}/shop`;
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
      console.error('[SHOP] Ошибка формирования ссылки QuickPay для пакета:', err);
      setError('Не удалось открыть страницу оплаты YooMoney');
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
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
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
    // Если уже выбран этот план - скрываем, иначе показываем
    setSelectedPlanForPayment(selectedPlanForPayment === subscriptionType ? null : subscriptionType);
    console.log('[SHOP] Selected plan for payment:', selectedPlanForPayment === subscriptionType ? null : subscriptionType);
  };

  const handleYoumoneyPayment = async (subscriptionType: string) => {
    console.log('[SHOP] handleYoumoneyPayment вызван:', { subscriptionType, userInfo });
    
    let currentUserId = userInfo?.id;
    
    // Если userInfo отсутствует, пытаемся загрузить его
    if (!currentUserId) {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          console.log('[SHOP] Загружаем userInfo...');
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
            console.log('[SHOP] userInfo загружен:', userData);
          }
        } catch (e) {
          console.error('[SHOP] Ошибка загрузки userInfo:', e);
        }
      }
    }
    
    if (!currentUserId) {
      console.error('[SHOP] Не удалось получить user ID');
      setError('Ошибка: не удалось определить пользователя. Попробуйте обновить страницу.');
      return;
    }

    try {
      const receiverWallet = '4100119070489003';
      const amount = subscriptionType === 'premium' ? 1299 : 599;
      const label = `plan:${subscriptionType};uid:${currentUserId}`;
      const successURL = `${window.location.origin}/shop`;
      
      // Формируем параметры отдельно для правильной кодировки
      const targets = subscriptionType === 'premium'
        ? 'Оплата подписки PREMIUM на 30 дней'
        : 'Оплата подписки STANDARD на 30 дней';
      
      // Формируем URL для YooMoney QuickPay - используем правильную кодировку
      const params = new URLSearchParams();
      params.set('receiver', receiverWallet);
      params.set('quickpay-form', 'shop');
      params.set('targets', targets);
      params.set('formcomment', 'Оплата подписки Spicychat');
      params.set('short-dest', 'Подписка Spicychat');
      params.set('sum', amount.toFixed(2));
      params.set('label', label);
      params.set('successURL', successURL);
      
      const quickPayUrl = `https://yoomoney.ru/quickpay/confirm.xml?${params.toString()}`;

      console.log('[SHOP] YooMoney URL сформирован:', quickPayUrl);
      console.log('[SHOP] Переход на страницу оплаты...');
      
      // Сохраняем состояние перед переходом на оплату
      window.history.pushState({ page: 'shop', fromPayment: true }, '', '/shop');
      
      // Переходим на страницу оплаты
      window.location.href = quickPayUrl;
    } catch (err) {
      console.error('[SHOP] Ошибка формирования ссылки QuickPay:', err);
      setError('Не удалось открыть страницу оплаты YooMoney');
    }
  };

  const handleYooKassaPayment = async (subscriptionType: string, paymentMethod: string) => {
    console.log('[SHOP] handleYooKassaPayment вызван:', { subscriptionType, paymentMethod, userInfo });
    
    if (!userInfo?.id) {
      setError('Не удалось определить пользователя для оплаты');
      return;
    }

    try {
      setIsLoading(true);
      const amount = subscriptionType === 'premium' ? 1299 : 599;
      const description = subscriptionType === 'premium'
        ? 'Оплата подписки PREMIUM на 30 дней'
        : 'Оплата подписки STANDARD на 30 дней';

      const response = await authManager.fetchWithAuth('/api/v1/kassa/create_payment/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          plan: subscriptionType,
          payment_type: 'subscription',
          payment_method: paymentMethod
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка создания платежа' }));
        throw new Error(errorData.detail || 'Ошибка создания платежа');
      }

      const data = await response.json();
      
      // Переходим на страницу оплаты ЮKassa
      window.location.href = data.confirmation_url;
    } catch (err) {
      console.error('[SHOP] Ошибка создания платежа ЮKassa:', err);
      setError(err instanceof Error ? err.message : 'Не удалось создать платеж');
    } finally {
      setIsLoading(false);
    }
  };

  const handleYooKassaCreditTopUp = async (packageId: string, price: number, credits: number, paymentMethod: string) => {
    console.log('[SHOP] handleYooKassaCreditTopUp вызван:', { packageId, price, credits, paymentMethod });
    
    if (!userInfo?.id) {
      setError('Не удалось определить пользователя для оплаты');
      return;
    }

    try {
      setIsLoading(true);
      const description = `Покупка ${credits} кредитов`;

      const response = await authManager.fetchWithAuth('/api/v1/kassa/create_payment/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: price,
          description,
          package_id: packageId,
          payment_type: 'topup',
          payment_method: paymentMethod
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка создания платежа' }));
        throw new Error(errorData.detail || 'Ошибка создания платежа');
      }

      const data = await response.json();
      
      // Переходим на страницу оплаты ЮKassa
      window.location.href = data.confirmation_url;
    } catch (err) {
      console.error('[SHOP] Ошибка создания платежа ЮKassa:', err);
      setError(err instanceof Error ? err.message : 'Не удалось создать платеж');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPayment = async (packageId: string, paymentType: string = 'topup', plan?: string) => {
    console.log('[SHOP] handleTestPayment вызван:', { packageId, paymentType, plan });
    
    if (!userInfo?.id) {
      setError('Не удалось определить пользователя для оплаты');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await authManager.fetchWithAuth('/api/v1/kassa/test-webhook/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userInfo.id,
          payment_type: paymentType,
          package_id: packageId,
          plan: plan
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка тестового платежа' }));
        throw new Error(errorData.detail || 'Ошибка тестового платежа');
      }

      const data = await response.json();
      
      setSuccessMessage(`Тестовый платеж успешно обработан! Зачислено: ${data.result?.credits || 'кредиты/подписка'}`);
      setShowSuccessToast(true);
      
      // Обновляем баланс и статистику
      setBalanceRefreshTrigger(prev => prev + 1);
      setStatsRefreshTrigger(prev => prev + 1);
      
      // Закрываем выбор пакета
      setSelectedCreditPackage(null);
      setSelectedPlanForPayment(null);
      
    } catch (err) {
      console.error('[SHOP] Ошибка тестового платежа:', err);
      setError(err instanceof Error ? err.message : 'Не удалось обработать тестовый платеж');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainContainer>
      <ContentWrapper>
        <CurrentSubscriptionCard>
          <CurrentSubscriptionLabel>Текущая подписка</CurrentSubscriptionLabel>
          <CurrentSubscriptionValue>
            {(() => {
              const subscriptionType = stats?.subscription_type || 'free';
              // Если subscription_type "none", показываем "FREE"
              const displayType = subscriptionType === 'none' ? 'free' : subscriptionType;
              return displayType.toUpperCase();
            })()}
          </CurrentSubscriptionValue>
        </CurrentSubscriptionCard>
        
        <PageTitle>
          <h1>
            <SplitText text="Магазин" delay={50} />
          </h1>
          <p>Выберите подписку и получите доступ ко всем возможностям</p>
        </PageTitle>
        
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
                <PlanFeature>100 кредитов</PlanFeature>
                <PlanFeature>5 генераций фото</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Премиум модель с ограничением на 20 сообщений</PlanFeature>
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
                <PlanFeature>1500 кредитов в месяц</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
                <PlanFeature>Максимум токенов: 400 токенов на ответ</PlanFeature>
                <PlanFeature>Лимит генерации в очереди: 3 фото одновременно</PlanFeature>
              </PlanFeatures>
              {stats?.is_active && stats?.subscription_type === 'standard' ? (
                <>
                  <ActivateButton 
                    onClick={() => handleActivateSubscription('standard')}
                    disabled={isLoading}
                  >
                    {selectedPlanForPayment === 'standard' ? 'Скрыть способы оплаты' : 'Продлить подписку'}
                  </ActivateButton>
                  {selectedPlanForPayment === 'standard' && (
                    <>
                      <PaymentButtonsContainer>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'sberbank')}>
                          <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                          SberPay
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'yoo_money')}>
                          <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                          ЮMoney
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'bank_card')}>
                          <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                          Банковские карты
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'sbp')}>
                          <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                          СБП
                        </PaymentButton>
                      </PaymentButtonsContainer>
                      <TestPaymentLabel>Тестовые платежи (без реальных денег)</TestPaymentLabel>
                      <PaymentButtonsContainer>
                        <TestPaymentButton onClick={() => handleTestPayment('', 'subscription', 'standard')}>
                          Тестовая оплата Standard
                        </TestPaymentButton>
                      </PaymentButtonsContainer>
                    </>
                  )}
                </>
              ) : (
                <>
                  <ActivateButton 
                    onClick={() => handleActivateSubscription('standard')}
                    disabled={isLoading}
                  >
                    {selectedPlanForPayment === 'standard' ? 'Скрыть способы оплаты' : 'Активировать'}
                  </ActivateButton>
                  {selectedPlanForPayment === 'standard' && (
                    <>
                      <PaymentButtonsContainer>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'sberbank')}>
                          <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                          SberPay
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'yoo_money')}>
                          <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                          ЮMoney
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'bank_card')}>
                          <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                          Банковские карты
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('standard', 'sbp')}>
                          <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                          СБП
                        </PaymentButton>
                      </PaymentButtonsContainer>
                      <TestPaymentLabel>Тестовые платежи (без реальных денег)</TestPaymentLabel>
                      <PaymentButtonsContainer>
                        <TestPaymentButton onClick={() => handleTestPayment('', 'subscription', 'standard')}>
                          Тестовая оплата Standard
                        </TestPaymentButton>
                      </PaymentButtonsContainer>
                    </>
                  )}
                </>
              )}
            </PlanCard>
            
            <PlanCard>
              <PlanName>Premium</PlanName>
              <PlanPrice>1299₽</PlanPrice>
              <PlanFeatures>
                <PlanFeature>5000 кредитов в месяц</PlanFeature>
                <PlanFeature>Возможность создать своих персонажей</PlanFeature>
                <PlanFeature>Сохранение истории сообщений</PlanFeature>
                <PlanFeature>Возможность создавать платные альбомы</PlanFeature>
                <PlanFeature>Доступ ко всем платным альбомам</PlanFeature>
                <PlanFeature>Доступ ко всем галереям пользователей</PlanFeature>
                <PlanFeature $isHighlighted>Выбор модели (PREMIUM могут выбрать модель сами)</PlanFeature>
                <PlanFeature $isHighlighted>Максимум токенов: 850 токенов на ответ</PlanFeature>
                <PlanFeature>Лимит генерации в очереди: 5 фото одновременно</PlanFeature>
              </PlanFeatures>
              {stats?.is_active && stats?.subscription_type === 'premium' ? (
                <>
                  <ActivateButton 
                    onClick={() => handleActivateSubscription('premium')}
                    disabled={isLoading}
                  >
                    {selectedPlanForPayment === 'premium' ? 'Скрыть способы оплаты' : 'Продлить подписку'}
                  </ActivateButton>
                  {selectedPlanForPayment === 'premium' && (
                    <>
                      <PaymentButtonsContainer>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'sberbank')}>
                          <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                          SberPay
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'yoo_money')}>
                          <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                          ЮMoney
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'bank_card')}>
                          <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                          Банковские карты
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'sbp')}>
                          <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                          СБП
                        </PaymentButton>
                      </PaymentButtonsContainer>
                      <TestPaymentLabel>Тестовые платежи (без реальных денег)</TestPaymentLabel>
                      <PaymentButtonsContainer>
                        <TestPaymentButton onClick={() => handleTestPayment('', 'subscription', 'premium')}>
                          Тестовая оплата Premium
                        </TestPaymentButton>
                      </PaymentButtonsContainer>
                    </>
                  )}
                </>
              ) : (
                <>
                  <ActivateButton 
                    onClick={() => handleActivateSubscription('premium')}
                    disabled={isLoading}
                  >
                    {selectedPlanForPayment === 'premium' ? 'Скрыть способы оплаты' : 'Активировать'}
                  </ActivateButton>
                  {selectedPlanForPayment === 'premium' && (
                    <>
                      <PaymentButtonsContainer>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'sberbank')}>
                          <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                          SberPay
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'yoo_money')}>
                          <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                          ЮMoney
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'bank_card')}>
                          <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                          Банковские карты
                        </PaymentButton>
                        <PaymentButton onClick={() => handleYooKassaPayment('premium', 'sbp')}>
                          <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                          СБП
                        </PaymentButton>
                      </PaymentButtonsContainer>
                      <TestPaymentLabel>Тестовые платежи (без реальных денег)</TestPaymentLabel>
                      <PaymentButtonsContainer>
                        <TestPaymentButton onClick={() => handleTestPayment('', 'subscription', 'premium')}>
                          Тестовая оплата Premium
                        </TestPaymentButton>
                      </PaymentButtonsContainer>
                    </>
                  )}
                </>
              )}
            </PlanCard>
          </SubscriptionPlans>

        </SubscriptionSection>

        {/* Секция разовой докупки кредитов */}
        {isAuthenticated && (
          <SubscriptionSection style={{ marginTop: '4rem' }}>
            <SectionTitle>Докупить кредиты</SectionTitle>
            <p style={{ 
              textAlign: 'center', 
              color: '#b8b8b8', 
              fontSize: '1rem', 
              marginBottom: '2rem',
              maxWidth: '800px',
              margin: '0 auto 2rem'
            }}>
              Закончились кредиты? Докупите пакет и продолжайте общение! Кредиты суммируются с текущим балансом.
            </p>
            
            <SubscriptionPlans>
              {isLoadingPackages ? (
                <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                  Загрузка пакетов...
                </div>
              ) : (() => {
                  // Защита от undefined - убеждаемся, что creditPackages всегда массив
                  try {
                    const safePackages = Array.isArray(creditPackages) ? creditPackages : [];
                    if (safePackages.length > 0) {
                      return safePackages.map((pkg: any) => (
                  <PlanCard key={pkg.id} style={{ position: 'relative' }}>
                    <PlanName>{pkg.name}</PlanName>
                    <PlanPrice>{pkg.price}₽</PlanPrice>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: '#a78bfa', 
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}>
                      {pkg.credits} кредитов
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#888', 
                      marginBottom: '1.5rem',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      {pkg.description}
                    </div>
                    <ActivateButton
                      onClick={() => {
                        if (selectedCreditPackage?.id === pkg.id) {
                          setSelectedCreditPackage(null);
                        } else {
                          setSelectedCreditPackage({ id: pkg.id, price: pkg.price, credits: pkg.credits });
                        }
                      }}
                      disabled={isLoadingPackages}
                    >
                      {selectedCreditPackage?.id === pkg.id ? 'Скрыть способы оплаты' : `Купить за ${pkg.price}₽`}
                    </ActivateButton>
                    {selectedCreditPackage?.id === pkg.id && (
                      <>
                        <PaymentButtonsContainer>
                          <PaymentButton onClick={() => handleYooKassaCreditTopUp(pkg.id, pkg.price, pkg.credits, 'sberbank')}>
                            <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                            SberPay
                          </PaymentButton>
                          <PaymentButton onClick={() => handleYooKassaCreditTopUp(pkg.id, pkg.price, pkg.credits, 'yoo_money')}>
                            <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                            ЮMoney
                          </PaymentButton>
                          <PaymentButton onClick={() => handleYooKassaCreditTopUp(pkg.id, pkg.price, pkg.credits, 'bank_card')}>
                            <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                            Банковские карты
                          </PaymentButton>
                          <PaymentButton onClick={() => handleYooKassaCreditTopUp(pkg.id, pkg.price, pkg.credits, 'sbp')}>
                            <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                            СБП
                          </PaymentButton>
                        </PaymentButtonsContainer>
                        <TestPaymentLabel>Тестовые платежи (без реальных денег)</TestPaymentLabel>
                        <PaymentButtonsContainer>
                          <TestPaymentButton onClick={() => handleTestPayment(pkg.id, 'topup')}>
                            Тестовая оплата {pkg.name}
                          </TestPaymentButton>
                        </PaymentButtonsContainer>
                      </>
                    )}
                      </PlanCard>
                      ));
                    } else {
                      return (
                        <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                          Пакеты временно недоступны
                        </div>
                      );
                    }
                  } catch (e) {
                    return (
                      <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>
                        Ошибка загрузки пакетов
                      </div>
                    );
                  }
                })()}
            </SubscriptionPlans>
          </SubscriptionSection>
        )}
        
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

