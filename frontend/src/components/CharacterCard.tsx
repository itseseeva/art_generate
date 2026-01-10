import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { theme } from '../theme';
import ElectricBorder from './ElectricBorder';
import { FiHeart, FiX as CloseIcon, FiTrash2, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToRussian } from '../utils/translate';
import Switcher4 from './Switcher4';
import { OptimizedImage } from './ui/OptimizedImage';

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
  height: 300px; /* Фиксированная высота карточки как на главной */
  width: 100%;
  min-width: 200px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
  }
`;

const PhotoContainer = styled.div<{ $clickable?: boolean }>`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: ${props => props.$clickable !== false ? 'pointer' : 'default'};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
`;

const ActionButtons = styled.div<{ $alwaysVisible?: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  align-items: flex-end;
  opacity: ${props => props.$alwaysVisible ? 1 : 0}; /* Видимы если $alwaysVisible=true */
  z-index: 20;
  transition: opacity 0.3s ease;
  
  ${CardContainer}:hover & {
    opacity: 1 !important; /* Показываем кнопки при наведении на карточку */
  }
  transform: ${props => props.$alwaysVisible ? 'translateY(0)' : 'translateY(-10px)'}; /* Возвращаем анимацию */
  transition: all ${theme.transition.fast};
  pointer-events: auto; /* Включаем клики для кнопок */
  z-index: 1000; /* Поверх всех элементов */
  
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
  background: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
  border: 2px solid ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 255, 255, 0.15)'};
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  z-index: 11;
  outline: none !important;
  box-shadow: ${props => props.$isFavorite ? '0 0 8px rgba(255, 59, 48, 0.3)' : 'none'};
  
  svg {
    fill: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'none'};
    stroke: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'rgba(255, 255, 255, 0.9)'};
    stroke-width: ${props => props.$isFavorite ? '2.5' : '2'};
    transition: all ${theme.transition.fast};
  }
  
  &:hover {
    transform: scale(1.1);
    background: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.5)' : 'rgba(0, 0, 0, 0.4)'};
    border-color: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.6)' : 'rgba(255, 255, 255, 0.3)'};
    box-shadow: ${props => props.$isFavorite ? '0 0 12px rgba(255, 59, 48, 0.5)' : '0 2px 8px rgba(255, 255, 255, 0.15)'};
    
    svg {
      fill: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 1)' : 'none'};
      stroke: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 1)' : 'rgba(255, 255, 255, 1)'};
    }
  }
  
  &:active {
    transform: scale(0.95);
    outline: none !important;
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
    fill: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'none'};
    stroke: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'rgba(255, 255, 255, 0.9)'};
    stroke-width: ${props => props.$isFavorite ? '2.5' : '2'};
    transition: all ${theme.transition.fast};
  }
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' }>`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 40px;
  min-height: 40px;
  z-index: 11;
  position: relative;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
    
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
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
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
  
  &:hover {
    transform: scale(1.05);
  background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const CharacterButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
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
  
  &:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const PersonalityModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.lg};
`;

const PersonalityModalContent = styled.div`
  background: ${theme.colors.background.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.glow};
`;

const PersonalityModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const PersonalityModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  margin: 0;
`;

const PersonalityModalCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.primary};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.md};
  transition: all ${theme.transition.fast};
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const PersonalityText = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const PersonalityLoading = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PersonalityError = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.fontSize.md};
  text-align: center;
  padding: ${theme.spacing.xl};
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
  z-index: 100;
  pointer-events: none;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  
  * {
    pointer-events: auto;
  }
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

const CardWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
`;

const RatingButton = styled.button<{ $isActive?: boolean; $isLike?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(0, 0, 0, 0.6);
  border: 1.5px solid ${props => props.$isActive ? (props.$isLike ? 'rgba(255, 193, 7, 0.8)' : 'rgba(244, 67, 54, 0.8)') : 'rgba(255, 255, 255, 0.2)'};
  border-radius: ${theme.borderRadius.sm};
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all ${theme.transition.fast};
  z-index: 1000;
  pointer-events: auto;
  min-width: 35px;
  flex-shrink: 0;
  position: relative;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: ${props => props.$isLike ? 'rgba(255, 193, 7, 1)' : 'rgba(244, 67, 54, 1)'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    width: 16px;
    height: 16px;
    color: ${props => props.$isActive ? (props.$isLike ? 'rgba(255, 193, 7, 1)' : 'rgba(244, 67, 54, 1)') : 'rgba(255, 255, 255, 0.9)'};
    fill: ${props => props.$isActive ? (props.$isLike ? 'rgba(255, 193, 7, 1)' : 'rgba(244, 67, 54, 1)') : 'none'};
    stroke: ${props => props.$isActive ? (props.$isLike ? 'rgba(255, 193, 7, 1)' : 'rgba(244, 67, 54, 1)') : 'rgba(255, 255, 255, 0.9)'};
    stroke-width: 2;
    transition: all ${theme.transition.fast};
  }
`;

