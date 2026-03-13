import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, PenTool, User, Brain, Zap, Cpu, CheckCircle } from 'lucide-react';
import { theme } from '../theme';

const premiumPulse = keyframes`
  0% { box-shadow: 0 0 5px rgba(255, 0, 122, 0.4); opacity: 0.8; }
  50% { box-shadow: 0 0 15px rgba(255, 0, 122, 0.8); opacity: 1; }
  100% { box-shadow: 0 0 5px rgba(255, 0, 122, 0.4); opacity: 0.8; }
`;

const activeGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(255, 0, 122, 0.2), inset 0 0 20px rgba(255, 0, 122, 0.1); }
  50% { box-shadow: 0 0 25px rgba(255, 0, 122, 0.4), inset 0 0 30px rgba(255, 0, 122, 0.2); }
  100% { box-shadow: 0 0 15px rgba(255, 0, 122, 0.2), inset 0 0 20px rgba(255, 0, 122, 0.1); }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const ModalContent = styled(motion.div)`
  background: rgba(13, 13, 13, 0.85); /* #0D0D0D */
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 0, 122, 0.2);
  border-radius: 24px;
  padding: ${theme.spacing.xl} ${theme.spacing.xxl};
  max-width: 1050px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 0, 122, 0.05);
  position: relative;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 0, 122, 0.3);
    border-radius: 10px;
  }
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #fff 0%, #FF007A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(255, 0, 122, 0.2);
`;

const ModelList = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.lg};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledModelOption = styled(motion.div)<{ $isSelected: boolean; $isPremium?: boolean }>`
  background: ${props => props.$isSelected 
    ? 'linear-gradient(180deg, rgba(255, 0, 122, 0.1) 0%, rgba(13, 13, 13, 0.8) 100%)' 
    : 'linear-gradient(180deg, rgba(30, 30, 30, 0.4) 0%, rgba(13, 13, 13, 0.8) 100%)'};
  border: 1px solid ${props => props.$isSelected 
    ? 'rgba(255, 0, 122, 0.8)' 
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 20px;
  padding: ${theme.spacing.lg};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.3s ease;
  
  ${props => props.$isSelected && css`
    animation: ${activeGlow} 3s infinite alternate ease-in-out;
  `}
  
  &:hover {
    border-color: ${props => props.$isSelected ? '#FF007A' : 'rgba(255, 0, 122, 0.4)'};
    box-shadow: 0 0 20px rgba(255, 0, 122, 0.15);
  }

  /* Border Top Gradient Accent */
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: ${props => props.$isSelected 
      ? 'linear-gradient(90deg, transparent, #FF007A, transparent)' 
      : 'transparent'};
  }
`;

