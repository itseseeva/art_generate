import React from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 24px;
  padding: ${theme.spacing.xxl};
  width: 90%;
  max-width: 480px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(168, 85, 247, 0.1);
  text-align: center;
  animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-sizing: border-box;
  z-index: 1;

  @media (max-width: 768px) {
    padding: ${theme.spacing.xl};
    width: 95%;
  }
  
  @keyframes slideIn {
    0% {
      transform: scale(0.9) translateY(20px);
      opacity: 0;
    }
    100% {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }
`;

const Title = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 ${theme.spacing.lg} 0;
  text-align: center;
  background: linear-gradient(120deg, #f472b6 0%, #ec4899 30%, #c084fc 70%, #a855f7 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 4s linear infinite;
  letter-spacing: -0.5px;
`;

const Message = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  margin: 0 0 ${theme.spacing.xl} 0;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.lg};

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: ${theme.spacing.sm};
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'yellow' }>`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  position: relative;
  overflow: hidden;
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
    z-index: 2;
  }
  
  &:hover::after {
    left: 100%;
    transition: 0.5s ease-in-out;
  }

  @media (max-width: 768px) {
    padding: ${theme.spacing.sm} ${theme.spacing.lg};
    min-width: 100px;
    font-size: ${theme.fontSize.sm};
  }

  @media (max-width: 480px) {
    width: 100%;
  }
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: rgba(255, 255, 255, 1);
        box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        
        &:hover {
          background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.6);
        }
        
        &:active {
          transform: translateY(1px);
          box-shadow: 0 2px 10px rgba(79, 70, 229, 0.3);
        }
      `;
    } else if (props.variant === 'yellow') {
      return `
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.2);
        
        &:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.6);
        }
        
        &:active {
          transform: translateY(1px);
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
        }
      `;
    } else {
      return `
        background: rgba(255, 255, 255, 0.05);
        color: rgba(240, 240, 240, 1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        &:active {
          transform: translateY(1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
      `;
    }
  }}
`;

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'yellow';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Отмена',
  confirmVariant = 'primary',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <ButtonGroup>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
