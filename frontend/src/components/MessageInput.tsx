import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import Dock from './Dock';
import type { DockItemData } from './Dock';
import { ConfirmModal } from './ConfirmModal';
import { FiSend } from 'react-icons/fi';
import {
  Trash2,
  HelpCircle,
  MessageSquare,
  Heart,
  Bot,
  Camera,
  Mic
} from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';
import { useTranslation } from 'react-i18next';

const InputContainer = styled.div<{ $isMobile?: boolean }>`
  padding: ${props => props.$isMobile ? '0.5rem' : theme.spacing.lg};
  background: ${props => props.$isMobile ? 'rgba(10, 10, 10, 0.7)' : 'rgba(0, 0, 0, 0.2)'};
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-top: ${props => props.$isMobile ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'};
  display: flex;
  flex-direction: column;
  box-shadow: none;
  z-index: 10;
  position: relative;
  width: 100%;
  box-sizing: border-box;
`;

const InputWrapper = styled.div<{ $isMobile?: boolean }>`
  display: flex;
  flex-direction: ${props => props.$isMobile ? 'column' : 'row'};
  gap: ${theme.spacing.md};
  align-items: ${props => props.$isMobile ? 'stretch' : 'flex-end'};
  max-width: ${props => props.$isMobile ? '100%' : '100%'};
  padding: 0 ${props => props.$isMobile ? '0' : theme.spacing.xl}; /* Add horizontal padding on desktop */
  margin: 0 auto;
  width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
`;





const TextAreaWrapper = styled.div<{ $isMobile?: boolean }>`
  display: flex;
  flex-direction: row;
  gap: ${theme.spacing.sm};
  align-items: flex-end;
  flex: 1;
  width: 100%;
  position: relative;
  z-index: ${props => props.$isMobile ? 2 : 1};
  background: ${props => props.$isMobile ? 'transparent' : 'rgba(30, 30, 30, 0.4)'};
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: ${props => props.$isMobile ? '0' : '4px'};
  border: ${props => props.$isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'};
  transition: all 0.3s ease;

  &:focus-within {
     border-color: rgba(236, 72, 153, 0.5);
     box-shadow: 0 0 15px rgba(236, 72, 153, 0.1);
     background: ${props => props.$isMobile ? 'transparent' : 'rgba(40, 40, 40, 0.6)'};
  }
`;



const TextAreaColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
`;

const TextArea = styled.textarea<{ $isDisabled: boolean; $isMobile?: boolean }>`
  flex: 1;
  min-height: ${props => props.$isMobile ? '34px' : '54px'}; /* Увеличено до 54px для баланса */
  max-height: ${props => props.$isMobile ? '120px' : '200px'};
  padding: ${props => props.$isMobile ? '6px 12px' : '14px 20px'};
  background: transparent; /* Фон теперь на Wrapper */
  border: none;
  border-radius: ${theme.borderRadius.xl};
  color: rgba(240, 240, 240, 1);
  font-size: ${props => props.$isMobile ? '0.9rem' : theme.fontSize.base};
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: ${props => props.$isMobile ? 2 : 1};

  &:focus {
    outline: none;
  }
  
  &::placeholder {
    color: rgba(140, 140, 140, 0.6);
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  /* Прокрутка */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.4);
    border-radius: 10px;
  }
`;

// Кнопка отправки для Desktop
const SendButtonDesktop = styled.button<{ $disabled?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.$disabled ? '#333' : '#db2777'}; /* Pink-600 */
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  margin: 2px;
  flex-shrink: 0;
  box-shadow: ${props => props.$disabled ? 'none' : '0 4px 12px rgba(219, 39, 119, 0.3)'};

  &:hover:not(:disabled) {
    background: #ec4899; /* Pink-500 */
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.6);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const MobileActions = styled.div`
  display: flex !important;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  width: 100%;
  position: relative;
  z-index: 10;
  overflow: visible;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 44px;
  flex-shrink: 0;
`;

const MobileButtons = styled.div`
  display: flex !important;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  position: relative;
  z-index: 10;
  overflow: visible;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 44px;
  flex-shrink: 0;
