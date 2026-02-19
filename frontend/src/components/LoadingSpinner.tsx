import React from 'react';
import styled from 'styled-components';
import { motion } from 'motion/react';
import { theme } from '../theme';

const Container = styled.div<{ $fullScreen?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  ${props => props.$fullScreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(10, 10, 15, 0.82);
    backdrop-filter: blur(12px);
  `}
`;

const SpinnerWrapper = styled.div<{ $size: number }>`
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Ring = styled(motion.div) <{ $size: number; $color: string; $borderWidth: number }>`
  position: absolute;
  width: ${props => props.$size}%;
  height: ${props => props.$size}%;
  border: ${props => props.$borderWidth}px solid transparent;
  border-top-color: ${props => props.$color};
  border-radius: 50%;
  filter: drop-shadow(0 0 8px ${props => props.$color});
`;

const Core = styled(motion.div) <{ $size: number; $color: string }>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: ${props => props.$color};
  border-radius: 50%;
  filter: blur(1px) drop-shadow(0 0 15px ${props => props.$color});
`;

const LoadingText = styled(motion.p)`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false
}) => {
  const sizeMap = {
    sm: 32,
    md: 64,
    lg: 100,
    xl: 160
  };

  const baseSize = sizeMap[size];
  const accentColor = theme.colors.accent.primary; // Розово-вишневый
  const secondaryColor = '#8b5cf6'; // Фиолетовый

  return (
    <Container $fullScreen={fullScreen}>
      <SpinnerWrapper $size={baseSize}>
        {/* Внешнее кольцо */}
        <Ring
          $size={100}
          $color={accentColor}
          $borderWidth={baseSize > 40 ? 3 : 2}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />

        {/* Среднее кольцо (в обратную сторону) */}
        <Ring
          $size={72}
          $color={secondaryColor}
          $borderWidth={baseSize > 40 ? 2 : 1}
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Внутреннее светящееся ядро */}
        <Core
          $size={baseSize * 0.28}
          $color={accentColor}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </SpinnerWrapper>

      {text && (
        <LoadingText
          animate={{
            opacity: [0.4, 1, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </LoadingText>
      )}
    </Container>
  );
};
