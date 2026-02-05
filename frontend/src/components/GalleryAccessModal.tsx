import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiX, FiLock } from 'react-icons/fi';
import { Crown } from 'lucide-react';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(70px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
  position: relative;

  @keyframes slideIn {
    from { 
      transform: translateY(30px) scale(0.95); 
      opacity: 0; 
    }
    to { 
      transform: translateY(0) scale(1); 
      opacity: 1; 
    }
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 95vw;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cccccc;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
`;

const LockIconWrapper = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { 
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.4);
      transform: scale(1.05);
    }
  }

  svg {
    width: 50px;
    height: 50px;
    color: #a855f7;
  }
`;

const CrownIcon = styled(Crown)`
  position: absolute;
  top: -10px;
  right: calc(50% - 60px);
  width: 32px;
  height: 32px;
  color: #fde047;
  fill: rgba(253, 224, 71, 0.2);
  filter: drop-shadow(0 0 10px rgba(253, 224, 71, 0.4));
  transform: rotate(12deg);
`;

const ModalHeader = styled.div`
  margin-bottom: 1.5rem;
  
  h3 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #ffffff;
    text-align: center;
    margin: 0 0 0.5rem 0;
    background: linear-gradient(120deg, #f472b6 0%, #ec4899 30%, #c084fc 70%, #a855f7 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const ModalSubtitle = styled.p`
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 1rem 0;
  color: rgba(255, 255, 255, 0.7);
`;

const Message = styled.p`
  font-size: 0.95rem;
  line-height: 1.7;
  text-align: center;
  margin: 0 0 1.5rem 0;
  color: rgba(255, 255, 255, 0.9);
`;

const FeaturesList = styled.div`
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  svg {
    width: 20px;
    height: 20px;
    color: #c084fc;
    flex-shrink: 0;
  }
`;

const GlossyText = styled.span`
  font-weight: 700;
  background: linear-gradient(
    90deg,
    #fde047 0%,
    #f472b6 30%,
    #c084fc 60%,
    #fde047 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer 12s linear infinite;

  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: white;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ec4899 0%, #c084fc 50%, #a855f7 100%);
  box-shadow:
    0 4px 20px rgba(236, 72, 153, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
  }

  &:hover:not(:disabled)::before {
    transform: translateX(100%);
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 28px rgba(236, 72, 153, 0.5);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

interface GalleryAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToShop: () => void;
}

export const GalleryAccessModal: React.FC<GalleryAccessModalProps> = ({
  isOpen,
  onClose,
  onGoToShop
}) => {
  if (!isOpen) return null;

  const handleGoToShop = () => {
    onClose();
    onGoToShop();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FiX size={24} />
        </CloseButton>

        <IconContainer>
          <CrownIcon strokeWidth={2} />
          <LockIconWrapper>
            <FiLock />
          </LockIconWrapper>
        </IconContainer>

        <ModalHeader>
          <h3>Доступ к галерее</h3>
        </ModalHeader>

        <ModalSubtitle>
          Только для подписчиков
        </ModalSubtitle>

        <Message>
          Для просмотра галереи других пользователей необходима подписка <GlossyText>PREMIUM</GlossyText>.
        </Message>

        <FeaturesList>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>Доступ ко всем галереям пользователей</span>
          </FeatureItem>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>Безлимитные сообщения</span>
          </FeatureItem>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>300 фото-генераций</span>
          </FeatureItem>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>300 голосовых генераций</span>
          </FeatureItem>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>Расширенная память персонажей</span>
          </FeatureItem>
          <FeatureItem>
            <Crown strokeWidth={2.2} />
            <span>Доступ к Premium моделям</span>
          </FeatureItem>
        </FeaturesList>

        <ButtonGroup>
          <PrimaryButton onClick={handleGoToShop}>
            Оформить подписку
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>
            Закрыть
          </SecondaryButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
