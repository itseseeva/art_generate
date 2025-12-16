import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

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
  background: linear-gradient(145deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.9) 100%);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  width: 90%;
  max-width: 480px;
  border: 1px solid rgba(100, 100, 100, 0.3);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
  text-align: center;
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from {
      transform: translateY(-20px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }
`;

const Title = styled.h2`
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.lg} 0;
  letter-spacing: -0.5px;
`;

const Message = styled.p`
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.base};
  margin: 0 0 ${theme.spacing.xl} 0;
  line-height: 1.6;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  margin-top: ${theme.spacing.lg};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  border: 1px solid transparent;
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(80, 100, 200, 0.9) 100%);
        color: rgba(255, 255, 255, 1);
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
        
        &:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 1) 0%, rgba(80, 100, 200, 1) 100%);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
      `;
    } else {
      return `
        background: rgba(60, 60, 60, 0.6);
        color: rgba(240, 240, 240, 1);
        border: 1px solid rgba(120, 120, 120, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        
        &:hover {
          background: rgba(80, 80, 80, 0.8);
          border-color: rgba(150, 150, 150, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        &:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
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
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Отмена',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <ButtonGroup>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmText}
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
