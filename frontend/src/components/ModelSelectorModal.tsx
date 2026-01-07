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
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.lg} 0;
`;

const ModelList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ModelOption = styled.button<{ $isSelected: boolean }>`
  background: ${props => props.$isSelected 
    ? 'rgba(100, 100, 100, 0.5)' 
    : 'rgba(40, 40, 40, 0.5)'};
  border: 1px solid ${props => props.$isSelected 
    ? 'rgba(180, 180, 180, 0.6)' 
    : 'rgba(150, 150, 150, 0.3)'};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$isSelected 
      ? 'rgba(120, 120, 120, 0.6)' 
      : 'rgba(60, 60, 60, 0.6)'};
    border-color: rgba(180, 180, 180, 0.6);
  }
`;

const ModelName = styled.div`
  font-weight: 600;
  margin-bottom: ${theme.spacing.xs};
`;

const ModelDescription = styled.div`
  color: rgba(180, 180, 180, 0.8);
  font-size: ${theme.fontSize.xs};
  line-height: 1.5;
  margin-top: ${theme.spacing.xs};
`;

const ModelSubtitle = styled.div`
  color: rgba(200, 200, 200, 0.9);
  font-weight: 600;
  font-size: ${theme.fontSize.xs};
  margin-top: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.xs};
`;

const ModelSection = styled.div`
  margin-top: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.xs};
`;

const ModelSectionTitle = styled.span`
  font-weight: 600;
  color: rgba(200, 200, 200, 0.9);
`;

const CloseButton = styled.button`
  margin-top: ${theme.spacing.lg};
  width: 100%;
  padding: ${theme.spacing.md};
  background: rgba(60, 60, 60, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(80, 80, 80, 0.7);
    border-color: rgba(180, 180, 180, 0.5);
  }
`;

interface ModelSelectorModalProps {
  isOpen: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  {
    id: 'sao10k/l3-euryale-70b',
    name: 'L3 Euryale 70B',
    subtitle: '«Мастер темного фэнтези и глубокого погружения»',
    features: 'Эта модель обучена специально для того, чтобы быть максимально «человечной» в диалогах. У неё один из лучших показателей понимания контекста персонажа.',
    style: 'Она пишет очень выразительно, уделяя внимание не только действиям, но и внутренним переживаниям, запахам и атмосфере.',
    forWho: 'Идеально, если ты хочешь долгого развития сюжета, где важна психология и «химия» между персонажами. Она реже других моделей «ломает» образ героя.'
  },
  {
    id: 'gryphe/mythomax-l2-13b',
    name: 'MythoMax L2 13B',
    subtitle: '«Оптимизированная модель для ролевых игр и историй»',
    features: 'Компактная и эффективная модель, специально оптимизированная для качественных диалогов и ролевых сценариев.',
    style: 'Пишет естественно и выразительно, хорошо поддерживает контекст и характер персонажа.',
    forWho: 'Отличный выбор для быстрых и качественных ответов с хорошим пониманием контекста.'
  }
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  selectedModel,
  onSelectModel,
  onClose
}) => {
  if (!isOpen) return null;

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>Выберите модель</ModalTitle>
        <ModelList>
          {AVAILABLE_MODELS.map((model) => (
            <ModelOption
              key={model.id}
              $isSelected={selectedModel === model.id}
              onClick={() => handleSelect(model.id)}
            >
              <ModelName>{model.name}</ModelName>
              <ModelSubtitle>{model.subtitle}</ModelSubtitle>
              <ModelDescription>
                <ModelSection>
                  <ModelSectionTitle>Особенности:</ModelSectionTitle> {model.features}
                </ModelSection>
                <ModelSection>
                  <ModelSectionTitle>Стиль:</ModelSectionTitle> {model.style}
                </ModelSection>
                <ModelSection>
                  <ModelSectionTitle>Для кого:</ModelSectionTitle> {model.forWho}
                </ModelSection>
              </ModelDescription>
            </ModelOption>
          ))}
        </ModelList>
        <CloseButton onClick={onClose}>Закрыть</CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};

