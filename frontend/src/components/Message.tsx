import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiX, FiImage, FiFolder } from 'react-icons/fi';

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

const ImageContainer = styled.div`
  position: relative;
  margin-top: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const MessageImage = styled.img`
  max-width: 100%;
  display: block;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.colors.shadow.message};
`;

const ImageButtons = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm};
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${ImageContainer}:hover & {
    opacity: 1;
  }
`;

const ImageButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(60, 60, 60, 0.9);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(80, 80, 80, 0.95);
    border-color: rgba(180, 180, 180, 0.5);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

const FullscreenOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.xl};
`;

const FullscreenImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.xl};
  right: ${theme.spacing.xl};
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 60, 60, 0.9);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.full};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xl};
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(80, 80, 80, 0.95);
    border-color: rgba(180, 180, 180, 0.5);
    transform: scale(1.1);
  }
`;

interface MessageProps {
  message: {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    imageUrl?: string;
  };
  characterName?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
}

export const Message: React.FC<MessageProps> = ({ 
  message, 
  characterName,
  isAuthenticated,
  isCharacterOwner,
  onAddToGallery,
  onAddToPaidAlbum
}) => {
  const isUser = message.type === 'user';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAddingToGallery, setIsAddingToGallery] = useState(false);
  const [isAddingToPaidAlbum, setIsAddingToPaidAlbum] = useState(false);
  const [isAddedToGallery, setIsAddedToGallery] = useState(false);
  
  const timeString = message.timestamp.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleImageClick = () => {
    if (message.imageUrl) {
      setIsFullscreen(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleAddToGalleryClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.imageUrl || !characterName || !onAddToGallery || !isAuthenticated) {
      return;
    }

    setIsAddingToGallery(true);
    try {
      await onAddToGallery(message.imageUrl, characterName);
      setIsAddedToGallery(true);
    } catch (error) {
      console.error('Ошибка при добавлении в галерею:', error);
      alert(error instanceof Error ? error.message : 'Не удалось добавить фото в галерею');
    } finally {
      setIsAddingToGallery(false);
    }
  };

  const handleAddToPaidAlbumClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.imageUrl || !characterName || !onAddToPaidAlbum || !isAuthenticated) {
      return;
    }

    setIsAddingToPaidAlbum(true);
    try {
      await onAddToPaidAlbum(message.imageUrl, characterName);
    } catch (error) {
      console.error('Ошибка при добавлении в платный альбом:', error);
      alert(error instanceof Error ? error.message : 'Не удалось добавить фото в платный альбом');
    } finally {
      setIsAddingToPaidAlbum(false);
    }
  };

  return (
    <>
      <MessageContainer $isUser={isUser}>
        {!isUser && (
          <Avatar $isUser={false}>
            AI
          </Avatar>
        )}
        
        <MessageContent $isUser={isUser}>
          <MessageText>{message.content}</MessageText>
          
          {message.imageUrl && (
            <ImageContainer onClick={handleImageClick}>
              <MessageImage 
                src={message.imageUrl} 
                alt="Generated image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {isAuthenticated && characterName && (
                <ImageButtons>
                  {onAddToGallery && !isAddedToGallery && (
                    <ImageButton
                      onClick={handleAddToGalleryClick}
                      disabled={isAddingToGallery}
                      title="Добавить в галерею"
                    >
                      <FiImage size={16} />
                      {isAddingToGallery ? 'Добавление...' : 'В галерею'}
                    </ImageButton>
                  )}
                  {onAddToPaidAlbum && isCharacterOwner && (
                    <ImageButton
                      onClick={handleAddToPaidAlbumClick}
                      disabled={isAddingToPaidAlbum}
                      title="Добавить в платный альбом"
                    >
                      <FiFolder size={16} />
                      {isAddingToPaidAlbum ? 'Добавление...' : 'В альбом'}
                    </ImageButton>
                  )}
                </ImageButtons>
              )}
            </ImageContainer>
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

      {isFullscreen && message.imageUrl && (
        <FullscreenOverlay onClick={handleCloseFullscreen}>
          <CloseButton onClick={handleCloseFullscreen}>
            <FiX />
          </CloseButton>
          <FullscreenImage 
            src={message.imageUrl} 
            alt="Fullscreen image"
            onClick={(e) => e.stopPropagation()}
          />
        </FullscreenOverlay>
      )}
    </>
  );
};
