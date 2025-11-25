import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const MessageContent = styled.div<{ $isUser: boolean }>`
  max-width: 70%;
  padding: ${theme.spacing.lg};
  border-radius: ${props => props.$isUser 
    ? `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm} ${theme.borderRadius.xl}`
    : `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm}`
  };
  background: ${props => props.$isUser 
    ? 'rgba(80, 80, 80, 0.8)' 
    : 'rgba(40, 40, 40, 0.5)'
  };
  color: rgba(240, 240, 240, 1);
  border: 1px solid ${props => props.$isUser 
    ? 'rgba(150, 150, 150, 0.5)' 
    : 'rgba(150, 150, 150, 0.3)'
  };
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: relative;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.6;
`;

const MessageText = styled.div`
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
`;

const MessageImage = styled.img`
  max-width: 100%;
  border-radius: ${theme.borderRadius.lg};
  margin-top: ${theme.spacing.md};
  box-shadow: ${theme.colors.shadow.message};
`;

const MessageTime = styled.div<{ $isUser: boolean }>`
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  margin-top: ${theme.spacing.sm};
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const Avatar = styled.div<{ $isUser: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => props.$isUser 
    ? 'rgba(80, 80, 80, 0.8)' 
    : 'rgba(60, 60, 60, 0.8)'
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${theme.fontSize.lg};
  color: rgba(240, 240, 240, 1);
  border: 2px solid ${props => props.$isUser 
    ? 'rgba(150, 150, 150, 0.5)' 
    : 'rgba(150, 150, 150, 0.3)'
  };
  flex-shrink: 0;
`;

interface MessageProps {
  message: {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string;
  };
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const timeString = message.timestamp.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <MessageContainer $isUser={isUser}>
      {!isUser && (
        <Avatar $isUser={false}>
          AI
        </Avatar>
      )}
      
      <MessageContent $isUser={isUser}>
        <MessageText>{message.content}</MessageText>
        
        {message.imageUrl && (
          <MessageImage 
            src={message.imageUrl} 
            alt="Generated image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        
        <MessageTime $isUser={isUser}>
          {timeString}
        </MessageTime>
      </MessageContent>
      
      {isUser && (
        <Avatar $isUser={true}>
          U
        </Avatar>
      )}
    </MessageContainer>
  );
};
