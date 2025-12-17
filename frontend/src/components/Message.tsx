import React, { useState, useEffect, useRef, memo } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiX, FiImage, FiFolder } from 'react-icons/fi';

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  position: relative;
`;

const MessageWithButtons = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  max-width: 75%;
  flex-shrink: 1;
`;

const MessageContent = styled.div<{ $isUser: boolean; $imageOnly?: boolean }>`
  max-width: ${props => props.$imageOnly ? 'none' : '100%'};
  padding: ${props => props.$imageOnly ? '0 !important' : theme.spacing.lg};
  border-radius: ${props => props.$imageOnly 
    ? '0' 
    : props.$isUser 
    ? `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm} ${theme.borderRadius.xl}`
    : `${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.xl} ${theme.borderRadius.sm}`
  };
  background: ${props => props.$imageOnly 
    ? 'transparent !important' 
    : props.$isUser 
    ? 'rgba(50, 50, 50, 0.6)' 
    : 'rgba(30, 30, 30, 0.6)'
  };
  backdrop-filter: ${props => props.$imageOnly ? 'none' : 'blur(15px)'};
  -webkit-backdrop-filter: ${props => props.$imageOnly ? 'none' : 'blur(15px)'};
  color: rgba(240, 240, 240, 1);
  border: ${props => props.$imageOnly 
    ? 'none !important' 
    : `1px solid ${props.$isUser 
    ? 'rgba(60, 60, 60, 0.5)' 
    : 'rgba(40, 40, 40, 0.5)'
    }`
  };
  box-shadow: ${props => props.$imageOnly 
    ? 'none !important' 
    : '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  };
  position: relative;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.7;
  transition: all 0.3s ease;
  
  &:hover {
    ${props => !props.$imageOnly && `
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      border-color: ${props.$isUser 
        ? 'rgba(70, 70, 70, 0.7)' 
        : 'rgba(50, 50, 50, 0.7)'
      };
    `}
  }
`;

const MessageText = styled.div`
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  margin-bottom: ${theme.spacing.md};
  position: relative;
  flex: 1;
`;

const ImageContainer = styled.div`
  position: relative;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease;
  background: transparent !important;
  border: none !important;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const MessageImage = styled.img`
  max-width: 600px;
  max-height: 600px;
  width: auto;
  height: auto;
  display: block !important;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
  object-fit: contain;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.8);
  }
`;

const ImageButtons = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  
  ${ImageContainer}:hover & {
    opacity: 1;
  }
`;

const ImageButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(60, 60, 60, 0.9);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.sm};
  color: rgba(240, 240, 240, 1);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  min-height: 28px;
  
  &:hover {
    background: rgba(80, 80, 80, 0.95);
    border-color: rgba(180, 180, 180, 0.5);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const MessageTime = styled.div<{ $isUser: boolean }>`
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  margin-top: ${theme.spacing.sm};
  text-align: ${props => props.$isUser ? 'right' : 'left'};
`;

const Avatar = styled.div<{ $isUser: boolean; $avatarUrl?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    if (props.$avatarUrl) {
      return 'transparent';
    }
    return props.$isUser 
    ? 'rgba(60, 60, 60, 0.8)' 
      : 'rgba(40, 40, 40, 0.8)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${theme.fontSize.lg};
  color: rgba(240, 240, 240, 1);
  border: 1px solid ${props => props.$isUser 
    ? 'rgba(70, 70, 70, 0.6)' 
    : 'rgba(50, 50, 50, 0.6)'
  };
  flex-shrink: 0;
  overflow: hidden;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${theme.borderRadius.full};
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
    generationTime?: number; // Время генерации изображения в секундах
  };
  characterName?: string;
  characterAvatar?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
}

