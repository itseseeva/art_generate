import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion } from 'motion/react';
import { AuthModal } from './AuthModal';
import { SuccessToast } from './SuccessToast';
import SplitText from './SplitText';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { FiCheck, FiCpu, FiImage, FiMessageSquare, FiZap } from 'react-icons/fi';

import { GlobalHeader } from './GlobalHeader';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 0;
  overflow-y: visible;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
`;

const BonusValue = styled.span`
  color: #db2777;
  font-weight: 800;
  margin-left: 2px;
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

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ToggleContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 30px;
  padding: 4px;
  display: flex;
  gap: 4px;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? '#7c3aed' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#888'};
  border: none;
  border-radius: 25px;
  padding: 0.5rem 2rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: white;
    background: ${props => props.$active ? '#7c3aed' : 'rgba(124, 58, 237, 0.1)'};
  }
`;

const SaleBanner = styled.div`
  width: 100%;
  max-width: 800px;
  border: 1px solid #d946ef;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  background: rgba(217, 70, 239, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(217, 70, 239, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }
`;

const SaleText = styled.span`
  font-family: 'Monoton', cursive, sans-serif; /* Fallback */
  font-size: 1.8rem;
  font-weight: 800;
  color: #f0abfc;
  font-style: italic;
  text-shadow: 0 0 10px rgba(217, 70, 239, 0.5);
  letter-spacing: 1px;
`;

const DiscountTag = styled.div`
  background: #000;
  border: 1px solid #d946ef;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 800;
  font-size: 1.2rem;
  transform: skew(-10deg);
  box-shadow: 0 0 10px rgba(217, 70, 239, 0.5);
`;

const DurationTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  width: 100%;
  max-width: 800px;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const DurationTab = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? '#7c3aed' : '#1a1a1a'};
  border: 1px solid ${props => props.$active ? '#7c3aed' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  padding: 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: #7c3aed;
    background: ${props => props.$active ? '#7c3aed' : 'rgba(124, 58, 237, 0.1)'};
  }
`;

const SaveTag = styled.span`
  position: absolute;
  top: -12px;
  right: -8px;
  background: linear-gradient(135deg, #be185d 0%, #db2777 100%);
  color: white;
  font-size: 0.55rem;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 800;
  transform: rotate(3deg);
  box-shadow: 0 2px 8px rgba(190, 24, 93, 0.4);
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 1000px;
  perspective: 1000px;
  align-items: end; /* Ровняем банеры по нижней линии */

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`;

const PlanCard = styled(motion.div) <{ $highlight?: boolean; $selected?: boolean; $planType?: 'free' | 'standard' | 'premium' }>`
  background: ${props => props.$highlight
    ? 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)'
    : 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)'};
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: ${props => {
    if (props.$planType === 'free') return '480px';
    if (props.$planType === 'standard') return '580px';
    if (props.$planType === 'premium') return '610px';
    return '550px';
  }};
  backdrop-filter: blur(20px);
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: visible;
  /* Улучшение рендеринга для предотвращения тряски */
  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform, box-shadow;

  @media (max-width: 900px) {
    min-height: auto;
  }
  
  ${props => props.$highlight && css`
    box-shadow: 0 4px 30px rgba(138, 43, 226, 0.15);
  `}

  &:hover {
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.2);
  }
`;

const BestValueBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 20px;
  background: #7c3aed;
  color: white;
  font-weight: 800;
  font-size: 0.7rem;
  padding: 4px 12px;
  border-radius: 20px; /* Более закругленный */
  text-transform: uppercase;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
  white-space: nowrap;
  z-index: 100;
  letter-spacing: 0.5px;
`;

const PlanHeader = styled.div`
  margin-bottom: 1.5rem;
`;

const PlanTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.color || 'white'};
  margin-bottom: 0.25rem;
`;

const BillingInfo = styled.div`
  font-size: 0.75rem;
  color: #666;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

const Price = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: white;
`;

const Period = styled.span`
  font-size: 0.9rem;
  color: #888;
`;