const RatingCount = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  line-height: 1;
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
  z-index: 100;
  pointer-events: auto;
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
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: ${theme.spacing.xl};

  @media (max-width: 768px) {
    background: #000;
    padding: 0;
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
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    flex-direction: column;
    align-items: center;
    gap: 0;
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
    max-width: 100%;
    width: 100%;
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
    width: auto;
    height: auto;
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
  isFavorite?: boolean; // Если true, персонаж считается в избранном (для страницы favorites)
  onFavoriteToggle?: () => void; // Callback при изменении статуса избранного
  userInfo?: { is_admin?: boolean } | null; // Информация о пользователе для проверки прав админа
  onNsfwToggle?: () => void; // Callback при изменении статуса NSFW (для обновления списка)
  showRatings?: boolean; // Показывать кнопки лайка/дизлайка (только в чате)
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
      <PhotoContainer $clickable={false}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'rgba(22, 33, 62, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(180, 180, 180, 0.5)',
          fontSize: '0.875rem'
        }}>
          Нет фото
        </div>
      </PhotoContainer>
    );
  }

  return (
    <>
      <PhotoContainer $clickable={false}>
        <OptimizedImage
          src={photos[currentSlide] || ''}
          alt={`${characterName || 'Character'} - Slide ${currentSlide + 1}`}
          eager={currentSlide === 0}
          priority={currentSlide === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
        />
      </PhotoContainer>
      {photos.length > 1 && (
        <SlideDots>
          {photos.map((_, idx) => (
            <Dot
              key={idx}
              className={idx === currentSlide ? 'active' : ''}
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
  showPromptButton = false, // По умолчанию не показываем кнопку
  isFavorite: isFavoriteProp = false, // Проп для установки начального состояния избранного
  onFavoriteToggle, // Callback при изменении статуса избранного
  userInfo = null, // Информация о пользователе
  onNsfwToggle, // Callback при изменении статуса NSFW
  showRatings = false // По умолчанию не показываем кнопки лайка/дизлайка
}) => {
  // КРИТИЧЕСКИ ВАЖНО: если isFavoriteProp не передан, начинаем с false
  // Это нужно для главной страницы, где проверка выполняется через API
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp ?? false);
  // Если передан isFavoriteProp, сразу отключаем проверку (персонаж уже в избранном)
  const [isChecking, setIsChecking] = useState(isFavoriteProp === undefined);
  // Локальное состояние для отслеживания NSFW статуса
  const [isNsfw, setIsNsfw] = useState(
    character?.is_nsfw === true || (character as any)?.raw?.is_nsfw === true
  );
  
  // Обновляем состояние избранного при изменении пропа
  // КРИТИЧЕСКИ ВАЖНО: если передан isFavoriteProp, используем его значение и отключаем проверку через API
  useEffect(() => {
    if (isFavoriteProp !== undefined) {
      setIsFavorite(isFavoriteProp);
      setIsChecking(false); // Отключаем проверку, так как значение уже известно
    }
  }, [isFavoriteProp]);

  // Обновляем локальное состояние NSFW при изменении character
  useEffect(() => {
    const newNsfw = character?.is_nsfw === true || (character as any)?.raw?.is_nsfw === true;
    setIsNsfw(newNsfw);
  }, [character?.is_nsfw, (character as any)?.raw?.is_nsfw]);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    character.photos && character.photos.length > 0 ? character.photos[0] : null
  );
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [personality, setPersonality] = useState<string | null>(null);
  const [isLoadingPersonality, setIsLoadingPersonality] = useState(false);
  const [personalityError, setPersonalityError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [dislikesCount, setDislikesCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);

  // Загружаем состояние избранного из API при монтировании
  // КРИТИЧЕСКИ ВАЖНО: проверяем избранное только если isFavoriteProp не передан
  // Если isFavoriteProp передан (например, на главной странице или странице favorites), используем его значение
  useEffect(() => {
    // Если передан isFavoriteProp, используем его и не проверяем через API
    if (isFavoriteProp !== undefined) {
      setIsFavorite(isFavoriteProp);
      setIsChecking(false);
      return;
    }

    // Если isFavoriteProp не передан, проверяем через API (для главной страницы)
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const checkFavorite = async (retryCount = 0) => {
      // Проверяем, что компонент еще смонтирован
      if (!isMounted) {
        return;
      }

      // Ждем немного перед первой попыткой, чтобы токен успел загрузиться
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const token = authManager.getToken();
      if (!token) {
        // Если токен еще не доступен, пробуем еще раз (максимум 15 попыток)
        if (retryCount < 15) {
          const delay = Math.min(200 * (retryCount + 1), 1500); // Увеличиваем задержку до 1.5 секунды
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              checkFavorite(retryCount + 1);
            }
          }, delay);
          return;
        }
        if (isMounted) {
          setIsChecking(false);
        }
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
            if (isMounted) {
              setIsChecking(false);
            }
            return;
          }
        } else {
          if (isMounted) {
            setIsChecking(false);
          }
          return;
        }

        const response = await authManager.fetchWithAuth(API_CONFIG.CHECK_FAVORITE(characterId));
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setIsFavorite(data?.is_favorite || false);
          }
        }
      } catch (error) {
        
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkFavorite();

    // Cleanup функция для отмены повторных попыток при размонтировании
    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [character.id, isFavoriteProp]);

  // Функция для загрузки характера персонажа
  const loadPersonality = async () => {
    if (personality) {
      return; // Уже загружен
    }

    setIsLoadingPersonality(true);
    setPersonalityError(null);

    try {
      const encodedName = encodeURIComponent(character.name);
      const response = await authManager.fetchWithAuth(`/api/v1/characters/${encodedName}`);
      
      if (response.ok) {
        const characterData = await response.json();
        const prompt = characterData?.prompt || '';
        
        // Извлекаем секцию "Personality and Character" из промпта
        if (prompt) {
          const personalityMatch = prompt.match(/Personality and Character:\s*(.*?)(?=\n\nRole-playing Situation:|$)/s);
          if (personalityMatch && personalityMatch[1]) {
            const extractedPersonality = personalityMatch[1].trim();
            setPersonality(extractedPersonality);
          } else {
            setPersonalityError('Характер персонажа не найден');
          }
        } else {
          setPersonalityError('Данные персонажа не найдены');
        }
      } else {
        setPersonalityError('Ошибка загрузки данных персонажа');
      }
    } catch (error) {
      
      setPersonalityError('Ошибка загрузки характера персонажа');
    } finally {
      setIsLoadingPersonality(false);
    }
  };

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
          
          return;
        }
      } else {
        
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
          // Вызываем callback, если он передан (для обновления списка на странице favorites)
          if (onFavoriteToggle) {
            onFavoriteToggle();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          
        }
      } else {
        // Добавляем в избранное
        const response = await authManager.fetchWithAuth(
          API_CONFIG.ADD_FAVORITE(characterId),
          { method: 'POST' }
        );
        if (response.ok) {
          setIsFavorite(true);
          // Вызываем callback, если он передан
          if (onFavoriteToggle) {
            onFavoriteToggle();
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          
        }
      }
    } catch (error) {
      
    }
  };

  // Функция для переключения NSFW статуса (только для админов)
  const toggleNsfw = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    
    
    const token = authManager.getToken();
    if (!token) {
      
      return;
    }

    try {
      const characterName = character.name || (character as any).raw?.name;
      if (!characterName) {
        
        return;
      }

      
      const response = await authManager.fetchWithAuth(
        `${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(characterName)}/toggle-nsfw`,
        { method: 'PATCH' }
      );
      
      

      if (response.ok) {
        const updatedCharacter = await response.json();
        
        // Обновляем локальное состояние
        setIsNsfw(updatedCharacter.is_nsfw === true);
        // Обновляем локальное состояние персонажа
        (character as any).is_nsfw = updatedCharacter.is_nsfw;
        if ((character as any).raw) {
          (character as any).raw.is_nsfw = updatedCharacter.is_nsfw;
        }
        // Вызываем callback для обновления списка
        if (onNsfwToggle) {
          await onNsfwToggle();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        
        alert(`Ошибка переключения статуса: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      
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

  // Функция для загрузки рейтингов персонажа
  const loadRatings = async () => {
    try {
      // Преобразуем character.id в number
      let characterId: number;
      if (typeof character.id === 'number') {
        characterId = character.id;
      } else if (typeof character.id === 'string') {
        characterId = parseInt(character.id, 10);
        if (isNaN(characterId)) {
          
          return;
        }
      } else {
        
        return;
      }

      // Используем fetchWithAuth, который работает и для неавторизованных пользователей
      const response = await authManager.fetchWithAuth(API_CONFIG.GET_CHARACTER_RATINGS(characterId));
      if (response.ok) {
        const data = await response.json();
        setLikesCount(data.likes || 0);
        setDislikesCount(data.dislikes || 0);
        setUserRating(data.user_rating || null);
      }
    } catch (error) {
      
    }
  };

  // Функция для постановки лайка
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const token = authManager.getToken();
    if (!token) {
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
          
          return;
        }
      } else {
        
        return;
      }

      // Оптимистичное обновление UI
      const wasDisliked = userRating === 'dislike';
      const wasLiked = userRating === 'like';
      
      if (wasLiked) {
        // Если уже был лайк, убираем его
        setLikesCount(prev => Math.max(0, prev - 1));
        setUserRating(null);
      } else if (wasDisliked) {
        // Если был дизлайк, убираем его и добавляем лайк
        setDislikesCount(prev => Math.max(0, prev - 1));
        setLikesCount(prev => prev + 1);
        setUserRating('like');
      } else {
        // Если не было лайка, добавляем его
        setLikesCount(prev => prev + 1);
        setUserRating('like');
      }

      const response = await authManager.fetchWithAuth(
        API_CONFIG.LIKE_CHARACTER(characterId),
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Обновляем рейтинги после успешного лайка для синхронизации с сервером
        await loadRatings();
      } else {
        // Откатываем изменения при ошибке
        if (wasLiked) {
          setLikesCount(prev => prev + 1);
          setUserRating('like');
        } else if (wasDisliked) {
          setDislikesCount(prev => prev + 1);
          setLikesCount(prev => Math.max(0, prev - 1));
          setUserRating('dislike');
        } else {
          setLikesCount(prev => Math.max(0, prev - 1));
          setUserRating(null);
        }
      }
    } catch (error) {
      
      // Откатываем изменения при ошибке
      const wasDisliked = userRating === 'dislike';
      const wasLiked = userRating === 'like';
      if (wasLiked) {
        setLikesCount(prev => prev + 1);
        setUserRating('like');
      } else if (wasDisliked) {
        setDislikesCount(prev => prev + 1);
        setLikesCount(prev => Math.max(0, prev - 1));
        setUserRating('dislike');
      } else {
        setLikesCount(prev => Math.max(0, prev - 1));
        setUserRating(null);
      }
    }
  };

  // Функция для постановки дизлайка
  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const token = authManager.getToken();
    if (!token) {
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
          
          return;
        }
      } else {
        
        return;
      }

      // Оптимистичное обновление UI
      const wasLiked = userRating === 'like';
      const wasDisliked = userRating === 'dislike';
      
      if (wasDisliked) {
        // Если уже был дизлайк, убираем его
        setDislikesCount(prev => Math.max(0, prev - 1));
        setUserRating(null);
      } else if (wasLiked) {
        // Если был лайк, убираем его и добавляем дизлайк
        setLikesCount(prev => Math.max(0, prev - 1));
        setDislikesCount(prev => prev + 1);
        setUserRating('dislike');
      } else {
        // Если не было дизлайка, добавляем его
        setDislikesCount(prev => prev + 1);
        setUserRating('dislike');
      }

      const response = await authManager.fetchWithAuth(
        API_CONFIG.DISLIKE_CHARACTER(characterId),
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Обновляем рейтинги после успешного дизлайка для синхронизации с сервером
        await loadRatings();
      } else {
        // Откатываем изменения при ошибке
        if (wasDisliked) {
          setDislikesCount(prev => prev + 1);
          setUserRating('dislike');
        } else if (wasLiked) {
          setLikesCount(prev => prev + 1);
          setDislikesCount(prev => Math.max(0, prev - 1));
          setUserRating('like');
        } else {
          setDislikesCount(prev => Math.max(0, prev - 1));
          setUserRating(null);
        }
      }
    } catch (error) {
      
      // Откатываем изменения при ошибке
      const wasLiked = userRating === 'like';
      const wasDisliked = userRating === 'dislike';
      if (wasDisliked) {
        setDislikesCount(prev => prev + 1);
        setUserRating('dislike');
      } else if (wasLiked) {
        setLikesCount(prev => prev + 1);
        setDislikesCount(prev => Math.max(0, prev - 1));
        setUserRating('like');
      } else {
        setDislikesCount(prev => Math.max(0, prev - 1));
        setUserRating(null);
      }
    }
  };

  // Загружаем рейтинги при монтировании компонента только если showRatings=true
  useEffect(() => {
    if (showRatings) {
      loadRatings();
    }
  }, [character.id, showRatings]);

  const handleOpenPhoto = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    setSelectedPhoto(imageUrl);
    setIsPromptVisible(true);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(imageUrl);
      if (prompt) {
        // Переводим промпт на русский для отображения
        const translatedPrompt = await translateToRussian(prompt);
        setSelectedPrompt(translatedPrompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
    } catch (error) {
      
      setPromptError('Ошибка загрузки промпта');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
        setSelectedPhoto(null);
        setSelectedPrompt(null);
        setPromptError(null);
        setIsLoadingPrompt(false);
        }
        if (isPersonalityModalOpen) {
          setIsPersonalityModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPhoto, isPersonalityModalOpen]);

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
                <CloseIcon size={20} />
              </button>
            </div>
          </PromptPanelHeader>
          {isLoadingPrompt ? (
            <PromptLoading>Загрузка промпта...</PromptLoading>
          ) : promptError ? (
            <PromptError>{promptError}</PromptError>
          ) : selectedPrompt ? (
            <PromptPanelText>{selectedPrompt}</PromptPanelText>
          ) : null}
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
              zIndex: 10002,
              fontWeight: '600'
            }}
          >
            Показать промпт
          </button>
        )}
      </ModalContent>
    </ModalOverlay>
  ) : null;

  return (
    <>
    <CardWrapper>
      {showRatings && (
        <RatingButton
          $isActive={userRating === 'like'}
          $isLike={true}
          onClick={handleLike}
        >
          <FiThumbsUp />
          <RatingCount>{likesCount}</RatingCount>
        </RatingButton>
      )}
      <ElectricBorder
        color="#555555"
        speed={1}
        chaos={0.3}
        thickness={2}
        style={{ borderRadius: 16, flex: '0 0 auto' }}
      >
        <CardContainer>
          <SlideShow 
            photos={character.photos || []} 
            characterName={character.name}
            onPhotoClick={undefined}
            onCurrentPhotoChange={(photoUrl) => {
              setCurrentPhotoUrl(photoUrl);
                }}
          />
          
          {/* На странице favorites всегда показываем кнопку, даже если идет проверка */}
          {(isFavoriteProp !== undefined || !isChecking) && (
            <FavoriteButton 
              $isFavorite={isFavorite}
              onClick={toggleFavorite}
              aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <FiHeart />
            </FavoriteButton>
          )}
          
          <ActionButtons $alwaysVisible={!!onDelete || !!onPaidAlbum || (userInfo && userInfo.is_admin === true)}>
          {userInfo && userInfo.is_admin === true && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Switcher4
                  checked={isNsfw}
                  onToggle={async (checked) => {
                    
                    // Вызываем toggleNsfw при клике на переключатель
                    const syntheticEvent = {
                      stopPropagation: () => {},
                      preventDefault: () => {}
                    } as React.MouseEvent;
                    await toggleNsfw(syntheticEvent);
                  }}
                  variant="pink"
                />
              </div>
              <span style={{ fontSize: '11px', color: '#fff', whiteSpace: 'nowrap' }}>
                {isNsfw ? '18+' : 'SAFE'}
              </span>
            </div>
          )}
          {onPaidAlbum && (
            <AlbumButton 
              onClick={(e) => {
                e.stopPropagation();
                onPaidAlbum(character);
              }}
            >
              Альбом
            </AlbumButton>
          )}
          <CharacterButton 
            onClick={async (e) => {
              e.stopPropagation();
              setIsPersonalityModalOpen(true);
              await loadPersonality();
            }}
          >
            Характер
          </CharacterButton>
          {onDelete && (
            <ActionButtonWithTooltip>
              <ActionButton
                variant="delete"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onDelete) {
                    onDelete(character);
                  }
                }}
              >
                <FiTrash2 size={16} />
              </ActionButton>
              <Tooltip>Удалить персонажа</Tooltip>
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
            onClick={() => {
              
              onClick(character);
            }}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 10, // Увеличил z-index чтобы перекрывать контент, но не кнопки
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
            onMouseDown={(e) => {
              // Не блокируем клики на кнопки рейтинга и другие интерактивные элементы
              const target = e.target as HTMLElement;
              if (
                target.closest('button') || 
                target.closest('a') || 
                target.closest('[class*="RatingButton"]') ||
                target.closest('[class*="Switcher"]') ||
                target.closest('[class*="FavoriteButton"]')
              ) {
                // Если клик по кнопке - не перехватываем
                return;
              }
              // Для всего остального можем обработать здесь если нужно
            }}
          />
      </CardContainer>
    </ElectricBorder>
      {showRatings && (
        <RatingButton
          $isActive={userRating === 'dislike'}
          $isLike={false}
          onClick={handleDislike}
        >
          <FiThumbsDown />
          <RatingCount>{dislikesCount}</RatingCount>
        </RatingButton>
      )}
    </CardWrapper>
      {modalContent && createPortal(modalContent, document.body)}
      {isPersonalityModalOpen && createPortal(
        <PersonalityModal onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsPersonalityModalOpen(false);
          }
        }}>
          <PersonalityModalContent onClick={(e) => e.stopPropagation()}>
            <PersonalityModalHeader>
              <PersonalityModalTitle>Характер: {character.name}</PersonalityModalTitle>
              <PersonalityModalCloseButton onClick={() => setIsPersonalityModalOpen(false)}>
                <CloseIcon />
              </PersonalityModalCloseButton>
            </PersonalityModalHeader>
            {isLoadingPersonality ? (
              <PersonalityLoading>Загрузка характера...</PersonalityLoading>
            ) : personalityError ? (
              <PersonalityError>{personalityError}</PersonalityError>
            ) : personality ? (
              <PersonalityText>{personality}</PersonalityText>
            ) : (
              <PersonalityLoading>Характер не найден</PersonalityLoading>
            )}
          </PersonalityModalContent>
        </PersonalityModal>,
        document.body
      )}
    </>
  );
};
