import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import Dock from './Dock';
import type { DockItemData } from './Dock';
import { FiSend, FiImage, FiTrash2 } from 'react-icons/fi';

const InputContainer = styled.div`
  padding: ${theme.spacing.lg};
  background: linear-gradient(180deg, rgba(25, 25, 25, 0.95) 0%, rgba(20, 20, 20, 0.9) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(100, 100, 100, 0.2);
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${theme.spacing.md};
  align-items: flex-end;
  max-width: 100%;
`;

const TextArea = styled.textarea<{ $isDisabled: boolean }>`
  flex: 1;
  min-height: 80px;
  max-height: 200px;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(40, 40, 40, 0.6) 0%, rgba(30, 30, 30, 0.5) 100%);
  border: 2px solid rgba(120, 120, 120, 0.3);
  border-radius: ${theme.borderRadius.xl};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05);
  
  &:focus {
    border-color: rgba(150, 150, 150, 0.6);
    box-shadow: 0 0 0 4px rgba(100, 100, 100, 0.15), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
    outline: none;
    background: linear-gradient(135deg, rgba(50, 50, 50, 0.7) 0%, rgba(40, 40, 40, 0.6) 100%);
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: rgba(140, 140, 140, 0.6);
    font-style: italic;
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  
  /* Улучшенная прокрутка */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.3);
    border-radius: ${theme.borderRadius.md};
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(120, 120, 120, 0.5) 0%, rgba(100, 100, 100, 0.5) 100%);
    border-radius: ${theme.borderRadius.md};
    
    &:hover {
      background: linear-gradient(180deg, rgba(140, 140, 140, 0.7) 0%, rgba(120, 120, 120, 0.7) 100%);
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
  disabled?: boolean;
  placeholder?: string;
  hasMessages?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onGenerateImage,
  onClearChat,
  onTipCreator,
  disabled = false,
  placeholder = "Введите сообщение...",
  hasMessages = false
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
    if (!disabled && onGenerateImage) {
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
      className: disabled || !onGenerateImage ? 'disabled' : ''
    },
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
    }] : [])
  ];

  return (
    <InputContainer>
      <form onSubmit={handleSubmit}>
        <InputWrapper>
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
