import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { theme } from '../theme';
import ElectricBorder from './ElectricBorder';
import { FiHeart, FiX as CloseIcon, FiTrash2, FiThumbsUp, FiThumbsDown, FiEdit } from 'react-icons/fi';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { translateToRussian } from '../utils/translate';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { fetchPromptByImage } from '../utils/prompt';
import { useIsMobile } from '../hooks/useIsMobile';
import Switcher4 from './Switcher4';
import { OptimizedImage } from './ui/OptimizedImage';
import { PromptGlassModal } from './PromptGlassModal';

const CardContainer = styled.div<{ $isHovered?: boolean }>`
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
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
  }
  
  ${props => props.$isHovered && `
    box-shadow: ${theme.colors.shadow.glow}, 0 0 20px rgba(139, 92, 246, 0.4);
    border-color: rgba(139, 92, 246, 0.5);
  `}
`;

const PhotoContainer = styled.div<{ $clickable?: boolean; $isHovered?: boolean }>`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: ${props => props.$clickable !== false ? 'pointer' : 'default'};
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.6s ease;
  }
  
  ${props => props.$isHovered && `
    img {
      transform: scale(1.05);
    }
  `}
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
  
  @media (max-width: 768px) {
    opacity: 1 !important;
    transform: translateY(0) !important;
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

const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 32px;
  min-height: 28px;
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
  
  @media (max-width: 768px) {
    padding: 4px 6px;
    min-width: 32px;
    min-height: 32px;
    font-size: ${theme.fontSize.xs};
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

const AlbumButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 60px;
  min-height: 28px;
  z-index: 11;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 3px 6px;
    min-width: 50px;
    min-height: 24px;
    font-size: 10px;
  }
  
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
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const PersonalityLoading = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PersonalityError = styled.div`
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.base};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const EditPromptModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: ${theme.spacing.lg};
`;

const EditPromptModalContent = styled.div`
  background: ${theme.colors.background.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.glow};
`;

const EditPromptModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const EditPromptModalTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  margin: 0;
`;

const EditPromptModalCloseButton = styled.button`
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

const EditPromptPhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing.lg};
  }
`;

const EditPromptPhotoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const EditPromptPhotoImage = styled.img`
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: ${theme.borderRadius.md};
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
`;

const EditPromptPhotoTextarea = styled.textarea`
  width: 100%;
  min-height: 150px;
  padding: ${theme.spacing.md};
  border: 2px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  background: rgba(20, 20, 20, 0.8);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-family: 'Courier New', monospace;
  resize: vertical;
  line-height: 1.6;
  
  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }
  
  &::placeholder {
    color: rgba(150, 150, 150, 0.7);
  }
`;

const EditPromptButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
`;

const EditPromptSaveButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  background: rgba(139, 92, 246, 0.8);
  border: 2px solid rgba(139, 92, 246, 0.6);
  color: white;
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  
  &:hover {
    background: rgba(139, 92, 246, 1);
    border-color: rgba(139, 92, 246, 0.8);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const EditPromptCancelButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  border: 2px solid rgba(100, 100, 100, 0.5);
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(100, 100, 100, 0.7);
    color: ${theme.colors.text.primary};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const EditPromptButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  z-index: 11;
  
  @media (max-width: 768px) {
    padding: 4px 6px;
    font-size: ${theme.fontSize.xs};
    gap: 3px;
    
    svg {
      width: 12px;
      height: 12px;
    }
  }
  
  &:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
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
  background: ${theme.colors.gradients.main};
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
  overflow: visible;
`;

const LIKE_ACTIVE_COLOR = 'rgba(255, 193, 7, 1)';
const DISLIKE_ACTIVE_COLOR = 'rgba(244, 67, 54, 1)';

