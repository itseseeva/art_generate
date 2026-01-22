import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  text-align: center;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    max-height: 95vh;
  }
`;

const WarningIcon = styled.div`
  font-size: 64px;
  margin-bottom: 1.5rem;
  color: #ff6b6b;
  flex-shrink: 0;
`;

const Title = styled.h2`
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
  flex-shrink: 0;
`;

const Message = styled.p`
  color: #aaaaaa;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 2rem;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 1.5rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
  width: 100%;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 1rem 1.5rem;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 10;
  white-space: nowrap;
  
  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
    color: #ffffff;
    
    &:hover {
      background: linear-gradient(135deg, #a855f7 0%, #c084fc 100%);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: #cccccc;
    border: 2px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }
  `}
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    min-height: 44px;
    font-size: 15px;
  }
`;

interface AgeVerificationModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({ onAccept, onDecline }) => {
  return (
    <ModalOverlay>
      <ModalContent>
        <WarningIcon>⚠️</WarningIcon>
        <Title>Предупреждение о контенте 18+</Title>
        <Message>
          Этот сайт содержит контент для взрослых и предназначен только для лиц старше 18 лет.
          <br /><br />
          Продолжая, вы подтверждаете, что вам исполнилось 18 лет и вы согласны с условиями использования сайта.
        </Message>
        <ButtonGroup>
          <Button $variant="primary" onClick={onAccept}>
            Продолжить
          </Button>
          <Button $variant="secondary" onClick={onDecline}>
            Отказаться
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

