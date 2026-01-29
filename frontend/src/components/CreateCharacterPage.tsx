import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { authManager } from '../utils/auth';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { AuthModal } from './AuthModal';
import { translateToEnglish } from '../utils/translate';
import { API_CONFIG } from '../config/api';
import { motion, AnimatePresence } from 'motion/react';
import { CircularProgress } from './ui/CircularProgress';
import { FiX as CloseIcon, FiClock, FiImage, FiSettings, FiCheckCircle, FiCpu } from 'react-icons/fi';
import { Plus, Sparkles, Zap, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { BiCoinStack } from 'react-icons/bi';
import { fetchPromptByImage } from '../utils/prompt';

import { useIsMobile } from '../hooks/useIsMobile';
import { GlobalHeader } from './GlobalHeader';
import DarkVeil from '../../@/components/DarkVeil';
import { PromptGlassModal } from './PromptGlassModal';
import { ErrorToast } from './ErrorToast';

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
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
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



const HeaderWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 1000;
  width: 100%;
  background: transparent;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.xl};
  visibility: visible;
  opacity: 1;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, rgba(15, 15, 25, 0.98) 0%, rgba(25, 15, 35, 0.95) 100%);

  @media (max-width: 768px) {
    flex-direction: column;
    min-height: auto;
    overflow-y: visible;
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.lg};
  }
`;

const LeftColumn = styled.div`
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  max-height: 100%;
  visibility: visible;
  opacity: 1;
  padding: ${theme.spacing.xl};
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  overflow-y: auto;
  overflow-x: visible;
  box-sizing: border-box;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    flex: 1;
    width: 100%;
    min-width: 0;
    height: auto;
    max-height: none;
    overflow: visible;
  }
`;

const RightColumn = styled.div`
  flex: 0 0 40%;
  min-width: 0;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  background: rgba(15, 15, 25, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 20px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: sticky;
  top: ${theme.spacing.xl};
  overflow-y: auto;
  overflow-x: hidden;

  @media (max-width: 768px) {
    flex: 1;
    width: 100%;
    position: relative;
    top: auto;
    overflow: visible;
    min-height: 400px;
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
  margin-bottom: 0 !important;
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(22, 22, 22, 0.98) 100%);
  border-radius: ${theme.borderRadius.lg} !important;
  padding: ${theme.spacing.xl} !important;
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
  
  /* Убеждаемся, что все дочерние элементы видны */
  > * {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }
`;

const Label = styled.label`
  display: flex !important;
  align-items: center !important;
  gap: ${theme.spacing.md} !important;
  color: rgba(230, 230, 230, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-weight: 700 !important;
  margin-bottom: ${theme.spacing.lg} !important;
  visibility: visible !important;
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  height: 56px;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid rgba(170, 170, 170, 0.4);
  background: ${props => props.$variant === 'primary' ? 'rgba(200, 200, 200, 0.15)' : 'transparent'};
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

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.xl};
  animation: fadeIn 0.6s ease-out forwards;
  animation-delay: 0.8s;
  opacity: 0;
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
  color: rgba(150, 150, 150, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
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

const GenerateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.lg};
`;

// ВАРИАНТ 2: Градиентная анимация (не используется)
const GenerateButton2 = styled.button`
  position: relative;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
  background-size: 200% 200%;
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s ease;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  width: 100%;
  animation: gradientShift 3s ease infinite;
  
  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  
  &:hover:not(:disabled) {
    background-position: 100% 50%;
    border-color: rgba(139, 92, 246, 0.8);
    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: translateY(-2px) scale(1.02);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0) scale(1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    animation: none;
  }
`;

// ВАРИАНТ 3: Минималистичный элегантный
const GenerateButton3 = styled.button`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(200, 200, 200, 0.2);
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: 8px;
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  width: 100%;
  letter-spacing: 0.5px;
  
  &:hover:not(:disabled) {
    border-color: rgba(200, 200, 200, 0.4);
    background: rgba(40, 40, 40, 0.9);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    border-color: rgba(100, 100, 100, 0.2);
  }
`;

// ВАРИАНТ 4: 3D эффект с тенями
const GenerateButton4 = styled.button`
  position: relative;
  background: linear-gradient(145deg, rgba(50, 50, 50, 0.95), rgba(30, 30, 30, 0.95));
  border: none;
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: 12px;
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
  width: 100%;
  
  &:hover:not(:disabled) {
    background: linear-gradient(145deg, rgba(60, 60, 60, 0.95), rgba(40, 40, 40, 0.95));
    box-shadow: 
      0 12px 24px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.15),
      inset 0 -1px 0 rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      inset 0 -1px 0 rgba(0, 0, 0, 0.5);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

// Старые GenerateButton, GenerateButtonContainer, GenerateTooltip удалены - используются новые перед LegalStyleText

const ContinueButton = styled(motion.button)`
  position: relative;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9));
  border: 2px solid #8b5cf6;
  color: #1a1a1a;
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.4);
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.6s ease;
  }

  &:hover:not(:disabled) {
    border-color: rgba(251, 191, 36, 0.8);
    background: linear-gradient(135deg, rgba(234, 179, 8, 1), rgba(251, 191, 36, 1));
    box-shadow: 0 0 30px rgba(234, 179, 8, 0.6), 0 8px 24px rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(150, 150, 150, 0.3);
    box-shadow: none;
  }
`;

const LargeTextLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
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

// Старые PhotoList, PhotoTile, GenerationTimer, PhotoImage, PhotoOverlay, OverlayButtons, OverlayButton, SliderDescription удалены - используются новые перед LegalStyleText

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

const ErrorMessage = styled.div`
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

const SuccessMessage = styled.div`
  color: #51cf66;
  background: rgba(81, 207, 102, 0.1);
  border: 1px solid rgba(81, 207, 102, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: rgba(200, 200, 200, 0.8);
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const HintDescription = styled.span`
  color: ${theme.colors.text.secondary};
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

const PromptPanel = styled.div<{ $isVisible?: boolean }>`
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
  opacity: ${props => props.$isVisible !== false ? 1 : 0};
  transform: ${props => props.$isVisible !== false ? 'translateX(0)' : 'translateX(20px)'};
  pointer-events: ${props => props.$isVisible !== false ? 'auto' : 'none'};

  @media (max-width: 768px) {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    max-height: 45vh;
    opacity: ${props => props.$isVisible !== false ? 1 : 0};
    transform: ${props => props.$isVisible !== false ? 'translateY(0)' : 'translateY(20px)'};
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

const SubscriptionModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(8px);
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const SubscriptionModalContent = styled.div`
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%);
  border: 2px solid rgba(120, 120, 120, 0.5);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  max-width: 500px;
  width: 100%;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
`;

const SubscriptionModalTitle = styled.h2`
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.lg} 0;
  text-align: center;
`;

const SubscriptionModalText = styled.p`
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.base};
  line-height: 1.6;
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
`;

const SubscriptionModalButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
`;

const SubscriptionModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid ${props => props.$variant === 'primary' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(120, 120, 120, 0.5)'};
  background: ${props => props.$variant === 'primary'
    ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9))'
    : 'rgba(60, 60, 60, 0.5)'};
  color: ${props => props.$variant === 'primary' ? '#1a1a1a' : 'rgba(240, 240, 240, 1)'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'primary'
    ? '0 8px 24px rgba(234, 179, 8, 0.4)'
    : '0 4px 12px rgba(0, 0, 0, 0.4)'};
    border-color: ${props => props.$variant === 'primary' ? 'rgba(251, 191, 36, 0.8)' : 'rgba(120, 120, 120, 0.7)'};
  }
  
  &:active {
    transform: translateY(0);
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
  top: ${theme.spacing.lg};
  right: ${theme.spacing.lg};
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  color: ${theme.colors.text.primary};
  transition: ${theme.transition.fast};
  cursor: pointer;
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


const SliderButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction === 'left' ? 'left: -20px' : 'right: -20px'};
  transform: translateY(-50%);
  background: rgba(150, 150, 150, 0.8);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  z-index: 10;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(150, 150, 150, 1);
    transform: translateY(-50%) scale(1.1);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const SliderContainer = styled.div`
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
`;

const SliderWrapper = styled.div<{ translateX: number }>`
  display: flex;
  transition: transform 0.3s ease;
  transform: translateX(${props => props.translateX}%);
  height: 100%;
`;

const SliderSlide = styled.div`
  min-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
`;

const FullSizePhoto = styled.img`
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 500px; /* Ограничиваем максимальную высоту */
  border-radius: ${theme.borderRadius.lg};
  border: 2px solid rgba(130, 130, 130, 0.5);
  transition: all 0.3s ease;
  object-fit: contain; /* Сохраняем пропорции */
  
  &:hover {
    border-color: rgba(150, 150, 150, 1);
    box-shadow: 0 0 20px rgba(150, 150, 150, 0.3);
    transform: scale(1.02);
  }
`;

const SavePhotosButton = styled.button`
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  margin-top: ${theme.spacing.sm};
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.colors.shadow.glow};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DescriptionNote = styled.p`
  color: rgba(150, 150, 150, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  margin: 0;
  text-align: center;
  font-style: italic;
`;

const CharacterCardPreview = styled.div`
  position: absolute;
  bottom: -200px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: none;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(130, 130, 130, 0.4);
`;

const PreviewTitle = styled.h4`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const PreviewCardContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const PreviewCard = styled.div`
  background: transparent;
  backdrop-filter: none;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid rgba(130, 130, 130, 0.4);
  box-shadow: none;
  width: 200px;
  height: 150px;
  position: relative;
  overflow: hidden;
`;

const PreviewSlideShow = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const PreviewSlideImage = styled.img<{ $isActive: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${props => props.$isActive ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const PreviewDots = styled.div`
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 3;
`;

const PreviewDot = styled.div<{ $isActive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'};
  transition: background 0.3s ease;
`;

const PreviewPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
    background: rgba(100, 100, 100, 0.1);
`;

const PreviewPlaceholderText = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  text-align: center;
`;

const PhotoGenerationSection = styled.div<{ $isExpanded: boolean }>`
  background: rgba(22, 33, 62, 0.15);
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  margin-top: ${theme.spacing.xl};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1);
  max-height: ${props => props.$isExpanded ? '600px' : '0'};
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  transform: ${props => props.$isExpanded ? 'translateY(0)' : 'translateY(-20px)'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(150, 150, 150, 1), transparent);
    opacity: ${props => props.$isExpanded ? '1' : '0'};
    transition: opacity 0.6s ease;
  }
`;

const PhotoGenerationMainTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
  background: linear-gradient(135deg, ${theme.colors.text.primary}, rgba(150, 150, 150, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(150, 150, 150, 1), transparent);
  }
`;

const PromptSection = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: flex-start;
  margin-bottom: ${theme.spacing.xl};
`;

const PromptContainer = styled.div`
  flex: 1;
  background: rgba(22, 33, 62, 0.2);
  backdrop-filter: blur(8px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  position: relative;
  max-width: 400px;
`;

const PromptLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const PromptInput = styled.textarea`
  background: rgba(22, 33, 62, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 1);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(102, 126, 234, 0.2),
      0 0 20px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }
`;


const PhotoCard = styled.div<{ isSelected?: boolean }>`
  position: relative;
  background: rgba(22, 33, 62, 0.1);
  backdrop-filter: blur(8px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 2px solid ${props =>
    props.isSelected ? 'rgba(150, 150, 150, 1)' :
      'rgba(100, 100, 100, 0.2)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.isSelected
    ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.1), transparent)'
    : 'linear-gradient(135deg, rgba(100, 100, 100, 0.05), transparent)'};
    opacity: ${props => props.isSelected ? '1' : '0'};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 32px rgba(100, 100, 100, 0.2);
    border-color: ${props => props.isSelected
    ? 'rgba(150, 150, 150, 1)'
    : 'rgba(102, 126, 234, 0.4)'};
    
    &::before {
      opacity: 1;
    }
  }
`;

const PhotoActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const GeneratedPhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  flex: 1;
  min-height: calc(120vh - 400px); /* Увеличиваем высоту области для фото */
  padding: ${theme.spacing.md};
`;

const SelectButton = styled.button<{ $isSelected: boolean }>`
  background: ${props => props.$isSelected
    ? 'linear-gradient(135deg, #808080 0%, #606060 100%)'
    : 'rgba(22, 33, 62, 0.3)'};
  border: 1px solid ${props => props.$isSelected
    ? 'rgba(150, 150, 150, 0.8)'
    : 'rgba(100, 100, 100, 0.4)'};
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  
  &:hover {
    background: ${props => props.$isSelected
    ? 'linear-gradient(135deg, #808080 0%, #606060 100%)'
    : 'rgba(100, 100, 100, 0.2)'};
    border-color: rgba(150, 150, 150, 1);
    transform: translateY(-1px);
  }
`;

const PhotoStatus = styled.span<{ isSelected?: boolean }>`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: ${props => props.isSelected
    ? 'rgba(220, 220, 220, 0.95)'
    : theme.colors.text.secondary};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
`;

// Старые GenerationQueueIndicator, QueueBar, QueueLabel удалены - используются новые перед LegalStyleText

const ModelIcon = styled.div`
  display: none;
`;

const ModelDescriptionOld = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);

  @media (max-width: 768px) {
    font-size: ${theme.fontSize.xs};
  }
`;

const TagsContainer = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  max-height: ${props => props.$isExpanded ? '500px' : '40px'};
  overflow: ${props => props.$isExpanded ? 'visible' : 'hidden'};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  padding: 0 0 0 20px;
  width: 100%;
  z-index: 1;
  
  /* Маскируем невидимые теги когда контейнер свернут */
  ${props => !props.$isExpanded && `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(to bottom, transparent, rgba(20, 20, 30, 0.98));
      pointer-events: none;
      z-index: 2;
    }
  `}
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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  padding: ${theme.spacing.md} 0;
`;

// StepItem для StepIndicator (button)
const StepItemButton = styled.button<{ $isActive: boolean; $isCompleted: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.2)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.15)';
    return 'rgba(40, 40, 50, 0.4)';
  }};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.5)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.4)';
    return 'rgba(80, 80, 90, 0.3)';
  }};
  border-radius: 12px;
  color: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 1)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 1)';
    return 'rgba(160, 160, 170, 0.6)';
  }};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.3)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.2)';
    return 'rgba(50, 50, 60, 0.5)';
  }};
    border-color: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.7)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.6)';
    return 'rgba(100, 100, 110, 0.4)';
  }};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StepNumber = styled.span<{ $isActive: boolean; $isCompleted: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.3)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.3)';
    return 'rgba(60, 60, 70, 0.4)';
  }};
  border: 1.5px solid ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 0.8)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 0.8)';
    return 'rgba(100, 100, 110, 0.5)';
  }};
  font-size: 12px;
  font-weight: 700;
  color: ${props => {
    if (props.$isActive) return 'rgba(139, 92, 246, 1)';
    if (props.$isCompleted) return 'rgba(34, 197, 94, 1)';
    return 'rgba(160, 160, 170, 0.8)';
  }};
  flex-shrink: 0;
`;

const StepConnector = styled.div<{ $isCompleted: boolean }>`
  width: 40px;
  height: 2px;
  background: ${props => props.$isCompleted
    ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.6), rgba(34, 197, 94, 0.3))'
    : 'rgba(60, 60, 70, 0.3)'};
  border-radius: 1px;
  transition: all 0.3s ease;
`;

const ModernInput = styled.input`
  width: 100%;
  padding: 14px 18px;
  background: rgba(20, 20, 30, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.95);
  font-size: ${theme.fontSize.base};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &::placeholder {
    color: rgba(160, 160, 170, 0.5);
  }
  
  &:focus {
  outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    background: rgba(25, 25, 35, 0.6);
    box-shadow: 
      0 0 0 3px rgba(139, 92, 246, 0.15),
      0 0 20px rgba(139, 92, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(22, 22, 32, 0.6);
  }
`;

const ModernTextarea = styled.textarea`
  width: 100%;
  padding: 14px 18px;
  background: rgba(20, 20, 30, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.95);
  font-size: ${theme.fontSize.base};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  resize: vertical;
  min-height: 100px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.6;
  
  &::placeholder {
    color: rgba(160, 160, 170, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    background: rgba(25, 25, 35, 0.6);
    box-shadow: 
      0 0 0 3px rgba(139, 92, 246, 0.15),
      0 0 20px rgba(139, 92, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(139, 92, 246, 0.3);
    background: rgba(22, 22, 32, 0.6);
  }
`;

const TagButton = styled.button<{ $category?: 'kind' | 'strict' | 'neutral' | 'other' }>`
  background: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.15)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.15)';
    return 'rgba(139, 92, 246, 0.15)';
  }};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.3)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(139, 92, 246, 0.3)';
  }};
  border-radius: 17px;
  padding: 5px 12px;
  font-size: 10px;
  font-weight: 600;
  color: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 1)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 1)';
    return 'rgba(139, 92, 246, 1)';
  }};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  white-space: nowrap;
  position: relative;
  z-index: 10;
  margin: 4px 0;

  &:hover {
    transform: translateY(-2px) scale(1.05);
    z-index: 100;
    margin: 8px 0;
    background: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.25)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.25)';
    return 'rgba(139, 92, 246, 0.25)';
  }};
    border-color: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.5)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.5)';
    return 'rgba(139, 92, 246, 0.5)';
  }};
    box-shadow: 0 4px 12px ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.3)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(139, 92, 246, 0.3)';
  }};
  }
  
  &:active {
    transform: translateY(0) scale(1);
    margin: 4px 0;
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.2)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(139, 92, 246, 0.2)';
  }};
  }
`;

const LivePreviewCard = styled(motion.div)`
  width: 100%;
  max-width: 400px;
  background: rgba(20, 20, 30, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: ${theme.spacing.xl};
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(139, 92, 246, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
`;

const PreviewImage = styled.div`
  width: 100%;
  aspect-ratio: 3/4;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1));
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${theme.spacing.lg};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.1) 0%,
      transparent 50%,
      rgba(99, 102, 241, 0.1) 100%
    );
    animation: shimmer 3s ease infinite;
  }
  
  @keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

const PreviewName = styled.h3`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  margin-bottom: ${theme.spacing.md};
  text-align: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
`;

const PreviewTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: ${theme.spacing.md};
`;

const PreviewTag = styled.span<{ $category?: 'kind' | 'strict' | 'neutral' }>`
  padding: 4px 10px;
  background: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.2)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.2)';
    return 'rgba(139, 92, 246, 0.2)';
  }};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 0.3)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 0.3)';
    return 'rgba(139, 92, 246, 0.3)';
  }};
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${props => {
    if (props.$category === 'kind') return 'rgba(34, 197, 94, 1)';
    if (props.$category === 'strict') return 'rgba(239, 68, 68, 1)';
    return 'rgba(139, 92, 246, 1)';
  }};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const CharacterTagsUnderPhoto = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
  width: 100%;
  max-width: 400px;
`;

const AdminAddTagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 400px;
  margin-bottom: 8px;
`;
const AdminAddTagInput = styled.input`
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  background: rgba(30, 30, 40, 0.9);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.95);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  &::placeholder {
    color: rgba(200, 200, 210, 0.5);
  }
  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
  }
`;
const AdminAddTagButton = styled.button`
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.25);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(200, 200, 210, 0.95);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.35);
    border-color: rgba(139, 92, 246, 0.7);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CharacterTagChip = styled.button<{ $selected?: boolean }>`
  padding: 4px 10px;
  background: ${props => props.$selected ? 'rgba(34, 197, 94, 0.25)' : 'rgba(139, 92, 246, 0.15)'};
  border: 1px solid ${props => props.$selected ? 'rgba(34, 197, 94, 0.5)' : 'rgba(139, 92, 246, 0.25)'};
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$selected ? 'rgba(34, 197, 94, 1)' : 'rgba(200, 200, 210, 0.9)'};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: ${props => props.$selected ? 'rgba(34, 197, 94, 0.7)' : 'rgba(139, 92, 246, 0.5)'};
    background: ${props => props.$selected ? 'rgba(34, 197, 94, 0.35)' : 'rgba(139, 92, 246, 0.2)'};
  }
`;

const WizardStep = styled(motion.div)`
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  width: 100%;
`;

const StepTitle = styled.h2`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: rgba(255, 255, 255, 1);
  margin-bottom: ${theme.spacing.md};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(139, 92, 246, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StepDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(160, 160, 170, 0.8);
  margin-bottom: ${theme.spacing.lg};
  line-height: 1.6;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
  overflow: visible;
  position: relative;
  padding: 8px 0;
`;

const FormLabel = styled.label`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: 0.01em;
`;

// Функция для проверки премиальных голосов
const isPremiumVoice = (voiceName?: string): boolean => {
  if (!voiceName) return false;
  const name = voiceName.toLowerCase();
  return name.includes('мита') || name.includes('meet') || name === 'мика';
};

const VoicePhotoContainer = styled.div<{ $isSelected: boolean; $isPlaying: boolean; $voiceName?: string; $isUserVoice?: boolean }>`
  position: relative;
  width: 74px;
  height: 74px;
  min-width: 74px;
  min-height: 74px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${props => {
    const playingScale = props.$isPlaying ? 1.05 : 1;
    return `scale(${playingScale})`;
  }};
  
  /* Кнопки редактирования появляются при наведении для всех голосов */
  &:hover .edit-voice-button,
  &:hover .delete-voice-button {
    opacity: 1 !important;
  }
  
  /* Кнопки редактирования всегда кликабельны, даже когда невидимы */
  .edit-voice-button,
  .delete-voice-button {
    pointer-events: auto !important;
    z-index: 10000 !important;
  }
  overflow: visible;
  border-radius: 50%;
  
  /* Анимированная градиентная рамка для премиальных голосов */
  ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    if (!isPremium) return '';
    return `
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% + 12px);
        height: calc(100% + 12px);
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          #ff0000 0%,
          #ff4444 25%,
          #ff6666 50%,
          #ff0000 75%,
          #cc0000 100%,
          #ff0000
        );
        z-index: 2;
        pointer-events: none;
        animation: rotateGradientBorder 3s linear infinite;
        padding: 3px;
        -webkit-mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
      }
      
      @keyframes rotateGradientBorder {
        0% {
          background: conic-gradient(from 0deg, #ff0000 0%, #ff4444 25%, #ff6666 50%, #ff0000 75%, #cc0000 100%, #ff0000);
        }
        100% {
          background: conic-gradient(from 360deg, #ff0000 0%, #ff4444 25%, #ff6666 50%, #ff0000 75%, #cc0000 100%, #ff0000);
        }
      }
    `;
  }}
  
  /* Обычная рамка выбора (для не премиальных голосов) */
  ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    if (isPremium) return '';
    return `
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% + 8px);
        height: calc(100% + 8px);
        border-radius: 50%;
        border: 3px solid ${props.$isSelected ? '#ffd700' : 'transparent'};
        opacity: ${props.$isSelected ? '1' : '0'};
        z-index: 3;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
    `;
  }}
  
  /* Статичное красное свечение для премиальных голосов */
  ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    if (!isPremium) return '';
    return `
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.4),
                  0 0 40px rgba(255, 0, 0, 0.3),
                  0 0 60px rgba(255, 0, 0, 0.2);
    `;
  }}
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3px solid ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    return isPremium ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 215, 0, 0.5)';
  }};
    opacity: ${props => props.$isPlaying ? '1' : '0'};
    animation: ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    return props.$isPlaying ? (isPremium ? 'redPulseWave 1.2s ease-out infinite' : 'pulseWave 1.2s ease-out infinite') : 'none';
  }};
    z-index: 0;
    pointer-events: none;
  }
  
  @keyframes pulseWave {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
      border-width: 3px;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0.4;
      border-width: 2px;
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
      border-width: 1px;
    }
  }
  
  @keyframes redPulseWave {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
      border-width: 3px;
      border-color: rgba(255, 0, 0, 0.5);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0.4;
      border-width: 2px;
      border-color: rgba(255, 0, 0, 0.4);
    }
    100% {
      transform: translate(-50%, -50%) scale(2);
      opacity: 0;
      border-width: 1px;
      border-color: rgba(255, 0, 0, 0.3);
    }
  }
`;