const RatingButton = styled.button<{ $isActive?: boolean; $isLike?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 41px;
  height: 41px;
  background: rgba(20, 20, 20, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  padding: 0;
  color: ${props => {
    if (props.$isActive) {
      return props.$isLike ? 'rgba(255, 193, 7, 1)' : 'rgba(200, 200, 200, 0.6)';
    }
    return props.$isLike ? 'rgba(255, 255, 255, 0.7)' : 'rgba(150, 150, 150, 0.5)';
  }};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  pointer-events: auto;
  position: absolute;
  visibility: visible;
  opacity: 1;
  box-shadow: ${props => {
    if (props.$isActive && props.$isLike) {
      return '0 3px 14px rgba(255, 193, 7, 0.4), 0 0 0 1px rgba(255, 193, 7, 0.2)';
    }
    return '0 1px 7px rgba(0, 0, 0, 0.3)';
  }};
  
  ${props => props.$isLike ? `
    top: 50%;
    left: -21px;
    transform: translateY(-50%);
  ` : `
    top: 50%;
    right: -21px;
    transform: translateY(-50%);
  `}
  
  &:hover {
    transform: ${props => props.$isLike ? 'translateY(-50%) scale(1.1)' : 'translateY(-50%) scale(1.1)'};
    background: rgba(30, 30, 30, 0.7);
    border-color: ${props => {
      if (props.$isLike) {
        return props.$isActive ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 255, 255, 0.2)';
      }
      return 'rgba(150, 150, 150, 0.3)';
    }};
    box-shadow: ${props => {
      if (props.$isLike) {
        return props.$isActive 
          ? '0 5px 22px rgba(255, 193, 7, 0.5), 0 0 0 1px rgba(255, 193, 7, 0.3)'
          : '0 3px 14px rgba(255, 255, 255, 0.15)';
      }
      return '0 3px 14px rgba(0, 0, 0, 0.4)';
    }};
    filter: ${props => props.$isLike ? 'brightness(1.2)' : 'brightness(1.1)'};
  }
  
  &:active {
    transform: ${props => props.$isLike ? 'translateY(-50%) scale(0.95)' : 'translateY(-50%) scale(0.95)'};
  }
  
  svg {
    width: 14px;
    height: 14px;
    stroke-width: 2.5;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

const RatingCount = styled.span<{ $isActive?: boolean; $isLike?: boolean }>`
  font-size: 8px;
  font-weight: 700;
  color: ${props => {
    if (props.$isActive && props.$isLike) {
      return 'rgba(255, 193, 7, 1)';
    }
    return props.$isLike ? 'rgba(255, 255, 255, 0.9)' : 'rgba(200, 200, 200, 0.7)';
  }};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  line-height: 1;
  margin-top: -1px;
  display: block;
  min-height: 10px;
  letter-spacing: 0.2px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;


const RoleplaySituationButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 60px;
  min-height: 28px;
  z-index: 11;
  position: relative;
  
  @media (min-width: 769px) {
    display: none;
  }
  
  @media (max-width: 768px) {
    padding: 3px 6px;
    min-width: 50px;
    min-height: 24px;
    font-size: 10px;
  }
  
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

const PromptModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: ${theme.spacing.lg};
`;

const PromptModalContent = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  max-height: 90vh;
  gap: ${theme.spacing.lg};
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    max-height: 100vh;
  }
`;

const PromptImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  
  img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: center;
  }
  
  @media (max-width: 768px) {
    max-height: none;
    height: auto;
    
    img {
      max-width: 100vw;
      max-height: 100vh;
      width: auto;
      height: auto;
    }
  }
`;

const PromptSidebar = styled.div<{ $isVisible: boolean }>`
  width: 400px;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.colors.shadow.glow};
  transition: all ${theme.transition.fast};
  opacity: ${props => props.$isVisible ? 1 : 0};
  transform: ${props => props.$isVisible ? 'translateX(0)' : 'translateX(20px)'};
  pointer-events: ${props => props.$isVisible ? 'auto' : 'none'};
  
  @media (max-width: 768px) {
    width: 100%;
    max-height: 45vh;
    opacity: ${props => props.$isVisible ? 1 : 0};
    transform: ${props => props.$isVisible ? 'translateY(0)' : 'translateY(20px)'};
  }
`;

const PromptSidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const PromptSidebarTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0;
  flex: 1;
`;

const PromptCloseButton = styled.button`
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
    width: 20px;
    height: 20px;
  }
