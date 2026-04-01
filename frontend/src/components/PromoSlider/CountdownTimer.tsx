import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme';
import { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; text-shadow: 0 0 10px rgba(168, 85, 247, 0.5); }
  50% { transform: scale(1.02); opacity: 0.9; text-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
  50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.4); }
`;

const TimerWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 15, 15, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  animation: ${glow} 3s infinite ease-in-out;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(15, 15, 15, 0.6);
    border-color: rgba(168, 85, 247, 0.5);
  }

  @media (max-width: 768px) {
    padding: 4px 10px;
    gap: 6px;
    border-radius: 8px;
  }
`;

const IconWrapper = styled.div`
  background: linear-gradient(135deg, #a855f7 0%, #f97316 100%);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);

  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    svg { width: 12px; height: 12px; }
  }
`;

const TimeText = styled.span`
  color: #fff;
  font-family: 'Outfit', 'Inter', sans-serif;
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  animation: ${pulse} 2s infinite ease-in-out;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const Label = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Inter', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.05em;
  display: flex;
  flex-direction: column;
  line-height: 1.1;

  .main-text { color: #fff; font-size: 0.75rem; }

  @media (max-width: 768px) {
    font-size: 0.55rem;
    .main-text { font-size: 0.65rem; }
  }
`;

import { usePromoTimer } from '../../hooks/usePromoTimer';

export const CountdownTimer: React.FC = () => {
  const { i18n } = useTranslation('common');
  const currentLang = i18n.language;
  const { minutes, seconds, isActive, hasDiscount } = usePromoTimer();

  // Если скидка уже получена — скрываем таймер совсем
  if (hasDiscount) {
    return null;
  }

  // Если время истекло — скрываем таймер совсем
  if (!isActive) {
    return null;
  }

  return (
    <TimerWrapper>
      <IconWrapper>
        <Timer size={18} />
      </IconWrapper>
      <Label>
        <span className="main-text">{currentLang === 'en' ? 'Limited Offer' : 'Спецпредложение'}</span>
        <span>{currentLang === 'en' ? 'Expires in:' : 'До конца:'}</span>
      </Label>
      <TimeText>{minutes}:{seconds}</TimeText>
    </TimerWrapper>
  );
};
