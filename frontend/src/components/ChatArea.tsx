import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { Message } from './Message';

const MessagesContainer = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  overflow-x: hidden;
  background: rgba(20, 20, 20, 1);
  position: relative;
  min-height: 0; /* Важно для flex-элементов */
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
  background: rgba(40, 40, 40, 0.5);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(150, 150, 150, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  color: rgba(160, 160, 160, 1);
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
  color: rgba(120, 120, 120, 1);
  
  h3 {
    font-size: ${theme.fontSize.xl};
    margin-bottom: ${theme.spacing.md};
    color: rgba(200, 200, 200, 1);
  }
  
  p {
    font-size: ${theme.fontSize.base};
    line-height: 1.6;
    max-width: 400px;
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
  [key: string]: any; // Для других пропсов, которые могут передаваться
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading, characterSituation }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоматическая прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <MessagesContainer>
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
          <Message key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <LoadingMessage>
            <LoadingDots>
              <span></span>
              <span></span>
              <span></span>
            </LoadingDots>
            Генерируется ответ...
          </LoadingMessage>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesList>
    </MessagesContainer>
  );
};
