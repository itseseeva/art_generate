import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { AuthModal } from './AuthModal';
import { translateToEnglish } from '../utils/translate';
import { API_CONFIG } from '../config/api';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CircularProgress } from './ui/CircularProgress';
import { FiX as CloseIcon } from 'react-icons/fi';
import { fetchPromptByImage } from '../utils/prompt';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
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



const MainContent = styled.div`
  flex: 1;
  display: flex;
  height: calc(100vh - 80px);
  maxHeight: calc(100vh - 80px);
  overflow: hidden;
  padding: ${theme.spacing.lg};
  gap: ${theme.spacing.lg};
  visibility: visible;
  opacity: 1;
  width: 100%;
  box-sizing: border-box;
`;

const LeftColumn = styled.div`
  flex: 1;
  display: flex;
  flexDirection: column;
  minWidth: 300px;
  height: 100%;
  maxHeight: 100%;
  visibility: visible;
  opacity: 1;
  padding: ${theme.spacing.lg};
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border: 2px solid rgba(60, 60, 60, 0.9);
  borderRadius: ${theme.borderRadius.xl};
  overflow: hidden;
  boxSizing: border-box;
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
`;

const Form = styled.form`
  display: flex;
  flex: 1;
  width: 100%;
  gap: ${theme.spacing.lg};
  min-height: 0;
  visibility: visible;
  opacity: 1;
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

// ВАРИАНТ 5: Glassmorphism с градиентной рамкой (активен)
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

const ContinueButton = styled(motion.button)`
  position: relative;
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.9), rgba(251, 191, 36, 0.9));
  border: 1px solid rgba(251, 191, 36, 0.6);
  color: #1a1a1a;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.4), 0 4px 12px rgba(0, 0, 0, 0.4);
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
`;

const OverlayActions = styled.div`
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
  width: 100%;
  padding: ${theme.spacing.sm} 0;
`;

const OverlayButton = styled.button<{ $variant: 'primary' | 'danger' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'rgba(59, 130, 246, 0.9)'
      : 'rgba(239, 68, 68, 0.9)'};
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  min-width: 80px;

  &:hover:not(:disabled) {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'rgba(59, 130, 246, 1)'
        : 'rgba(239, 68, 68, 1)'};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SliderDescription = styled.div`
  margin-top: ${theme.spacing.lg};
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
  background: rgba(0, 0, 0, 0.95);
  display: flex !important;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: ${theme.spacing.xl};
  backdrop-filter: blur(8px);
  cursor: pointer;
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const PhotoModalContent = styled.div`
  position: relative;
  max-width: 95vw;
  max-height: 95vh;
  display: flex !important;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xl};
  cursor: default;
  flex-wrap: wrap;
`;

const ModalImageContainer = styled.div`
  flex: 1;
  min-width: 300px;
  max-width: 60%;
  display: flex;
  align-items: center;
  justify-content: center;
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
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: ${theme.borderRadius.xl};
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.8);
  display: block !important;
  visibility: visible !important;
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
    border-color: ${theme.colors.accent?.primary || 'rgba(255, 255, 255, 0.5)'};
    transform: scale(1.1);
  }
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const PhotosContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px; /* Фиксированная высота чтобы столбец не менял размеры */
`;

const SwiperContainer = styled.div`
  position: relative;
  overflow: hidden;
  height: 100%;
`;

const SwiperWrapper = styled.div<{ translateX: number }>`
  display: flex;
  transition: transform 0.3s ease;
  transform: translateX(${props => props.translateX}px);
  height: 100%;
`;

const SwiperSlide = styled.div`
  min-width: 200px;
  margin-right: ${theme.spacing.md};
  height: 100%;
  
  &:last-child {
    margin-right: 0;
  }
`;

const SwiperButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction === 'left' ? 'left: -20px' : 'right: -20px'};
  transform: translateY(-50%);
  background: rgba(150, 150, 150, 0.8);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.lg};
  z-index: 10;
  
  &:hover {
    background: rgba(150, 150, 150, 1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

interface CreateCharacterPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onMyCharacters?: () => void;
  onPhotoGeneration?: (character: any) => void;
  onOpenPaidAlbumBuilder?: (character: any) => void;
  onOpenChat?: (character: any) => void;
  contentMode?: 'safe' | 'nsfw';
  isAuthenticated?: boolean;
  userInfo?: {username: string, coins: number, id?: number, subscription?: {subscription_type?: string}} | null;
}

const MAX_MAIN_PHOTOS = 3;

export const CreateCharacterPage: React.FC<CreateCharacterPageProps> = ({
  onBackToMain,
  onShop,
  onMyCharacters,
  onPhotoGeneration,
  onOpenPaidAlbumBuilder,
  onOpenChat,
  contentMode = 'safe',
  isAuthenticated: propIsAuthenticated,
  userInfo: propUserInfo
}) => {
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated ?? false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number, subscription?: {subscription_type?: string}} | null>(propUserInfo ?? null);
  const [isPhotoGenerationExpanded, setIsPhotoGenerationExpanded] = useState(false);
  
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
  const [largeTextInput, setLargeTextInput] = useState('');
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [isCharacterCreated, setIsCharacterCreated] = useState(false); // Новое состояние
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null); // Для модального окна просмотра фото
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [swiperTranslateX, setSwiperTranslateX] = useState(0); // Для swiper
  const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]); // Выбранные фото для карточки
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [fakeProgress, setFakeProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<number | undefined>(undefined);
  const fakeProgressIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationQueueRef = React.useRef<number>(0); // Счетчик задач в очереди
  
  // Пошаговая логика - какие поля показывать
  const [showPersonality, setShowPersonality] = useState(false);
  const [showSituation, setShowSituation] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  
  // Индекс для слайдера сгенерированных фото
  const [examplePhotoIndex, setExamplePhotoIndex] = useState(0);

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
      console.log('Auth token:', token ? 'exists' : 'not found');
      
      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);
        console.log('No token, setting isAuthenticated to false');
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Auth response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('User data:', userData);
        console.log('User subscription:', userData.subscription);
        console.log('User subscription_type:', userData.subscription?.subscription_type);
        setIsAuthenticated(true);
        setUserInfo(userData);
        console.log('Authentication successful, isAuthenticated set to true');
      } else if (response.status === 401) {
        // Только при 401 пытаемся обновить токен
        console.log('Auth failed with 401, attempting token refresh');
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
              localStorage.setItem('authToken', tokenData.access_token);
              if (tokenData.refresh_token) {
                localStorage.setItem('refreshToken', tokenData.refresh_token);
              }
              // Повторяем проверку с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {
            console.error('Ошибка обновления токена:', refreshError);
          }
        }
        // Если refresh не удался, удаляем токены
        console.log('Token refresh failed, removing tokens');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUserInfo(null);
      } else {
        // Для других ошибок не удаляем токены
        console.warn('Auth check failed with status:', response.status, '- keeping tokens');
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      console.log('[CREATE_CHAR] Инициализация страницы...');
      
      // Если авторизация уже передана из пропсов, пропускаем проверку
      if (propIsAuthenticated !== undefined) {
        console.log('[CREATE_CHAR] Используется авторизация из пропсов, пропускаем checkAuth');
        setAuthCheckComplete(true);
      } else {
        // Иначе делаем свою проверку (для обратной совместимости)
        try {
          await checkAuth();
          console.log('[CREATE_CHAR] checkAuth завершён');
        } catch (error) {
          console.error('[CREATE_CHAR] Ошибка checkAuth:', error);
          setAuthCheckComplete(true);
        }
      }
      
      try {
        await loadGenerationSettings();
        console.log('[CREATE_CHAR] Инициализация завершена');
      } catch (error) {
        console.error('[CREATE_CHAR] Ошибка loadGenerationSettings:', error);
      }
    };
    
    initPage();

    return () => {
      if (fakeProgressIntervalRef.current) {
        clearInterval(fakeProgressIntervalRef.current);
        fakeProgressIntervalRef.current = null;
      }
      if (fakeProgressTimeoutRef.current) {
        clearTimeout(fakeProgressTimeoutRef.current);
        fakeProgressTimeoutRef.current = null;
      }
    };
  }, []);

  // Показываем модалку ТОЛЬКО один раз после проверки
  // Если авторизация передана из пропсов и пользователь не авторизован - показываем модалку сразу
  useEffect(() => {
    if (propIsAuthenticated !== undefined) {
      // Используем авторизацию из пропсов
      if (!propIsAuthenticated && !isAuthModalOpen) {
        setIsAuthModalOpen(true);
        setAuthMode('login');
      }
    } else if (authCheckComplete && !isAuthenticated && !isAuthModalOpen) {
      // Используем локальную проверку авторизации
      setIsAuthModalOpen(true);
      setAuthMode('login');
    }
  }, [authCheckComplete, propIsAuthenticated, isAuthenticated, isAuthModalOpen]);

  // Загружаем настройки генерации из API
  const loadGenerationSettings = async () => {
    try {
      console.log('[CREATE_CHAR] Загружаем настройки генерации...');
      const response = await fetch('/api/v1/fallback-settings/');
      console.log('[CREATE_CHAR] Response status:', response.status);
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        console.log('[CREATE_CHAR] Настройки генерации загружены:', settings);
      } else {
        console.error('[CREATE_CHAR] Ошибка загрузки настроек генерации:', response.status);
      }
    } catch (error) {
      console.error('[CREATE_CHAR] Ошибка загрузки настроек генерации:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (formData.name.trim().length >= 2) progress += 20;
    if (formData.personality.trim().length > 0) progress += 20;
    if (formData.situation.trim().length > 0) progress += 20;
    if (formData.instructions.trim().length > 0) progress += 20;
    if (formData.appearance.trim().length > 0 && formData.location.trim().length > 0) progress += 20;
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
    console.log('Form submitted!', formData); // Добавляем отладку
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Необходимо войти в систему для создания персонажей');
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
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        situation: formData.situation.trim(),
        instructions: formData.instructions.trim(),
        style: formData.style?.trim() || null,
        appearance: translatedAppearance,
        location: translatedLocation,
        is_nsfw: contentMode === 'nsfw'
      };

      // Проверяем обязательные поля
      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      console.log('Sending request to API...', requestData); // Добавляем отладку
      // КРИТИЧНО: Используем готовый метод из API_CONFIG для правильного формирования URL
      // Это гарантирует использование домена, а не IP адреса (избегает Mixed Content)
      const apiUrl = API_CONFIG.CHARACTER_CREATE_FULL;
      console.log('[CREATE_CHAR] API URL:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status); // Добавляем отладку
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData); // Добавляем отладку
        throw new Error(errorData.detail || 'Ошибка при создании персонажа');
      }

      const result = await response.json();
      console.log('Character created successfully:', result); // Добавляем отладку
      setCreatedCharacterData(result);
      setIsCharacterCreated(true); // Устанавливаем состояние создания персонажа
      setSuccess('Персонаж успешно создан!');

      // Автоматически заполняем промпт для генерации фото данными о внешности и локации
      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
      if (parts.length > 0) {
        const autoPrompt = parts.join(' | ');
        setCustomPrompt(autoPrompt);
        console.log('[CREATE] Автоматически заполнен промпт для генерации фото:', autoPrompt);
      }

      // Обновляем информацию о пользователе
      await checkAuth();
      
      // Даем время бэкенду сохранить персонажа в БД
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Отправляем событие для обновления персонажей на главной странице
      // Делаем это после задержки, чтобы убедиться, что персонаж сохранен в БД
      console.log('Отправляем событие character-created для обновления главной страницы');
      const event = new CustomEvent('character-created', { 
        detail: { character: result } 
      });
      window.dispatchEvent(event);
      console.log('Событие отправлено. Персонаж должен появиться на главной странице.');
      
      // Остаемся на странице создания - правая часть (генерация фото) уже активна
      // Не переходим на отдельную страницу генерации фото
      
    } catch (err) {
      console.error('Error creating character:', err); // Добавляем отладку
      setError(err instanceof Error ? err.message : 'Ошибка при создании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Editing character...', formData);
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Необходимо войти в систему для редактирования персонажей');
      }

      // Преобразуем данные в формат для редактирования
      const requestData = {
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        situation: formData.situation.trim(),
        instructions: formData.instructions.trim(),
        style: formData.style?.trim() || null,
        appearance: formData.appearance?.trim() || null,
        location: formData.location?.trim() || null
      };

      // Проверяем обязательные поля
      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      console.log('Sending edit request to API...', requestData);
      const response = await fetch(`/api/v1/characters/${createdCharacterData.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Edit response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.detail || 'Ошибка при редактировании персонажа');
      }

      const result = await response.json();
      console.log('Character edited successfully:', result);
      setCreatedCharacterData(result);
      setSuccess('Персонаж успешно обновлен!');

      // Обновляем информацию о пользователе
      await checkAuth();
      
    } catch (err) {
      console.error('Error editing character:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при редактировании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.reload();
  };

  // Генерация фото
  const startFakeProgress = React.useCallback(() => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    setFakeProgress(0);
    
    const duration = 30000;
    const interval = 300;
    const steps = duration / interval;
    const increment = 99 / steps;
    
    let currentProgress = 0;
    fakeProgressIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 99) {
        currentProgress = 99;
      }
      setFakeProgress(Math.min(99, Math.round(currentProgress)));
    }, interval);
  }, []);

  const stopFakeProgress = React.useCallback((immediate: boolean) => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    if (immediate) {
      setFakeProgress(0);
      return;
    }
    setFakeProgress(100);
    fakeProgressTimeoutRef.current = setTimeout(() => {
      setFakeProgress(0);
      fakeProgressTimeoutRef.current = null;
    }, 500);
  }, []);

  const togglePhotoSelection = async (photoId: string) => {
    const targetPhoto = generatedPhotos.find(photo => photo.id === photoId);
    if (!targetPhoto) return;
    
    const alreadySelected = targetPhoto.isSelected;
    
    if (!alreadySelected) {
      if (selectedPhotos.length >= MAX_MAIN_PHOTOS) {
        setError(`Можно выбрать до ${MAX_MAIN_PHOTOS} фото`);
        return;
      }
    }

    setGeneratedPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, isSelected: !alreadySelected }
          : photo
      )
    );
    
    setSelectedPhotos(prev => {
      if (alreadySelected) {
        return prev.filter(p => p.id !== photoId);
      } else {
        return [...prev, { id: targetPhoto.id, url: targetPhoto.url }];
      }
    });
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
    console.log('Saving selected photos:', selectedPhotos);
    console.log('Created character data:', createdCharacterData);
    
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

      const requestData = {
        character_name: createdCharacterData.name,
        photo_ids: selectedPhotos.map(photo => ({
          id: photo.id,
          url: photo.url
        }))
      };
      
      console.log('Sending request to API:', requestData);
      console.log('Selected photos (full):', selectedPhotos);
      console.log('Photo IDs with URLs:', selectedPhotos.map(photo => ({ id: photo.id, url: photo.url })));

      const response = await fetch(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response data:', result);
        setSuccess('Главные фото успешно сохранены!');
        console.log('Main photos saved:', selectedPhotos);
        
        // Отправляем событие для обновления главной страницы
        const event = new CustomEvent('character-photos-updated', { 
          detail: { character: createdCharacterData, photos: selectedPhotos.map(p => p.id) } 
        });
        window.dispatchEvent(event);
        console.log('Событие character-photos-updated отправлено');
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setError(`Ошибка сохранения фото: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('Error saving main photos:', err);
      setError('Ошибка при сохранении фото');
    }
  };

  const openPhotoModal = async (photo: any) => {
    console.log('[MODAL] Opening photo modal for:', photo);
    console.log('[MODAL] Photo URL:', photo.url);
    setSelectedPhotoForView(photo);
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
    console.log('[MODAL] Closing photo modal');
    setSelectedPhotoForView(null);
    setSelectedPrompt(null);
    setPromptError(null);
    setIsLoadingPrompt(false);
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

  const nextSwiperSlide = () => {
    const maxTranslate = -(generatedPhotos.length - 1) * 100; // Процентное смещение
    setSwiperTranslateX(prev => {
      const newTranslate = prev - 100; // Перемещаем на 100% (следующий слайд)
      return Math.max(newTranslate, maxTranslate);
    });
  };

  const prevSwiperSlide = () => {
    setSwiperTranslateX(prev => {
      const newTranslate = prev + 100; // Перемещаем на 100% (предыдущий слайд)
      return Math.min(newTranslate, 0);
    });
  };


  // Функция для генерации одного фото
  const generateSinglePhoto = async (): Promise<{ id: string; url: string } | null> => {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      // Используем кастомный промпт или дефолтный
      let prompt = customPrompt.trim();
      if (!prompt) {
        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
        prompt = parts.length > 0 ? parts.join(' | ') : '';
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
        model: selectedModel,
      user_id: userInfo?.id
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
              
              if (statusData.status === 'generating' && statusData.result?.progress !== undefined) {
                const progress = typeof statusData.result.progress === 'number'
                  ? statusData.result.progress
                  : parseInt(String(statusData.result.progress).replace('%', ''), 10);
                setGenerationProgress(Math.min(99, Math.max(0, progress)));
              }
              
              if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
                imageUrl = statusData.result?.image_url || statusData.result?.cloud_url || statusData.image_url || statusData.cloud_url;
                const filename = statusData.result?.filename || statusData.filename || Date.now().toString();
                imageId = filename.replace('.png', '').replace('.jpg', '');
                break;
              }
              
              if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
                throw new Error(statusData.error || 'Генерация завершилась с ошибкой');
              }
            }
          } catch (statusError) {
            console.error('Error checking status:', statusError);
          }
        }
        
        if (!imageUrl) {
          throw new Error('Превышено время ожидания генерации');
        }
      } else {
        imageUrl = result.cloud_url || result.image_url;
        if (!imageUrl) {
          throw new Error('URL изображения не получен от сервера');
        }
      const filename = result.filename || Date.now().toString();
        imageId = filename.replace('.png', '').replace('.jpg', '');
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
      try {
        if (token) {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: imageUrl,
              character_name: formData.name || null
            })
          });
          
          if (addToGalleryResponse.ok) {
            console.log('[CreateCharacterPage] Фото добавлено в галерею пользователя');
          }
        }
      } catch (galleryError) {
        console.warn('[CreateCharacterPage] Не удалось добавить фото в галерею:', galleryError);
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
      if (typeof rawSubscriptionType === 'string') {
        subscriptionType = rawSubscriptionType.toLowerCase().trim();
      } else {
        subscriptionType = String(rawSubscriptionType).toLowerCase().trim();
      }
    }
    
    const queueLimit = subscriptionType === 'premium' ? 5 : 3;
    
    // Проверяем кредиты (10 монет за одно фото)
    if (!userInfo || userInfo.coins < 10) {
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
    if (isGeneratingPhoto) {
      generationQueueRef.current += 1;
      return;
    }

    // Генерируем одно фото сразу
    setIsGeneratingPhoto(true);
    setError(null);
    setGenerationProgress(undefined);
    startFakeProgress();

    const processGeneration = async () => {
      try {
        const photo = await generateSinglePhoto();
        if (photo) {
          setGeneratedPhotos(prev => [...prev, { ...photo, isSelected: false }]);
              setSuccess('Фото успешно сгенерировано!');
        }
      stopFakeProgress(false);
      setGenerationProgress(100);
      
      // Обновляем информацию о пользователе
      await checkAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
      stopFakeProgress(true);
    } finally {
      setIsGeneratingPhoto(false);
        setGenerationProgress(undefined);
        
        // Если есть задачи в очереди, запускаем следующую
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

  console.log('[CREATE_CHAR] Rendering component, authCheckComplete:', authCheckComplete, 'isAuthenticated:', isAuthenticated);
  
  // Проверка на undefined states/props
  if (!formData) {
    console.error('[CREATE_CHAR] formData is undefined!');
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
    <div className="w-full h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 flex h-[calc(100vh-80px)] overflow-hidden p-6 gap-6">
        <form onSubmit={isCharacterCreated ? handleEditCharacter : handleSubmit} className="flex-1 flex gap-6 h-full">
          {/* Левая колонка - Форма */}
          <div className="flex-1 flex flex-col min-w-[400px] bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-y-auto">
            {/* Индикатор прогресса */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Прогресс заполнения</span>
                <span className="text-sm text-zinc-400">{formProgress}%</span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-yellow-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${formProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-6">
              {/* Имя персонажа - всегда видно */}
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
                {nameError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-400 bg-red-400/10 p-2 rounded"
                  >
                    {nameError}
                  </motion.div>
                )}
              </div>
              
              {/* Личность и характер - появляется после ввода имени */}
              <AnimatePresence>
                {showPersonality && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <label htmlFor="personality" className="block text-sm font-medium text-zinc-200 mb-2">
                      Личность и характер
                    </label>
                    <textarea
                  id="personality"
                  name="personality"
                  value={formData.personality}
                  onChange={handleInputChange}
                      placeholder="Опишите характер персонажа: какие у него черты личности? Например: она строгая и целеустремленная, но в то же время добрая к близким..."
                  rows={4}
                  required
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Опишите основные черты характера, что мотивирует персонажа, его ценности и принципы.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Ролевая ситуация - появляется после заполнения личности */}
              <AnimatePresence>
                {showSituation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <label htmlFor="situation" className="block text-sm font-medium text-zinc-200 mb-2">
                      Ролевая ситуация
                    </label>
                    <textarea
                  id="situation"
                  name="situation"
                  value={formData.situation}
                  onChange={handleInputChange}
                      placeholder="Опишите ситуацию, в которой находится персонаж. Где он живет? Что происходит в его мире?"
                  rows={3}
                  required
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Где он живет? Что происходит в его мире? Опишите окружение и повседневную жизнь.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Инструкции для персонажа - появляется после заполнения ситуации */}
              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <label htmlFor="instructions" className="block text-sm font-medium text-zinc-200 mb-2">
                      Инструкции для персонажа
                    </label>
                    <textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                      placeholder="Как должен вести себя персонаж в разговоре? Какие правила соблюдать?"
                  rows={4}
                  required
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Опишите стиль общения, манеру речи, как персонаж реагирует на разные ситуации.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Внешность - появляется после заполнения инструкций */}
              <AnimatePresence>
                {showAppearance && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <label htmlFor="appearance" className="block text-sm font-medium text-zinc-200 mb-2">
                      Внешность (для фото)
                    </label>
                    <textarea
                  id="appearance"
                  name="appearance"
                  value={formData.appearance}
                  onChange={handleInputChange}
                        placeholder="Опишите внешность персонажа для генерации фото: цвет волос, цвет глаз, рост, телосложение, стиль одежды..."
                  rows={3}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Опишите детали лица, одежду и позу. Чем подробнее описание, тем точнее будет результат.</p>
                    </motion.div>
                )}
              </AnimatePresence>
              
              {/* Локация - появляется после заполнения внешности */}
              <AnimatePresence>
                {showLocation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <label htmlFor="location" className="block text-sm font-medium text-zinc-200 mb-2">
                      Локация (для фото)
                    </label>
                    <textarea
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                        placeholder="Опишите локацию для генерации фото: где находится персонаж?"
                  rows={3}
                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                      />
                      <p className="mt-1 text-xs text-zinc-500">Где находится персонаж? Опишите атмосферу, освещение, детали окружения.</p>
                    </motion.div>
                )}
              </AnimatePresence>

              {userInfo && (
                <div className="text-sm text-zinc-400">
                  Ваши монеты: <span className="text-zinc-200 font-medium">{userInfo.coins}</span>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={onBackToMain} 
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (isCharacterCreated ? 'Обновление...' : 'Создание...') : (isCharacterCreated ? 'Редактировать' : 'Создать персонажа')}
                </button>
              </div>
            </div>
          </div>

          {/* Правая колонка - Генерация фото */}
          <div className="flex-1 flex flex-col min-w-[400px] bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-y-auto">
            {createdCharacterData && (
              <div className="flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-zinc-200 mb-2">Генерация фото персонажа</h3>
                  <p className="text-sm text-zinc-500">
                    {(() => {
                      const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
                      let subscriptionType = 'free';
                      if (rawSubscriptionType) {
                        subscriptionType = typeof rawSubscriptionType === 'string' 
                          ? rawSubscriptionType.toLowerCase().trim() 
                          : String(rawSubscriptionType).toLowerCase().trim();
                      }
                      const photosCount = subscriptionType === 'premium' ? 5 : 3;
                      const totalCost = photosCount * 10;
                      return `Сгенерируйте ${photosCount} фотографий для вашего персонажа (${totalCost} монет, ${photosCount} × 10 монет). ${subscriptionType === 'premium' ? 'PREMIUM подписка: 5 фото.' : subscriptionType === 'standard' ? 'STANDARD подписка: 3 фото.' : 'Без подписки: 3 фото.'}`;
                    })()}
                  </p>
                </div>
                
                <GenerateButton
                  onClick={generatePhoto}
                  disabled={(() => {
                    if (!userInfo || !createdCharacterData) return true;
                    const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
                    let subscriptionType = 'free';
                    if (rawSubscriptionType) {
                      subscriptionType = typeof rawSubscriptionType === 'string' 
                        ? rawSubscriptionType.toLowerCase().trim() 
                        : String(rawSubscriptionType).toLowerCase().trim();
                    }
                    const queueLimit = subscriptionType === 'premium' ? 5 : 3;
                    // Проверяем только размер очереди и монеты
                    const queueCount = generationQueueRef.current || 0;
                    const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
                    const isQueueFull = activeGenerations >= queueLimit;
                    return isQueueFull || userInfo.coins < 10;
                  })()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    minHeight: '48px'
                  }}
                >
                  <span>
                    {(() => {
                      const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
                      let subscriptionType = 'free';
                      if (rawSubscriptionType) {
                        subscriptionType = typeof rawSubscriptionType === 'string' 
                          ? rawSubscriptionType.toLowerCase().trim() 
                          : String(rawSubscriptionType).toLowerCase().trim();
                      }
                      const queueLimit = subscriptionType === 'premium' ? 5 : 3;
                      const queueCount = generationQueueRef.current || 0;
                      const activeGenerations = (isGeneratingPhoto ? 1 : 0) + queueCount;
                      const isQueueFull = activeGenerations >= queueLimit;
                      const progress = isGeneratingPhoto 
                        ? (generationProgress !== undefined && generationProgress > 0 ? generationProgress : (fakeProgress || 0))
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
                  const queueLimit = subscriptionType === 'premium' ? 5 : 3;
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

                {/* Кнопка "Продолжить" появляется после добавления хотя бы 1 фото */}
                {(() => {
                  const selectedCount = generatedPhotos.filter(photo => photo?.isSelected).length;
                  const hasAtLeastOneSelected = selectedCount >= 1;
                  
                  if (hasAtLeastOneSelected && createdCharacterData) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="mt-4"
                      >
                        <ContinueButton
                          onClick={async () => {
                            // Сначала сохраняем выбранные фото как главные
                            if (selectedPhotos.length > 0) {
                              try {
                                await saveSelectedPhotos();
                              } catch (err) {
                                console.error('[CREATE_CHAR] Error saving photos:', err);
                                setError('Ошибка при сохранении фото. Попробуйте еще раз.');
                                return;
                              }
                            }
                            
                            const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type;
                            let subscriptionType = 'free';
                            
                            if (rawSubscriptionType) {
                              if (typeof rawSubscriptionType === 'string') {
                                subscriptionType = rawSubscriptionType.toLowerCase().trim();
                              } else {
                                subscriptionType = String(rawSubscriptionType).toLowerCase().trim();
                              }
                            }
                            
                            console.log('[CREATE_CHAR] Checking subscription:', {
                              rawSubscriptionType,
                              subscriptionType,
                              userInfo: userInfo,
                              subscription: userInfo?.subscription
                            });
                            
                            const canCreatePaidAlbum = subscriptionType === 'standard' || subscriptionType === 'premium';
                            
                            if (canCreatePaidAlbum && onOpenPaidAlbumBuilder) {
                              onOpenPaidAlbumBuilder(createdCharacterData);
                            } else {
                              // Показываем модальное окно для пользователей без подписки
                              setIsSubscriptionModalOpen(true);
                            }
                          }}
                        >
                          Продолжить
                        </ContinueButton>
                      </motion.div>
                    );
                  }
                  return null;
                })()}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-200 mb-2">
                    Модель генерации:
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                    className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-zinc-500"
                  >
                    <option value="anime-realism">Аниме реализм</option>
                    <option value="anime">Аниме</option>
                    <option value="realism">Реализм</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label htmlFor="photo-prompt-unified" className="block text-sm font-medium text-zinc-200 mb-2">
                    Промпт для генерации фото:
                  </label>
                  <textarea
                    id="photo-prompt-unified"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={(() => {
                      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
                      return parts.length > 0 ? parts.join(' | ') : 'Опишите внешность персонажа и локацию для генерации фото...';
                    })()}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                    rows={4}
                  />
                </div>

                {/* Сгенерированные фото показываем внизу под промптом */}
                {generatedPhotos && Array.isArray(generatedPhotos) && generatedPhotos.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-4">
                      <h4 className="text-base font-medium text-zinc-200 mb-1">Сгенерированные фото ({generatedPhotos.length})</h4>
                    </div>
                    
                    <PhotoList>
                      {generatedPhotos.map((photo, index) => {
                        if (!photo || !photo.url) {
                          return null;
                        }
                        
                        const isSelected = Boolean(photo?.isSelected);

                        return (
                          <PhotoTile key={photo?.id || `photo-${index}`}>
                            <PhotoImage
                              src={photo.url}
                              alt={`Photo ${index + 1}`}
                              loading="lazy"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (photo) {
                                  openPhotoModal(photo);
                                }
                              }}
                            />
                            <PhotoOverlay>
                              <OverlayActions>
                                <OverlayButton
                                  $variant="primary"
                                  disabled={isSelected || isLimitReached}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (photo?.id) {
                                      handleAddPhoto(photo.id);
                                    }
                                  }}
                                >
                                  Добавить
                                </OverlayButton>
                                <OverlayButton
                                  $variant="danger"
                                  disabled={!isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (photo?.id) {
                                      handleRemovePhoto(photo.id);
                                    }
                                  }}
                                >
                                  Удалить
                                </OverlayButton>
                              </OverlayActions>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      
      {/* Модальное окно для просмотра фото в полный размер */}
      {selectedPhotoForView && (
        <PhotoModal 
          onClick={(e) => {
            console.log('[MODAL] Click on PhotoModal background');
            closePhotoModal();
          }}
        >
          <PhotoModalContent 
            onClick={(e) => {
              console.log('[MODAL] Click on PhotoModalContent - stopping propagation');
              e.stopPropagation();
            }}
          >
            <PhotoModalClose 
              onClick={(e) => {
                console.log('[MODAL] Click on close button');
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
                onLoad={() => console.log('[MODAL] Image loaded in modal:', selectedPhotoForView.url)}
                onError={() => console.error('[MODAL] Error loading image in modal:', selectedPhotoForView.url)}
              />
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
          </PhotoModalContent>
        </PhotoModal>
      )}
      
      {/* Отладочная информация */}
      {console.log('Selected photo for view:', selectedPhotoForView)}

      {/* Модальное окно авторизации */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Если закрыл без входа - на главную
            if (!isAuthenticated) {
              onBackToMain();
            }
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Диспатчим событие для обновления App.tsx
            window.dispatchEvent(new Event('auth-success'));
            // Перебрасываем на главную после входа
            onBackToMain();
          }}
        />
      )}
      
      {isSubscriptionModalOpen && (
        <SubscriptionModal onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsSubscriptionModalOpen(false);
          }
        }}>
          <SubscriptionModalContent onClick={(e) => e.stopPropagation()}>
            <SubscriptionModalTitle>Создание платного альбома</SubscriptionModalTitle>
            <SubscriptionModalText>
              Для создания платного альбома персонажа необходима подписка STANDARD или PREMIUM.
              Вы можете закончить создание персонажа сейчас или приобрести подписку.
            </SubscriptionModalText>
            <SubscriptionModalButtons>
              <SubscriptionModalButton
                $variant="secondary"
                onClick={() => {
                  setIsSubscriptionModalOpen(false);
                  // Перенаправляем в чат с персонажем
                  if (createdCharacterData && onOpenChat) {
                    onOpenChat(createdCharacterData);
                  } else {
                    onBackToMain(); // Fallback if chat cannot be opened
                  }
                }}
              >
                Закончить создание
              </SubscriptionModalButton>
              <SubscriptionModalButton
                $variant="primary"
                onClick={() => {
                  setIsSubscriptionModalOpen(false);
                  if (onShop) {
                    onShop();
                  }
                }}
              >
                Купить подписку
              </SubscriptionModalButton>
            </SubscriptionModalButtons>
          </SubscriptionModalContent>
        </SubscriptionModal>
      )}
      </div>
    </div>
  );
}