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
  background: linear-gradient(to bottom right, rgba(8, 8, 18, 1), rgba(8, 8, 18, 0.95), rgba(100, 100, 100, 0.05));
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
    background: rgba(100, 100, 100, 0.1);
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
    background: rgba(80, 80, 80, 0.1);
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
  background: rgba(22, 33, 62, 0.4);
  backdrop-filter: blur(32px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(150, 150, 150, 0.5);
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(150, 150, 150, 0.5), transparent);
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
  background: linear-gradient(to right, rgba(150, 150, 150, 1), rgba(100, 100, 100, 1), rgba(80, 80, 80, 0.8));
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
    content: '✨';
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
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.xl};
`;

const PhotoModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
`;

const PhotoModalImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
`;

const PhotoModalClose = styled.button`
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: ${theme.fontSize.xl};
  width: 40px;
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

const PhotoStatus = styled.span<{ isSelected?: boolean }>`
  font-size: ${theme.fontSize.xs};
  font-weight: 700;
  color: ${props => props.isSelected
    ? 'rgba(226, 232, 240, 0.95)'
    : 'rgba(148, 163, 184, 0.9)'};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  margin-right: auto;
`;

const FullSizePhotoSlider = styled.div`
  position: relative;
  width: 100%;
  min-height: 420px;
  background: rgba(17, 24, 39, 0.75);
  border-radius: ${theme.borderRadius.xl};
  border: 1px solid rgba(148, 163, 184, 0.18);
  padding: ${theme.spacing.xl};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.45);
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
    $limitReached ? theme.colors.status.warning : theme.colors.text.secondary};
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid ${({ $limitReached }) =>
    $limitReached ? 'rgba(250, 204, 21, 0.35)' : 'rgba(148, 163, 184, 0.2)'};
`;

const PhotoList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.md};
  max-height: 600px;
  overflow-y: auto;
  padding-right: ${theme.spacing.sm};
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
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
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: ${theme.colors.shadow.card};
  background: rgba(15, 23, 42, 0.65);
  transition: ${theme.transition.fast};

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.45);
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  background: linear-gradient(180deg, transparent 0%, rgba(10, 14, 25, 0.95) 85%);
`;

const OverlayActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const OverlayButton = styled.button<{ $variant: 'primary' | 'danger' }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? 'rgba(129, 140, 248, 0.88)'
      : 'rgba(244, 63, 94, 0.88)'};
  color: ${theme.colors.text.primary};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary'
        ? 'rgba(99, 102, 241, 0.95)'
        : 'rgba(225, 29, 72, 0.95)'};
    border-color: rgba(255, 255, 255, 0.28);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const SliderDescription = styled.div`
  margin-top: ${theme.spacing.lg};
  text-align: center;
  padding: ${theme.spacing.lg};
  background: rgba(22, 33, 62, 0.2);
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
  background: rgba(17, 24, 39, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  margin: ${theme.spacing.lg} 0;
  text-align: center;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.45);
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
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.9), rgba(17, 24, 39, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.45);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(226, 232, 240, 0.35);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.55);

    &::before {
      left: 100%;
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
  }
