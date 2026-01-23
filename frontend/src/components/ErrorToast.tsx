import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { FiAlertCircle, FiX } from 'react-icons/fi';

const slideIn = keyframes`
  from {
    transform: translateX(-50%) translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  to {
    transform: translateX(-50%) translateY(10px);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ $isClosing: boolean }>`
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  animation: ${props => props.$isClosing ? slideOut : slideIn} 0.3s ease-out forwards;
  pointer-events: none;
`;

const ToastContent = styled.div`
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(239, 68, 68, 0.6);
  border-radius: ${theme.borderRadius.md};
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
  max-width: 320px;
  word-wrap: break-word;
  word-break: break-word;
  pointer-events: auto;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.full};
  flex-shrink: 0;
  
  svg {
    color: white;
    width: 14px;
    height: 14px;
  }
`;

const TextContent = styled.div`
  flex: 1;
  min-width: 0;
  
  p {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: white;
    line-height: 1.5;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: ${theme.borderRadius.full};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  svg {
    color: white;
    width: 12px;
    height: 12px;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

interface ErrorToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ 
  message, 
  onClose,
  duration = 3000
}) => {
  const [isClosing, setIsClosing] = React.useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      onClose();
    }, duration + 400);

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <ToastContainer $isClosing={isClosing}>
      <ToastContent>
        <IconWrapper>
          <FiAlertCircle />
        </IconWrapper>
        <TextContent>
          <p>{message}</p>
        </TextContent>
        <CloseButton onClick={handleClose}>
          <FiX />
        </CloseButton>
      </ToastContent>
    </ToastContainer>
  );
};
