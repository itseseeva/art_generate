import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { API_CONFIG } from '../config/api';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { CircularProgress } from './ui/CircularProgress';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish, translateToRussian } from '../utils/translate';
import { FiX as CloseIcon } from 'react-icons/fi';

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
    border-color: ${theme.colors.accent.primary};
    transform: scale(1.1);
  }
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
        ? 'rgba(29, 78, 216, 1)'
        : 'rgba(220, 38, 38, 1)'};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    background: rgba(80, 80, 80, 0.6);
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
  console.log('[EDIT_CHAR_PAGE] Component rendering, character:', character);
  console.log('[EDIT_CHAR_PAGE] Character name:', character?.name);
  
  useEffect(() => {
    console.log('[EDIT_CHAR_PAGE] Component mounted');
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
  const CHARACTER_EDIT_COST = 30; // Кредиты за редактирование персонажа
  const balanceUpdateInProgressRef = useRef(false); // Флаг для предотвращения перезаписи баланса
  // Безопасная инициализация characterIdentifier с fallback
  // КРИТИЧНО: Используем name из character prop (это реальное имя из БД)
  const [characterIdentifier, setCharacterIdentifier] = useState<string>(() => {
    const name = character?.name || character?.id?.toString() || '';
    console.log('[EDIT_CHAR] Initializing characterIdentifier from character prop:', name);
    console.log('[EDIT_CHAR] Character prop:', character);
    return name;
  });
  type SelectedPhoto = { id: string; url: string };
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [fakeProgress, setFakeProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<number | undefined>(undefined);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationQueueRef = useRef<number>(0); // Счетчик задач в очереди
  const initialPhotosCountRef = useRef<number>(0); // Количество фото при загрузке страницы
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');

  const startFakeProgress = useCallback(() => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    setFakeProgress(0);
    
    // Моковый прогресс на 30 секунд (достаточно для генерации)
    const duration = 30000; // 30 секунд
    const interval = 300; // Обновление каждые 300ms
    const steps = duration / interval; // 100 шагов
    const increment = 99 / steps; // до 99% за время генерации
    
    let currentProgress = 0;
    fakeProgressIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 99) {
        currentProgress = 99;
        // Не останавливаем интервал, чтобы прогресс оставался видимым
      }
      setFakeProgress(Math.min(99, Math.round(currentProgress)));
    }, interval);
  }, []);

  const stopFakeProgress = useCallback((immediate: boolean) => {
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

  // Функции для авторизации
  const handleLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    authManager.clearTokens();
    setIsAuthenticated(false);
    setUserInfo(null);
  };

  // Безопасное обновление characterIdentifier при изменении character
  useEffect(() => {
    const newName = character?.name || character?.id?.toString() || '';
    console.log('[EDIT_CHAR] Character prop changed, newName:', newName, 'current identifier:', characterIdentifier);
    if (newName && newName !== characterIdentifier) {
      console.log('[EDIT_CHAR] Character changed, updating identifier:', newName);
      setCharacterIdentifier(newName);
      // Данные загрузятся автоматически через useEffect для characterIdentifier
    } else if (!newName && !characterIdentifier) {
      console.warn('[EDIT_CHAR] Character name/id is missing!', character);
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.name, character?.id]); // Убираем characterIdentifier из зависимостей, чтобы избежать циклов

  const fetchCharacterPhotos = useCallback(async (targetName?: string) => {
    const effectiveName = (targetName ?? characterIdentifier)?.trim();
    if (!effectiveName) {
      console.warn('[EDIT_CHAR] fetchCharacterPhotos: No character name provided');
      setIsLoadingPhotos(false);
      setGeneratedPhotos([]);
      return;
    }
    
    try {
      setIsLoadingPhotos(true);
      console.log('[EDIT_CHAR] Fetching character photos for:', effectiveName);
      
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
        console.error('[EDIT_CHAR] Failed to load character photos:', response.status, response.statusText);
        console.error('[EDIT_CHAR] Error response:', errorText);
        console.error('[EDIT_CHAR] Request URL:', urlWithCache);
        // НЕ показываем ошибку - просто пустой массив
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      const photos = await response.json();
      console.log('[EDIT_CHAR] Raw photos from API:', photos);
      console.log('[EDIT_CHAR] Photos count:', Array.isArray(photos) ? photos.length : 'not array');
      console.log('[EDIT_CHAR] Response status:', response.status);
      console.log('[EDIT_CHAR] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!Array.isArray(photos)) {
        console.error('[EDIT_CHAR] Photos is not an array:', typeof photos, photos);
        console.error('[EDIT_CHAR] Full response:', JSON.stringify(photos, null, 2));
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      if (photos.length === 0) {
        console.warn('[EDIT_CHAR] No photos returned from API');
        console.warn('[EDIT_CHAR] Character name:', effectiveName);
        console.warn('[EDIT_CHAR] API URL:', urlWithCache);
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }
      
      console.log('[EDIT_CHAR] First photo example:', photos[0]);

      const formattedPhotos = photos.map((photo: any, index: number) => {
        const photoId = photo.id?.toString() ?? (photo.url ? `photo_${index}_${Date.now()}` : String(Date.now()));
        const photoUrl = photo.url;
        
        if (!photoUrl) {
          console.warn('Photo without URL:', photo);
        }
        
        return {
          id: photoId,
          url: photoUrl,
          isSelected: Boolean(photo.is_main),
          created_at: photo.created_at ?? null
        };
      }).filter(photo => photo.url); // Фильтруем фотографии без URL

      console.log('[EDIT_CHAR] Formatted photos:', formattedPhotos);
      console.log('[EDIT_CHAR] Formatted photos count:', formattedPhotos.length);
      console.log('[EDIT_CHAR] Main photos (isSelected=true):', formattedPhotos.filter(p => p.isSelected));

      setGeneratedPhotos(formattedPhotos);
      initialPhotosCountRef.current = formattedPhotos.length; // Сохраняем начальное количество фото
      console.log('[EDIT_CHAR] setGeneratedPhotos called with', formattedPhotos.length, 'photos');
      
      const selected = formattedPhotos
        .filter(photo => photo.isSelected)
        .slice(0, 3)
        .map(photo => ({ id: photo.id, url: photo.url }));
      
      console.log('[EDIT_CHAR] Selected photos:', selected);
      setSelectedPhotos(selected);
      setIsLoadingPhotos(false);
      console.log('[EDIT_CHAR] Photos loading complete!');
    } catch (error) {
      console.error('[EDIT_CHAR] Error loading character photos:', error);
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
      console.log('[EDIT_CHAR] Using character.name for photos instead of ID:', photoIdentifier);
    }
    
    // Если все еще нет идентификатора, пытаемся получить из URL
    if (!photoIdentifier) {
      const urlParams = new URLSearchParams(window.location.search);
      const characterIdFromUrl = urlParams.get('character');
      if (characterIdFromUrl) {
        console.log('[EDIT_CHAR] No identifier found, trying to load character from URL:', characterIdFromUrl);
        // Если это число, нужно загрузить персонажа по ID, чтобы получить name
        // Но пока просто используем ID
        photoIdentifier = characterIdFromUrl;
      }
    }
    
    if (photoIdentifier) {
      console.log('[EDIT_CHAR] Loading photos for character:', photoIdentifier);
      console.log('[EDIT_CHAR] Character prop:', character);
      console.log('[EDIT_CHAR] CharacterIdentifier state:', characterIdentifier);
      fetchCharacterPhotos(photoIdentifier);
    } else {
      console.warn('[EDIT_CHAR] No character name/identifier, skipping photo load');
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
      console.log('Main photos updated successfully:', responseData);
      setSuccess('Фотографии для карточки обновлены!');
      
      // НЕ вызываем fetchCharacterPhotos() сразу, чтобы не потерять фото
      // Локальное состояние уже обновлено выше через setGeneratedPhotos и setSelectedPhotos
      // Фото останется в списке, просто изменится его статус isSelected
      
      // Отправляем событие для обновления главной страницы
      window.dispatchEvent(new CustomEvent('character-photos-updated', {
        detail: { character_name: characterIdentifier }
      }));
    } catch (err) {
      console.error('Error updating main photos:', err);
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
    
    console.log('[EDIT_CHAR] ========== loadCharacterData CALLED ==========');
    console.log('[EDIT_CHAR] targetIdentifier:', targetIdentifier);
    console.log('[EDIT_CHAR] characterIdentifier:', characterIdentifier);
    console.log('[EDIT_CHAR] Character prop:', character);
    console.log('[EDIT_CHAR] Character name:', character?.name);
    console.log('[EDIT_CHAR] Character id:', character?.id);
    
    // КРИТИЧНО: Если identifier - это число (ID), но у нас есть character.name, используем name
    // API endpoint /with-creator работает по имени, а не по ID
    if (character?.name && (identifier === character.id?.toString() || identifier === String(character.id))) {
      console.log('[EDIT_CHAR] Identifier is ID, but we have character.name, using name instead');
      identifier = character.name;
    }
    
    // Если identifier все еще выглядит как число, но у нас нет name в prop, пытаемся загрузить по ID
    if (!identifier || identifier.trim() === '') {
      // Пытаемся использовать character.id или character.name из prop
      if (character?.name) {
        identifier = character.name;
        console.log('[EDIT_CHAR] Using character.name from prop:', identifier);
      } else if (character?.id) {
        identifier = character.id.toString();
        console.log('[EDIT_CHAR] Using character.id from prop:', identifier);
      } else {
      console.warn('[EDIT_CHAR] No valid characterIdentifier provided, setting isLoadingData to false');
      setIsLoadingData(false);
      return;
      }
    }
    
    console.log('[EDIT_CHAR] Final identifier for API request:', identifier);
    
    try {
      console.log('[EDIT_CHAR] Setting isLoadingData to true and clearing error');
      setIsLoadingData(true);
      setError(null);
      setSuccess(null);
      console.log('[EDIT_CHAR] Loading character data for:', identifier);
      
      // Добавляем timestamp для обхода кеша
      const cacheBuster = `?t=${Date.now()}`;
      // Используем /with-creator endpoint для получения полных данных персонажа
      // КРИТИЧНО: Этот endpoint работает по имени персонажа, не по ID
      const url = `/api/v1/characters/${encodeURIComponent(identifier)}/with-creator${cacheBuster}`;
      console.log('[EDIT_CHAR] Request URL:', url);
      const response = await authManager.fetchWithAuth(url);

      console.log('[EDIT_CHAR] Response status:', response.status, response.statusText);

      if (response.ok) {
        const characterData = await response.json();
        console.log('[EDIT_CHAR] Character data loaded successfully');
        console.log('[EDIT_CHAR] Character name:', characterData?.name);
        console.log('[EDIT_CHAR] Character prompt exists:', !!characterData?.prompt);
        console.log('[EDIT_CHAR] Character prompt length:', characterData?.prompt?.length || 0);
        
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
        
        console.log('[EDIT_CHAR] ========== SETTING FORMDATA ==========');
        console.log('[EDIT_CHAR] Character data received:', {
          name: characterData?.name,
          hasPrompt: !!characterData?.prompt,
          promptLength: characterData?.prompt?.length || 0,
          appearance: characterData?.character_appearance || characterData?.appearance,
          location: characterData?.location
        });
        console.log('[EDIT_CHAR] FormData name:', newFormData.name);
        console.log('[EDIT_CHAR] FormData personality length:', newFormData.personality.length);
        console.log('[EDIT_CHAR] FormData situation length:', newFormData.situation.length);
        console.log('[EDIT_CHAR] FormData instructions length:', newFormData.instructions.length);
        console.log('[EDIT_CHAR] FormData appearance:', newFormData.appearance);
        console.log('[EDIT_CHAR] FormData location:', newFormData.location);
        console.log('[EDIT_CHAR] Full formData object:', JSON.stringify(newFormData, null, 2));
        
        // КРИТИЧНО: Устанавливаем formData СРАЗУ перед установкой isLoadingData в false
        // Это гарантирует, что поля формы будут заполнены до рендеринга
        setFormData(newFormData);
        
        // Обновляем characterIdentifier только если имя изменилось
        const newName = characterData?.name || identifier;
        if (newName && newName !== characterIdentifier) {
          console.log('[EDIT_CHAR] Updating characterIdentifier from', characterIdentifier, 'to', newName);
          setCharacterIdentifier(newName);
        }
        
        console.log('[EDIT_CHAR] FormData set successfully, about to set isLoadingData to false');
        
        // После успешной загрузки данных загружаем фото
        // Используем name из characterData (реальное имя из БД)
        const photoIdentifier = characterData?.name || identifier;
        if (photoIdentifier) {
          console.log('[EDIT_CHAR] Loading photos after data load:', photoIdentifier);
          // Загружаем фото сразу после загрузки данных персонажа
          setTimeout(() => {
            fetchCharacterPhotos(photoIdentifier);
          }, 100); // Небольшая задержка, чтобы убедиться, что состояние обновилось
        }
      } else {
        console.error('[EDIT_CHAR] Failed to load character data:', response.status);
        if (response.status === 404) {
          setError('Персонаж не найден. Возможно, он был удален.');
        } else {
          setError('Не удалось загрузить данные персонажа');
        }
      }
    } catch (error) {
      console.error('[EDIT_CHAR] Error loading character data:', error);
      console.error('[EDIT_CHAR] Error details:', error instanceof Error ? error.message : String(error));
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
      console.log('[EDIT_CHAR] ========== FINALLY BLOCK ==========');
      console.log('[EDIT_CHAR] Setting isLoadingData to false');
      setIsLoadingData(false);
      console.log('[EDIT_CHAR] isLoadingData should now be false');
    }
  }, [characterIdentifier, character?.name]);

  // Автоматически заполняем customPrompt на основе appearance и location после загрузки данных
  useEffect(() => {
    if (formData.appearance || formData.location) {
      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
      if (parts.length > 0) {
        const defaultPrompt = parts.join(' | ');
        // Устанавливаем только если customPrompt пустой (чтобы не перезаписывать пользовательский ввод)
        if (!customPrompt.trim()) {
          setCustomPrompt(defaultPrompt);
        }
      }
    }
  }, [formData.appearance, formData.location]); // Зависимости только от appearance и location

  // Проверка авторизации (используем тот же метод, что и в ProfilePage)
  const checkAuth = async () => {
    // НЕ обновляем баланс, если идет обновление после сохранения
    if (balanceUpdateInProgressRef.current) {
      console.log('[EDIT_CHAR] checkAuth пропущен - идет обновление баланса после сохранения');
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
        console.log('[EDIT_CHAR] User data loaded from /api/v1/auth/me/:', userData);
        console.log('[EDIT_CHAR] Subscription data:', userData.subscription, 'subscription_type:', userData.subscription_type);
        setIsAuthenticated(true);
        setUserInfo(prev => {
          // Обновляем только если баланс не обновляется после сохранения
          if (balanceUpdateInProgressRef.current) {
            console.log('[EDIT_CHAR] checkAuth пропустил обновление баланса - идет обновление после сохранения');
            return prev;
          }
          const updatedUserInfo = {
            username: userData.username || userData.email || 'Пользователь',
            coins: userData.coins || 0,
            id: userData.id,
            subscription: userData.subscription || { subscription_type: userData.subscription_type || 'free' }
          };
          console.log('[EDIT_CHAR] Updated userInfo with subscription:', updatedUserInfo.subscription);
          return updatedUserInfo;
        });
      } else {
        console.error('[EDIT_CHAR] Auth check failed, status:', response.status);
        authManager.clearTokens();
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('[EDIT_CHAR] Auth check error:', error);
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  };

  // Загружаем настройки генерации
  const loadGenerationSettings = async () => {
    try {
      console.log('Загружаем настройки генерации...');
      const response = await fetch('/api/v1/fallback-settings/');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        console.log('Настройки генерации загружены:', settings);
        console.log('Steps:', settings.steps, 'CFG:', settings.cfg_scale);
      } else {
        console.error('Ошибка загрузки настроек:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек генерации:', error);
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
        console.log('[EDIT_CHAR] Subscription stats loaded:', statsData);
      } else {
        console.error('[EDIT_CHAR] Ошибка загрузки статистики подписки:', response.status);
        setSubscriptionStats(null);
      }
    } catch (error) {
      console.error('[EDIT_CHAR] Ошибка загрузки статистики подписки:', error);
      setSubscriptionStats(null);
    }
  };

  // Слушаем события обновления баланса
  useEffect(() => {
    const handleBalanceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.coins !== undefined) {
        const newCoins = customEvent.detail.coins;
        console.log('[EDIT_CHAR] Получено событие обновления баланса:', newCoins);
        setUserInfo(prev => {
          if (prev) {
            const updated = { ...prev, coins: newCoins };
            console.log('[EDIT_CHAR] Обновление баланса через событие:', { old: prev.coins, new: updated.coins });
            return updated;
          }
          return prev;
        });
      }
    };

    const handleProfileUpdate = async () => {
      console.log('[EDIT_CHAR] Получено событие profile-update, обновляем баланс');
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
          console.error('[EDIT_CHAR] Error in handleProfileUpdate:', error);
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
    console.log('[EDIT_CHAR] ========== COMPONENT MOUNTED/UPDATED ==========');
    console.log('[EDIT_CHAR] Initial characterIdentifier:', characterIdentifier);
    console.log('[EDIT_CHAR] Character prop:', character);
    console.log('[EDIT_CHAR] Character name:', character?.name);
    console.log('[EDIT_CHAR] Character id:', character?.id);
    
    // Загружаем данные только при первом монтировании
    // НЕ вызываем checkAuth здесь, если идет обновление баланса после сохранения
    if (!balanceUpdateInProgressRef.current) {
    checkAuth();
    }
    loadGenerationSettings();
    loadSubscriptionStats();
    
    // КРИТИЧНО: Определяем идентификатор персонажа из prop или state
    // ПРИОРИТЕТ: Используем name из character prop (это реальное имя из БД)
    // API endpoint /with-creator работает по имени, а не по ID
    let effectiveIdentifier = '';
    if (character?.name) {
      effectiveIdentifier = character.name;
      console.log('[EDIT_CHAR] Using character.name as identifier:', effectiveIdentifier);
    } else if (character?.id) {
      // Если нет name, но есть id, используем id как fallback
      // Но loadCharacterData попытается загрузить по ID, что может не сработать
      effectiveIdentifier = character.id.toString();
      console.log('[EDIT_CHAR] Using character.id as identifier (fallback):', effectiveIdentifier);
    } else if (characterIdentifier) {
      effectiveIdentifier = characterIdentifier;
      console.log('[EDIT_CHAR] Using characterIdentifier from state:', effectiveIdentifier);
    }
    
    console.log('[EDIT_CHAR] Effective identifier:', effectiveIdentifier);
    
    // КРИТИЧНО: Загружаем данные персонажа сразу при монтировании или изменении character
    if (effectiveIdentifier && effectiveIdentifier.trim() !== '') {
      console.log('[EDIT_CHAR] Loading data immediately:', effectiveIdentifier);
      // Обновляем characterIdentifier если он был пустой или изменился
      // КРИТИЧНО: Сохраняем name, а не ID, так как API работает по имени
      const nameToStore = character?.name || effectiveIdentifier;
      if (!characterIdentifier || characterIdentifier !== nameToStore) {
        console.log('[EDIT_CHAR] Setting characterIdentifier from prop:', nameToStore);
        setCharacterIdentifier(nameToStore);
      }
      // Устанавливаем isLoadingData в true перед загрузкой
      setIsLoadingData(true);
      loadCharacterData(nameToStore).catch((error) => {
        console.error('[EDIT_CHAR] Error in loadCharacterData:', error);
        setIsLoadingData(false);
        setError('Ошибка при загрузке данных персонажа');
      });
    } else {
      console.warn('[EDIT_CHAR] No valid identifier found, setting isLoadingData to false');
      setIsLoadingData(false);
    }
    
    // Безопасная загрузка main_photos из character prop
    if (character?.photos && Array.isArray(character.photos) && character.photos.length > 0) {
      console.log('[EDIT_CHAR] Loading main_photos from character prop:', character.photos);
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
        console.log('[EDIT_CHAR] Main photos loaded from prop:', mainPhotos);
      }
    }

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
  }, [character?.name, character?.id]); // Реагируем на изменения character prop

  // Загрузка данных персонажа при изменении characterIdentifier
  // КРИТИЧНО: Этот useEffect не должен дублировать загрузку из основного useEffect
  // Используем useRef для отслеживания последней загруженной версии
  const lastLoadedIdentifierRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  
  useEffect(() => {
    console.log('[EDIT_CHAR] useEffect triggered, characterIdentifier:', characterIdentifier, 'isLoadingData:', isLoadingData, 'isLoadingRef:', isLoadingRef.current);
    
    // КРИТИЧНО: Используем name из character prop, так как API работает по имени
    const effectiveIdentifier = character?.name || characterIdentifier;
    
    if (effectiveIdentifier && effectiveIdentifier.trim() !== '' && lastLoadedIdentifierRef.current !== effectiveIdentifier && !isLoadingRef.current) {
      console.log('[EDIT_CHAR] characterIdentifier valid, calling loadCharacterData:', effectiveIdentifier);
      lastLoadedIdentifierRef.current = effectiveIdentifier;
      isLoadingRef.current = true;
      loadCharacterData(effectiveIdentifier).finally(() => {
        isLoadingRef.current = false;
      });
    } else if (!effectiveIdentifier || effectiveIdentifier.trim() === '') {
      console.warn('[EDIT_CHAR] Invalid characterIdentifier, skipping load. Setting isLoadingData to false.');
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
        style: formData.style?.trim() || null,
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
        throw new Error(errorData.detail || 'Ошибка при редактировании персонажа');
      }

      const updatedCharacter = await response.json();
      const updatedName = updatedCharacter?.name ?? requestData.name;
      setCharacterIdentifier(updatedName);
      setFormData(prev => ({
        ...prev,
        name: updatedName,
        appearance: updatedCharacter?.character_appearance ?? prev.appearance,
        location: updatedCharacter?.location ?? prev.location
      }));
      setSuccess('Персонаж успешно обновлен!');
      await fetchCharacterPhotos(updatedName);
      
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
          const response = await fetch('${API_CONFIG.BASE_URL}/api/v1/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store' // Отключаем кэш для получения актуальных данных
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log(`[EDIT_CHAR] Попытка ${attempt}: Актуальный баланс из API после сохранения:`, userData.coins);
            
            // Проверяем, изменился ли баланс (должен быть меньше на CHARACTER_EDIT_COST)
            const expectedBalance = userInfo ? userInfo.coins - CHARACTER_EDIT_COST : userData.coins;
            const balanceChanged = userInfo && userData.coins !== userInfo.coins;
            
            if (balanceChanged || attempt === maxAttempts) {
              // Баланс изменился или это последняя попытка - обновляем
              console.log('[EDIT_CHAR] Баланс обновлен:', { old: userInfo?.coins, new: userData.coins, expected: expectedBalance });
              
              setUserInfo(prev => {
                if (prev) {
                  const updated = { ...prev, coins: userData.coins };
                  console.log('[EDIT_CHAR] setUserInfo вызван с новым балансом:', { old: prev.coins, new: updated.coins });
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
              console.log(`[EDIT_CHAR] Баланс еще не обновился (${userData.coins} == ${userInfo?.coins}), повтор через 1 секунду...`);
              setTimeout(() => updateBalanceWithRetries(attempt + 1, maxAttempts), 1000);
            }
          } else {
            console.error('[EDIT_CHAR] Failed to fetch balance, status:', response.status);
            if (attempt < maxAttempts) {
              setTimeout(() => updateBalanceWithRetries(attempt + 1, maxAttempts), 1000);
            } else {
              balanceUpdateInProgressRef.current = false;
            }
          }
        } catch (error) {
          console.error('[EDIT_CHAR] Error fetching balance:', error);
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
        
        if (status.status === 'generating' && status.result?.progress !== undefined) {
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
          setGenerationProgress(progressValue);
        } else if (status.status === 'generating' || status.status === 'PROGRESS' || status.status === 'PENDING') {
          // Если статус generating, но прогресс не указан, используем fakeProgress как fallback
          setGenerationProgress(fakeProgress);
        }
        
        // Логируем только при изменении статуса или раз в 5 попыток
        if (attempts % 5 === 0 || status.status === 'SUCCESS' || status.status === 'FAILURE') {
          console.log(`[EDIT_CHAR] Generation status [attempt ${attempts + 1}]:`, status.status, status.message || '');
        }

        // Бэкенд возвращает результат в поле "result", а не "data"
        const resultData = status.result || status.data;
        
        if (status.status === 'SUCCESS' && resultData) {
          console.log('[EDIT_CHAR] Generation result data:', resultData);
          
          // Проверяем разные варианты структуры ответа
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            console.log('[EDIT_CHAR] Photo generated successfully:', { imageUrl, imageId });
            setGenerationProgress(100); // Устанавливаем 100% при завершении
            return {
              id: imageId,
              url: imageUrl
            };
          } else {
            console.error('[EDIT_CHAR] No image URL in result:', resultData);
            console.error('[EDIT_CHAR] Available keys:', Object.keys(resultData));
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || 'Ошибка генерации изображения');
        }
        
        // Для всех остальных статусов (PENDING, PROGRESS, generating) продолжаем цикл
        attempts++;
      } catch (err) {
        console.error('[EDIT_CHAR] Error checking generation status:', err);
        throw err;
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  // Функция для генерации одного фото (вынесена из generatePhoto)
  const generateSinglePhoto = async (): Promise<{ id: string; url: string } | null> => {
    const token = authManager.getToken();
    if (!token) throw new Error('Необходимо войти в систему');

    // Используем кастомный промпт или дефолтный из полей персонажа
    let prompt = customPrompt.trim();
    if (!prompt) {
      const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
      prompt = parts.length > 0 ? parts.join(' | ') : '';
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
        console.log('[EDIT_CHAR] Фото добавлено в галерею пользователя');
      }
    } catch (galleryError) {
      console.warn('[EDIT_CHAR] Ошибка добавления в галерею:', galleryError);
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
    
    const queueLimit = subscriptionType === 'premium' ? 5 : 3;
    
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
    if (isGeneratingPhoto) {
      generationQueueRef.current += 1;
      return;
    }

    // Генерируем одно фото сразу
    setIsGeneratingPhoto(true);
    setError(null);
    setGenerationProgress(0);
    startFakeProgress();

    const processGeneration = async () => {
      try {
        const photo = await generateSinglePhoto();
        if (photo) {
          setGeneratedPhotos(prev => {
            // Проверяем, нет ли уже фото с таким же id
            const existingIds = new Set(prev.map(p => p.id));
            if (existingIds.has(photo.id)) {
              console.warn('[EDIT_CHAR] Photo with same id already exists, skipping:', photo.id);
              return prev;
            }
            return [{ ...photo, isSelected: false }, ...prev];
          });
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
        setGenerationProgress(0);
        
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


  // Сохранение выбранных фото
  const saveSelectedPhotos = async () => {
    console.log('Saving selected photos:', selectedPhotos);
    
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
      
      console.log('Sending request to API:', requestData);

      const response = await authManager.fetchWithAuth('/api/v1/characters/set-main-photos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response data:', result);
        setSuccess('Главные фото успешно сохранены!');
        console.log('Main photos saved:', selectedPhotos);
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

  // Проверка на undefined character с более детальной информацией
  if (!character || (!character.name && !character.id)) {
    console.error('[EDIT_CHAR] Character is undefined or invalid!', character);
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
  console.log('[EDIT_CHAR] ========== RENDER CHECK ==========');
  console.log('[EDIT_CHAR] isLoadingData:', isLoadingData);
  console.log('[EDIT_CHAR] formData exists:', !!formData);
  console.log('[EDIT_CHAR] formData.name:', formData?.name);
  console.log('[EDIT_CHAR] characterIdentifier:', characterIdentifier);
  console.log('[EDIT_CHAR] character prop:', character);
  console.log('[EDIT_CHAR] ===================================');
  
  if (isLoadingData) {
    console.log('[EDIT_CHAR] Showing loading spinner because isLoadingData is true');
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
            leftContent={
              <>
                <BackButton onClick={onBackToEditList}>← Назад к списку</BackButton>
                <PageTitle>Загрузка...</PageTitle>
              </>
            }
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
  console.log('[EDIT_CHAR] Render check - formData exists:', !!formData, 'formData:', formData);
  if (!formData) {
    console.error('[EDIT_CHAR] formData is undefined!');
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
  console.log('[EDIT_CHAR] ========== FINAL RENDER CHECK ==========');
  console.log('[EDIT_CHAR] isLoadingData:', isLoadingData);
  console.log('[EDIT_CHAR] formData:', formData);
  console.log('[EDIT_CHAR] formData.name:', formData?.name);
  console.log('[EDIT_CHAR] formData.personality:', formData?.personality?.substring(0, 50) + '...');
  console.log('[EDIT_CHAR] Will render form:', !isLoadingData && !!formData);
  console.log('[EDIT_CHAR] =========================================');
  
  // Дополнительная проверка безопасности
  if (!formData) {
    console.warn('[EDIT_CHAR] formData is null or undefined');
    return <div>Загрузка...</div>;
  }
  
  if (!formData.name) {
    console.warn('[EDIT_CHAR] formData.name is null or undefined');
    return <div>Загрузка...</div>;
  }
  
  console.log('[EDIT_CHAR] Rendering main form. formData.name:', formData.name, 'formData.personality length:', formData.personality?.length || 0);
  
  return (
    <MainContainer style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw',
      position: 'relative',
      zIndex: 1,
      overflow: 'visible'
    }}>
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
        leftContent={
          <>
            <BackButton onClick={onBackToEditList}>← Назад к списку</BackButton>
            <PageTitle>Редактирование: {formData.name || characterIdentifier}</PageTitle>
          </>
        }
      />
      
      <MainContent style={{ 
          flex: 1, 
          display: 'flex', 
          height: 'calc(100vh - 80px)',
          maxHeight: 'calc(100vh - 80px)',
          overflow: 'hidden',
          padding: theme.spacing.lg,
          gap: theme.spacing.lg,
          visibility: 'visible',
          opacity: 1,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Form onSubmit={handleSubmit} style={{ 
            display: 'flex', 
            flex: 1, 
            width: '100%', 
            height: '100%',
            gap: theme.spacing.lg,
            visibility: 'visible',
            opacity: 1,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 10
          }}>
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
                  <Label htmlFor="style" data-icon="✨">Стиль ответа (необязательно):</Label>
                  <Input
                    type="text"
                    id="style"
                    name="style"
                    value={formData.style}
                    onChange={handleInputChange}
                    placeholder="Например: формальный, дружелюбный, загадочный..."
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

            <RightColumn>
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
                          console.log('[EDIT_CHAR] Generate button clicked');
                          generatePhoto();
                        }}
                        disabled={(() => {
                          if (!userInfo) {
                            console.log('[EDIT_CHAR] Button disabled: no userInfo');
                            return true;
                          }
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
                          const hasEnoughCoins = (userInfo?.coins || 0) >= 10;
                          const isQueueFull = activeGenerations >= queueLimit;
                          const isDisabled = isQueueFull || !hasEnoughCoins;
                          console.log('[EDIT_CHAR] Button disabled check:', {
                            userInfo: !!userInfo,
                            subscriptionType,
                            queueLimit,
                            activeGenerations,
                            queueCount,
                            isGeneratingPhoto,
                            hasEnoughCoins,
                            coins: userInfo?.coins,
                            isDisabled
                          });
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
                        <option value="anime-realism">Аниме реализм</option>
                        <option value="anime">Аниме</option>
                        <option value="realism">Реализм</option>
                      </select>
                    </div>

                    <LargeTextLabel htmlFor="photo-prompt-unified">
                      Промпт для генерации фото:
                    </LargeTextLabel>
                    <LargeTextInput
                      id="photo-prompt-unified"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={(() => {
                        const parts = [formData.appearance, formData.location].filter(p => p && p.trim());
                        return parts.length > 0 ? parts.join(' | ') : '';
                      })()}
                    />
                  </PhotoGenerationBox>
                </div>

                {/* Область для отображения сгенерированных фото - внизу контейнера */}
                <div style={{ flex: '1 1 auto', marginTop: 'auto', paddingTop: theme.spacing.md }}>
                  {console.log('[EDIT_CHAR] Render check - isLoadingPhotos:', isLoadingPhotos, 'photos count:', generatedPhotos?.length || 0, 'generatedPhotos:', generatedPhotos)}
                  
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
                        {console.log('[EDIT_CHAR] Rendering photos, count:', generatedPhotos.length)}
                        {generatedPhotos.map((photo, index) => {
                          if (!photo || !photo.url) {
                            console.warn(`[EDIT_CHAR] Photo ${index} is missing url:`, photo);
                            return null;
                          }
                          
                          console.log(`[EDIT_CHAR] Rendering photo ${index}:`, photo.url);
                          const isSelected = Boolean(photo?.isSelected);

                          return (
                            <PhotoTile key={`${photo?.id || `photo-${index}`}-${index}`}>
                              <PhotoImage
                                src={photo.url}
                                alt={`Photo ${index + 1}`}
                                onClick={(e) => {
                                  console.log('[MODAL] Клик на PhotoImage');
                                  e.stopPropagation();
                                  if (photo) {
                                    openPhotoModal(photo);
                                  }
                                }}
                                onError={(e) => {
                                  console.error('[EDIT_CHAR] Ошибка загрузки изображения:', photo?.url);
                                }}
                                onLoad={() => {
                                  console.log('[EDIT_CHAR] Фото загружено успешно');
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
                    </FullSizePhotoSlider>
                  ) : (
                    <PhotoGenerationPlaceholder>
                      {isLoadingPhotos ? (
                        'Загрузка фотографий...'
                      ) : (
                        <>
                          Фотографии будут здесь
                          <div style={{ marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm, color: theme.colors.text.muted }}>
                            {generatedPhotos && Array.isArray(generatedPhotos) && generatedPhotos.length === 0 
                              ? 'Нет доступных фотографий. Сгенерируйте фото для персонажа или добавьте существующие.'
                              : 'Сгенерируйте фото для персонажа или добавьте существующие'
                            }
                          </div>
                          {character?.name && (
                            <div style={{ marginTop: theme.spacing.xs, fontSize: theme.fontSize.xs, color: theme.colors.text.muted, opacity: 0.7 }}>
                              Персонаж: {character.name} {character.id && `(ID: ${character.id})`}
                            </div>
                          )}
                        </>
                      )}
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
      {console.log('[MODAL] Render check - selectedPhotoForView:', selectedPhotoForView)}
      {console.log('[MODAL] Should show modal:', selectedPhotoForView !== null)}
    </MainContainer>
  );
};
