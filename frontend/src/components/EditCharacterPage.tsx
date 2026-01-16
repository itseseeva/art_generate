import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { authManager } from '../utils/auth';
import { theme } from '../theme';
import { API_CONFIG } from '../config/api';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import { LoadingSpinner } from './LoadingSpinner';
import { CircularProgress } from './ui/CircularProgress';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish, translateToRussian } from '../utils/translate';
import { FiX as CloseIcon, FiSettings, FiClock, FiCheckCircle } from 'react-icons/fi';
import { Plus, Sparkles, Zap } from 'lucide-react';
import { BiCoinStack } from 'react-icons/bi';

import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';
import { PromptGlassModal } from './PromptGlassModal';

/**
 * Нормализует URL изображения для локальной разработки.
 * Заменяет продакшен домен (cherrylust.art) на локальный API.
 */
const normalizeImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // Если это локальный URL или не начинается с http - нормализуем
  if (!url.startsWith('http')) {
    const baseUrl = API_CONFIG.BASE_URL || '';
    if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    return `${baseUrl}/${url}`;
  }
  
  // В development режиме заменяем продакшен домен на локальный
  if (import.meta.env.DEV) {
    // Заменяем cherrylust.art на локальный бэкенд
    if (url.includes('cherrylust.art')) {
      const baseUrl = API_CONFIG.BASE_URL || 'http://localhost:8001';
      // Извлекаем путь после домена
      const urlPath = url.replace(/https?:\/\/[^\/]+/, '');
      return `${baseUrl}${urlPath}`;
    }
  }
  
  return url;
};

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

const MainContainer = styled.div<{ $isMobile?: boolean }>`
  width: 100%;
  min-height: 100vh; /* Используем min-height вместо фиксированной height */
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom right, rgba(8, 8, 18, 1), rgba(8, 8, 18, 0.95), rgba(40, 40, 40, 0.1));
  overflow-x: hidden;
  overflow-y: auto; /* Разрешаем скролл */
  box-sizing: border-box;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 80px;
    left: 40px;
    width: 288px;
    height: 288px;
    background: rgba(80, 80, 80, 0.15);
    border-radius: 50%;
    filter: blur(96px);
    animation: float 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 80px;
    right: 40px;
    width: 384px;
    height: 384px;
    background: rgba(60, 60, 60, 0.15);
    border-radius: 50%;
    filter: blur(96px);
    animation: float 8s ease-in-out infinite;
    animation-delay: 1s;
    pointer-events: none;
    z-index: 0;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;


const Header = styled.div`
  background: rgba(30, 30, 30, 0.6);
  backdrop-filter: blur(32px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(120, 120, 120, 0.5);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(120, 120, 120, 0.5), transparent);
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  
  &:hover {
    color: ${theme.colors.text.primary};
    background: rgba(100, 100, 100, 0.1);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const PageTitle = styled.h2`
  background: linear-gradient(to right, rgba(200, 200, 200, 1), rgba(150, 150, 150, 1), rgba(120, 120, 120, 0.9));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  
  &::before {
    content: '';
    font-size: ${theme.fontSize.lg};
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid rgba(130, 130, 130, 0.4);
`;

const UserName = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const UserCoins = styled.span`
  color: rgba(226, 232, 240, 0.85);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const AuthButton = styled.button`
  background: rgba(31, 41, 55, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: ${theme.transition.fast};
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.35);
  margin-left: ${theme.spacing.sm};
  
  &:hover {
    background: rgba(55, 65, 81, 0.9);
    border-color: rgba(226, 232, 240, 0.35);
    color: ${theme.colors.text.primary};
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.45);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex !important;
  flex-direction: row;
  /* Убираем min-height: 0 - это было причиной проблемы */
  min-height: 500px !important; 
  padding: ${theme.spacing.lg};
  gap: ${theme.spacing.lg};
  visibility: visible !important;
  opacity: 1 !important;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    padding: ${theme.spacing.md};
  }
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 300px;
  height: 100%;
  max-height: 100%;
  visibility: visible;
  opacity: 1;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 2px solid rgba(60, 60, 60, 0.9);
  border-radius: ${theme.borderRadius.xl};
  overflow: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    height: auto;
    max-height: none;
    overflow: visible;
  }
`;

const PhotoGenerationContainer = styled.div<{ $isMobile?: boolean; $isFullscreen?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: ${props => props.$isMobile ? '0' : '400px'};
  background: rgba(39, 39, 42, 0.5);
  border: 1px solid rgba(63, 63, 70, 1);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 768px) {
    position: ${props => props.$isFullscreen ? 'fixed' : 'relative'};
    top: ${props => props.$isFullscreen ? '0' : 'auto'};
    left: ${props => props.$isFullscreen ? '0' : 'auto'};
    right: ${props => props.$isFullscreen ? '0' : 'auto'};
    bottom: ${props => props.$isFullscreen ? '0' : 'auto'};
    width: ${props => props.$isFullscreen ? '100vw' : '100%'};
    height: ${props => props.$isFullscreen ? '100vh' : 'auto'};
    min-height: ${props => props.$isFullscreen ? '100vh' : 'auto'};
    max-height: ${props => props.$isFullscreen ? '100vh' : 'none'};
    z-index: ${props => props.$isFullscreen ? '9999' : 'auto'};
    border-radius: ${props => props.$isFullscreen ? '0' : theme.borderRadius.xl};
    padding: ${props => props.$isFullscreen ? theme.spacing.lg : theme.spacing.xl};
    overflow-y: ${props => props.$isFullscreen ? 'auto' : 'visible'};
    min-width: 0;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: row;
  flex: 1;
  width: 100%;
  gap: ${theme.spacing.lg};
  min-height: 0;
  visibility: visible;
  opacity: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
  }
`;

const ColumnContent = styled.div`
  padding: ${theme.spacing.sm} !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 300px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
  width: 100% !important;

  @media (max-width: 768px) {
    min-height: auto !important;
    overflow-y: visible !important;
  }
  z-index: 10 !important;
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  box-sizing: border-box !important;
  gap: ${theme.spacing.md} !important;
  
  /* Кастомный скроллбар */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(15, 15, 15, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.6);
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    
    &:hover {
      background: rgba(100, 100, 100, 0.7);
    }
  }
  
  /* Убеждаемся, что все дочерние элементы не выходят за границы */
  > * {
    max-width: 100%;
    box-sizing: border-box;
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.lg} !important;
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(22, 22, 22, 0.98) 100%);
  border-radius: ${theme.borderRadius.lg} !important;
  padding: ${theme.spacing.lg} !important;
  border: 1px solid rgba(70, 70, 70, 0.8) !important;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: auto !important;
  box-sizing: border-box !important;
  overflow: visible !important;
  word-wrap: break-word !important;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 0 0 1px rgba(0, 0, 0, 0.2);
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;

  @media (max-width: 768px) {
    padding: ${theme.spacing.md} !important;
    margin-bottom: ${theme.spacing.md} !important;
  }
  
  /* Убеждаемся, что все дочерние элементы видны */
  > * {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(100, 100, 100, 0.4), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: rgba(100, 100, 100, 0.9) !important;
    background: linear-gradient(135deg, rgba(18, 18, 18, 0.98) 0%, rgba(25, 25, 25, 1) 100%) !important;
    box-shadow: 
      0 6px 24px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:nth-child(1) {
    animation-delay: 0.05s;
  }
  &:nth-child(2) {
    animation-delay: 0.1s;
  }
  &:nth-child(3) {
    animation-delay: 0.15s;
  }
  &:nth-child(4) {
    animation-delay: 0.2s;
  }
  &:nth-child(5) {
    animation-delay: 0.25s;
  }
  &:nth-child(6) {
    animation-delay: 0.3s;
  }
  &:nth-child(7) {
    animation-delay: 0.35s;
  }
  &:nth-child(8) {
    animation-delay: 0.4s;
  }
`;

const Label = styled.label`
  display: flex !important;
  align-items: center !important;
  gap: ${theme.spacing.sm} !important;
  color: rgba(230, 230, 230, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-weight: 700 !important;
  margin-bottom: ${theme.spacing.md} !important;
  visibility: visible !important;
  opacity: 1 !important;

  @media (max-width: 768px) {
    font-size: ${theme.fontSize.sm} !important;
    margin-bottom: ${theme.spacing.sm} !important;
  }
  opacity: 1 !important;
  width: 100% !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 13px;
  
  &::before {
    content: attr(data-icon);
    width: 36px;
    height: 36px;
    border: 2px solid rgba(90, 90, 90, 0.7);
    border-radius: ${theme.borderRadius.md};
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(200, 200, 200, 1);
    background: linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(35, 35, 35, 0.9) 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    font-size: 18px;
    flex-shrink: 0;
  }
  
  ${FormGroup}:hover &::before {
    border-color: rgba(120, 120, 120, 0.9);
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 1) 100%);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 12px rgba(100, 100, 100, 0.2);
    transform: scale(1.05);
  }
`;

const Input = styled.input`
  width: 100% !important;
  max-width: 100% !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: 52px !important;
  padding: 0 ${theme.spacing.lg} !important;
  border: 2px solid rgba(70, 70, 70, 0.8) !important;
  border-radius: ${theme.borderRadius.md} !important;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%) !important;
  color: rgba(240, 240, 240, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-weight: 500 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.3) !important;
  margin: 0 !important;
  margin-top: 0 !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
  flex-shrink: 0 !important;
  
  &::placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
    font-weight: 400 !important;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(120, 120, 120, 1) !important;
    background: linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%) !important;
    box-shadow: 
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0 0 3px rgba(100, 100, 100, 0.15),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(85, 85, 85, 0.9) !important;
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.4) !important;
  }
  
  /* Убеждаемся, что текст всегда виден */
  &::-webkit-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &::-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-ms-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
`;

const Textarea = styled.textarea`
  width: 100% !important;
  max-width: 100% !important;
  min-height: 140px !important;
  height: auto !important;
  padding: ${theme.spacing.lg} !important;
  border: 2px solid rgba(70, 70, 70, 0.8) !important;
  border-radius: ${theme.borderRadius.md} !important;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%) !important;
  color: rgba(240, 240, 240, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-family: inherit !important;
  font-weight: 500 !important;
  resize: vertical;
  line-height: 1.7 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  white-space: pre-wrap !important;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.3) !important;
  margin: 0 !important;
  margin-top: 0 !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
  flex-shrink: 0 !important;
  
  &::placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
    font-weight: 400 !important;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(120, 120, 120, 1) !important;
    background: linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%) !important;
    box-shadow: 
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0 0 3px rgba(100, 100, 100, 0.15),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(85, 85, 85, 0.9) !important;
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.4) !important;
  }
  
  /* Убеждаемся, что текст всегда виден */
  &::-webkit-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &::-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-ms-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.xl};
  animation: fadeIn 0.6s ease-out forwards;
  animation-delay: 0.8s;
  opacity: 1;
  visibility: visible;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  height: 56px;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(251, 191, 36, 0.6);
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9));
  color: #1a1a1a;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3), 0 0 15px rgba(234, 179, 8, 0.2);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transition: left 0.6s ease;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(234, 179, 8, 0.4);
    border-color: rgba(251, 191, 36, 0.9);
    filter: brightness(1.1);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active:not(:disabled) {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(234, 179, 8, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: rgba(60, 60, 60, 0.5);
    color: rgba(150, 150, 150, 0.5);
    border-color: rgba(80, 80, 80, 0.5);
    box-shadow: none;
  }
`;