const PremiumBadge = styled.div`
  position: absolute;
  top: -1px;
  right: -1px;
  background: rgba(255, 0, 122, 0.15);
  color: #FF007A;
  border-bottom: 1px solid rgba(255, 0, 122, 0.5);
  border-left: 1px solid rgba(255, 0, 122, 0.5);
  padding: 6px 12px;
  border-radius: 0 20px 0 16px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  backdrop-filter: blur(4px);
  animation: ${premiumPulse} 2s infinite;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SelectedBadge = styled.div`
  position: absolute;
  top: -1px;
  left: -1px;
  background: linear-gradient(135deg, #FF007A 0%, #aa0055 100%);
  color: #FFF;
  border-bottom: 1px solid rgba(255, 0, 122, 0.5);
  border-right: 1px solid rgba(255, 0, 122, 0.5);
  padding: 6px 12px;
  border-radius: 20px 0 16px 0;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 2px 2px 10px rgba(255, 0, 122, 0.3);
  z-index: 2;
`;

const ModelName = styled.h3`
  color: #fff;
  font-weight: 800;
  font-size: 20px;
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ModelSubtitle = styled.div`
  color: #FF007A;
  font-weight: 500;
  font-size: 13px;
  margin-bottom: ${theme.spacing.md};
  font-style: italic;
  opacity: 0.9;
`;

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: ${theme.spacing.md};
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #aaa;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatIconWrapper = styled.div`
  color: #FF007A;
  display: flex;
`;

const ProgressBarContainer = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressBarFill = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #FF007A 0%, #ff4b9f 100%);
  border-radius: 2px;
  box-shadow: 0 0 5px rgba(255, 0, 122, 0.5);
`;

const StatValue = styled.span`
  color: #fff;
  width: 24px;
  text-align: right;
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const FeatureItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const FeatureIconWrapper = styled.div`
  color: #FF007A;
  background: rgba(255, 0, 122, 0.1);
  padding: 6px;
  border-radius: 8px;
  display: flex;
  flex-shrink: 0;
`;

const FeatureText = styled.div`
  color: rgba(220, 220, 220, 0.8);
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CloseButton = styled.button`
  margin: ${theme.spacing.xl} auto 0;
  padding: 12px 32px;
  background: transparent;
  border: 1px solid rgba(255, 0, 122, 0.5);
  border-radius: 30px;
  color: #FF007A;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 0, 122, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    background: rgba(255, 0, 122, 0.1);
    box-shadow: 0 0 15px rgba(255, 0, 122, 0.3);
    color: #fff;
    border-color: #FF007A;
    
    &::before {
      left: 100%;
    }
  }
`;

const PremiumWarning = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background: rgba(255, 0, 122, 0.95);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  z-index: 10;
`;

interface ModelSelectorModalProps {
  isOpen: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onClose: () => void;
  isPremium?: boolean;
  onOpenPremiumModal?: () => void;
}

const getAvailableModels = (t: any) => [
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek Chat v3',
    subtitle: t('chat.modelSelector.models.deepseek.subtitle'),
    features: t('chat.modelSelector.models.deepseek.features'),
    style: t('chat.modelSelector.models.deepseek.style'),
    forWho: t('chat.modelSelector.models.deepseek.forWho'),
    stats: { logic: 90, creative: 85, speed: 95 },
    isPremium: false
  },
  {
    id: 'sao10k/l3-euryale-70b',
    name: 'L3 Euryale 70B',
    subtitle: t('chat.modelSelector.models.euryale.subtitle'),
    features: t('chat.modelSelector.models.euryale.features'),
    style: t('chat.modelSelector.models.euryale.style'),
    forWho: t('chat.modelSelector.models.euryale.forWho'),
    stats: { logic: 85, creative: 95, speed: 70 },
    isPremium: false
  },
  {
    id: 'thedrummer/cydonia-24b-v4.1',
    name: 'Cydonia 24B v4.1',
    subtitle: t('chat.modelSelector.models.cydonia.subtitle'),
    features: t('chat.modelSelector.models.cydonia.features'),
    style: t('chat.modelSelector.models.cydonia.style'),
    forWho: t('chat.modelSelector.models.cydonia.forWho'),
    stats: { logic: 95, creative: 90, speed: 80 },
    isPremium: false
  },
  {
    id: 'gryphe/mythomax-l2-13b',
    name: 'MythoMax L2 13B',
    subtitle: t('chat.modelSelector.models.mythomax.subtitle'),
    features: t('chat.modelSelector.models.mythomax.features'),
    style: t('chat.modelSelector.models.mythomax.style'),
    forWho: t('chat.modelSelector.models.mythomax.forWho'),
    stats: { logic: 80, creative: 95, speed: 85 },
    isPremium: true
  }
];

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  isOpen,
  selectedModel,
  onSelectModel,
  onClose,
  isPremium = false,
  onOpenPremiumModal
}) => {
  const { t } = useTranslation();
  const [premiumWarningId, setPremiumWarningId] = useState<string | null>(null);

  if (!isOpen) return null;

  const AVAILABLE_MODELS = getAvailableModels(t);

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
    <AnimatePresence>
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
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalTitle>{t('chat.modelSelector.title')}</ModalTitle>
          <ModelList>
            {AVAILABLE_MODELS.map((model) => (
              <StyledModelOption
                key={model.id}
                $isSelected={selectedModel === model.id}
                $isPremium={model.isPremium}
                onClick={() => handleSelect(model.id)}
                whileHover={{ scale: selectedModel === model.id ? 1.02 : 1.03 }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                {model.isPremium && (
                  <PremiumBadge>
                    <Sparkles size={12} fill="currentColor" /> {t('chat.modelSelector.premiumBadge')}
                  </PremiumBadge>
                )}
                
                {selectedModel === model.id && (
                  <SelectedBadge>
                    <CheckCircle size={12} /> {t('chat.modelSelector.currentSelection', 'Выбрана')}
                  </SelectedBadge>
                )}
                
                <ModelName>{model.name}</ModelName>
                <ModelSubtitle>{model.subtitle}</ModelSubtitle>
                
                {/* Cyberpunk Stats Bars */}
                <StatsContainer>
                  <StatRow>
                    <StatIconWrapper><Brain size={14} /></StatIconWrapper>
                    {t('chat.modelSelector.stats.logic', 'Logic')}
                    <ProgressBarContainer>
                      <ProgressBarFill 
                        initial={{ width: 0 }} 
                        animate={{ width: `${model.stats.logic}%` }} 
                        transition={{ delay: 0.2, duration: 1, ease: 'easeOut' }}
                      />
                    </ProgressBarContainer>
                    <StatValue>{model.stats.logic}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatIconWrapper><PenTool size={14} /></StatIconWrapper>
                    {t('chat.modelSelector.stats.creative', 'Creative')}
                    <ProgressBarContainer>
                       <ProgressBarFill 
                        initial={{ width: 0 }} 
                        animate={{ width: `${model.stats.creative}%` }} 
                        transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                      />
                    </ProgressBarContainer>
                    <StatValue>{model.stats.creative}</StatValue>
                  </StatRow>
                  <StatRow>
                    <StatIconWrapper><Zap size={14} /></StatIconWrapper>
                    {t('chat.modelSelector.stats.speed', 'Speed')}
                    <ProgressBarContainer>
                       <ProgressBarFill 
                        initial={{ width: 0 }} 
                        animate={{ width: `${model.stats.speed}%` }} 
                        transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                      />
                    </ProgressBarContainer>
                    <StatValue>{model.stats.speed}</StatValue>
                  </StatRow>
                </StatsContainer>

                <FeatureList>
                  <FeatureItem>
                    <FeatureIconWrapper><Cpu size={16} /></FeatureIconWrapper>
                    <FeatureText>{model.features}</FeatureText>
                  </FeatureItem>
                  <FeatureItem>
                    <FeatureIconWrapper><PenTool size={16} /></FeatureIconWrapper>
                    <FeatureText>{model.style}</FeatureText>
                  </FeatureItem>
                  <FeatureItem>
                    <FeatureIconWrapper><User size={16} /></FeatureIconWrapper>
                    <FeatureText>{model.forWho}</FeatureText>
                  </FeatureItem>
                </FeatureList>

                <AnimatePresence>
                  {premiumWarningId === model.id && (
                    <PremiumWarning
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.2 }}
                    >
                      {t('chat.modelSelector.premiumWarning')}
                    </PremiumWarning>
                  )}
                </AnimatePresence>
              </StyledModelOption>
            ))}
          </ModelList>
          
          <CloseButton onClick={onClose}>{t('chat.modelSelector.backToChat')}</CloseButton>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};