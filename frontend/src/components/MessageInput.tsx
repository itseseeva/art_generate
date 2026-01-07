import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import Dock from './Dock';
import type { DockItemData } from './Dock';
import { FiSend, FiImage, FiTrash2 } from 'react-icons/fi';

const InputContainer = styled.div`
  padding: ${theme.spacing.lg};
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  z-index: 10;
  position: relative;
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${theme.spacing.md};
  align-items: flex-end;
  max-width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
  margin: 0;
  padding: 0;
`;

const LanguageToggle = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(50, 50, 50, 0.6);
  border-radius: ${theme.borderRadius.md};
  padding: 4px;
  backdrop-filter: blur(15px);
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

const TextArea = styled.textarea<{ $isDisabled: boolean }>`
  flex: 1;
  min-height: 80px;
  max-height: 200px;
  padding: ${theme.spacing.lg};
  background: rgba(25, 25, 25, 0.8);
  border: 1px solid rgba(50, 50, 50, 0.6);
  border-radius: ${theme.borderRadius.xl};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.4), 
    inset 0 1px 2px rgba(255, 255, 255, 0.05);
  
  &:focus {
    border-color: rgba(80, 80, 80, 0.8);
    box-shadow: 
      0 0 0 2px rgba(60, 60, 60, 0.3), 
      0 8px 24px rgba(0, 0, 0, 0.5), 
      inset 0 1px 2px rgba(255, 255, 255, 0.1);
    outline: none;
    background: rgba(30, 30, 30, 0.9);
  }
  
  &::placeholder {
    color: rgba(140, 140, 140, 0.6);
    font-style: italic;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  /* Прокрутка */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.3);
    border-radius: ${theme.borderRadius.md};
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.6);
    border-radius: ${theme.borderRadius.md};
    
    &:hover {
      background: rgba(100, 100, 100, 0.8);
    }
  }
`;

const DockWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.sm} 0;
  background: transparent !important;
  opacity: 1;
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
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

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
      // Вызываем без параметра - откроется модалка с предзаполненным промптом
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
      icon: <FiSend size={20} />,
      label: 'Отправить',
      onClick: handleSend,
      className: disabled || !message.trim() ? 'disabled' : ''
    },
    {
      icon: <FiImage size={20} />,
      label: 'Сгенерировать изображение',
      onClick: handleImageGeneration,
      className: disableImageGeneration || !onGenerateImage ? 'disabled' : ''
    },
    ...(onShowHelp ? [{
      icon: <span style={{ fontSize: '24px', fontWeight: 600, color: 'white' }}>?</span>,
      label: 'Помощь по генерации фото',
      onClick: handleShowHelp,
      className: disabled ? 'disabled' : ''
    }] : []),
    ...(onClearChat && hasMessages ? [{
      icon: <FiTrash2 size={20} />,
      label: 'Очистить историю',
      onClick: handleClear,
      className: ''
    }] : []),
    ...(onTipCreator ? [{
      icon: <span style={{ fontSize: '20px' }}>💝</span>,
      label: 'Поблагодарить',
      onClick: onTipCreator,
      className: '' 
    }] : []),
    ...(onShowComments ? [{
      icon: <span style={{ fontSize: '20px' }}>💬</span>,
      label: 'Комментарии',
      onClick: onShowComments,
      className: '' 
    }] : []),
    ...(onSelectModel ? [{
      icon: <span style={{ fontSize: '18px', fontWeight: 600 }}>🤖</span>,
      label: 'Выбрать модель',
      onClick: onSelectModel,
      className: ''
    }] : [])
  ];

  return (
    <InputContainer>
      <form onSubmit={handleSubmit}>
        <InputWrapper>
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
          
          <TextArea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            $isDisabled={disabled}
            rows={1}
          />
          
          <DockWrapper>
            <Dock 
              items={dockItems}
              baseItemSize={48}
              magnification={56}
              distance={150}
              panelHeight={60}
              dockHeight={80}
            />
          </DockWrapper>
        </InputWrapper>
      </form>
    </InputContainer>
  );
};
