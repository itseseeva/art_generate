import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { API_CONFIG } from '../config/api';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';

const MainContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  background: linear-gradient(to bottom right, rgba(20, 20, 20, 1), rgba(30, 30, 30, 0.95), rgba(50, 50, 50, 0.1));
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
    background: rgba(60, 60, 60, 0.15);
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
    background: rgba(50, 50, 50, 0.15);
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
  padding: 0;
  overflow-y: auto;
  display: flex;
  gap: 0;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 10;
`;

const LeftColumn = styled.div`
  flex: 1;
  min-width: 0;
  min-height: calc(150vh - 80px);
  background: transparent;
  border-radius: 0;
  padding: 0;
  border: 1px solid rgba(130, 130, 130, 0.3);
  box-shadow: none;
  display: flex;
  flex-direction: column;
`;

const RightColumn = styled.div`
  flex: 1;
  min-width: 0;
  min-height: calc(150vh - 80px);
  background: transparent;
  border-radius: 0;
  padding: 0;
  border: 1px solid rgba(130, 130, 130, 0.3);
  box-shadow: none;
  display: flex;
  flex-direction: column;
`;

const Form = styled.form`
  display: contents;
`;

const ColumnContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.sm};
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
  background: transparent;
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(130, 130, 130, 0.4);
  transition: border-color 0.3s ease;
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
  
  &:hover {
    border-color: rgba(200, 200, 200, 0.5);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }
  &:nth-child(5) {
    animation-delay: 0.5s;
  }
  &:nth-child(6) {
    animation-delay: 0.6s;
  }
  &:nth-child(7) {
    animation-delay: 0.7s;
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  
  &::before {
    content: attr(data-icon);
    width: 32px;
    height: 32px;
    border: 1px solid rgba(180, 180, 180, 0.3);
    border-radius: ${theme.borderRadius.lg};
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(230, 230, 230, 0.95);
    transition: border-color 0.3s ease;
  }
  
  ${FormGroup}:hover &::before {
    border-color: rgba(255, 255, 255, 0.6);
  }
`;

const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: ${theme.spacing.md};
  border: 1px solid rgba(140, 140, 140, 0.5);
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  transition: border-color 0.3s ease;
  
  &::placeholder {
    color: rgba(200, 200, 200, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(220, 220, 220, 0.8);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 128px;
  padding: ${theme.spacing.md};
  border: 1px solid rgba(140, 140, 140, 0.5);
  border-radius: ${theme.borderRadius.md};
  background: transparent;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
  transition: border-color 0.3s ease;
  
  &::placeholder {
    color: rgba(200, 200, 200, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(220, 220, 220, 0.8);
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
  cursor: default;
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
  background: rgba(20, 20, 20, 0.95);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 32px;
  font-weight: bold;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  
  &:hover {
    background: rgba(220, 38, 38, 0.95);
    border-color: rgba(255, 255, 255, 0.6);
    transform: scale(1.15) rotate(90deg);
  }
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
  min-height: 420px;
  background: rgba(30, 30, 30, 0.8);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(120, 120, 120, 0.3);
  padding: ${theme.spacing.xl};
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
  gap: ${theme.spacing.xl};
  margin-top: ${theme.spacing.md};
  max-height: 800px;
  overflow-y: auto;
  padding: ${theme.spacing.md};
  visibility: visible !important;
  opacity: 1 !important;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.6);
    border-radius: ${theme.borderRadius.sm};
  }

  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.4);
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
  min-height: 400px;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  cursor: pointer;
  z-index: 1;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
    border-color: rgba(180, 180, 180, 0.5);
    z-index: 10;
  }
