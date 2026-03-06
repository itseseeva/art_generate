import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { Sparkles } from 'lucide-react';

const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.6)) drop-shadow(0 0 15px rgba(139, 92, 246, 0.4));
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  50% {
    filter: drop-shadow(0 0 15px rgba(236, 72, 153, 0.9)) drop-shadow(0 0 25px rgba(139, 92, 246, 0.6));
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const CircularProgressContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  position: relative;
`;

const CircularProgressWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CircularProgressSvg = styled.svg`
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 6px rgba(147, 51, 234, 0.5));
  position: relative;
  z-index: 2;
`;

const CircularProgressBackground = styled.circle`
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 4;
`;

const CenteredIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ec4899;
  animation: ${pulseGlow} 2s ease-in-out infinite;
  z-index: 3;

  svg {
    animation: ${spin} 8s linear infinite;
  }
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
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference * (1 - clampedProgress / 100);

  const gradientId = `gradient-${size}`;

  return (
    <CircularProgressContainer>
      <CircularProgressWrapper style={{ width: size, height: size }}>
        <CircularProgressSvg width={size} height={size}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f43f5e" />
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
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          />
        </CircularProgressSvg>
        <CenteredIcon>
          <Sparkles size={size * 0.4} strokeWidth={2} />
        </CenteredIcon>
      </CircularProgressWrapper>
    </CircularProgressContainer>
  );
};