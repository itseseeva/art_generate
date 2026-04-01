import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { usePromoTimer } from '../hooks/usePromoTimer';
import { useTranslation } from 'react-i18next';

// ── Styled Components ─────────────────────────────────────────────────────────

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 900;
  background: linear-gradient(90deg, rgba(23, 5, 41, 0.5) 0%, rgba(47, 14, 84, 0.5) 50%, rgba(23, 5, 41, 0.5) 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(164, 77, 245, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(164, 77, 245, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 2rem;

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
`;

const LeftText = styled.div`
  display: none; // Удалили текст "Приветственная скидка!" как просил пользователь
`;

const DisclaimerText = styled.div`
  position: absolute;
  bottom: 2px;
  right: 15px;
  font-size: 0.7rem;
  color: #f3e8ff;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: lowercase;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    position: static;
    transform: none;
    font-size: 0.6rem;
    width: 100%;
    text-align: center;
    margin-top: 4px;
  }
`;

const CenterButtonContainer = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
`;

const GradientButton = styled.button`
  background: linear-gradient(90deg, #ff4081 0%, #aa00ff 100%);
  background-size: 200% auto;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.6rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(170, 0, 255, 0.3);
  text-transform: uppercase;

  &:hover {
    background-position: right center;
    box-shadow: 0 6px 20px rgba(170, 0, 255, 0.5);
    transform: translateY(-1px) scale(1.03);
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 2px 10px rgba(170, 0, 255, 0.3);
  }

  @media (max-width: 768px) {
    font-size: 0.85rem;
    padding: 0.45rem 1.2rem;
    white-space: normal;
    text-align: center;
    line-height: 1.2;
  }
`;

const RightTimerBox = styled.div`
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    flex: initial;
    width: 100%;
    justify-content: center;
  }
`;

const TimerInner = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.35rem 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);

  span.label {
    color: #cca8d1;
    font-size: 0.85rem;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  span.time {
    color: #ff6b9e;
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 12px rgba(255, 107, 158, 0.4);
  }

  @media (max-width: 768px) {
    padding: 0.3rem 0.8rem;
    background: rgba(255, 255, 255, 0.03);
    border: none;
    span.label {
      color: #b0a3c2;
    }
  }
`;

const AdminCloseBtn = styled.button`
  background: transparent;
  border: none;
  color: #a78bfa;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  transition: color 0.2s;
  
  &:hover {
    color: #fff;
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────

interface PromoBarProps {
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onRegister: () => void;
}

export const PromoBar: React.FC<PromoBarProps> = ({ isAuthenticated, isAdmin, onRegister }) => {
  const { isActive, minutes, seconds, hasDiscount } = usePromoTimer();
  const [adminClosed, setAdminClosed] = useState(() => sessionStorage.getItem('promo_admin_closed') === 'true');
  const { t } = useTranslation('common');

  useEffect(() => {
    const handleReopen = () => {
      sessionStorage.removeItem('promo_admin_closed');
      setAdminClosed(false);
    };
    window.addEventListener('promo_admin_reopen', handleReopen);
    return () => window.removeEventListener('promo_admin_reopen', handleReopen);
  }, []);

  // Для админов баннер виден всегда (пока не закрыт) и показывает фейковый таймер если основной истек
  const isReallyVisible = isAdmin ? !adminClosed : (isActive && !hasDiscount);

  if (!isReallyVisible) return null;

  const handleAdminClose = () => {
    setAdminClosed(true);
    sessionStorage.setItem('promo_admin_closed', 'true');
  };

  const displayMinutes = isAdmin && !isActive ? '59' : minutes;
  const displaySeconds = isAdmin && !isActive ? '59' : seconds;

  return (
    <Bar>
      <CenterButtonContainer style={{ flex: 1 }}>
        {!isAuthenticated ? (
          <GradientButton onClick={onRegister}>
            {t('promoBar.registerFor20')}
          </GradientButton>
        ) : (
          <GradientButton as="div" style={{ cursor: 'default' }}>
            {t('promoBar.discountActive')}
          </GradientButton>
        )}
      </CenterButtonContainer>

      <RightTimerBox>
        <TimerInner>
          <span className="time">{displayMinutes}:{displaySeconds}</span>
        </TimerInner>
        {isAdmin && (
          <AdminCloseBtn onClick={handleAdminClose} title={t('promoBar.hideBanner')}>
            ✖
          </AdminCloseBtn>
        )}
      </RightTimerBox>
      <DisclaimerText>
        {t('promoBar.disclaimer', 'скидка действительна только на первую покупку')}
      </DisclaimerText>
    </Bar>
  );
};
