import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { theme } from '../theme';
import ElectricBorder from './ElectricBorder';
import { FiSettings, FiX as CloseIcon, FiZap, FiRefreshCw, FiCheck, FiChevronDown, FiEdit, FiTrash2, FiHeart, FiMessageSquare, FiLock, FiUnlock, FiImage, FiThumbsUp, FiThumbsDown, FiAlertTriangle, FiShield } from 'react-icons/fi';
import { Sparkles } from 'lucide-react';
import { authManager } from '../utils/auth';
import { API_CONFIG } from '../config/api';
import { translateToRussian } from '../utils/translate';
import { extractRolePlayingSituation } from '../utils/characterUtils';
import { fetchPromptByImage } from '../utils/prompt';
import { useIsMobile } from '../hooks/useIsMobile';
import Switcher4 from './Switcher4';
import { OptimizedImage } from './ui/OptimizedImage';
import { PromptGlassModal } from './PromptGlassModal';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const CardContainer = styled.div<{ $isHovered?: boolean }>`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: 0;
  box-shadow: ${theme.colors.shadow.message};
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 339px; /* Increased by 5% */
  width: 100%;
  min-width: 203px; /* Reduced by 5% */
  border: 2px solid transparent;
  
  &:hover {
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
  overflow: hidden; /* CRITICAL: предотвращает выход изображения */
  border-radius: 20px;
  
  img {
    width: 100%;
    height: 100%;
    max-width: 100%; /* Дополнительное ограничение */
    max-height: 100%; /* Дополнительное ограничение */
    object-fit: cover; /* Фото адаптируется под размер рамки */
    object-position: center;
    transition: filter 0.3s ease;
    border-radius: 20px; /* Соответствует border-radius контейнера */
    display: block; /* Убирает возможные отступы inline элементов */
  }
  
  ${props => props.$isHovered && `
    img {
      filter: brightness(1.05) contrast(1.05);
    }
  `}
`;

const ActionButtons = styled.div<{ $badgeCount: number }>`
  position: absolute;
  top: ${props => 12 + (props.$badgeCount * 24)}px;
  right: ${theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  align-items: flex-end;
  opacity: 0;
  transform: translateY(-10px);
  transition: all ${theme.transition.fast};
  pointer-events: auto;
  z-index: 1000;
  
  ${CardContainer}: hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;

const VerificationBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(46, 204, 113, 0.6));
  
  svg {
    width: 14px;
    height: 14px;
    color: #ffffff;
    stroke-width: 4px;
  }
`;

const MessageCountBadge = styled.div<{ $hasVerification?: boolean }>`
  position: absolute;
  top: ${props => props.$hasVerification ? '32px' : '12px'};
  right: 0;
  background: rgba(80, 80, 80, 0.82);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 1px 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: #d8b4fe; /* lighter violet */
  z-index: 1005;
  font-size: 9px;
  font-weight: 800;
  pointer-events: none;
  font-family: 'Inter', -apple-system, sans-serif;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  svg {
    width: 9px;
    height: 9px;
    color: #d8b4fe;
    stroke-width: 3.5px;
  }
`;

const LikesBadge = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 6px;
  padding: 1px 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: white;
  z-index: 1010;
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
  font-family: 'Inter', -apple-system, sans-serif;
  opacity: 0;
  transform: translateY(5px);
  transition: all 0.2s ease-out;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);

  ${CardContainer}: hover & {
    opacity: 1;
    transform: translateY(0);
  }

  svg {
    width: 10px;
    height: 10px;
    color: white;
  }
