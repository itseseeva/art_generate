import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import ElectricBorder from './ElectricBorder';
import { FiHeart, FiX as CloseIcon } from 'react-icons/fi';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { fetchPromptByImage } from '../utils/prompt';

const CardContainer = styled.div`
  background: rgba(22, 33, 62, 0.3); /* Очень прозрачный */
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: 0; /* Убираем padding чтобы фото занимало всю карточку */
  box-shadow: ${theme.colors.shadow.message};
  transition: ${theme.transition.fast};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 300px; /* Фиксированная высота карточки */
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
  }
`;

const PhotoBackground = styled.div<{ $imageUrl: string; $clickable?: boolean }>`
  width: 100%;
  height: 100%;
  background-image: url(${props => props.$imageUrl});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: ${props => props.$clickable !== false ? 'pointer' : 'default'};
`;

const ActionButtons = styled.div`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  opacity: 0; /* Возвращаем к нормальному состоянию */
  transform: translateY(-10px); /* Возвращаем анимацию */
  transition: all ${theme.transition.fast};
  pointer-events: auto; /* Включаем клики для кнопок */
  z-index: 10; /* Поверх всех элементов */
  
  ${CardContainer}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
`;

const FavoriteButton = styled.button<{ $isFavorite: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$isFavorite ? 'rgba(255, 107, 107, 0.9)' : 'rgba(0, 0, 0, 0.5)'};
  border: 2px solid ${props => props.$isFavorite ? 'rgba(255, 107, 107, 1)' : 'rgba(255, 255, 255, 0.3)'};
  color: ${props => props.$isFavorite ? '#ffffff' : 'rgba(255, 255, 255, 0.8)'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  z-index: 11;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  outline: none !important;
  box-shadow: none;
  
  &:hover {
    transform: scale(1.1);
    background: ${props => props.$isFavorite ? 'rgba(255, 107, 107, 1)' : 'rgba(0, 0, 0, 0.7)'};
    border-color: ${props => props.$isFavorite ? 'rgba(255, 107, 107, 1)' : 'rgba(255, 255, 255, 0.5)'};
    box-shadow: 0 4px 12px ${props => props.$isFavorite ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 255, 255, 0.2)'};
  }
  
  &:active {
    transform: scale(0.95);
    outline: none !important;
    box-shadow: none;
  }
  
  &:focus {
    outline: none !important;
    box-shadow: none;
  }
  
  &:focus-visible {
    outline: none !important;
    box-shadow: none;
  }
  
  svg {
    width: 20px;
    height: 20px;
    fill: ${props => props.$isFavorite ? '#ff6b6b' : 'none'};
    stroke: ${props => props.$isFavorite ? '#ff6b6b' : 'rgba(255, 255, 255, 0.8)'};
    stroke-width: 2;
    transition: all ${theme.transition.fast};
  }
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 80px;
  z-index: 11;
  position: relative;
  
  /* Градиентный текст */
  background: linear-gradient(135deg, #a8a8a8, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    
    /* Более яркий градиент при hover */
    background: linear-gradient(135deg, #ffffff, rgba(102, 126, 234, 0.9));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    /* Показываем светящуюся линию */
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const AlbumButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.8);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 80px;
  z-index: 11;
  position: relative;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  &:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%) translateX(100%);
  background: ${theme.colors.background.primary};
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: ${theme.transition.fast};
  z-index: 1000;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.message};
  
  &::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid ${theme.colors.background.primary};
  }
`;

const ActionButtonWithTooltip = styled.div`
  position: relative;
  
  &:hover ${Tooltip} {
    opacity: 1;
  }
`;

const ContentOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: ${theme.spacing.md};
  z-index: 2;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const SlideShowContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const SlideImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  
  &.active {
    opacity: 1;
  }
`;

const SlideDots = styled.div`
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 3;
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: background 0.3s ease;
  
  &.active {
    background: rgba(255, 255, 255, 0.9);
  }
`;

const CharacterAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${theme.colors.gradients.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.sm};
  position: relative;
  overflow: hidden;
  font-size: ${theme.fontSize.xl};
  font-weight: bold;
  color: white;
`;

const CharacterName = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: white;
  margin-bottom: ${theme.spacing.xs};
  line-height: 1.3;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`;

const CharacterDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  margin-bottom: ${theme.spacing.sm};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.xs};
  margin-bottom: ${theme.spacing.xs};
