import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { FiCheck, FiHeart } from 'react-icons/fi';

const slideIn = keyframes`
  from {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ $isClosing: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  animation: ${props => props.$isClosing ? slideOut : slideIn} 0.4s ease-out forwards;
`;

const ToastContent = styled.div`
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95));
  backdrop-filter: blur(10px);
  border: 2px solid rgba(34, 197, 94, 0.5);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  box-shadow: 0 10px 40px rgba(34, 197, 94, 0.3), 0 5px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  min-width: 300px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.full};
  
  svg {
    color: white;
  }
`;

const TextContent = styled.div`
  flex: 1;
  
  h4 {
    margin: 0;
    font-size: ${theme.fontSize.lg};
    font-weight: 700;
    color: white;
    margin-bottom: ${theme.spacing.xs};
  }
  
  p {
    margin: 0;
    font-size: ${theme.fontSize.sm};
    color: rgba(255, 255, 255, 0.9);
  }
`;

interface SuccessToastProps {
  message: string;
  amount: number;
  onClose: () => void;
  duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ 
  message, 
  amount, 
  onClose,
  duration = 1000
}) => {
  const [isClosing, setIsClosing] = React.useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      onClose();
    }, duration + 400); // Добавляем время для анимации закрытия

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  return (
      <ToastContainer $isClosing={isClosing}>
      <ToastContent>
        <IconWrapper>
          <FiHeart size={24} />
        </IconWrapper>
        <TextContent>
          <h4>{message}</h4>
          {amount > 0 && <p>{amount} кредитов отправлено</p>}
        </TextContent>
        <IconWrapper>
          <FiCheck size={24} />
        </IconWrapper>
      </ToastContent>
    </ToastContainer>
  );
};