`;

const MobileIconButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$disabled ? 'rgba(150, 150, 150, 0.4)' : 'rgba(240, 240, 240, 0.9)'};
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  padding: 2px 4px;
  gap: 2px;
  transition: transform 0.2s;
  min-width: 44px;
  height: 44px;
  flex-shrink: 0;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative;
  z-index: 2;

  &:active {
    transform: scale(0.9);
  }
`;

const MobileButtonLabel = styled.span`
  font-size: 0.65rem;
  color: inherit;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
`;

const IconButton = styled.button<{ $disabled?: boolean }>`
  background: transparent;
  border: none;
  color: ${props => props.$disabled ? 'rgba(150, 150, 150, 0.4)' : 'rgba(240, 240, 240, 0.9)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  padding: 6px;
  transition: transform 0.2s;

  &:active {
    transform: scale(0.9);
  }
`;

const DockAndCountersRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
  height: fit-content;
  align-self: flex-end;
`;

const DockWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 10px;
  background: rgba(20, 20, 20, 0.4) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  opacity: 1;
  height: fit-content;
`;

const ResourceCountersContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0;
  height: fit-content;
  background: transparent;
`;

const ResourceCounter = styled.div<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
`;

const AnimatedCounterIcon = styled.div<{ $color: string; $glowColor: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 22px;
    height: 22px;
    stroke-width: 2.2;
    color: ${props => props.$color};
    filter: drop-shadow(0 0 8px ${props => props.$glowColor});
    animation: counter-icon-pulse 2.5s ease-in-out infinite;
  }
  
  @keyframes counter-icon-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.92;
      transform: scale(1.08);
    }
  }
`;

const CounterValue = styled.span<{ $warning?: boolean }>`
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.$warning ? '#fbbf24' : '#a78bfa'};
  text-shadow: 0 0 8px ${props => props.$warning ? 'rgba(251, 191, 36, 0.4)' : 'rgba(167, 139, 250, 0.4)'};
`;

const PremiumIconWrapper = styled.div<{ $disabled?: boolean; $color?: string; $isImage?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  pointer-events: ${props => props.$disabled ? 'none' : 'auto'};
  
  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2.5;
    color: ${props => {
    if (props.$disabled) return 'rgba(150, 150, 150, 0.4)';
    if (props.$color) return props.$color;
    return 'rgba(240, 240, 240, 0.6)';
  }};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    ${props => props.$isImage && !props.$disabled ? `
      animation: pulse-glow-image 2s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.9)) drop-shadow(0 0 12px rgba(59, 130, 246, 0.6));
    ` : ''}
  }
  
  @keyframes pulse-glow-image {
    0%, 100% {
      opacity: 1;
      filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.9)) drop-shadow(0 0 12px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.4));
      transform: scale(1);
    }
    50% {
      opacity: 1;
      filter: drop-shadow(0 0 12px rgba(59, 130, 246, 1)) drop-shadow(0 0 18px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.6));
      transform: scale(1.05);
    }
  }
  
  &:hover:not([data-disabled="true"]) {
    transform: scale(1.1);
    
    svg {
      color: ${props => {
    if (props.$disabled) return 'rgba(150, 150, 150, 0.4)';
    if (props.$color) return props.$color;
    return '#8B5CF6';
  }};
      filter: ${props => {
    if (props.$disabled) return 'none';
    if (props.$isImage) {
      return 'drop-shadow(0 0 16px rgba(59, 130, 246, 1)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 32px rgba(59, 130, 246, 0.6))';
    }
    if (props.$color) {
      const r = parseInt(props.$color.slice(1, 3), 16);
      const g = parseInt(props.$color.slice(3, 5), 16);
      const b = parseInt(props.$color.slice(5, 7), 16);
      return `drop-shadow(0 0 8px rgba(${r}, ${g}, ${b}, 0.5))`;
    }
    return 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))';
  }};
      ${props => props.$isImage ? 'animation: none;' : ''}
    }
  }
  
  &:active:not([data-disabled="true"]) {
    transform: scale(0.95);
  }
`;

