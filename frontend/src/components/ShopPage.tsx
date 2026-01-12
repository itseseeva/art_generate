import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { AuthModal } from './AuthModal';
import { SuccessToast } from './SuccessToast';
import SplitText from './SplitText';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { FiCheck, FiCpu, FiImage, FiMessageSquare, FiZap } from 'react-icons/fi';
import { FaBitcoin } from 'react-icons/fa';

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

const PlanCard = styled(motion.div)<{ $highlight?: boolean; $selected?: boolean; $planType?: 'free' | 'standard' | 'premium' }>`
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
  background: #ef4444;
  color: white;
  font-weight: 800;
  font-size: 0.7rem;
  padding: 4px 12px;
  border-radius: 20px; /* Более закругленный */
  text-transform: uppercase;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
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
  padding: 0.6rem 0.8rem;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.6rem;
  background: #343042;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    background: #3d394d;
    border-color: rgba(124, 58, 237, 0.3);
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
  '3_months': 0.10,
  '6_months': 0.15,
  'yearly': 0.20
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
  onProfile
}) => {
  const [viewMode, setViewMode] = useState<'subscription' | 'credits'>('subscription');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false);
  const [userInfo, setUserInfo] = useState(propUserInfo || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPaymentOptions, setShowPaymentOptions] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (propIsAuthenticated !== undefined) setIsAuthenticated(propIsAuthenticated);
    if (propUserInfo !== undefined) setUserInfo(propUserInfo);
  }, [propIsAuthenticated, propUserInfo]);

  useEffect(() => {
    if (isAuthenticated) loadSubscriptionStats();
    loadCreditPackages();
  }, [isAuthenticated]);

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
    if (billingCycle === 'monthly') return 'Списывается ежемесячно';
    return ''; // Удалено "Списывается каждые X месяца(ев)"
  };

  const handleSubscriptionClick = (plan: string) => {
    if (!isAuthenticated) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setShowPaymentOptions(showPaymentOptions === plan ? null : plan);
  };

  const handlePayment = async (plan: string, method: string) => {
    if (!userInfo?.id) return;

    try {
      // Используем актуальные цены (Standard теперь 499)
      const priceInfo = calculatePrice(plan === 'premium' ? 1299 : 499);
      const amount = priceInfo.total;
      const description = `${plan.toUpperCase()} Subscription (${billingCycle.replace('_', ' ')})`;

      const token = localStorage.getItem('authToken');
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

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.confirmation_url;
      }
    } catch (e) {
      // Ошибка обработки платежа
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
    const premiumPrice = calculatePrice(1299);
    const standardPrice = calculatePrice(499); // Изменено с 599 на 499
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
        <DurationTabs>
          <DurationTab $active={billingCycle === 'yearly'} onClick={() => setBillingCycle('yearly')}>
            Год
            <SaveTag>SAVE 20% + 10% БОНУС</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === '6_months'} onClick={() => setBillingCycle('6_months')}>
            6 Месяцев
            <SaveTag>SAVE 15% + 5% БОНУС</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === '3_months'} onClick={() => setBillingCycle('3_months')}>
            3 Месяца
            <SaveTag>SAVE 10%</SaveTag>
          </DurationTab>
          <DurationTab $active={billingCycle === 'monthly'} onClick={() => setBillingCycle('monthly')}>
            Месяц
          </DurationTab>
        </DurationTabs>

        <PlansGrid>
          {/* PREMIUM CARD */}
          <PlanCard 
            $planType="premium"
            $highlight={true} 
            $selected={selectedPlan === 'premium'}
            onClick={() => setSelectedPlan('premium')}
            whileHover={{ y: -12, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ 
              borderColor: selectedPlan === 'premium' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
              boxShadow: selectedPlan === 'premium' ? '0 0 40px rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            <BestValueBadge>ЛУЧШИЙ ВЫБОР</BestValueBadge>
            <PlanHeader>
              <PlanTitle color="#ef4444">
                Premium <FaBitcoin />
              </PlanTitle>
              <PriceContainer>
                <Price>{premiumPrice.monthly}₽</Price>
                <Period>/мес</Period>
              </PriceContainer>
              <OldPrice>{premiumPrice.originalMonthly}₽/мес</OldPrice>
              <BillingInfo>{getBillingText()}</BillingInfo>
            </PlanHeader>

            <FeaturesList>
              <FeatureItem>
                <FiCheck style={{ color: '#ef4444' }} /> 
                {isYearly ? (
                  <span style={{color: '#ef4444', fontWeight: 'bold'}}>
                    {Math.round(5000 * months * 1.1)} кредитов (+10% БОНУС)
                  </span>
                ) : is6Months ? (
                  <span style={{color: '#ef4444', fontWeight: 'bold'}}>
                    {Math.round(5000 * months * 1.05)} кредитов (+5% БОНУС)
                  </span>
                ) : (
                  `${5000 * months} кредитов`
                )}
              </FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Доступ ко всем персонажам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Глубокая память (16 000 токенов)</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Сохранение истории сообщений</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Создание платных альбомов</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Доступ ко всем платным альбомам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Доступ ко всем галереям пользователей</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> Выбор модели (PREMIUM могут выбрать модель сами)</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#ef4444' }} /> <span style={{color: '#ef4444'}}>Приоритет в очереди генерации</span></FeatureItem>
            </FeaturesList>

            <CheckoutButton 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); handleSubscriptionClick('premium'); }}
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' }}
            >
              Купить за {premiumPrice.total}₽
              <span style={{opacity: 0.7, fontSize: '0.8rem', textDecoration: 'line-through'}}>{premiumPrice.originalTotal}₽</span>
            </CheckoutButton>

            <AnimatePresence>
              {showPaymentOptions === 'premium' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <PaymentButtonsContainer>
                    <PaymentButton onClick={() => handlePayment('premium', 'sberbank')}>
                      <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                      SberPay
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('premium', 'yoo_money')}>
                      <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                      ЮMoney
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('premium', 'bank_card')}>
                      <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                      Банковские карты
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('premium', 'sbp')}>
                      <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                      СБП
                    </PaymentButton>
                  </PaymentButtonsContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </PlanCard>

          {/* LITE (STANDARD) CARD */}
          <PlanCard
            $planType="standard"
            $selected={selectedPlan === 'standard'}
            onClick={() => setSelectedPlan('standard')}
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
                Standard <FaBitcoin />
              </PlanTitle>
              <PriceContainer>
                <Price>{standardPrice.monthly}₽</Price>
                <Period>/мес</Period>
              </PriceContainer>
              <OldPrice>{standardPrice.originalMonthly}₽/мес</OldPrice>
              <BillingInfo>{getBillingText()}</BillingInfo>
            </PlanHeader>

            <FeaturesList>
              <FeatureItem>
                <FiCheck style={{ color: '#fbbf24' }} /> 
                {isYearly ? (
                  <span style={{color: '#fbbf24', fontWeight: 'bold'}}>
                    {Math.round(1500 * months * 1.1)} кредитов (+10% БОНУС)
                  </span>
                ) : is6Months ? (
                  <span style={{color: '#fbbf24', fontWeight: 'bold'}}>
                    {Math.round(1500 * months * 1.05)} кредитов (+5% БОНУС)
                  </span>
                ) : (
                  `${1500 * months} кредитов`
                )}
              </FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Доступ ко всем персонажам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Расширенная память (8 000 токенов)</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Сохранение истории сообщений</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#fbbf24' }} /> Создание платных альбомов</FeatureItem>
            </FeaturesList>

            <CheckoutButton 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); handleSubscriptionClick('standard'); }}
              style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: 'black' }}
            >
              Купить за {standardPrice.total}₽
              <span style={{opacity: 0.7, fontSize: '0.8rem', textDecoration: 'line-through'}}>{standardPrice.originalTotal}₽</span>
            </CheckoutButton>

            <AnimatePresence>
              {showPaymentOptions === 'standard' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <PaymentButtonsContainer>
                    <PaymentButton onClick={() => handlePayment('standard', 'sberbank')}>
                      <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                      SberPay
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('standard', 'yoo_money')}>
                      <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                      ЮMoney
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('standard', 'bank_card')}>
                      <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                      Банковские карты
                    </PaymentButton>
                    <PaymentButton onClick={() => handlePayment('standard', 'sbp')}>
                      <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                      СБП
                    </PaymentButton>
                  </PaymentButtonsContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </PlanCard>

          {/* FREE CARD */}
          <PlanCard
            $planType="free"
            $selected={selectedPlan === 'free'}
            onClick={() => setSelectedPlan('free')}
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
              <FeatureItem><FiCheck style={{ color: '#888' }} /> 5 генераций фото</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Доступ ко всем персонажам</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Возможность создать своих персонажей</FeatureItem>
              <FeatureItem><FiCheck style={{ color: '#888' }} /> Премиум модель с ограничением на 20 сообщений</FeatureItem>
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
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <PlansGrid>
          {creditPackages.map((pkg, index) => (
            <PlanCard 
              key={pkg.id}
              $selected={selectedPlan === pkg.id}
              onClick={() => setSelectedPlan(pkg.id)}
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

              <CheckoutButton 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); setShowPaymentOptions(showPaymentOptions === pkg.id ? null : pkg.id); }}
              >
                Купить сейчас
              </CheckoutButton>

              <AnimatePresence>
                {showPaymentOptions === pkg.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <PaymentButtonsContainer>
                      <PaymentButton onClick={() => handleCreditPayment(pkg, 'sberbank')}>
                        <PaymentLogo src="/payment_images/sber-pay-9a236c32.png?v=15" alt="SberPay" />
                        SberPay
                      </PaymentButton>
                      <PaymentButton onClick={() => handleCreditPayment(pkg, 'yoo_money')}>
                        <PaymentLogo src="/payment_images/yumoney.png?v=15" alt="ЮMoney" />
                        ЮMoney
                      </PaymentButton>
                      <PaymentButton onClick={() => handleCreditPayment(pkg, 'bank_card')}>
                        <PaymentLogo src="/payment_images/%D0%BA%D0%B0%D1%80%D1%82%D1%8B.png?v=15" alt="Банковские карты" />
                        Банковские карты
                      </PaymentButton>
                      <PaymentButton onClick={() => handleCreditPayment(pkg, 'sbp')}>
                        <PaymentLogo src="/payment_images/pay_sbp.png?v=15" alt="СБП" />
                        СБП
                      </PaymentButton>
                    </PaymentButtonsContainer>
                  </motion.div>
                )}
              </AnimatePresence>
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
        onHome={onBackToMain}
        onProfile={onProfile}
      />
      <ContentWrapper>
        <ToggleContainer>
          <ToggleButton 
            $active={viewMode === 'credits'} 
            onClick={() => setViewMode('credits')}
          >
            Кредиты
          </ToggleButton>
          <ToggleButton 
            $active={viewMode === 'subscription'} 
            onClick={() => setViewMode('subscription')}
          >
            Подписка
          </ToggleButton>
        </ToggleContainer>

        {viewMode === 'subscription' ? renderSubscriptionContent() : renderCreditsContent()}
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