`;

const PromptText = styled.div`
  flex: 1;
  overflow-y: auto;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'Courier New', monospace;
  padding: ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.5);
  border-radius: ${theme.borderRadius.md};
  border: 1px solid rgba(100, 100, 100, 0.3);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.5);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 4px;
    
    &:hover {
      background: rgba(139, 92, 246, 0.7);
    }
  }
`;

const PromptLoading = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptError = styled.div`
  color: ${theme.colors.status.error};
  font-size: ${theme.fontSize.base};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const PromptButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  min-width: 60px;
  min-height: 28px;
  z-index: 11;
  position: relative;
  
  @media (max-width: 768px) {
    padding: 3px 6px;
    min-width: 50px;
    min-height: 24px;
    font-size: 10px;
  }
  
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

const ModalCloseButton = styled.button`
  position: absolute;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  z-index: 10003;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: ${theme.colors.accent.primary};
    transform: scale(1.1);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
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
  dislikes?: number;
  views: number;
  comments: number;
  is_nsfw?: boolean;
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
  isFavorite?: boolean; // Если true, персонаж считается в избранном (для страницы favorites)
  onFavoriteToggle?: () => void; // Callback при изменении статуса избранного
  userInfo?: { is_admin?: boolean } | null; // Информация о пользователе для проверки прав админа
  onNsfwToggle?: () => void; // Callback при изменении статуса NSFW (для обновления списка)
  showRatings?: boolean; // Показывать кнопки лайка/дизлайка (только в чате)
  onAuthRequired?: () => void; // Callback для открытия модального окна авторизации
}

// Компонент слайд-шоу
const SlideShow: React.FC<{ 
  photos: string[]; 
  characterName: string; 
  onPhotoClick?: (photoUrl: string) => void;
  onCurrentPhotoChange?: (photoUrl: string) => void;
  isHovered?: boolean;
}> = ({ photos, characterName, onPhotoClick, onCurrentPhotoChange, isHovered = false }) => {
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
      <PhotoContainer $clickable={false} $isHovered={isHovered}>
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
  isFavorite: isFavoriteProp = false, // Проп для установки начального состояния избранного
  onFavoriteToggle, // Callback при изменении статуса избранного
  userInfo = null, // Информация о пользователе
  onNsfwToggle, // Callback при изменении статуса NSFW
  showRatings = false, // По умолчанию не показываем кнопки лайка/дизлайка
  isAuthenticated = false, // Статус авторизации
  onAuthRequired // Callback для открытия модального окна авторизации
}) => {
  const isMobile = useIsMobile();
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
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    character.photos && character.photos.length > 0 ? character.photos[0] : null
  );
  
  // Обновляем currentPhotoUrl при изменении character.photos
  useEffect(() => {
    if (character.photos && character.photos.length > 0) {
      // Нормализуем первое фото - убеждаемся, что это абсолютный URL
      let firstPhoto = character.photos[0];
      if (firstPhoto && !firstPhoto.startsWith('http')) {
        if (firstPhoto.startsWith('/')) {
          firstPhoto = `${API_CONFIG.BASE_URL || window.location.origin}${firstPhoto}`;
        } else {
          firstPhoto = `${API_CONFIG.BASE_URL || window.location.origin}/${firstPhoto}`;
        }
      }
      setCurrentPhotoUrl(firstPhoto);
    } else {
      setCurrentPhotoUrl(null);
    }
  }, [character.photos]);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [personality, setPersonality] = useState<string | null>(null);
  const [isLoadingPersonality, setIsLoadingPersonality] = useState(false);
  const [personalityError, setPersonalityError] = useState<string | null>(null);
  const [isEditPromptModalOpen, setIsEditPromptModalOpen] = useState(false);
  const [editingPhotos, setEditingPhotos] = useState<Array<{url: string, prompt: string}>>([]);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(character.likes ?? 0);
  const [dislikesCount, setDislikesCount] = useState<number>(character.dislikes ?? 0);
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);
  
  // Состояние для Smart Hover overlay
  const [isHovered, setIsHovered] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [roleplaySituation, setRoleplaySituation] = useState<string | null>(null);
  const [isLoadingSituation, setIsLoadingSituation] = useState(false);
  const [situationError, setSituationError] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  
  // Состояние для модального окна промпта
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [modalPhotoUrl, setModalPhotoUrl] = useState<string | null>(null); // Сохраняем фото при открытии модального окна

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
      // КРИТИЧНО: Используем ID для запроса, если он доступен
      const identifier = character.id?.toString() || character.name;
      const encodedIdentifier = encodeURIComponent(identifier);
      const response = await authManager.fetchWithAuth(`/api/v1/characters/${encodedIdentifier}`);
      
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

  // Функция для загрузки промптов для всех фото
  const loadPromptsForPhotos = async (photoUrls: string[]): Promise<Array<{url: string, prompt: string}>> => {
    const photosWithPrompts: Array<{url: string, prompt: string}> = [];
    
    for (const url of photoUrls) {
      try {
        const { prompt } = await fetchPromptByImage(url);
        photosWithPrompts.push({
          url,
          prompt: prompt || ''
        });
      } catch (error) {
        photosWithPrompts.push({
          url,
          prompt: ''
        });
      }
    }
    
    return photosWithPrompts;
  };

  // Функция для сохранения админских промптов
  const handleSaveAdminPrompt = async () => {
    if (editingPhotos.length === 0) {
      return;
    }

    setIsSavingPrompt(true);
    setPromptSaveError(null);

    try {
      // Сохраняем промпты для всех фото
      const savePromises = editingPhotos.map(photo =>
        authManager.fetchWithAuth(
          `${API_CONFIG.BASE_URL}/api/v1/image-generation/set-admin-prompt/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              image_url: photo.url,
              admin_prompt: photo.prompt.trim() || null
            })
          }
        )
      );

      const responses = await Promise.all(savePromises);
      const allSuccess = responses.every(r => r.ok);

      if (allSuccess) {
        setIsEditPromptModalOpen(false);
        setEditingPhotos([]);
      } else {
        const errorResponses = responses.filter(r => !r.ok);
        const errorData = await errorResponses[0].json().catch(() => ({}));
        setPromptSaveError(errorData.detail || 'Ошибка сохранения промптов');
      }
    } catch (error) {
      setPromptSaveError('Ошибка сохранения промптов');
    } finally {
      setIsSavingPrompt(false);
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
        // Обновляем счетчики только если данные получены, иначе используем значения из пропсов
        if (data.likes !== undefined && data.likes !== null) {
          setLikesCount(data.likes);
        } else if (character.likes !== undefined) {
          setLikesCount(character.likes);
        }
        if (data.dislikes !== undefined && data.dislikes !== null) {
          setDislikesCount(data.dislikes);
        } else if (character.dislikes !== undefined) {
          setDislikesCount(character.dislikes);
        }
        setUserRating(data.user_rating || null);
      } else {
        // Если запрос не удался, используем значения из пропсов
        if (character.likes !== undefined) {
          setLikesCount(character.likes);
        }
        if (character.dislikes !== undefined) {
          setDislikesCount(character.dislikes);
        }
      }
    } catch (error) {
      // При ошибке используем значения из пропсов
      if (character.likes !== undefined) {
        setLikesCount(character.likes);
      }
      if (character.dislikes !== undefined) {
        setDislikesCount(character.dislikes);
      }
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

  // Загружаем рейтинги при монтировании компонента.
  // Если showRatings — всегда запрашиваем с сервера (нужен user_rating для подсветки лайка/дизлайка).
  // Иначе загружаем только когда нет likes/dislikes в пропсах.
  useEffect(() => {
    if (showRatings) {
      loadRatings();
      return;
    }
    if (character.likes !== undefined || character.dislikes !== undefined) {
      return;
    }
    loadRatings();
  }, [character.id, character.likes, character.dislikes, showRatings]);

  // Синхронизируем счетчики с пропсами, когда они изменяются извне
  useEffect(() => {
    if (character.likes !== undefined) {
      setLikesCount(character.likes);
    }
    if (character.dislikes !== undefined) {
      setDislikesCount(character.dislikes);
    }
  }, [character.likes, character.dislikes]);


  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPersonalityModalOpen) {
          setIsPersonalityModalOpen(false);
        }
        if (isEditPromptModalOpen) {
          setIsEditPromptModalOpen(false);
          setEditingPhotos([]);
          setPromptSaveError(null);
        }
        if (isPromptModalOpen) {
          handleClosePromptModal();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isPersonalityModalOpen, isEditPromptModalOpen, isPromptModalOpen]);

  // Функция для загрузки ролевой ситуации
  const loadRoleplaySituation = async () => {
    if (roleplaySituation) {
      return; // Уже загружена
    }

    setIsLoadingSituation(true);
    setSituationError(null);

    try {
      // КРИТИЧНО: Используем ID для запроса, если он доступен
      const identifier = character.id?.toString() || character.name;
      const encodedIdentifier = encodeURIComponent(identifier);
      // Используем обычный fetch, так как эндпоинт доступен без авторизации
      const url = `${API_CONFIG.BASE_URL || ''}/api/v1/characters/${encodedIdentifier}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const characterData = await response.json();
        const prompt = characterData?.prompt || '';
        
        if (prompt) {
          const situation = extractRolePlayingSituation(prompt);
          if (situation) {
            // Переводим на русский
            const translatedSituation = await translateToRussian(situation);
            setRoleplaySituation(translatedSituation);
          } else {
            setSituationError('Ролевая ситуация не найдена');
          }
        } else {
          setSituationError('Данные персонажа не найдены');
        }
      } else {
        setSituationError('Ошибка загрузки данных персонажа');
      }
    } catch (error) {
      setSituationError('Ошибка загрузки ролевой ситуации');
    } finally {
      setIsLoadingSituation(false);
    }
  };

  // Функция для загрузки промпта для текущего фото
  const loadPromptForPhoto = async (photoUrl: string) => {
    if (!photoUrl) {
      setPromptError('URL изображения отсутствует');
      return;
    }

    setIsLoadingPrompt(true);
    setPromptError(null);
    setPromptText(null);

    try {
      const result = await fetchPromptByImage(photoUrl);
      if (result.hasPrompt && result.prompt) {
        setPromptText(result.prompt);
      } else {
        setPromptError(result.errorMessage || 'Промпт не найден для этого изображения');
      }
    } catch (error) {
      setPromptError('Ошибка загрузки промпта');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  // Обработчик открытия модального окна промпта
  const handleOpenPromptModal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentPhotoUrl) {
      return;
    }

    // Сохраняем текущее фото, чтобы оно не менялось при изменении слайда
    setModalPhotoUrl(currentPhotoUrl);
    setIsPromptModalOpen(true);
    setIsPromptVisible(true);
    await loadPromptForPhoto(currentPhotoUrl);
  };

  // Обработчик закрытия модального окна промпта
  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
    setIsPromptVisible(true);
    setPromptText(null);
    setPromptError(null);
    setModalPhotoUrl(null);
  };

  // Обработчик закрытия только промпта (оставляет фото открытым)
  const handleClosePrompt = () => {
    setIsPromptVisible(false);
  };

  // Обновление позиции карточки для позиционирования overlay
  useEffect(() => {
    const updatePosition = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        // Для position: fixed используем координаты относительно viewport (без scroll offset)
        setCardPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
    };

    // Обновляем позицию при hover или когда overlay показывается
    if (isHovered || showOverlay) {
      updatePosition();
      const interval = setInterval(updatePosition, 100);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearInterval(interval);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isHovered, showOverlay]);

  // Обработка hover с задержкой для Smart Hover overlay (только для десктопа)
  useEffect(() => {
    if (isMobile) {
      // На мобильных не используем hover
      return;
    }
    
    if (isHovered) {
      // Убеждаемся, что позиция карточки установлена сразу при hover
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardPosition({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }
      
      hoverTimeoutRef.current = setTimeout(() => {
        // Проверяем, что мышь все еще на карточке
        if (isHovered && cardRef.current) {
          setShowOverlay(true);
          // Загружаем ролевую ситуацию при показе overlay
          loadRoleplaySituation();
        }
      }, 500);
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      // Закрываем overlay сразу при уходе мыши с карточки
      setShowOverlay(false);
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, isMobile]);

  // Функция для показа overlay по клику (для мобильных) с toggle логикой
  const handleShowRoleplaySituation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Если уже открыто - закрываем
    if (showOverlay) {
      setShowOverlay(false);
      return;
    }
    
    // Иначе открываем и загружаем данные
    setShowOverlay(true);
    await loadRoleplaySituation();
  };

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
          <RatingCount $isActive={userRating === 'like'} $isLike={true}>{likesCount ?? 0}</RatingCount>
        </RatingButton>
      )}
      <ElectricBorder
        color="#555555"
        thickness={2}
        style={{ borderRadius: 16, flex: '0 0 auto' }}
      >
        <CardContainer
          ref={cardRef}
          $isHovered={showOverlay && isHovered}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setIsHovered(true);
            // Обновляем позицию сразу при hover
            if (cardRef.current) {
              const rect = cardRef.current.getBoundingClientRect();
              setCardPosition({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              });
            }
          }}
          onMouseLeave={(e) => {
            // При уходе мыши с карточки
            setIsHovered(false);
            // Проверяем, не переходим ли мы на overlay
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            const isMovingToOverlay = relatedTarget && 
              typeof relatedTarget.closest === 'function' && (
                relatedTarget.closest('[class*="bg-black/80"]') !== null ||
                relatedTarget.closest('[class*="backdrop-blur-md"]') !== null
              );
            
            // Если не переходим на overlay, закрываем сразу
            if (!isMovingToOverlay) {
              setShowOverlay(false);
            }
          }}
        >
          <SlideShow 
            photos={character.photos || []} 
            characterName={character.name}
            onPhotoClick={undefined}
            onCurrentPhotoChange={(photoUrl) => {
              setCurrentPhotoUrl(photoUrl);
                }}
            isHovered={showOverlay}
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
          {currentPhotoUrl && (
            <PromptButton
              onClick={handleOpenPromptModal}
            >
              Промпт
            </PromptButton>
          )}
          {isMobile && (
            <RoleplaySituationButton
              onClick={handleShowRoleplaySituation}
            >
              Ролевая ситуация
            </RoleplaySituationButton>
          )}
          {userInfo && userInfo.is_admin === true && character.photos && character.photos.length > 0 && (
            <EditPromptButton
              onClick={async (e) => {
                e.stopPropagation();
                // Берем до 3 фото персонажа
                const photosToEdit = character.photos.slice(0, 3);
                setIsEditPromptModalOpen(true);
                setPromptSaveError(null);
                setIsSavingPrompt(false);
                // Загружаем текущие промпты для всех фото
                try {
                  const photosWithPrompts = await loadPromptsForPhotos(photosToEdit);
                  setEditingPhotos(photosWithPrompts);
                } catch (error) {
                  setEditingPhotos(photosToEdit.map(url => ({ url, prompt: '' })));
                }
              }}
            >
              <FiEdit size={14} />
              Вписать промит фото
            </EditPromptButton>
          )}
          {onDelete && (
            <ActionButtonWithTooltip>
              <ActionButton
                $variant="delete"
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
          <StatsContainer>
            <StatItem>
              <FiThumbsUp size={12} style={{ marginRight: '4px' }} />
              <span>{formatNumber(likesCount ?? 0)}</span>
            </StatItem>
            <StatItem>
              <FiThumbsDown size={12} style={{ marginRight: '4px' }} />
              <span>{formatNumber(dislikesCount ?? 0)}</span>
            </StatItem>
          </StatsContainer>
        </ContentOverlay>
        
          <div 
            onClick={(e) => {
              // Не блокируем клики на кнопки рейтинга и другие интерактивные элементы
              const target = e.target as HTMLElement;
              if (
                target.closest('button') || 
                target.closest('a') || 
                target.closest('[class*="RatingButton"]') ||
                target.closest('[class*="Switcher"]') ||
                target.closest('[class*="FavoriteButton"]') ||
                target.closest('[class*="ActionButton"]') ||
                target.closest('[class*="RoleplaySituationButton"]')
              ) {
                // Если клик по кнопке - не перехватываем
                e.stopPropagation();
                return;
              }
              // Для всего остального вызываем onClick
              e.stopPropagation();
              onClick(character);
            }}
            onTouchStart={(e) => {
              // Для мобильных устройств также проверяем, не кликнули ли по кнопке
              const target = e.target as HTMLElement;
              if (
                target.closest('button') || 
                target.closest('a') || 
                target.closest('[class*="RatingButton"]') ||
                target.closest('[class*="Switcher"]') ||
                target.closest('[class*="FavoriteButton"]') ||
                target.closest('[class*="ActionButton"]') ||
                target.closest('[class*="RoleplaySituationButton"]')
              ) {
                // Если клик по кнопке - не перехватываем
                return;
              }
            }}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 2, // Ниже кнопок (z-index: 11+), но выше контента
              pointerEvents: 'auto',
              cursor: 'pointer'
            }}
          />
          
          {/* Smart Hover Popup - справа от карточки (десктоп) - через Portal */}
          {showOverlay && cardPosition && !isMobile && cardPosition.width > 0 && createPortal(
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8
                }}
                className="bg-black/80 backdrop-blur-[10px] border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/20 pointer-events-auto"
                style={{
                  position: 'fixed' as const,
                  zIndex: 10000,
                  left: (() => {
                    // Увеличиваем ширину окошка до 120% от ширины карточки или минимум 400px
                    const overlayWidth = Math.max(cardPosition.width * 1.2, 400);
                    const cardRightEdge = cardPosition.left + cardPosition.width;
                    const spaceOnRight = window.innerWidth - cardRightEdge;
                    
                    // Если справа достаточно места (ширина окошка) - показываем справа вплотную
                    if (spaceOnRight >= overlayWidth) {
                      return `${cardRightEdge}px`;
                    }
                    // Если справа нет места - показываем слева вплотную
                    else {
                      return `${cardPosition.left - overlayWidth}px`;
                    }
                  })(),
                  top: `${cardPosition.top}px`,
                  width: (() => {
                    // Увеличиваем ширину окошка до 120% от ширины карточки или минимум 400px
                    return `${Math.max(cardPosition.width * 1.2, 400)}px`;
                  })(),
                  height: '180px',
                  maxHeight: '180px',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                  setIsHovered(false);
                  setShowOverlay(false);
                }}
              >
                <div className="p-4 flex flex-col h-full" style={{ 
                  height: '180px',
                  maxHeight: '180px',
                  minHeight: 0
                }}>
                  {/* Title with gradient - pink/purple bold */}
                  <h3 className="text-lg font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent flex-shrink-0" style={{
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {character.name}
                  </h3>
                  
                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    {isLoadingSituation ? (
                      <div className="text-sm text-white/70 animate-pulse">Загрузка...</div>
                    ) : situationError ? (
                      <div className="text-sm text-red-400">{situationError}</div>
                    ) : roleplaySituation ? (
                      <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap pr-2">
                        {roleplaySituation}
                      </p>
                    ) : (
                      <p className="text-sm text-white/50">Ролевая ситуация не найдена</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
      </CardContainer>
    </ElectricBorder>
    
    {/* Smart Hover Popup для мобильных - на весь экран */}
    {showOverlay && cardPosition && isMobile && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.8
            }}
            className="fixed bg-black/80 backdrop-blur-md border border-purple-500/50 rounded-xl shadow-2xl shadow-purple-500/20 pointer-events-auto z-[10000]"
            style={{
              left: '0',
              right: '0',
              top: '0',
              bottom: '0',
              width: '100vw',
              height: '100vh',
              borderRadius: '0',
            }}
            onMouseEnter={() => {
              if (!isMobile) {
                setIsHovered(true);
              }
            }}
            onMouseLeave={() => {
              if (!isMobile) {
                setIsHovered(false);
                setShowOverlay(false);
              }
            }}
            onClick={(e) => {
              if (isMobile && e.target === e.currentTarget) {
                setShowOverlay(false);
              }
            }}
          >
            <div className="p-4 md:p-6 flex flex-col overflow-y-auto relative" style={{ 
              maxHeight: '100vh',
              height: '100vh',
              paddingTop: '60px'
            }}>
              {/* Кнопка закрытия для мобильных */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOverlay(false);
                }}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white transition-colors z-10"
              >
                <CloseIcon size={18} />
              </button>
              
              {/* Title with gradient */}
              <h3 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent pr-8">
                {character.name}
              </h3>
              
              {/* Roleplay Situation */}
              <div>
                <h4 className="text-sm font-semibold text-purple-300 mb-2 uppercase tracking-wide">
                  Ролевая ситуация
                </h4>
                {isLoadingSituation ? (
                  <div className="text-sm text-white/70 animate-pulse">Загрузка...</div>
                ) : situationError ? (
                  <div className="text-sm text-red-400">{situationError}</div>
                ) : roleplaySituation ? (
                  <p className="text-sm md:text-base text-white/90 leading-relaxed whitespace-pre-wrap">
                    {roleplaySituation}
                  </p>
                ) : (
                  <p className="text-sm text-white/50">Ролевая ситуация не найдена</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
    )}
    
      {showRatings && (
        <RatingButton
          $isActive={userRating === 'dislike'}
          $isLike={false}
          onClick={handleDislike}
        >
          <FiThumbsDown />
          <RatingCount $isActive={userRating === 'dislike'} $isLike={false}>{dislikesCount ?? 0}</RatingCount>
        </RatingButton>
      )}
    </CardWrapper>
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
      {isEditPromptModalOpen && editingPhotos.length > 0 && createPortal(
        <EditPromptModal onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsEditPromptModalOpen(false);
            setEditingPhotos([]);
            setPromptSaveError(null);
          }
        }}>
          <EditPromptModalContent onClick={(e) => e.stopPropagation()}>
            <EditPromptModalHeader>
              <EditPromptModalTitle>Редактирование промптов фото</EditPromptModalTitle>
              <EditPromptModalCloseButton onClick={() => {
                setIsEditPromptModalOpen(false);
                setEditingPhotos([]);
                setPromptSaveError(null);
              }}>
                <CloseIcon />
              </EditPromptModalCloseButton>
            </EditPromptModalHeader>
            <EditPromptPhotoGrid>
              {editingPhotos.map((photo, index) => (
                <EditPromptPhotoItem key={photo.url}>
                  <EditPromptPhotoImage src={photo.url} alt={`Фото ${index + 1}`} />
                  <EditPromptPhotoTextarea
                    value={photo.prompt}
                    onChange={(e) => {
                      const updated = [...editingPhotos];
                      updated[index] = { ...updated[index], prompt: e.target.value };
                      setEditingPhotos(updated);
                    }}
                    placeholder="Введите промпт для изображения..."
                  />
                </EditPromptPhotoItem>
              ))}
            </EditPromptPhotoGrid>
            {promptSaveError && (
              <div style={{ color: '#ff6b6b', marginBottom: '16px', fontSize: '14px' }}>
                {promptSaveError}
              </div>
            )}
            <EditPromptButtonGroup>
              <EditPromptCancelButton
                onClick={() => {
                  setIsEditPromptModalOpen(false);
                  setEditingPhotos([]);
                  setPromptSaveError(null);
                }}
                disabled={isSavingPrompt}
              >
                Отмена
              </EditPromptCancelButton>
              <EditPromptSaveButton
                onClick={handleSaveAdminPrompt}
                disabled={isSavingPrompt}
              >
                {isSavingPrompt ? 'Сохранение...' : 'Сохранить все'}
              </EditPromptSaveButton>
            </EditPromptButtonGroup>
          </EditPromptModalContent>
        </EditPromptModal>,
        document.body
      )}
      <PromptGlassModal
        isOpen={isPromptModalOpen && !!modalPhotoUrl}
        onClose={handleClosePromptModal}
        imageUrl={modalPhotoUrl || ''}
        imageAlt={character.name}
        promptText={promptText}
        isLoading={isLoadingPrompt}
        error={promptError}
      />
    </>
  );
};