`;

const CreatorLink = styled.a`
  position: absolute;
  bottom: 11px;
  right: 12px;
  color: #e9d5ff; /* light violet */
  background: rgba(0, 0, 0, 0.5);
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-decoration: none;
  z-index: 10000;
  transition: all 0.2s ease;
  opacity: 0;
  transform: translateY(5px);
  cursor: pointer;
  pointer-events: auto;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 1);
  font-family: 'Inter', -apple-system, sans-serif;
  border: 1px solid rgba(255, 255, 255, 0.2);

  ${CardContainer}: hover & {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    color: white;
    background: rgba(168, 85, 247, 0.9);
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.4);
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
  z-index: 1001;
  pointer-events: auto;
  outline: none !important;
  box-shadow: ${props => props.$isFavorite ? '0 0 8px rgba(255, 59, 48, 0.3)' : 'none'};
  opacity: 0;
  transform: translateY(-10px);
  
  ${CardContainer}: hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  svg {
    fill: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'none'};
    stroke: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.8)' : 'rgba(255, 255, 255, 0.9)'};
    stroke-width: ${props => props.$isFavorite ? '2.5' : '2'};
    transition: all ${theme.transition.fast};
  }
  
  &:hover {
    transform: scale(1.1) translateY(0);
    background: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.5)' : 'rgba(0, 0, 0, 0.4)'};
    border-color: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 0.6)' : 'rgba(255, 255, 255, 0.3)'};
    box-shadow: ${props => props.$isFavorite ? '0 0 12px rgba(255, 59, 48, 0.5)' : '0 2px 8px rgba(255, 255, 255, 0.15)'};
    
    svg {
      fill: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 1)' : 'none'};
      stroke: ${props => props.$isFavorite ? 'rgba(255, 59, 48, 1)' : 'rgba(255, 255, 255, 1)'};
    }
  }
  
  &:active {
    transform: scale(0.95) translateY(0);
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
  
  @media (max-width: 768px) {
    opacity: 1 !important;
    transform: translateY(0) !important;
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

const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' | 'default' | 'danger' | 'success' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  background: ${props => {
    switch (props.$variant) {
      case 'danger': return 'rgba(220, 53, 69, 0.2)';
      case 'success': return 'rgba(40, 167, 69, 0.2)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.$variant) {
      case 'danger': return 'rgba(220, 53, 69, 0.5)';
      case 'success': return 'rgba(40, 167, 69, 0.5)';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'danger': return 'rgba(255, 200, 200, 0.95)';
      case 'success': return 'rgba(200, 255, 200, 0.95)';
      default: return 'rgba(255, 255, 255, 0.95)';
    }
  }};
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

const slideInRightPopup = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
`;

const slideInLeftPopup = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
`;

const RoleplayCardWrapper = styled.div<{ $isHovered: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: ${props => props.$isHovered ? 100 : 1};
  /* Ensure it has a stacking context but no overflow hidden */
`;

// Оверлей с ролевой ситуацией - uses absolute positioning now
// Размеры динамические - покрывает соседнюю карточку полностью
const RoleplayOverlay = styled.div<{ $visible: boolean; $isRight: boolean }>`
  position: absolute;
  top: 0;
  ${props => props.$isRight ? 'left: calc(100% + 8px);' : 'right: calc(100% + 8px);'}
  width: 100%;
  height: 100%;
  background: rgba(15, 15, 25, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.6),
    0 0 20px rgba(139, 92, 246, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: ${props => props.$visible ? 1 : 0};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  transform-origin: ${props => props.$isRight ? 'left center' : 'right center'};
  transform: ${props => {
    if (props.$visible) return 'translateX(0) scaleX(1)';
    return props.$isRight
      ? 'translateX(-20px) scaleX(0.8)'
      : 'translateX(20px) scaleX(0.8)';
  }};
  transition: 
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

  @media (max-width: 768px) {
    display: none;
  }
`;

const RoleplayText = styled.div`
  color: #e5e7eb;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 8;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  flex: 1;
`;

const RoleplayCreator = styled.a`
  font-size: 0.7rem;
  font-weight: 600;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: auto;

  &:hover {
    color: #c4b5fd;
    text-decoration: underline;
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

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

const StatsContainerMiddle = styled.div<{ $isVisible: boolean }>`
position: absolute;
top: 50%;
left: 0;
right: 0;
transform: translateY(-50%);
display: flex;
justify-content: space-between;
align-items: center;
padding: 0 ${theme.spacing.sm};
z-index: 100;
pointer-events: ${props => props.$isVisible ? 'auto' : 'none'};
opacity: ${props => props.$isVisible ? 1 : 0};
transition: opacity 0.3s ease;
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
transform: translateY(-8px); /* Подняли само имя выше */
`;

const CharacterDescription = styled.p`
font-size: ${theme.fontSize.sm};
color: rgba(255, 255, 255, 0.9);
line-height: 1.4;
margin-bottom: ${theme.spacing.sm};
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
`;

const TagsContainer = styled.div<{ $isVisible: boolean }>`
display: flex;
flex-wrap: wrap;
gap: 4px;
margin-bottom: ${theme.spacing.xs};
margin-top: 2px;
opacity: ${props => props.$isVisible ? 1 : 0};
visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
pointer-events: ${props => props.$isVisible ? 'auto' : 'none'};
transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const TagsContainerBottom = styled.div<{ $visible?: boolean }>`
position: absolute;
bottom: 0;
left: 0;
right: 0;
display: flex;
flex-wrap: nowrap;
overflow: hidden;
gap: 4px;
padding: ${theme.spacing.xs} ${theme.spacing.sm};
z-index: 101;
pointer-events: none;
opacity: ${props => (props.$visible !== false ? 1 : 0)};
visibility: ${props => (props.$visible !== false ? 'visible' : 'hidden')};
transition: opacity 0.25s ease, visibility 0.25s ease;
  
  * {
  pointer-events: auto;
  }
`;

const Tag = styled.a`
background: rgba(20, 20, 25, 0.6);
color: rgba(220, 220, 220, 0.9);
padding: 2.5px 7.5px;
border-radius: 9px;
font-size: 7.5px;
font-weight: 600;
backdrop-filter: blur(8px);
-webkit-backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.1);
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
white-space: nowrap;
text-decoration: none;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
letter-spacing: 0.02em;

  &:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: rgba(6, 182, 212, 0.5);
  transform: translateY(-1px);
  color: #22d3ee;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.2);
}
`;

const StatItemMiddle = styled.div`
display: flex;
align-items: center;
gap: 2px;
color: rgba(255, 255, 255, 0.9);
font-size: ${theme.fontSize.xs};
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
  }
  };