const MessageComponent: React.FC<MessageProps> = ({ 
  message, 
  characterName,
  characterAvatar,
  isAuthenticated,
  isCharacterOwner,
  onAddToGallery,
  onAddToPaidAlbum
}) => {
  const isUser = message.type === 'user';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAddingToPaidAlbum, setIsAddingToPaidAlbum] = useState(false);
  
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

  // Обработка клавиши Escape для закрытия полноэкранного изображения
  useEffect(() => {
    if (!isFullscreen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseFullscreen();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  const [isAddedToPaidAlbum, setIsAddedToPaidAlbum] = useState(false);

  const handleAddToPaidAlbumClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.imageUrl || !characterName || !onAddToPaidAlbum || !isAuthenticated) {
      return;
    }

    setIsAddingToPaidAlbum(true);
    try {
      await onAddToPaidAlbum(message.imageUrl, characterName);
      setIsAddedToPaidAlbum(true);
      console.log('[MESSAGE] Фото добавлено в платный альбом, кнопка скрыта');
    } catch (error) {
      console.error('Ошибка при добавлении в платный альбом:', error);
      alert(error instanceof Error ? error.message : 'Не удалось добавить фото в платный альбом');
    } finally {
      setIsAddingToPaidAlbum(false);
    }
  };

  // Для фото без текста - чистое отображение (v2)
  // Проверяем, что content пустой или содержит только пробелы
  const hasOnlyImage = message.imageUrl && (!message.content || message.content.trim() === '');
  if (hasOnlyImage) {
    return (
      <>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        marginBottom: '0.5rem',
        width: '100%',
        gap: '1rem'
      }}>
        {/* Аватар ассистента слева */}
        {!isUser && (
          <Avatar $isUser={false} $avatarUrl={characterAvatar}>
            {characterAvatar ? (
              <AvatarImage src={characterAvatar} alt={characterName || 'Character'} />
            ) : (
              'AI'
            )}
          </Avatar>
        )}
        
        <div style={{
          position: 'relative',
          background: 'transparent',
          padding: 0,
          border: 'none',
          boxShadow: 'none'
        }}>
        <div 
          style={{
            position: 'relative',
            margin: 0,
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => {
            const buttons = e.currentTarget.querySelector('.image-buttons-overlay') as HTMLElement;
            if (buttons) buttons.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            const buttons = e.currentTarget.querySelector('.image-buttons-overlay') as HTMLElement;
            if (buttons) buttons.style.opacity = '0';
          }}
        >
          <img
            src={message.imageUrl}
            alt="Generated image"
            onClick={handleImageClick}
            style={{
              maxWidth: '600px',
              maxHeight: '600px',
              width: 'auto',
              height: 'auto',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
              display: 'block',
              margin: 0,
              padding: 0,
              background: 'transparent',
              border: 'none',
              objectFit: 'contain',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {message.generationTime !== undefined && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              pointerEvents: 'none',
              zIndex: 10,
              backdropFilter: 'blur(4px)'
            }}>
              ⏱ {message.generationTime < 60 
                ? `${Math.round(message.generationTime)}с` 
                : `${Math.round(message.generationTime / 60)}м ${Math.round(message.generationTime % 60)}с`}
            </div>
          )}
          {isAuthenticated && characterName && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="image-buttons-overlay"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                gap: '4px',
                padding: '6px',
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.5), transparent)',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'auto'
              }}
            >
                {onAddToPaidAlbum && !isAddedToPaidAlbum && (
                  <ImageButton
                    onClick={handleAddToPaidAlbumClick}
                    disabled={isAddingToPaidAlbum}
                    title="Добавить в платный альбом"
                  >
                    <FiFolder size={12} />
                    {isAddingToPaidAlbum ? 'Добавление...' : 'В альбом'}
                  </ImageButton>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
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
  }
  
  // Обычное сообщение с текстом
  return (
    <>
      <MessageContainer $isUser={isUser}>
        {/* Аватар модели слева */}
        {!isUser && (
          <Avatar $isUser={false} $avatarUrl={characterAvatar}>
            {characterAvatar ? (
              <AvatarImage src={characterAvatar} alt={characterName || 'Character'} />
            ) : (
              'AI'
            )}
          </Avatar>
        )}
        
        <MessageContent 
          $isUser={isUser} 
          $imageOnly={false}
        >
          {message.content && (
            <MessageText>
              {message.content}
            </MessageText>
          )}
          
          {message.imageUrl && (
            <ImageContainer 
              onClick={handleImageClick}
              style={{
                margin: '0',
                padding: '0',
                background: 'transparent',
                border: 'none'
              }}
            >
              <MessageImage 
                src={message.imageUrl} 
                alt="Generated image"
                onClick={handleImageClick}
                style={{
                  maxWidth: '600px',
                  maxHeight: '600px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                  display: 'block',
                  margin: '0',
                  padding: '0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {isAuthenticated && characterName && (
                <ImageButtons onClick={(e) => e.stopPropagation()}>
                  {onAddToPaidAlbum && !isAddedToPaidAlbum && (
                    <ImageButton
                      onClick={handleAddToPaidAlbumClick}
                      disabled={isAddingToPaidAlbum}
                      title="Добавить в платный альбом"
                    >
                      <FiFolder size={12} />
                      {isAddingToPaidAlbum ? 'Добавление...' : 'В альбом'}
                    </ImageButton>
                  )}
                </ImageButtons>
              )}
            </ImageContainer>
          )}
          
          {/* Время не показываем если только фото без текста */}
          {(message.content || !message.imageUrl) && (
          <MessageTime $isUser={isUser}>
            {timeString}
          </MessageTime>
          )}
        </MessageContent>
        
        {/* Аватар пользователя справа */}
        {isUser && (message.content || !message.imageUrl) && (
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

// Мемоизируем компонент для предотвращения лишних перерендеров
export const Message = memo(MessageComponent);