`;

const Tag = styled.span`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 2px 6px;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSize.xs};
  backdrop-filter: blur(5px);
`;

const StatsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  color: rgba(255, 255, 255, 0.9);
  font-size: ${theme.fontSize.xs};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

const ShowPromptButton = styled.button`
  position: absolute;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 500;
  z-index: 12;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  transform: translateY(10px);
  
  ${CardContainer}:hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  &:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: ${theme.spacing.xl};
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
`;

const ModalImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 70%;
`;

const ModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
`;

const PromptPanelHeader = styled.div`
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
`;

const PromptPanelTitle = styled.h3`
  color: rgba(240, 240, 240, 1);
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
  background: rgba(40, 40, 40, 0.5);
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  font-family: 'Courier New', monospace;
  flex: 1;
`;

const PromptLoading = styled.div`
  color: rgba(200, 200, 200, 1);
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

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  transition: ${theme.transition.fast};
  z-index: 10001;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: ${theme.colors.accent.primary};
    transform: scale(1.1);
  }
`;

const StatIcon = styled.span`
  font-size: ${theme.fontSize.sm};
  color: white;
`;

const Author = styled.div`
  font-size: ${theme.fontSize.xs};
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: ${theme.spacing.xs};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[]; // Массив фотографий для слайд-шоу
  tags: string[];
  author: string;
  likes: number;
  views: number;
  comments: number;
}

interface CharacterCardProps {
  character: Character;
  onClick: (character: Character) => void;
  isAuthenticated?: boolean;
  showEditButton?: boolean;
  onEdit?: (character: Character) => void;
  onDelete?: (character: Character) => void;
  onAddPhoto?: (character: Character) => void; // New prop for adding photos
  onPhotoGeneration?: (character: Character) => void; // Генерация фото
  onPaidAlbum?: (character: Character) => void; // Платный альбом
  showPromptButton?: boolean; // Показывать кнопку "Show Prompt" только на главной странице
}

