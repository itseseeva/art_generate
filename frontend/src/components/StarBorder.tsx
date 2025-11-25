'use client';

import React, { ElementType, ReactNode, forwardRef } from 'react';
import styled, { keyframes } from 'styled-components';

interface StarBorderProps {
  as?: ElementType;
  className?: string;
  color?: string;
  speed?: string;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  'aria-label'?: string;
}

const rotateHalo = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulseCore = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  60% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
`;

const StarButton = styled.button<{ $color: string; $speed: string }>`
  --star-color: ${({ $color }) => $color};
  --star-speed: ${({ $speed }) => $speed};

  width: 58px;
  height: 58px;
  border-radius: 999px;
  border: none;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.18), rgba(15, 23, 42, 0.9));
  color: #fefefe;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  position: relative;
  overflow: visible;
  padding: 0;
  box-shadow:
    0 0 15px rgba(15, 23, 42, 0.6),
    0 12px 28px rgba(2, 6, 23, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease, filter 0.3s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: inherit;
    pointer-events: none;
  }

  &::before {
    border: 2px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 18px rgba(255, 255, 255, 0.12);
    animation: ${pulseCore} 4s ease-in-out infinite;
  }

  &::after {
    inset: -12px;
    border-radius: 999px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg 140deg,
      rgba(255, 255, 255, 0.4) 160deg 180deg,
      var(--star-color) 200deg 260deg,
      transparent 280deg 360deg
    );
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
    animation: ${rotateHalo} var(--star-speed) linear infinite;
  }

  &:hover {
    transform: translateY(-3px) scale(1.04);
    box-shadow:
      0 0 25px rgba(255, 255, 255, 0.2),
      0 18px 35px rgba(2, 6, 23, 0.6);
    filter: saturate(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

export const StarBorder = forwardRef<HTMLElement, StarBorderProps>(function StarBorder(
  {
    as = 'div',
    className,
    color = '#22d3ee',
    speed = '5s',
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <StarButton
      as={as as never}
      className={className}
      $color={color}
      $speed={speed}
      ref={ref as never}
      type={type}
      {...rest}
    >
      {children}
    </StarButton>
  );
});

export default StarBorder;

