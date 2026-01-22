import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { theme } from '../theme';

const premiumGlow = keyframes`
  0% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.35);
    border-color: rgba(239, 68, 68, 0.6);
  }
  100% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(236, 72, 153, 0.1);
`;

const ModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['3xl']};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  background: linear-gradient(to right, #fff, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const ModelList = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${theme.spacing.lg};
  justify-content: center;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: center;
  }
`;

const StyledModelOption = styled.button<{ $isSelected: boolean; $isPremium?: boolean }>`
  background: ${props => props.$isSelected
    ? (props.$isPremium ? 'rgba(239, 68, 68, 0.15)' : 'rgba(236, 72, 153, 0.15)')
    : 'rgba(30, 30, 30, 0.6)'};
  border: 1px solid ${props => props.$isSelected
    ? (props.$isPremium ? 'rgba(239, 68, 68, 0.6)' : 'rgba(236, 72, 153, 0.6)')
    : (props.$isPremium ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  padding-bottom: ${theme.spacing.xxl}; /* Extra padding for bottom content if needed, though absolute positioning overlays it */
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 1;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  
  /* Add glow animation for premium items */
  ${props => props.$isPremium && css`
    animation: ${premiumGlow} 2.5s infinite ease-in-out;
  `}
  
  &:hover {
    background: ${props => props.$isSelected
    ? (props.$isPremium ? 'rgba(239, 68, 68, 0.2)' : 'rgba(236, 72, 153, 0.2)')
    : 'rgba(50, 50, 50, 0.8)'};
    border-color: ${props => props.$isPremium ? 'rgba(239, 68, 68, 0.8)' : 'rgba(236, 72, 153, 0.4)'};
    transform: translateY(-5px);
    
    /* Stronger shadow on hover */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 
                ${props => props.$isPremium
    ? '0 0 25px rgba(239, 68, 68, 0.4)'
    : '0 0 15px rgba(236, 72, 153, 0.1)'};
    
    /* Pause animation on hover to show steady state or just let it continue */
    animation: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.$isSelected
    ? (props.$isPremium ? '#ef4444' : '#ec4899')
    : 'transparent'};
    transition: all 0.3s ease;
  }
`;

const PremiumBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.4);
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
`;

const ModelDescription = styled.div`
  color: rgba(220, 220, 220, 0.9);
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
  margin-top: ${theme.spacing.xs};
  flex: 1;
`;

const ModelName = styled.div`
  color: #fff;
  font-weight: 700;
  font-size: ${theme.fontSize.lg};
  margin-bottom: ${theme.spacing.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ModelSubtitle = styled.div`
  color: #ec4899;
  font-weight: 600;
  font-size: ${theme.fontSize.sm};
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid rgba(236, 72, 153, 0.2);
  font-style: italic;
`;

const ModelSection = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const ModelSectionTitle = styled.span`
  font-weight: 700;
  color: #ec4899;
  margin-right: ${theme.spacing.xs};
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
`;

const CloseButton = styled.button`
  margin-top: ${theme.spacing.xxl};
  width: 200px;
  margin-left: auto;
  margin-right: auto;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.borderRadius.full};
  color: white;
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
`;

interface ModelSelectorModalProps {
  isOpen: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onClose: () => void;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
}

const AVAILABLE_MODELS = [
  {
    id: 'sao10k/l3-euryale-70b',
    name: 'L3 Euryale 70B',
    subtitle: '«Мастер темного фэнтези и глубокого погружения»',
    features: 'Эта модель обучена специально для того, чтобы быть максимально «человечной» в диалогах. У неё один из лучших показателей понимания контекста персонажа.',
    style: 'Она пишет очень выразительно, уделяя внимание не только действиям, но и внутренним переживаниям, запахам и атмосфере.',
    forWho: 'Идеально, если ты хочешь долгого развития сюжета, где важна психология и «химия» между персонажами. Она реже других моделей «ломает» образ героя.',
    isPremium: false
  },
  {
    id: 'thedrummer/cydonia-24b-v4.1',
    name: 'Cydonia 24B v4.1',
    subtitle: '«Новый стандарт ролевого взаимодействия»',
    features: 'Эта модель значительно умнее классических аналогов. Она обладает великолепной логикой и способна удерживать сложнейшие сюжетные линии.',
    style: 'Художественный, глубокий и последовательный стиль. Великолепно справляется с описанием окружения и нюансов поведения.',
    forWho: 'Для тех, кто ищет баланс между скоростью и высочайшим качеством повествования. Идеально для длительных ролевых сессий.',
    isPremium: false
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek Chat v3',
    subtitle: '«Новейшая версия от DeepSeek»',
    features: 'Современная мультимодальная модель с высокой скоростью генерации и отличным пониманием контекста. Оптимизирована для естественных диалогов.',
    style: 'Сбалансированный стиль с акцентом на естественность и живость общения. Хорошо справляется как с легкими беседами, так и с глубокими темами.',
    forWho: 'Для тех, кто ценит быстрые и качественные ответы. Отлично подходит для динамичных диалогов и ситуаций, где важна скорость реакции.',
    isPremium: true
  }
];

const PremiumWarning = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: ${theme.spacing.md};
  background: rgba(30, 30, 30, 0.95);
  border-top: 1px solid #ef4444;
  border-bottom-left-radius: ${theme.borderRadius.xl};
  border-bottom-right-radius: ${theme.borderRadius.xl};
  color: #ef4444;
  font-size: ${theme.fontSize.xs};
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 10;
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.2);
`;

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  selectedModel,
  onSelectModel,
  onClose,
  isPremium = false,
  onOpenPremiumModal
}) => {
  const [premiumWarningId, setPremiumWarningId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (modelId: string) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (model?.isPremium && !isPremium) {
      setPremiumWarningId(modelId);
      setTimeout(() => setPremiumWarningId(null), 2000);
      return;
    }

    onSelectModel(modelId);
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Выберите нейросеть</ModalTitle>
        <ModelList>
          {AVAILABLE_MODELS.map((model) => (
            <StyledModelOption
              key={model.id}
              $isSelected={selectedModel === model.id}
              $isPremium={model.isPremium}
              onClick={() => handleSelect(model.id)}
            >
              {model.isPremium && (
                <PremiumBadge>Только для Premium</PremiumBadge>
              )}
              <ModelName>{model.name}</ModelName>
              <ModelSubtitle>{model.subtitle}</ModelSubtitle>
              <ModelDescription>
                <ModelSection>
                  <ModelSectionTitle>Особенности</ModelSectionTitle> {model.features}
                </ModelSection>
                <ModelSection>
                  <ModelSectionTitle>Стиль</ModelSectionTitle> {model.style}
                </ModelSection>
                <ModelSection>
                  <ModelSectionTitle>Для кого</ModelSectionTitle> {model.forWho}
                </ModelSection>
              </ModelDescription>
              <AnimatePresence>
                {premiumWarningId === model.id && (
                  <PremiumWarning
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Только для Premium подписчиков!
                  </PremiumWarning>
                )}
              </AnimatePresence>
            </StyledModelOption>
          ))}
        </ModelList>
        <CloseButton onClick={onClose}>Назад к чату</CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};