`;

const LargeTextInput = styled.textarea`
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(148, 163, 184, 0.22);
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
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25);
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(226, 232, 240, 0.35);
    box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.25), inset 0 2px 6px rgba(0, 0, 0, 0.25);
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number} | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [characterIdentifier, setCharacterIdentifier] = useState(character.name);
  type SelectedPhoto = { id: string; url: string };
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
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
    setCharacterIdentifier(character.name);
  }, [character.name]);

  const fetchCharacterPhotos = useCallback(async (targetName?: string) => {
    const effectiveName = (targetName ?? characterIdentifier)?.trim();
    if (!effectiveName) {
      return;
    }
    try {
      const response = await authManager.fetchWithAuth(API_CONFIG.CHARACTER_PHOTOS_FULL(effectiveName), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to load character photos:', response.status);
        return;
      }

      const photos = await response.json();
      if (!Array.isArray(photos)) {
        return;
      }

      const formattedPhotos = photos.map((photo: any) => ({
        id: photo.id?.toString() ?? String(Date.now()),
        url: photo.url,
        isSelected: Boolean(photo.is_main),
        created_at: photo.created_at ?? null
      }));

      setGeneratedPhotos(formattedPhotos);
      setSelectedPhotos(
        formattedPhotos
          .filter(photo => photo.isSelected)
          .slice(0, 3)
          .map(photo => ({ id: photo.id, url: photo.url }))
      );
    } catch (error) {
      console.error('Error loading character photos:', error);
    }
  }, [characterIdentifier]);

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
      await authManager.fetchWithAuth(API_CONFIG.CHARACTER_SET_PHOTOS_FULL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character_name: characterIdentifier,
          photos: updatedSelection
        })
      });
      setSuccess('Фотографии для карточки обновлены');
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
    fetchCharacterPhotos();

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
  }, [fetchCharacterPhotos]);

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
      console.log('Image filename:', result.filename);
      
      // Проверяем URL изображения
      if (!result.image_url) {
        throw new Error('URL изображения не получен от сервера');
      }
      
      // Добавляем новое фото в список
      const filename = result.filename || Date.now().toString();
      const photoId = filename.replace('.png', '').replace('.jpg', ''); // Убираем расширение
      
      const newPhoto = {
        id: photoId,
        url: result.image_url,
        isSelected: false
      };
      
      console.log('New photo object:', newPhoto);
      console.log('Photo URL for display:', newPhoto.url);
      
      setGeneratedPhotos(prev => [...prev, newPhoto]);
      setSuccess('Фото успешно сгенерировано!');

      // Обновляем информацию о пользователе
      await checkAuth();
      
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
    console.log('Opening photo modal for:', photo);
    setSelectedPhotoForView(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhotoForView(null);
  };

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
                  <PhotoGenerationBoxTitle>Генерация фото для персонажа (30 монет за фото)</PhotoGenerationBoxTitle>
                  <PhotoGenerationDescription>
                    Генерируйте фото для вашего персонажа
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
                        'Сгенерировать фото'
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
                  {console.log('Generated photos count:', generatedPhotos.length)}
                  {console.log('Generated photos:', generatedPhotos)}
                  {generatedPhotos.length > 0 ? (
                    <FullSizePhotoSlider>
                      <GeneratedPhotosHeader>
                        <GeneratedPhotosTitle>Сгенерированные фото</GeneratedPhotosTitle>
                        <PhotosCounter $limitReached={isLimitReached}>
                          {selectedPhotos.length} из {MAX_MAIN_PHOTOS}
                        </PhotosCounter>
                      </GeneratedPhotosHeader>

                      <PhotoList>
                        {generatedPhotos.map((photo) => {
                          const isSelected = Boolean(photo.isSelected);
                          const addDisabled = isSelected || isLimitReached;
                          const removeDisabled = !isSelected;
                          const statusLabel = isSelected
                            ? 'Добавлено в карточку'
                            : isLimitReached
                            ? 'Лимит выбранных фото достигнут'
                            : 'Доступно для добавления';

                          return (
                            <PhotoTile key={photo.id}>
                              <PhotoImage
                                src={photo.url}
                                alt="Generated photo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPhotoModal(photo);
                                }}
                                onError={() => {
                                  console.error('Ошибка загрузки изображения:', photo.url);
                                }}
                              />
                              <PhotoOverlay>
                                <PhotoStatus isSelected={isSelected}>{statusLabel}</PhotoStatus>
                                <OverlayActions>
                                  <OverlayButton
                                    $variant="primary"
                                    disabled={addDisabled}
                                    onClick={() => handleAddPhoto(photo.id)}
                                  >
                                    Добавить
                                  </OverlayButton>
                                  <OverlayButton
                                    $variant="danger"
                                    disabled={removeDisabled}
                                    onClick={() => handleRemovePhoto(photo.id)}
                                  >
                                    Удалить
                                  </OverlayButton>
                                </OverlayActions>
                              </PhotoOverlay>
                            </PhotoTile>
                          );
                        })}
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
                    </PhotoGenerationPlaceholder>
                  )}
              </ColumnContent>
            </RightColumn>
          </Form>
        </MainContent>
      </div>
      
      {/* Модальное окно для просмотра фото в полный размер */}
      {selectedPhotoForView && (
        <PhotoModal onClick={closePhotoModal}>
          <PhotoModalContent onClick={(e) => e.stopPropagation()}>
            <PhotoModalClose onClick={closePhotoModal}>×</PhotoModalClose>
            <PhotoModalImage 
              src={selectedPhotoForView.url} 
              alt="Generated photo full size"
              onLoad={() => console.log('Modal image loaded:', selectedPhotoForView.url)}
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
          onAuthSuccess={({ accessToken, refreshToken }) => {
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
      {console.log('Selected photo for view:', selectedPhotoForView)}
    </MainContainer>
  );
};
