import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { Message } from './Message';
import { CharacterInfoBlock } from './CharacterInfoBlock';

// --- Обновленный стиль контейнера ---
const MessagesContainer = styled.div`
  flex: 1;
  padding: ${theme.spacing.xl} ${theme.spacing.lg};
  overflow-y: auto;
  overflow-x: hidden;
  /* Фон теперь задается через DarkVeil в BackgroundWrapper */
  background: transparent;
  position: relative;
  min-height: 0;
  min-width: 0;
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
  min-width: 0;
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

// --- Обновленная карточка ситуации ---
const RoleSituationCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  margin: ${theme.spacing.xl} auto 0 auto;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.8) 0%, rgba(20, 20, 20, 0.9) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(236, 72, 153, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(236, 72, 153, 0.1), 0 0 15px rgba(236, 72, 153, 0.05);
  color: rgba(200, 200, 200, 1);
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
  width: 100%;
  
  h3 {
    font-size: ${theme.fontSize.xl};
    margin: 0 0 ${theme.spacing.md} 0;
    color: #ec4899;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  p {
    font-size: ${theme.fontSize.base};
    line-height: 1.7;
    color: rgba(220, 220, 220, 0.9);
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
  voiceUrl?: string;
  userAvatar?: string;
  userUsername?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  isAdmin?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
  onSendMessage?: (message: string) => void;
  userInfo?: {
    subscription?: {
      subscription_type?: string;
    };
    subscription_type?: string;
  } | null;
  onShop?: () => void;
  selectedVoiceId?: string | null;
  selectedVoiceUrl?: string | null;
  onSelectVoice?: (voiceId: string | null, voiceUrl: string | null) => void;
  onOutOfLimits?: (type: 'messages' | 'photos' | 'voice') => void;
  character?: any;
  [key: string]: any;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  characterSituation,
  characterName,
  characterAvatar,
  voiceUrl,
  userAvatar,
  userUsername,
  userEmail,
  isAuthenticated,
  isCharacterOwner,
  isAdmin,
  onAddToGallery,
  onAddToPaidAlbum,
  onSendMessage,
  userInfo,
  onShop,
  selectedVoiceId,
  selectedVoiceUrl,
  onSelectVoice,
  onOutOfLimits,
  character,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const wasScrolledToBottomRef = useRef(true);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = 100;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < threshold;
      wasScrolledToBottomRef.current = isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;
    wasScrolledToBottomRef.current = scrollHeight - scrollTop - clientHeight < threshold;
  }, [messages]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container && messagesEndRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const threshold = 150;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < threshold;

        if (wasScrolledToBottomRef.current && isAtBottom && messages.length > 0) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, minWidth: 0 }}>
      <MessagesContainer ref={messagesContainerRef} style={{ position: 'relative', zIndex: 10, minWidth: 0 }}>
        <MessagesList style={{ position: 'relative', zIndex: 11 }}>
          {characterSituation && (
            <RoleSituationCard>
              <h3>Ролевая ситуация</h3>
              <p>{characterSituation}</p>
            </RoleSituationCard>
          )}

          {character && (
            <CharacterInfoBlock character={character} />
          )}

          {messages && messages.length > 0 && messages.map((message, index) => {
            return (
              <Message
                key={message.id}
                message={message}
                characterName={characterName}
                characterAvatar={characterAvatar}
                voiceUrl={voiceUrl}
                userAvatar={userAvatar}
                userUsername={userUsername}
                userEmail={userEmail}
                isAuthenticated={isAuthenticated}
                isCharacterOwner={isCharacterOwner}
                isAdmin={isAdmin}
                onAddToGallery={onAddToGallery}
                onAddToPaidAlbum={onAddToPaidAlbum}
                isTyping={isLoading && index === messages.length - 1 && (message.type === 'assistant' || (message as any).role === 'assistant')}
                userInfo={userInfo}
                onShop={onShop}
                selectedVoiceId={selectedVoiceId}
                selectedVoiceUrl={selectedVoiceUrl}
                onSelectVoice={onSelectVoice}
                onOutOfLimits={onOutOfLimits}
              />
            );
          })}

          <div ref={messagesEndRef} />
        </MessagesList>
      </MessagesContainer>
    </div>
  );
};