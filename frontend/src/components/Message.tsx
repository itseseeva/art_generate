import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiX, FiImage, FiFolder } from 'react-icons/fi';
import { Plus } from 'lucide-react';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import { CircularProgress } from './ui/CircularProgress';
import { useIsMobile } from '../hooks/useIsMobile';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
  position: relative;
  z-index: 1;
  width: 100%;
`;

const MessageWithButtons = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
  max-width: 75%;
  flex-shrink: 1;

  @media (max-width: 768px) {
    max-width: 85%;
  }
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

  @media (max-width: 768px) {
    padding: ${props => props.$imageOnly ? '0 !important' : '10px 14px'};
    line-height: 1.5;
    font-size: 0.95rem;
  }
  
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

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 400px;
  }
  
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
  gap: 0.5rem;
  padding: 0.5rem;
  justify-content: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: auto;
  
  ${ImageContainer}:hover & {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    opacity: 1;
  }
`;

const ImageButton = styled.button`
  padding: 0.375rem 0.75rem;
  background: rgba(100, 100, 100, 0.9);
  border: 1px solid rgba(150, 150, 150, 1);
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover:not(:disabled) {
    background: rgba(120, 120, 120, 1);
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 14px;
    height: 14px;
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

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: ${theme.fontSize.base};
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${theme.borderRadius.full};
`;

// Удалены FullscreenOverlay и FullscreenImage, теперь используем ModalOverlay и ModalImage

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
  z-index: 10001;
  
  &:hover {
    background: rgba(80, 80, 80, 0.95);
    border-color: rgba(180, 180, 180, 0.5);
    transform: scale(1.1);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: ${theme.spacing.xl};
`;

const ErrorModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100001;
  padding: ${theme.spacing.xl};
`;

const ErrorModalContent = styled.div`
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const ErrorModalTitle = styled.h2`
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
`;

const ErrorModalMessage = styled.div`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorModalCloseButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
  }
`;

const ModalContent = styled.div`
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: ${theme.spacing.xl};
  width: 100%;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    background: #000;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    border-radius: 0;
    overflow: hidden;
  }
`;

const ModalImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 70%;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    flex: 1;
    min-height: 0;
  }
`;

const ModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    max-height: 100%;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
`;

const PromptPanel = styled.div`
  width: 400px;
  min-width: 350px;
  max-width: 30%;
  background: rgba(30, 30, 30, 0.95);
  border: 2px solid rgba(150, 150, 150, 0.5);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    max-height: 30vh;
    background: rgba(20, 20, 20, 0.95);
    border: none;
    border-bottom: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 0;
    padding: ${theme.spacing.md};
    z-index: 10;
    flex-shrink: 0;
  }
`;

const PromptPanelHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: #fbbf24;
  font-size: ${theme.fontSize.xl};
  font-weight: 800;
  margin: 0;
`;

const PromptPanelText = styled.div`
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.sm};
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: ${theme.spacing.md};
  flex: 1;
  overflow-y: auto;
`;

const PromptLoading = styled.div`
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptError = styled.div`
  color: ${theme.colors.error || '#ff6b6b'};
  font-size: ${theme.fontSize.sm};
  text-align: center;
  padding: ${theme.spacing.xl};
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
  userAvatar?: string;
  userUsername?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  isCharacterOwner?: boolean;
  onAddToGallery?: (imageUrl: string, characterName: string) => Promise<void>;
  onAddToPaidAlbum?: (imageUrl: string, characterName: string) => Promise<void>;
}

