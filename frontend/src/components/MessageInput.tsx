import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import Dock from './Dock';
import type { DockItemData } from './Dock';
import { FiSend, FiImage, FiTrash2 } from 'react-icons/fi';

const InputContainer = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(30, 30, 30, 0.8);
  border-top: 1px solid rgba(150, 150, 150, 0.3);
  display: flex;
  flex-direction: column;
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
  min-height: 80px; /* Увеличена минимальная высота */
  max-height: 200px; /* Увеличена максимальная высота */
  padding: ${theme.spacing.lg}; /* Увеличен padding */
  background: rgba(35, 35, 35, 0.8); /* Более темный фон */
  border: 2px solid rgba(150, 150, 150, 0.4);
  border-radius: ${theme.borderRadius.xl}; /* Более скругленные углы */
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  backdrop-filter: blur(10px); /* Эффект размытия */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); /* Тень для глубины */
  
  &:focus {
    border-color: rgba(200, 200, 200, 0.6);
    box-shadow: 0 0 0 4px rgba(150, 150, 150, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4);
    outline: none;
    background: rgba(40, 40, 40, 0.9); /* Немного светлее при фокусе */
  }
  
  &::placeholder {
    color: rgba(160, 160, 160, 0.8);
    font-style: italic;
  }
  
  &:disabled {
    cursor: not-allowed;
  }
  
  /* Улучшенная прокрутка */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 30, 30, 0.5);
    border-radius: ${theme.borderRadius.md};
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(150, 150, 150, 0.5);
    border-radius: ${theme.borderRadius.md};
    
    &:hover {
      background: rgba(180, 180, 180, 0.6);
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
  onGenerateImage?: (message: string) => void;
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
    if (message.trim() && !disabled && onGenerateImage) {
      onGenerateImage(message.trim());
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
      className: disabled || !message.trim() || !onGenerateImage ? 'disabled' : ''
    },
    ...(onClearChat && hasMessages ? [{
      icon: <FiTrash2 size={20} />,
      label: 'Очистить историю',
      onClick: handleClear,
      className: ''
    }] : []),
    ...(onTipCreator ? [{
      icon: <span style={{ fontSize: '20px' }}>💝</span>,
      label: 'Поблагодарить создателя',
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
