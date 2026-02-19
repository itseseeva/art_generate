import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

const CircularProgressContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  gap: 0;
  box-shadow: none;
  pointer-events: none;
`;

const CircularProgressWrapper = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  background: transparent;
  padding: 0;
  margin: 0;
  filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.4));
`;

const CircularProgressSvg = styled.svg`
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
`;

const CircularProgressBackground = styled.circle`
  fill: none;
  stroke: rgba(40, 40, 40, 0.5);
  stroke-width: 5;
`;

const CircularProgressText = styled.div<{ $size: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: ${props => props.$size < 48 ? '11px' : '15px'};
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  text-shadow: 0 0 10px rgba(147, 51, 234, 0.6);
  letter-spacing: 0.5px;
`;

const ProgressLabel = styled.div`
  color: rgba(180, 180, 180, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  text-align: center;
`;

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number; // размер в пикселях
  showLabel?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 64,
  showLabel = true
}) => {
  const { t } = useTranslation();
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference * (1 - clampedProgress / 100);

  // Создаем уникальный ID для градиента (не зависит от прогресса для стабильности)
  const gradientId = `gradient-${size}`;

  return (
    <CircularProgressContainer>
      <CircularProgressWrapper style={{ width: size, height: size }}>
        <CircularProgressSvg width={size} height={size}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.95)" />
              <stop offset="33%" stopColor="rgba(147, 51, 234, 0.95)" />
              <stop offset="66%" stopColor="rgba(236, 72, 153, 0.95)" />
              <stop offset="100%" stopColor="rgba(255, 105, 180, 1)" />
            </linearGradient>
          </defs>
          <CircularProgressBackground
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease-in-out',
              filter: 'drop-shadow(0 0 4px rgba(147, 51, 234, 0.5))'
            }}
          />
        </CircularProgressSvg>
        <CircularProgressText $size={size}>
          {Math.round(clampedProgress)}%
        </CircularProgressText>
      </CircularProgressWrapper>
      {showLabel && (
        <ProgressLabel style={{ marginTop: '8px' }}>{t('photoGen.generatingImage')}</ProgressLabel>
      )}
    </CircularProgressContainer>
  );
};