const AnimatedBotIcon = styled(Bot)`
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  color: rgba(59, 130, 246, 0.6);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const BotIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  &:hover {
    transform: scale(1.1);
    
    ${AnimatedBotIcon} {
      color: #3B82F6;
      transform: scale(1.1);
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onGenerateImage?: (message?: string) => void;
  onClearChat?: () => void;
  onTipCreator?: () => void;
  onShowComments?: () => void;
  onShowHelp?: () => void;
  disabled?: boolean;
  disableImageGeneration?: boolean;
  placeholder?: string;
  hasMessages?: boolean;

  onSelectModel?: () => void;
  /** Счётчики лимитов: сообщения (для FREE), генерации и голос */
  messagesRemaining?: number;
  photosRemaining?: number; // Deprecated, use imagesRemaining
  imagesRemaining?: number;
  voiceRemaining?: number;
  subscriptionType?: 'free' | 'base' | 'standard' | 'premium';
  // Brevity mode
  brevityMode?: 'brief' | 'normal';
  onBrevityModeChange?: (mode: 'brief' | 'normal') => void;
  onShop?: () => void;
}

const BrevityToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: fit-content;
  position: relative;
  cursor: pointer;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 15, 15, 0.95);
    color: white;
    padding: 6px 14px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    pointer-events: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: tooltipFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover::before {
    content: "";
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px 6px 0 6px;
    border-style: solid;
    border-color: rgba(15, 15, 15, 0.95) transparent transparent transparent;
    z-index: 1000;
    pointer-events: none;
    animation: tooltipFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes tooltipFadeIn {
    from { 
      opacity: 0; 
      transform: translate(-50%, 10px) scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: translate(-50%, 0) scale(1); 
    }
  animation: tooltipFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;


const BrevityTopContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
`;

const BrevityLabel = styled.span<{ $isActive: boolean }>`
  font-size: ${theme.fontSize.sm};
  color: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(180, 180, 180, 0.6)'};
  font-weight: ${props => props.$isActive ? '600' : '500'};
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const ToggleSwitchWrapper = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
  
  @media (max-width: 768px) {
    width: 42px;
    height: 22px;
  }
`;

const ToggleSwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleSwitchSlider = styled.span<{ $checked: boolean; $disabled?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.$checked
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'rgba(60, 60, 60, 0.8)'};
  border-radius: 24px;
  transition: all 0.3s ease;
  border: 1px solid ${props => props.$checked
    ? 'rgba(118, 75, 162, 0.5)'
    : 'rgba(80, 80, 80, 0.5)'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};

  &:before {
    content: "";
    position: absolute;
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 2px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    transform: ${props => props.$checked ? 'translateX(24px)' : 'translateX(0)'};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    @media (max-width: 768px) {
      height: 16px;
      width: 16px;
      transform: ${props => props.$checked ? 'translateX(20px)' : 'translateX(0)'};
    }
  }

  &:hover {
    background: ${props => props.$checked
    ? 'linear-gradient(135deg, #7c8ef0 0%, #8b5fc4 100%)'
    : 'rgba(70, 70, 70, 0.9)'};
  }
