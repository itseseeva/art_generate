import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const ModalMessage = styled.p`
  color: rgba(180, 180, 180, 0.9);
  font-size: ${theme.fontSize.base};
  line-height: 1.5;
  margin: 0 0 ${theme.spacing.lg} 0;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  
  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const Button = styled.button<{ $isPrimary?: boolean }>`
  flex: 1;
  padding: ${theme.spacing.md};
  background: ${props => props.$isPrimary 
    ? 'rgba(100, 100, 100, 0.7)' 
    : 'rgba(60, 60, 60, 0.5)'};
  border: 1px solid ${props => props.$isPrimary 
    ? 'rgba(180, 180, 180, 0.6)' 
    : 'rgba(150, 150, 150, 0.3)'};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$isPrimary 
      ? 'rgba(120, 120, 120, 0.8)' 
      : 'rgba(80, 80, 80, 0.7)'};
    border-color: ${props => props.$isPrimary 
      ? 'rgba(200, 200, 200, 0.7)' 
      : 'rgba(180, 180, 180, 0.5)'};
  }
`;

interface ModelAccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToShop: () => void;
}

export const ModelAccessDeniedModal: React.FC<ModelAccessDeniedModalProps> = ({
  isOpen,
  onClose,
  onGoToShop
}) => {
  if (!isOpen) return null;

  const handleGoToShop = () => {
    onGoToShop();
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Недостаточно прав</ModalTitle>
        <ModalMessage>
          У вас недостаточно прав для выбора модели. Выбор модели доступен только для подписчиков PREMIUM.
        </ModalMessage>
        <ButtonContainer>
          <Button $isPrimary onClick={handleGoToShop}>
            Перейти в магазин
          </Button>
          <Button onClick={onClose}>
            Отмена
          </Button>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

