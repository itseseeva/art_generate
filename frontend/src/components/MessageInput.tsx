import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import Dock from './Dock';
import type { DockItemData } from './Dock';
import { FiSend } from 'react-icons/fi';
import { 
  Image, 
  Trash2, 
  HelpCircle, 
  MessageSquare, 
  Heart, 
  Bot 
} from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';

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
  max-width: ${props => props.$isMobile ? '100%' : '1000px'}; /* Ограничим ширину на десктопе для эстетики */
  margin: 0 auto;
  width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
`;

const LanguageToggle = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(25, 25, 25, 0.6);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border: 1px solid rgba(50, 50, 50, 0.5);
  border-radius: ${theme.borderRadius.md};
  padding: 4px;
  height: fit-content;
  position: absolute;
  left: ${theme.spacing.lg};
  top: 50%;
  transform: translateY(-50%);
  z-index: 11;

  @media (max-width: 768px) {
    padding: 2px;
    position: static;
    transform: none;
    left: auto;
    top: auto;
  }
`;

const LanguageButton = styled.button<{ $isActive: boolean }>`
  padding: 6px 12px;
  background: ${props => props.$isActive 
    ? 'rgba(60, 60, 60, 0.9)' 
    : 'transparent'};
  border: none;
  border-radius: ${theme.borderRadius.sm};
  color: ${props => props.$isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(180, 180, 180, 0.8)'};
  font-size: ${theme.fontSize.sm};
  font-weight: ${props => props.$isActive ? '600' : '500'};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 44px;

  @media (max-width: 768px) {
    padding: 4px 8px;
    font-size: 0.75rem;
    min-width: 32px;
  }
  
  &:hover {
    background: ${props => props.$isActive 
      ? 'rgba(70, 70, 70, 1)' 
      : 'rgba(40, 40, 40, 0.6)'};
    color: rgba(255, 255, 255, 1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

const TextArea = styled.textarea<{ $isDisabled: boolean; $isMobile?: boolean }>`
  flex: 1;
  min-height: ${props => props.$isMobile ? '34px' : '50px'}; /* Чуть выше дефолт */
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

const DockWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 12px;
  background: rgba(20, 20, 20, 0.4) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  opacity: 1;
  height: fit-content;
  align-self: flex-end;