const OldPrice = styled.div`
  font-size: 0.9rem;
  color: #666;
  text-decoration: line-through;
`;

const CheckoutButton = styled(motion.button)`
  width: 100%;
  height: 48px; /* Фиксированная высота для одинакового размера */
  border: none;
  border-radius: 12px;
  padding: 0 1.2rem;
  color: white;
  font-weight: 800;
  font-size: 0.95rem; /* Уменьшил размер шрифта */
  margin-top: auto;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }

  &:hover::before {
    left: 100%;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #333;
    box-shadow: none;
  }
`;

const FeaturesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2.5rem; /* Увеличил отступ снизу, чтобы кнопка не липла к тексту */
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: #ccc;
  align-items: flex-start;
  line-height: 1.4;

  svg {
    color: #fbbf24;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const PaymentLogo = styled.img`
  width: 38px;
  height: 38px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
  background: transparent;
  display: block;
  
  &[src=""] {
    display: none;
  }
`;

const VPNWarning = styled.div`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
  animation: fadeIn 0.3s ease;
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

type BillingCycle = 'monthly' | '3_months' | '6_months' | 'yearly';

const DISCOUNTS = {
  'monthly': 0,
  '3_months': 0.15,
  '6_months': 0.20,
  'yearly': 0.25
};

const CYCLE_MONTHS = {
  'monthly': 1,
  '3_months': 3,
  '6_months': 6,
  'yearly': 12
};

export const ShopPage: React.FC<any> = ({
  onBackToMain,
  isAuthenticated: propIsAuthenticated,
  userInfo: propUserInfo,
  onProfile,
  onShop,
  onHome,
  onLogin,
  onRegister,
  onLogout
}) => {
  const [viewMode, setViewMode] = useState<'subscription' | 'credits'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'credits') return 'credits';
      if (tab === 'subscription') return 'subscription';
    }
    return 'subscription';
  });
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('3_months');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false);
  const [userInfo, setUserInfo] = useState(propUserInfo || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  useEffect(() => {
    if (propIsAuthenticated !== undefined) setIsAuthenticated(propIsAuthenticated);
    if (propUserInfo !== undefined) {
      setUserInfo(propUserInfo);
      if (propUserInfo?.country) {
        setUserCountry(propUserInfo.country);
      }
    }
  }, [propIsAuthenticated, propUserInfo]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionStats();
      loadUserInfo();
    }
    loadCreditPackages();
  }, [isAuthenticated]);

  const loadUserInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.country) {
          setUserCountry(data.country);
        }
      }
    } catch (e) {
      // Ошибка загрузки информации о пользователе
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (e) {
      // Ошибка загрузки статистики подписки
    }
  };

  const loadCreditPackages = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/subscription/credit-packages/`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) setCreditPackages(data.packages);
      }
    } catch (e) {
      // Ошибка загрузки пакетов кредитов
    }
  };

  const calculatePrice = (basePrice: number) => {
    const months = CYCLE_MONTHS[billingCycle];
    const discount = DISCOUNTS[billingCycle];

    // Рассчитываем месячную цену со скидкой и округляем её
    const monthlyDiscounted = basePrice * (1 - discount);
    const roundedMonthly = Math.floor(monthlyDiscounted); // Используем floor для более привлекательной цены

    // Итоговая цена должна быть строго кратна месячной
    const totalDiscounted = roundedMonthly * months;
    const totalOriginal = basePrice * months;

    return {
      monthly: roundedMonthly,
      total: totalDiscounted,
      originalMonthly: basePrice,
      originalTotal: totalOriginal,
      discountPercent: Math.round(discount * 100)
    };
  };

  const getBillingText = () => {
    return ''; // Удалено "Списывается ежемесячно"
  };

  const handleSubscriptionClick = (plan: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    handlePayment(plan, 'sbp');
  };

  const handlePayment = async (plan: string, method: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      // Базовые цены: 499₽ для STANDARD и 1199₽ для PREMIUM
      const basePrice = plan === 'premium' ? 1199 : 449;
      const priceInfo = calculatePrice(basePrice);
      const amount = priceInfo.total;
      const description = `${plan.toUpperCase()} Subscription (${billingCycle.replace('_', ' ')})`;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          description,
          plan,
          months: CYCLE_MONTHS[billingCycle],
          payment_type: 'subscription',
          payment_method: method
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка создания платежа' }));
        throw new Error(errorData.detail || 'Ошибка создания платежа');
      }

      const data = await response.json();
      window.location.href = data.confirmation_url;
    } catch (e) {
      // Ошибка обработки платежа
    }
  };

  const handleTestPayment = async (plan: string) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const basePrice = plan === 'premium' ? 1199 : 449;
      const priceInfo = calculatePrice(basePrice);
      const amount = priceInfo.total;
      const description = `[TEST] ${plan.toUpperCase()} Subscription`;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          description,
          plan,
          months: CYCLE_MONTHS[billingCycle],
          payment_type: 'subscription',
          payment_method: 'bank_card',
          is_test: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.confirmation_url;
      }
    } catch (e) {
      // Ошибка теста
    }
  };

  const handleCreditPayment = async (pkg: any, method: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/kassa/create_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: pkg.price,
          description: `Buy ${pkg.credits} credits`,
          package_id: pkg.id,
          payment_type: 'topup',
          payment_method: method
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.confirmation_url;
      }
    } catch (e) {
      // Ошибка обработки платежа за кредиты
    }
  };

  const renderSubscriptionContent = () => {
    // Базовые цены: 499₽ для STANDARD и 1199₽ для PREMIUM
    const premiumBasePrice = 1199;
    const standardBasePrice = 449;
    const premiumPrice = calculatePrice(premiumBasePrice);
    const standardPrice = calculatePrice(standardBasePrice);
    const months = CYCLE_MONTHS[billingCycle];
    const isYearly = billingCycle === 'yearly';
    const is6Months = billingCycle === '6_months';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <SaleBanner>
          <SaleText>СПЕЦИАЛЬНОЕ ПРЕДЛОЖЕНИЕ</SaleText>
          <DiscountTag>СКИДКА ДО 25%</DiscountTag>
        </SaleBanner>

        <DurationTabs>
          <DurationTab $active={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
            Год
            <SaveTag>SAVE 25% + 15% БОНУС</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === '6_months'} onClick={() => setBillingCycle('6_months')}>
            6 Месяцев
            <SaveTag>SAVE 20% + 10% БОНУС</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === '3_months'} onClick={() => setBillingCycle('3_months')}>
            3 Месяца
            <SaveTag>SAVE 15% + 5% БОНУС</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
            Месяц
          </DurationTab>
        </DurationTabs>

        {userCountry && userCountry.toLowerCase() !== 'ru' && userCountry.toLowerCase() !== 'russia' && (
          <VPNWarning style={{ maxWidth: '800px', marginBottom: '2rem' }}>
            Платёжные способы не работают с VPN!
          </VPNWarning>
        )}

        <PlansGrid>
          {/* PREMIUM CARD */}
          <PlanCard
            $planType="premium"
            $highlight={true}
            $selected={selectedPlan === 'premium'}
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              borderColor: selectedPlan === 'premium' ? '#7c3aed' : 'rgba(124, 58, 237, 0.3)',
              boxShadow: selectedPlan === 'premium' ? '0 0 40px rgba(124, 58, 237, 0.3)' : 'none'
            }}
          >
            <BestValueBadge>ЛУЧШИЙ ВЫБОР</BestValueBadge>
            <PlanHeader>
              <PlanTitle color="white">
                Premium
              </PlanTitle>
              <PriceContainer>
                <Price style={{ color: 'white' }}>{premiumPrice.monthly}₽</Price>
                <Period style={{ color: 'white' }}>/мес</Period>
              </PriceContainer>
              {billingCycle !== 'monthly' && (
                <OldPrice style={{ color: 'white' }}>{premiumPrice.originalMonthly}₽/мес</OldPrice>
              )}
              <BillingInfo style={{ color: 'white' }}>{getBillingText()}</BillingInfo>
            </PlanHeader>

            <FeaturesList>
              <FeatureItem>
                <FiCheck style={{ color: '#7c3aed' }} />
                <span style={{ color: 'white' }}>
                  {billingCycle === 'monthly' ? "300" : (
                    <>{isYearly ? "3600" : is6Months ? "1800" : "900"} <BonusValue>+ {isYearly ? "540" : is6Months ? "180" : "45"}</BonusValue></>
                  )} фото-генераций
                </span>
              </FeatureItem>
              <FeatureItem>
                <FiCheck style={{ color: '#7c3aed' }} />
                <span style={{ color: 'white' }}>
                  {billingCycle === 'monthly' ? "300" : (
                    <>{isYearly ? "3600" : is6Months ? "1800" : "900"} <BonusValue>+ {isYearly ? "540" : is6Months ? "180" : "45"}</BonusValue></>
                  )} голосовых сообщений
                </span>
              </FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Доступ ко всем персонажам</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Глубокая память (16 000 токенов)</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Сохранение истории сообщений</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Создание платных альбомов</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Доступ ко всем платным альбомам</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Доступ к галереям других пользователей (только Premium)</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Доступ к Pro моделям</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Приоритет в очереди генерации</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Возможность загружать свои голоса для озвучки</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Безлимитное создание персонажей</span></FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#7c3aed' }} /> <span style={{ color: 'white' }}>Доступ к Premium голосам</span></FeatureItem>
            </FeaturesList>

            <div style={{ position: 'relative', marginTop: 'auto' }}>
              <CheckoutButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); handleSubscriptionClick('premium'); }}
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" style={{ width: '32px', height: '32px' }} />
                  <span>Купить за {premiumPrice.total}₽</span>
                </div>
                {billingCycle !== 'monthly' && (
                  <span style={{ opacity: 0.7, fontSize: '0.8rem', textDecoration: 'line-through' }}>{premiumPrice.originalTotal}₽</span>
                )}
              </CheckoutButton>

              {userInfo?.is_admin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTestPayment('premium'); }}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    background: 'transparent',
                    border: '1px dashed #ef4444',
                    color: '#ef4444',
                    padding: '0.3rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer'
                  }}
                >
                  ТЕСТОВАЯ ПОКУПКА (ADMIN)
                </button>
              )}
            </div>
          </PlanCard>

          {/* LITE (STANDARD) CARD */}
          <PlanCard
            $planType="standard"
            $selected={selectedPlan === 'standard'}
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              borderColor: selectedPlan === 'standard' ? '#fbbf24' : 'rgba(251, 191, 36, 0.3)',
              boxShadow: selectedPlan === 'standard' ? '0 0 40px rgba(251, 191, 36, 0.2)' : 'none'
            }}
          >
            <PlanHeader>
              <PlanTitle color="#fbbf24">
                Standard
              </PlanTitle>
              <PriceContainer>
                <Price>{standardPrice.monthly}₽</Price>
                <Period>/мес</Period>
              </PriceContainer>
              {billingCycle !== 'monthly' && (
                <OldPrice>{standardPrice.originalMonthly}₽/мес</OldPrice>
              )}
              <BillingInfo>{getBillingText()}</BillingInfo>
            </PlanHeader>

            <FeaturesList>
              <FeatureItem>
                <FiCheck style={{ color: '#fbbf24' }} />
                <span style={{ color: 'white' }}>
                  {billingCycle === 'monthly' ? "100" : (
                    <>{isYearly ? "1200" : is6Months ? "600" : "300"} <BonusValue>+ {isYearly ? "180" : is6Months ? "60" : "15"}</BonusValue></>
                  )} фото-генераций
                </span>
              </FeatureItem>
              <FeatureItem>
                <FiCheck style={{ color: '#fbbf24' }} />
                <span style={{ color: 'white' }}>
                  {billingCycle === 'monthly' ? "100" : (
                    <>{isYearly ? "1200" : is6Months ? "600" : "300"} <BonusValue>+ {isYearly ? "180" : is6Months ? "60" : "15"}</BonusValue></>
                  )} голосовых сообщений
                </span>
              </FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Доступ ко всем персонажам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Расширенная память (8 000 токенов)</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Сохранение истории сообщений</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Создание 10 персонажей</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Создание платных альбомов</FeatureItem>
            </FeaturesList>

            <div style={{ position: 'relative', marginTop: 'auto' }}>
              <CheckoutButton
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); handleSubscriptionClick('standard'); }}
                style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: 'black' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" style={{ width: '32px', height: '32px' }} />
                  <span>Купить за {standardPrice.total}₽</span>
                </div>
                {billingCycle !== 'monthly' && (
                  <span style={{ opacity: 0.7, fontSize: '0.8rem', textDecoration: 'line-through' }}>{standardPrice.originalTotal}₽</span>
                )}
              </CheckoutButton>

              {userInfo?.is_admin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTestPayment('standard'); }}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    background: 'transparent',
                    border: '1px dashed #ef4444',
                    color: '#ef4444',
                    padding: '0.3rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer'
                  }}
                >
                  ТЕСТОВАЯ ПОКУПКА (ADMIN)
                </button>
              )}
            </div>
          </PlanCard>

          {/* FREE CARD */}
          <PlanCard
            $planType="free"
            $selected={selectedPlan === 'free'}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{
              borderColor: selectedPlan === 'free' ? '#888' : 'rgba(136, 136, 136, 0.2)',
            }}
          >
            <PlanHeader>
              <PlanTitle color="#888">
                Free
              </PlanTitle>
              <PriceContainer>
                <Price>Бесплатно</Price>
              </PriceContainer>
              <BillingInfo>Навсегда бесплатно</BillingInfo>
            </PlanHeader>

            <FeaturesList>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> 100 кредитов</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Ограничение сообщений: 10</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> 5 генераций фото</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Доступ ко всем персонажам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Создание 1 персонажа</FeatureItem>
            </FeaturesList>

            <CheckoutButton
              disabled
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#666',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'none'
              }}
            >
              Текущий план
            </CheckoutButton>
          </PlanCard>
        </PlansGrid>
      </motion.div>
    );
  };

  const renderCreditsContent = () => {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {userCountry && userCountry.toLowerCase() !== 'ru' && userCountry.toLowerCase() !== 'russia' && (
          <VPNWarning style={{ maxWidth: '800px', marginBottom: '2rem' }}>
            Платёжные способы не работают с VPN!
          </VPNWarning>
        )}
        <PlansGrid>
          {creditPackages.map((pkg, index) => (
            <PlanCard
              key={pkg.id}
              $selected={selectedPlan === pkg.id}
              whileHover={{ y: -8, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PlanHeader>
                <PlanTitle color="#a78bfa">{pkg.name}</PlanTitle>
                <PriceContainer>
                  <Price>{pkg.price}₽</Price>
                </PriceContainer>
                <BillingInfo>{pkg.credits} Кредитов</BillingInfo>
              </PlanHeader>

              <FeaturesList>
                <FeatureItem><FiCheck /> Разовая оплата</FeatureItem>
                <FeatureItem><FiCheck /> Кредиты не сгорают</FeatureItem>
                <FeatureItem><FiCheck /> Для генераций и общения</FeatureItem>
              </FeaturesList>

              <div style={{ position: 'relative', marginTop: 'auto' }}>
                <CheckoutButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => { e.stopPropagation(); handleCreditPayment(pkg, 'sbp'); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" style={{ width: '32px', height: '32px' }} />
                    <span>Купить сейчас</span>
                  </div>
                </CheckoutButton>
              </div>
            </PlanCard>
          ))}
        </PlansGrid>
      </motion.div>
    );
  };

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <GlobalHeader
        onHome={onHome || onBackToMain}
        onProfile={onProfile}
        onShop={onShop}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
      />
      <ContentWrapper>
        {renderSubscriptionContent()}
      </ContentWrapper>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(accessToken, refreshToken) => {
            authManager.setTokens(accessToken, refreshToken);
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            loadSubscriptionStats();
          }}
        />
      )}
    </MainContainer>
  );
};