const CoinsDisplay = styled.div`
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(150, 150, 150, 0.4);
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const CoinsText = styled.span`
  color: rgba(226, 232, 240, 0.85);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  color: rgba(200, 200, 200, 0.9);
  background: rgba(60, 60, 60, 0.3);
  border: 1px solid rgba(120, 120, 120, 0.5);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

const SuccessMessage = styled.div`
  color: rgba(200, 200, 200, 0.9);
  background: rgba(60, 60, 60, 0.3);
  border: 1px solid rgba(150, 150, 150, 0.5);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

const HintDescription = styled.span`
  color: ${theme.colors.text.secondary};
`;

const PhotoGenerationPlaceholder = styled.div`
  background: transparent;
  border: 1px solid rgba(130, 130, 130, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
  min-height: calc(120vh - 300px);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PhotoModal = styled.div`
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
  cursor: pointer;
`;

const PhotoModalContent = styled.div`
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

const PhotoModalImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: ${theme.borderRadius.xl};
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
  display: block !important;
  visibility: visible !important;

  @media (max-width: 768px) {
    max-height: 100%;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
`;

const PhotoModalClose = styled.button`
  position: fixed;
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  transition: all ${theme.transition.fast};
  cursor: pointer;
  z-index: 10003;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(0, 0, 0, 0.8);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.1);
  }
`;

const ModalImageContainer = styled.div`
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

const PromptPanel = styled.div`
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
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;

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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const PromptPanelTitle = styled.h3`
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

const PromptPanelText = styled.div`
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

const PhotoStatus = styled.span<{ isSelected?: boolean }>`
  position: absolute;
  top: ${theme.spacing.sm};
  left: ${theme.spacing.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${props => props.isSelected
    ? 'rgba(34, 197, 94, 0.9)'
    : 'rgba(100, 100, 100, 0.8)'};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${props => props.isSelected
    ? 'rgba(74, 222, 128, 0.6)'
    : 'rgba(255, 255, 255, 0.3)'};
  pointer-events: none;
`;

const FullSizePhotoSlider = styled.div`
  position: relative;
  width: 100%;
  background: rgba(30, 30, 30, 0.8);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(120, 120, 120, 0.3);
  padding: ${theme.spacing.xl};
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  overflow: visible;
`;

const GeneratedPhotosHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.md};
`;

const GeneratedPhotosTitle = styled.h3`
  margin: 0;
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  color: ${theme.colors.text.primary};
`;

const GenerationQueueIndicator = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  margin-top: ${theme.spacing.md};
`;

const QueueBar = styled.div<{ $isFilled: boolean }>`
  width: 8px;
  height: 20px;
  background: ${props => props.$isFilled ? '#FFD700' : 'rgba(150, 150, 150, 0.5)'};
  border-radius: 2px;
  transition: background 0.2s ease;
`;

const QueueLabel = styled.div`
  font-size: 0.7rem;
  color: #888;
  text-align: right;
`;

const PhotoGenerationBox = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(20, 20, 20, 0.4);
  border: 1px solid rgba(150, 150, 150, 0.2);
  border-radius: ${theme.borderRadius.lg};
`;

const PhotoGenerationBoxTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm} 0;
`;

const PhotoGenerationDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  margin: 0 0 ${theme.spacing.md} 0;
  line-height: 1.4;
`;

const GenerateSection = styled.div`
  margin-top: ${theme.spacing.lg};
`;

const GenerationArea = styled.div`
  background: rgba(20, 20, 20, 0.4);
  border: 1px solid rgba(150, 150, 150, 0.2);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
`;

const GenerateButton = styled.button`
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    filter: brightness(1.1);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    background: rgba(60, 60, 60, 0.5);
    color: rgba(150, 150, 150, 0.8);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const ModelSelectionContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: visible;
  padding-bottom: ${theme.spacing.md};
  padding-top: ${theme.spacing.xs};
  flex-wrap: wrap;
`;

const ModelCard = styled.div<{ $isSelected: boolean; $previewImage: string }>`
  flex: 0 0 200px;
  height: 300px;
  background: ${props => props.$isSelected 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)' 
    : 'rgba(30, 30, 30, 0.4)'};
  backdrop-filter: blur(8px);
  border: 2px solid ${props => props.$isSelected 
    ? '#8b5cf6' 
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: ${theme.borderRadius.lg};
  padding: 0;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url(${props => props.$previewImage});
    background-size: cover;
    background-position: center;
    opacity: 1;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.25);
    border-color: #8b5cf6;
    
    &::after {
      transform: scale(1.08);
    }
  }

  & > * {
    position: relative;
    z-index: 1;
  }
`;

const ModelInfoOverlay = styled.div`
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: ${theme.spacing.md};
  width: 100%;
`;

const ModelName = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`;

const ModelDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin: 0;
`;

const TagsContainer = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  max-height: ${props => props.$isExpanded ? '500px' : '36px'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
`;

const TagButton = styled.button`
  background: rgba(40, 40, 40, 0.6);
  border: 1px solid rgba(80, 80, 80, 0.3);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 11px;
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(60, 60, 60, 0.8);
    color: ${theme.colors.text.primary};
    border-color: rgba(100, 100, 100, 0.5);
  }
`;

const ExpandButton = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  transition: all 0.3s ease;

  &:hover {
    color: ${theme.colors.text.primary};
  }

  svg {
    transform: rotate(${props => props.$isExpanded ? '180deg' : '0deg'});
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    animation: ${props => props.$isExpanded ? 'none' : 'arrowBounce 2s infinite'};
  }

  @keyframes arrowBounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    40% {
      transform: translateY(5px) rotate(0deg);
    }
    60% {
      transform: translateY(3px) rotate(0deg);
    }
  }
`;

const ProgressBarContainer = styled.div`
  margin-top: 1.25rem;
  padding: 1rem;
  background: rgba(20, 20, 20, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${theme.borderRadius.md};
  animation: slideIn 0.3s ease-out;
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const StepItem = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  opacity: ${props => (props.$isActive || props.$isCompleted ? 1 : 0.4)};
  transition: opacity 0.3s ease;
`;

const StepIcon = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  background: ${props => props.$isCompleted ? '#10b981' : (props.$isActive ? '#8b5cf6' : 'rgba(150, 150, 150, 0.2)')};
  color: white;
  border: 1px solid ${props => props.$isCompleted ? '#10b981' : (props.$isActive ? '#8b5cf6' : 'rgba(150, 150, 150, 0.3)')};
  box-shadow: ${props => props.$isActive ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none'};
`;

const StepText = styled.span<{ $isActive: boolean; $isCompleted: boolean }>`
  font-size: 0.75rem;
  color: ${props => props.$isCompleted ? '#10b981' : (props.$isActive ? '#ffffff' : '#888888')};
  font-weight: ${props => (props.$isActive || props.$isCompleted ? 600 : 400)};
`;

const WarningText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 0.75rem;
  margin-top: 10px;
  padding: 0 4px;
`;

const CoinsBalance = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  color: #fbbf24;
  font-size: 0.875rem;
  font-weight: 600;
  
  svg {
    color: #fbbf24;
  }
`;

const LegalStyleText = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.xs};
  line-height: 1.4;
  opacity: 0.8;
`;

const PhotosCounter = styled.div<{ $limitReached: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: ${({ $limitReached }) => 
    $limitReached ? 'rgba(180, 180, 180, 0.9)' : theme.colors.text.secondary};
  background: rgba(40, 40, 40, 0.6);
  border: 1px solid ${({ $limitReached }) => 
    $limitReached ? 'rgba(150, 150, 150, 0.5)' : 'rgba(120, 120, 120, 0.3)'};
`;

const PhotoList = styled.div`
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
  gap: ${theme.spacing.sm} !important;
  margin-top: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  visibility: visible !important;
  opacity: 1 !important;
  width: 100% !important;
  box-sizing: border-box !important;
  align-content: start !important;
  grid-auto-rows: min-content !important;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
    padding: ${theme.spacing.sm};
    gap: 8px !important;
  }
`;

const PhotoTile = styled.div`
  position: relative;
  border-radius: ${theme.borderRadius.lg};
  overflow: hidden;
  border: 2px solid rgba(120, 120, 120, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  background: rgba(30, 30, 30, 0.95);
  transition: all 0.3s ease;
  height: 300px;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  cursor: pointer;
  z-index: 1;

  @media (max-width: 768px) {
    height: 300px;
    min-height: 300px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
    border-color: rgba(180, 180, 180, 0.5);
    z-index: 10;
  }
`;

const PhotoImage = styled.img`
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  background: #333;
  cursor: pointer;
  user-select: none;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${theme.spacing.sm};
  display: flex !important;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.9) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  height: 60px;
  
  ${PhotoTile}:hover & {
    opacity: 1;
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    opacity: 1;
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.6);
    height: 50px;
  }
`;

const OverlayButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
`;

const OverlayButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.375rem 0.75rem;
  background: ${props => props.$variant === 'primary' 
    ? 'rgba(100, 100, 100, 0.9)' 
    : 'rgba(255, 255, 255, 0.15)'};
  border: 1px solid ${props => props.$variant === 'primary'
    ? 'rgba(150, 150, 150, 1)'
    : 'rgba(255, 255, 255, 0.2)'};
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
    background: ${props => props.$variant === 'primary'
      ? 'rgba(120, 120, 120, 1)'
      : 'rgba(255, 255, 255, 0.25)'};
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

const SliderDescription = styled.div`
  margin-top: ${theme.spacing.lg};
  text-align: center;
  padding: ${theme.spacing.lg};
  background: rgba(40, 40, 40, 0.3);
  border-radius: ${theme.borderRadius.lg};
`;

const DescriptionTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  margin: 0 0 ${theme.spacing.md} 0;
`;

const DescriptionText = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
  margin: 0 0 ${theme.spacing.lg} 0;
  line-height: 1.5;