`;

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onGenerateImage,
  onClearChat,
  onTipCreator,
  onShowComments,
  onShowHelp,
  disabled = false,
  disableImageGeneration = false,
  placeholder,
  hasMessages = false,

  onSelectModel,
  messagesRemaining,
  photosRemaining,
  imagesRemaining,
  voiceRemaining,
  subscriptionType = 'free',
  brevityMode = 'normal',
  onBrevityModeChange,
  onShop,
  ...props
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use imagesRemaining if available, otherwise fallback to photosRemaining = imagesRemaining !== undefined ? imagesRemaining : photosRemaining;

  const actualImagesRemaining = imagesRemaining !== undefined ? imagesRemaining : photosRemaining;

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message, isMobile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleImageGeneration = () => {
    if (!disableImageGeneration && onGenerateImage) {
      onGenerateImage();
      setMessage('');
    }
  };

  const handleClear = () => {
    if (onClearChat && hasMessages) {
      onClearChat();
    }
  };

  const handleShowHelp = () => {
    if (!disabled && onShowHelp) {
      onShowHelp();
    }
  };

  const dockItems: DockItemData[] = [
    {
      icon: (
        <PremiumIconWrapper
          $disabled={disableImageGeneration || !onGenerateImage}
          $isImage={true}
          data-disabled={disableImageGeneration || !onGenerateImage}
        >
          <Camera strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: t('chat.generatePhotoButton'),
      onClick: handleImageGeneration,
      className: disableImageGeneration || !onGenerateImage ? 'disabled' : ''
    },
    ...(onShowHelp ? [{
      icon: (
        <PremiumIconWrapper
          $disabled={disabled}
          data-disabled={disabled}
        >
          <HelpCircle strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: t('chat.help'),
      onClick: handleShowHelp,
      className: disabled ? 'disabled' : ''
    }] : []),
    ...(onClearChat && hasMessages ? [{
      icon: (
        <PremiumIconWrapper>
          <Trash2 strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: t('chat.clearHistory'),
      onClick: handleClear,
      className: ''
    }] : []),
    ...(onTipCreator ? [{
      icon: (
        <PremiumIconWrapper $color="#ec4899">
          <Heart strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: t('chat.thankCreator'),
      onClick: onTipCreator,
      className: ''
    }] : []),
    ...(onShowComments ? [{
      icon: (
        <PremiumIconWrapper>
          <MessageSquare strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: t('chat.comments'),
      onClick: onShowComments,
      className: ''
    }] : []),
    ...(onSelectModel ? [{
      icon: (
        <BotIconWrapper>
          <AnimatedBotIcon strokeWidth={2.5} />
        </BotIconWrapper>
      ),
      label: t('chat.selectModel'),
      onClick: onSelectModel,
      className: ''
    }] : [])
  ];

  return (
    <InputContainer $isMobile={isMobile}>
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>



        <InputWrapper $isMobile={isMobile}>


          <TextAreaColumn>
            {!isMobile && (
              <BrevityTopContainer>
                <BrevityToggleContainer data-tooltip={t('brevity.tooltip')}>
                  <BrevityLabel $isActive={brevityMode === 'brief'}>
                    {t('brevity.brief')}
                  </BrevityLabel>
                  <ToggleSwitchWrapper>
                    <ToggleSwitchInput
                      type="checkbox"
                      checked={brevityMode === 'normal'}
                      onChange={(e) => {
                        e.preventDefault();
                        onBrevityModeChange && onBrevityModeChange(e.target.checked ? 'normal' : 'brief');
                      }}
                      disabled={disabled}
                    />
                    <ToggleSwitchSlider
                      $checked={brevityMode === 'normal'}
                      $disabled={disabled}
                    />
                  </ToggleSwitchWrapper>
                  <BrevityLabel $isActive={brevityMode === 'normal'}>
                    {t('brevity.detailed')}
                  </BrevityLabel>
                </BrevityToggleContainer>
              </BrevityTopContainer>
            )}
            <TextAreaWrapper $isMobile={isMobile}>
              <TextArea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || (disabled ? t('chat.chatDisabled') : t('chat.writeMessage'))}
                disabled={disabled}
                $isDisabled={disabled}
                $isMobile={isMobile}
                rows={1}
              />
              {!isMobile && (
                <SendButtonDesktop
                  type="button"
                  onClick={handleSend}
                  disabled={disabled || !message.trim()}
                  $disabled={disabled || !message.trim()}
                  title={t('chat.sendEnter')}
                >
                  <FiSend size={20} />
                </SendButtonDesktop>
              )}
              {isMobile && (
                <IconButton
                  type="button"
                  onClick={handleSend}
                  disabled={disabled || !message.trim()}
                  style={{
                    color: !message.trim() ? 'rgba(150, 150, 150, 0.4)' : (theme.colors.accent?.primary || '#764ba2'),
                    padding: '4px 8px'
                  }}
                >
                  <FiSend size={22} />
                </IconButton>
              )}
            </TextAreaWrapper>
          </TextAreaColumn>

          {!isMobile && (
            <DockAndCountersRow>
              <DockWrapper>
                <Dock
                  items={dockItems}
                  panelHeight={48}
                  baseItemSize={36}
                  magnification={50}
                  distance={140}
                />
              </DockWrapper>

              <ResourceCountersContainer>
                {subscriptionType === 'free' && (
                  <ResourceCounter>
                    <AnimatedCounterIcon $color="rgba(167, 139, 250, 0.9)" $glowColor="rgba(167, 139, 250, 0.4)">
                      <MessageSquare />
                    </AnimatedCounterIcon>
                    <CounterValue>{messagesRemaining ?? 0}</CounterValue>
                  </ResourceCounter>
                )}

                <ResourceCounter>
                  <AnimatedCounterIcon $color="rgba(236, 72, 153, 0.9)" $glowColor="rgba(236, 72, 153, 0.4)">
                    <Camera />
                  </AnimatedCounterIcon>
                  <CounterValue $warning={(actualImagesRemaining ?? 0) <= 5}>{actualImagesRemaining ?? 0}</CounterValue>
                </ResourceCounter>

                <ResourceCounter>
                  <AnimatedCounterIcon $color="rgba(59, 130, 246, 0.9)" $glowColor="rgba(59, 130, 246, 0.4)">
                    <Mic />
                  </AnimatedCounterIcon>
                  <CounterValue $warning={(voiceRemaining ?? 0) <= 5}>{voiceRemaining ?? 0}</CounterValue>
                </ResourceCounter>
              </ResourceCountersContainer>
            </DockAndCountersRow>
          )}
        </InputWrapper>

        {isMobile && (
          <MobileActions>


            <MobileButtons>
              {onSelectModel && (
                <MobileIconButton type="button" onClick={onSelectModel} title={t('chat.selectModel')}>
                  <Bot size={20} color="rgba(59, 130, 246, 0.9)" strokeWidth={2.5} />
                  <MobileButtonLabel>{t('chat.selectModel')}</MobileButtonLabel>
                </MobileIconButton>
              )}
              {onGenerateImage && (
                <MobileIconButton
                  type="button"
                  onClick={handleImageGeneration}
                  disabled={disableImageGeneration}
                  title={t('chat.generatePhotoButton')}
                >
                  <Camera size={22} strokeWidth={2.5} />
                  <MobileButtonLabel>{t('common.photo')}</MobileButtonLabel>
                </MobileIconButton>
              )}
              {onShowHelp && (
                <MobileIconButton type="button" onClick={handleShowHelp} title={t('chat.help')}>
                  <HelpCircle size={24} strokeWidth={2.5} />
                  <MobileButtonLabel>{t('chat.help')}</MobileButtonLabel>
                </MobileIconButton>
              )}
              {onTipCreator && (
                <MobileIconButton type="button" onClick={onTipCreator} title={t('chat.thankCreator')}>
                  <Heart size={20} color="#ec4899" strokeWidth={2.5} />
                  <MobileButtonLabel>{t('common.donate')}</MobileButtonLabel>
                </MobileIconButton>
              )}
              {onShowComments && (
                <MobileIconButton type="button" onClick={onShowComments} title={t('chat.comments')}>
                  <MessageSquare size={20} strokeWidth={2.5} />
                  <MobileButtonLabel>{t('common.chat')}</MobileButtonLabel>
                </MobileIconButton>
              )}
              {onClearChat && hasMessages && (
                <MobileIconButton type="button" onClick={handleClear} title={t('chat.clearChat')}>
                  <Trash2 size={20} strokeWidth={2.5} />
                  <MobileButtonLabel>{t('chat.clearChat')}</MobileButtonLabel>
                </MobileIconButton>
              )}
            </MobileButtons>
          </MobileActions>
        )}
      </form>
    </InputContainer>
  );
};