`;

const PremiumIconWrapper = styled.div<{ $disabled?: boolean; $color?: string; $isImage?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  pointer-events: ${props => props.$disabled ? 'none' : 'auto'};
  
  svg {
    width: 20px;
    height: 20px;
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
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
  color: rgba(59, 130, 246, 0.6);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const BotIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
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
  targetLanguage?: 'ru' | 'en';
  isPremium?: boolean;
  onLanguageChange?: (language: 'ru' | 'en') => void;
  onSelectModel?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onGenerateImage,
  onClearChat,
  onTipCreator,
  onShowComments,
  onShowHelp,
  disabled = false,
  disableImageGeneration = false,
  placeholder = "Введите сообщение...",
  hasMessages = false,
  targetLanguage = 'ru',
  isPremium = false,
  onLanguageChange,
  onSelectModel
}) => {
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          <Image strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: 'Сгенерировать изображение',
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
      label: 'Помощь',
      onClick: handleShowHelp,
      className: disabled ? 'disabled' : ''
    }] : []),
    ...(onClearChat && hasMessages ? [{
      icon: (
        <PremiumIconWrapper>
          <Trash2 strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: 'Очистить историю',
      onClick: handleClear,
      className: ''
    }] : []),
    ...(onTipCreator ? [{
      icon: (
        <PremiumIconWrapper $color="#ec4899">
          <Heart strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: 'Поблагодарить',
      onClick: onTipCreator,
      className: '' 
    }] : []),
    ...(onShowComments ? [{
      icon: (
        <PremiumIconWrapper>
          <MessageSquare strokeWidth={2.5} />
        </PremiumIconWrapper>
      ),
      label: 'Комментарии',
      onClick: onShowComments,
      className: '' 
    }] : []),
    ...(onSelectModel ? [{
      icon: (
        <BotIconWrapper>
          <AnimatedBotIcon strokeWidth={2.5} />
        </BotIconWrapper>
      ),
      label: 'Выбрать модель',
      onClick: onSelectModel,
      className: '' 
    }] : [])
  ];

  return (
    <InputContainer $isMobile={isMobile}>
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!isMobile && (
          <LanguageToggle>
            <LanguageButton
              type="button"
              $isActive={targetLanguage === 'ru'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLanguageChange && onLanguageChange('ru');
              }}
              disabled={disabled}
              title="Русский язык"
            >
              RU
            </LanguageButton>
            <LanguageButton
              type="button"
              $isActive={targetLanguage === 'en'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLanguageChange && onLanguageChange('en');
              }}
              disabled={disabled}
              title="English language"
            >
              EN
            </LanguageButton>
          </LanguageToggle>
        )}
        <InputWrapper $isMobile={isMobile}>
          <TextAreaWrapper $isMobile={isMobile}>
            <TextArea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              $isDisabled={disabled}
              $isMobile={isMobile}
              rows={1}
            />
            {isMobile ? (
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
            ) : (
              <SendButtonDesktop 
                type="submit" 
                onClick={(e) => { e.preventDefault(); handleSend(); }} 
                $disabled={disabled || !message.trim()}
              >
                <FiSend size={20} style={{ marginLeft: '2px' }} />
              </SendButtonDesktop>
            )}
          </TextAreaWrapper>
          
          {isMobile ? (
            <MobileActions>
              <LanguageToggle>
                <LanguageButton
                  type="button"
                  $isActive={targetLanguage === 'ru'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLanguageChange && onLanguageChange('ru');
                  }}
                  disabled={disabled}
                >
                  RU
                </LanguageButton>
                <LanguageButton
                  type="button"
                  $isActive={targetLanguage === 'en'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLanguageChange && onLanguageChange('en');
                  }}
                  disabled={disabled}
                >
                  EN
                </LanguageButton>
              </LanguageToggle>

              <MobileButtons>
                {onSelectModel && (
                  <MobileIconButton type="button" onClick={onSelectModel} title="Выбрать модель">
                    <MobileButtonLabel>Модель</MobileButtonLabel>
                    <Bot size={20} color="rgba(59, 130, 246, 0.9)" strokeWidth={2.5} />
                  </MobileIconButton>
                )}
                {onGenerateImage && (
                  <MobileIconButton 
                    type="button" 
                    onClick={handleImageGeneration} 
                    disabled={disableImageGeneration}
                    title="Сгенерировать фото"
                  >
                    <MobileButtonLabel>Фото</MobileButtonLabel>
                    <Image size={22} strokeWidth={2.5} />
                  </MobileIconButton>
                )}
                {onShowHelp && (
                  <MobileIconButton type="button" onClick={handleShowHelp} title="Помощь">
                    <MobileButtonLabel>Помощь</MobileButtonLabel>
                    <HelpCircle size={24} strokeWidth={2.5} />
                  </MobileIconButton>
                )}
                {onTipCreator && (
                  <MobileIconButton type="button" onClick={onTipCreator} title="Поблагодарить">
                    <MobileButtonLabel>Донат</MobileButtonLabel>
                    <Heart size={20} color="#ec4899" strokeWidth={2.5} />
                  </MobileIconButton>
                )}
                {onShowComments && (
                  <MobileIconButton type="button" onClick={onShowComments} title="Комментарии">
                    <MobileButtonLabel>Чат</MobileButtonLabel>
                    <MessageSquare size={20} strokeWidth={2.5} />
                  </MobileIconButton>
                )}
                {onClearChat && hasMessages && (
                  <MobileIconButton type="button" onClick={handleClear} title="Очистить чат">
                    <MobileButtonLabel>Очистить</MobileButtonLabel>
                    <Trash2 size={20} strokeWidth={2.5} />
                  </MobileIconButton>
                )}
              </MobileButtons>
            </MobileActions>
          ) : (
            <DockWrapper>
              <Dock 
                items={dockItems}
                baseItemSize={40} /* Чуть меньше размер, так как основная кнопка ушла */
                magnification={50}
                distance={100}
                panelHeight={50}
                dockHeight={60}
              />
            </DockWrapper>
          )}
        </InputWrapper>
      </form>
    </InputContainer>
  );
};