import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle } from 'lucide-react';

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled(motion.div)`
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(15px);
  border-radius: 0;
  padding: 40px;
  max-width: 800px;
  width: 100%;
  position: relative;
  border: 1px solid;
  border-image: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3)) 1;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const ModalTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px 0;
  text-align: center;
  letter-spacing: -0.02em;
`;

const ModalDescription = styled.p`
  font-size: 16px;
  color: rgba(200, 200, 220, 0.8);
  margin: 0 0 32px 0;
  text-align: center;
  line-height: 1.5;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const OptionButton = styled(motion.button)<{ $isSelected: boolean; $variant: 'safe' | 'nsfw' }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  flex: 1;
  padding: 16px 32px;
  background: ${props => 
    props.$isSelected 
      ? (props.$variant === 'safe' 
          ? 'rgba(34, 197, 94, 0.15)' 
          : 'rgba(239, 68, 68, 0.15)')
      : 'rgba(40, 40, 50, 0.6)'
  };
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-align: left;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover::before {
    left: 100%;
  }

  &:hover {
    background: ${props => 
      props.$variant === 'safe' 
        ? 'rgba(34, 197, 94, 0.2)' 
        : 'rgba(239, 68, 68, 0.2)'
    };
    transform: translateY(-2px);
    box-shadow: 
      0 6px 24px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const OptionIcon = styled.div<{ $variant: 'safe' | 'nsfw' }>`
  width: 40px;
  height: 40px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${props => 
    props.$variant === 'safe' 
      ? 'rgba(34, 197, 94, 0.2)' 
      : 'rgba(239, 68, 68, 0.2)'
  };
  color: ${props => 
    props.$variant === 'safe' 
      ? 'rgba(34, 197, 94, 1)' 
      : 'rgba(239, 68, 68, 1)'
  };
  flex-shrink: 0;
`;

const OptionContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  text-align: left;
  min-width: 0;
`;

const OptionTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`;

const OptionSubtitle = styled.div`
  font-size: 14px;
  color: rgba(180, 180, 200, 0.7);
  line-height: 1.4;
  text-align: left;
`;


interface ContentRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rating: 'safe' | 'nsfw') => void;
}

export const ContentRatingModal: React.FC<ContentRatingModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const handleRatingSelect = (rating: 'safe' | 'nsfw') => {
    onSelect(rating);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalTitle>Выберите рейтинг контента</ModalTitle>
            <ModalDescription>
              Выберите категорию для вашего персонажа. Это определит, на какой странице он будет отображаться.
            </ModalDescription>

            <OptionsContainer>
              <OptionButton
                $isSelected={false}
                $variant="safe"
                onClick={() => handleRatingSelect('safe')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <OptionIcon $variant="safe">
                  <Shield size={24} />
                </OptionIcon>
                <OptionContent>
                  <OptionTitle>
                    SAFE 16+
                    <span style={{ fontSize: '12px', color: 'rgba(34, 197, 94, 0.8)' }}>✓</span>
                  </OptionTitle>
                  <OptionSubtitle>
                    Безопасный контент для всех возрастов. Персонаж будет отображаться на странице SAFE.
                  </OptionSubtitle>
                </OptionContent>
              </OptionButton>

              <OptionButton
                $isSelected={false}
                $variant="nsfw"
                onClick={() => handleRatingSelect('nsfw')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <OptionIcon $variant="nsfw">
                  <AlertTriangle size={24} />
                </OptionIcon>
                <OptionContent>
                  <OptionTitle>
                    NSFW 18+
                    <span style={{ fontSize: '12px', color: 'rgba(239, 68, 68, 0.8)' }}>⚠</span>
                  </OptionTitle>
                  <OptionSubtitle>
                    Контент для взрослых. Персонаж будет отображаться на странице NSFW.
                  </OptionSubtitle>
                </OptionContent>
              </OptionButton>
            </OptionsContainer>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};