cursor: pointer;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
z-index: 1000;
pointer-events: auto;
outline: none;
  &:focus {
  outline: none;
}
position: absolute;
visibility: visible;
opacity: 1;
box-shadow: ${props => {
    if (props.$isActive && props.$isLike) {
      return '0 3px 14px rgba(255, 193, 7, 0.4), 0 0 0 1px rgba(255, 193, 7, 0.2)';
    }
    return '0 1px 7px rgba(0, 0, 0, 0.3)';
  }
  };
  
  ${props => props.$isLike ? `
    top: 50%;
    left: -21px;
    transform: translateY(-50%);
  `: `
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
  }
  };
  box-shadow: ${props => {
    if (props.$isLike) {
      return props.$isActive
        ? '0 5px 22px rgba(255, 193, 7, 0.5), 0 0 0 1px rgba(255, 193, 7, 0.3)' : '0 3px 14px rgba(255, 255, 255, 0.15)';
    }
    return '0 3px 14px rgba(0, 0, 0, 0.4)';
  }
  };
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
  }
  };
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

@media(min-width: 769px) {
  display: none;
}

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

@media(max-width: 768px) {
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

import { Character } from '../types/character';
import { useCharacterTranslation } from '../hooks/useCharacterTranslation';

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
  isLocked?: boolean; // Флаг заблокированного альбома
  lockedAlbumPhotos?: string[]; // Массив фото для превью заблокированного альбома (слайдшоу)
  isFavorite?: boolean; // Если true, персонаж считается в избранном (для страницы favorites)
  onFavoriteToggle?: (isFavorite: boolean) => void; // Callback при изменении статуса избранного
  userInfo?: any; // Информация о пользователе
  onNsfwToggle?: (isNsfw: boolean) => void; // Callback при изменении статуса NSFW
  showRatings?: boolean; // Показать кнопки рейтинга
  onAuthRequired?: () => void; // Callback если нужна авторизация
  isAdmin?: boolean; // New prop for admin features
  isRight?: boolean; // Direction of the roleplay popup (default: true)
  disableHover?: boolean; // Disable hover overlay
}

// Компонент слайд-шоу
const SlideShow: React.FC<{
  photos: string[];
  characterName: string;
  onPhotoClick?: (photoUrl: string) => void;
  onCurrentPhotoChange?: (photoUrl: string) => void;
  isHovered?: boolean;
  hideDots?: boolean;
}> = ({ photos, characterName, onPhotoClick, onCurrentPhotoChange, isHovered = false, hideDots = false }) => {
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
          alt={`${characterName || 'Character'} - Slide ${currentSlide + 1} `}
          eager={currentSlide === 0}
          priority={currentSlide === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
        />
      </PhotoContainer>
      {photos.length > 1 && !hideDots && (
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
const CardContent = styled.div`
position: relative;
width: 100%;
height: 100%;
overflow: hidden;
border-radius: inherit;
/* Ensure transform doesn't break fixed position children if any, though PhotoContainer is absolute */
`;

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onClick,
  showEditButton = false,
  onEdit,
  onDelete,
  onAddPhoto, // New prop
  onPhotoGeneration,
  onPaidAlbum,
  isLocked,
  lockedAlbumPhotos,
  isFavorite: isFavoriteProp = false, // Проп для установки начального состояния избранного
  onFavoriteToggle, // Callback при изменении статуса избранного
  userInfo = null, // Информация о пользователе
  onNsfwToggle, // Callback при изменении статуса NSFW
  showRatings = false, // По умолчанию не показываем кнопки лайка/дизлайка
  isAuthenticated = false, // Статус авторизации
  onAuthRequired, // Callback для открытия модального окна авторизации
  isAdmin = false, // Default to false
  isRight = true, // Default to true (open to right)
  disableHover = false // Default to false
}) => {
  const { t, i18n } = useTranslation();
  const { tChar } = useCharacterTranslation(character);
  const isMobile = useIsMobile();
  const [isLockHovered, setIsLockHovered] = useState(false);
  // КРИТИЧЕСКИ ВАЖНО: если isFavoriteProp не передан, начинаем с false
  // Это нужно для главной страницы, где проверка выполняется через API
  const [isFavorite, setIsFavorite] = useState(isFavoriteProp ?? false);
  // Если передан isFavoriteProp, сразу отключаем проверку (персонаж уже в избранном)
  const [isChecking, setIsChecking] = useState(isFavoriteProp === undefined);
  // Локальное состояние для отслеживания NSFW статуса
  const [isNsfw, setIsNsfw] = useState(
    character?.is_nsfw === true
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
    const newNsfw = character?.is_nsfw === true;
    setIsNsfw(newNsfw);
  }, [character?.is_nsfw]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(
    character.photos && character.photos.length > 0 ? character.photos[0] : null
  );

  // Обновляем currentPhotoUrl при изменении character.photos
  useEffect(() => {
    if (character.photos && character.photos.length > 0) {
      // Нормализуем первое фото-убеждаемся, что это абсолютный URL
      let firstPhoto = character.photos[0];
      if (firstPhoto && !firstPhoto.startsWith('http')) {
        if (firstPhoto.startsWith('/')) {
          firstPhoto = `${API_CONFIG.BASE_URL || window.location.origin}${firstPhoto} `;
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
  const [editingPhotos, setEditingPhotos] = useState<Array<{ url: string, prompt: string }>>([]);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<number>(character.likes ?? 0);
  const [dislikesCount, setDislikesCount] = useState<number>(character.dislikes ?? 0);
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);

  // Проверка на оригинальность персонажа
  const isOriginal = useMemo(() => {
    const tagsArr = character.tags || [];
    return tagsArr.some((t: any) => {
      const name = typeof t === 'string' ? t : (t.name || '');
      return name.toLowerCase() === 'original' || name.toLowerCase() === 'оригинальный';
    });
  }, [character.tags]);

  // Состояние для Smart Hover overlay
  const [isHovered, setIsHovered] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ isRight: true });
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0, width: 235, height: 308 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Состояние для модального окна промпта
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptTextRu, setPromptTextRu] = useState<string | null>(null);
  const [promptTextEn, setPromptTextEn] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Ролевая ситуация
  const displaySituation = tChar('situation');

  // situation variable used to guard the overlay
  const situation = displaySituation;


  // Определяем, заблокирован ли альбом.
  // Если проп isLocked передан (например из ChatContainer), используем его.
  // Иначе рассчитываем сами: если есть фото в платном альбоме и пользователь не авторизован-точно заблокирован.
  // Для авторизованных на главной без переданного isLocked считаем заблокированным, если есть фото (пока не придет инфа об обратном).
  const finalIsLocked = useMemo(() => {
    if (isLocked !== undefined) return isLocked;
    const count = character.paid_album_photos_count || 0;
    if (count === 0) return false;
    // Если не авторизован-точно заблокирован
    if (!isAuthenticated) return true;
    // Если авторизован, но проп не передан (на главной), по умолчанию считаем заблокированным
    // пока не будет загружен статус (что обычно делает ChatContainer)
    return true;
  }, [isLocked, character.paid_album_photos_count, isAuthenticated]);

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

        // Используем новые колонки вместо парсинга промпта
        if (characterData) {
          const isEn = i18n.language === 'en';
          const personalityVal = isEn ? characterData.personality_en : characterData.personality_ru;
          if (personalityVal) {
            setPersonality(personalityVal);
          } else {
            // Fallback for prompt if provided
            const prompt = characterData?.prompt || '';
            const personalityMatch = prompt.match(/Personality and Character: \s*(.*?)(?=\n\nRole-playing Situation: |$)/s);
            if (personalityMatch && personalityMatch[1]) {
              setPersonality(personalityMatch[1].trim());
            } else {
              setPersonalityError('Характер персонажа не найден');
            }
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
  const loadPromptsForPhotos = async (photoUrls: string[]): Promise<Array<{ url: string, prompt: string }>> => {
    const photosWithPrompts: Array<{ url: string, prompt: string }> = [];

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
            onFavoriteToggle(false);
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
            onFavoriteToggle(true);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));

        }
      }
    } catch (error) {

    }
  };

  // Consolidated Admin Toggle Handler
  const handleAdminToggleNSFW = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!isAdmin && !userInfo?.is_admin) return;

    const newStatus = !isNsfw;
    setIsNsfw(newStatus); // Optimistic update

    // Update local character object immediately to reflect in UI
    if (character && (character as any).raw) {
      (character as any).raw.is_nsfw = newStatus;
    }
    // Also try to update the character object itself if mutable
    (character as any).is_nsfw = newStatus;

    try {
      const identifier = character.name || (character as any).raw?.name || String(character.id);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(identifier)}/toggle-nsfw`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      const updatedChar = await response.json();
      // Update local state with server response
      setIsNsfw(updatedChar.is_nsfw === true);
      if (character && (character as any).raw) {
        (character as any).raw.is_nsfw = updatedChar.is_nsfw;
      }
      (character as any).is_nsfw = updatedChar.is_nsfw;

      // Success - dispatch event to refresh lists
      window.dispatchEvent(new CustomEvent('character-updated', { detail: { characterId: character.id } }));

      if (onNsfwToggle) onNsfwToggle(updatedChar.is_nsfw);

    } catch (error) {
      console.error('Failed to toggle NSFW:', error);
      setIsNsfw(!newStatus); // Revert
      if (character && (character as any).raw) {
        (character as any).raw.is_nsfw = !newStatus;
      }
      (character as any).is_nsfw = !newStatus;
      alert('Failed to update NSFW status');
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



  // Функция для загрузки промпта для текущего фото (characterName — для fallback на главной при URL из paid_gallery/static)
  const loadPromptForPhoto = async (photoUrl: string, characterName?: string | null) => {
    if (!photoUrl) {
      setPromptError('URL изображения отсутствует');
      return;
    }

    setIsLoadingPrompt(true);
    setPromptError(null);
    setPromptText(null);

    try {
      const result = await fetchPromptByImage(photoUrl, characterName);
      if (result.hasPrompt && (result.prompt || result.prompt_ru || result.prompt_en)) {
        setPromptText(result.prompt);
        setPromptTextRu(result.prompt_ru || null);
        setPromptTextEn(result.prompt_en || null);
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
    await loadPromptForPhoto(currentPhotoUrl, character?.name);
  };

  // Обработчик закрытия модального окна промпта
  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false);
    setIsPromptVisible(true);
    setPromptText(null);
    setPromptTextRu(null);
    setPromptTextEn(null);
    setPromptError(null);
    setModalPhotoUrl(null);
  };

  // Обработчик закрытия только промпта (оставляет фото открытым)
  const handleClosePrompt = () => {
    setIsPromptVisible(false);
  };



  const handleMouseEnter = () => {
    setIsPromptVisible(false);
  };



  const handleCardClick = (e: React.MouseEvent) => {
    // Не блокируем клики на кнопки рейтинга и другие интерактивные элементы
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[class*="RatingButton"]') ||
      target.closest('[class*="Switcher"]') ||
      target.closest('[class*="FavoriteButton"]') ||
      target.closest('[data-button="favorite"]') ||
      target.closest('[class*="ActionButton"]')
    ) {
      // Если клик по кнопке-не перехватываем
      e.stopPropagation();
      return;
    }

    // Для всего остального вызываем onClick
    if (onClick) {
      onClick(character);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return count.toString();
  };


  return (
    <>
      <RoleplayCardWrapper $isHovered={isHovered}>
        <ElectricBorder
          color="#555555"
          thickness={2}
          style={{
            borderRadius: 16,
            flex: '0 0 auto',
            width: '100%',
            position: 'relative',
            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
            transition: 'transform 0.25s ease'
          }}
        >
          <CardContainer
            ref={cardRef}
            onClick={handleCardClick}
            onMouseEnter={() => {
              setIsHovered(true);
              if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();

                // Check if there is space to the right for the overlay
                const spaceRight = window.innerWidth - rect.right;
                const isRight = spaceRight > (rect.width + 8);

                setPopupPosition({ isRight });
                // Overlay position logic removed as we use CSS positioning now
              }
            }}
            onMouseLeave={() => setIsHovered(false)}

            $isHovered={isHovered}
          >
            <CardContent>
              <PhotoContainer $isHovered={isHovered}>
                {character.photos && character.photos.length > 0 ? (
                  <SlideShow
                    photos={character.photos}
                    characterName={character.name}
                    isHovered={isHovered}
                    hideDots={true}
                  />
                ) : (
                  <OptimizedImage
                    src={character.avatar}
                    alt={character.name}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
                  />
                )}
              </PhotoContainer>

              {/* Action Buttons */}
              <ActionButtons $badgeCount={0}>
                {/* Prompt Button */}
                {character.photos && character.photos.length > 0 && (
                  <ActionButton
                    $variant="default" // Или добавить свой вариант, если нужно
                    title={t('characterCard.showPrompt', 'Show Prompt')}
                    onClick={handleOpenPromptModal}
                  >
                    <Sparkles size={16} />
                  </ActionButton>
                )}

                {/* Album Button */}
                {onPaidAlbum && (
                  <ActionButton
                    $variant="default"
                    title={t('characterCard.openAlbum', 'Open Album')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPaidAlbum(character);
                    }}
                  >
                    <FiImage size={16} /> {/* Using FiImage for Album */}
                  </ActionButton>
                )}
                {/* Admin NSFW Toggle */}
                {(isAdmin || userInfo?.is_admin) && (
                  <ActionButtonWithTooltip onClick={handleAdminToggleNSFW}>
                    <ActionButton $variant={isNsfw ? "danger" : "success"}>
                      {isNsfw ? <FiAlertTriangle /> : <FiShield />}
                    </ActionButton>
                    <Tooltip>
                      {isNsfw ? 'Make Safe' : 'Make NSFW'}
                    </Tooltip>
                  </ActionButtonWithTooltip>
                )}

                {/* Edit Button */}
                {showEditButton && onEdit && (
                  <ActionButton
                    $variant="edit"
                    title={t('common.edit')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(character);
                    }}
                  >
                    <FiEdit />
                  </ActionButton>
                )}
                {showEditButton && onDelete && (
                  <ActionButton
                    $variant="delete"
                    title={t('common.delete')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(character);
                    }}
                  >
                    <FiTrash2 />
                  </ActionButton>
                )}
              </ActionButtons>

              {/* Locked Album Preview Overlay */}
              {finalIsLocked && (
                <div
                  className="absolute inset-0 z-[9999] flex items-center justify-center rounded-lg overflow-hidden animate-fade-in"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPaidAlbum) onPaidAlbum(character);
                  }}
                >
                  {/* 1. Underlying Blur */}
                  <div className="absolute inset-0 backdrop-blur-[5px] pointer-events-none" />

                  {/* 2. Sliding Blurred Photos */}
                  <div className="absolute inset-0 z-0">
                    {(() => {
                      const normalizeUrl = (url: string) => {
                        if (!url) return '';
                        let processedUrl = url;
                        if (url.includes('storage.yandexcloud.net/')) {
                          if (url.includes('.storage.yandexcloud.net/')) {
                            const objectKey = url.split('.storage.yandexcloud.net/')[1];
                            if (objectKey) processedUrl = `${API_CONFIG.BASE_URL || ''}/media/${objectKey}`;
                          } else {
                            const parts = url.split('storage.yandexcloud.net/')[1];
                            if (parts) {
                              const pathSegments = parts.split('/');
                              if (pathSegments.length > 1) {
                                processedUrl = `${API_CONFIG.BASE_URL || ''}/media/${pathSegments.slice(1).join('/')}`;
                              }
                            }
                          }
                        }
                        if (processedUrl.startsWith('http')) return processedUrl;
                        const baseUrl = API_CONFIG.BASE_URL || window.location.origin;
                        if (processedUrl.startsWith('/')) {
                          return baseUrl ? `${baseUrl}${processedUrl}` : processedUrl;
                        }
                        return baseUrl ? `${baseUrl}/${processedUrl}` : `/${processedUrl}`;
                      };

                      const rawPreviewPhotos = (lockedAlbumPhotos && lockedAlbumPhotos.length > 0)
                        ? [...lockedAlbumPhotos] : (character.paid_album_preview_urls && character.paid_album_preview_urls.length > 0)
                          ? [...character.paid_album_preview_urls] : (character.photos && character.photos.length > 0 ? [character.photos[0]] : []);

                      const previewPhotos = rawPreviewPhotos.map(normalizeUrl);
                      const hasPreview = (lockedAlbumPhotos && lockedAlbumPhotos.length > 0) ||
                        (character.paid_album_preview_urls && character.paid_album_preview_urls.length > 0);

                      return previewPhotos.length > 0 ? (
                        <div className={`absolute inset-0 z-0 ${hasPreview ? 'blur-[10px]' : 'blur-[50px] grayscale brightness-50'} opacity-70 transition-all duration-1000`}>
                          <SlideShow
                            photos={previewPhotos}
                            characterName={character.name}
                            isHovered={true}
                            hideDots={true}
                          />
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* 3. Dark gradient */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-5" />

                  {/* 4. The Lock Icon Overlay */}
                  <div className="relative z-10 flex flex-col items-center justify-center w-full h-full cursor-pointer transition-all duration-500">
                    <div className={`flex flex-col items-center transition-all duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}>
                      <div className="relative mb-6">
                        <div className={`absolute inset-0 blur-3xl opacity-50 transition-colors duration-500 ${isHovered ? 'bg-pink-500' : 'bg-white'}`} />
                        <div className="relative transform transition-all duration-500 ease-out">
                          {isHovered ? (
                            <FiUnlock className="w-24 h-24 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                          ) : (
                            <FiLock className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                          )}
                        </div>
                      </div>
                      <div className="text-center px-4 transform transition-all duration-500 delay-100">
                        <div className="text-white/70 text-xs uppercase tracking-[0.2em] font-medium mb-2 drop-shadow-sm">
                          {t('characterCard.exclusiveContent')}
                        </div>
                        <h3 className="text-white text-xl font-semibold tracking-tight leading-tight mb-2 drop-shadow-xl">
                          {t('characterCard.getAccess').split(' ').slice(0, 2).join(' ')} <br /> {t('characterCard.getAccess').split(' ').slice(2).join(' ')}
                        </h3>
                        <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/80 to-purple-600/80 backdrop-blur-md border border-white/20 text-white text-sm font-medium shadow-lg transform transition-all duration-300 hover: scale-105">
                          {tChar('name')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification and Badges (only if not locked and original) */}
              {!finalIsLocked && character.creator_username === 'admin' && (
                <VerificationBadge>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http: //www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </VerificationBadge>
              )}

              {/* Favorite Button */}
              <FavoriteButton
                $isFavorite={isFavorite}
                onClick={toggleFavorite}
                style={{ zIndex: 3 }}
              >
                <FiHeart />
              </FavoriteButton>

              {/* Bottom Content Overlay (Name, Stats, Tags) - Hidden on hover overlay */}
              {!(isHovered && situation) && (
                <>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '40px 12px 12px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}>
                    <StatsContainer>
                      <StatItem>
                        <FiMessageSquare size={12} />
                        {formatCount(character.comments)}
                      </StatItem>
                      <div style={{ flex: 1 }} />
                    </StatsContainer>

                    <CharacterName style={{ pointerEvents: 'auto', marginTop: '4px' }}>{tChar('name')}</CharacterName>
                  </div>

                  <TagsContainerBottom $visible={isHovered}>
                    {character.tags.slice(0, 3).map((tag, i) => (
                      <Tag key={i} onClick={(e) => e.stopPropagation()}>
                        {typeof tag === 'string' ? tag : (tag as any).name}
                      </Tag>
                    ))}
                  </TagsContainerBottom>
                </>
              )}
            </CardContent>


          </CardContainer>

        </ElectricBorder>

        {/* Roleplay Situation Overlay - absolute positioned relative to CardWrapper */}
        {!isMobile && !disableHover && (
          <RoleplayOverlay
            $visible={isHovered}
            $isRight={isRight}
          >
            <RoleplayText>{displaySituation || t('characterCard.noSituation')}</RoleplayText>

            {character.tags && character.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto', marginBottom: '8px' }}>
                {character.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ccc'
                    }}
                  >
                    {typeof tag === 'string' ? tag : (tag as any).name}
                  </span>
                ))}
              </div>
            )}

            <RoleplayCreator
              href={`/profile/${character.creator_username || 'anonymous'}`}
              onClick={(e) => e.stopPropagation()}
            >
              @{character.creator_username || 'anonymous'}
            </RoleplayCreator>
          </RoleplayOverlay>
        )}

      </RoleplayCardWrapper>

      {/* Modals */}
      {
        isPersonalityModalOpen && createPortal(
          <PersonalityModal onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPersonalityModalOpen(false);
            }
          }}>
            <PersonalityModalContent onClick={(e) => e.stopPropagation()}>
              <PersonalityModalHeader>
                <PersonalityModalTitle>{t('characterCard.personality', { name: character.name })}</PersonalityModalTitle>
                <PersonalityModalCloseButton onClick={() => setIsPersonalityModalOpen(false)}>
                  <CloseIcon />
                </PersonalityModalCloseButton>
              </PersonalityModalHeader>
              {isLoadingPersonality ? (
                <PersonalityLoading>{t('characterCard.loadingPersonality')}</PersonalityLoading>
              ) : personalityError ? (
                <PersonalityError>{personalityError}</PersonalityError>
              ) : personality ? (
                <PersonalityText>{personality}</PersonalityText>
              ) : (
                <PersonalityLoading>{t('characterCard.personalityNotFound')}</PersonalityLoading>
              )}
            </PersonalityModalContent>
          </PersonalityModal>,
          document.body
        )
      }

      {
        isEditPromptModalOpen && editingPhotos.length > 0 && createPortal(
          <EditPromptModal onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditPromptModalOpen(false);
              setEditingPhotos([]);
              setPromptSaveError(null);
            }
          }}>
            <EditPromptModalContent onClick={(e) => e.stopPropagation()}>
              <EditPromptModalHeader>
                <EditPromptModalTitle>{t('characterCard.editPrompts')}</EditPromptModalTitle>
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
                      placeholder={t('characterCard.enterPrompt')}
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
                  {t('common.cancel')}
                </EditPromptCancelButton>
                <EditPromptSaveButton
                  onClick={handleSaveAdminPrompt}
                  disabled={isSavingPrompt}
                >
                  {isSavingPrompt ? t('characterCard.saving', 'Saving...') : t('characterCard.saveAll')}
                </EditPromptSaveButton>
              </EditPromptButtonGroup>
            </EditPromptModalContent>
          </EditPromptModal>,
          document.body
        )
      }

      <PromptGlassModal
        isOpen={isPromptModalOpen && !!modalPhotoUrl}
        onClose={handleClosePromptModal}
        imageUrl={modalPhotoUrl || ''}
        imageAlt={character.name}
        promptText={promptText}
        promptTextRu={promptTextRu}
        promptTextEn={promptTextEn}
        isLoading={isLoadingPrompt}
        error={promptError}
      />
    </>
  );
};
