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
import { FiX as CloseIcon } from 'react-icons/fi';
import { Plus } from 'lucide-react';

import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';

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
  height: ${props => props.$isMobile ? 'auto' : '100vh'};
  display: flex;
  flex-direction: column;
  background: linear-gradient(to bottom right, rgba(8, 8, 18, 1), rgba(8, 8, 18, 0.95), rgba(40, 40, 40, 0.1));
  overflow: visible;
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
  display: flex;
  height: calc(100vh - 80px);
  max-height: calc(100vh - 80px);
  overflow: hidden;
  padding: ${theme.spacing.lg};
  gap: ${theme.spacing.lg};
  visibility: visible;
  opacity: 1;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    max-height: none;
    overflow-y: visible; /* Отключаем внутренний скролл, пусть скроллится весь контейнер */
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
    padding: ${theme.spacing.md};
  }
`;

const RightColumn = styled.div`
  flex: 1;
  min-width: 0;
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(130, 130, 130, 0.3);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  visibility: visible;
  opacity: 1;

  @media (max-width: 768px) {
    width: 100%;
    overflow: visible;
    padding: ${theme.spacing.md};
  }
`;

const Form = styled.form`
  display: flex;
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
  transition: transform 0.2s ease;
  border: 1px solid rgba(170, 170, 170, 0.4);
  background: ${({ $variant }) => ($variant === 'primary' ? 'rgba(200, 200, 200, 0.15)' : 'transparent')};
  color: ${theme.colors.text.primary};
  
  &:hover {
    transform: scale(1.02);
    border-color: rgba(255, 255, 255, 0.6);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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
  position: absolute;
  top: ${theme.spacing.xl};
  right: ${theme.spacing.xl};
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
  min-width: 350px;
  max-width: 30%;
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
  font-size: ${theme.fontSize.xs};
  color: rgba(160, 160, 160, 1);
  text-align: center;
  margin-top: 8px;
  font-weight: 500;
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

const GenerateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

const PhotoGenerationBox = styled.div`
  background: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(120, 120, 120, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  margin: ${theme.spacing.lg} 0;
  text-align: center;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.5);
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

const GenerateButton = styled.button`
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.xl};
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px);
  width: 100%;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.6), rgba(139, 92, 246, 0.6), rgba(59, 130, 246, 0.6));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    transition: opacity 0.4s ease;
  }
  
  & > span {
    display: block;
    transition: opacity 0.3s ease;
  }
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(236, 72, 153, 0.3);
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.03);
    
    &::before {
      opacity: 0.4;
    }
  }
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number, subscription?: {subscription_type?: string}} | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<{credits_remaining: number} | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPromptManuallySet, setCustomPromptManuallySet] = useState(false); // Флаг, что пользователь вручную установил промпт
  const CHARACTER_EDIT_COST = 30; // Кредиты за редактирование персонажа
  const balanceUpdateInProgressRef = useRef(false); // Флаг для предотвращения перезаписи баланса
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
    
    if (newName && newName !== characterIdentifier) {
      
      setCharacterIdentifier(newName);
      // Данные загрузятся автоматически через useEffect для characterIdentifier
    } else if (!newName && !characterIdentifier) {
      
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const photoUrl = photo.url;
        
        if (!photoUrl) {
          
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
  const loadCharacterData = useCallback(async (targetIdentifier?: string) => {
    let identifier = targetIdentifier || characterIdentifier;
    
    
    
    
    
    
    
    
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
      
      setIsLoadingData(false);
      return;
      }
    }
    
    
    
    try {
      
      setIsLoadingData(true);
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
          
          const instructionsMatch = prompt.match(/Instructions:\s*(.*?)(?=\n\nResponse Style:|$)/s);
          if (instructionsMatch && instructionsMatch[1]) {
            instructions = instructionsMatch[1].trim();
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
        
        if (response.status === 403) {
          setError('У вас нет прав для редактирования этого персонажа');
          // Возвращаемся на список персонажей через 2 секунды
          setTimeout(() => {
            if (onBackToEditList) {
              onBackToEditList();
            }
          }, 2000);
        } else if (response.status === 404) {
          setError('Персонаж не найден. Возможно, он был удален.');
        } else {
          setError('Не удалось загрузить данные персонажа');
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
      
      
      setIsLoadingData(false);
      
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
            setUserInfo(prev => prev ? { ...prev, coins: userData.coins } : {
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              id: userData.id
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
      
      // Обновляем characterIdentifier только если он был пустой
      // КРИТИЧНО: Сохраняем name, а не ID, так как API работает по имени
      if (!characterIdentifier) {
        const nameToStore = character?.name || effectiveIdentifier;
        setCharacterIdentifier(nameToStore);
      }
      // Устанавливаем isLoadingData в true перед загрузкой
      setIsLoadingData(true);
      // Используем effectiveIdentifier (может быть characterIdentifier или character?.name)
      loadCharacterData(effectiveIdentifier).catch((error) => {
        
        setIsLoadingData(false);
        setError('Ошибка при загрузке данных персонажа');
      });
    } else {
      
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
  // Используем useRef для отслеживания последней загруженной версии
  const lastLoadedIdentifierRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  
  useEffect(() => {
    
    
    // КРИТИЧНО: Используем characterIdentifier (который обновляется после сохранения), а не character?.name
    // Это гарантирует, что мы используем актуальное имя после редактирования
    const effectiveIdentifier = characterIdentifier || character?.name;
    
    if (effectiveIdentifier && effectiveIdentifier.trim() !== '' && lastLoadedIdentifierRef.current !== effectiveIdentifier && !isLoadingRef.current) {
      
      lastLoadedIdentifierRef.current = effectiveIdentifier;
      isLoadingRef.current = true;
      loadCharacterData(effectiveIdentifier).finally(() => {
        isLoadingRef.current = false;
      });
    } else if (!effectiveIdentifier || effectiveIdentifier.trim() === '') {
      
      setIsLoadingData(false);
      lastLoadedIdentifierRef.current = null;
      isLoadingRef.current = false;
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

      const response = await authManager.fetchWithAuth(`/api/v1/characters/${characterIdentifier}/user-edit`, {
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
      
      setSuccess('Персонаж успешно обновлен!');
      
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
          loadCharacterData(newName).catch((error) => {
            console.error('Error reloading character data after update:', error);
          });
        }, 200); // Задержка для синхронизации состояния
      }
      
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
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            
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
      imageUrl = generatedPhoto.url;
      imageId = generatedPhoto.id;
    } else {
      imageUrl = result.cloud_url || result.image_url;
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
  if (!character || (!character.name && !character.id)) {
    
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
  
  
  
  
  
  
  
  
  // Дополнительная проверка безопасности
  if (!formData) {
    
    return <div>Загрузка...</div>;
  }
  
  // УБРАНО: проверка !formData.name - она выкидывает пользователя со страницы при удалении строки
  // if (!formData.name) {
  //   return <div>Загрузка...</div>;
  // }
  
  
  
  return (
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
          <Form onSubmit={handleSubmit}>
            <LeftColumn>
              <ColumnContent>
                <FormGroup>
                  <Label htmlFor="name" data-icon="👤">Имя персонажа:</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Введите имя персонажа..."
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="personality" data-icon="🧠">Личность и характер:</Label>
                  <Textarea
                    id="personality"
                    name="personality"
                    value={formData.personality}
                    onChange={handleInputChange}
                    placeholder="Опишите характер и личность персонажа..."
                    rows={4}
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="situation" data-icon="💬">Ролевая ситуация:</Label>
                  <Textarea
                    id="situation"
                    name="situation"
                    value={formData.situation}
                    onChange={handleInputChange}
                    placeholder="Опишите ситуацию, в которой находится персонаж..."
                    rows={3}
                    required
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="instructions" data-icon="📋">Инструкции для персонажа:</Label>
                  <Textarea
                    id="instructions"
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    placeholder="Как должен вести себя персонаж, что говорить..."
                    rows={4}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="appearance" data-icon="🎨">Внешность (для фото):</Label>
                  <Textarea
                    id="appearance"
                    name="appearance"
                    value={formData.appearance}
                    onChange={handleInputChange}
                    placeholder="Опишите внешность персонажа для генерации фото..."
                    rows={3}
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label htmlFor="location" data-icon="📍">Локация (для фото):</Label>
                  <Textarea
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Опишите локацию персонажа для генерации фото..."
                    rows={3}
                  />
                </FormGroup>

                {error && <ErrorMessage>{error}</ErrorMessage>}
                {success && <SuccessMessage>{success}</SuccessMessage>}

                <ButtonGroup>
                  <ActionButton 
                    type="submit" 
                    disabled={isLoading || !userInfo || (userInfo && userInfo.coins < CHARACTER_EDIT_COST)}
                  >
                    {isLoading ? 'Обновление...' : 'Сохранить изменения'}
                  </ActionButton>
                </ButtonGroup>
              </ColumnContent>
            </LeftColumn>

            <RightColumn ref={generationSectionRef}>
              <ColumnContent>
                <div style={{ flex: '0 0 auto' }}>
                  <PhotoGenerationBox>
                    <PhotoGenerationBoxTitle>Генерация фото персонажа</PhotoGenerationBoxTitle>
                    <PhotoGenerationDescription>
                      {(() => {
                        const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
                        let subscriptionType = 'free';
                        if (rawSubscriptionType) {
                          subscriptionType = typeof rawSubscriptionType === 'string' 
                            ? rawSubscriptionType.toLowerCase().trim() 
                            : String(rawSubscriptionType).toLowerCase().trim();
                        }
                        const maxPhotos = subscriptionType === 'premium' ? 5 : 3;
                        const currentPhotosCount = generatedPhotos.length;
                        const remainingSlots = maxPhotos - currentPhotosCount;
                        return `Сгенерируйте фото для вашего персонажа (10 монет за фото). ${subscriptionType === 'premium' ? 'PREMIUM подписка: до 5 фото.' : subscriptionType === 'standard' ? 'STANDARD подписка: до 3 фото.' : 'Без подписки: до 3 фото.'} После генерации выберите до 3 фотографий для главной карточки.${remainingSlots > 0 ? ` Осталось слотов: ${remainingSlots}.` : ' Лимит достигнут.'}`;
                      })()}
                    </PhotoGenerationDescription>
                    
                    <GenerateSection>
                      <GenerateButton 
                        onClick={() => {
                          
                          generatePhoto();
                        }}
                        disabled={(() => {
                          if (!userInfo) {
                            
                            return true;
                          }
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
                          // Проверяем только размер очереди и монеты
                          const queueCount = generationQueueRef.current || 0;
                          const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
                          const hasEnoughCoins = (userInfo?.coins || 0) >= 10;
                          const isQueueFull = activeGenerations >= queueLimit;
                          const isDisabled = isQueueFull || !hasEnoughCoins;
                          
                          return isDisabled;
                        })()}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
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
                            const queueCount = generationQueueRef.current || 0;
                            const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
                            const isQueueFull = activeGenerations >= queueLimit;
                            const progress = isGeneratingPhoto 
                              ? (generationProgress !== undefined && generationProgress > 0 ? generationProgress : 0)
                              : 0;
                            const baseText = isQueueFull 
                              ? `Сгенерировать фото (10 монет) • Очередь заполнена`
                              : `Сгенерировать фото (10 монет)`;
                            return isGeneratingPhoto 
                              ? `${baseText} • Генерация: ${Math.round(progress)}%`
                              : baseText;
                          })()}
                        </span>
                      </GenerateButton>

                      {/* Индикатор очереди генерации */}
                      {(() => {
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
                        // Активные генерации = текущая генерация (если есть) + очередь
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
                    </GenerateSection>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem', 
                        color: 'rgba(240, 240, 240, 1)', 
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        Модель генерации:
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(30, 30, 30, 0.8)',
                          border: '1px solid rgba(150, 150, 150, 0.3)',
                          borderRadius: '0.5rem',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="anime-realism">Сочетание аниме и реалистичных текстур</option>
                        <option value="anime">Классический аниме стиль</option>
                        <option value="realism">Максимальная фотореалистичность</option>
                      </select>
                    </div>

                    <LargeTextLabel htmlFor="photo-prompt-unified">
                      Промпт для генерации фото:
                    </LargeTextLabel>
                    <LargeTextInput
                      id="photo-prompt-unified"
                      value={customPrompt}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setCustomPrompt(newValue);
                        customPromptRef.current = newValue; // Обновляем ref для актуального значения
                        // Помечаем, что пользователь вручную изменил промпт
                        setCustomPromptManuallySet(true);
                      }}
                      placeholder={(() => {
                        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
                        return parts.length > 0 ? parts.join(' | ') : '';
                      })()}
                    />
                  </PhotoGenerationBox>
                </div>

                {/* Область для отображения сгенерированных фото - внизу контейнера */}
                <div style={{ flex: '1 1 auto', marginTop: 'auto', paddingTop: theme.spacing.md }}>
                  {}
                  
                  {isLoadingPhotos ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#fff', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', margin: '1rem 0' }}>
                      Загрузка фотографий...
                    </div>
                  ) : (generatedPhotos && Array.isArray(generatedPhotos) && generatedPhotos.length > 0) ? (
                    <FullSizePhotoSlider style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
                      <GeneratedPhotosHeader>
                        <GeneratedPhotosTitle>Сгенерированные фото ({generatedPhotos.length})</GeneratedPhotosTitle>
                        <PhotosCounter $limitReached={isLimitReached}>
                          {selectedPhotos?.length || 0} из {MAX_MAIN_PHOTOS}
                        </PhotosCounter>
                      </GeneratedPhotosHeader>

                      <PhotoList>
                        {}
                        {generatedPhotos.map((photo, index) => {
                          if (!photo || !photo.url) {
                            
                            return null;
                          }
                          
                          
                          const isSelected = Boolean(photo?.isSelected);

                          return (
                            <PhotoTile key={`${photo?.id || `photo-${index}`}-${index}`}>
                              <PhotoImage
                                src={photo.url}
                                alt={`Photo ${index + 1}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (photo) {
                                    openPhotoModal(photo);
                                  }
                                }}
                                onError={(e) => {
                                  
                                }}
                                onLoad={() => {
                                  
                                }}
                              />
                              <PhotoOverlay
                                onClick={(e) => e.stopPropagation()}
                              >
                                <OverlayButtons>
                                  <OverlayButton
                                    $variant={isSelected ? 'secondary' : 'primary'}
                                    disabled={!isSelected && isLimitReached}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (photo?.id) {
                                        togglePhotoSelection(photo.id);
                                      }
                                    }}
                                  >
                                    {isSelected ? (
                                      <>Убрать</>
                                    ) : (
                                      <>
                                        <Plus size={14} /> Добавить
                                      </>
                                    )}
                                  </OverlayButton>
                                </OverlayButtons>
                              </PhotoOverlay>
                            </PhotoTile>
                          );
                        }).filter(Boolean)}
                      </PhotoList>

                      <SliderDescription>
                        <DescriptionTitle>Выбор главных фото</DescriptionTitle>
                        <DescriptionText>
                          Можно добавить максимум {MAX_MAIN_PHOTOS} фотографий. Используйте кнопки «Добавить»
                          и «Удалить», чтобы управлять карточкой персонажа.
                        </DescriptionText>
                      </SliderDescription>
                    </FullSizePhotoSlider>
                  ) : (
                    <PhotoGenerationPlaceholder>
                      {isLoadingPhotos && 'Загрузка фотографий...'}
                    </PhotoGenerationPlaceholder>
                  )}
                </div>
              </ColumnContent>
            </RightColumn>
          </Form>
        </MainContent>
      
      {/* Модальное окно для просмотра фото в полный размер */}
      {selectedPhotoForView && (
        <PhotoModal 
          onClick={(e) => {
            
            closePhotoModal();
          }}
        >
          <PhotoModalContent 
            onClick={(e) => {
              
              e.stopPropagation();
            }}
          >
            <PhotoModalClose 
              onClick={(e) => {
                
                e.stopPropagation();
                closePhotoModal();
              }}
            >
              <CloseIcon />
            </PhotoModalClose>
            <ModalImageContainer>
              <PhotoModalImage 
                src={selectedPhotoForView.url} 
                alt="Generated photo full size"
              />
            </ModalImageContainer>
            <PromptPanel style={{
              display: isPromptVisible ? 'flex' : 'none',
              visibility: isPromptVisible ? 'visible' : 'hidden'
            }}>
              <PromptPanelHeader>
                <PromptPanelTitle>Промпт</PromptPanelTitle>
                <PromptCloseButton onClick={handleClosePrompt}>
                  <CloseIcon />
                </PromptCloseButton>
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
          </PhotoModalContent>
        </PhotoModal>
      )}
      
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
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
    </MainContainer>
  );
};