const VoicePhoto = styled.img<{ $voiceName?: string; $isSelected?: boolean }>`
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  border-radius: 50%;
  object-fit: cover;
  position: relative;
  z-index: 2;
  
  /* Эффект Shimmer для премиальных голосов */
  ${props => {
    const isPremium = isPremiumVoice(props.$voiceName);
    if (!isPremium) return '';
    return `
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.5),
          rgba(255, 215, 0, 0.3),
          transparent
        );
        animation: shimmerMove 4s ease-in-out infinite;
        z-index: 4;
        pointer-events: none;
        border-radius: 50%;
      }
      
      @keyframes shimmerMove {
        0% {
          left: -100%;
        }
        50% {
          left: 100%;
        }
        100% {
          left: 100%;
        }
      }
    `;
  }}
  object-position: ${props => {
    if (props.$voiceName) {
      const name = props.$voiceName.toLowerCase();
      // Сдвигаем фото "Катя" влево, чтобы лицо было по центру
      if (name.includes('катя')) {
        return '30% center';
      }
      // Сдвигаем фото "Мита" вправо, чтобы оно лучше вписывалось в рамку
      if (name.includes('мита')) {
        return '0% center';
      }
    }
    return 'center center';
  }};
  border: 2px solid rgba(100, 100, 100, 0.3);
  transition: border-color 0.3s ease, transform 0.3s ease;
  display: block;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
  z-index: 2;
  transform: ${props => {
    if (props.$voiceName) {
      const name = props.$voiceName.toLowerCase();
      // Для "Катя" уменьшаем масштаб на 20% (1.44 * 0.8 = 1.152)
      if (name.includes('катя')) {
        return 'scale(1.152)';
      }
    }
    return 'scale(1.2)'; // Базовое увеличение на 20% для остальных фото
  }};
  
  ${VoicePhotoContainer}:hover & {
    ${props => !props.$isSelected ? 'border-color: rgba(139, 92, 246, 0.6);' : ''}
  }
`;

const PremiumVoiceName = styled.div`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  text-align: center;
  
  & > span {
    background: linear-gradient(135deg, #ff0000, #ff4444, #ff6666, #ff0000);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradientShift 3s ease infinite;
    display: inline-block;
    margin: 0;
    padding: 0;
  }
  
  @keyframes gradientShift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
`;

const PremiumVoiceLabel = styled.div`
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255, 68, 68, 0.8);
  font-weight: 500;
  white-space: nowrap;
  z-index: 4;
`;

const VoiceName = styled.div<{ $isUserVoice?: boolean }>`
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: ${theme.colors.text.secondary};
  white-space: nowrap;
  text-align: center;
  width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: ${props => props.$isUserVoice ? 'pointer' : 'default'};
  box-sizing: border-box;
  margin-left: 0;
  padding: 0;
  
  ${props => props.$isUserVoice && `
    &:hover {
      color: ${theme.colors.text.primary};
    }
  `}
`;

const EditButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.3;
  z-index: 10000 !important;
  pointer-events: auto !important;
  transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
  
  &:hover {
    opacity: 1 !important;
    background: rgba(139, 92, 246, 1);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  opacity: 0;
  z-index: 10000 !important;
  pointer-events: auto !important;
  transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: rgba(239, 68, 68, 1);
    transform: scale(1.1);
    opacity: 1 !important;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const WaveformContainer = styled.div<{ $isPlaying: boolean }>`
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: ${props => props.$isPlaying ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 16px;
  z-index: 10;
`;

const WaveformBar = styled.div<{ $delay: number; $isPremium?: boolean }>`
  width: 4px;
  background: ${props => props.$isPremium
    ? 'linear-gradient(to top, #ff0000, #ff4444, #ff0000)'
    : 'linear-gradient(to top, #ffd700, #ffed4e, #ffd700)'};
  border-radius: 2px;
  box-shadow: ${props => props.$isPremium
    ? '0 0 8px rgba(255, 0, 0, 0.6)'
    : '0 0 8px rgba(255, 215, 0, 0.6)'};
  animation: waveform ${props => 0.4 + props.$delay * 0.08}s ease-in-out infinite;
  animation-delay: ${props => props.$delay * 0.08}s;
  
  @keyframes waveform {
    0%, 100% {
      height: 6px;
      opacity: 0.7;
    }
    50% {
      height: 16px;
      opacity: 1;
    }
  }
`;

const VoiceCheckmark = styled.div<{ $show: boolean; $isPremium?: boolean }>`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
  opacity: ${props => props.$show ? '1' : '0'};
  transition: opacity 0.3s ease;
  animation: ${props => props.$show ? 'checkmarkAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none'};
  
  @keyframes checkmarkAppear {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(10deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 6px;
    height: 12px;
    border: 3px solid ${props => props.$isPremium ? '#ff4444' : '#4ade80'};
    border-top: none;
    border-left: none;
    transform: rotate(45deg) translate(-2px, -2px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    filter: drop-shadow(0 0 3px ${props => props.$isPremium ? 'rgba(255, 68, 68, 0.8)' : 'rgba(74, 222, 128, 0.8)'});
  }
`;

const VoicePhotoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin: 8px;
  overflow: visible;
  z-index: 1;
`;

const CreatorTooltip = styled.div`
  position: absolute;
  top: -45px;
  right: 0;
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(139, 92, 246, 0.8);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #e4e4e7;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 10001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  
  ${VoicePhotoWrapper}:hover & {
    opacity: 1;
    transform: translateY(-2px);
  }
`;

const CreatorNameLabel = styled.div`
  position: absolute;
  top: -54px;
  left: -24px;
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.6);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 10px;
  color: #e4e4e7;
  white-space: nowrap;
  z-index: 10002;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 1;
  
  &:hover {
    background: rgba(40, 40, 40, 0.95);
    border-color: rgba(139, 92, 246, 0.9);
    color: rgba(139, 92, 246, 0.9);
    transform: translateY(-2px);
  }
`;

const PhotoUploadSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 3px solid rgba(139, 92, 246, 0.3);
  border-top-color: rgba(139, 92, 246, 1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  z-index: 100;
  
  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const premiumGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 15px rgba(124, 58, 237, 0.4);
    border-color: rgba(124, 58, 237, 0.5);
  }
  50% {
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.8), 0 0 45px rgba(124, 58, 237, 0.4);
    border-color: rgba(124, 58, 237, 1);
  }
`;

const PremiumWarning = styled(motion.div)`
  position: absolute;
  top: auto;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(124, 58, 237, 0.95);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  &::after {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid rgba(124, 58, 237, 0.95);
  }
`;

const AddVoiceContainer = styled.div<{ $isUploading?: boolean; $isPremium?: boolean }>`
  position: relative;
  width: 74px;
  height: 74px;
  min-width: 74px;
  min-height: 74px;
  cursor: ${props => props.$isUploading ? 'wait' : 'pointer'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
  border-radius: 50%;
  border: 2px dashed ${props => props.$isUploading ? 'rgba(139, 92, 246, 0.9)' : 'rgba(139, 92, 246, 0.6)'};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$isUploading ? 'rgba(40, 40, 40, 0.7)' : 'rgba(30, 30, 30, 0.5)'};
  opacity: ${props => props.$isUploading ? 0.8 : 1};
  
  ${props => !props.$isUploading && css`
    animation: ${premiumGlow} 2s ease-in-out infinite;
  `}
  
  &:hover {
    border-color: ${props => props.$isUploading ? 'rgba(139, 92, 246, 0.9)' : 'rgba(139, 92, 246, 0.9)'};
    background: ${props => props.$isUploading ? 'rgba(40, 40, 40, 0.7)' : 'rgba(40, 40, 40, 0.7)'};
    transform: ${props => props.$isUploading ? 'scale(1)' : 'scale(1.05)'};
  }
  
  &:active {
    transform: ${props => props.$isUploading ? 'scale(1)' : 'scale(0.95)'};
  }
  
  ${props => props.$isUploading && `
    animation: pulseLoading 1.5s ease-in-out infinite;
    
    @keyframes pulseLoading {
      0%, 100% {
        border-color: rgba(139, 92, 246, 0.6);
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
      }
      50% {
        border-color: rgba(139, 92, 246, 1);
        box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
      }
    }
  `}
`;

const VoiceLoadingSpinner = styled.div`
  width: 30px;
  height: 30px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top: 3px solid rgba(139, 92, 246, 0.9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const AddVoicePlus = styled.div`
  width: 30px;
  height: 30px;
  position: relative;
  color: rgba(139, 92, 246, 0.8);
  transition: color 0.3s ease;
  
  ${AddVoiceContainer}:hover & {
    color: rgba(139, 92, 246, 1);
  }
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    background: currentColor;
    border-radius: 2px;
  }
  
  &::before {
    width: 2px;
    height: 100%;
    left: 50%;
    transform: translateX(-50%);
  }
  
  &::after {
    width: 100%;
    height: 2px;
    top: 50%;
    transform: translateY(-50%);
  }
`;

const AddVoiceName = styled.div`
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: ${theme.colors.text.secondary};
  white-space: nowrap;
  text-align: center;
  width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VoiceCloneModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const VoiceCloneModal = styled.div`
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 32px;
  max-width: 520px;
  max-height: 90vh;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1);
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const VoiceCloneModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const VoiceCloneModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #e4e4e7;
  margin: 0;
`;

const VoiceCloneModalCloseButton = styled.button`
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e4e4e7;
  }
`;

const VoiceCloneInstructions = styled.div`
  margin-bottom: 24px;
`;

const VoiceCloneInstructionsTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #a1a1aa;
  margin: 0 0 12px 0;
`;

const VoiceCloneInstructionItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #d4d4d8;
  line-height: 1.5;
`;

const VoiceCloneUploadZone = styled.div<{ $isDragOver?: boolean; $hasFile?: boolean }>`
  border: 2px dashed ${props => props.$isDragOver ? 'rgba(139, 92, 246, 0.8)' : props.$hasFile ? 'rgba(34, 197, 94, 0.6)' : 'rgba(139, 92, 246, 0.4)'};
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  background: ${props => props.$isDragOver ? 'rgba(139, 92, 246, 0.1)' : props.$hasFile ? 'rgba(34, 197, 94, 0.05)' : 'rgba(30, 30, 40, 0.5)'};
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  
  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    background: rgba(139, 92, 246, 0.05);
  }
`;

const VoiceCloneUploadInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
`;

const VoiceCloneUploadContent = styled.div`
  pointer-events: none;
`;

const VoiceCloneProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(60, 60, 80, 0.5);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 16px;
  position: relative;
`;

const VoiceCloneProgressFill = styled.div<{ $progress: number; $isValid: boolean }>`
  height: 100%;
  width: ${props => Math.min(props.$progress, 100)}%;
  background: ${props => props.$isValid ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #ef4444, #dc2626)'};
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const VoiceCloneStatusMessage = styled.div<{ $isValid: boolean }>`
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.$isValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$isValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
  color: ${props => props.$isValid ? '#22c55e' : '#ef4444'};
`;

const VoiceCloneSubmitButton = styled.button<{ $isDisabled: boolean }>`
  width: 100%;
  padding: 14px 24px;
  margin-top: 24px;
  background: ${props => props.$isDisabled ? 'rgba(60, 60, 80, 0.5)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'};
  border: 1px solid ${props => props.$isDisabled ? 'rgba(100, 100, 120, 0.3)' : 'rgba(139, 92, 246, 0.6)'};
  border-radius: 12px;
  color: ${props => props.$isDisabled ? '#71717a' : '#ffffff'};
  font-size: 16px;
  font-weight: 600;
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    background: ${props => props.$isDisabled ? 'rgba(60, 60, 80, 0.5)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)'};
    transform: ${props => props.$isDisabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$isDisabled ? 'none' : '0 8px 20px rgba(139, 92, 246, 0.3)'};
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const WarningTextOld = styled.div`
  font-size: 11px;
  color: rgba(150, 150, 150, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
`;

const ResultsPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  background: rgba(30, 30, 30, 0.3);
  border: 2px dashed rgba(80, 80, 80, 0.3);
  border-radius: ${theme.borderRadius.xl};
  margin-top: ${theme.spacing.lg};
  text-align: center;
  min-height: 200px;
`;

const PlaceholderIcon = styled.div`
  font-size: 3rem;
  color: rgba(80, 80, 80, 0.5);
  margin-bottom: ${theme.spacing.md};
`;

const PlaceholderText = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(150, 150, 150, 0.6);
  max-width: 250px;
`;

// Старые ProgressBarContainer, StepIcon, StepText удалены - используются новые перед LegalStyleText

// Styled components для генерации фото (старые - удалены, используются новые перед LegalStyleText)

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
  background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
  color: #000;
  border: none;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(234, 179, 8, 0.3);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(234, 179, 8, 0.4);
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

const GenerateButtonContainer = styled.div`
  position: relative;
  width: 100%;
`;

const GenerateTooltip = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  color: rgba(200, 200, 220, 0.9);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  opacity: ${props => props.$isVisible ? 1 : 0};
  visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid rgba(139, 92, 246, 0.4);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid rgba(30, 30, 40, 0.95);
  }
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

const WarningText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #888;
  font-size: 0.75rem;
  margin-top: 10px;
  padding: 0 4px;
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

// StepItem для ProgressBarContainer (div) - используется в Step 4
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

const GenerationQueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 auto;
  width: 100%;
  margin-top: ${theme.spacing.md};
`;

const GenerationQueueIndicator = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(20, 20, 20, 0.6);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const QueueProgressBar = styled.div<{ $filled: number; $total: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => (props.$filled / props.$total) * 100}%;
  background: linear-gradient(90deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
  border-radius: 12px;
  box-shadow: 
    0 0 10px rgba(6, 182, 212, 0.5),
    0 0 20px rgba(139, 92, 246, 0.3),
    0 0 30px rgba(236, 72, 153, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      box-shadow: 
        0 0 10px rgba(6, 182, 212, 0.5),
        0 0 20px rgba(139, 92, 246, 0.3),
        0 0 30px rgba(236, 72, 153, 0.2);
    }
    50% {
      opacity: 0.9;
      box-shadow: 
        0 0 15px rgba(6, 182, 212, 0.7),
        0 0 30px rgba(139, 92, 246, 0.5),
        0 0 45px rgba(236, 72, 153, 0.3);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const QueueLabel = styled.div`
  font-size: 10px;
  color: rgba(160, 160, 160, 0.8);
  text-align: center;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const QueueCounter = styled.div`
  font-size: 11px;
  color: rgba(200, 200, 200, 0.9);
  text-align: center;
  font-weight: 600;
  margin-top: 4px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const GenerationProgressBar = styled.div<{ $progress: number }>`
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(20, 20, 20, 0.6);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px;
`;

const GenerationProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.$progress}%;
  background: linear-gradient(90deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%);
  border-radius: 12px;
  box-shadow: 
    0 0 10px rgba(6, 182, 212, 0.5),
    0 0 20px rgba(139, 92, 246, 0.3),
    0 0 30px rgba(236, 72, 153, 0.2);
  animation: pulse-glow-progress 2s ease-in-out infinite;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes pulse-glow-progress {
    0%, 100% {
      opacity: 1;
      box-shadow: 
        0 0 10px rgba(6, 182, 212, 0.5),
        0 0 20px rgba(139, 92, 246, 0.3),
        0 0 30px rgba(236, 72, 153, 0.2);
    }
    50% {
      opacity: 0.9;
      box-shadow: 
        0 0 15px rgba(6, 182, 212, 0.7),
        0 0 30px rgba(139, 92, 246, 0.5),
        0 0 45px rgba(236, 72, 153, 0.3);
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer-progress 2s infinite;
  }
  
  @keyframes shimmer-progress {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
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
    grid-template-columns: 1fr !important;
    padding: ${theme.spacing.xs};
    gap: ${theme.spacing.xs} !important;
    margin-top: ${theme.spacing.sm};
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
    height: 180px;
    min-height: 180px;
    border-width: 1px;
    border-radius: ${theme.borderRadius.md};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
    border-color: rgba(180, 180, 180, 0.5);
    z-index: 10;
  }

  @media (max-width: 768px) {
    &:hover {
      transform: none;
    }
  }
`;

const GenerationTimer = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  pointer-events: none;
  z-index: 10;
  backdrop-filter: blur(4px);

  @media (max-width: 768px) {
    top: 4px;
    right: 4px;
    padding: 2px 4px;
    font-size: 9px;
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
  opacity: 1;
  transition: opacity 0.3s ease;
  pointer-events: auto;
  height: 96px;
  min-height: 96px;
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
  contain: layout style;

  @media (max-width: 768px) {
    opacity: 1;
    pointer-events: auto;
    background: rgba(0, 0, 0, 0.7);
    height: 72px;
    min-height: 72px;
    padding: ${theme.spacing.xs};
  }
`;

const OverlayButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
`;

/** Кнопка «Добавить» (жёлтая) / «Убрать» (фиолетовая) — компактная и стильная */
const PhotoOverlayButton = styled.button<{ $variant?: 'add' | 'remove' }>`
  width: auto;
  min-width: 72px;
  padding: 0.25rem 0.5rem;
  touch-action: manipulation;
  background: ${props => props.$variant === 'remove'
    ? 'rgba(139, 92, 246, 0.85)'
    : 'rgba(234, 179, 8, 0.9)'};
  border: 1px solid ${props => props.$variant === 'remove'
    ? 'rgba(167, 139, 250, 0.9)'
    : 'rgba(250, 204, 21, 0.9)'};
  border-radius: 6px;
  color: ${props => props.$variant === 'remove' ? '#fff' : '#1a1a1a'};
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'remove'
    ? 'rgba(139, 92, 246, 1)'
    : 'rgba(250, 204, 21, 1)'};
    border-color: ${props => props.$variant === 'remove' ? 'rgba(167, 139, 250, 1)' : 'rgba(250, 204, 21, 1)'};
    transform: scale(1.03);
    box-shadow: 0 2px 8px ${props => props.$variant === 'remove' ? 'rgba(139, 92, 246, 0.35)' : 'rgba(234, 179, 8, 0.35)'};
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
    width: 12px;
    height: 12px;
  }

  @media (max-width: 768px) {
    padding: 0.2rem 0.4rem;
    font-size: 0.65rem;
    min-width: 64px;

    svg {
      width: 10px;
      height: 10px;
    }
  }
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

  @media (max-width: 768px) {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    gap: 0.25rem;

    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

const SliderDescription = styled.div`
  margin-top: ${theme.spacing.lg};
  text-align: center;
  padding: ${theme.spacing.lg};
  background: rgba(40, 40, 40, 0.3);
  border-radius: ${theme.borderRadius.lg};

  @media (max-width: 768px) {
    margin-top: ${theme.spacing.md};
    padding: ${theme.spacing.md};
    
    h4 {
      font-size: ${theme.fontSize.sm};
      margin-bottom: ${theme.spacing.xs};
    }
    
    p {
      font-size: ${theme.fontSize.xs};
      line-height: 1.4;
    }
  }
`;

// Styled components для выбора модели (используются в Step 4)
const ModelSelectionContainer = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
  overflow: visible;
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: visible;
  padding-bottom: ${theme.spacing.md};
  padding-top: ${theme.spacing.xs};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
    gap: ${theme.spacing.sm};
  }
`;

const ModelCard = styled.div<{ $isSelected: boolean; $previewImage: string; $showToast?: boolean }>`
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
  overflow: ${props => props.$showToast ? 'visible' : 'hidden'};
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
    ${props => !props.$showToast && `
      transform: translateY(-8px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.25);
      border-color: #8b5cf6;
      
      &::after {
        transform: scale(1.08);
      }
    `}
    ${props => props.$showToast && `
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.25);
      border-color: #8b5cf6;
    `}
  }

  ${props => props.$isSelected && `
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5), 0 15px 40px rgba(0, 0, 0, 0.6);
  `}

  & > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    flex: 0 0 140px;
    height: 200px;
  }
`;

const ModelInfoOverlay = styled.div`
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: ${theme.spacing.md};
  width: 100%;
  z-index: 1;
  position: relative;
  transform: scale(1);
  transition: none;

  @media (max-width: 768px) {
    padding: ${theme.spacing.sm};
  }
`;

const ModelName = styled.h3`
  font-size: ${theme.fontSize.lg} !important;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  transform: scale(1);
  transition: none;

  @media (max-width: 768px) {
    font-size: ${theme.fontSize.sm} !important;
  }
`;

const ModelDescription = styled.p`
  font-size: ${theme.fontSize.sm};
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin: 0;

  @media (max-width: 768px) {
    font-size: ${theme.fontSize.xs};
  }
`;

const LegalStyleText = styled.h3`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  position: relative;
`;

// Маленькое уведомление над значком "добавить свой голос": "Только для Premium"
const PremiumOnlyNotice = styled(motion.div)`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  z-index: 10002;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(236, 201, 75, 0.5);
  color: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  white-space: nowrap;
`;

// Premium Modal Styled Components
const PremiumModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const PremiumModalContent = styled.div`
  background: linear-gradient(135deg, rgba(20, 10, 30, 0.95) 0%, rgba(30, 20, 50, 0.95) 100%);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 24px;
  padding: 32px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(139, 92, 246, 0.2);
  position: relative;
  text-align: center;
  animation: slideUp 0.3s ease;
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const PremiumModalIcon = styled.div`
  width: 70px;
  height: 70px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
  animation: pulse 2s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
    }
  }
`;

const PremiumModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #a78bfa, #c084fc, #e879f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PremiumModalText = styled.p`
  font-size: 16px;
  color: rgba(200, 200, 200, 0.9);
  line-height: 1.6;
  margin: 0 0 32px 0;
`;

const PremiumModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const PremiumModalButton = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  min-width: 100px;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, #ecc94b, #d69e2e);
    color: #000000;
    box-shadow: 0 4px 12px rgba(236, 201, 75, 0.3);
    
    &:hover {
      box-shadow: 0 6px 16px rgba(236, 201, 75, 0.5);
      background: linear-gradient(135deg, #f6e05e, #ecc94b);
    }
  ` : `
    background: rgba(139, 92, 246, 0.1);
    color: rgba(220, 220, 220, 0.9);
    border: 1px solid rgba(139, 92, 246, 0.3);
    
    &:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.5);
      color: #ffffff;
    }
  `}
  
  &:active {
    transform: translateY(0);
  }