const MessageComponent: React.FC<MessageProps> = ({ 
  message, 
  characterName,
  characterAvatar,
  userAvatar,
  userUsername,
  userEmail,
  isAuthenticated,
  isCharacterOwner,
  onAddToGallery,
  onAddToPaidAlbum
}) => {
  // Функция для получения первой буквы из username или email
  const getUserInitial = (): string => {
    if (userUsername) {
      return userUsername.charAt(0).toUpperCase();
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };
  const isUser = message.type === 'user';
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [isAddingToPaidAlbum, setIsAddingToPaidAlbum] = useState(false);
  const [isAddingToGallery, setIsAddingToGallery] = useState(false);
  const [isAddedToGallery, setIsAddedToGallery] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  
  const timeString = message.timestamp.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Безопасная проверка imageUrl - должна быть выполнена до использования
  const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
  
  // Проверяем, является ли сообщение прогрессом генерации
  const isGenerationProgress = message.content && /^\d+%$/.test(message.content.trim()) && !hasValidImageUrl;
  const progressMatch = isGenerationProgress ? message.content.match(/(\d+)%/) : null;
  const progressValue = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  const handleImageClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (message.imageUrl) {
      
      setIsFullscreen(true);
      setIsPromptVisible(true);
      setSelectedPrompt(null);
      setPromptError(null);
      setIsLoadingPrompt(true);

      try {
        const { prompt, errorMessage } = await fetchPromptByImage(message.imageUrl);
        
        if (prompt) {
          // Переводим промпт на русский для отображения
          const translatedPrompt = await translateToRussian(prompt);
          setSelectedPrompt(translatedPrompt);
        } else {
          setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
        }
      } catch (error) {
        
        setPromptError('Не удалось загрузить промпт');
      } finally {
        setIsLoadingPrompt(false);
      }
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(false);
  };

  // Обработка клавиши Escape для закрытия модального окна
  useEffect(() => {
    if (!isFullscreen && !errorModalMessage) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          handleCloseFullscreen();
        }
        if (errorModalMessage) {
          setErrorModalMessage(null);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen, errorModalMessage]);

  const [isAddedToPaidAlbum, setIsAddedToPaidAlbum] = useState(false);

  // Проверяем, добавлено ли фото уже в альбом при загрузке компонента
  useEffect(() => {
    const checkIfPhotoInAlbum = async () => {
      const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
      if (!hasValidImageUrl || !characterName || !isAuthenticated || !onAddToPaidAlbum) {
        return;
      }

      try {
        const token = authManager.getToken();
        if (!token) {
          return;
        }

        const encodedName = encodeURIComponent(characterName);
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/v1/paid-gallery/${encodedName}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const photos = data.images || [];
          const photoExists = photos.some((photo: any) => photo.url === message.imageUrl);
          if (photoExists) {
            setIsAddedToPaidAlbum(true);
          }
        }
      } catch (error) {
        // Игнорируем ошибки при проверке
      }
    };

    checkIfPhotoInAlbum();
  }, [message.imageUrl, characterName, isAuthenticated, onAddToPaidAlbum]);

  const handleAddToPaidAlbumClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
    if (!hasValidImageUrl || !characterName || !onAddToPaidAlbum || !isAuthenticated) {
      return;
    }

    setIsAddingToPaidAlbum(true);
    try {
      await onAddToPaidAlbum(message.imageUrl!, characterName);
      setIsAddedToPaidAlbum(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить фото в платный альбом';
      setErrorModalMessage(errorMessage);
    } finally {
      setIsAddingToPaidAlbum(false);
    }
  };

  const handleAddToGalleryClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasValidImageUrl = message.imageUrl && message.imageUrl.trim() !== '' && message.imageUrl !== 'null' && message.imageUrl !== 'undefined';
    if (!hasValidImageUrl || !characterName || !onAddToGallery || !isAuthenticated) {
      return;
    }

    setIsAddingToGallery(true);
    try {
      await onAddToGallery(message.imageUrl!, characterName);
      setIsAddedToGallery(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось добавить фото в альбом');
    } finally {
      setIsAddingToGallery(false);
    }
  };

  // Для прогресса генерации - отображаем БЕЗ MessageContent контейнера (прозрачный фон)
  // Убираем аватар при генерации фото
  if (isGenerationProgress && !hasValidImageUrl) {
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
        <CircularProgress progress={progressValue} size={60} showLabel={false} />
      </div>
      </>
    );
  }

  // Для фото без текста - чистое отображение (v2)
  // Проверяем, что content пустой или содержит только пробелы
  // Убираем аватар при генерации фото
  const hasOnlyImage = hasValidImageUrl && (!message.content || message.content.trim() === '');
  
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
        <div style={{
          position: 'relative',
          background: 'transparent',
          padding: 0,
          border: 'none',
          boxShadow: 'none'
        }}>
        <ImageContainer 
          onClick={hasValidImageUrl ? handleImageClick : undefined}
        >
          <MessageImage
            src={hasValidImageUrl ? message.imageUrl : undefined}
            alt="Generated image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {message.generationTime !== undefined && message.generationTime !== null && message.generationTime > 0 && (
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
          {isAuthenticated && characterName && onAddToPaidAlbum && !isAddedToPaidAlbum && (
            <ImageButtons onClick={(e) => e.stopPropagation()}>
              <ImageButton
                onClick={handleAddToPaidAlbumClick}
                disabled={isAddingToPaidAlbum}
                title="Добавить в альбом"
              >
                <Plus size={14} />
                {isAddingToPaidAlbum ? 'Добавление...' : 'В альбом'}
              </ImageButton>
            </ImageButtons>
          )}
        </ImageContainer>
        </div>
      </div>
      {isFullscreen && message.imageUrl && createPortal(
        <ModalOverlay onClick={handleCloseFullscreen}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={handleCloseFullscreen}>
            <FiX />
          </CloseButton>
            <ModalImageContainer>
              <ModalImage 
            src={message.imageUrl} 
            alt="Fullscreen image"
            onClick={(e) => e.stopPropagation()}
          />
            </ModalImageContainer>
            <PromptPanel style={{
              display: isPromptVisible ? 'flex' : 'none',
              visibility: isPromptVisible ? 'visible' : 'hidden'
            }}>
              <PromptPanelHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PromptPanelTitle>Промпт для изображения</PromptPanelTitle>
                  <button 
                    onClick={() => setIsPromptVisible(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Скрыть промпт"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </PromptPanelHeader>
              {isLoadingPrompt ? (
                <PromptLoading>Загрузка промпта...</PromptLoading>
              ) : promptError ? (
                <PromptError>{promptError}</PromptError>
              ) : selectedPrompt ? (
                <PromptPanelText>{selectedPrompt}</PromptPanelText>
              ) : (
                <PromptLoading>Промпт не найден</PromptLoading>
              )}
            </PromptPanel>
            {!isPromptVisible && (
              <button
                onClick={() => setIsPromptVisible(true)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  zIndex: 100002,
                  fontWeight: '600'
                }}
              >
                Показать промпт
              </button>
            )}
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}

      {errorModalMessage && createPortal(
        <ErrorModalOverlay onClick={() => setErrorModalMessage(null)}>
          <ErrorModalContent onClick={(e) => e.stopPropagation()}>
            <ErrorModalTitle>Ошибка</ErrorModalTitle>
            <ErrorModalMessage>{errorModalMessage}</ErrorModalMessage>
            <ErrorModalCloseButton onClick={() => setErrorModalMessage(null)}>
              Закрыть
            </ErrorModalCloseButton>
          </ErrorModalContent>
        </ErrorModalOverlay>,
        document.body
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
          {message.content && !isGenerationProgress && (
            <MessageText>
              {message.content}
            </MessageText>
          )}
          
          {hasValidImageUrl && (
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
                src={message.imageUrl!} 
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
            </ImageContainer>
          )}
          
          {/* Время не показываем если только фото без текста */}
          {(message.content || !hasValidImageUrl) && (
          <MessageTime $isUser={isUser}>
            {timeString}
          </MessageTime>
          )}
        </MessageContent>
        
        {/* Аватар пользователя справа */}
        {isUser && (message.content || !hasValidImageUrl) && (
          <Avatar $isUser={true} $avatarUrl={userAvatar}>
            {userAvatar ? (
              <AvatarImage src={userAvatar} alt="User" />
            ) : (
              getUserInitial()
            )}
          </Avatar>
        )}
      </MessageContainer>

      {isFullscreen && hasValidImageUrl && createPortal(
        <ModalOverlay onClick={handleCloseFullscreen}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={handleCloseFullscreen}>
            <FiX />
          </CloseButton>
            <ModalImageContainer>
              <ModalImage 
            src={message.imageUrl!} 
            alt="Fullscreen image"
            onClick={(e) => e.stopPropagation()}
          />
            </ModalImageContainer>
            <PromptPanel style={{
              display: isPromptVisible ? 'flex' : 'none',
              visibility: isPromptVisible ? 'visible' : 'hidden'
            }}>
              <PromptPanelHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PromptPanelTitle>Промпт для изображения</PromptPanelTitle>
                  <button 
                    onClick={() => setIsPromptVisible(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fbbf24',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Скрыть промпт"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </PromptPanelHeader>
              {isLoadingPrompt ? (
                <PromptLoading>Загрузка промпта...</PromptLoading>
              ) : promptError ? (
                <PromptError>{promptError}</PromptError>
              ) : selectedPrompt ? (
                <PromptPanelText>{selectedPrompt}</PromptPanelText>
              ) : (
                <PromptLoading>Промпт не найден</PromptLoading>
              )}
            </PromptPanel>
            {!isPromptVisible && (
              <button
                onClick={() => setIsPromptVisible(true)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: '1px solid rgba(251, 191, 36, 0.5)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  zIndex: 100002,
                  fontWeight: '600'
                }}
              >
                Показать промпт
              </button>
            )}
          </ModalContent>
        </ModalOverlay>,
        document.body
      )}

      {errorModalMessage && createPortal(
        <ErrorModalOverlay onClick={() => setErrorModalMessage(null)}>
          <ErrorModalContent onClick={(e) => e.stopPropagation()}>
            <ErrorModalTitle>Ошибка</ErrorModalTitle>
            <ErrorModalMessage>{errorModalMessage}</ErrorModalMessage>
            <ErrorModalCloseButton onClick={() => setErrorModalMessage(null)}>
              Закрыть
            </ErrorModalCloseButton>
          </ErrorModalContent>
        </ErrorModalOverlay>,
        document.body
      )}
    </>
  );
};

// Мемоизируем компонент для предотвращения лишних перерендеров
export const Message = memo(MessageComponent);