`;


const LargeTextInput = styled.textarea`
  background: rgba(40, 40, 40, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(120, 120, 120, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: vertical;
  flex: 1;
  width: 100%;
  min-height: 200px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 0.5);
    box-shadow: 0 0 0 2px rgba(120, 120, 120, 0.3), inset 0 2px 6px rgba(0, 0, 0, 0.4);
  }
`;

const LargeTextLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
`;


interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[];
  tags: string[];
  author: string;
  likes: number;
  views: number;
  comments: number;
}

interface EditCharacterPageProps {
  character: Character;
  onBackToEditList: () => void;
  onBackToMain: () => void;
  onShop: () => void;
  onProfile?: () => void;
  onCreateCharacter: () => void;
  onEditCharacters: () => void;
}

const MAX_MAIN_PHOTOS = 3;

export const EditCharacterPage: React.FC<EditCharacterPageProps> = ({
  character,
  onBackToEditList,
  onBackToMain,
  onShop,
  onProfile,
  onCreateCharacter,
  onEditCharacters
}) => {
  const isMobile = useIsMobile();
  const generationSectionRef = useRef<HTMLDivElement>(null);
  
  
  
  useEffect(() => {
    
    window.history.pushState({ page: 'edit-character' }, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page === 'edit-character') {
        if (onBackToEditList) {
          onBackToEditList();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackToEditList]);

  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    situation: '',
    instructions: '',
    style: '',
    appearance: '',
    location: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  // Начинаем с true только если есть character prop
  const [isLoadingData, setIsLoadingData] = useState(!!character?.name || !!character?.id);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number, subscription?: {subscription_type?: string}} | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<{credits_remaining: number} | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPromptManuallySet, setCustomPromptManuallySet] = useState(false); // Флаг, что пользователь вручную установил промпт
  const CHARACTER_EDIT_COST = 30; // Кредиты за редактирование персонажа
  const balanceUpdateInProgressRef = useRef(false); // Флаг для предотвращения перезаписи баланса
  // Refs для предотвращения race condition при загрузке данных персонажа
  const lastLoadedIdentifierRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  // Безопасная инициализация characterIdentifier с fallback
  // КРИТИЧНО: Используем name из character prop (это реальное имя из БД)
  const [characterIdentifier, setCharacterIdentifier] = useState<string>(() => {
    const name = character?.name || character?.id?.toString() || '';
    
    
    return name;
  });
  type SelectedPhoto = { id: string; url: string };
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [generationProgress, setGenerationProgress] = useState<number | undefined>(undefined);
  const generationQueueRef = useRef<number>(0); // Счетчик задач в очереди
  const initialPhotosCountRef = useRef<number>(0); // Количество фото при загрузке страницы
  const customPromptRef = useRef<string>(''); // Ref для актуального промпта
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);

  // Функции для авторизации
  const handleLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await authManager.logout();
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      setUserInfo(null);
      window.location.href = '/';
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
  };

  // Безопасное обновление characterIdentifier при изменении character
  useEffect(() => {
    const newName = character?.name || character?.id?.toString() || '';
    console.log('[EditCharacterPage useEffect character change]:', { 
      newName, 
      characterIdentifier, 
      characterProp: character,
      willUpdate: newName && newName !== characterIdentifier
    });
    
    if (newName && newName !== characterIdentifier) {
      console.log('[EditCharacterPage] Updating characterIdentifier from', characterIdentifier, 'to', newName);
      setCharacterIdentifier(newName);
      // Данные загрузятся автоматически через useEffect для characterIdentifier
    } else if (!newName && !characterIdentifier) {
      console.log('[EditCharacterPage] No name and no identifier, setting isLoadingData=false');
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [character?.name, character?.id]); // Убираем characterIdentifier из зависимостей, чтобы избежать циклов

  const fetchCharacterPhotos = useCallback(async (targetName?: string) => {
    const effectiveName = (targetName ?? characterIdentifier)?.trim();
    if (!effectiveName) {
      
      setIsLoadingPhotos(false);
      setGeneratedPhotos([]);
      return;
    }
    
    try {
      setIsLoadingPhotos(true);
      
      
      // Добавляем timestamp для обхода кеша
      const cacheBuster = `?t=${Date.now()}`;
      const photosUrl = API_CONFIG.CHARACTER_PHOTOS_FULL(effectiveName);
      const urlWithCache = photosUrl.includes('?') 
        ? `${photosUrl}&t=${Date.now()}` 
        : `${photosUrl}${cacheBuster}`;
      
      const response = await authManager.fetchWithAuth(urlWithCache, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        
        
        
        // НЕ показываем ошибку - просто пустой массив
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      const photos = await response.json();
      
      
      
      
      
      if (!Array.isArray(photos)) {
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      if (photos.length === 0) {
        
        
        
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }
      
      

      const formattedPhotos = photos.map((photo: any, index: number) => {
        const photoId = photo.id?.toString() ?? (photo.url ? `photo_${index}_${Date.now()}` : String(Date.now()));
        // Нормализуем URL для локальной разработки
        const photoUrl = normalizeImageUrl(photo.url);
        
        if (!photoUrl) {
          console.warn('[EditCharacterPage] Photo without URL:', photo);
        }
        
        return {
          id: photoId,
          url: photoUrl,
          isSelected: Boolean(photo.is_main),
          created_at: photo.created_at ?? null
        };
      }).filter(photo => photo.url) // Фильтруем фотографии без URL
        .filter((photo, index, self) => 
          index === self.findIndex(p => p.url === photo.url)
        ); // Удаляем дубликаты по URL

      
      
      

      setGeneratedPhotos(formattedPhotos);
      initialPhotosCountRef.current = formattedPhotos.length; // Сохраняем начальное количество фото
      
      
      const selected = formattedPhotos
        .filter(photo => photo.isSelected)
        .slice(0, 3)
        .map(photo => ({ id: photo.id, url: photo.url }));
      
      
      setSelectedPhotos(selected);
      setIsLoadingPhotos(false);
      
    } catch (error) {
      
      // НЕ показываем ошибку - просто пустой массив
      setGeneratedPhotos([]);
      setSelectedPhotos([]);
      setIsLoadingPhotos(false);
    }
  }, [characterIdentifier]);

  // Загружаем фото при изменении characterIdentifier или character prop
  useEffect(() => {
    // КРИТИЧНО: Используем name из character prop, так как API работает по имени
    let photoIdentifier = character?.name || characterIdentifier;
    
    // Если characterIdentifier - это ID, но у нас есть character.name, используем name
    if (character?.name && (characterIdentifier === character.id?.toString() || characterIdentifier === String(character.id))) {
      photoIdentifier = character.name;
      
    }
    
    // Если все еще нет идентификатора, пытаемся получить из URL
    if (!photoIdentifier) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterIdFromUrl = urlParams.get('character');
      if (characterIdFromUrl) {
        
        // Если это число, нужно загрузить персонажа по ID, чтобы получить name
        // Но пока просто используем ID
        photoIdentifier = characterIdFromUrl;
      }
    }
    
    if (photoIdentifier) {
      
      
      
      fetchCharacterPhotos(photoIdentifier);
    } else {
      
      setIsLoadingPhotos(false);
      setGeneratedPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name, character?.id, characterIdentifier]); // Реагируем на изменения name и id из prop

  const togglePhotoSelection = async (photoId: string) => {
    const targetPhoto = generatedPhotos.find(photo => photo.id === photoId);
    if (!targetPhoto) {
      return;
    }

    const alreadySelected = selectedPhotos.some(
      item => item.id === targetPhoto.id || item.url === targetPhoto.url
    );

    let updatedSelection: SelectedPhoto[];
    if (alreadySelected) {
      updatedSelection = selectedPhotos.filter(
        item => item.id !== targetPhoto.id && item.url !== targetPhoto.url
      );
    } else {
      if (selectedPhotos.length >= MAX_MAIN_PHOTOS) {
        setError(`Можно выбрать до ${MAX_MAIN_PHOTOS} фото`);
        return;
      }
      updatedSelection = [...selectedPhotos, { id: targetPhoto.id, url: targetPhoto.url }];
    }

    const previousSelection = [...selectedPhotos];
    const previousGenerated = generatedPhotos.map(photo => ({ ...photo }));

    setGeneratedPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId
          ? { ...photo, isSelected: !alreadySelected }
          : photo
      )
    );
    setSelectedPhotos(updatedSelection);
    setError(null);
    setSuccess(null);

    try {
      const response = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character_name: characterIdentifier,
          photos: updatedSelection
        })
      });
      
      if (!response.ok) {
        throw new Error('Ошибка при обновлении главных фото');
      }
      
      const responseData = await response.json();
      
      setSuccess('Фотографии для карточки обновлены!');
      
      // НЕ вызываем fetchCharacterPhotos() сразу, чтобы не потерять фото
      // Локальное состояние уже обновлено выше через setGeneratedPhotos и setSelectedPhotos
      // Фото останется в списке, просто изменится его статус isSelected
      
      // Отправляем событие для обновления главной страницы
      window.dispatchEvent(new CustomEvent('character-photos-updated', {
        detail: { character_name: characterIdentifier }
      }));
    } catch (err) {
      
      setGeneratedPhotos(previousGenerated);
      setSelectedPhotos(previousSelection);
      setError('Не удалось обновить карточку персонажа');
    }
  };

  const handleAddPhoto = async (photoId: string) => {
    const targetPhoto = generatedPhotos.find(photo => photo.id === photoId);
    if (!targetPhoto || targetPhoto.isSelected) {
      return;
    }
    if (selectedPhotos.length >= MAX_MAIN_PHOTOS) {
      setError(`Можно выбрать до ${MAX_MAIN_PHOTOS} фото`);
      return;
    }
    await togglePhotoSelection(photoId);
  };

  const handleRemovePhoto = async (photoId: string) => {
    const targetPhoto = generatedPhotos.find(photo => photo.id === photoId);
    if (!targetPhoto || !targetPhoto.isSelected) {
      return;
    }
    await togglePhotoSelection(photoId);
  };

  const isLimitReached = selectedPhotos.length >= MAX_MAIN_PHOTOS;

  // Загружаем данные персонажа
  const loadCharacterData = useCallback(async (targetIdentifier?: string, showLoading: boolean = true) => {
    let identifier = targetIdentifier || characterIdentifier;
    console.log('[loadCharacterData] START:', { targetIdentifier, characterIdentifier, showLoading });
    
    
    
    
    
    
    
    
    // КРИТИЧНО: Если identifier - это число (ID), но у нас есть character.name, используем name
    // API endpoint /with-creator работает по имени, а не по ID
    if (character?.name && (identifier === character.id?.toString() || identifier === String(character.id))) {
      
      identifier = character.name;
    }
    
    // Если identifier все еще выглядит как число, но у нас нет name в prop, пытаемся загрузить по ID
    if (!identifier || identifier.trim() === '') {
      // Пытаемся использовать character.id или character.name из prop
      if (character?.name) {
        identifier = character.name;
        
      } else if (character?.id) {
        identifier = character.id.toString();
        
      } else {
        if (showLoading) setIsLoadingData(false);
        return;
      }
    }
    
    
    
    try {
      if (showLoading) {
        setIsLoadingData(true);
      }
      setError(null);
      setSuccess(null);
      
      
      // Добавляем timestamp для обхода кеша
      const cacheBuster = `?t=${Date.now()}`;
      // Используем /with-creator endpoint для получения полных данных персонажа
      // КРИТИЧНО: Этот endpoint работает по имени персонажа, не по ID
      const url = `/api/v1/characters/${encodeURIComponent(identifier)}/with-creator${cacheBuster}`;
      
      const response = await authManager.fetchWithAuth(url);

      

      if (response.ok) {
        const characterData = await response.json();
        
        
        
        
        
        // Парсим промпт для извлечения полей пользователя
        const prompt = characterData?.prompt || '';
        let personality = '';
        let situation = '';
        let instructions = '';
        let style = '';
        
        // Извлекаем данные из промпта с безопасными проверками
        if (prompt) {
          const personalityMatch = prompt.match(/Personality and Character:\s*(.*?)(?=\n\nRole-playing Situation:|$)/s);
          if (personalityMatch && personalityMatch[1]) {
            personality = personalityMatch[1].trim();
          }
          
          const situationMatch = prompt.match(/Role-playing Situation:\s*(.*?)(?=\n\nInstructions:|$)/s);
          if (situationMatch && situationMatch[1]) {
            situation = situationMatch[1].trim();
          }
          
          // Извлекаем instructions до Response Style или IMPORTANT
          const instructionsMatch = prompt.match(/Instructions:\s*(.*?)(?=\n\nResponse Style:|\n\nIMPORTANT:|$)/s);
          if (instructionsMatch && instructionsMatch[1]) {
            instructions = instructionsMatch[1].trim();
          }
          
          // Извлекаем дефолтные инструкции, если они есть после Response Style или в конце prompt
          const defaultInstructionsMatch = prompt.match(/(?:Response Style:.*?\n\n)?(IMPORTANT: Always end your answers with the correct punctuation.*?)(?=\n\n|$)/s);
          if (defaultInstructionsMatch && defaultInstructionsMatch[1]) {
            const defaultInstructions = defaultInstructionsMatch[1].trim();
            // Добавляем дефолтные инструкции к instructions пользователя, если их там еще нет
            if (instructions && !instructions.includes('IMPORTANT: Always end your answers with the correct punctuation')) {
              instructions = instructions + '\n\n' + defaultInstructions;
            } else if (!instructions || instructions.trim() === '') {
              // Если instructions пустые, добавляем только дефолтные
              instructions = defaultInstructions;
            }
          }
          
          const styleMatch = prompt.match(/Response Style:\s*(.*?)(?=\n\nIMPORTANT:|$)/s);
          if (styleMatch && styleMatch[1]) {
            style = styleMatch[1].trim();
          }
        }
        
        // Получаем данные appearance и location
        let appearance = characterData?.character_appearance || characterData?.appearance || '';
        let location = characterData?.location || '';
        
        // Переводим на русский для отображения, если данные на английском
        const appearanceHasCyrillic = /[а-яёА-ЯЁ]/.test(appearance);
        const locationHasCyrillic = /[а-яёА-ЯЁ]/.test(location);
        
        if (appearance && !appearanceHasCyrillic) {
          appearance = await translateToRussian(appearance);
        }
        if (location && !locationHasCyrillic) {
          location = await translateToRussian(location);
        }
        
        const newFormData = {
          name: characterData?.name || identifier || '',
          personality: personality || '',
          situation: situation || '',
          instructions: instructions || '',
          style: style || '',
          appearance: appearance,
          location: location
        };
        
        console.log('[loadCharacterData] Setting formData:', newFormData);
        
        // КРИТИЧНО: Устанавливаем formData СРАЗУ перед установкой isLoadingData в false
        // Это гарантирует, что поля формы будут заполнены до рендеринга
        setFormData(newFormData);
        
        // Обновляем characterIdentifier только если имя изменилось
        const newName = characterData?.name || identifier;
        if (newName && newName !== characterIdentifier) {
          
          setCharacterIdentifier(newName);
        }
        
        
        
        // После успешной загрузки данных загружаем фото
        // Используем name из characterData (реальное имя из БД)
        const photoIdentifier = characterData?.name || identifier;
        if (photoIdentifier) {
          
          // Загружаем фото сразу после загрузки данных персонажа
          setTimeout(() => {
            fetchCharacterPhotos(photoIdentifier);
          }, 100); // Небольшая задержка, чтобы убедиться, что состояние обновилось
        }
      } else {
        
        if (response.status === 401) {
          setError('Необходима авторизация для редактирования персонажа');
          // Возвращаемся на список персонажей через 2 секунды
          setTimeout(() => {
            if (onBackToEditList) {
              onBackToEditList();
            }
          }, 2000);
        } else if (response.status === 403) {
          setError('У вас нет прав для редактирования этого персонажа');
          // Возвращаемся на список персонажей через 2 секунды
          setTimeout(() => {
            if (onBackToEditList) {
              onBackToEditList();
            }
          }, 2000);
        } else if (response.status === 404) {
          setError('Персонаж не найден. Возможно, он был удален.');
          // Возвращаемся на список персонажей через 2 секунды
          setTimeout(() => {
            if (onBackToEditList) {
              onBackToEditList();
            }
          }, 2000);
        } else {
          const errorText = await response.text().catch(() => 'Неизвестная ошибка');
          setError(`Не удалось загрузить данные персонажа: ${errorText}`);
        }
      }
    } catch (error) {
      setError('Ошибка при загрузке данных персонажа');
      // Устанавливаем пустой formData при ошибке, чтобы форма не была пустой
      setFormData({
        name: character?.name || identifier || '',
        personality: '',
        situation: '',
        instructions: '',
        style: '',
        appearance: character?.appearance || '',
        location: character?.location || ''
      });
    } finally {
      console.log('[loadCharacterData] FINALLY: Setting isLoadingData to false (showLoading:', showLoading, ')');
      if (showLoading) {
        setIsLoadingData(false);
      }
    }
  }, [characterIdentifier, character?.name]);

  // Автоматически заполняем customPrompt на основе appearance и location после загрузки данных
  // НО только если пользователь еще не устанавливал его вручную
  useEffect(() => {
    if (!customPromptManuallySet && (formData.appearance || formData.location)) {
      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
      if (parts.length > 0) {
        const defaultPrompt = parts.join(' | ');
        // Устанавливаем только если customPrompt пустой (чтобы не перезаписывать пользовательский ввод)
        if (!customPrompt.trim()) {
          setCustomPrompt(defaultPrompt);
          customPromptRef.current = defaultPrompt; // Обновляем ref
        }
      }
    }
  }, [formData.appearance, formData.location, customPromptManuallySet]); // Зависимости от appearance, location и флага

  // Проверка авторизации (используем тот же метод, что и в ProfilePage)
  const checkAuth = async () => {
    // НЕ обновляем баланс, если идет обновление после сохранения
    if (balanceUpdateInProgressRef.current) {
      
      return;
    }
    
    try {
      const token = authManager.getToken();
      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);
        return;
      }

      // Используем прямой fetch к /api/v1/auth/me/ как в ProfilePage для получения актуального баланса
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const userData = await response.json();
        
        
        setIsAuthenticated(true);
        setUserInfo(prev => {
          // Обновляем только если баланс не обновляется после сохранения
          if (balanceUpdateInProgressRef.current) {
            
            return prev;
          }
          const updatedUserInfo = {
            username: userData.username || userData.email || 'Пользователь',
            coins: userData.coins || 0,
            id: userData.id,
            subscription: userData.subscription || { subscription_type: userData.subscription_type || 'free' }
          };
          
          return updatedUserInfo;
        });
      } else {
        
        authManager.clearTokens();
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  };

  // Загружаем настройки генерации
  const loadGenerationSettings = async () => {
    try {
      
      const response = await fetch('/api/v1/fallback-settings/');
      
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        
        
      } else {
        
      }
    } catch (error) {
      
    }
  };

  // Загружаем статистику подписки
  const loadSubscriptionStats = async () => {
    try {
      const token = authManager.getToken();
      if (!token) {
        setSubscriptionStats(null);
        return;
      }

      const response = await fetch('/api/v1/subscription/stats/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const statsData = await response.json();
        setSubscriptionStats(statsData);
        
      } else {
        
        setSubscriptionStats(null);
      }
    } catch (error) {
      
      setSubscriptionStats(null);
    }
  };

  // Слушаем события обновления баланса
  useEffect(() => {
    const handleBalanceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.coins !== undefined) {
        const newCoins = customEvent.detail.coins;
        
        setUserInfo(prev => {
          if (prev) {
            const updated = { ...prev, coins: newCoins };
            
            return updated;
          }
          return prev;
        });
      }
    };

    const handleProfileUpdate = async () => {
      
      // НЕ вызываем checkAuth здесь, чтобы не перезаписывать баланс после сохранения
      // Вместо этого загружаем баланс напрямую
      const token = authManager.getToken();
      if (token) {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store'
          });
          if (response.ok) {
            const userData = await response.json();
            setUserInfo(prev => prev ? { ...prev, coins: userData.coins, subscription: userData.subscription || prev.subscription } : {
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              id: userData.id,
              subscription: userData.subscription || { subscription_type: userData.subscription_type || 'free' }
            });
          }
        } catch (error) {
          
        }
      }
    };

    window.addEventListener('balance-update', handleBalanceUpdate);
    window.addEventListener('profile-update', handleProfileUpdate);
    window.addEventListener('subscription-update', handleProfileUpdate);

    return () => {
      window.removeEventListener('balance-update', handleBalanceUpdate);
      window.removeEventListener('profile-update', handleProfileUpdate);
      window.removeEventListener('subscription-update', handleProfileUpdate);
    };
  }, []); // Убираем userInfo из зависимостей, чтобы обработчик не пересоздавался

  // Инициализация при монтировании компонента и изменении character prop
  useEffect(() => {
    
    
    
    
    
    
    // Загружаем данные только при первом монтировании
    // НЕ вызываем checkAuth здесь, если идет обновление баланса после сохранения
    if (!balanceUpdateInProgressRef.current) {
    checkAuth();
    }
    loadGenerationSettings();
    loadSubscriptionStats();
    
    // КРИТИЧНО: Определяем идентификатор персонажа из prop или state
    // ПРИОРИТЕТ: Используем characterIdentifier (который может быть обновлен после редактирования) над character?.name
    // API endpoint /with-creator работает по имени, а не по ID
    let effectiveIdentifier = '';
    if (characterIdentifier) {
      // ПРИОРИТЕТ: Используем characterIdentifier (может быть обновлен после редактирования)
      effectiveIdentifier = characterIdentifier;
    } else if (character?.name) {
      effectiveIdentifier = character.name;
    } else if (character?.id) {
      // Если нет name, но есть id, используем id как fallback
      // Но loadCharacterData попытается загрузить по ID, что может не сработать
      effectiveIdentifier = character.id.toString();
    }
    
    
    
    // КРИТИЧНО: Загружаем данные персонажа сразу при монтировании или изменении character
    if (effectiveIdentifier && effectiveIdentifier.trim() !== '') {
      console.log('[useEffect mount] Loading character data for:', effectiveIdentifier);
      
      // КРИТИЧНО: Обновляем refs ПЕРЕД вызовом loadCharacterData для предотвращения race condition
      lastLoadedIdentifierRef.current = effectiveIdentifier;
      isLoadingRef.current = true;
      
      // Обновляем characterIdentifier только если он был пустой
      // КРИТИЧНО: Сохраняем name, а не ID, так как API работает по имени
      if (!characterIdentifier) {
        const nameToStore = character?.name || effectiveIdentifier;
        setCharacterIdentifier(nameToStore);
      }
      // Используем effectiveIdentifier (может быть characterIdentifier или character?.name)
      // ВАЖНО: loadCharacterData сам управляет isLoadingData через параметр showLoading
      loadCharacterData(effectiveIdentifier, true).catch((error) => {
        console.error('[useEffect mount] Error loading character:', error);
        setIsLoadingData(false);
        setError('Ошибка при загрузке данных персонажа');
      }).finally(() => {
        isLoadingRef.current = false;
      });
    } else {
      console.log('[useEffect mount] No identifier, setting isLoadingData to false');
      setIsLoadingData(false);
    }
    
    // Безопасная загрузка main_photos из character prop
    if (character?.photos && Array.isArray(character.photos) && character.photos.length > 0) {
      
      const mainPhotos = character.photos
        .filter((url: any) => url && typeof url === 'string')
        .map((url: string, index: number) => ({
          id: `main_${index}_${Date.now()}`,
          url: url,
          isSelected: true,
          created_at: null
        }));
      if (mainPhotos.length > 0) {
        setSelectedPhotos(mainPhotos.slice(0, MAX_MAIN_PHOTOS));
        
      }
    }

    return () => {
    };
  }, [character?.name, character?.id]); // Реагируем на изменения character prop

  // Загрузка данных персонажа при изменении characterIdentifier
  // КРИТИЧНО: Этот useEffect не должен дублировать загрузку из основного useEffect
  // Refs lastLoadedIdentifierRef и isLoadingRef объявлены выше для предотвращения race condition
  
  useEffect(() => {
    // КРИТИЧНО: Используем characterIdentifier (который обновляется после сохранения), а не character?.name
    // Это гарантирует, что мы используем актуальное имя после редактирования
    const effectiveIdentifier = characterIdentifier || character?.name;
    
    console.log('[useEffect characterIdentifier]:', {
      effectiveIdentifier,
      lastLoaded: lastLoadedIdentifierRef.current,
      isLoading: isLoadingRef.current,
      characterName: character?.name,
      characterIdentifier
    });
    
    if (effectiveIdentifier && effectiveIdentifier.trim() !== '' && lastLoadedIdentifierRef.current !== effectiveIdentifier && !isLoadingRef.current) {
      console.log('[useEffect characterIdentifier] Loading data for:', effectiveIdentifier);
      lastLoadedIdentifierRef.current = effectiveIdentifier;
      isLoadingRef.current = true;
      loadCharacterData(effectiveIdentifier, true).finally(() => {
        isLoadingRef.current = false;
      });
    } else if (!effectiveIdentifier || effectiveIdentifier.trim() === '') {
      console.log('[useEffect characterIdentifier] No identifier, stopping loading');
      setIsLoadingData(false);
      lastLoadedIdentifierRef.current = null;
      isLoadingRef.current = false;
    } else {
      console.log('[useEffect characterIdentifier] Skipping load (already loaded or loading)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name, characterIdentifier]); // Реагируем на изменения name из prop и characterIdentifier

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Проверяем кредиты перед отправкой (используем userInfo.coins, а не subscriptionStats.credits_remaining)
      if (!userInfo || userInfo.coins < CHARACTER_EDIT_COST) {
        throw new Error(`Недостаточно кредитов. Для редактирования персонажа требуется ${CHARACTER_EDIT_COST} кредитов. У вас: ${userInfo?.coins || 0} кредитов.`);
      }
      
      const requestData = {
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        situation: formData.situation.trim(),
        instructions: formData.instructions.trim(),
        appearance: formData.appearance?.trim() || null,
        location: formData.location?.trim() || null
      };

      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      if (!characterIdentifier) {
        throw new Error('Текущий персонаж не найден');
      }

      // КРИТИЧНО: Используем ID для редактирования, если он доступен
      const editIdentifier = character?.id?.toString() || characterIdentifier;

      const response = await authManager.fetchWithAuth(`/api/v1/characters/${editIdentifier}/user-edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Обрабатываем ошибку доступа
        if (response.status === 403) {
          const errorMessage = errorData.detail || 'У вас нет прав для редактирования этого персонажа';
          setError(errorMessage);
          // Возвращаемся на список персонажей через 2 секунды
          setTimeout(() => {
            if (onBackToEditList) {
              onBackToEditList();
            }
          }, 2000);
          return;
        }
        throw new Error(errorData.detail || 'Ошибка при редактировании персонажа');
      }

      const updatedCharacter = await response.json();
      // КРИТИЧНО: Используем имя из ответа API, а не из requestData, чтобы гарантировать актуальность
      const updatedName = updatedCharacter?.name ?? requestData.name;
      
      // setSuccess('Персонаж успешно обновлен!');
      
      // КРИТИЧНО: Обновляем formData из requestData (данные уже сохранены на сервере)
      // Это гарантирует, что форма останется заполненной после сохранения
      setFormData({
        name: updatedName, // Используем имя из ответа API
        personality: requestData.personality,
        situation: requestData.situation,
        instructions: requestData.instructions,
        style: '', // style не сохраняется отдельно, он в промпте
        appearance: requestData.appearance || '',
        location: requestData.location || ''
      });
      
      // КРИТИЧНО: Обновляем characterIdentifier на новое имя из ответа API
      // И сбрасываем lastLoadedIdentifierRef, чтобы разрешить повторную загрузку по новому имени
      const newName = updatedName; // Используем имя из ответа API, которое гарантированно актуально
      if (newName && newName !== characterIdentifier) {
        lastLoadedIdentifierRef.current = null; // Сбрасываем, чтобы разрешить загрузку по новому имени
        isLoadingRef.current = false; // Сбрасываем флаг загрузки
        setCharacterIdentifier(newName);
        
        // КРИТИЧНО: Перезагружаем данные персонажа по новому имени после обновления
        // Это гарантирует, что все последующие запросы будут использовать новое имя
        setTimeout(() => {
          loadCharacterData(newName, false).catch((error) => {
            console.error('Error reloading character data after update:', error);
          });
        }, 200); // Задержка для синхронизации состояния
      }
      
      // Отправляем событие для обновления главной страницы
      window.dispatchEvent(new CustomEvent('character-updated', {
        detail: { 
          characterId: updatedCharacter?.id,
          characterName: updatedName,
          oldName: characterIdentifier
        }
      }));
      
      // КРИТИЧНО: Обновляем баланс из API после сохранения
      balanceUpdateInProgressRef.current = true; // Устанавливаем флаг, чтобы предотвратить перезапись
      
      // Делаем несколько попыток с интервалом, чтобы гарантировать получение актуального баланса
      const updateBalanceWithRetries = async (attempt: number = 1, maxAttempts: number = 3) => {
        const token = authManager.getToken();
        if (!token) {
          balanceUpdateInProgressRef.current = false;
          return;
        }
        
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store' // Отключаем кэш для получения актуальных данных
          });
          
          if (response.ok) {
            const userData = await response.json();
            
            
            // Проверяем, изменился ли баланс (должен быть меньше на CHARACTER_EDIT_COST)
            const expectedBalance = userInfo ? userInfo.coins - CHARACTER_EDIT_COST : userData.coins;
            const balanceChanged = userInfo && userData.coins !== userInfo.coins;
            
            if (balanceChanged || attempt === maxAttempts) {
              // Баланс изменился или это последняя попытка - обновляем
              
              
              setUserInfo(prev => {
                if (prev) {
                  const updated = { ...prev, coins: userData.coins };
                  
                  return updated;
                }
                return {
                  username: userData.username || userData.email || 'Пользователь',
                  coins: userData.coins || 0,
                  id: userData.id
                };
              });
              
              // Диспатчим событие только с новым балансом (для других компонентов)
              window.dispatchEvent(new CustomEvent('balance-update', { 
                detail: { coins: userData.coins } 
              }));
              
              // Сбрасываем флаг через 2 секунды после обновления
              setTimeout(() => {
                balanceUpdateInProgressRef.current = false;
              }, 2000);
            } else {
              // Баланс еще не обновился, пробуем еще раз
              
              setTimeout(() => updateBalanceWithRetries(attempt + 1, maxAttempts), 1000);
            }
          } else {
            
            if (attempt < maxAttempts) {
              setTimeout(() => updateBalanceWithRetries(attempt + 1, maxAttempts), 1000);
            } else {
              balanceUpdateInProgressRef.current = false;
            }
          }
        } catch (error) {
          
          if (attempt < maxAttempts) {
            setTimeout(() => updateBalanceWithRetries(attempt + 1, maxAttempts), 1000);
          } else {
            balanceUpdateInProgressRef.current = false;
          }
        }
      };
      
      // Начинаем обновление баланса с задержкой 1.5 секунды
      setTimeout(() => updateBalanceWithRetries(1, 3), 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при редактировании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  // Ожидание завершения генерации через task_id
  const waitForGeneration = async (taskId: string, token: string): Promise<{ id: string; url: string } | null> => {
    const maxAttempts = 60; // Максимум 2 минуты (60 * 2 секунды) - как в ChatContainer
    const pollInterval = 2000; // Опрашиваем каждые 2 секунды - как в ChatContainer
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Задержка ПЕРЕД каждым запросом (как в ChatContainer)
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      try {
        const response = await fetch(`/api/v1/generation-status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Ошибка проверки статуса генерации');
        }

        const status = await response.json();
        
        // Извлекаем прогресс из ответа (как в ChatContainer)
        let progressValue: number | undefined = undefined;
        
        // Используем прогресс от сервера (там теперь заглушка на 10 сек)
        if (status.progress !== undefined) {
          progressValue = status.progress;
        } else if (status.status === 'generating' && status.result?.progress !== undefined) {
          const rawProgress = typeof status.result.progress === 'number'
            ? status.result.progress
            : parseInt(String(status.result.progress).replace('%', ''), 10);
          progressValue = Math.min(99, Math.max(0, rawProgress));
        } else if (status.status === 'generating' && status.progress !== undefined && status.progress !== null) {
          const rawProgress = typeof status.progress === 'number'
            ? status.progress
            : parseInt(String(status.progress).replace('%', ''), 10);
          progressValue = Math.min(99, Math.max(0, rawProgress));
        }
        
        // Обновляем прогресс в состоянии
        if (progressValue !== undefined && !isNaN(progressValue)) {
          setGenerationProgress(prev => Math.max(prev || 0, progressValue!));
        }
        
        // Логируем только при изменении статуса или раз в 5 попыток
        if (attempts % 5 === 0 || status.status === 'SUCCESS' || status.status === 'FAILURE') {
          
        }

        // Бэкенд возвращает результат в поле "result", а не "data"
        const resultData = status.result || status.data;
        
        if (status.status === 'SUCCESS' && resultData) {
          
          
          // Проверяем разные варианты структуры ответа
          const rawImageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (rawImageUrl) {
            // Нормализуем URL для локальной разработки
            const imageUrl = normalizeImageUrl(rawImageUrl);
            setGenerationProgress(100); // Устанавливаем 100% при завершении
            return {
              id: imageId,
              url: imageUrl
            };
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || 'Ошибка генерации изображения');
        }
        
        // Для всех остальных статусов (PENDING, PROGRESS, generating) продолжаем цикл
        attempts++;
      } catch (err) {
        
        throw err;
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  // Функция для генерации одного фото (вынесена из generatePhoto)
  // КРИТИЧНО: Промпт передается как параметр, чтобы использовать актуальное значение
  // на момент генерации, а не на момент постановки в очередь
  const generateSinglePhoto = async (promptToUse?: string): Promise<{ id: string; url: string } | null> => {
    const token = authManager.getToken();
    if (!token) throw new Error('Необходимо войти в систему');

    // КРИТИЧНО: Если промпт передан как параметр, используем его (актуальное значение)
    // Если не передан, получаем актуальное значение из состояния
    let prompt = promptToUse;
    if (!prompt) {
      // Получаем актуальное значение из состояния
      const trimmedCustomPrompt = customPrompt.trim();
      if (trimmedCustomPrompt) {
        // Пользователь ввел свой промпт - используем его
        prompt = trimmedCustomPrompt;
      } else {
        // Пользователь очистил промпт - используем дефолтный из appearance и location
        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
        prompt = parts.length > 0 ? parts.join(' | ') : '';
      }
    }
    
    // Переводим промпт на английский перед отправкой
    prompt = await translateToEnglish(prompt);

    const effectiveSettings = {
      steps: generationSettings?.steps,
      width: generationSettings?.width,
      height: generationSettings?.height,
      cfg_scale: generationSettings?.cfg_scale,
      sampler_name: generationSettings?.sampler_name,
      negative_prompt: generationSettings?.negative_prompt
    };
    
    const requestBody: any = {
      character: formData.name || 'character',
      prompt: prompt,
      negative_prompt: effectiveSettings.negative_prompt,
      width: effectiveSettings.width,
      height: effectiveSettings.height,
      steps: effectiveSettings.steps,
      cfg_scale: effectiveSettings.cfg_scale,
      use_default_prompts: false,
      model: selectedModel
    };
    
    if (userInfo) {
      requestBody.user_id = userInfo.id;
    }

    const response = await authManager.fetchWithAuth('/api/v1/generate-image/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = 'Ошибка генерации фото';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    let imageUrl: string | undefined;
    let imageId: string | undefined;
    
    if (result.task_id) {
      const generatedPhoto = await waitForGeneration(result.task_id, token);
      if (!generatedPhoto) {
        throw new Error('Не удалось получить сгенерированное изображение');
      }
      imageUrl = generatedPhoto.url; // Уже нормализован в waitForGeneration
      imageId = generatedPhoto.id;
    } else {
      // Нормализуем URL для локальной разработки
      imageUrl = normalizeImageUrl(result.cloud_url || result.image_url);
      if (!imageUrl) {
        throw new Error('URL изображения не получен от сервера');
      }
      const filename = result.filename || Date.now().toString();
      imageId = filename.replace('.png', '').replace('.jpg', '');
    }
    
    if (!imageUrl) {
      throw new Error('URL изображения не получен');
    }
    
    // Добавляем фото в галерею пользователя
    try {
      const addToGalleryResponse = await authManager.fetchWithAuth('/api/v1/auth/user-gallery/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageUrl,
          character_name: formData.name
        })
      });
      
      if (addToGalleryResponse.ok) {
        
      }
    } catch (galleryError) {
      
    }
    
    return {
      id: imageId || Date.now().toString(),
      url: imageUrl
    };
  };


  const generatePhoto = async () => {
    // Определяем тип подписки и максимальное количество фото
    const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
    let subscriptionType = 'free';
    if (rawSubscriptionType) {
      subscriptionType = typeof rawSubscriptionType === 'string' 
        ? rawSubscriptionType.toLowerCase().trim() 
        : String(rawSubscriptionType).toLowerCase().trim();
    }
    
    let queueLimit;
    if (subscriptionType === 'premium') {
      queueLimit = 5; // PREMIUM: 5 фото одновременно
    } else if (subscriptionType === 'standard') {
      queueLimit = 3; // STANDARD: 3 фото одновременно
    } else {
      queueLimit = 1; // FREE/BASE: только 1 фото одновременно
    }
    
    // Проверяем кредиты (10 монет за одно фото)
    if (!userInfo || (userInfo.coins || 0) < 10) {
      setError('Недостаточно монет! Нужно 10 монет для генерации одного фото.');
      return;
    }

    // Проверяем лимит очереди (текущая генерация + очередь)
    const queueCount = generationQueueRef.current || 0;
    const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
    
    if (activeGenerations >= queueLimit) {
      setError(`Очередь генерации заполнена! Максимум ${queueLimit} задач одновременно (${subscriptionType === 'premium' ? 'PREMIUM' : 'STANDARD'}). Дождитесь завершения текущих генераций.`);
      return;
    }

    // Если уже идет генерация, добавляем в очередь
    // КРИТИЧНО: Промпт будет получен заново при фактической генерации из актуального состояния
    if (isGeneratingPhoto) {
      generationQueueRef.current += 1;
      return;
    }

    // Генерируем одно фото сразу
    setIsGeneratingPhoto(true);
    setError(null);
    setGenerationProgress(0);

    // Плавный скролл к генерации на мобилках
    if (isMobile && generationSectionRef.current) {
      generationSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    const processGeneration = async () => {
      try {
        // КРИТИЧНО: Получаем актуальный промпт из ref непосредственно перед генерацией
        // Ref всегда содержит актуальное значение, даже если state еще не обновился
        let currentPrompt = '';
        const trimmedCustomPromptFromRef = customPromptRef.current.trim();
        if (trimmedCustomPromptFromRef) {
          currentPrompt = trimmedCustomPromptFromRef;
        } else {
          // Если ref пустой, пробуем получить из state (на случай если ref не обновился)
          const trimmedCustomPrompt = customPrompt.trim();
          if (trimmedCustomPrompt) {
            currentPrompt = trimmedCustomPrompt;
          } else {
            const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
            currentPrompt = parts.length > 0 ? parts.join(' | ') : '';
          }
        }
        
        
        
        
        const photo = await generateSinglePhoto(currentPrompt);
        if (photo) {
          setGeneratedPhotos(prev => {
            // Проверяем, нет ли уже фото с таким же id
            const existingIds = new Set(prev.map(p => p.id));
            if (existingIds.has(photo.id)) {
              
              return prev;
            }
            return [{ ...photo, isSelected: false }, ...prev];
          });
          setSuccess('Фото успешно сгенерировано!');
        }
        setGenerationProgress(100);
        
        // Обновляем информацию о пользователе
        await checkAuth();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
      } finally {
        setIsGeneratingPhoto(false);
        setGenerationProgress(0);
        
        // Если есть задачи в очереди, запускаем следующую
        // КРИТИЧНО: При рекурсивном вызове промпт будет получен заново из актуального состояния
        if (generationQueueRef.current > 0) {
          generationQueueRef.current -= 1;
          // Небольшая задержка перед следующей генерацией
          setTimeout(() => {
            generatePhoto();
          }, 500);
        }
      }
    };

    processGeneration();
  };


  // Сохранение выбранных фото
  const saveSelectedPhotos = async () => {
    
    
    if (selectedPhotos.length === 0) {
      setError('Нет выбранных фото для сохранения');
      return;
    }

    try {
      // selectedPhotos уже содержит полные URL
      const requestData = {
        character_name: formData.name,
        photo_ids: selectedPhotos  // Отправляем полные URL напрямую
      };
      
      

      const response = await authManager.fetchWithAuth('/api/v1/characters/set-main-photos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      
      
      if (response.ok) {
        const result = await response.json();
        
        setSuccess('Главные фото успешно сохранены!');
        
      } else {
        const errorData = await response.json();
        
        setError(`Ошибка сохранения фото: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      
      setError('Ошибка при сохранении фото');
    }
  };

  const openPhotoModal = async (photo: any) => {
    
    
    setSelectedPhotoForView(photo);
    setIsPromptVisible(true);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(true);

    try {
      const { prompt, errorMessage } = await fetchPromptByImage(photo.url);
      if (prompt) {
        setSelectedPrompt(prompt);
      } else {
        setPromptError(errorMessage || 'Промпт недоступен для этого изображения');
      }
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const closePhotoModal = () => {
    
    setSelectedPhotoForView(null);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(false);
  };

  const handleClosePrompt = () => {
    setIsPromptVisible(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPhotoForView) {
        closePhotoModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPhotoForView]);

  // Проверка на undefined character с более детальной информацией
  // ВАЖНО: Показываем ошибку только если character точно отсутствует И мы не в процессе загрузки
  console.log('[EditCharacterPage] RENDER CHECK:', { 
    hasCharacter: !!character, 
    characterName: character?.name, 
    characterId: character?.id,
    isLoadingData,
    characterIdentifier,
    formDataName: formData?.name
  });
  
  if (!character || (!character.name && !character.id)) {
    console.log('[EditCharacterPage] No character prop - showing error/loading:', { character, isLoadingData });
    
    // Если мы еще загружаем данные, показываем спиннер
    if (isLoadingData) {
      return (
        <MainContainer>
          <div className="content-area vertical">
            <GlobalHeader 
              onShop={onShop}
              onLogin={() => {
                setAuthMode('login');
                setIsAuthModalOpen(true);
              }}
              onRegister={() => {
                setAuthMode('register');
                setIsAuthModalOpen(true);
              }}
              onLogout={handleLogout}
              onProfile={onProfile}
              onBalance={() => alert('Баланс пользователя')}
              currentCharacterId={character?.id}
            />
            <MainContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <div style={{ textAlign: 'center' }}>
                <LoadingSpinner size="lg" />
                <p style={{ marginTop: '1rem' }}>Загрузка данных персонажа...</p>
              </div>
            </MainContent>
          </div>
        </MainContainer>
      );
    }
    
    // Если загрузка завершена, но character все еще нет - показываем ошибку
    return (
      <MainContainer>
        <MainContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Ошибка загрузки</h2>
            <p>Персонаж не найден или данные повреждены. Пожалуйста, вернитесь к списку персонажей.</p>
            <button 
              onClick={onBackToEditList} 
              style={{ 
                marginTop: '1rem', 
                padding: '0.5rem 1rem', 
                cursor: 'pointer',
                backgroundColor: '#6a0dad',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              ← Назад к списку
            </button>
          </div>
        </MainContent>
      </MainContainer>
    );
  }

  // Показываем индикатор загрузки, пока данные не загружены
  
  
  
  
  
  
  
  
  if (isLoadingData) {
    
    return (
      <MainContainer>
        <div className="content-area vertical">
          <GlobalHeader 
            onShop={onShop}
            onLogin={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            onRegister={() => {
              setAuthMode('register');
              setIsAuthModalOpen(true);
            }}
            onLogout={handleLogout}
            onProfile={onProfile}
            onBalance={() => alert('Баланс пользователя')}
          />
          <MainContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner size="lg" />
              <p style={{ marginTop: '1rem' }}>Загрузка данных персонажа...</p>
            </div>
          </MainContent>
        </div>
      </MainContainer>
    );
  }

  // Проверка на undefined formData
  
  if (!formData) {
    
    return (
      <MainContainer>
        <MainContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Ошибка инициализации</h2>
            <p>Не удалось загрузить форму. Пожалуйста, обновите страницу.</p>
            <button onClick={onBackToEditList} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              ← Назад к списку
            </button>
          </div>
        </MainContent>
      </MainContainer>
    );
  }

  // Финальная проверка перед рендерингом формы
  console.log('[EditCharacterPage] Rendering form:', {
    isLoadingData,
    hasFormData: !!formData,
    formDataName: formData?.name,
    formDataPersonality: formData?.personality?.substring(0, 30),
    characterName: character?.name,
    characterIdentifier,
    formDataKeys: formData ? Object.keys(formData) : []
  });
  
  // ДИАГНОСТИКА: Проверяем, что рендерится
  console.log('[EditCharacterPage] About to render MainContainer', { isMobile, formData });
  
  try {
    return (
      <>
      <MainContainer $isMobile={isMobile}>
        <GlobalHeader 
          onShop={onShop}
          onLogin={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthMode('register');
            setIsAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onProfile={onProfile}
          onBalance={() => alert('Баланс пользователя')}
        />
        
        <MainContent>
          <form 
            onSubmit={handleSubmit} 
            className={`flex-1 flex gap-6 ${isMobile ? 'h-auto' : 'h-full'} flex-col md:flex-row w-full`}
          >
            {/* Левая колонка - Форма */}
            <div className={`flex-1 flex flex-col min-w-0 md:min-w-[400px] bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 ${isMobile ? 'overflow-visible' : 'overflow-y-auto'}`}>
              <div className="flex flex-col gap-6">
              
              {/* Имя персонажа */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-200 mb-2">
                  Имя персонажа
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Введите имя персонажа..."
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              
              {/* Личность и характер */}
              <div>
                <label htmlFor="personality" className="block text-sm font-medium text-zinc-200 mb-2">
                  Личность и характер
                </label>
                <textarea
                  id="personality"
                  name="personality"
                  value={formData.personality}
                  onChange={handleInputChange}
                  placeholder="Опишите характер и личность персонажа..."
                  rows={4}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>
              
              {/* Ролевая ситуация */}
              <div>
                <label htmlFor="situation" className="block text-sm font-medium text-zinc-200 mb-2">
                  Ролевая ситуация
                </label>
                <textarea
                  id="situation"
                  name="situation"
                  value={formData.situation}
                  onChange={handleInputChange}
                  placeholder="Опишите ситуацию, в которой находится персонаж..."
                  rows={3}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>
              
              {/* Инструкции для персонажа */}
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-zinc-200 mb-2">
                  Инструкции для персонажа
                </label>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="Как должен вести себя персонаж, что говорить..."
                  rows={4}
                  required
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>

              {/* Внешность (для фото) */}
              <div>
                <label htmlFor="appearance" className="block text-sm font-medium text-zinc-200 mb-2">
                  Внешность (для фото)
                </label>
                <textarea
                  id="appearance"
                  name="appearance"
                  value={formData.appearance}
                  onChange={handleInputChange}
                  placeholder="Опишите внешность персонажа для генерации фото..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>
              
              {/* Локация (для фото) */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-zinc-200 mb-2">
                  Локация (для фото)
                </label>
                <textarea
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Опишите локацию персонажа для генерации фото..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="mt-2 text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-2 text-sm text-green-400 bg-green-400/10 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !userInfo || (userInfo && userInfo.coins < CHARACTER_EDIT_COST)}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-yellow-500/50"
              >
                {isLoading ? 'Обновление...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>

            <PhotoGenerationContainer ref={generationSectionRef} $isMobile={isMobile}>
              <div className="flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-zinc-200 mb-2">Генерация фото персонажа</h3>
                  <LegalStyleText>
                    Создайте 3 фото для персонажа которые будут на главной странице
                  </LegalStyleText>
                </div>
                
                {/* 1. Настройки: Модель */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                    <FiSettings size={14} /> Выберите стиль
                  </label>
                  <ModelSelectionContainer>
                    <ModelCard 
                      $isSelected={selectedModel === 'anime-realism'}
                      $previewImage="/model_previews/анимереализм1.jpg"
                      onClick={() => setSelectedModel('anime-realism')}
                    >
                      <ModelInfoOverlay>
                        <ModelName>Аниме + Реализм</ModelName>
                        <ModelDescription>Сбалансированный стиль</ModelDescription>
                      </ModelInfoOverlay>
                    </ModelCard>
                    
                    <ModelCard 
                      $isSelected={selectedModel === 'anime'}
                      $previewImage="/model_previews/аниме.jpeg"
                      onClick={() => setSelectedModel('anime')}
                    >
                      <ModelInfoOverlay>
                        <ModelName>Аниме</ModelName>
                        <ModelDescription>Классический 2D стиль</ModelDescription>
                      </ModelInfoOverlay>
                    </ModelCard>
                    
                    <ModelCard 
                      $isSelected={selectedModel === 'realism'}
                      $previewImage="/model_previews/реализм.jpg"
                      onClick={() => setSelectedModel('realism')}
                    >
                      <ModelInfoOverlay>
                        <ModelName>Реализм</ModelName>
                        <ModelDescription>Фотореалистичность</ModelDescription>
                      </ModelInfoOverlay>
                    </ModelCard>
                  </ModelSelectionContainer>
                </div>

                {/* 2. Настройки: Промпт */}
                <div className="mb-2">
                  <label htmlFor="photo-prompt-unified" className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <Sparkles size={14} /> Описание (Промпт)
                  </label>
                  <textarea
                    id="photo-prompt-unified"
                    value={customPrompt}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setCustomPrompt(newValue);
                      customPromptRef.current = newValue;
                      setCustomPromptManuallySet(true);
                    }}
                    placeholder="Например: девушка-самурай в неоновом городе, киберпанк стиль, дождь, высокая детализация..."
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                    rows={4}
                  />
                  
                  {/* Теги-помощники */}
                  <div className="relative">
                    <TagsContainer $isExpanded={isTagsExpanded}>
                      {[
                        // Нормальные промпты
                        { label: 'Высокая детализация', value: 'высокая детализация, реализм, 8к разрешение' },
                        { label: 'Киберпанк', value: 'стиль киберпанк, неоновое освещение, футуристично' },
                        { label: 'Фэнтези', value: 'фэнтези стиль, магическая атмосфера' },
                        { label: 'Портрет', value: 'крупный план, детальное лицо, выразительный взгляд' },
                        { label: 'В полный рост', value: 'в полный рост, изящная поза' },
                        { label: 'Аниме стиль', value: 'красивый аниме стиль, четкие линии, яркие цвета' },
                        { label: 'Реализм', value: 'фотореалистично, натуральные текстуры кожи' },
                        { label: 'Кинематографично', value: 'кинематографичный свет, глубокие тени, драматично' },
                        { label: 'На пляже', value: 'на берегу океана, золотой песок, закатное солнце' },
                        { label: 'В городе', value: 'на оживленной улице города, ночные огни, боке' },
                        { label: 'В лесу', value: 'в сказочном лесу, лучи солнца сквозь листву' },
                        { label: 'Офисный стиль', value: 'в строгом офисном костюме, деловая обстановка' },
                        { label: 'Летнее платье', value: 'в легком летнем платье, летящая ткань' },
                        { label: 'Вечерний свет', value: 'мягкий вечерний свет, теплые тона' },
                        { label: 'Зима', value: 'зимний пейзаж, падающий снег, меховая одежда' },
                        
                        // Пошлые промпты (18+)
                        { label: 'Соблазнительно', value: 'соблазнительная поза, игривый взгляд, эротично' },
                        { label: 'Нижнее белье', value: 'в кружевном нижнем белье, прозрачные ткани' },
                        { label: 'Обнаженная', value: 'обнаженная, полная нагота, детализированное тело' },
                        { label: 'В постели', value: 'лежит в постели, шелковые простыни, интимная обстановка' },
                        { label: 'Горячая ванна', value: 'в ванне с пеной, влажная кожа, капли воды' },
                        { label: 'Чулки', value: 'в черных шелковых чулках с поясом' },
                        { label: 'Мини-юбка', value: 'в экстремально короткой мини-юбке' },
                        { label: 'Глубокое декольте', value: 'глубокое декольте, акцент на груди' },
                        { label: 'Вид сзади', value: 'вид сзади, акцент на ягодицах, изящный изгиб спины' },
                        { label: 'Мокрая одежда', value: 'в мокрой одежде, прилипающая ткань, прозрачность' },
                        { label: 'Поза раком', value: 'стоит на четвереньках, прогнутая спина, вызывающая поза' },
                        { label: 'Расставленные ноги', value: 'сидит с широко расставленными ногами, манящий взгляд' },
                        { label: 'Прикрывает грудь', value: 'прикрывает обнаженную грудь руками, застенчиво' },
                        { label: 'Кусает губу', value: 'возбужденное лицо, кусает губу, томный взгляд' },
                        { label: 'Прозрачное боди', value: 'в прозрачном облегающем боди, все детали видны' }
                      ].map((tag, idx) => (
                        <TagButton 
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const separator = customPrompt.length > 0 && !customPrompt.endsWith(', ') && !customPrompt.endsWith(',') ? ', ' : '';
                            const newValue = customPrompt + separator + tag.value;
                            setCustomPrompt(newValue);
                            customPromptRef.current = newValue;
                            setCustomPromptManuallySet(true);
                          }}
                        >
                          <Plus size={10} /> {tag.label}
                        </TagButton>
                      ))}
                    </TagsContainer>
                    <ExpandButton 
                      type="button"
                      $isExpanded={isTagsExpanded} 
                      onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </ExpandButton>
                  </div>
                </div>
                
                {/* 3. Действие: Кнопка "Сгенерировать" */}
                <GenerationArea>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-400">
                      Стоимость: <span className="text-zinc-200 font-medium">10 монет</span>
                    </span>
                    
                    {userInfo && (
                      <CoinsBalance>
                        <BiCoinStack /> {userInfo.coins}
                      </CoinsBalance>
                    )}
                  </div>
                  
                  <GenerateButton
                    type="button"
                    onClick={generatePhoto}
                    disabled={(() => {
                      if (!userInfo) return true;
                      const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userInfo?.subscription?.type;
                      let subscriptionType = 'free';
                      if (rawSubscriptionType) {
                        subscriptionType = typeof rawSubscriptionType === 'string' 
                          ? rawSubscriptionType.toLowerCase().trim() 
                          : String(rawSubscriptionType).toLowerCase().trim();
                      }
                      let queueLimit = 1;
                      if (subscriptionType === 'premium') {
                        queueLimit = 5;
                      } else if (subscriptionType === 'standard') {
                        queueLimit = 3;
                      }
                      const queueCount = generationQueueRef.current || 0;
                      const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
                      const isQueueFull = activeGenerations >= queueLimit;
                      return isQueueFull || userInfo.coins < 10;
                    })()}
                  >
                    <span className="flex items-center gap-2">
                      <Zap size={18} />
                      {(() => {
                         if (isGeneratingPhoto) return 'Сгенерировать фото';
                         return 'Сгенерировать фото';
                      })()}
                    </span>
                  </GenerateButton>
                  
                  {/* Предупреждение о времени (серое) */}
                  <WarningText>
                    <FiClock size={12} />
                    Первая генерация может занять до 2-3 минут
                  </WarningText>

                  {/* Детальный прогресс-бар */}
                  {isGeneratingPhoto && (
                    <ProgressBarContainer>
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-xs text-zinc-400">Процесс создания...</span>
                         <span className="text-xs text-[#8b5cf6] font-medium">{Math.round(generationProgress || 0)}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                        <div 
                           className="bg-[#8b5cf6] h-full transition-all duration-300 ease-out"
                           style={{ width: `${generationProgress || 0}%` }}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <StepItem $isActive={(generationProgress || 0) < 30} $isCompleted={(generationProgress || 0) >= 30}>
                          <StepIcon $isActive={(generationProgress || 0) < 30} $isCompleted={(generationProgress || 0) >= 30}>
                            {(generationProgress || 0) >= 30 ? <FiCheckCircle size={10} /> : '1'}
                          </StepIcon>
                          <StepText $isActive={(generationProgress || 0) < 30} $isCompleted={(generationProgress || 0) >= 30}>
                            Подготовка модели и параметров
                          </StepText>
                        </StepItem>
                        
                        <StepItem $isActive={(generationProgress || 0) >= 30 && (generationProgress || 0) < 80} $isCompleted={(generationProgress || 0) >= 80}>
                           <StepIcon $isActive={(generationProgress || 0) >= 30 && (generationProgress || 0) < 80} $isCompleted={(generationProgress || 0) >= 80}>
                            {(generationProgress || 0) >= 80 ? <FiCheckCircle size={10} /> : '2'}
                          </StepIcon>
                          <StepText $isActive={(generationProgress || 0) >= 30 && (generationProgress || 0) < 80} $isCompleted={(generationProgress || 0) >= 80}>
                            Генерация изображения нейросетью
                          </StepText>
                        </StepItem>
                        
                        <StepItem $isActive={(generationProgress || 0) >= 80} $isCompleted={(generationProgress || 0) >= 100}>
                           <StepIcon $isActive={(generationProgress || 0) >= 80} $isCompleted={(generationProgress || 0) >= 100}>
                            {(generationProgress || 0) >= 100 ? <FiCheckCircle size={10} /> : '3'}
                          </StepIcon>
                          <StepText $isActive={(generationProgress || 0) >= 80} $isCompleted={(generationProgress || 0) >= 100}>
                            Финализация и сохранение
                          </StepText>
                        </StepItem>
                      </div>
                    </ProgressBarContainer>
                  )}
                  
                  {/* Индикатор очереди генерации */}
                  {(() => {
                    const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userInfo?.subscription?.type;
                    let subscriptionType = 'free';
                    if (rawSubscriptionType) {
                      subscriptionType = typeof rawSubscriptionType === 'string' 
                        ? rawSubscriptionType.toLowerCase().trim() 
                        : String(rawSubscriptionType).toLowerCase().trim();
                    }
                    let queueLimit = 1;
                    if (subscriptionType === 'premium') {
                      queueLimit = 5;
                    } else if (subscriptionType === 'standard') {
                      queueLimit = 3;
                    }
                    const queueCount = generationQueueRef.current || 0;
                    const activeGenerations = Math.min((isGeneratingPhoto ? 1 : 0) + queueCount, queueLimit);
                    if (activeGenerations > 0 && queueLimit > 0) {
                      return (
                        <div style={{ marginTop: '12px' }}>
                          <GenerationQueueIndicator>
                            {Array.from({ length: queueLimit }).map((_, index) => (
                              <QueueBar 
                                key={index} 
                                $isFilled={index < activeGenerations}
                              />
                            ))}
                          </GenerationQueueIndicator>
                          <QueueLabel>
                            Очередь генерации ({activeGenerations}/{queueLimit})
                          </QueueLabel>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </GenerationArea>

                {/* Область для отображения сгенерированных фото */}
                <div style={{ flex: '1 1 auto', marginTop: 'auto', paddingTop: theme.spacing.md }}>
                  {isLoadingPhotos ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#fff', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', margin: '1rem 0' }}>
                      Загрузка фотографий...
                    </div>
                  ) : (generatedPhotos && Array.isArray(generatedPhotos) && generatedPhotos.length > 0) ? (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-zinc-200">Сгенерированные фото ({generatedPhotos.length})</h3>
                        <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-400">
                          {selectedPhotos?.length || 0} из {MAX_MAIN_PHOTOS}
                        </div>
                      </div>

                      <PhotoList>
                        {generatedPhotos.map((photo, index) => {
                          if (!photo || !photo.url) return null;
                          const isSelected = Boolean(photo?.isSelected);

                          return (
                            <PhotoTile key={`${photo?.id || `photo-${index}`}-${index}`}>
                              <PhotoImage
                                src={photo.url}
                                alt={`Photo ${index + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (photo) openPhotoModal(photo);
                                }}
                                onError={(e) => {
                                  console.error('[EditCharacterPage] Ошибка загрузки изображения:', photo.url);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <PhotoOverlay onClick={(e) => e.stopPropagation()}>
                                <OverlayButtons>
                                  <OverlayButton
                                    $variant={isSelected ? 'secondary' : 'primary'}
                                    disabled={!isSelected && isLimitReached}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (photo?.id) togglePhotoSelection(photo.id);
                                    }}
                                  >
                                    {isSelected ? 'Убрать' : <><Plus size={14} /> Добавить</>}
                                  </OverlayButton>
                                </OverlayButtons>
                              </PhotoOverlay>
                            </PhotoTile>
                          );
                        }).filter(Boolean)}
                      </PhotoList>

                      <SliderDescription>
                        <h4 className="text-sm font-medium text-zinc-200 mb-2">Выбор главных фото</h4>
                        <p className="text-xs text-zinc-400">
                          Можно добавить максимум {MAX_MAIN_PHOTOS} фотографий. Используйте кнопки «Добавить»
                          и «Убрать», чтобы управлять карточкой персонажа.
                        </p>
                      </SliderDescription>
                    </div>
                  ) : (
                    <PhotoGenerationPlaceholder>
                      {isLoadingPhotos ? 'Загрузка фотографий...' : 'Нет сгенерированных фотографий'}
                    </PhotoGenerationPlaceholder>
                  )}
                </div>
              </div>
            </PhotoGenerationContainer>
        </form>
      </MainContent>
      
      {/* Модальное окно для просмотра фото в полный размер */}
      <PromptGlassModal
        isOpen={!!selectedPhotoForView}
        onClose={closePhotoModal}
        imageUrl={selectedPhotoForView?.url || ''}
        imageAlt="Generated photo"
        promptText={selectedPrompt}
        isLoading={isLoadingPrompt}
        error={promptError}
      />
      
      {/* Модальное окно авторизации */}
      {isAuthModalOpen && (
        <AuthModal 
          isOpen={isAuthModalOpen}
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            authManager.setTokens(accessToken, refreshToken);
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            checkAuth();
            fetchCharacterPhotos();
          }}
        />
      )}
      
      {/* Отладочная информация */}
      {}
      {}
      {/* ВРЕМЕННО ОТКЛЮЧЕНО для отладки */}
      {/* <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper> */}
    </MainContainer>
    </>
  );
  } catch (err) {
    console.error('[EditCharacterPage] Render error:', err);
    return (
      <div style={{ color: 'white', padding: '20px', background: '#333', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Ошибка рендеринга страницы</h2>
        <pre>{String(err)}</pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}>
          Обновить страницу
        </button>
      </div>
    );
  }
};
