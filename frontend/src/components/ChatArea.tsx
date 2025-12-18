import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { Message } from './Message';

const MessagesContainer = styled.div`
  flex: 1;
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  overflow-y: auto;
  overflow-x: hidden;
  background: transparent;
  position: relative;
  min-height: 0;
  
  /* Стилизация скроллбара */
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

const MessagesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  min-height: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${theme.spacing.xl};
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(50, 50, 50, 0.4) 0%, rgba(40, 40, 40, 0.3) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(120, 120, 120, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
  color: rgba(200, 200, 200, 1);
  font-style: italic;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 4px;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: ${theme.borderRadius.full};
    background: rgba(150, 150, 150, 1);
    animation: pulse 1.4s ease-in-out infinite;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: rgba(160, 160, 160, 1);
  padding: ${theme.spacing.xl};
  background: transparent;
  border: none;
  box-shadow: none;
  
  h3 {
    font-size: ${theme.fontSize.xl};
    margin-bottom: ${theme.spacing.md};
    color: rgba(240, 240, 240, 1);
    font-weight: 600;
  }
  
  p {
    font-size: ${theme.fontSize.base};
    line-height: 1.7;
    max-width: 500px;
    color: rgba(180, 180, 180, 0.9);
  }
`;

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  characterSituation?: string;
  characterName?: string;
  characterAvatar?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
  [key: string]: any; // Для других пропсов, которые могут передаваться
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  isLoading, 
  characterSituation,
  characterName,
  characterAvatar,
  isAuthenticated,
  isCharacterOwner,
  onAddToGallery,
  onAddToPaidAlbum,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasScrolledToBottomRef = useRef(true);

  // Проверяем, находится ли пользователь внизу, перед изменением сообщений
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkIfScrolledToBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = 100; // Порог в пикселях от низа
      wasScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;
    };

    checkIfScrolledToBottom();
  }, [messages]);

  // Автоматическая прокрутка к последнему сообщению только если пользователь был внизу
  useEffect(() => {
    if (wasScrolledToBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <MessagesContainer ref={messagesContainerRef}>
      <MessagesList>
        {messages.length === 0 && !isLoading && (
          <EmptyState>
            {characterSituation ? (
              <>
                <h3>Ролевая ситуация</h3>
                <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left', maxWidth: '100%' }}>
                  {characterSituation}
                </p>
              </>
            ) : (
              <>
            <h3>Добро пожаловать в чат!</h3>
            <p>
              Выберите персонажа в боковой панели и начните общение. 
              Каждый персонаж имеет свой уникальный характер и стиль общения.
            </p>
              </>
            )}
          </EmptyState>
        )}
        
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message}
            characterName={characterName}
            characterAvatar={characterAvatar}
            isAuthenticated={isAuthenticated}
            isCharacterOwner={isCharacterOwner}
            onAddToGallery={onAddToGallery}
            onAddToPaidAlbum={onAddToPaidAlbum}
          />
        ))}
        
        <div ref={messagesEndRef} />
      </MessagesList>
    </MessagesContainer>
  );
};
