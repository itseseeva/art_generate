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
  height: 100%;
  max-height: 100%;
  z-index: 1;
  display: flex !important;
  flex-direction: column;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: ${theme.spacing.md} ${theme.spacing.sm};
  }
  
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
  display: flex !important;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  min-height: min-content;
  width: 100%;
  position: relative;
  z-index: 11;
  flex: 1;
  visibility: visible !important;
  opacity: 1 !important;
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

const RoleSituationCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  margin: ${theme.spacing.xl} auto;
  background: linear-gradient(135deg, rgba(50, 50, 50, 0.4) 0%, rgba(40, 40, 40, 0.3) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.xl};
  border: 2px solid rgba(192, 192, 192, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(192, 192, 192, 0.4);
  color: rgba(200, 200, 200, 1);
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
  width: 100%;
  
  h3 {
    font-size: ${theme.fontSize.xl};
    margin: 0 0 ${theme.spacing.md} 0;
    color: rgba(240, 240, 240, 1);
    font-weight: 600;
    text-align: center;
  }
  
  p {
    font-size: ${theme.fontSize.base};
    line-height: 1.7;
    color: rgba(180, 180, 180, 0.9);
    white-space: pre-wrap;
    margin: 0;
    text-align: center;
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
  userAvatar?: string;
  userUsername?: string;
  userEmail?: string;
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
  userAvatar,
  userUsername,
  userEmail,
  isAuthenticated,
  isCharacterOwner,
  onAddToGallery,
  onAddToPaidAlbum,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasScrolledToBottomRef = useRef(true);

  // Отслеживаем позицию скролла и предотвращаем автоматическую прокрутку, если пользователь скроллит вверх
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = 100; // Порог в пикселях от низа
      const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
      wasScrolledToBottomRef.current = isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    // Проверяем начальную позицию
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Проверяем позицию перед изменением сообщений
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // Порог в пикселях от низа
    wasScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;
  }, [messages]);

  // Автоматическая прокрутка к последнему сообщению только если пользователь был внизу
  useEffect(() => {
    // Небольшая задержка, чтобы дать время на обновление DOM
    const timeoutId = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container && messagesEndRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const threshold = 150; // Увеличиваем порог для более надежной проверки
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < threshold;
        
        // Прокручиваем только если пользователь был внизу И сейчас тоже внизу (или очень близко)
        // И только если это не начальная загрузка (когда сообщений еще нет)
        if (wasScrolledToBottomRef.current && isAtBottom && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
      }
    }, 100); // Небольшая задержка для обновления DOM

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // КРИТИЧНО: Всегда рендерим контейнер, даже если сообщений нет

  return (
    <MessagesContainer ref={messagesContainerRef} style={{ position: 'relative', zIndex: 10 }}>
      <MessagesList style={{ position: 'relative', zIndex: 11 }}>
        {/* Ролевая ситуация всегда видна, если она есть */}
        {characterSituation && (
          <RoleSituationCard>
            <h3>Ролевая ситуация</h3>
            <p>{characterSituation}</p>
          </RoleSituationCard>
        )}
        
        {/* Пустое состояние только если нет сообщений и нет ролевой ситуации */}
        {messages.length === 0 && !isLoading && !characterSituation && (
          <EmptyState>
            <h3>Добро пожаловать в чат!</h3>
            <p>
              Выберите персонажа в боковой панели и начните общение. 
              Каждый персонаж имеет свой уникальный характер и стиль общения.
            </p>
          </EmptyState>
        )}
        
        {messages && messages.length > 0 && messages.map((message) => {
          return (
            <Message 
              key={message.id} 
              message={message}
              characterName={characterName}
              characterAvatar={characterAvatar}
              userAvatar={userAvatar}
              userUsername={userUsername}
              userEmail={userEmail}
              isAuthenticated={isAuthenticated}
              isCharacterOwner={isCharacterOwner}
              onAddToGallery={onAddToGallery}
              onAddToPaidAlbum={onAddToPaidAlbum}
            />
          );
        })}
        
        <div ref={messagesEndRef} />
      </MessagesList>
    </MessagesContainer>
  );
};