`;

const PhotoImage = styled.img`
  width: 100% !important;
  height: 400px !important;
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
  background: linear-gradient(135deg, rgba(50, 50, 50, 0.9), rgba(40, 40, 40, 0.9));
  border: 1px solid rgba(120, 120, 120, 0.4);
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(200, 200, 200, 0.15), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(150, 150, 150, 0.5);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number} | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [characterIdentifier, setCharacterIdentifier] = useState(character.name);
  type SelectedPhoto = { id: string; url: string };
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [fakeProgress, setFakeProgress] = useState(0);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    fakeProgressIntervalRef.current = setInterval(() => {
      setFakeProgress(prev => {
        if (prev >= 99) {
          return 99;
        }
        return prev + 1;
      });
    }, 300);
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

  useEffect(() => {
    if (character?.name) {
      setCharacterIdentifier(character.name);
      console.log('[EDIT_CHAR] Character name set:', character.name);
    } else {
      console.warn('[EDIT_CHAR] Character name is missing!', character);
    }
  }, [character?.name]);

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
      const response = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_PHOTOS_FULL(effectiveName), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('[EDIT_CHAR] Failed to load character photos:', response.status, response.statusText);
        // НЕ показываем ошибку - просто пустой массив
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      const photos = await response.json();
      console.log('[EDIT_CHAR] Raw photos from API:', photos);
      console.log('[EDIT_CHAR] Photos count:', Array.isArray(photos) ? photos.length : 'not array');
      
      if (!Array.isArray(photos)) {
        console.error('[EDIT_CHAR] Photos is not an array:', typeof photos, photos);
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

      if (photos.length === 0) {
        console.warn('[EDIT_CHAR] No photos returned from API');
        setGeneratedPhotos([]);
        setSelectedPhotos([]);
        setIsLoadingPhotos(false);
        return;
      }

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

  // Загружаем фото при изменении characterIdentifier
  useEffect(() => {
    if (characterIdentifier) {
      console.log('[EDIT_CHAR] Loading photos for character:', characterIdentifier);
      fetchCharacterPhotos(characterIdentifier);
    } else {
      console.warn('[EDIT_CHAR] No characterIdentifier, skipping photo load');
      setIsLoadingPhotos(false);
      setGeneratedPhotos([]);
    }
  }, [characterIdentifier, fetchCharacterPhotos]);

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
  const loadCharacterData = async () => {
    try {
      if (!characterIdentifier) {
        return;
      }
      const response = await authManager.fetchWithAuth(`/api/v1/characters/${characterIdentifier}`);

      if (response.ok) {
        const characterData = await response.json();
        
        // Парсим промпт для извлечения полей пользователя
        const prompt = characterData.prompt || '';
        let personality = '';
        let situation = '';
        let instructions = '';
        let style = '';
        
        // Извлекаем данные из промпта
        const personalityMatch = prompt.match(/Personality and Character:\s*(.*?)(?=\n\nRole-playing Situation:|$)/s);
        if (personalityMatch) {
          personality = personalityMatch[1].trim();
        }
        
        const situationMatch = prompt.match(/Role-playing Situation:\s*(.*?)(?=\n\nInstructions:|$)/s);
        if (situationMatch) {
          situation = situationMatch[1].trim();
        }
        
        const instructionsMatch = prompt.match(/Instructions:\s*(.*?)(?=\n\nResponse Style:|$)/s);
        if (instructionsMatch) {
          instructions = instructionsMatch[1].trim();
        }
        
        const styleMatch = prompt.match(/Response Style:\s*(.*?)(?=\n\nIMPORTANT:|$)/s);
        if (styleMatch) {
          style = styleMatch[1].trim();
        }
        
        setFormData({
          name: characterData.name,
          personality: personality,
          situation: situation,
          instructions: instructions,
          style: style,
          appearance: characterData.character_appearance || '',
          location: characterData.location || ''
        });
        setCharacterIdentifier(characterData.name);
      }
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const { isAuthenticated, userInfo } = await authManager.checkAuth();
      
      setIsAuthenticated(isAuthenticated);
      if (isAuthenticated && userInfo) {
        setUserInfo(userInfo);
      }
    } catch (error) {
      console.error('Auth check error:', error);
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

  useEffect(() => {
    checkAuth();
    loadCharacterData();
    loadGenerationSettings();
    
    // Загружаем фото персонажа из API
    fetchCharacterPhotos();
    
    // Также загружаем main_photos если они есть в character prop (для начального отображения)
    if (character.photos && Array.isArray(character.photos) && character.photos.length > 0) {
      console.log('Loading main_photos from character prop:', character.photos);
      const mainPhotos = character.photos.map((url: string, index: number) => ({
        id: `main_${index}`,
        url: url,
        isSelected: true,
        created_at: null
      }));
      setSelectedPhotos(mainPhotos.slice(0, MAX_MAIN_PHOTOS));
      console.log('Main photos loaded from prop:', mainPhotos);
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
  }, [characterIdentifier, character.name]);

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
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при редактировании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePhoto = async () => {
    if (!userInfo || userInfo.coins < 30) {
      setError('Недостаточно монет! Нужно 30 монет для генерации фото.');
      return;
    }

    setIsGeneratingPhoto(true);
    setError(null);
    startFakeProgress();

    let generationFailed = false;

    try {
      
      // Используем кастомный промпт или дефолтный
      const prompt = customPrompt.trim() || `${formData.appearance || ''} ${formData.location || ''}`.trim() || 'portrait, high quality, detailed';

      // Используем настройки из API с fallback значениями
      console.log('Generation settings:', generationSettings);
      
      // Используем только настройки из API
      const effectiveSettings = {
        steps: generationSettings?.steps,
        width: generationSettings?.width,
        height: generationSettings?.height,
        cfg_scale: generationSettings?.cfg_scale,
        sampler_name: generationSettings?.sampler_name,
        negative_prompt: generationSettings?.negative_prompt
      };
      
      console.log('Effective settings:', effectiveSettings);
      console.log('Using steps:', effectiveSettings.steps);
      console.log('Using cfg_scale:', effectiveSettings.cfg_scale);
      
      const requestBody = {
        character: formData.name || 'character',
        prompt: prompt,
        negative_prompt: effectiveSettings.negative_prompt,
        width: effectiveSettings.width,
        height: effectiveSettings.height,
        steps: effectiveSettings.steps,
        cfg_scale: effectiveSettings.cfg_scale,
        use_default_prompts: false
      };
      
      console.log('Request body:', requestBody);
      
      // Добавляем user_id если пользователь авторизован
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
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка генерации фото');
      }

      const result = await response.json();
      console.log('API Response:', result);
      console.log('Image URL:', result.image_url);
      console.log('Cloud URL:', result.cloud_url);
      console.log('Image filename:', result.filename);
      
      // Проверяем URL изображения (может быть image_url или cloud_url)
      const imageUrl = result.cloud_url || result.image_url;
      if (!imageUrl) {
        throw new Error('URL изображения не получен от сервера');
      }
      
      // Добавляем новое фото в список
      const filename = result.filename || Date.now().toString();
      const photoId = filename.replace('.png', '').replace('.jpg', ''); // Убираем расширение
      
      const newPhoto = {
        id: photoId,
        url: imageUrl,
        isSelected: false
      };
      
      console.log('New photo object:', newPhoto);
      console.log('Photo URL for display:', newPhoto.url);
      
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
          console.log('[GALLERY] Фото добавлено в галерею пользователя');
        }
      } catch (galleryError) {
        console.warn('[GALLERY] Ошибка добавления в галерею:', galleryError);
      }
      
      // Добавляем новое фото в начало списка
      setGeneratedPhotos(prev => {
        const exists = prev.some(p => p.url === imageUrl);
        if (exists) {
          console.log('Photo already exists in list, skipping');
          return prev;
        }
        const updated = [newPhoto, ...prev];
        console.log('Updated photos list:', updated);
        console.log('Total photos now:', updated.length);
        return updated;
      });
      setSuccess('Фото сгенерировано и добавлено в вашу галерею!');

      await checkAuth();
      
      // НЕ вызываем fetchCharacterPhotos() сразу, так как новое фото еще не сохранено в БД
      // Оно появится после следующей загрузки страницы или после сохранения
      
    } catch (err) {
      generationFailed = true;
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
    } finally {
      setIsGeneratingPhoto(false);
      stopFakeProgress(generationFailed);
    }
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

  const openPhotoModal = (photo: any) => {
    console.log('[MODAL] Opening photo modal for:', photo);
    console.log('[MODAL] Photo URL:', photo.url);
    setSelectedPhotoForView(photo);
    console.log('[MODAL] selectedPhotoForView set');
  };

  const closePhotoModal = () => {
    console.log('[MODAL] Closing photo modal');
    setSelectedPhotoForView(null);
  };

  // Проверка на undefined character
  if (!character) {
    console.error('[EDIT_CHAR] Character is undefined!');
    return (
      <MainContainer>
        <MainContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Ошибка загрузки</h2>
            <p>Персонаж не найден. Пожалуйста, вернитесь к списку персонажей.</p>
            <button onClick={onBackToEditList} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              ← Назад к списку
            </button>
          </div>
        </MainContent>
      </MainContainer>
    );
  }

  // Проверка на undefined formData
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
              <PageTitle>Редактирование: {formData.name || characterIdentifier}</PageTitle>
            </>
          }
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

                {userInfo && (
                  <CoinsDisplay>
                    <CoinsText>Ваши монеты: {userInfo.coins}</CoinsText>
                  </CoinsDisplay>
                )}

                {error && <ErrorMessage>{error}</ErrorMessage>}
                {success && <SuccessMessage>{success}</SuccessMessage>}

                <ButtonGroup>
                  <ActionButton type="submit" disabled={isLoading}>
                    {isLoading ? 'Обновление...' : 'Сохранить изменения'}
                  </ActionButton>
                </ButtonGroup>
              </ColumnContent>
            </LeftColumn>

            <RightColumn>
              <ColumnContent>
                <PhotoGenerationBox>
                  <PhotoGenerationBoxTitle>Генерация фото персонажа</PhotoGenerationBoxTitle>
                  <PhotoGenerationDescription>
                    Сгенерируйте фото для вашего персонажа (30 монет). После генерации выберите до 3 фотографий для главной карточки.
                  </PhotoGenerationDescription>
                  
                  <GenerateSection>
                    <GenerateButton 
                      onClick={generatePhoto}
                      disabled={isGeneratingPhoto || !userInfo || userInfo.coins < 30}
                    >
                      {isGeneratingPhoto ? (
                        <>
                          <LoadingSpinner size="sm" /> Генерация... {fakeProgress}%
                        </>
                      ) : (
                        'Сгенерировать фото (30 монет)'
                      )}
                    </GenerateButton>
                  </GenerateSection>

                  <LargeTextLabel htmlFor="photo-prompt-unified">
                    Промпт для генерации фото:
                  </LargeTextLabel>
                  <LargeTextInput
                    id="photo-prompt-unified"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={`${formData.appearance || ''} ${formData.location || ''}`.trim() || 'portrait, high quality, detailed'}
                  />
                </PhotoGenerationBox>

                  {/* Область для отображения сгенерированных фото */}
                  {console.log('[EDIT_CHAR] Render check - isLoadingPhotos:', isLoadingPhotos, 'photos count:', generatedPhotos?.length || 0)}
                  
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
                            <PhotoTile key={photo?.id || `photo-${index}`}>
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
                      Фотографии будут здесь
                      <div style={{ marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm, color: theme.colors.text.muted }}>
                        Сгенерируйте фото для персонажа или добавьте существующие
                      </div>
                    </PhotoGenerationPlaceholder>
                  )}
              </ColumnContent>
            </RightColumn>
          </Form>
        </MainContent>
      </div>
      
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
              ×
            </PhotoModalClose>
            <PhotoModalImage 
              src={selectedPhotoForView.url} 
              alt="Generated photo full size"
              onLoad={() => console.log('[MODAL] Image loaded in modal:', selectedPhotoForView.url)}
              onError={() => console.error('[MODAL] Error loading image in modal:', selectedPhotoForView.url)}
            />
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