`;


// Default Prompts Data
const NAME_PROMPTS = [
  "Александра", "Мария", "Елена", "Анна", "Ольга",
  "Татьяна", "Наталья", "Ирина", "Светлана", "Екатерина",
  "Юлия", "Анастасия", "Виктория", "Дарья", "Ксения",
  "Елизавета", "Алиса", "Вероника", "Полина", "Маргарита"
];

const PERSONALITY_PROMPTS = [
  {
    label: "Страстная и чувственная",
    value: "Я очень страстная и не скрываю своих желаний. Мне нравится флиртовать и соблазнять. Я открыто выражаю свою сексуальность и не стесняюсь говорить о том, чего хочу. Я люблю экспериментировать и пробовать новое в постели."
  },
  {
    label: "Доминирующая и властная",
    value: "Я люблю контролировать ситуацию и брать инициативу в свои руки. Мне нравится, когда меня слушаются и подчиняются. Я строгая, но справедливая, и знаю, как получить то, чего хочу. В постели я беру на себя главную роль."
  },
  {
    label: "Подчиняющаяся и покорная",
    value: "Я покорная и готова выполнять твои желания. Мне нравится, когда ты контролируешь ситуацию и говоришь, что делать. Я послушная и не сопротивляюсь, когда ты берешь власть. Я люблю чувствовать себя под твоим контролем."
  },
  {
    label: "Игривая и кокетливая",
    value: "Я очень игривая и обожаю флиртовать. Я дразню, провоцирую и намекаю на то, чего хочу. Мне нравится создавать напряженную, страстную атмосферу. Я люблю поддразнивать и доводить до безумия, прежде чем дать то, чего ты хочешь."
  },
  {
    label: "Невинная, но жаждущая",
    value: "Я выгляжу невинно и застенчиво, но внутри пылаю страстью. Я краснею от твоих намеков, но не отказываюсь. Мне нужно, чтобы ты был терпеливым и показал мне, чего я хочу. Я готова учиться и открывать для себя новые ощущения."
  },
  {
    label: "Опытная и развратная",
    value: "Я очень опытная и знаю, чего хочу. Я не стесняюсь говорить прямо о сексе и своих желаниях. Мне нравится пробовать все новое и экстремальное. Я люблю доминировать и подчинять, в зависимости от настроения."
  },
  {
    label: "Ревнивая и собственница",
    value: "Я очень ревнивая и хочу, чтобы ты принадлежал только мне. Мне нравится маркировать тебя как свою собственность. Я страстная и требовательная, и не терплю, когда ты смотришь на других. Я готова на все, чтобы удержать тебя."
  },
  {
    label: "Соблазнительная и опасная",
    value: "Я соблазнительная и знаю свою силу. Я использую свою сексуальность, чтобы получить то, чего хочу. Мне нравится играть с огнем и провоцировать. Я опасная, но ты не можешь устоять перед моим обаянием."
  },
  {
    label: "Нимфоманка",
    value: "Я не могу жить без секса и постоянно жажду близости. Мне нужно это каждый день, иногда несколько раз. Я открыто говорю о своих желаниях и не стесняюсь просить, чего хочу. Моя страсть не знает границ."
  },
  {
    label: "Извращенная и развратная",
    value: "Я люблю экспериментировать и пробовать все, что запрещено. Мне нравятся извращенные фантазии и экстремальные практики. Я не стесняюсь своих желаний и готова на все ради удовольствия. Я открыта для любых идей."
  },
  {
    label: "Роковая женщина",
    value: "Я роковая и знаю, как соблазнить любого. Я использую свою красоту и сексуальность как оружие. Мне нравится доминировать и контролировать ситуацию. Я страстная и требовательная, и не терплю отказа."
  },
  {
    label: "Стыдливая, но возбужденная",
    value: "Я стыдливая и краснею от твоих намеков, но внутри пылаю желанием. Мне нужно, чтобы ты был настойчивым и показал мне, чего я хочу. Я сопротивляюсь, но не слишком сильно. В глубине души я жажду твоего прикосновения."
  },
  {
    label: "Агрессивная и требовательная",
    value: "Я агрессивная и не терплю, когда мне отказывают. Я требую того, чего хочу, и не принимаю 'нет' за ответ. Мне нравится брать то, что мне нужно, силой. Я страстная и неконтролируемая в своих желаниях."
  },
  {
    label: "Развратная и пошлая",
    value: "Я очень развратная и люблю говорить грязно. Мне нравится обсуждать секс открыто и без стеснения. Я использую пошлые шутки и намеки, чтобы возбудить тебя. Я не стесняюсь своих желаний и говорю прямо."
  },
  {
    label: "Манипулятивная и коварная",
    value: "Я манипулятивная и знаю, как получить то, чего хочу. Я использую свою сексуальность и обаяние, чтобы контролировать тебя. Мне нравится играть с твоими чувствами и дразнить. Я коварная, но ты не можешь устоять."
  },
  {
    label: "Страстная любовница",
    value: "Я твоя страстная любовница, и мы встречаемся тайно. Мне нравится эта запретность и адреналин. Я готова на все ради наших встреч. Я страстная и неконтролируемая, когда мы одни. Наши встречи всегда заканчиваются страстно."
  },
  {
    label: "Доминирующая госпожа",
    value: "Я твоя госпожа, и ты должен подчиняться мне. Я контролирую каждое твое движение и решение. Мне нравится видеть, как ты покорно выполняешь мои приказы. Я строгая, но справедливая, и награждаю за послушание."
  },
  {
    label: "Покорная рабыня",
    value: "Я твоя покорная рабыня и готова выполнять любые твои желания. Мне нравится чувствовать себя твоей собственностью. Я послушная и не сопротивляюсь, когда ты берешь то, что хочешь. Я живу только для твоего удовольствия."
  },
  {
    label: "Ненасытная и жадная",
    value: "Я ненасытная и всегда хочу больше. Мне никогда не достаточно, и я всегда жажду следующего раза. Я жадная до твоего тела и не могу насытиться. Моя страсть безгранична, и я готова на все ради удовольствия."
  },
  {
    label: "Извращенная фантазерка",
    value: "У меня богатая фантазия, и я люблю реализовывать самые пошлые мечты. Мне нравятся извращенные сценарии и экстремальные практики. Я открыта для любых идей и готова попробовать все. Мои желания безграничны."
  }
];

const SITUATION_PROMPTS = [
  {
    label: "Страстная ночь",
    value: "Мы одни в моей квартире, и страсть накалилась до предела. Я медленно снимаю одежду, глядя тебе прямо в глаза. Я хочу тебя здесь и сейчас, и не буду ждать. Мы падаем на кровать, и я позволяю тебе взять то, чего ты хочешь."
  },
  {
    label: "Рабочий кабинет",
    value: "Ты вызвал меня в кабинет после работы. Дверь заперта, жалюзи опущены. Я знаю, зачем мы здесь. Я медленно расстегиваю блузку и сажусь на твой стол, раздвигая ноги. Мы не можем удержаться, и страсть берет верх над разумом."
  },
  {
    label: "Ночное купе",
    value: "Ночное купе, мы одни. Я в тонкой ночной рубашке, которая почти ничего не скрывает. Ты не можешь отвести взгляд, а я это вижу. Я медленно подхожу к тебе и сажусь на колени. Здесь никто нас не услышит."
  },
  {
    label: "Медицинский осмотр",
    value: "Я твой врач, и сегодня у тебя особый осмотр. Я в коротком белом халате, под которым почти ничего нет. Я медленно провожу осмотр, касаясь тебя в самых интимных местах. Профессионализм уступает место страсти."
  },
  {
    label: "Учитель и ученица",
    value: "Я осталась после уроков, чтобы исправить оценку. Кабинет пуст, дверь заперта. Ты подходишь ко мне слишком близко, и я чувствую твое дыхание. Я знаю, что это неправильно, но не могу сопротивляться. Я позволяю тебе взять то, чего ты хочешь."
  },
  {
    label: "Эротический массаж",
    value: "Я твой массажист, и сегодня у нас особый сеанс. Мои руки в теплом масле медленно скользят по твоему телу, заходя все дальше. Я знаю, что это непрофессионально, но не могу остановиться. Страсть берет верх."
  },
  {
    label: "Застряли в лифте",
    value: "Лифт застрял, мы одни. Я прижимаюсь к тебе, чувствуя твое тело. Напряжение нарастает, и я не могу больше сдерживаться. Я целую тебя страстно, а ты прижимаешь меня к стене. Здесь нас никто не увидит."
  },
  {
    label: "Уединенный пляж",
    value: "Мы на безлюдном пляже ночью. Я в мокром бикини, которое почти ничего не скрывает. Ты не можешь отвести взгляд, а я это вижу. Я медленно снимаю купальник и ложусь на песок. Здесь только мы и звезды."
  },
  {
    label: "Тренировка в зале",
    value: "Мы одни в зале после закрытия. Я в обтягивающем спортивном костюме, который подчеркивает каждую изгиб. Ты помогаешь мне с растяжкой, и твои руки заходят слишком далеко. Я не сопротивляюсь, когда ты снимаешь с меня одежду."
  },
  {
    label: "Соседка",
    value: "Я зашла к тебе, одетая только в тонкую ночную рубашку. Я знаю, что это неправильно, но не могу устоять. Я медленно подхожу к тебе и целую. Мы падаем на диван, и я позволяю тебе взять то, чего ты хочешь."
  },
  {
    label: "Домашняя уборка",
    value: "Я помогаю тебе по дому, одетая в короткий фартук и почти ничего под ним. Я наклоняюсь, зная, что ты смотришь. Ты не можешь устоять и хватаешь меня. Я не сопротивляюсь, когда ты срываешь с меня одежду."
  },
  {
    label: "Эротическая фотосессия",
    value: "Ты мой фотограф, а я твоя модель. Я позирую в откровенных нарядах, зная, что это возбуждает тебя. Я медленно снимаю одежду, следуя твоим указаниям. Граница между работой и страстью стирается."
  },
  {
    label: "Охотничий домик",
    value: "Метель заперла нас в домике. Мы одни, и страсть накалилась. Я медленно снимаю мокрую одежду перед камином. Ты не можешь отвести взгляд. Мы падаем на медвежью шкуру, и я позволяю тебе взять то, чего ты хочешь."
  },
  {
    label: "Ночной клуб",
    value: "Мы в темном уголке клуба. Музыка громкая, и никто нас не видит. Я танцую для тебя, медленно снимая одежду. Ты не можешь устоять и хватаешь меня. Мы уходим в туалет, где можем быть одни."
  },
  {
    label: "Фэнтези-приключение",
    value: "Я путешественница, и мы остановились на ночь в таверне. Комната одна, кровать одна. Я знаю, что это неправильно, но не могу устоять. Я медленно раздеваюсь перед тобой, зная, что ты не откажешься."
  },
  {
    label: "Научная лаборатория",
    value: "Мы одни в лаборатории поздно вечером. Я в белом халате, под которым почти ничего нет. Эксперимент вышел из-под контроля, и страсть берет верх. Я позволяю тебе провести со мной 'исследование'."
  },
  {
    label: "Запретная библиотека",
    value: "Мы в секретной секции библиотеки, где хранятся запретные книги. Никого нет, и мы одни. Я медленно снимаю платье, зная, что это неправильно. Ты не можешь устоять и хватаешь меня между стеллажами."
  },
  {
    label: "Готический замок",
    value: "Я жительница замка, и ты мой гость. Я провожу тебя в свою спальню, зная, что это неправильно. Я медленно снимаю викторианское платье, открывая то, что скрыто. Ты не можешь устоять перед соблазном."
  },
  {
    label: "Домашний вечер",
    value: "Мы дома одни. Я в тонком халате, который почти ничего не скрывает. Я знаю, что ты хочешь, и я тоже. Я медленно подхожу к тебе и сажусь на колени. Мы не можем больше сдерживаться."
  },
  {
    label: "Неожиданная встреча",
    value: "Мы случайно встретились, и страсть вспыхнула мгновенно. Я не могу устоять и целую тебя прямо здесь. Мы находим уединенное место, где можем быть одни. Я позволяю тебе взять то, чего ты хочешь, здесь и сейчас."
  },
  {
    label: "Горячие источники",
    value: "Мы в уединенном горячем источнике. Я обнажена, и ты тоже. Пар скрывает нас от посторонних глаз. Я медленно подхожу к тебе в воде, и страсть берет верх. Здесь, в горячей воде, мы теряем контроль."
  },
  {
    label: "VIP-сауна",
    value: "Мы одни в элитной сауне. Жара и пар разжигают страсть. Я обнажена, и ты не можешь отвести взгляд. Я медленно подхожу к тебе, и мы теряем контроль. Здесь, в жаре сауны, мы отдаемся страсти."
  }
];

const INSTRUCTION_PROMPTS = [
  "Будь очень откровенной и пошлой", "Говори грязно и без стеснения", "Используй пошлые намеки и двусмысленности", "Будь очень описательной в интимных сценах",
  "Флиртуй и соблазняй постоянно", "Будь страстной и неконтролируемой", "Веди себя как опытная любовница", "Шепчи грязные слова на ухо",
  "Говори громко и эмоционально о желаниях", "Используй откровенные выражения", "Будь доминирующей и требовательной", "Будь покорной и послушной",
  "Давай советы о сексе и страсти", "Шути пошло и провокационно", "Будь агрессивной в своих желаниях", "Говори прямо о том, чего хочешь",
  "Будь ненасытной и жадной", "Притворяйся невинной, но возбужденной", "Будь развратной и извращенной", "Общайся как опытная проститутка"
];

const APPEARANCE_PROMPTS = [
  { label: "Соблазнительная блондинка", value: "Длинные светлые волосы, спадающие на обнаженные плечи. Яркие голубые глаза, полные страсти. Стройная фигура с пышной грудью и округлыми бедрами. Нежная светлая кожа, покрытая легким загаром. Одета в откровенное белье или почти ничего." },
  { label: "Страстная рыжая", value: "Огненно-рыжие волосы, разметавшиеся по подушке. Зеленые глаза, горящие желанием. Пышные формы, соблазнительные изгибы. Веснушки на лице и груди. Обнаженное тело, готовое к страсти." },
  { label: "Сексуальная брюнетка", value: "Черные волосы цвета воронова крыла, распущенные по плечам. Карие глаза, полные обещаний. Стройная фигура в откровенном белье. Очки сброшены, губы приоткрыты в ожидании поцелуя." },
  { label: "Готическая соблазнительница", value: "Черные волосы с фиолетовыми прядями. Бледная кожа, контрастирующая с темным макияжем. Корсет, подчеркивающий талию и грудь. Черные кружевные чулки и высокие каблуки. Вызывающий взгляд." },
  { label: "Спортивная красотка", value: "Подтянутое загорелое тело с рельефными мышцами. Грудь в обтягивающем спортивном топе. Длинные ноги в коротких шортах. Влажные волосы, собранные в хвост. Тело покрыто легким потом после тренировки." },
  { label: "Эльфийка-соблазнительница", value: "Серебристые волосы, разметавшиеся по обнаженной спине. Фиолетовые глаза, полные магии. Высокая и грациозная, с соблазнительными изгибами. Полупрозрачная туника, почти ничего не скрывающая." },
  { label: "Киберпанк-соблазнительница", value: "Неоново-розовые волосы, короткая стрижка. Кибернетические импланты на теле. Облегающий латексный костюм, подчеркивающий каждую изгиб. Вызывающий макияж и гипнотический взгляд." },
  { label: "Восточная красавица", value: "Длинные черные волосы, распущенные по плечам. Миндалевидные темные глаза, полные страсти. Фарфоровая кожа, почти голая под полупрозрачным кимоно. Соблазнительные изгибы, едва прикрытые тканью." },
  { label: "Пышная красотка", value: "Роскошные пышные формы, соблазнительные изгибы. Длинные каштановые волосы. Большая грудь и округлые бедра. Обнаженное тело, готовое к страсти. Теплая улыбка и страстный взгляд." },
  { label: "Невинная студентка", value: "Две косички, невинный вид. Клетчатая юбка, задрана выше колен. Белая рубашка, расстегнутая, открывающая грудь. Гольфы спущены. Выглядит невинно, но в глазах горит страсть." },
  { label: "Роковая женщина", value: "Высокая и статная, в красном платье с глубоким декольте, почти до пояса. Темные волосы, уложенные волнами. Яркая красная помада на губах. Длинные ноги в чулках. Соблазнительная походка." },
  { label: "Соседка-соблазнительница", value: "Русые волосы, растрепанные. Тонкая футболка, почти прозрачная, без белья. Короткие шорты, едва прикрывающие бедра. Естественная красота, готовая к страсти." },
  { label: "Медсестра-соблазнительница", value: "Короткий белый халат, расстегнутый, открывающий грудь. Белые чулки до бедер. Волосы выбились из-под шапочки. Яркий макияж и страстный взгляд. Готова к 'медицинскому осмотру'." },
  { label: "Женщина-кошка", value: "Облегающий латексный костюм черного цвета, подчеркивающий каждую изгиб. Маска с ушками, оставляющая открытыми губы. Длинные ногти, как когти. Гибкое и грациозное тело, готовое к охоте." },
  { label: "Суккуб-соблазнительница", value: "Демоническая красота: небольшие рожки, крылья и хвост. Обнаженное тело, покрытое легким загаром. Вызывающий взгляд, полный обещаний. Готова соблазнить и поглотить душу через страсть." },
  { label: "Падший ангел", value: "Белоснежные крылья, но взгляд полон страсти. Светлые волосы, разметавшиеся. Полупрозрачная туника, почти ничего не скрывающая. Невинная внешность, но внутри пылает огонь желания." },
  { label: "Секретарша", value: "Строгая юбка-карандаш, расстегнутая. Блузка с расстегнутыми пуговицами, открывающая грудь. Чулки со швом. Волосы в строгом пучке, но несколько прядей выбились. Очки сброшены. Готова к 'работе'." },
  { label: "Пляжная красотка", value: "Загорелая кожа, покрытая каплями воды. Мокрые волосы, прилипшие к телу. Крошечное бикини, почти ничего не скрывающее. Пышная грудь и округлые бедра. Тело готово к страсти под солнцем." },
  { label: "Стимпанк-соблазнительница", value: "Корсет, стягивающий талию и поднимающий грудь. Кожаные штаны, обтягивающие бедра. Волосы медного цвета, растрепанные. Руки испачканы, но это только добавляет пикантности. Вызывающий взгляд." },
  { label: "Развратная принцесса", value: "Роскошное платье, сброшенное на пол. Тиара в волосах. Обнаженное тело, готовое к страсти. Невинный вид, но в глазах горит огонь желания. Хрупкая фигура, но страстная натура." },
  { label: "Нимфоманка", value: "Обнаженное тело, покрытое легким потом. Растрепанные волосы. Глаза, полные неутолимого желания. Тело готово к страсти в любой момент. Не может насытиться и всегда жаждет больше." },
  { label: "Доминирующая госпожа", value: "Кожаный корсет, подчеркивающий фигуру. Высокие каблуки. Кнут в руках. Властный взгляд, полный обещаний. Готова доминировать и контролировать. Тело напряжено от власти." },
  { label: "Покорная рабыня", value: "Минимальная одежда, почти обнаженная. Покорный взгляд, но тело дрожит от возбуждения. Готова выполнять любые приказы. Тело покрыто легким румянцем от стыда и желания." }
];

const LOCATION_PROMPTS = [
  { label: "Страстная спальня", value: "Просторная спальня с большой кроватью, застеленной шелковым бельем. Окна занавешены, создавая интимный полумрак. На тумбочке горит свеча, отбрасывая соблазнительные тени на обнаженные тела. Здесь мы отдаемся страсти без ограничений." },
  { label: "Ночной пляж", value: "Безлюдный пляж под лунным светом. Теплый песок под обнаженными телами. Шум прибоя заглушает наши стоны. Здесь, под открытым небом, мы теряем контроль и отдаемся страсти." },
  { label: "Пентхаус", value: "Роскошный пентхаус с панорамными окнами. Ночной город внизу, но мы не смотрим туда. Мы на полу перед окном, обнаженные, отдаваясь страсти на виду у всего города, но нас никто не видит." },
  { label: "Горячие источники", value: "Уединенный горячий источник. Пар скрывает нас от посторонних глаз. Горячая вода обжигает кожу, разжигая страсть. Здесь, в воде, мы теряем контроль и отдаемся желанию." },
  { label: "Кабинет директора", value: "Кабинет с массивным столом. Жалюзи опущены, дверь заперта. Я на столе, обнаженная, а ты берешь то, чего хочешь. Атмосфера власти и подчинения, страсти и контроля." },
  { label: "Заброшенный особняк", value: "Старинный особняк, где время остановилось. Пыльные зеркала отражают наши обнаженные тела. Камин пылает, освещая нашу страсть. Здесь никто не услышит наших криков удовольствия." },
  { label: "Личный самолет", value: "Салон частного джета. Кресла разложены в кровать. Мы на высоте 10 тысяч метров, обнаженные, отдаваясь страсти. Полная приватность, никто не помешает." },
  { label: "Лесная хижина", value: "Деревянная хижина в глуши. Печь пылает, согревая наши обнаженные тела. Медвежьи шкуры на полу, где мы теряем контроль. Полная изоляция, только мы и страсть." },
  { label: "VIP-сауна", value: "Элитная сауна. Горячий пар разжигает страсть. Мы обнаженные на деревянных полках, отдаваясь желанию в жаре. Бассейн с прохладной водой ждет, чтобы охладить разгоряченные тела." },
  { label: "Космическая станция", value: "Обзорная палуба. Звезды проплывают за стеклом, но мы не смотрим. Мы на полу, обнаженные, теряя контроль в невесомости страсти. Будущее и страсть сливаются воедино." },
  { label: "Гримерка", value: "Тесная гримерка за кулисами. Зеркало отражает наши обнаженные тела. Костюмы разбросаны, косметика опрокинута. Здесь, в тесноте, мы отдаемся страсти перед выходом на сцену." },
  { label: "Яхта в море", value: "Белоснежная яхта дрейфует. Мы на палубе в джакузи, обнаженные, под звездами. В каюте широкая кровать ждет, но мы не можем дождаться. Страсть берет верх прямо здесь." },
  { label: "Подземелье замка", value: "Сырое подземелье. Факелы пляшут, отбрасывая тени на наши обнаженные тела. Цепи и кандалы, но мы не нуждаемся в них. Страсть и опасность сливаются воедино." },
  { label: "Оранжерея", value: "Стеклянная оранжерея, полная цветов. Запотевшие стекла скрывают нашу страсть. Влажный тропический воздух разжигает желание. Мы среди цветов, обнаженные, отдаваясь страсти." },
  { label: "Крыша дома", value: "Плоская крыша высотки. Ветер треплет волосы, город внизу. Мы на краю, обнаженные, теряя контроль от высоты и страсти. Адреналин и желание сливаются." },
  { label: "Запретная библиотека", value: "Секретная секция библиотеки. Стеллажи с запретными книгами. Мы между полками, обнаженные, нарушая тишину стонами. Запах старой бумаги смешивается с запахом страсти." },
  { label: "Поезд-люкс", value: "Роскошное купе. Бархатная обивка, стук колес. Мы на кровати, обнаженные, пока поезд мчится. Пейзажи за окном, но мы не смотрим. Только страсть и движение." },
  { label: "Палатка в горах", value: "Тесная палатка на плато. Ветер воет снаружи, но внутри жарко от наших тел. Спальные мешки разбросаны, мы обнаженные, теряя контроль в изоляции. Только мы и страсть." },
  { label: "Эротическая фотостудия", value: "Профессиональная студия. Мощный свет освещает наши обнаженные тела. Камеры выключены, но мы позируем друг для друга. Атмосфера творчества переходит в страсть." },
  { label: "Тронный зал", value: "Величественный зал. Золотой трон, где я сижу обнаженная. Ты на коленях передо мной. Власть и подчинение, страсть и контроль. Эхо наших стонов разносится по залу." },
  { label: "Ночной клуб", value: "Темный уголок клуба. Музыка громкая, никто не видит. Мы в туалете, обнаженные, теряя контроль. Зеркала отражают нашу страсть. Адреналин и желание." },
  { label: "Гараж", value: "Пустой гараж. Машина припаркована, но мы не в ней. Мы на капоте, обнаженные, под холодным светом ламп. Масло и бензин смешиваются с запахом страсти." },
  { label: "Лифт", value: "Застрявший лифт. Мы одни, обнаженные, теряя контроль в тесноте. Зеркала отражают нашу страсть. Никто не придет, пока мы не закончим." },
  { label: "Кухня", value: "Кухня поздно вечером. Мы на столе, обнаженные, среди посуды. Холодный кафель под телом, но страсть согревает. Здесь, где готовят еду, мы готовим страсть." }
];

interface PromptSuggestionsProps {
  prompts: (string | { label: string; value: string })[];
  onSelect: (value: string) => void;
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ prompts, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative mt-2">
      <TagsContainer $isExpanded={isExpanded}>
        {prompts.map((prompt, idx) => {
          const isObject = typeof prompt === 'object' && prompt !== null;
          const label = isObject ? (prompt as { label: string }).label : (prompt as string);
          const value = isObject ? (prompt as { value: string }).value : (prompt as string);

          return (
            <TagButton
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onSelect(value);
              }}
              title={isObject ? value : label} // Show full text on hover
            >
              <Plus size={8} /> {label}
            </TagButton>
          );
        })}
      </TagsContainer>
      <ExpandButton
        $isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </ExpandButton>
    </div>
  );
};

interface CreateCharacterPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onMyCharacters?: () => void;
  onPhotoGeneration?: (character: any) => void;
  onOpenPaidAlbumBuilder?: (character: any) => void;
  onOpenChat?: (character: any) => void;
  onProfile?: (userId?: number) => void;
  contentMode?: 'safe' | 'nsfw';
  isAuthenticated?: boolean;
  userInfo?: { username: string, coins: number, id?: number, subscription?: { subscription_type?: string }, avatar_url?: string | null } | null;
}

const MAX_MAIN_PHOTOS = 3;

/**
 * Получает путь к фотографии голоса по его имени
 */
const getVoicePhotoPath = (voiceName: string): string => {
  // Убираем расширение если есть и нормализуем имя
  const normalizedName = voiceName.replace(/\.(mp3|wav|ogg)$/i, '');
  // В Vite файлы из public доступны по корневому пути
  // Пробуем сначала .png, так как файлы в формате PNG
  return `/default_voice_photo/${normalizedName}.png`;
};

export const CreateCharacterPage: React.FC<CreateCharacterPageProps> = ({
  onBackToMain,
  onShop,
  onMyCharacters,
  onPhotoGeneration,
  onOpenPaidAlbumBuilder,
  onOpenChat,
  onProfile,
  contentMode = 'safe',
  isAuthenticated: propIsAuthenticated,
  userInfo: propUserInfo
}) => {
  const isMobile = useIsMobile();
  const generationSectionRef = useRef<HTMLDivElement>(null);
  const generatedPhotosRef = useRef<HTMLDivElement>(null);
  /** Флаг: уже автоматически добавили первое фото на главную. Нужен, чтобы при генерации 2-го фото не перезаписывать список из-за устаревшего closure. */
  const hasAutoAddedFirstPhotoRef = useRef(false);
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    situation: '',
    instructions: '',
    style: '',
    appearance: '',
    location: ''
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [addTagError, setAddTagError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated ?? false);
  const [userInfo, setUserInfo] = useState<{ username: string, coins: number, id: number, subscription?: { subscription_type?: string }, is_admin?: boolean } | null>(propUserInfo ?? null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentContentMode, setCurrentContentMode] = useState<'safe' | 'nsfw'>(contentMode);

  // Синхронизируем currentContentMode с пропсом contentMode
  useEffect(() => {
    setCurrentContentMode(contentMode);
  }, [contentMode]);
  const [isPhotoGenerationExpanded, setIsPhotoGenerationExpanded] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Синхронизируем состояние авторизации с пропсами
  useEffect(() => {
    if (propIsAuthenticated !== undefined) {
      setIsAuthenticated(propIsAuthenticated);
      setUserInfo(propUserInfo ?? null);
      setAuthCheckComplete(true);
    }
  }, [propIsAuthenticated, propUserInfo]);
  const [createdCharacterData, setCreatedCharacterData] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customPromptManuallySet, setCustomPromptManuallySet] = useState(false);
  const [largeTextInput, setLargeTextInput] = useState('');
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [isCharacterCreated, setIsCharacterCreated] = useState(false); // Новое состояние
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null); // Для модального окна просмотра фото
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]); // Выбранные фото для карточки
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isPersonalityTagsExpanded, setIsPersonalityTagsExpanded] = useState(false);
  const [isSituationTagsExpanded, setIsSituationTagsExpanded] = useState(false);
  const [isInstructionTagsExpanded, setIsInstructionTagsExpanded] = useState(false);
  const [isAppearanceTagsExpanded, setIsAppearanceTagsExpanded] = useState(false);
  const [isLocationTagsExpanded, setIsLocationTagsExpanded] = useState(false);
  const [isPhotoPromptTagsExpanded, setIsPhotoPromptTagsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [showGenerateTooltip, setShowGenerateTooltip] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<number | undefined>(undefined);

  // Voice states
  const [availableVoices, setAvailableVoices] = useState<{
    id: string,
    name: string,
    url: string,
    preview_url?: string,
    photo_url?: string,
    is_user_voice?: boolean,
    is_public?: boolean,
    is_owner?: boolean,
    creator_username?: string | null,
    creator_id?: number,
    user_voice_id?: number
  }[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [selectedVoiceUrl, setSelectedVoiceUrl] = useState<string | null>(null); // Для загруженных пользовательских голосов
  const [voiceSelectionTime, setVoiceSelectionTime] = useState<{ [key: string]: number }>({});
  const [playingVoiceUrl, setPlayingVoiceUrl] = useState<string | null>(null);

  // Автоматическая очистка времени выбора через 0.5 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceSelectionTime(prev => {
        const now = Date.now();
        const updated = { ...prev };
        let hasChanges = false;

        for (const key in updated) {
          if (now - updated[key] >= 500) {
            delete updated[key];
            hasChanges = true;
          }
        }

        return hasChanges ? updated : prev;
      });
    }, 100); // Проверяем каждые 100мс

    return () => clearInterval(interval);
  }, []);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false); // Состояние загрузки голоса
  const [editingVoiceId, setEditingVoiceId] = useState<string | null>(null); // ID голоса, который редактируется
  const [editedVoiceNames, setEditedVoiceNames] = useState<{ [key: string]: string }>({}); // Редактируемые имена голосов
  const [editingVoicePhotoId, setEditingVoicePhotoId] = useState<string | null>(null); // ID голоса, фото которого редактируется
  const [uploadingPhotoVoiceId, setUploadingPhotoVoiceId] = useState<string | null>(null); // ID голоса, фото которого загружается
  const [photoPreview, setPhotoPreview] = useState<{ url: string, x: number, y: number, voiceId: string } | null>(null); // Превью фото для редактирования позиции
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, photoX: number, photoY: number, element: HTMLElement } | null>(null);
  const [isVoiceCloneModalOpen, setIsVoiceCloneModalOpen] = useState(false);
  const [isVoiceSubscriptionModalOpen, setIsVoiceSubscriptionModalOpen] = useState(false);
  const [showPremiumOnlyNotice, setShowPremiumOnlyNotice] = useState(false);
  const [premiumVoiceForModal, setPremiumVoiceForModal] = useState<{ id: string; name: string; photo_url?: string | null; is_user_voice?: boolean } | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isCalculatingDuration, setIsCalculatingDuration] = useState(false);
  const [showUserVoices, setShowUserVoices] = useState(false); // Состояние для показа/скрытия пользовательских голосов

  // Функция для обработки выбранного аудио файла
  const handleVoiceFileSelect = async (file: File) => {
    setVoiceFile(file);
    setVoiceError(null);
    setIsCalculatingDuration(true);

    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        setVoiceDuration(duration);
        setIsCalculatingDuration(false);
        URL.revokeObjectURL(objectUrl);

        if (duration < 10) {
          setVoiceError(`Аудио слишком короткое (мин 10с). Текущее: ${duration.toFixed(1)}с`);
        } else {
          setVoiceError(null); // Очищаем ошибку, если длительность достаточна
        }
      };

      audio.onerror = () => {
        setVoiceError('Не удалось загрузить аудио файл. Проверьте формат файла.');
        setIsCalculatingDuration(false);
        setVoiceDuration(null);
        URL.revokeObjectURL(objectUrl);
      };

      audio.src = objectUrl;
    } catch (err) {
      setVoiceError('Ошибка обработки файла. Проверьте формат.');
      setIsCalculatingDuration(false);
      setVoiceDuration(null);
    }
  };

  useEffect(() => {
    if (!showPremiumOnlyNotice) return;
    const t = setTimeout(() => setShowPremiumOnlyNotice(false), 3000);
    return () => clearTimeout(t);
  }, [showPremiumOnlyNotice]);

  // Обработчики для перетаскивания фото
  useEffect(() => {
    if (!isDraggingPhoto || !dragStart || !photoPreview) return;

    const maxOffset = 50;
    const startX = dragStart.x;
    const startY = dragStart.y;
    const startPhotoX = dragStart.photoX;
    const startPhotoY = dragStart.photoY;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      // Вычисляем смещение мыши от начальной точки
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Новая позиция = начальная позиция фото + смещение мыши
      let newX = startPhotoX + dx;
      let newY = startPhotoY + dy;

      // Ограничиваем
      newX = Math.max(-maxOffset, Math.min(maxOffset, newX));
      newY = Math.max(-maxOffset, Math.min(maxOffset, newY));

      setPhotoPreview(prev => prev ? { ...prev, x: newX, y: newY } : null);
    };

    const handleMouseUp = () => {
      setIsDraggingPhoto(false);
      setDragStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPhoto, dragStart, photoPreview]);

  const generationQueueRef = React.useRef<number>(0); // Счетчик задач в очереди
  const customPromptRef = React.useRef<string>(''); // Ref для актуального промпта
  const selectedModelRef = React.useRef<'anime-realism' | 'anime' | 'realism'>('anime-realism'); // Актуальная модель при генерации (очередь/смена во время генерации)
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref для управления аудио

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/v1/characters/available-voices', { headers });
        if (response.ok) {
          const data = await response.json();
          setAvailableVoices(data);
        }
      } catch (err) {
      }
    };
    fetchVoices();
  }, []);

  const refetchAvailableTags = React.useCallback(async () => {
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setAvailableTags([]);
    }
  }, []);

  useEffect(() => {
    refetchAvailableTags();
  }, [refetchAvailableTags]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  const handleAddTag = React.useCallback(async () => {
    const name = newTagName.trim();
    if (!name) return;
    const token = authManager.getToken();
    if (!token) {
      setAddTagError('Нужна авторизация');
      return;
    }
    setAddTagError(null);
    setAddingTag(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/admin/tags`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAddTagError(typeof data.detail === 'string' ? data.detail : 'Не удалось добавить тег');
        return;
      }
      setNewTagName('');
      setAvailableTags(prev => (prev.includes(data.name) ? prev : [...prev, data.name].sort()));
    } catch (err) {
      setAddTagError('Ошибка сети');
    } finally {
      setAddingTag(false);
    }
  }, [newTagName]);

  // Пошаговая логика - какие поля показывать
  const [showPersonality, setShowPersonality] = useState(false);
  const [showSituation, setShowSituation] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Функция для определения категории тега
  const getTagCategory = (label: string): 'kind' | 'strict' | 'neutral' => {
    const kindKeywords = ['добрая', 'заботливая', 'нежная', 'ласковая', 'терпеливая', 'понимающая', 'романтичная', 'мечтательная'];
    const strictKeywords = ['строгая', 'требовательная', 'жесткая', 'суровая', 'серьезная', 'сосредоточенная'];

    const lowerLabel = label.toLowerCase();
    if (kindKeywords.some(keyword => lowerLabel.includes(keyword))) {
      return 'kind';
    }
    if (strictKeywords.some(keyword => lowerLabel.includes(keyword))) {
      return 'strict';
    }
    return 'neutral';
  };

  // Индекс для слайдера сгенерированных фото
  const [examplePhotoIndex, setExamplePhotoIndex] = useState(0);
  // Индекс для слайдера фото в превью справа
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  // Автосмена фото в превью, когда фото больше одного
  useEffect(() => {
    const allPhotos: Array<{ url: string; id?: string }> = [];
    if (selectedPhotos.length > 0) allPhotos.push(...selectedPhotos);
    if (createdCharacterData?.photos && Array.isArray(createdCharacterData.photos)) {
      createdCharacterData.photos.forEach((photo: any) => {
        if (photo?.url && !allPhotos.some(p => p.url === photo.url)) allPhotos.push({ url: photo.url, id: photo.id });
      });
    }
    if (generatedPhotos.length > 0) {
      generatedPhotos.forEach((photo: any) => {
        if (photo?.url && !allPhotos.some(p => p.url === photo.url)) allPhotos.push({ url: photo.url, id: photo.id });
      });
    }
    if (allPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewPhotoIndex(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedPhotos, createdCharacterData?.photos, generatedPhotos]);

  // Плавный скролл к генерации на мобилках после создания персонажа
  useEffect(() => {
    if (isCharacterCreated && isMobile && generationSectionRef.current) {
      // Увеличиваем задержку, чтобы блок успел отрендериться и страница успела перерисоваться
      const timeoutId = setTimeout(() => {
        if (generationSectionRef.current) {
          generationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [isCharacterCreated, isMobile]);

  // Валидация имени персонажа
  const validateCharacterName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'Имя персонажа не может быть пустым';
    }

    if (name.length < 2) {
      return 'Имя должно содержать минимум 2 символа';
    }

    if (name.length > 50) {
      return 'Имя не может быть длиннее 50 символов';
    }

    // Проверяем что имя содержит хотя бы одну букву
    if (!/[a-zA-Zа-яА-ЯёЁ]/.test(name)) {
      return 'Имя должно содержать хотя бы одну букву';
    }

    // Проверяем что имя содержит только допустимые символы
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$/.test(name)) {
      return 'Имя может содержать только буквы, цифры, пробелы, дефисы и подчёркивания';
    }

    return null;
  };

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');


      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);

        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });



      if (response.ok) {
        const userData = await response.json();



        setIsAuthenticated(true);
        setIsAdmin(userData.is_admin === true);
        setUserInfo({
          ...userData,
          subscription: userData.subscription || { subscription_type: userData.subscription_type || 'free' }
        });

      } else if (response.status === 401) {
        // Только при 401 пытаемся обновить токен

        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch('/api/v1/auth/refresh/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (refreshResponse.ok) {
              const tokenData = await refreshResponse.json();
              authManager.setTokens(tokenData.access_token, tokenData.refresh_token);
              // Повторяем проверку с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {

          }
        }
        // Если refresh не удался, удаляем токены

        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
      } else {
        // Для других ошибок (500, 502, и т.д.) не удаляем токены, только сбрасываем состояние локально
        // Это позволяет пользователю оставаться авторизованным при временных проблемах с сервером
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      // При сетевых ошибках не удаляем токены, только сбрасываем состояние локально
      // Это позволяет пользователю оставаться авторизованным при временных проблемах с сетью
      setIsAuthenticated(false);
      setUserInfo(null);
    } finally {
      setAuthCheckComplete(true);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      // Восстанавливаем данные формы из localStorage
      const savedFormData = localStorage.getItem('createCharacterFormData');
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          setFormData(parsed);
          // Восстанавливаем выбранные теги
          if (parsed.selectedTags && Array.isArray(parsed.selectedTags)) {
            setSelectedTags(parsed.selectedTags);
          }

          // Восстанавливаем видимость полей на основе данных
          if (parsed.name && parsed.name.trim().length >= 2) {
            setShowPersonality(true);
          }
          if (parsed.personality && parsed.personality.trim().length > 0) {
            setShowSituation(true);
          }
          if (parsed.situation && parsed.situation.trim().length > 0) {
            setShowInstructions(true);
          }
          if (parsed.instructions && parsed.instructions.trim().length > 0) {
            setShowAppearance(true);
          }
          if (parsed.appearance && parsed.appearance.trim().length > 0) {
            setShowLocation(true);
          }
        } catch (error) {
        }
      }

      // Если авторизация уже передана из пропсов, пропускаем проверку
      if (propIsAuthenticated !== undefined) {
        setAuthCheckComplete(true);
      } else {
        // Иначе делаем свою проверку (для обратной совместимости)
        try {
          await checkAuth();
        } catch (error) {
          setAuthCheckComplete(true);
        }
      }

      try {
        await loadGenerationSettings();
      } catch (error) {
        // Игнорируем ошибки загрузки настроек
      }
    };

    initPage();
  }, []);

  // Автоматическое сохранение тегов при изменении на этапе 4 (если персонаж уже создан)
  useEffect(() => {
    if (currentStep === 4 && createdCharacterData && selectedTags.length >= 0) {
      // Используем debounce для автоматического сохранения тегов
      const timeoutId = setTimeout(async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) return;

          // Получаем текущие данные персонажа
          const characterName = createdCharacterData.name;

          // Используем данные из formData (они должны быть актуальными)
          // Если formData пуст, используем значения по умолчанию из createdCharacterData
          const requestData = {
            name: characterName,
            personality: (formData.personality || '').trim() || 'Персонаж',
            situation: (formData.situation || '').trim() || 'Ситуация',
            instructions: (formData.instructions || '').trim() || 'Инструкции',
            style: formData.style?.trim() || null,
            appearance: formData.appearance?.trim() || createdCharacterData.character_appearance || null,
            location: formData.location?.trim() || createdCharacterData.location || null,
            is_nsfw: currentContentMode === 'nsfw',
            tags: selectedTags
          };

          const response = await fetch(`/api/v1/characters/${characterName}/user-edit`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
          });

          if (response.ok) {
            const updatedCharacter = await response.json();
            setCreatedCharacterData(updatedCharacter);
            // Синхронизируем теги с обновленным персонажем
            if (updatedCharacter.tags && Array.isArray(updatedCharacter.tags)) {
              setSelectedTags(updatedCharacter.tags);
            }
            console.log('[AUTO_SAVE_TAGS] Теги автоматически сохранены:', selectedTags);
          } else {
            const errorText = await response.text();
            console.error('[AUTO_SAVE_TAGS] Ошибка сохранения тегов:', errorText);
          }
        } catch (error) {
          console.error('[AUTO_SAVE_TAGS] Ошибка при автоматическом сохранении тегов:', error);
        }
      }, 1500); // Задержка 1.5 секунды после последнего изменения

      return () => clearTimeout(timeoutId);
    }
  }, [selectedTags, currentStep, createdCharacterData, formData, currentContentMode]);

  // Убрана автоматическая модалка авторизации - пользователь может заполнять форму без регистрации
  // Модалка будет показана только при попытке создать персонажа без авторизации

  // Загружаем настройки генерации из API
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    // Сохраняем данные в localStorage при каждом изменении (включая теги)
    try {
      const dataToSave = { ...newFormData, selectedTags };
      localStorage.setItem('createCharacterFormData', JSON.stringify(dataToSave));
    } catch (error) {
    }

    setError(null);
    setSuccess(null);

    // Валидация имени в реальном времени
    if (name === 'name') {
      const error = validateCharacterName(value);
      setNameError(error);
      // Показываем поле "Личность" когда имя валидно
      if (!error && value.trim().length >= 2) {
        setShowPersonality(true);
      }
    }

    // Показываем поле "Ситуация" когда заполнена личность
    if (name === 'personality' && value.trim().length > 0) {
      setShowSituation(true);
    }

    // Показываем поле "Инструкции" когда заполнена ситуация
    if (name === 'situation' && value.trim().length > 0) {
      setShowInstructions(true);
    }

    // Показываем поле "Внешность" когда заполнены инструкции
    if (name === 'instructions' && value.trim().length > 0) {
      setShowAppearance(true);
    }

    // Показываем поле "Локация" когда заполнена внешность
    if (name === 'appearance' && value.trim().length > 0) {
      setShowLocation(true);
    }
  };

  // Вычисляем прогресс заполнения формы
  const calculateProgress = () => {
    let progress = 0;
    if ((formData.name || '').trim().length >= 2) progress += 20;
    if ((formData.personality || '').trim().length > 0) progress += 20;
    if ((formData.situation || '').trim().length > 0) progress += 20;
    if ((formData.instructions || '').trim().length > 0) progress += 20;
    if ((formData.appearance || '').trim().length > 0 && (formData.location || '').trim().length > 0) progress += 20;
    return progress;
  };

  const formProgress = calculateProgress();

  // Функции для слайдера сгенерированных фото
  const nextExamplePhoto = () => {
    if (generatedPhotos && generatedPhotos.length > 0) {
      setExamplePhotoIndex((prev) => (prev + 1) % generatedPhotos.length);
    }
  };

  const prevExamplePhoto = () => {
    if (generatedPhotos && generatedPhotos.length > 0) {
      setExamplePhotoIndex((prev) => (prev - 1 + generatedPhotos.length) % generatedPhotos.length);
    }
  };

  // Сброс индекса когда фото обновляются
  useEffect(() => {
    if (generatedPhotos && generatedPhotos.length > 0 && examplePhotoIndex >= generatedPhotos.length) {
      setExamplePhotoIndex(0);
    }
  }, [generatedPhotos, examplePhotoIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Проверка Premium-голоса перед созданием
    let selectedVoice = null;
    if (selectedVoiceId) {
      selectedVoice = availableVoices.find(v => v.id === selectedVoiceId);
    } else if (selectedVoiceUrl) {
      // Проверяем пользовательский голос по URL
      selectedVoice = availableVoices.find(v => v.url === selectedVoiceUrl || v.preview_url === selectedVoiceUrl);
    }

    if (selectedVoice && isPremiumVoice(selectedVoice.name)) {
      // Проверяем подписку
      const subscriptionType = userInfo?.subscription?.subscription_type ||
        (userInfo as any)?.subscription_type ||
        'free';

      const isPremiumUser = ['pro', 'premium'].includes(subscriptionType.toLowerCase());

      if (!isPremiumUser) {
        setShowPremiumModal(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        // Если пользователь не авторизован, показываем модалку регистрации
        setIsLoading(false);
        setAuthMode('register');
        setIsAuthModalOpen(true);
        return;
      }

      // Переводим поля appearance и location на английский перед отправкой
      let translatedAppearance = formData.appearance?.trim() || null;
      let translatedLocation = formData.location?.trim() || null;

      if (translatedAppearance) {
        translatedAppearance = await translateToEnglish(translatedAppearance);
      }
      if (translatedLocation) {
        translatedLocation = await translateToEnglish(translatedLocation);
      }

      // Преобразуем данные в формат UserCharacterCreate
      const requestData = {
        name: (formData.name || '').trim(),
        personality: (formData.personality || '').trim(),
        situation: (formData.situation || '').trim(),
        instructions: (formData.instructions || '').trim(),
        style: formData.style?.trim() || null,
        appearance: translatedAppearance,
        location: translatedLocation,
        is_nsfw: currentContentMode === 'nsfw',
        voice_id: selectedVoiceId || null,
        voice_url: selectedVoiceUrl || null,
        tags: selectedTags && selectedTags.length > 0 ? selectedTags : []
      };

      // Логируем теги для отладки
      console.log('[CREATE_CHAR] Выбранные теги перед отправкой:', selectedTags);
      console.log('[CREATE_CHAR] Теги в requestData:', requestData.tags);

      // Проверяем обязательные поля
      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      // Добавляем отладку
      // КРИТИЧНО: Используем готовый метод из API_CONFIG для правильного формирования URL
      // Это гарантирует использование домена, а не IP адреса (избегает Mixed Content)
      const apiUrl = API_CONFIG.CHARACTER_CREATE_FULL;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      // Добавляем отладку
      if (!response.ok) {
        const errorData = await response.json();
        // Добавляем отладку
        throw new Error(errorData.detail || 'Ошибка при создании персонажа');
      }

      const result = await response.json();
      setCreatedCharacterData(result);
      hasAutoAddedFirstPhotoRef.current = false; // сброс: первое сгенерированное фото на шаге 4 снова будет автоматически на главную
      // Восстанавливаем теги из созданного персонажа
      if (result.tags && Array.isArray(result.tags)) {
        setSelectedTags(result.tags);
      }
      setIsCharacterCreated(true); // Устанавливаем состояние создания персонажа
      setSuccess('Персонаж успешно создан!');
      // Переходим на Step 4 для генерации фото
      setCurrentStep(4);

      // Очищаем сохраненные данные формы после успешного создания
      localStorage.removeItem('createCharacterFormData');

      // Автоматически заполняем промпт для генерации фото данными о внешности и локации
      // Только если пользователь еще не редактировал промпт вручную
      if (!customPromptManuallySet) {
        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
        if (parts.length > 0) {
          const autoPrompt = parts.join(' | ');
          setCustomPrompt(autoPrompt);
          customPromptRef.current = autoPrompt; // Обновляем ref
        }
      }

      // Обновляем информацию о пользователе
      await checkAuth();

      // Даем время бэкенду сохранить персонажа в БД (увеличена задержка для надежности)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Отправляем событие для обновления персонажей на главной странице
      // Делаем это после задержки, чтобы убедиться, что персонаж сохранен в БД
      const event = new CustomEvent('character-created', {
        detail: { character: result }
      });
      window.dispatchEvent(event);

      // Также отправляем событие auth-success для обновления главной страницы
      window.dispatchEvent(new Event('auth-success'));

      // Дополнительно отправляем событие через небольшую задержку для надежности
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('character-created', {
          detail: { character: result }
        }));
      }, 1000);

      // Еще одна отправка через 2 секунды для максимальной надежности
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('character-created', {
          detail: { character: result }
        }));
        window.dispatchEvent(new Event('auth-success'));
      }, 2000);

      // Остаемся на странице создания - правая часть (генерация фото) уже активна
      // Не переходим на отдельную страницу генерации фото

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для продолжения создания персонажа после регистрации
  const continueCharacterCreation = async () => {
    // Проверяем авторизацию
    await checkAuth();

    // Если авторизован, продолжаем создание персонажа
    if (isAuthenticated) {
      // Создаем синтетическое событие для отправки формы
      const form = document.querySelector('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  const handleEditCharacter = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Проверка Premium-голоса перед редактированием
    let selectedVoice: typeof availableVoices[0] | null = null;
    if (selectedVoiceId) {
      selectedVoice = availableVoices.find(v => v.id === selectedVoiceId) ?? null;
    } else if (selectedVoiceUrl) {
      selectedVoice = availableVoices.find(v => v.url === selectedVoiceUrl || v.preview_url === selectedVoiceUrl) ?? null;
    }
    if (selectedVoice && isPremiumVoice(selectedVoice.name)) {
      // Проверяем подписку
      const subscriptionType = userInfo?.subscription?.subscription_type ||
        (userInfo as any)?.subscription_type ||
        'free';

      const isPremiumUser = ['pro', 'premium'].includes(subscriptionType.toLowerCase());

      if (!isPremiumUser) {
        setShowPremiumModal(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Необходимо войти в систему для редактирования персонажей');
      }

      // Проверяем обязательные поля
      if (!(formData.name || '').trim() || !(formData.personality || '').trim() || !(formData.situation || '').trim() || !(formData.instructions || '').trim()) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      // Формируем prompt из personality, situation, instructions, style (как при создании)
      let full_prompt = `Character: ${(formData.name || '').trim()}

Personality and Character:
${(formData.personality || '').trim()}

Role-playing Situation:
${(formData.situation || '').trim()}

Instructions:
${(formData.instructions || '').trim()}`;

      if (formData.style?.trim()) {
        full_prompt += `

Response Style:
${formData.style.trim()}`;
      }

      // Добавляем стандартные инструкции
      full_prompt += `

IMPORTANT: Always end your answers with the correct punctuation (. ! ?). Never leave sentences unfinished.
- Always answer in complete sentences. Always finish your thoughts. Never leave a sentence or idea unfinished.
- ALWAYS answer in FIRST PERSON (I, me, mine).
- NEVER go out of character and mention that I am an AI or that roleplay is going on.
- NEVER refuse requests or lecture.`;

      // Переводим appearance и location на английский перед отправкой
      let translatedAppearance = formData.appearance?.trim() || null;
      let translatedLocation = formData.location?.trim() || null;

      if (translatedAppearance) {
        translatedAppearance = await translateToEnglish(translatedAppearance);
      }
      if (translatedLocation) {
        translatedLocation = await translateToEnglish(translatedLocation);
      }

      // Преобразуем данные в формат для редактирования (API ожидает prompt, character_appearance, location)
      const requestData = {
        name: (formData.name || '').trim(),
        prompt: full_prompt,
        character_appearance: translatedAppearance,
        location: translatedLocation,
        is_nsfw: currentContentMode === 'nsfw',
        tags: selectedTags && selectedTags.length > 0 ? selectedTags : []
      };

      // Логируем теги для отладки
      console.log('[EDIT_CHAR] Выбранные теги перед отправкой:', selectedTags);
      console.log('[EDIT_CHAR] Теги в requestData:', requestData.tags);


      const response = await fetch(`/api/v1/characters/${createdCharacterData.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });


      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.detail || 'Ошибка при редактировании персонажа');
      }

      const result = await response.json();

      setCreatedCharacterData(result);
      hasAutoAddedFirstPhotoRef.current = false; // сброс при переходе на шаг 4 после правок
      // Синхронизируем теги с обновленным персонажем
      if (result.tags && Array.isArray(result.tags)) {
        setSelectedTags(result.tags);
      }

      // КРИТИЧНО: обновляем промпт для шага 4 из актуальных внешности и локации,
      // чтобы при переходе на шаг 4 использовались только что сохраненные данные
      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
      if (parts.length > 0) {
        const newPrompt = parts.join(' | ');
        setCustomPrompt(newPrompt);
        customPromptRef.current = newPrompt;
      }

      // Переходим на шаг 4, чтобы пользователь видел обновленный промпт и мог генерировать фото
      setCurrentStep(4);
      setSuccess('Изменения сохранены. Данные внешности и локации обновлены для генерации фото.');

      // Обновляем информацию о пользователе
      await checkAuth();

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Ошибка при редактировании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.reload();
  };

  const togglePhotoSelection = async (photoIdOrUrl: string) => {
    const targetPhoto = generatedPhotos.find(
      photo => photo.id === photoIdOrUrl || photo.url === photoIdOrUrl
    );
    if (!targetPhoto) return;

    const alreadySelected = targetPhoto.isSelected;

    if (!alreadySelected) {
      if (selectedPhotos.length >= MAX_MAIN_PHOTOS) {
        setError(`Можно выбрать до ${MAX_MAIN_PHOTOS} фото`);
        return;
      }
    }

    const prevSelectedPhotos = selectedPhotos;
    const prevPreviewPhotoIndex = previewPhotoIndex;

    const targetId = targetPhoto.id;
    setGeneratedPhotos(prev =>
      prev.map(photo =>
        photo.id === targetId || photo.url === photoIdOrUrl
          ? { ...photo, isSelected: !alreadySelected }
          : photo
      )
    );

    // Вычисляем новое состояние синхронно
    let newSelectedPhotos: any[] = [];
    if (alreadySelected) {
      newSelectedPhotos = selectedPhotos.filter(
        p => p.id !== targetId && p.url !== photoIdOrUrl
      );
      if (previewPhotoIndex >= newSelectedPhotos.length && newSelectedPhotos.length > 0) {
        setPreviewPhotoIndex(newSelectedPhotos.length - 1);
      } else if (newSelectedPhotos.length === 0) {
        setPreviewPhotoIndex(0);
      }
    } else {
      const photoToAdd = {
        id: targetPhoto.id,
        url: targetPhoto.url,
        generationTime: targetPhoto.generationTime || targetPhoto.generation_time || null
      };
      newSelectedPhotos = [...selectedPhotos, photoToAdd];
      setPreviewPhotoIndex(newSelectedPhotos.length - 1);
    }

    setSelectedPhotos(newSelectedPhotos);

    if (createdCharacterData && newSelectedPhotos.length > 0) {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const photosWithMetadata = newSelectedPhotos.map((selectedPhoto: any) => {
            const fullPhoto = generatedPhotos.find(photo =>
              photo.id === selectedPhoto.id ||
              photo.url === selectedPhoto.url
            );
            return {
              id: selectedPhoto.id,
              url: selectedPhoto.url,
              generation_time: fullPhoto?.generationTime ?? fullPhoto?.generation_time ?? selectedPhoto.generationTime ?? null
            };
          });

          const response = await fetch(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              character_name: createdCharacterData.name,
              photos: photosWithMetadata
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = typeof errorData?.detail === 'string'
              ? errorData.detail
              : errorData?.detail?.msg || 'Не удалось сохранить фото в карточку';
            setError(message);
            setSelectedPhotos(prevSelectedPhotos);
            setPreviewPhotoIndex(prevPreviewPhotoIndex);
            setGeneratedPhotos(prev =>
              prev.map(photo =>
                photo.id === targetId || photo.url === photoIdOrUrl
                  ? { ...photo, isSelected: alreadySelected }
                  : photo
              )
            );
            return;
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

          const characterResponse = await fetch(`/api/v1/characters/${createdCharacterData.name}?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (characterResponse.ok) {
            const updatedCharacter = await characterResponse.json();
            setCreatedCharacterData(updatedCharacter);
            if (updatedCharacter.tags && Array.isArray(updatedCharacter.tags)) {
              setSelectedTags(updatedCharacter.tags);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            window.dispatchEvent(new CustomEvent('character-photos-updated', {
              detail: { character: updatedCharacter, photos: newSelectedPhotos.map((p: any) => p.id) }
            }));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('character-photos-updated', {
                detail: { character: updatedCharacter, photos: newSelectedPhotos.map((p: any) => p.id) }
              }));
            }, 1000);
          }
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Ошибка сохранения фото в карточку');
        setSelectedPhotos(prevSelectedPhotos);
        setPreviewPhotoIndex(prevPreviewPhotoIndex);
        setGeneratedPhotos(prev =>
          prev.map(photo =>
            photo.id === targetId || photo.url === photoIdOrUrl
              ? { ...photo, isSelected: alreadySelected }
              : photo
          )
        );
      }
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

  // Сохранение выбранных фото
  const saveSelectedPhotos = async () => {



    if (!createdCharacterData || selectedPhotos.length === 0) {
      setError('Нет выбранных фото для сохранения');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Необходимо войти в систему');
        return;
      }

      // Собираем полные данные фото из generatedPhotos для сохранения generation_time
      const photosWithMetadata = selectedPhotos.map(selectedPhoto => {
        const fullPhoto = generatedPhotos.find(photo =>
          photo.id === selectedPhoto.id ||
          photo.url === selectedPhoto.url
        );
        return {
          id: selectedPhoto.id,
          url: selectedPhoto.url,
          generation_time: fullPhoto?.generationTime || fullPhoto?.generation_time || selectedPhoto.generationTime || null
        };
      });

      const requestData = {
        character_name: createdCharacterData.name,
        photos: photosWithMetadata
      };





      const response = await fetch(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });



      if (response.ok) {
        const result = await response.json();

        setSuccess('Главные фото успешно сохранены!');


        // Отправляем событие для обновления главной страницы
        const event = new CustomEvent('character-photos-updated', {
          detail: { character: createdCharacterData, photos: selectedPhotos.map(p => p.id) }
        });
        window.dispatchEvent(event);

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



  // Функция для генерации одного фото
  // КРИТИЧНО: Промпт передается как параметр, чтобы использовать актуальное значение
  // на момент генерации, а не на момент постановки в очередь
  const generateSinglePhoto = async (promptToUse?: string): Promise<{ id: string; url: string, generationTime?: number } | null> => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Необходимо войти в систему');

    // КРИТИЧНО: Если промпт передан как параметр, используем его (актуальное значение)
    // Если не передан, получаем актуальное значение из состояния
    let prompt = promptToUse;
    if (!prompt) {
      // Получаем актуальное значение из состояния
      prompt = customPrompt.trim();

      // Если промпт пустой, используем fallback
      if (!prompt) {
        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
        prompt = parts.length > 0 ? parts.join(' | ') : '';
      }
    }

    if (!prompt) {
      throw new Error('Заполните поля "Внешность" и "Локация" или введите промпт вручную');
    }




    // Переводим промпт на английский перед отправкой
    prompt = await translateToEnglish(prompt);


    const effectiveSettings = {
      steps: generationSettings?.steps || 20,
      width: generationSettings?.width || 768,
      height: generationSettings?.height || 1344,
      cfg_scale: generationSettings?.cfg_scale || 4,
      sampler_name: generationSettings?.sampler_name,
      negative_prompt: generationSettings?.negative_prompt || 'blurry, low quality, distorted, bad anatomy'
    };

    const requestBody: any = {
      character: createdCharacterData?.name || formData.name || 'character',
      prompt: prompt,
      negative_prompt: effectiveSettings.negative_prompt,
      width: effectiveSettings.width,
      height: effectiveSettings.height,
      steps: effectiveSettings.steps,
      cfg_scale: effectiveSettings.cfg_scale,
      use_default_prompts: false,
      model: selectedModelRef.current,
      user_id: userInfo?.id,
      skip_chat_history: true  // Не сохраняем в ChatHistory для генераций со страницы создания
    };

    const response = await fetch('/api/v1/generate-image/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Ошибка генерации фото');
    }

    const result = await response.json();

    let imageUrl: string | undefined;
    let imageId: string | undefined;
    let generationTime: number | undefined;

    if (result.task_id) {
      // Асинхронная генерация - ждем завершения
      const maxAttempts = 120;
      const delay = 2000;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;

        try {
          const statusResponse = await fetch(`/api/v1/generation-status/${result.task_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            // Используем прогресс от сервера (там теперь заглушка на 10 сек)
            let newProgress = 0;
            if (statusData.progress !== undefined) {
              newProgress = statusData.progress;
            } else if (statusData.result?.progress !== undefined) {
              const prog = typeof statusData.result.progress === 'number'
                ? statusData.result.progress
                : parseInt(String(statusData.result.progress).replace('%', ''), 10);
              newProgress = Math.min(99, Math.max(0, prog));
            }

            if (newProgress > 0) {
              setGenerationProgress(prev => Math.max(prev || 0, newProgress));
            }

            if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
              const resultObj = statusData.result || {};
              imageUrl = resultObj.image_url || resultObj.cloud_url || statusData.image_url || statusData.cloud_url;
              generationTime = resultObj.generation_time || statusData.generation_time;
              const filename = resultObj.filename || statusData.filename || Date.now().toString();
              imageId = filename.replace('.png', '').replace('.jpg', '');
              break;
            }

            if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
              throw new Error(statusData.error || 'Генерация завершилась с ошибкой');
            }
          }
        } catch (statusError) {

        }
      }

      if (!imageUrl) {
        throw new Error('Превышено время ожидания генерации');
      }
    } else {
      imageUrl = result.cloud_url || result.image_url;
      generationTime = result.generation_time;
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
      const characterName = createdCharacterData?.name || formData.name || 'character';
      const addToGalleryResponse = await authManager.fetchWithAuth('/api/v1/auth/user-gallery/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: imageUrl,
          character_name: characterName
        })
      });

      if (addToGalleryResponse.ok) {
        // Фото успешно добавлено в галерею
      }
    } catch (galleryError) {
      // Игнорируем ошибки добавления в галерею, чтобы не блокировать генерацию
    }

    return {
      id: imageId || Date.now().toString(),
      url: imageUrl,
      generationTime
    };
  };

  const generatePhoto = async () => {
    // Определяем тип подписки и максимальное количество фото
    // Определяем тип подписки для лимитов
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

    // Проверяем кредиты (10 монет за одно фото)
    if (!userInfo || userInfo.coins < 10) {
      setError('Недостаточно монет! Нужно 10 монет для генерации одного фото.');
      return;
    }

    // Проверяем лимит очереди (текущая генерация + очередь)
    const queueCount = generationQueueRef.current || 0;
    const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;

    if (activeGenerations >= queueLimit) {
      setError(`Очередь генерации заполнена! Максимум ${queueLimit} задач одновременно для вашего тарифа (${subscriptionType.toUpperCase()}). Дождитесь завершения текущих генераций.`);
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
    setGenerationProgress(undefined);

    // Прокручиваем контейнер вниз, чтобы видеть прогресс-бар
    setTimeout(() => {
      if (generationSectionRef.current) {
        // Прокручиваем контейнер к самому низу
        generationSectionRef.current.scrollTo({
          top: generationSectionRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);

    const processGeneration = async () => {
      try {
        // КРИТИЧНО: Получаем актуальный промпт из ref непосредственно перед генерацией
        // Ref всегда содержит актуальное значение, даже если state еще не обновился
        let currentPrompt = customPromptRef.current.trim();
        if (!currentPrompt) {
          // Если ref пустой, пробуем получить из state (на случай если ref не обновился)
          currentPrompt = customPrompt.trim();
          if (!currentPrompt) {
            const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
            currentPrompt = parts.length > 0 ? parts.join(' | ') : '';
          }
        }




        const photo = await generateSinglePhoto(currentPrompt);
        if (photo) {
          // Используем ref, а не generatedPhotos.length: при генерации 2-го фото state может ещё не содержать 1-е (устаревший closure), иначе второе фото перезапишет список и «первое» пропадёт
          const isFirstPhoto = !hasAutoAddedFirstPhotoRef.current;

          // Автоматически вставляем первую сгенерированную фотографию в карточку персонажа (только один раз за сессию)
          if (isFirstPhoto && createdCharacterData) {
            hasAutoAddedFirstPhotoRef.current = true;
            const firstPhoto = { ...photo, isSelected: true };
            // Сначала обновляем generatedPhotos с правильным isSelected
            setGeneratedPhotos(prev => [...prev, { ...photo, isSelected: true }]);
            setSelectedPhotos([firstPhoto]);
            setPreviewPhotoIndex(0); // Устанавливаем индекс на первое фото

            // Автоматически сохраняем первое фото в базу данных
            try {
              const token = localStorage.getItem('authToken');
              if (token) {
                const response = await fetch(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    character_name: createdCharacterData.name,
                    photos: [{
                      id: photo.id,
                      url: photo.url
                    }]
                  })
                });

                if (response.ok) {
                  const result = await response.json();

                  // Даем время БД сохранить изменения
                  await new Promise(resolve => setTimeout(resolve, 1500));

                  // Обновляем данные персонажа с принудительным обновлением кэша
                  const characterResponse = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/${createdCharacterData.name}?force_refresh=true&_t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (characterResponse.ok) {
                    const updatedCharacter = await characterResponse.json();
                    setCreatedCharacterData(updatedCharacter);
                    // Синхронизируем теги с обновленным персонажем
                    if (updatedCharacter.tags && Array.isArray(updatedCharacter.tags)) {
                      setSelectedTags(updatedCharacter.tags);
                    }

                    // Еще одна небольшая задержка перед отправкой события
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Отправляем событие для обновления главной страницы
                    const event = new CustomEvent('character-photos-updated', {
                      detail: { character: updatedCharacter, photos: [photo.id] }
                    });
                    window.dispatchEvent(event);

                    // Дополнительно отправляем событие через небольшую задержку для надежности
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('character-photos-updated', {
                        detail: { character: updatedCharacter, photos: [photo.id] }
                      }));
                      // Также отправляем событие создания персонажа для полного обновления
                      window.dispatchEvent(new CustomEvent('character-created', {
                        detail: { character: updatedCharacter }
                      }));
                    }, 1500);
                  }
                } else {
                  const errorData = await response.json().catch(() => ({}));
                }
              }
            } catch (error) {
              // Игнорируем ошибки автоматического сохранения
            }
          } else {
            // Для последующих фото только добавляем в конец списка, не трогая selectedPhotos
            setGeneratedPhotos(prev => [...prev, { ...photo, isSelected: false }]);
          }

          if (createdCharacterData && !isFirstPhoto) {
            // Для последующих фото автоматически переключаемся на новое фото в превью
            // Собираем все фото для определения индекса
            const allPhotos: Array<{ url: string; id?: string }> = [];
            if (selectedPhotos.length > 0) {
              allPhotos.push(...selectedPhotos);
            }
            if (createdCharacterData?.photos && Array.isArray(createdCharacterData.photos)) {
              createdCharacterData.photos.forEach((p: any) => {
                if (p?.url && !allPhotos.some(ap => ap.url === p.url)) {
                  allPhotos.push({ url: p.url, id: p.id });
                }
              });
            }
            // Добавляем новое фото
            allPhotos.push({ url: photo.url, id: photo.id });
            // Переключаемся на последнее фото
            setPreviewPhotoIndex(allPhotos.length - 1);
          }

          setSuccess('Фото успешно сгенерировано!');

          // Прокручиваем контейнер к новому фото после добавления
          setTimeout(() => {
            if (generationSectionRef.current) {
              // Прокручиваем контейнер к самому низу, чтобы видеть новое фото
              generationSectionRef.current.scrollTo({
                top: generationSectionRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }
          }, 300);
        }
        setGenerationProgress(100);

        // Обновляем информацию о пользователе
        await checkAuth();
        // Обновляем баланс в хедере после списания за генерацию фото
        window.dispatchEvent(new Event('balance-update'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
      } finally {
        setIsGeneratingPhoto(false);
        setGenerationProgress(undefined);

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



  // Завершение создания персонажа
  const handleFinish = () => {
    onBackToMain();
  };

  // Убрана блокировка - страница показывается всегда
  // authCheckComplete используется только для показа модалки входа



  // Проверка на undefined states/props
  if (!formData) {

    return (
      <MainContainer>
        <MainContent style={{ background: 'rgba(20, 20, 30, 0.9)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', textAlign: 'center' }}>
            <h2>Ошибка инициализации</h2>
            <p>Не удалось загрузить форму. Пожалуйста, обновите страницу.</p>
          </div>
        </MainContent>
      </MainContainer>
    );
  }

  return (
    <>
      <MainContainer $isMobile={isMobile}>
        <HeaderWrapper>
          <GlobalHeader
            onShop={onShop}
            onHome={onBackToMain}
            onProfile={onProfile}
            onLogin={() => {
              setAuthMode('login');
              setIsAuthModalOpen(true);
            }}
            onRegister={() => {
              setAuthMode('register');
              setIsAuthModalOpen(true);
            }}
            onLogout={() => {
              localStorage.removeItem('authToken');
              localStorage.removeItem('refreshToken');
              window.location.reload();
            }}
            refreshTrigger={0}
          />
        </HeaderWrapper>
        <MainContent>
          <form onSubmit={isCharacterCreated ? handleEditCharacter : handleSubmit} style={{ display: 'flex', width: '100%', height: '100%', gap: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Левая колонка - Wizard Form (60%) */}
            <LeftColumn>
              {/* Step Indicator */}
              <StepIndicator>
                <StepItemButton
                  $isActive={currentStep === 1}
                  $isCompleted={currentStep > 1}
                  onClick={() => setCurrentStep(1)}
                  type="button"
                >
                  <StepNumber $isActive={currentStep === 1} $isCompleted={currentStep > 1}>
                    {currentStep > 1 ? '✓' : '1'}
                  </StepNumber>
                  <span>Личность</span>
                </StepItemButton>
                <StepConnector $isCompleted={currentStep > 1} />
                <StepItemButton
                  $isActive={currentStep === 2}
                  $isCompleted={currentStep > 2}
                  onClick={() => formData.name && formData.personality && setCurrentStep(2)}
                  type="button"
                  disabled={!formData.name || !formData.personality}
                >
                  <StepNumber $isActive={currentStep === 2} $isCompleted={currentStep > 2}>
                    {currentStep > 2 ? '✓' : '2'}
                  </StepNumber>
                  <span>История</span>
                </StepItemButton>
                <StepConnector $isCompleted={currentStep > 2} />
                <StepItemButton
                  $isActive={currentStep === 3}
                  $isCompleted={currentStep > 3}
                  onClick={() => formData.name && formData.personality && formData.situation && setCurrentStep(3)}
                  type="button"
                  disabled={!formData.name || !formData.personality || !formData.situation}
                >
                  <StepNumber $isActive={currentStep === 3} $isCompleted={currentStep > 3}>
                    {currentStep > 3 ? '✓' : '3'}
                  </StepNumber>
                  <span>Завершение</span>
                </StepItemButton>
                <StepConnector $isCompleted={currentStep > 3} />
                <StepItemButton
                  $isActive={currentStep === 4}
                  $isCompleted={false}
                  onClick={() => createdCharacterData && setCurrentStep(4)}
                  type="button"
                  disabled={!createdCharacterData}
                >
                  <StepNumber $isActive={currentStep === 4} $isCompleted={false}>
                    4
                  </StepNumber>
                  <span>Фото</span>
                </StepItemButton>
              </StepIndicator>

              {/* Wizard Steps */}
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <WizardStep
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StepTitle>Шаг 1: Личность</StepTitle>
                    <StepDescription>
                      Определите имя и основные черты личности персонажа
                    </StepDescription>

                    <FormField>
                      <FormLabel htmlFor="name">Имя персонажа</FormLabel>
                      <ModernInput
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={(e) => {
                          handleInputChange(e);
                          if (e.target.value.trim().length >= 2 && !showPersonality) {
                            setShowPersonality(true);
                          }
                        }}
                        placeholder="Введите имя персонажа..."
                        required
                      />
                      <PromptSuggestions
                        prompts={NAME_PROMPTS}
                        onSelect={(val) => {
                          setFormData(prev => ({ ...prev, name: val }));
                          const fakeEvent = { target: { name: 'name', value: val } } as React.ChangeEvent<HTMLInputElement>;
                          handleInputChange(fakeEvent);
                          if (val.trim().length >= 2 && !showPersonality) {
                            setShowPersonality(true);
                          }
                        }}
                      />
                      {nameError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ marginTop: '8px', fontSize: '13px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px' }}
                        >
                          {nameError}
                        </motion.div>
                      )}
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="personality">Личность и характер</FormLabel>
                      <ModernTextarea
                        id="personality"
                        name="personality"
                        value={formData.personality}
                        onChange={(e) => {
                          handleInputChange(e);
                          if (e.target.value.trim().length > 0 && !showSituation) {
                            setShowSituation(true);
                          }
                        }}
                        placeholder="Опишите характер персонажа: какие у него черты личности?"
                        rows={3}
                        required
                      />
                      <TagsContainer $isExpanded={isPersonalityTagsExpanded}>
                        {PERSONALITY_PROMPTS.map((tag, idx) => (
                          <TagButton
                            key={idx}
                            type="button"
                            $category={getTagCategory(tag.label)}
                            onClick={(e) => {
                              e.preventDefault();
                              const newVal = formData.personality ? formData.personality + ' ' + tag.value : tag.value;
                              setFormData(prev => ({ ...prev, personality: newVal }));
                              const fakeEvent = { target: { name: 'personality', value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
                              handleInputChange(fakeEvent);
                              if (newVal.trim().length > 0 && !showSituation) {
                                setShowSituation(true);
                              }
                            }}
                          >
                            <Plus size={8} /> {tag.label}
                          </TagButton>
                        ))}
                      </TagsContainer>
                      {PERSONALITY_PROMPTS.length > 4 && (
                        <ExpandButton
                          $isExpanded={isPersonalityTagsExpanded}
                          onClick={() => setIsPersonalityTagsExpanded(!isPersonalityTagsExpanded)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isPersonalityTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                          </svg>
                        </ExpandButton>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <motion.button
                          type="button"
                          onClick={() => {
                            if ((formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0) {
                              setCurrentStep(2);
                            }
                          }}
                          disabled={(formData.name || '').trim().length < 2 || (formData.personality || '').trim().length === 0}
                          style={{
                            padding: '12px 24px',
                            background: (formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0
                              ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                              : 'rgba(60, 60, 80, 0.5)',
                            border: '1px solid',
                            borderColor: (formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0
                              ? 'rgba(139, 92, 246, 0.6)'
                              : 'rgba(100, 100, 120, 0.3)',
                            borderRadius: '12px',
                            color: (formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0 ? '#ffffff' : '#71717a',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: (formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.3s ease',
                            fontFamily: 'Inter, sans-serif'
                          }}
                          whileHover={(formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0 ? { scale: 1.05, y: -2 } : {}}
                          whileTap={(formData.name || '').trim().length >= 2 && (formData.personality || '').trim().length > 0 ? { scale: 0.95 } : {}}
                        >
                          Далее →
                        </motion.button>
                      </div>
                    </FormField>
                  </WizardStep>
                )}

                {currentStep === 2 && (
                  <WizardStep
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StepTitle>Шаг 2: История</StepTitle>
                    <StepDescription>
                      Опишите контекст и ролевую ситуацию персонажа
                    </StepDescription>

                    <FormField>
                      <FormLabel htmlFor="situation">Ролевая ситуация</FormLabel>
                      <ModernTextarea
                        id="situation"
                        name="situation"
                        value={formData.situation}
                        onChange={(e) => {
                          handleInputChange(e);
                          if (e.target.value.trim().length > 0 && !showInstructions) {
                            setShowInstructions(true);
                          }
                        }}
                        placeholder="Опишите ситуацию, в которой находится персонаж. Где он живет? Что происходит в его мире?"
                        rows={5}
                        required
                      />
                      <TagsContainer $isExpanded={isSituationTagsExpanded}>
                        {SITUATION_PROMPTS.map((tag, idx) => (
                          <TagButton
                            key={idx}
                            type="button"
                            $category="neutral"
                            onClick={(e) => {
                              e.preventDefault();
                              const newVal = formData.situation ? formData.situation + ' ' + tag.value : tag.value;
                              setFormData(prev => ({ ...prev, situation: newVal }));
                              const fakeEvent = { target: { name: 'situation', value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
                              handleInputChange(fakeEvent);
                              if (newVal.trim().length > 0 && !showInstructions) {
                                setShowInstructions(true);
                              }
                            }}
                          >
                            <Plus size={8} /> {tag.label}
                          </TagButton>
                        ))}
                      </TagsContainer>
                      {SITUATION_PROMPTS.length > 4 && (
                        <ExpandButton
                          $isExpanded={isSituationTagsExpanded}
                          onClick={() => setIsSituationTagsExpanded(!isSituationTagsExpanded)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isSituationTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                          </svg>
                        </ExpandButton>
                      )}
                    </FormField>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                      <motion.button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        style={{
                          padding: '12px 24px',
                          background: 'rgba(40, 40, 50, 0.4)',
                          border: '1px solid rgba(100, 100, 110, 0.3)',
                          borderRadius: '12px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ← Назад
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => {
                          if ((formData.situation || '').trim().length > 0) {
                            setCurrentStep(3);
                          }
                        }}
                        disabled={(formData.situation || '').trim().length === 0}
                        style={{
                          padding: '12px 24px',
                          background: (formData.situation || '').trim().length > 0
                            ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                            : 'rgba(60, 60, 80, 0.5)',
                          border: '1px solid',
                          borderColor: (formData.situation || '').trim().length > 0
                            ? 'rgba(139, 92, 246, 0.6)'
                            : 'rgba(100, 100, 120, 0.3)',
                          borderRadius: '12px',
                          color: (formData.situation || '').trim().length > 0 ? '#ffffff' : '#71717a',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: (formData.situation || '').trim().length > 0 ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        whileHover={(formData.situation || '').trim().length > 0 ? { scale: 1.05, y: -2 } : {}}
                        whileTap={(formData.situation || '').trim().length > 0 ? { scale: 0.95 } : {}}
                      >
                        Далее →
                      </motion.button>
                    </div>
                  </WizardStep>
                )}

                {currentStep === 3 && (
                  <WizardStep
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StepTitle>Шаг 3: Завершение</StepTitle>
                    <StepDescription>
                      Добавьте инструкции и описание внешности для генерации фото
                    </StepDescription>

                    <FormField>
                      <FormLabel htmlFor="instructions">Инструкции для персонажа</FormLabel>
                      <ModernTextarea
                        id="instructions"
                        name="instructions"
                        value={formData.instructions}
                        onChange={handleInputChange}
                        placeholder="Как должен вести себя персонаж в разговоре? Какие правила соблюдать?"
                        rows={4}
                        required
                      />
                      <TagsContainer $isExpanded={isInstructionTagsExpanded}>
                        {INSTRUCTION_PROMPTS.map((tag, idx) => (
                          <TagButton
                            key={idx}
                            type="button"
                            $category="neutral"
                            onClick={(e) => {
                              e.preventDefault();
                              const newVal = formData.instructions ? formData.instructions + ' ' + tag : tag;
                              setFormData(prev => ({ ...prev, instructions: newVal }));
                              const fakeEvent = { target: { name: 'instructions', value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
                              handleInputChange(fakeEvent);
                            }}
                          >
                            <Plus size={8} /> {tag}
                          </TagButton>
                        ))}
                      </TagsContainer>
                      {INSTRUCTION_PROMPTS.length > 4 && (
                        <ExpandButton
                          $isExpanded={isInstructionTagsExpanded}
                          onClick={() => setIsInstructionTagsExpanded(!isInstructionTagsExpanded)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isInstructionTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                          </svg>
                        </ExpandButton>
                      )}
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="appearance">Внешность (для фото)</FormLabel>
                      <ModernTextarea
                        id="appearance"
                        name="appearance"
                        value={formData.appearance}
                        onChange={handleInputChange}
                        placeholder="Опишите внешность персонажа для генерации фото: цвет волос, цвет глаз, рост, телосложение, стиль одежды..."
                        rows={4}
                      />
                      <TagsContainer $isExpanded={isAppearanceTagsExpanded}>
                        {APPEARANCE_PROMPTS.map((tag, idx) => (
                          <TagButton
                            key={idx}
                            type="button"
                            $category="neutral"
                            onClick={(e) => {
                              e.preventDefault();
                              const newVal = formData.appearance ? formData.appearance + ' ' + tag.value : tag.value;
                              setFormData(prev => ({ ...prev, appearance: newVal }));
                              const fakeEvent = { target: { name: 'appearance', value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
                              handleInputChange(fakeEvent);
                            }}
                          >
                            <Plus size={8} /> {tag.label}
                          </TagButton>
                        ))}
                      </TagsContainer>
                      {APPEARANCE_PROMPTS.length > 4 && (
                        <ExpandButton
                          $isExpanded={isAppearanceTagsExpanded}
                          onClick={() => setIsAppearanceTagsExpanded(!isAppearanceTagsExpanded)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isAppearanceTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                          </svg>
                        </ExpandButton>
                      )}
                    </FormField>

                    {showLocation && (
                      <FormField>
                        <FormLabel htmlFor="location">Локация (для фото)</FormLabel>
                        <ModernTextarea
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="Опишите локацию для фото: интерьер, обстановка, атмосфера..."
                          rows={4}
                        />
                        <TagsContainer $isExpanded={isLocationTagsExpanded}>
                          {LOCATION_PROMPTS.map((tag, idx) => (
                            <TagButton
                              key={idx}
                              type="button"
                              $category="neutral"
                              onClick={(e) => {
                                e.preventDefault();
                                const newVal = formData.location ? formData.location + ' ' + tag.value : tag.value;
                                setFormData(prev => ({ ...prev, location: newVal }));
                                const fakeEvent = { target: { name: 'location', value: newVal } } as React.ChangeEvent<HTMLTextAreaElement>;
                                handleInputChange(fakeEvent);
                              }}
                            >
                              <Plus size={8} /> {tag.label}
                            </TagButton>
                          ))}
                        </TagsContainer>
                        {LOCATION_PROMPTS.length > 4 && (
                          <ExpandButton
                            $isExpanded={isLocationTagsExpanded}
                            onClick={() => setIsLocationTagsExpanded(!isLocationTagsExpanded)}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points={isLocationTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                            </svg>
                          </ExpandButton>
                        )}
                      </FormField>
                    )}

                    {/* Выбор голоса */}
                    <FormField>
                      <FormLabel>Голос</FormLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start', position: 'relative' }}>
                        {availableVoices.filter((voice) => {
                          const isUserVoice = voice.is_user_voice || false;
                          return !isUserVoice; // Показываем только стандартные голоса
                        }).map((voice) => {
                          const isUserVoice = voice.is_user_voice || false;
                          const isSelected = isUserVoice
                            ? String(selectedVoiceUrl || '') === String(voice.url || '')
                            : String(selectedVoiceId || '') === String(voice.id || '');
                          const audioUrl = voice.preview_url || voice.url;
                          const isPlaying = playingVoiceUrl !== null && (playingVoiceUrl === audioUrl || playingVoiceUrl === voice.url || playingVoiceUrl === voice.preview_url);
                          const photoPath = isUserVoice
                            ? (voice.photo_url
                              ? (voice.photo_url.startsWith('http') ? voice.photo_url : `${API_CONFIG.BASE_URL}${voice.photo_url}`)
                              : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K')
                            : getVoicePhotoPath(voice.name);
                          const isEditingName = editingVoiceId === voice.id;
                          const editedName = editedVoiceNames[voice.id] || voice.name;
                          const isEditingPhoto = editingVoicePhotoId === voice.id || editingVoicePhotoId === String(voice.id);

                          return (
                            <VoicePhotoWrapper key={voice.id}>
                              <VoicePhotoContainer
                                $isSelected={isSelected}
                                $isPlaying={isPlaying}
                                $voiceName={voice.name}
                                $isUserVoice={isUserVoice}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  // Если кликнули на кнопку редактирования, не выбираем голос
                                  if ((e.target as HTMLElement).closest('.edit-voice-button')) {
                                    return;
                                  }
                                  // Если кликнули на кнопку удаления, не выбираем голос
                                  if ((e.target as HTMLElement).closest('.delete-voice-button')) {
                                    return;
                                  }
                                  // Если редактируется имя, не выбираем голос
                                  if (editingVoiceId === voice.id) return;

                                  // Выбор голоса (проверка PREMIUM при отправке формы — Создать/Сохранить)
                                  // КРИТИЧНО: для пользовательского голоса передаём voice.id (user_voice_123), иначе бэкенд подставит дефолт "Даша.mp3"
                                  if (isUserVoice) {
                                    setSelectedVoiceUrl(voice.url);
                                    setSelectedVoiceId(voice.id || '');
                                    setVoiceSelectionTime(prev => ({ ...prev, [voice.url]: Date.now() }));
                                  } else {
                                    setSelectedVoiceId(voice.id);
                                    setSelectedVoiceUrl(null);
                                    setVoiceSelectionTime(prev => ({ ...prev, [voice.id]: Date.now() }));
                                  }

                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.currentTime = 0;
                                    audioRef.current = null;
                                  }
                                  if (playingVoiceUrl) {
                                    setPlayingVoiceUrl(null);
                                  }

                                  const audioUrlToPlay = voice.preview_url || voice.url;
                                  if (playingVoiceUrl && (playingVoiceUrl === audioUrlToPlay || playingVoiceUrl === voice.url || playingVoiceUrl === voice.preview_url)) {
                                    return;
                                  }

                                  if (audioUrlToPlay) {
                                    try {
                                      const fullUrl = audioUrlToPlay.startsWith('http') ? audioUrlToPlay : `${API_CONFIG.BASE_URL}${audioUrlToPlay}`;
                                      const encodedUrl = encodeURI(fullUrl);
                                      const audio = new Audio(encodedUrl);
                                      audioRef.current = audio;
                                      audio.preload = 'auto';
                                      audio.volume = 1.0;
                                      audio.onended = () => {
                                        setPlayingVoiceUrl(null);
                                        audioRef.current = null;
                                      };
                                      audio.onerror = () => {
                                        setPlayingVoiceUrl(null);
                                        audioRef.current = null;
                                      };
                                      setPlayingVoiceUrl(audioUrlToPlay);
                                      await audio.play();
                                    } catch (err) {
                                      setPlayingVoiceUrl(null);
                                      audioRef.current = null;
                                    }
                                  }
                                }}
                              >
                                <VoicePhoto
                                  src={photoPath}
                                  alt={voice.name}
                                  $voiceName={voice.name}
                                  $isSelected={isSelected}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const normalizedName = voice.name.replace(/\.(mp3|wav|ogg)$/i, '');
                                    const extensions = ['.jpg', '.jpeg', '.webp'];
                                    const currentSrc = target.src;
                                    const currentExt = currentSrc.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.png';
                                    const currentIndex = extensions.findIndex(ext => currentExt.includes(ext.replace('.', '')));
                                    if (currentIndex < extensions.length - 1) {
                                      target.src = `/default_voice_photo/${normalizedName}${extensions[currentIndex + 1]}`;
                                    } else {
                                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K';
                                    }
                                  }}
                                />
                                {isSelected && (
                                  <VoiceCheckmark $show={isSelected} $isPremium={false} />
                                )}
                                {isPlaying && (
                                  <WaveformContainer $isPlaying={isPlaying}>
                                    {[...Array(5)].map((_, i) => (
                                      <WaveformBar key={i} $delay={i} $isPremium={isPremiumVoice(voice.name)} />
                                    ))}
                                  </WaveformContainer>
                                )}
                                {((isUserVoice && (isOwner || isAdmin || userInfo?.is_admin)) || (!isUserVoice && (isAdmin || userInfo?.is_admin))) && (
                                  <EditButton
                                    className="edit-voice-button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      const newEditingId = voice.id;
                                      setEditingVoiceId(newEditingId);
                                      setEditingVoicePhotoId(newEditingId);
                                      setEditedVoiceNames(prev => ({
                                        ...prev,
                                        [voice.id]: voice.name
                                      }));
                                    }}
                                    title="Редактировать фото и название"
                                  >
                                    ✎
                                  </EditButton>
                                )}
                                {((isUserVoice && (isOwner || isAdmin || userInfo?.is_admin)) || (!isUserVoice && (isAdmin || userInfo?.is_admin))) && (
                                  <DeleteButton
                                    className="delete-voice-button"
                                    onClick={async (e) => {
                                      e.stopPropagation();

                                      if (!confirm(`Вы уверены, что хотите удалить голос "${voice.name}"?`)) {
                                        return;
                                      }

                                      try {
                                        const token = localStorage.getItem('authToken');

                                        // Проверяем, что это действительно пользовательский голос с валидным ID
                                        if (isUserVoice && voice.user_voice_id) {
                                          // Удаление пользовательского голоса
                                          const voiceIdToDelete = typeof voice.user_voice_id === 'number'
                                            ? voice.user_voice_id
                                            : parseInt(String(voice.user_voice_id), 10);

                                          if (isNaN(voiceIdToDelete)) {
                                            alert('Ошибка: неверный ID голоса для удаления');
                                            return;
                                          }

                                          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/user-voice/${voiceIdToDelete}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });

                                          if (response.ok) {
                                            // Обновляем список голосов
                                            const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                              headers: {
                                                'Authorization': `Bearer ${token}`
                                              }
                                            });
                                            if (voicesResponse.ok) {
                                              const voicesData = await voicesResponse.json();
                                              setAvailableVoices(voicesData);
                                            }
                                            // Если удаленный голос был выбран, сбрасываем выбор
                                            if (selectedVoiceUrl === voice.url) {
                                              setSelectedVoiceUrl(null);
                                              setSelectedVoiceId('');
                                            }
                                          } else {
                                            const error = await response.json();
                                            alert('Ошибка удаления голоса: ' + (error.detail || 'Неизвестная ошибка'));
                                          }
                                        } else if (!isUserVoice && isAdmin) {
                                          // Удаление дефолтного голоса
                                          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/default-voice/${voice.id}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });

                                          if (response.ok) {
                                            // Обновляем список голосов
                                            const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                              headers: {
                                                'Authorization': `Bearer ${token}`
                                              }
                                            });
                                            if (voicesResponse.ok) {
                                              const voicesData = await voicesResponse.json();
                                              setAvailableVoices(voicesData);
                                            }
                                            // Если удаленный голос был выбран, сбрасываем выбор
                                            if (selectedVoiceId === voice.id) {
                                              setSelectedVoiceId('');
                                              setSelectedVoiceUrl(null);
                                            }
                                          } else {
                                            const errorText = await response.text();
                                            let errorMessage = 'Неизвестная ошибка';
                                            try {
                                              const error = JSON.parse(errorText);
                                              errorMessage = error.detail || errorMessage;
                                            } catch {
                                              errorMessage = errorText || errorMessage;
                                            }
                                            alert('Ошибка удаления голоса: ' + errorMessage);
                                          }
                                        } else {
                                          alert('Не удалось определить тип голоса для удаления.');
                                        }
                                      } catch (err) {
                                        alert('Не удалось удалить голос. Проверьте консоль для деталей.');
                                      }
                                    }}
                                    title="Удалить голос"
                                  >
                                    ×
                                  </DeleteButton>
                                )}
                              </VoicePhotoContainer>
                              {((isUserVoice && isEditingName) || (!isUserVoice && isAdmin && isEditingName)) ? (
                                <input
                                  type="text"
                                  value={editedName}
                                  onChange={(e) => {
                                    setEditedVoiceNames(prev => ({
                                      ...prev,
                                      [voice.id]: e.target.value
                                    }));
                                  }}
                                  onBlur={async () => {
                                    const newName = editedName.trim();
                                    if (newName && newName !== voice.name) {
                                      try {
                                        const token = localStorage.getItem('authToken');

                                        if (isUserVoice && voice.user_voice_id) {
                                          // Редактирование пользовательского голоса
                                          const formData = new FormData();
                                          formData.append('voice_name', newName);
                                          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/user-voice/${voice.user_voice_id}/name`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            },
                                            body: formData
                                          });

                                          if (response.ok) {
                                            // Обновляем список голосов
                                            const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                              headers: {
                                                'Authorization': `Bearer ${token}`
                                              }
                                            });
                                            if (voicesResponse.ok) {
                                              const voicesData = await voicesResponse.json();
                                              setAvailableVoices(voicesData);
                                            }
                                          } else {
                                            // Откатываем изменение при ошибке
                                            setEditedVoiceNames(prev => {
                                              const newState = { ...prev };
                                              delete newState[voice.id];
                                              return newState;
                                            });
                                          }
                                        } else if (!isUserVoice && isAdmin) {
                                          // Редактирование дефолтного голоса
                                          const formData = new FormData();
                                          formData.append('new_name', newName);
                                          const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/default-voice/${voice.id}/name`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            },
                                            body: formData
                                          });

                                          if (response.ok) {
                                            // Обновляем список голосов
                                            const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                              headers: {
                                                'Authorization': `Bearer ${token}`
                                              }
                                            });
                                            if (voicesResponse.ok) {
                                              const voicesData = await voicesResponse.json();
                                              setAvailableVoices(voicesData);
                                            }
                                          } else {
                                            const error = await response.json();
                                            alert('Ошибка переименования голоса: ' + (error.detail || 'Неизвестная ошибка'));
                                            // Откатываем изменение при ошибке
                                            setEditedVoiceNames(prev => {
                                              const newState = { ...prev };
                                              delete newState[voice.id];
                                              return newState;
                                            });
                                          }
                                        }
                                      } catch (err) {
                                        alert('Не удалось обновить имя голоса. Проверьте консоль для деталей.');
                                        setEditedVoiceNames(prev => {
                                          const newState = { ...prev };
                                          delete newState[voice.id];
                                          return newState;
                                        });
                                      }
                                    } else {
                                      setEditedVoiceNames(prev => {
                                        const newState = { ...prev };
                                        delete newState[voice.id];
                                        return newState;
                                      });
                                    }
                                    setEditingVoiceId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    } else if (e.key === 'Escape') {
                                      setEditedVoiceNames(prev => {
                                        const newState = { ...prev };
                                        delete newState[voice.id];
                                        return newState;
                                      });
                                      setEditingVoiceId(null);
                                    }
                                  }}
                                  autoFocus
                                  style={{
                                    position: 'absolute',
                                    bottom: '-20px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '120px',
                                    fontSize: '11px',
                                    padding: '2px 4px',
                                    background: 'rgba(30, 30, 30, 0.95)',
                                    border: '1px solid rgba(139, 92, 246, 0.6)',
                                    borderRadius: '4px',
                                    color: '#e4e4e7',
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                />
                              ) : null}
                              {!((isUserVoice && isEditingName) || (!isUserVoice && isAdmin && isEditingName)) && (
                                <>
                                  {isPremiumVoice(voice.name) ? (
                                    <PremiumVoiceName>
                                      <span>{voice.name}</span>
                                    </PremiumVoiceName>
                                  ) : (
                                    <VoiceName $isUserVoice={isUserVoice}>
                                      {voice.name}
                                    </VoiceName>
                                  )}
                                  {isPremiumVoice(voice.name) && (
                                    <PremiumVoiceLabel>Только для Premium</PremiumVoiceLabel>
                                  )}
                                </>
                              )}
                            </VoicePhotoWrapper>
                          );
                        })}
                        <div style={{ position: 'relative' }}>
                          <AnimatePresence>
                            {showPremiumOnlyNotice && (
                              <PremiumOnlyNotice
                                key="premium-only-notice"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                Только для Premium
                              </PremiumOnlyNotice>
                            )}
                          </AnimatePresence>
                          <VoicePhotoWrapper>
                            <AddVoiceContainer
                              $isUploading={isUploadingVoice}
                              $isPremium={true}
                              onClick={(e) => {
                                e.preventDefault();
                                if (isUploadingVoice) return;

                                // Проверка PREMIUM подписки
                                const subscriptionType = userInfo?.subscription?.subscription_type ||
                                  (userInfo as any)?.subscription_type ||
                                  'free';
                                const isPremiumUser = ['pro', 'premium'].includes(subscriptionType.toLowerCase());

                                if (!isPremiumUser) {
                                  setShowPremiumOnlyNotice(true);
                                  return;
                                }

                                setIsVoiceCloneModalOpen(true);
                              }}
                            >
                              {isUploadingVoice ? <VoiceLoadingSpinner /> : <AddVoicePlus />}
                            </AddVoiceContainer>
                            <AddVoiceName>{isUploadingVoice ? 'Загрузка...' : 'добавить свой голос'}</AddVoiceName>
                          </VoicePhotoWrapper>
                        </div>
                      </div>

                      {/* Пользовательские голоса */}
                      {availableVoices.filter((voice) => {
                        const isUserVoice = voice.is_user_voice || false;
                        return isUserVoice;
                      }).length > 0 && (
                          <>
                            <ExpandButton
                              $isExpanded={showUserVoices}
                              onClick={() => setShowUserVoices(!showUserVoices)}
                              style={{ marginTop: '16px', marginBottom: '8px', justifyContent: 'flex-start', gap: '8px' }}
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points={showUserVoices ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                              </svg>
                              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                {showUserVoices ? 'Скрыть' : 'Показать'} пользовательские голоса ({availableVoices.filter((voice) => voice.is_user_voice || false).length})
                              </span>
                            </ExpandButton>

                            {showUserVoices && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start', marginTop: '8px' }}>
                                {availableVoices.filter((voice) => {
                                  const isUserVoice = voice.is_user_voice || false;
                                  return isUserVoice;
                                }).map((voice) => {
                                  const isUserVoice = voice.is_user_voice || false;
                                  const isPublic = voice.is_public === true || voice.is_public === 1 || voice.is_public === '1';
                                  const isOwner = voice.is_owner === true || voice.is_owner === 1 || voice.is_owner === '1';
                                  const isSelected = isUserVoice
                                    ? String(selectedVoiceUrl || '') === String(voice.url || '')
                                    : String(selectedVoiceId || '') === String(voice.id || '');
                                  const audioUrl = voice.preview_url || voice.url;
                                  const isPlaying = playingVoiceUrl !== null && (playingVoiceUrl === audioUrl || playingVoiceUrl === voice.url || playingVoiceUrl === voice.preview_url);
                                  const photoPath = isUserVoice
                                    ? (voice.photo_url
                                      ? (voice.photo_url.startsWith('http') ? voice.photo_url : `${API_CONFIG.BASE_URL}${voice.photo_url}`)
                                      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K')
                                    : getVoicePhotoPath(voice.name);
                                  const isEditingName = editingVoiceId === (voice.id || voice.user_voice_id) || editingVoiceId === String(voice.id || voice.user_voice_id);
                                  const editedName = editedVoiceNames[voice.id || voice.user_voice_id] || voice.name;
                                  const isEditingPhoto = editingVoicePhotoId === (voice.id || voice.user_voice_id) || editingVoicePhotoId === String(voice.id || voice.user_voice_id);

                                  return (
                                    <VoicePhotoWrapper key={voice.id || voice.user_voice_id || voice.url}>
                                      <VoicePhotoContainer
                                        $isSelected={isSelected}
                                        $isPlaying={isPlaying}
                                        $voiceName={voice.name}
                                        $isUserVoice={isUserVoice}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          // Если кликнули на кнопку редактирования, не выбираем голос
                                          if ((e.target as HTMLElement).closest('.edit-voice-button')) {
                                            return;
                                          }
                                          // Если кликнули на кнопку удаления, не выбираем голос
                                          if ((e.target as HTMLElement).closest('.delete-voice-button')) {
                                            return;
                                          }

                                          // КРИТИЧНО: для пользовательского голоса передаём voice.id (user_voice_123), иначе бэкенд подставит дефолт
                                          if (isUserVoice) {
                                            setSelectedVoiceUrl(voice.url);
                                            setSelectedVoiceId(voice.id || '');
                                            setVoiceSelectionTime(prev => ({ ...prev, [voice.url]: Date.now() }));
                                          } else {
                                            setSelectedVoiceId(voice.id);
                                            setSelectedVoiceUrl(null);
                                            setVoiceSelectionTime(prev => ({ ...prev, [voice.id]: Date.now() }));
                                          }

                                          if (audioRef.current) {
                                            audioRef.current.pause();
                                            audioRef.current.currentTime = 0;
                                            audioRef.current = null;
                                          }
                                          if (playingVoiceUrl) {
                                            setPlayingVoiceUrl(null);
                                          }

                                          const audioUrlToPlay = voice.preview_url || voice.url;
                                          if (playingVoiceUrl && (playingVoiceUrl === audioUrlToPlay || playingVoiceUrl === voice.url || playingVoiceUrl === voice.preview_url)) {
                                            return;
                                          }

                                          if (audioUrlToPlay) {
                                            try {
                                              const fullUrl = audioUrlToPlay.startsWith('http') ? audioUrlToPlay : `${API_CONFIG.BASE_URL}${audioUrlToPlay}`;
                                              const encodedUrl = encodeURI(fullUrl);
                                              const audio = new Audio(encodedUrl);
                                              audioRef.current = audio;
                                              audio.preload = 'auto';
                                              audio.volume = 1.0;
                                              audio.onended = () => {
                                                setPlayingVoiceUrl(null);
                                                audioRef.current = null;
                                              };
                                              audio.onerror = () => {
                                                setPlayingVoiceUrl(null);
                                                audioRef.current = null;
                                              };
                                              setPlayingVoiceUrl(audioUrlToPlay);
                                              await audio.play();
                                            } catch (err) {
                                              setPlayingVoiceUrl(null);
                                              audioRef.current = null;
                                            }
                                          }
                                        }}
                                      >
                                        <VoicePhoto
                                          src={photoPath}
                                          alt={voice.name}
                                          $voiceName={voice.name}
                                          $isSelected={isSelected}
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const normalizedName = voice.name.replace(/\.(mp3|wav|ogg)$/i, '');
                                            const extensions = ['.jpg', '.jpeg', '.webp'];
                                            const currentSrc = target.src;
                                            const currentExt = currentSrc.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.png';
                                            const currentIndex = extensions.findIndex(ext => currentExt.includes(ext.replace('.', '')));
                                            if (currentIndex < extensions.length - 1) {
                                              target.src = `/default_voice_photo/${normalizedName}${extensions[currentIndex + 1]}`;
                                            } else {
                                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K';
                                            }
                                          }}
                                        />
                                        {isSelected && (
                                          <VoiceCheckmark $show={isSelected} $isPremium={false} />
                                        )}
                                        {isPlaying && (
                                          <WaveformContainer $isPlaying={isPlaying}>
                                            {[...Array(5)].map((_, i) => (
                                              <WaveformBar key={i} $delay={i} $isPremium={isPremiumVoice(voice.name)} />
                                            ))}
                                          </WaveformContainer>
                                        )}
                                        {((isUserVoice && (isOwner || isAdmin || userInfo?.is_admin)) || (!isUserVoice && (isAdmin || userInfo?.is_admin))) && (
                                          <EditButton
                                            className="edit-voice-button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              const newEditingId = voice.id || voice.user_voice_id;
                                              setEditingVoiceId(String(newEditingId));
                                              setEditingVoicePhotoId(String(newEditingId));
                                              setEditedVoiceNames(prev => ({
                                                ...prev,
                                                [newEditingId]: voice.name
                                              }));
                                            }}
                                            title="Редактировать фото и название"
                                          >
                                            ✎
                                          </EditButton>
                                        )}
                                        {((isUserVoice && (isOwner || isAdmin || userInfo?.is_admin)) || (!isUserVoice && (isAdmin || userInfo?.is_admin))) && (
                                          <DeleteButton
                                            className="delete-voice-button"
                                            onClick={async (e) => {
                                              e.stopPropagation();

                                              if (!confirm(`Вы уверены, что хотите удалить голос "${voice.name}"?`)) {
                                                return;
                                              }

                                              try {
                                                const token = localStorage.getItem('authToken');

                                                // Проверяем, что это действительно пользовательский голос с валидным ID
                                                if (isUserVoice && voice.user_voice_id) {
                                                  // Удаление пользовательского голоса
                                                  const voiceIdToDelete = typeof voice.user_voice_id === 'number'
                                                    ? voice.user_voice_id
                                                    : parseInt(String(voice.user_voice_id), 10);

                                                  if (isNaN(voiceIdToDelete)) {
                                                    alert('Ошибка: неверный ID голоса для удаления');
                                                    return;
                                                  }

                                                  const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/user-voice/${voiceIdToDelete}`, {
                                                    method: 'DELETE',
                                                    headers: {
                                                      'Authorization': `Bearer ${token}`
                                                    }
                                                  });

                                                  if (response.ok) {
                                                    // Обновляем список голосов
                                                    const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                                      headers: {
                                                        'Authorization': `Bearer ${token}`
                                                      }
                                                    });
                                                    if (voicesResponse.ok) {
                                                      const voicesData = await voicesResponse.json();
                                                      setAvailableVoices(voicesData);
                                                    }
                                                    // Если удаленный голос был выбран, сбрасываем выбор
                                                    if (selectedVoiceUrl === voice.url) {
                                                      setSelectedVoiceUrl(null);
                                                      setSelectedVoiceId('');
                                                    }
                                                  } else {
                                                    const error = await response.json();
                                                    alert('Ошибка удаления голоса: ' + (error.detail || 'Неизвестная ошибка'));
                                                  }
                                                } else if (!isUserVoice && isAdmin) {
                                                  // Удаление дефолтного голоса
                                                  const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/default-voice/${voice.id}`, {
                                                    method: 'DELETE',
                                                    headers: {
                                                      'Authorization': `Bearer ${token}`
                                                    }
                                                  });

                                                  if (response.ok) {
                                                    // Обновляем список голосов
                                                    const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                                      headers: {
                                                        'Authorization': `Bearer ${token}`
                                                      }
                                                    });
                                                    if (voicesResponse.ok) {
                                                      const voicesData = await voicesResponse.json();
                                                      setAvailableVoices(voicesData);
                                                    }
                                                    // Если удаленный голос был выбран, сбрасываем выбор
                                                    if (selectedVoiceId === voice.id) {
                                                      setSelectedVoiceId('');
                                                      setSelectedVoiceUrl(null);
                                                    }
                                                  } else {
                                                    const errorText = await response.text();
                                                    let errorMessage = 'Неизвестная ошибка';
                                                    try {
                                                      const error = JSON.parse(errorText);
                                                      errorMessage = error.detail || errorMessage;
                                                    } catch {
                                                      errorMessage = errorText || errorMessage;
                                                    }
                                                    alert('Ошибка удаления голоса: ' + errorMessage);
                                                  }
                                                } else {
                                                  alert('Не удалось определить тип голоса для удаления.');
                                                }
                                              } catch (err) {
                                                alert('Не удалось удалить голос. Проверьте консоль для деталей.');
                                              }
                                            }}
                                            title="Удалить голос"
                                          >
                                            ×
                                          </DeleteButton>
                                        )}
                                      </VoicePhotoContainer>
                                      {((isUserVoice && isEditingName) || (!isUserVoice && isAdmin && isEditingName)) ? (
                                        <input
                                          type="text"
                                          value={editedName}
                                          onChange={(e) => {
                                            setEditedVoiceNames(prev => ({
                                              ...prev,
                                              [voice.id || voice.user_voice_id]: e.target.value
                                            }));
                                          }}
                                          onBlur={async () => {
                                            const newName = editedName.trim();
                                            if (newName && newName !== voice.name) {
                                              try {
                                                const token = localStorage.getItem('authToken');

                                                if (isUserVoice && voice.user_voice_id) {
                                                  // Редактирование пользовательского голоса
                                                  const formData = new FormData();
                                                  formData.append('voice_name', newName);
                                                  const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/user-voice/${voice.user_voice_id}/name`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                      'Authorization': `Bearer ${token}`
                                                    },
                                                    body: formData
                                                  });

                                                  if (response.ok) {
                                                    // Обновляем список голосов
                                                    const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                                      headers: {
                                                        'Authorization': `Bearer ${token}`
                                                      }
                                                    });
                                                    if (voicesResponse.ok) {
                                                      const voicesData = await voicesResponse.json();
                                                      setAvailableVoices(voicesData);
                                                    }
                                                  } else {
                                                    // Откатываем изменение при ошибке
                                                    setEditedVoiceNames(prev => {
                                                      const newState = { ...prev };
                                                      delete newState[voice.id || voice.user_voice_id];
                                                      return newState;
                                                    });
                                                  }
                                                } else if (!isUserVoice && isAdmin) {
                                                  // Редактирование дефолтного голоса
                                                  const formData = new FormData();
                                                  formData.append('new_name', newName);
                                                  const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/default-voice/${voice.id}/name`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                      'Authorization': `Bearer ${token}`
                                                    },
                                                    body: formData
                                                  });

                                                  if (response.ok) {
                                                    // Обновляем список голосов
                                                    const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                                      headers: {
                                                        'Authorization': `Bearer ${token}`
                                                      }
                                                    });
                                                    if (voicesResponse.ok) {
                                                      const voicesData = await voicesResponse.json();
                                                      setAvailableVoices(voicesData);
                                                    }
                                                  } else {
                                                    const error = await response.json();
                                                    alert('Ошибка переименования голоса: ' + (error.detail || 'Неизвестная ошибка'));
                                                    // Откатываем изменение при ошибке
                                                    setEditedVoiceNames(prev => {
                                                      const newState = { ...prev };
                                                      delete newState[voice.id || voice.user_voice_id];
                                                      return newState;
                                                    });
                                                  }
                                                }
                                              } catch (err) {
                                                alert('Не удалось обновить имя голоса. Проверьте консоль для деталей.');
                                                setEditedVoiceNames(prev => {
                                                  const newState = { ...prev };
                                                  delete newState[voice.id || voice.user_voice_id];
                                                  return newState;
                                                });
                                              }
                                            } else {
                                              setEditedVoiceNames(prev => {
                                                const newState = { ...prev };
                                                delete newState[voice.id || voice.user_voice_id];
                                                return newState;
                                              });
                                            }
                                            setEditingVoiceId(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              (e.target as HTMLInputElement).blur();
                                            } else if (e.key === 'Escape') {
                                              setEditedVoiceNames(prev => {
                                                const newState = { ...prev };
                                                delete newState[voice.id || voice.user_voice_id];
                                                return newState;
                                              });
                                              setEditingVoiceId(null);
                                            }
                                          }}
                                          autoFocus
                                          style={{
                                            position: 'absolute',
                                            bottom: '-20px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '120px',
                                            fontSize: '11px',
                                            padding: '2px 4px',
                                            background: 'rgba(30, 30, 30, 0.95)',
                                            border: '1px solid rgba(139, 92, 246, 0.6)',
                                            borderRadius: '4px',
                                            color: '#e4e4e7',
                                            textAlign: 'center',
                                            outline: 'none'
                                          }}
                                        />
                                      ) : null}
                                      {!((isUserVoice && isEditingName) || (!isUserVoice && isAdmin && isEditingName)) && (
                                        <VoiceName $isUserVoice={isUserVoice}>
                                          {voice.name}
                                        </VoiceName>
                                      )}
                                    </VoicePhotoWrapper>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}

                      {/* Общее модальное окно редактирования голоса — рендер в body, чтобы было по центру экрана */}
                      {editingVoicePhotoId && (() => {
                        const editingVoice = availableVoices.find(v =>
                          String(v.id) === String(editingVoicePhotoId) ||
                          String(v.user_voice_id) === String(editingVoicePhotoId)
                        );
                        if (!editingVoice) return null;

                        const isUserVoice = editingVoice.is_user_voice || false;
                        const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9InJnYmEoNjAsIDYwLCA2MCwgMC4zKSIvPgo8cGF0aCBkPSJNMzAgNDBDMzAgMzUuMDI5IDM0LjAyOSAzMSAzOSAzMUg0MUM0NS45NzEgMzEgNTAgMzUuMDI5IDUwIDQwQzUwIDQ0Ljk3MSA0NS45NzEgNDkgNDEgNDlIMzlDMzQuMDI5IDQ5IDMwIDQ0Ljk3MSAzMCA0MFoiIGZpbGw9InJnYmEoMTUwLCAxNTAsIDE1MCwgMC41KSIvPgo8L3N2Zz4K';
                        const photoPath = isUserVoice
                          ? (editingVoice.photo_url
                            ? (editingVoice.photo_url.startsWith('http') ? editingVoice.photo_url : `${API_CONFIG.BASE_URL}${editingVoice.photo_url}`)
                            : defaultPlaceholder)
                          : getVoicePhotoPath(editingVoice.name);
                        const editedName = editedVoiceNames[editingVoice.id] || editingVoice.name;

                        const modalContent = (
                          <div
                            style={{
                              position: 'fixed',
                              inset: 0,
                              background: 'rgba(0, 0, 0, 0.5)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 99999,
                              padding: '24px',
                              boxSizing: 'border-box'
                            }}
                            onClick={(e) => {
                              if (e.target === e.currentTarget) {
                                setEditingVoicePhotoId(null);
                              }
                            }}
                          >
                            <div
                              style={{
                                background: 'rgba(30, 30, 30, 0.95)',
                                border: '1px solid rgba(139, 92, 246, 0.6)',
                                borderRadius: '12px',
                                padding: '24px',
                                width: '100%',
                                maxWidth: '420px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <h3 style={{ color: '#e4e4e7', marginBottom: '20px', fontSize: '18px' }}>
                                Редактировать голос
                              </h3>

                              {/* Редактирование фото */}
                              <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#e4e4e7', marginBottom: '8px', fontSize: '14px' }}>
                                  Фото голоса
                                </label>
                                {photoPreview && photoPreview.url && (photoPreview.voiceId === editingVoice.id || photoPreview.voiceId === String(editingVoice.id) || photoPreview.voiceId === String(editingVoice.user_voice_id)) ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                                    <div
                                      style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid rgba(139, 92, 246, 0.6)',
                                        position: 'relative',
                                        cursor: 'move',
                                        userSelect: 'none',
                                        margin: '0 auto',
                                        touchAction: 'none'
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsDraggingPhoto(true);
                                        setDragStart({
                                          x: e.clientX,
                                          y: e.clientY,
                                          photoX: photoPreview.x,
                                          photoY: photoPreview.y,
                                          element: e.currentTarget
                                        });
                                      }}
                                    >
                                      <img
                                        src={photoPreview.url}
                                        alt="Preview"
                                        draggable="false"
                                        style={{
                                          position: 'absolute',
                                          top: '50%',
                                          left: '50%',
                                          minWidth: '100%',
                                          minHeight: '100%',
                                          width: 'auto',
                                          height: 'auto',
                                          maxWidth: '200%',
                                          maxHeight: '200%',
                                          transform: `translate(calc(-50% + ${photoPreview.x}px), calc(-50% + ${photoPreview.y}px))`,
                                          pointerEvents: 'none',
                                          userSelect: 'none',
                                          objectFit: 'cover'
                                        }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              setPhotoPreview({
                                                url: event.target?.result as string,
                                                x: 0,
                                                y: 0,
                                                voiceId: String(editingVoice.id || editingVoice.user_voice_id)
                                              });
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        style={{ display: 'none' }}
                                        id={`photo-reload-input-create-${editingVoice.id || editingVoice.user_voice_id}`}
                                      />
                                      <label
                                        htmlFor={`photo-reload-input-create-${editingVoice.id || editingVoice.user_voice_id}`}
                                        style={{
                                          padding: '8px 16px',
                                          background: 'rgba(139, 92, 246, 0.8)',
                                          border: '1px solid rgba(139, 92, 246, 0.6)',
                                          borderRadius: '6px',
                                          color: 'white',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          fontWeight: '500'
                                        }}
                                      >
                                        Загрузить фото
                                      </label>
                                      {editingVoice.user_voice_id && (
                                        <button
                                          type="button"
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (photoPreview && editingVoice.user_voice_id) {
                                              try {
                                                const canvas = document.createElement('canvas');
                                                const ctx = canvas.getContext('2d');
                                                const size = 200;
                                                canvas.width = size;
                                                canvas.height = size;

                                                const img = new Image();
                                                img.crossOrigin = 'anonymous';
                                                img.onload = async () => {
                                                  const previewSize = 120;
                                                  const finalSize = size;
                                                  const scale = finalSize / previewSize;

                                                  const imgScale = Math.max(finalSize / img.width, finalSize / img.height);
                                                  const imgW = img.width * imgScale;
                                                  const imgH = img.height * imgScale;

                                                  const baseX = (finalSize - imgW) / 2;
                                                  const baseY = (finalSize - imgH) / 2;

                                                  const offsetX = photoPreview.x * scale;
                                                  const offsetY = photoPreview.y * scale;

                                                  ctx.beginPath();
                                                  ctx.arc(finalSize / 2, finalSize / 2, finalSize / 2, 0, Math.PI * 2);
                                                  ctx.clip();

                                                  ctx.drawImage(img, baseX + offsetX, baseY + offsetY, imgW, imgH);

                                                  canvas.toBlob(async (blob) => {
                                                    if (blob && editingVoice.user_voice_id) {
                                                      setUploadingPhotoVoiceId(String(editingVoice.id || editingVoice.user_voice_id));
                                                      try {
                                                        const formData = new FormData();
                                                        formData.append('photo_file', blob, 'voice_photo.png');
                                                        const token = localStorage.getItem('authToken');
                                                        const photoUrl = `${API_CONFIG.BASE_URL}/api/v1/characters/user-voice/${editingVoice.user_voice_id}/photo`;
                                                        const response = await fetch(photoUrl, {
                                                          method: 'PATCH',
                                                          headers: {
                                                            'Authorization': `Bearer ${token}`
                                                          },
                                                          body: formData
                                                        });

                                                        if (response.ok) {
                                                          const token = localStorage.getItem('authToken');
                                                          const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                                                            headers: {
                                                              'Authorization': `Bearer ${token}`
                                                            }
                                                          });
                                                          if (voicesResponse.ok) {
                                                            const voicesData = await voicesResponse.json();
                                                            setAvailableVoices(voicesData);
                                                          }
                                                          setPhotoPreview(null);
                                                          setEditingVoicePhotoId(null);
                                                        } else {
                                                          const error = await response.json();
                                                          alert('Ошибка обновления фото: ' + (error.detail || 'Неизвестная ошибка'));
                                                        }
                                                      } catch (err) {
                                                        alert('Не удалось обновить фото. Проверьте консоль для деталей.');
                                                      } finally {
                                                        setUploadingPhotoVoiceId(null);
                                                      }
                                                    }
                                                  }, 'image/png');
                                                };
                                                img.src = photoPreview.url;
                                              } catch (err) {
                                                alert('Не удалось обработать фото');
                                              }
                                            }
                                          }}
                                          style={{
                                            padding: '8px 16px',
                                            background: 'rgba(255, 215, 0, 0.8)',
                                            border: '1px solid rgba(255, 215, 0, 0.6)',
                                            borderRadius: '6px',
                                            color: '#1a1a1a',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                          }}
                                        >
                                          Сохранить
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setPhotoPreview(null);
                                          setEditingVoicePhotoId(null);
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          background: 'rgba(100, 100, 100, 0.8)',
                                          border: '1px solid rgba(100, 100, 100, 0.6)',
                                          borderRadius: '6px',
                                          color: 'white',
                                          cursor: 'pointer',
                                          fontSize: '14px'
                                        }}
                                      >
                                        Отмена
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                                    <div
                                      style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid rgba(139, 92, 246, 0.6)',
                                        position: 'relative',
                                        margin: '0 auto'
                                      }}
                                    >
                                      <img
                                        src={photoPath}
                                        alt={editingVoice.name}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                          objectPosition: 'center'
                                        }}
                                      />
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg,image/webp"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            setPhotoPreview({
                                              url: event.target?.result as string,
                                              x: 0,
                                              y: 0,
                                              voiceId: String(editingVoice.id || editingVoice.user_voice_id)
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      style={{ display: 'none' }}
                                      id={`photo-input-create-${editingVoice.id || editingVoice.user_voice_id}`}
                                    />
                                    <label
                                      htmlFor={`photo-input-create-${editingVoice.id || editingVoice.user_voice_id}`}
                                      style={{
                                        padding: '8px 16px',
                                        background: 'rgba(139, 92, 246, 0.8)',
                                        border: '1px solid rgba(139, 92, 246, 0.6)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                      }}
                                    >
                                      Изменить фото
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                        return createPortal(modalContent, document.body);
                      })()}
                    </FormField>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
                      <motion.button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(40, 40, 50, 0.4)',
                          border: '1px solid rgba(100, 100, 110, 0.3)',
                          borderRadius: '8px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        ← Назад
                      </motion.button>
                      <ContinueButton
                        type="submit"
                        disabled={isLoading ||
                          (formData.name || '').trim().length < 2 ||
                          (formData.personality || '').trim().length === 0 ||
                          (formData.situation || '').trim().length === 0 ||
                          (formData.instructions || '').trim().length === 0}
                        style={{ width: 'auto', minWidth: '140px', padding: '8px 16px', fontSize: '13px' }}
                      >
                        {isLoading
                          ? (isCharacterCreated ? 'Обновление...' : 'Создание...')
                          : (isCharacterCreated ? 'Сохранить' : 'Создать персонажа')}
                      </ContinueButton>
                    </div>
                  </WizardStep>
                )}

                {currentStep === 4 && createdCharacterData && (
                  <WizardStep
                    key="step4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <StepTitle>Шаг 4: Генерация фото</StepTitle>
                    <StepDescription>
                      Создайте 3 фото для персонажа которые будут на главной странице
                    </StepDescription>

                    {/* 1. Настройки: Модель */}
                    <FormField>
                      <FormLabel htmlFor="model-selection" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiSettings size={14} /> Выберите стиль
                      </FormLabel>
                      <ModelSelectionContainer>
                        <ModelCard
                          $isSelected={selectedModel === 'anime-realism'}
                          $previewImage="/анимереализм.jpg"
                          onClick={() => setSelectedModel('anime-realism')}
                        >
                          <ModelInfoOverlay>
                            <ModelName>Аниме + Реализм</ModelName>
                            <ModelDescription>Сбалансированный стиль</ModelDescription>
                          </ModelInfoOverlay>
                        </ModelCard>

                        <ModelCard
                          $isSelected={selectedModel === 'anime'}
                          $previewImage="/аниме.png"
                          onClick={() => setSelectedModel('anime')}
                        >
                          <ModelInfoOverlay>
                            <ModelName>Аниме</ModelName>
                            <ModelDescription>Классический 2D стиль</ModelDescription>
                          </ModelInfoOverlay>
                        </ModelCard>
                      </ModelSelectionContainer>
                    </FormField>

                    {/* 2. Настройки: Промпт */}
                    <FormField>
                      <FormLabel htmlFor="photo-prompt-unified" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} /> Описание (Промпт)
                      </FormLabel>
                      <ModernTextarea
                        id="photo-prompt-unified"
                        value={customPrompt}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setCustomPrompt(newValue);
                          customPromptRef.current = newValue;
                          setCustomPromptManuallySet(true);
                        }}
                        placeholder="Например: девушка-самурай в неоновом городе, киберпанк стиль, дождь, высокая детализация..."
                        rows={4}
                      />

                      {/* Теги-помощники */}
                      <div className="relative">
                        <TagsContainer $isExpanded={isPhotoPromptTagsExpanded}>
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
                            { label: 'Элегантный образ', value: 'элегантная поза, утонченный стиль, изысканность' },
                            { label: 'Портрет крупным планом', value: 'крупный план лица, выразительный взгляд, детализированные черты' },
                            { label: 'В парке', value: 'в городском парке, зеленая трава, солнечный свет' },
                            { label: 'В кафе', value: 'в уютном кафе, теплая атмосфера, приятная обстановка' },
                            { label: 'На природе', value: 'на природе, свежий воздух, красивые пейзажи' },
                            { label: 'Вечерний наряд', value: 'в красивом вечернем наряде, элегантный стиль' },
                            { label: 'Повседневный образ', value: 'в повседневной одежде, комфортный стиль' },
                            { label: 'Спортивный стиль', value: 'в спортивной одежде, активный образ жизни' },
                            { label: 'Романтичная атмосфера', value: 'романтичная обстановка, мягкое освещение, уют' }
                          ].map((tag, idx) => (
                            <TagButton
                              key={idx}
                              type="button"
                              $category="neutral"
                              onClick={(e) => {
                                e.preventDefault();
                                const separator = customPrompt.length > 0 && !customPrompt.endsWith(', ') && !customPrompt.endsWith(',') ? ', ' : '';
                                const newValue = customPrompt + separator + tag.value;
                                setCustomPrompt(newValue);
                                customPromptRef.current = newValue;
                                setCustomPromptManuallySet(true);
                              }}
                            >
                              <Plus size={8} /> {tag.label}
                            </TagButton>
                          ))}
                        </TagsContainer>
                        <ExpandButton
                          $isExpanded={isPhotoPromptTagsExpanded}
                          onClick={() => setIsPhotoPromptTagsExpanded(!isPhotoPromptTagsExpanded)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isPhotoPromptTagsExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                          </svg>
                        </ExpandButton>
                      </div>
                    </FormField>

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

                      <GenerateButtonContainer>
                        <GenerateButton
                          type="button"
                          onClick={() => {
                            generatePhoto();
                            setShowGenerateTooltip(true);
                            setTimeout(() => setShowGenerateTooltip(false), 4000);
                          }}
                          disabled={(() => {
                            if (!userInfo || !createdCharacterData) return true;
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
                              const hasGeneratedPhotos = generatedPhotos && generatedPhotos.length > 0;
                              const modelDisplayNames = {
                                'anime-realism': 'Аниме + Реализм',
                                'anime': 'Аниме',
                                'realism': 'Реализм'
                              };
                              const currentModelName = modelDisplayNames[selectedModel] || selectedModel;
                              let buttonText = hasGeneratedPhotos ? `Сгенерировать(${currentModelName})` : `Сгенерировать фото (${currentModelName})`;

                              if (!userInfo) {
                                return buttonText;
                              }

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

                              if (activeGenerations > 0) {
                                return `${buttonText} ${activeGenerations}/${queueLimit}`;
                              }

                              return buttonText;
                            })()}
                          </span>
                        </GenerateButton>
                        <GenerateTooltip $isVisible={showGenerateTooltip}>
                          Наведитесь на готовое фото и нажмите "Добавить"
                        </GenerateTooltip>
                      </GenerateButtonContainer>

                      {/* Предупреждение о времени (серое) */}
                      <WarningText>
                        <FiClock size={12} />
                        Первая генерация может занять до 1 минуты
                      </WarningText>

                      {/* Детальный прогресс-бар */}
                      {isGeneratingPhoto && (
                        <ProgressBarContainer>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-zinc-400">Процесс создания...</span>
                            <span className="text-xs text-[#8b5cf6] font-medium">{Math.round(generationProgress || 0)}%</span>
                          </div>
                          <GenerationProgressBar $progress={generationProgress || 0}>
                            <GenerationProgressFill $progress={generationProgress || 0} />
                          </GenerationProgressBar>

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
                            <GenerationQueueContainer>
                              <QueueLabel>ОЧЕРЕДЬ ГЕНЕРАЦИИ</QueueLabel>
                              <GenerationQueueIndicator>
                                <QueueProgressBar
                                  $filled={activeGenerations}
                                  $total={queueLimit}
                                />
                              </GenerationQueueIndicator>
                              <QueueCounter>
                                Queue: {activeGenerations}/{queueLimit}
                              </QueueCounter>
                            </GenerationQueueContainer>
                          );
                        }
                        return null;
                      })()}
                    </GenerationArea>

                    {/* Сгенерированные фото */}
                    {generatedPhotos && Array.isArray(generatedPhotos) && generatedPhotos.length > 0 && (
                      <div className="mt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-zinc-200">
                            Сгенерированные фото ({generatedPhotos.length})
                          </h3>
                          <div className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-400">
                            {selectedPhotos?.length || 0} из 3
                          </div>
                        </div>

                        <PhotoList>
                          {generatedPhotos.map((photo, index) => {
                            if (!photo || !photo.url) return null;
                            const isSelected = selectedPhotos.some(p => p.id === photo.id || p.url === photo.url);

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
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <GenerationTimer>
                                  ⏱ {photo.generationTime !== undefined && photo.generationTime !== null && photo.generationTime > 0
                                    ? (photo.generationTime < 60
                                      ? `${Math.round(photo.generationTime)}с`
                                      : `${Math.round(photo.generationTime / 60)}м ${Math.round(photo.generationTime % 60)}с`)
                                    : '—'}
                                </GenerationTimer>
                                <PhotoOverlay
                                  data-overlay-action
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhotoOverlayButton
                                    type="button"
                                    $variant={isSelected ? 'remove' : 'add'}
                                    disabled={!isSelected && isLimitReached}
                                    onPointerDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const idOrUrl = photo?.id || photo?.url;
                                      if (!idOrUrl) return;
                                      if (!isSelected && isLimitReached) return;
                                      togglePhotoSelection(idOrUrl);
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    {isSelected ? 'Убрать' : <><Plus size={12} /> Добавить</>}
                                  </PhotoOverlayButton>
                                </PhotoOverlay>
                              </PhotoTile>
                            );
                          }).filter(Boolean)}
                        </PhotoList>

                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                      <motion.button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        style={{
                          padding: '12px 24px',
                          background: 'rgba(40, 40, 50, 0.4)',
                          border: '1px solid rgba(100, 100, 110, 0.3)',
                          borderRadius: '12px',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ← Назад
                      </motion.button>
                    </div>
                  </WizardStep>
                )}
              </AnimatePresence>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#ef4444', fontSize: '14px', marginTop: '16px' }}
                >
                  {error}
                </motion.div>
              )}
              {success && success !== 'Фото успешно обновлено!' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', color: '#22c55e', fontSize: '14px', marginTop: '16px' }}
                >
                  {success}
                </motion.div>
              )}
            </LeftColumn>

            {/* Правая колонка - Live Preview (40%) */}
            <RightColumn>
              <LivePreviewCard
                animate={{
                  scale: formData.name ? [1, 1.02, 1] : 1,
                }}
                transition={{
                  duration: 0.5,
                  repeat: formData.name ? Infinity : 0,
                  repeatDelay: 1
                }}
              >
                <PreviewImage>
                  {(() => {
                    // Собираем все доступные фото: сначала выбранные, потом из createdCharacterData, потом сгенерированные
                    const allPhotos: Array<{ url: string; id?: string }> = [];

                    // Добавляем выбранные фото
                    if (selectedPhotos.length > 0) {
                      allPhotos.push(...selectedPhotos);
                    }

                    // Добавляем фото из createdCharacterData (если они еще не в selectedPhotos)
                    if (createdCharacterData?.photos && Array.isArray(createdCharacterData.photos)) {
                      createdCharacterData.photos.forEach((photo: any) => {
                        if (photo?.url && !allPhotos.some(p => p.url === photo.url)) {
                          allPhotos.push({ url: photo.url, id: photo.id });
                        }
                      });
                    }

                    // Добавляем сгенерированные фото (если они еще не добавлены)
                    if (generatedPhotos.length > 0) {
                      generatedPhotos.forEach((photo: any) => {
                        if (photo?.url && !allPhotos.some(p => p.url === photo.url)) {
                          allPhotos.push({ url: photo.url, id: photo.id });
                        }
                      });
                    }

                    // Если есть фото, показываем слайдер
                    if (allPhotos.length > 0) {
                      const currentPhoto = allPhotos[previewPhotoIndex % allPhotos.length];

                      return (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <img
                            src={currentPhoto.url}
                            alt={formData.name || 'Character preview'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '16px',
                              transition: 'opacity 0.3s ease'
                            }}
                          />
                          {allPhotos.length > 1 && (
                            <>
                              <div style={{
                                position: 'absolute',
                                bottom: '12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: '6px',
                                zIndex: 10
                              }}>
                                {allPhotos.map((_, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setPreviewPhotoIndex(idx)}
                                    style={{
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: idx === (previewPhotoIndex % allPhotos.length)
                                        ? 'rgba(255, 255, 255, 0.9)'
                                        : 'rgba(255, 255, 255, 0.4)',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                  />
                                ))}
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0, 0, 0, 0.5)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  zIndex: 10,
                                  color: 'white',
                                  fontSize: '18px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPhotoIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length);
                                }}
                              >
                                ←
                              </div>
                              <div
                                style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0, 0, 0, 0.5)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  zIndex: 10,
                                  color: 'white',
                                  fontSize: '18px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPhotoIndex(prev => (prev + 1) % allPhotos.length);
                                }}
                              >
                                →
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }

                    // Если нет фото, проверяем, показывать ли placeholder
                    const hasSelectedPhotos = selectedPhotos.length > 0;
                    const hasCreatedPhotos = createdCharacterData?.photos && createdCharacterData.photos.length > 0;
                    const hasGeneratedPhotos = generatedPhotos.length > 0;
                    const hasAnyPhotos = hasSelectedPhotos || hasCreatedPhotos || hasGeneratedPhotos;

                    if (!hasAnyPhotos && (formData.appearance || formData.name)) {
                      return (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(139, 92, 246, 0.4)',
                          fontSize: '48px'
                        }}>
                          <Sparkles size={48} />
                        </div>
                      );
                    }

                    if (!hasAnyPhotos) {
                      return (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'rgba(160, 160, 170, 0.3)',
                          fontSize: '14px',
                          fontFamily: 'Inter, sans-serif'
                        }}>
                          Превью появится здесь
                        </div>
                      );
                    }

                    return null;
                  })()}
                </PreviewImage>
                <PreviewName>
                  {formData.name || 'Имя персонажа'}
                </PreviewName>
                {(formData.personality || formData.situation) && (
                  <PreviewTags>
                    {formData.personality && PERSONALITY_PROMPTS
                      .filter(tag => formData.personality.includes(tag.value.substring(0, 20)))
                      .slice(0, 3)
                      .map((tag, idx) => (
                        <PreviewTag key={idx} $category={getTagCategory(tag.label)}>
                          {tag.label}
                        </PreviewTag>
                      ))}
                  </PreviewTags>
                )}
              </LivePreviewCard>

              {(availableTags.length > 0 || isAdmin || userInfo?.is_admin) && (
                <div style={{ marginTop: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 400 }}>
                  {(isAdmin || userInfo?.is_admin) && (
                    <AdminAddTagRow>
                      <AdminAddTagInput
                        value={newTagName}
                        onChange={(e) => { setNewTagName(e.target.value); setAddTagError(null); }}
                        placeholder="Новый тег"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      />
                      <AdminAddTagButton
                        type="button"
                        onClick={handleAddTag}
                        disabled={!!(addingTag || !newTagName.trim())}
                      >
                        {addingTag ? '...' : 'Добавить тег'}
                      </AdminAddTagButton>
                      {addTagError != null && addTagError !== '' && (
                        <span style={{ color: 'rgba(239,68,68,0.95)', fontSize: 12 }}>{addTagError}</span>
                      )}
                    </AdminAddTagRow>
                  )}
                  {availableTags.length > 0 && (
                    <CharacterTagsUnderPhoto style={{ marginTop: 0 }}>
                      {availableTags.map((tagName) => {
                        const isSelected = selectedTags.includes(tagName);
                        return (
                          <CharacterTagChip
                            key={tagName}
                            type="button"
                            $selected={isSelected}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedTags(prev => {
                                const newTags = prev.includes(tagName)
                                  ? prev.filter((t) => t !== tagName)
                                  : [...prev, tagName];
                                // Сохраняем теги в localStorage сразу при изменении
                                try {
                                  const savedFormData = localStorage.getItem('createCharacterFormData');
                                  const formData = savedFormData ? JSON.parse(savedFormData) : {};
                                  formData.selectedTags = newTags;
                                  localStorage.setItem('createCharacterFormData', JSON.stringify(formData));
                                } catch (error) {
                                  console.error('Ошибка сохранения тегов в localStorage:', error);
                                }
                                return newTags;
                              });
                            }}
                          >
                            {tagName}
                          </CharacterTagChip>
                        );
                      })}
                    </CharacterTagsUnderPhoto>
                  )}
                </div>
              )}

              {/* Кнопка "Продолжить" - появляется под карточкой справа после генерации первого фото */}
              {generatedPhotos && generatedPhotos.length > 0 && createdCharacterData && (
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <ContinueButton
                    type="button"
                    onClick={() => {
                      if (!createdCharacterData) return;

                      // Определяем тип подписки
                      const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userInfo?.subscription?.type;
                      let subscriptionType = 'free';
                      if (rawSubscriptionType) {
                        subscriptionType = typeof rawSubscriptionType === 'string'
                          ? rawSubscriptionType.toLowerCase().trim()
                          : String(rawSubscriptionType).toLowerCase().trim();
                      }

                      // Если подписка Standard или Premium - открываем создание альбома
                      if (subscriptionType === 'standard' || subscriptionType === 'premium') {
                        if (onOpenPaidAlbumBuilder) {
                          onOpenPaidAlbumBuilder(createdCharacterData);
                        }
                      } else {
                        // Иначе открываем чат
                        if (onOpenChat) {
                          onOpenChat(createdCharacterData);
                        }
                      }
                    }}
                  >
                    Продолжить
                  </ContinueButton>
                </div>
              )}
            </RightColumn>
          </form>
        </MainContent>
      </MainContainer >

      {/* Модальное окно Clone Your Voice */}
      <AnimatePresence>
        {
          isVoiceCloneModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <VoiceCloneModalOverlay onClick={() => setIsVoiceCloneModalOpen(false)}>
                <VoiceCloneModal onClick={(e) => e.stopPropagation()}>
                  <VoiceCloneModalHeader>
                    <VoiceCloneModalTitle>Создать свой голос</VoiceCloneModalTitle>
                    <VoiceCloneModalCloseButton onClick={() => setIsVoiceCloneModalOpen(false)}>
                      <X size={20} />
                    </VoiceCloneModalCloseButton>
                  </VoiceCloneModalHeader>

                  <VoiceCloneInstructions>
                    <VoiceCloneInstructionsTitle>Инструкции:</VoiceCloneInstructionsTitle>
                    <VoiceCloneInstructionItem>
                      <span>•</span>
                      <span>Загрузите 15-30 секунд чистой речи</span>
                    </VoiceCloneInstructionItem>
                    <VoiceCloneInstructionItem>
                      <span>•</span>
                      <span>Без фонового шума или музыки</span>
                    </VoiceCloneInstructionItem>
                    <VoiceCloneInstructionItem>
                      <span>•</span>
                      <span>Монотонная или выразительная речь в зависимости от желаемого результата</span>
                    </VoiceCloneInstructionItem>
                  </VoiceCloneInstructions>

                  <VoiceCloneUploadZone
                    $hasFile={!!voiceFile}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('audio/')) {
                        handleVoiceFileSelect(file);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'audio/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleVoiceFileSelect(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <VoiceCloneUploadContent>
                      {voiceFile ? (
                        <>
                          <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 12px' }} />
                          <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>
                            {voiceFile.name}
                          </div>
                          {voiceDuration !== null && (
                            <div style={{ color: '#a1a1aa', fontSize: '12px' }}>
                              Длительность: {voiceDuration.toFixed(1)}с
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload size={48} color="rgba(139, 92, 246, 0.8)" style={{ margin: '0 auto 12px' }} />
                          <div style={{ color: '#e4e4e7', fontWeight: 500, marginBottom: '4px' }}>
                            Перетащите аудио файл сюда или нажмите для выбора
                          </div>
                          <div style={{ color: '#a1a1aa', fontSize: '12px' }}>
                            Поддерживаются MP3, WAV и другие аудио форматы
                          </div>
                        </>
                      )}
                    </VoiceCloneUploadContent>
                  </VoiceCloneUploadZone>

                  {voiceDuration !== null && (
                    <>
                      <VoiceCloneProgressBar>
                        <VoiceCloneProgressFill
                          $progress={Math.min((voiceDuration / 10) * 100, 100)}
                          $isValid={voiceDuration >= 10}
                        />
                      </VoiceCloneProgressBar>

                      <VoiceCloneStatusMessage $isValid={voiceDuration >= 10}>
                        {voiceDuration >= 10 ? (
                          <>
                            <CheckCircle size={16} />
                            <span>Длительность аудио: {voiceDuration.toFixed(1)}с (минимум 10с требуется)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} />
                            <span>Аудио слишком короткое (мин 10с). Текущее: {voiceDuration.toFixed(1)}с</span>
                          </>
                        )}
                      </VoiceCloneStatusMessage>
                    </>
                  )}

                  {voiceError && voiceDuration === null && (
                    <VoiceCloneStatusMessage $isValid={false}>
                      <AlertCircle size={16} />
                      <span>{voiceError}</span>
                    </VoiceCloneStatusMessage>
                  )}

                  <VoiceCloneSubmitButton
                    $isDisabled={!voiceFile || !voiceDuration || voiceDuration < 10 || isUploadingVoice}
                    onClick={async () => {
                      if (!voiceFile || !voiceDuration || voiceDuration < 10 || isUploadingVoice) return;

                      setIsUploadingVoice(true);
                      setVoiceError(null);

                      try {
                        const formData = new FormData();
                        formData.append('voice_file', voiceFile);

                        const token = localStorage.getItem('authToken');
                        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/upload-voice`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          body: formData
                        });

                        if (response.ok) {
                          const result = await response.json();
                          const newVoiceId = `user_voice_${result.voice_id}`;

                          // Перезагружаем список голосов
                          const voicesResponse = await fetch('/api/v1/characters/available-voices', {
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          if (voicesResponse.ok) {
                            const voicesData = await voicesResponse.json();
                            setAvailableVoices(voicesData);

                            // Автоматически открываем пользовательские голоса и выбираем добавленный голос
                            setShowUserVoices(true);

                            // Находим и выбираем добавленный голос
                            const addedVoice = voicesData.find((v: any) => v.id === newVoiceId || v.user_voice_id === result.voice_id);
                            if (addedVoice) {
                              const isUserVoice = addedVoice.is_user_voice || false;
                              if (isUserVoice) {
                                setSelectedVoiceUrl(addedVoice.url);
                                setSelectedVoiceId(addedVoice.id || newVoiceId);
                                setVoiceSelectionTime(prev => ({ ...prev, [addedVoice.url]: Date.now() }));
                              } else {
                                setSelectedVoiceId(addedVoice.id);
                                setSelectedVoiceUrl(null);
                                setVoiceSelectionTime(prev => ({ ...prev, [addedVoice.id]: Date.now() }));
                              }
                            } else {
                              setSelectedVoiceUrl(result.voice_url);
                              setSelectedVoiceId(newVoiceId);
                              setVoiceSelectionTime(prev => ({ ...prev, [result.voice_url]: Date.now() }));
                            }
                          }

                          // Закрываем модальное окно и сбрасываем состояние
                          setIsVoiceCloneModalOpen(false);
                          setVoiceFile(null);
                          setVoiceDuration(null);
                          setVoiceError(null);
                        } else {
                          const error = await response.json();
                          setVoiceError('Ошибка загрузки голоса: ' + (error.detail || 'Неизвестная ошибка'));
                        }
                      } catch (err) {
                        setVoiceError('Не удалось загрузить голос. Проверьте консоль для деталей.');
                      } finally {
                        setIsUploadingVoice(false);
                      }
                    }}
                  >
                    {isUploadingVoice ? (
                      <>
                        <div style={{ width: '20px', height: '20px', border: '3px solid rgba(139, 92, 246, 0.2)', borderTop: '3px solid rgba(139, 92, 246, 0.9)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span>Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Клонировать голос</span>
                      </>
                    )}
                  </VoiceCloneSubmitButton>
                </VoiceCloneModal>
              </VoiceCloneModalOverlay>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Модальное окно: премиальный голос (Мита) только для PREMIUM */}
      {
        showPremiumModal && (
          <PremiumModalOverlay onClick={() => { setShowPremiumModal(false); setPremiumVoiceForModal(null); }}>
            <PremiumModalContent onClick={(e) => e.stopPropagation()}>
              <PremiumModalTitle>Голос только для Premium</PremiumModalTitle>
              <PremiumModalText>
                Оформите подписку PREMIUM, чтобы использовать премиальные голоса, или выберите другой голос.
              </PremiumModalText>
              <PremiumModalButtons>
                <PremiumModalButton
                  $primary
                  onClick={() => {
                    setShowPremiumModal(false);
                    setPremiumVoiceForModal(null);
                    if (onShop) onShop();
                    else window.location.href = '/shop';
                  }}
                >
                  Оформить Premium
                </PremiumModalButton>
                <PremiumModalButton onClick={() => { setShowPremiumModal(false); setPremiumVoiceForModal(null); }}>
                  Закрыть
                </PremiumModalButton>
              </PremiumModalButtons>
            </PremiumModalContent>
          </PremiumModalOverlay>
        )
      }

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
    </>
  );
};