// Компонент слайд-шоу
const SlideShow: React.FC<{ 
  photos: string[]; 
  characterName: string; 
  onPhotoClick?: (photoUrl: string) => void;
  onCurrentPhotoChange?: (photoUrl: string) => void;
}> = ({ photos, characterName, onPhotoClick, onCurrentPhotoChange }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % photos.length);
    }, 3000); // Меняем слайд каждые 3 секунды

    return () => clearInterval(interval);
  }, [photos.length]);

  // Уведомляем родителя об изменении текущего фото
  useEffect(() => {
    if (photos && photos.length > 0 && onCurrentPhotoChange) {
      onCurrentPhotoChange(photos[currentSlide]);
    }
  }, [currentSlide, photos, onCurrentPhotoChange]);

  if (!photos || photos.length === 0) {
    return (
      <PhotoBackground $imageUrl="" $clickable={false} />
    );
  }

  return (
    <>
      <PhotoBackground 
        $imageUrl={photos[currentSlide]} 
        $clickable={!!onPhotoClick}
        onClick={() => onPhotoClick?.(photos[currentSlide])}
      />
      {photos.length > 1 && (
        <SlideDots>
          {photos.map((_, index) => (
            <Dot
              key={index}
              className={index === currentSlide ? 'active' : ''}
            />
          ))}
        </SlideDots>
      )}
    </>
  );
};
export const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  onClick, 
  showEditButton = false, 
  onEdit, 
  onDelete,
  onAddPhoto, // New prop
  onPhotoGeneration,
  onPaidAlbum,
  showPromptButton = false // По умолчанию не показываем кнопку
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    character.photos && character.photos.length > 0 ? character.photos[0] : null
  );

  // Загружаем состояние избранного из API при монтировании
  useEffect(() => {
    const checkFavorite = async () => {
      const token = authManager.getToken();
      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        // Преобразуем character.id в number
        let characterId: number;
        if (typeof character.id === 'number') {
          characterId = character.id;
        } else if (typeof character.id === 'string') {
          characterId = parseInt(character.id, 10);
          if (isNaN(characterId)) {
            // Если не удалось преобразовать, пробуем найти персонажа по имени
            setIsChecking(false);
            return;
          }
        } else {
          setIsChecking(false);
          return;
        }

        const response = await authManager.fetchWithAuth(API_CONFIG.CHECK_FAVORITE(characterId));
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(data.is_favorite || false);
        }
      } catch (error) {
        console.error('Error checking favorite:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkFavorite();
  }, [character.id]);

  // Функция для переключения избранного
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const token = authManager.getToken();
    if (!token) {
      // Если не авторизован, можно показать сообщение или открыть модалку авторизации
      return;
    }

    try {
      // Преобразуем character.id в number
      let characterId: number;
      if (typeof character.id === 'number') {
        characterId = character.id;
      } else if (typeof character.id === 'string') {
        characterId = parseInt(character.id, 10);
        if (isNaN(characterId)) {
          console.error('Invalid character ID:', character.id);
          return;
        }
      } else {
        console.error('Invalid character ID type:', character.id);
        return;
      }

      if (isFavorite) {
        // Удаляем из избранного
        const response = await authManager.fetchWithAuth(
          API_CONFIG.REMOVE_FAVORITE(characterId),
          { method: 'DELETE' }
        );
        if (response.ok) {
          setIsFavorite(false);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error removing from favorites:', errorData);
        }
      } else {
        // Добавляем в избранное
        const response = await authManager.fetchWithAuth(
          API_CONFIG.ADD_FAVORITE(characterId),
          { method: 'POST' }
        );
        if (response.ok) {
          setIsFavorite(true);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error adding to favorites:', errorData);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const handleOpenPhoto = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setSelectedPhoto(imageUrl);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(imageUrl);
      if (prompt) {
        setSelectedPrompt(prompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPhoto) {
        setSelectedPhoto(null);
        setSelectedPrompt(null);
        setPromptError(null);
        setIsLoadingPrompt(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPhoto]);

  const modalContent = selectedPhoto ? (
    <ModalOverlay onClick={() => {
      setSelectedPhoto(null);
      setSelectedPrompt(null);
      setPromptError(null);
      setIsLoadingPrompt(false);
    }}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={() => {
          setSelectedPhoto(null);
          setSelectedPrompt(null);
          setPromptError(null);
          setIsLoadingPrompt(false);
        }}>
          <CloseIcon />
        </CloseButton>
        <ModalImageContainer>
          <ModalImage src={selectedPhoto} alt="Full size" />
        </ModalImageContainer>
        <PromptPanel>
          <PromptPanelHeader>
            <PromptPanelTitle>Промпт для изображения</PromptPanelTitle>
          </PromptPanelHeader>
          {isLoadingPrompt ? (
            <PromptLoading>Загрузка промпта...</PromptLoading>
          ) : promptError ? (
            <PromptError>{promptError}</PromptError>
          ) : selectedPrompt ? (
            <PromptPanelText>{selectedPrompt}</PromptPanelText>
          ) : null}
        </PromptPanel>
      </ModalContent>
    </ModalOverlay>
  ) : null;

  return (
    <>
      <ElectricBorder
        color="#555555"
        speed={1}
        chaos={0.3}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <CardContainer>
          <SlideShow 
            photos={character.photos || []} 
            characterName={character.name}
            onPhotoClick={!showPromptButton ? (photoUrl) => {
              const fakeEvent = { stopPropagation: () => {} } as React.MouseEvent;
              handleOpenPhoto(fakeEvent, photoUrl);
            } : undefined}
            onCurrentPhotoChange={(photoUrl) => {
              setCurrentPhotoUrl(photoUrl);
            }}
          />
          
          {!isChecking && (
            <FavoriteButton 
              $isFavorite={isFavorite}
              onClick={toggleFavorite}
              aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <FiHeart />
            </FavoriteButton>
          )}
          
          <ActionButtons>
            {onPaidAlbum && (
              <ActionButtonWithTooltip>
                <AlbumButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaidAlbum(character);
                  }}
                >
                  Альбом
                </AlbumButton>
                <Tooltip>Платный альбом (200 💎)</Tooltip>
              </ActionButtonWithTooltip>
            )}
          </ActionButtons>
          
          <ContentOverlay>
            <CharacterName>{character.name}</CharacterName>
            {showPromptButton && character.photos && character.photos.length > 0 && (
              <ShowPromptButton
                onClick={(e) => {
                  e.stopPropagation();
                  // Используем текущее фото из слайдшоу, если оно есть, иначе первое фото
                  const photoToShow = currentPhotoUrl || character.photos[0];
                  handleOpenPhoto(e, photoToShow);
                }}
              >
                Show Prompt
              </ShowPromptButton>
            )}
          </ContentOverlay>
          <div 
            onClick={() => onClick(character)}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
        </CardContainer>
      </ElectricBorder>
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
