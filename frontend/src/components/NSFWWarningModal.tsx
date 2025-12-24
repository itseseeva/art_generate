import React from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiAlertTriangle } from 'react-icons/fi';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
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
  background: linear-gradient(145deg, rgba(30, 30, 30, 0.98) 0%, rgba(20, 20, 20, 0.98) 100%);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 100, 100, 0.3);
  max-width: 520px;
  width: 90vw;
  text-align: center;
  animation: slideUp 0.3s ease-out;
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const WarningIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: rgba(255, 100, 100, 1);
  
  svg {
    width: 64px;
    height: 64px;
    stroke-width: 2;
  }
`;

const Title = styled.h2`
  color: rgba(255, 255, 255, 1);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
`;

const Message = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 2rem;
  text-align: left;
  
  p {
    margin: 0.75rem 0;
  }
  
  strong {
    color: rgba(255, 255, 255, 1);
    font-weight: 600;
  }
  
  ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
    list-style-type: disc;
    
    li {
      margin: 0.5rem 0;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: center;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  
  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, rgba(255, 100, 100, 0.9) 0%, rgba(255, 120, 120, 0.9) 100%);
    color: rgba(255, 255, 255, 1);
    border: 2px solid rgba(255, 100, 100, 0.5);
    
    &:hover {
      background: linear-gradient(135deg, rgba(255, 120, 120, 1) 0%, rgba(255, 140, 140, 1) 100%);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(255, 100, 100, 0.4);
      border-color: rgba(255, 100, 100, 0.7);
    }
    
    &:active {
      transform: translateY(0);
    }
  ` : `
    background: transparent;
    color: rgba(200, 200, 200, 1);
    border: 2px solid rgba(255, 255, 255, 0.15);
    
    &:hover {
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 1);
      background: rgba(255, 255, 255, 0.05);
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
`;

interface NSFWWarningModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const NSFWWarningModal: React.FC<NSFWWarningModalProps> = ({ onConfirm, onCancel }) => {
  return createPortal(
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <WarningIcon>
          <FiAlertTriangle />
        </WarningIcon>
        <Title>Контент для взрослых (18+)</Title>
        <Message>
          <p>
            <strong>Внимание!</strong> Вы собираетесь переключиться на режим контента для взрослых.
          </p>
          <p>
            Этот режим содержит материалы, предназначенные только для лиц старше 18 лет, включая:
          </p>
          <ul>
            <li>Откровенные изображения и описания</li>
            <li>Контент сексуального характера</li>
            <li>Материалы, которые могут быть неприемлемы для несовершеннолетних</li>
          </ul>
          <p>
            <strong>Продолжая, вы подтверждаете, что:</strong>
          </p>
          <ul>
            <li>Вам исполнилось 18 лет</li>
            <li>Вы согласны просматривать контент для взрослых</li>
            <li>Вы понимаете характер отображаемого контента</li>
          </ul>
        </Message>
        <ButtonGroup>
          <Button $variant="secondary" onClick={onCancel}>
            Отмена
          </Button>
          <Button $variant="primary" onClick={onConfirm}>
            Мне есть 18 лет
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

