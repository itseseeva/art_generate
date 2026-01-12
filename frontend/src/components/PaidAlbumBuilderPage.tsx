import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { SuccessToast } from './SuccessToast';
import { fetchPromptByImage } from '../utils/prompt';
import { translateToEnglish, translateToRussian } from '../utils/translate';
import { useIsMobile } from '../hooks/useIsMobile';
import { Sparkles, Plus, X, ArrowLeft, Save, Wand2 } from 'lucide-react';

// Animations
const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// Main Container
const PageContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #252525 100%);
  position: relative;
  overflow-x: hidden;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(100, 100, 100, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(120, 120, 120, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 40% 20%, rgba(80, 80, 80, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.header`
  margin-bottom: 2.5rem;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const Title = styled.h1`
  font-size: 2.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #d4d4d8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(212, 212, 216, 0.8);
  font-size: 1.125rem;
  line-height: 1.6;
  max-width: 700px;

  @media (max-width: 768px) {
    font-size: 0.9375rem;
  }
`;

// Two Column Layout
const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 2rem;
  position: relative;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

// Left Column - Generation Controls
const GenerationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const GlassCard = styled.div`
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 1rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
`;

// Model Selection
const ModelSelectWrapper = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(212, 212, 216, 0.9);
  margin-bottom: 0.75rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 0.5);
    box-shadow: 0 0 0 3px rgba(150, 150, 150, 0.1);
  }

  option {
    background: #2a2a2a;
    color: #ffffff;
  }
`;

// Prompt Input with Magic Icon
const PromptWrapper = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const PromptTextarea = styled.textarea`
  width: 100%;
  min-height: 160px;
  padding: 1.25rem 1.25rem 1.25rem 3.5rem;
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 0.9375rem;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::placeholder {
    color: rgba(212, 212, 216, 0.5);
  }

  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 0.8);
    box-shadow: 
      0 0 0 3px rgba(150, 150, 150, 0.2),
      0 0 20px rgba(150, 150, 150, 0.1);
    background: rgba(30, 30, 30, 0.9);
  }
`;

const MagicIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 1.25rem;
  color: rgba(150, 150, 150, 0.7);
  transition: all 0.3s ease;

  ${PromptTextarea}:focus ~ & {
    color: rgba(200, 200, 200, 1);
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const InfoText = styled.p`
  font-size: 0.8125rem;
  color: rgba(212, 212, 216, 0.6);
  margin: 0;
  line-height: 1.5;
`;

// Generate Button
const GenerateButton = styled.button`
  width: 100%;
  padding: 1.125rem 1.5rem;
  background: linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 100%);
  border: none;
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    background: linear-gradient(135deg, #5a5a5a 0%, #7a7a7a 100%);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }
`;

// Photo Grid
const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
`;

const PhotoCard = styled.div<{ $selected?: boolean; $added?: boolean }>`
  position: relative;
  border-radius: 0.875rem;
  overflow: hidden;
  aspect-ratio: 2 / 3;
  background: rgba(30, 30, 30, 0.7);
  border: 2px solid ${props => props.$selected ? 'rgba(150, 150, 150, 0.6)' : 'rgba(255, 255, 255, 0.1)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  animation: ${props => props.$added ? 'none' : 'none'};

  &:hover {
    transform: scale(1.05);
    border-color: ${props => props.$selected ? 'rgba(180, 180, 180, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 10;
  }

  @keyframes addToAlbum {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  ${props => props.$added && `
    animation: addToAlbum 0.4s ease-out;
  `}
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
`;

const PhotoOverlay = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.9) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  height: auto;

  ${PhotoCard}:hover & {
    opacity: 1;
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    opacity: 1;
    background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
    pointer-events: auto;
  }
`;

const OverlayButtons = styled.div`
  display: flex;
  gap: 0.75rem;
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

  &:hover {
    background: ${props => props.$variant === 'primary'
      ? 'rgba(120, 120, 120, 1)'
      : 'rgba(255, 255, 255, 0.25)'};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Right Column - Sticky Album Summary
const AlbumSummaryCard = styled.div`
  position: sticky;
  top: 2rem;
  height: fit-content;
  max-height: calc(100vh - 4rem);
  background: rgba(40, 40, 40, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow-y: auto;

  @media (max-width: 1024px) {
    position: relative;
    top: 0;
    max-height: none;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 1rem;
  }
`;

// Progress Bar
const ProgressContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProgressLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(212, 212, 216, 0.9);
`;

const ProgressCount = styled.span<{ $isFull?: boolean }>`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${props => props.$isFull ? '#d4a574' : '#a0a0a0'};
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9999px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $progress: number; $isFull?: boolean }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background: ${props => props.$isFull 
    ? 'linear-gradient(90deg, #d4a574, #e5b887)'
    : 'linear-gradient(90deg, #6a6a6a, #8a8a8a)'};
  border-radius: 9999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px ${props => props.$isFull ? 'rgba(212, 165, 116, 0.4)' : 'rgba(138, 138, 138, 0.4)'};
`;

const LimitWarning = styled.div`
  font-size: 0.8125rem;
  color: #d4a574;
  padding: 0.75rem;
  background: rgba(212, 165, 116, 0.1);
  border: 1px solid rgba(212, 165, 116, 0.2);
  border-radius: 0.5rem;
  text-align: center;
`;

// Action Buttons
const ActionButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #4a4a4a 0%, #6a6a6a 100%);
  border: none;
  border-radius: 0.75rem;
  color: #ffffff;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
    background: linear-gradient(135deg, #5a5a5a 0%, #7a7a7a 100%);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const GhostButton = styled.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  color: rgba(212, 212, 216, 0.9);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
    color: #ffffff;
    transform: translateY(-1px);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// Selected Photos Grid
const SelectedPhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const SelectedPhotoCard = styled.div`
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  aspect-ratio: 2 / 3;
  border: 2px solid rgba(150, 150, 150, 0.4);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(180, 180, 180, 0.8);
    transform: scale(1.05);
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 24px;
  height: 24px;
  background: rgba(239, 68, 68, 0.9);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;

  &:hover {
    background: rgba(239, 68, 68, 1);
    transform: scale(1.1);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Modal Components (reused from original)
const UpgradeOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const UpgradeModal = styled.div`
  width: min(480px, 90vw);
  background: rgba(40, 40, 40, 0.95);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 0.5rem;
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.5);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const UpgradeTitle = styled.h3`
  margin: 0;
  color: rgba(240, 240, 240, 1);
  font-size: 1.5rem;
  font-weight: 700;
`;

const UpgradeText = styled.p`
  margin: 0;
  color: rgba(160, 160, 160, 1);
  font-size: 0.875rem;
  line-height: 1.6;
`;

const UpgradeActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const PreviewBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(70px);
  -webkit-backdrop-filter: blur(70px);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const PreviewContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    max-width: 100vw;
    max-height: 100vh;
  }
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 95vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);

  @media (max-width: 768px) {
    max-height: 100%;
    width: 100%;
    height: 100%;
    border-radius: 0;
  }
`;

const PreviewClose = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(60, 60, 60, 0.8);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10001;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(80, 80, 80, 0.9);
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.1) rotate(90deg);
  }

  svg {
    width: 20px;
    height: 20px;
  }
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

interface PaidAlbumImage {
  id: string;
  url: string;
  created_at?: string;
}

interface PaidAlbumBuilderPageProps {
  character: {
    name: string;
    display_name?: string;
    appearance?: string;
    location?: string;
  } | null;
  onBackToAlbum: () => void;
  onBackToMain: () => void;
  onBackToChat?: () => void;
  canEditAlbum?: boolean;
  onUpgradeSubscription?: () => void;
}

const MAX_PAID_ALBUM_PHOTOS = 20;

export const PaidAlbumBuilderPage: React.FC<PaidAlbumBuilderPageProps> = ({
  character,
  onBackToAlbum,
  onBackToMain,
  onBackToChat,
  canEditAlbum = false,
  onUpgradeSubscription
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPhotos, setGeneratedPhotos] = useState<PaidAlbumImage[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<PaidAlbumImage[]>([]);
  const [albumLoading, setAlbumLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<PaidAlbumImage | null>(null);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{coins: number, subscription?: {subscription_type?: string}, subscription_type?: string} | null>(null);
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
  const [promptLoadedFromDB, setPromptLoadedFromDB] = useState(false);
  const [addedPhotoId, setAddedPhotoId] = useState<string | null>(null);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationQueueRef = useRef<number>(0); // Счетчик задач в очереди

  // Check subscription and load userInfo
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setUserSubscription(null);
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
          const subscriptionType = userData.subscription?.subscription_type || 
                                  userData.subscription_type || 
                                  'free';
          setUserSubscription(String(subscriptionType).toLowerCase());
          setUserInfo({
            coins: userData.coins || 0,
            subscription: userData.subscription,
            subscription_type: userData.subscription_type
          });
        } else {
          setUserSubscription(null);
          setUserInfo(null);
        }
      } catch (error) {
        setUserSubscription(null);
        setUserInfo(null);
      }
    };

    checkSubscription();
  }, []);

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
    
    const duration = 15000;
    const interval = 300;
    const steps = duration / interval;
    const increment = 100 / steps;
    
    let currentProgress = 0;
    fakeProgressIntervalRef.current = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        if (fakeProgressIntervalRef.current) {
          clearInterval(fakeProgressIntervalRef.current);
          fakeProgressIntervalRef.current = null;
        }
      }
      setFakeProgress(Math.min(100, Math.round(currentProgress)));
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

  // Load character data
  useEffect(() => {
    const loadCharacterData = async () => {
      if (!character?.name) {
        return;
      }

      setPromptLoadedFromDB(false);

      const initialAppearance = character?.appearance || '';
      const initialLocation = character?.location || '';
      
      if (initialAppearance || initialLocation) {
        const initialParts = [initialAppearance, initialLocation].filter(p => p && p.trim());
        const initialPrompt = initialParts.length > 0 ? initialParts.join(' | ') : '';
        if (initialPrompt) {
          setPrompt(initialPrompt);
        }
      }

      try {
        const encodedName = encodeURIComponent(character.name);
        const response = await authManager.fetchWithAuth(`/api/v1/characters/${encodedName}`);
        if (response.ok) {
          const characterData = await response.json();
          
          const appearance = characterData?.appearance || character?.appearance || '';
          const location = characterData?.location || character?.location || '';
          
          const needsAppearanceTranslation = appearance && appearance.trim() && !/[а-яёА-ЯЁ]/.test(appearance);
          const needsLocationTranslation = location && location.trim() && !/[а-яёА-ЯЁ]/.test(location);
          
          let translatedAppearance = appearance;
          let translatedLocation = location;
          
          if (needsAppearanceTranslation || needsLocationTranslation) {
            const translations = await Promise.all([
              needsAppearanceTranslation ? translateToRussian(appearance) : Promise.resolve(appearance),
              needsLocationTranslation ? translateToRussian(location) : Promise.resolve(location)
            ]);
            translatedAppearance = translations[0];
            translatedLocation = translations[1];
          }
          
          const parts = [translatedAppearance, translatedLocation].filter(p => p && p.trim());
          const defaultPrompt = parts.length > 0 ? parts.join(' | ') : '';
          
          if (defaultPrompt) {
            setPrompt(defaultPrompt);
            setPromptLoadedFromDB(true);
          }
        }
      } catch (error) {
        if (character.appearance || character.location) {
          const appearance = character.appearance || '';
          const location = character.location || '';
          
          const needsAppearanceTranslation = appearance && appearance.trim() && !/[а-яёА-ЯЁ]/.test(appearance);
          const needsLocationTranslation = location && location.trim() && !/[а-яёА-ЯЁ]/.test(location);
          
          let translatedAppearance = appearance;
          let translatedLocation = location;
          
          if (needsAppearanceTranslation || needsLocationTranslation) {
            const translations = await Promise.all([
              needsAppearanceTranslation ? translateToRussian(appearance) : Promise.resolve(appearance),
              needsLocationTranslation ? translateToRussian(location) : Promise.resolve(location)
            ]);
            translatedAppearance = translations[0];
            translatedLocation = translations[1];
          }
          
          const parts = [translatedAppearance, translatedLocation].filter(p => p && p.trim());
          const defaultPrompt = parts.length > 0 ? parts.join(' | ') : '';
          
          if (defaultPrompt) {
            setPrompt(defaultPrompt);
            setPromptLoadedFromDB(true);
          }
        }
      }
    };

    loadCharacterData();
  }, [character?.name]);

  useEffect(() => {
    const loadExistingAlbum = async () => {
      if (!character?.name) {
        return;
      }

      try {
        setAlbumLoading(true);
        const encodedName = encodeURIComponent(character.name);
        const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить платный альбом');
        }
        const data = await response.json();
        setSelectedPhotos(Array.isArray(data.images) ? data.images : []);
      } catch (albumError) {
        setError(albumError instanceof Error ? albumError.message : 'Не удалось загрузить платный альбом');
      } finally {
        setAlbumLoading(false);
      }
    };

    loadExistingAlbum();
  }, [character?.name]);

  useEffect(() => {
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

  const waitForGeneration = async (taskId: string, token: string): Promise<PaidAlbumImage | null> => {
    const maxAttempts = 120;
    const delay = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
        
        const resultData = status.result || status.data;
        
        if (status.status === 'SUCCESS' && resultData) {
          const imageUrl = resultData.image_url || resultData.cloud_url || resultData.url || 
                          (Array.isArray(resultData.cloud_urls) && resultData.cloud_urls[0]) ||
                          (Array.isArray(resultData.saved_paths) && resultData.saved_paths[0]);
          const imageId = resultData.image_id || resultData.id || resultData.task_id || resultData.filename || `${Date.now()}-${taskId}`;
          
          if (imageUrl) {
            return {
              id: imageId,
              url: imageUrl,
              created_at: new Date().toISOString()
            };
          }
        } else if (status.status === 'FAILURE') {
          throw new Error(status.error || 'Ошибка генерации изображения');
        } else if (status.status === 'PENDING' || status.status === 'PROGRESS') {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } catch (err) {
        throw err;
      }
    }

    throw new Error('Превышено время ожидания генерации');
  };

  const generateSinglePhoto = async (effectivePrompt: string): Promise<PaidAlbumImage | null> => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Необходимо войти в систему');

    if (!character?.name) {
      throw new Error('Персонаж не выбран');
    }

    const response = await fetch('/api/v1/generate-image/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        character: character.name,
        prompt: effectivePrompt,
        use_default_prompts: false,
        model: selectedModel
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = (data && (data.detail || data.message)) || 'Не удалось сгенерировать изображение';
      throw new Error(message);
    }

    const result = await response.json();
    
    if (result.task_id) {
      const image = await waitForGeneration(result.task_id, token);
      return image;
    } else if (result.image_url || result.cloud_url || result.url) {
      const imageUrl = result.image_url || result.cloud_url || result.url;
      return {
        id: result.image_id || result.id || `${Date.now()}`,
        url: imageUrl,
        created_at: new Date().toISOString()
      };
    } else {
      throw new Error('Сервер не вернул URL изображения или task_id');
    }
  };

  const handleGeneratePhoto = async () => {
    // Определяем тип подписки и максимальное количество задач в очереди
    const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userSubscription;
    let subscriptionType = 'free';
    
    if (rawSubscriptionType) {
      if (typeof rawSubscriptionType === 'string') {
        subscriptionType = rawSubscriptionType.toLowerCase().trim();
      } else {
        subscriptionType = String(rawSubscriptionType).toLowerCase().trim();
      }
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
    if (!userInfo || userInfo.coins < 10) {
      setError('Недостаточно монет! Нужно 10 монет для генерации одного фото.');
      return;
    }

    // Проверяем лимит очереди (текущая генерация + очередь)
    const queueCount = generationQueueRef.current || 0;
    const activeGenerations = (isGenerating ? 1 : 0) + queueCount;
    
    if (activeGenerations >= queueLimit) {
      setError(`Очередь генерации заполнена! Максимум ${queueLimit} задач одновременно (${subscriptionType === 'premium' ? 'PREMIUM' : 'STANDARD'}). Дождитесь завершения текущих генераций.`);
      return;
    }

    // Если уже идет генерация, добавляем в очередь
    if (isGenerating) {
      generationQueueRef.current += 1;
      return;
    }

    // Генерируем одно фото сразу
    setIsGenerating(true);
    setError(null);
    startFakeProgress();

    const processGeneration = async () => {
      let generationFailed = false;
      try {
        let effectivePrompt = prompt.trim();
        if (!effectivePrompt) {
          const parts = [character.appearance, character.location].filter(p => p && p.trim());
          effectivePrompt = parts.length > 0 ? parts.join(' | ') : '';
        }
        
        effectivePrompt = await translateToEnglish(effectivePrompt);
        
        const image = await generateSinglePhoto(effectivePrompt);
        
        stopFakeProgress(false);
        
        if (image) {
          setGeneratedPhotos(prev => [image, ...prev]);
          
          // Обновляем информацию о пользователе (баланс)
          const checkSubscription = async () => {
            try {
              const token = localStorage.getItem('authToken');
              if (token) {
                const response = await fetch('/api/v1/auth/me/', {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                if (response.ok) {
                  const userData = await response.json();
                  setUserInfo({
                    coins: userData.coins || 0,
                    subscription: userData.subscription,
                    subscription_type: userData.subscription_type
                  });
                }
              }
            } catch (error) {
              // Ignore
            }
          };
          await checkSubscription();
        } else {
          throw new Error('Не удалось получить изображение');
        }
      } catch (generateError) {
        generationFailed = true;
        setError(generateError instanceof Error ? generateError.message : 'Не удалось сгенерировать фото');
      } finally {
        setIsGenerating(false);
        stopFakeProgress(generationFailed);
        
        // Если есть задачи в очереди, запускаем следующую
        if (generationQueueRef.current > 0) {
          generationQueueRef.current -= 1;
          // Небольшая задержка перед следующей генерацией
          setTimeout(() => {
            handleGeneratePhoto();
          }, 500);
        }
      }
    };

    processGeneration();
  };

  const togglePhotoSelection = (photo: PaidAlbumImage) => {
    setError(null);
    setSuccess(null);

    const subscriptionType = (userSubscription || '').toLowerCase();
    const hasValidSubscription = subscriptionType === 'standard' || 
                                subscriptionType === 'premium' || 
                                subscriptionType === 'pro' ||
                                subscriptionType === 'standart';
    
    const canEdit = canEditAlbum || hasValidSubscription;

    if (!canEdit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    const exists = selectedPhotos.some(item => item.id === photo.id || item.url === photo.url);
    if (exists) {
      setSelectedPhotos(prev => prev.filter(item => item.id !== photo.id && item.url !== photo.url));
      return;
    }

    if (selectedPhotos.length >= MAX_PAID_ALBUM_PHOTOS) {
      setError(`В платном альбоме может быть не более ${MAX_PAID_ALBUM_PHOTOS} фотографий`);
      return;
    }

    setSelectedPhotos(prev => [...prev, photo]);
    setAddedPhotoId(photo.id);
    setTimeout(() => setAddedPhotoId(null), 400);
  };

  const handleSaveAlbum = async () => {
    if (!character?.name) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodeURIComponent(character.name)}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photos: selectedPhotos
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = (data && (data.detail || data.message)) || 'Не удалось сохранить платный альбом';
        throw new Error(message);
      }

      // Обновляем selectedPhotos из ответа сервера
      const savedPhotos = Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : selectedPhotos);
      setSelectedPhotos(savedPhotos);
      setSuccess('Платный альбом сохранён');
      
      // Перезагружаем альбом с сервера для гарантии актуальности данных
      try {
        const encodedName = encodeURIComponent(character.name);
        const reloadResponse = await authManager.fetchWithAuth(`/api/v1/paid-gallery/${encodedName}`);
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json();
          if (Array.isArray(reloadData.images)) {
            setSelectedPhotos(reloadData.images);
          }
        }
      } catch (reloadError) {
        // Игнорируем ошибку перезагрузки, так как сохранение уже выполнено
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить платный альбом');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = character?.display_name || character?.name || '';
  const progressPercentage = (selectedPhotos.length / MAX_PAID_ALBUM_PHOTOS) * 100;
  const isFull = selectedPhotos.length >= MAX_PAID_ALBUM_PHOTOS;

  const handleOpenPreview = (photo: PaidAlbumImage) => {
    setPreviewPhoto(photo);
  };

  const handleClosePreview = () => {
    setPreviewPhoto(null);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewPhoto) {
        handleClosePreview();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewPhoto]);

  return (
    <PageContainer>
      <ContentWrapper>
        <Header>
          <Title>Платный альбом {displayName}</Title>
          <Subtitle>
            Сгенерируйте новые изображения и выберите до {MAX_PAID_ALBUM_PHOTOS} фотографий для платного альбома персонажа. 
            Если кто-то купит ваш альбом, вы получите 15%
          </Subtitle>
        </Header>

        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

        {isUpgradeModalOpen && (
          <UpgradeOverlay onClick={() => setIsUpgradeModalOpen(false)}>
            <UpgradeModal onClick={(e) => e.stopPropagation()}>
              <UpgradeTitle>Платный альбом недоступен</UpgradeTitle>
              <UpgradeText>
                Добавление фотографий в платный альбом доступно только подписчикам Standard и Premium. 
                Оформите подписку, чтобы получать 15% от продаж.
              </UpgradeText>
              <UpgradeActions>
                <PrimaryButton onClick={() => {
                  setIsUpgradeModalOpen(false);
                  onUpgradeSubscription?.();
                  onBackToMain();
                }}>
                  Оформить подписку
                </PrimaryButton>
                <GhostButton onClick={() => setIsUpgradeModalOpen(false)}>
                  Понятно
                </GhostButton>
              </UpgradeActions>
            </UpgradeModal>
          </UpgradeOverlay>
        )}

        <Layout>
          <GenerationSection>
            <GlassCard>
              <SectionTitle>Генерация изображений</SectionTitle>
              
              <ModelSelectWrapper>
                <Label>Модель генерации</Label>
                <Select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                >
                  <option value="anime-realism">Сочетание аниме и реалистичных текстур</option>
                  <option value="anime">Классический аниме стиль</option>
                  <option value="realism">Максимальная фотореалистичность</option>
                </Select>
              </ModelSelectWrapper>

              <PromptWrapper>
                <PromptTextarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите изображение, которое хотите получить..."
                />
                <MagicIcon>
                  <Wand2 size={20} />
                </MagicIcon>
              </PromptWrapper>

              <InfoText>
                Используйте подробное описание внешности, окружения и атмосферы. 
                Если оставить поле пустым, будут использованы описания персонажа.
              </InfoText>

              <GenerateButton 
                onClick={handleGeneratePhoto} 
                disabled={(() => {
                  if (!userInfo) return true;
                  const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userSubscription;
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
                  const activeGenerations = (isGenerating ? 1 : 0) + queueCount;
                  const hasEnoughCoins = (userInfo?.coins || 0) >= 10;
                  const isQueueFull = activeGenerations >= queueLimit;
                  return isQueueFull || !hasEnoughCoins;
                })()}
              >
                {(() => {
                  const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userSubscription;
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
                  const activeGenerations = (isGenerating ? 1 : 0) + queueCount;
                  const isQueueFull = activeGenerations >= queueLimit;
                  
                  if (isGenerating) {
                    return (
                      <>
                        <LoadingSpinner size="sm" /> Генерация... {fakeProgress}%
                      </>
                    );
                  } else {
                    const baseText = isQueueFull 
                      ? `Сгенерировать фото (10 монет) • Очередь заполнена`
                      : `Сгенерировать фото (10 монет)`;
                    return (
                      <>
                        <Sparkles size={20} /> {baseText}
                      </>
                    );
                  }
                })()}
              </GenerateButton>

              {/* Индикатор очереди генерации */}
              {(() => {
                const rawSubscriptionType = userInfo?.subscription?.subscription_type || userInfo?.subscription_type || userSubscription;
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
                const activeGenerations = Math.min((isGenerating ? 1 : 0) + queueCount, queueLimit);
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
            </GlassCard>

            <GlassCard>
              <SectionTitle>Свежие изображения</SectionTitle>
              {isGenerating && generatedPhotos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <LoadingSpinner text={`Генерация изображения... ${fakeProgress}%`} />
                </div>
              ) : generatedPhotos.length === 0 ? (
                <InfoText style={{ textAlign: 'center', padding: '2rem' }}>
                  Сгенерированные изображения появятся здесь
                </InfoText>
              ) : (
                <PhotoGrid>
                  {generatedPhotos.map(photo => {
                    const isSelected = selectedPhotos.some(item => item.id === photo.id);
                    return (
                      <PhotoCard
                        key={`generated-${photo.id}`}
                        $selected={isSelected}
                        $added={addedPhotoId === photo.id}
                        onClick={() => handleOpenPreview(photo)}
                      >
                        <PhotoImage
                          src={photo.url}
                          alt={displayName}
                          loading="lazy"
                        />
                        <PhotoOverlay
                          onClick={(e) => e.stopPropagation()}
                        >
                          <OverlayButtons>
                            <OverlayButton
                              $variant={isSelected ? 'secondary' : 'primary'}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePhotoSelection(photo);
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
                      </PhotoCard>
                    );
                  })}
                </PhotoGrid>
              )}
            </GlassCard>
          </GenerationSection>

          <AlbumSummaryCard>
            <SectionTitle style={{ marginBottom: '1rem' }}>Альбом</SectionTitle>
            
            <ProgressContainer>
              <ProgressHeader>
                <ProgressLabel>Фотографий в альбоме</ProgressLabel>
                <ProgressCount $isFull={isFull}>
                  {selectedPhotos.length} / {MAX_PAID_ALBUM_PHOTOS}
                </ProgressCount>
              </ProgressHeader>
              <ProgressBarWrapper>
                <ProgressBarFill $progress={progressPercentage} $isFull={isFull} />
              </ProgressBarWrapper>
              {isFull && (
                <LimitWarning>
                  Достигнут лимит. Удалите лишние изображения перед добавлением новых.
                </LimitWarning>
              )}
            </ProgressContainer>

            {albumLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <LoadingSpinner text="Загружаем альбом..." />
              </div>
            ) : selectedPhotos.length === 0 ? (
              <InfoText style={{ textAlign: 'center', padding: '2rem' }}>
                Добавьте первые изображения в платный альбом
              </InfoText>
            ) : (
              <SelectedPhotosGrid>
                {selectedPhotos.map(photo => (
                  <SelectedPhotoCard
                    key={`selected-${photo.id}`}
                    onClick={() => handleOpenPreview(photo)}
                  >
                    <PhotoImage src={photo.url} alt={displayName} />
                    <RemoveButton
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo);
                      }}
                    >
                      <X size={14} />
                    </RemoveButton>
                  </SelectedPhotoCard>
                ))}
              </SelectedPhotosGrid>
            )}

            <ActionButtonGroup>
              <PrimaryButton onClick={handleSaveAlbum} disabled={isSaving || selectedPhotos.length === 0}>
                <Save size={18} />
                {isSaving ? 'Сохраняем...' : 'Сохранить альбом'}
              </PrimaryButton>
              
              {onBackToChat && (
                <GhostButton onClick={() => onBackToChat()}>
                  <ArrowLeft size={18} />
                  Вернуться в чат
                </GhostButton>
              )}
              
              <GhostButton onClick={onBackToMain}>
                <ArrowLeft size={18} />
                На главную
              </GhostButton>
            </ActionButtonGroup>
          </AlbumSummaryCard>
        </Layout>
      </ContentWrapper>

      {success && (
        <SuccessToast
          message={success || ''}
          amount={0}
          onClose={() => setSuccess(null)}
          duration={2500}
        />
      )}

      {previewPhoto && (
        <PreviewBackdrop onClick={handleClosePreview}>
          <PreviewContent onClick={(e) => e.stopPropagation()}>
            <PreviewClose onClick={handleClosePreview}>
              <X size={20} />
            </PreviewClose>
            <PreviewImage src={previewPhoto.url} alt={displayName} />
          </PreviewContent>
        </PreviewBackdrop>
      )}
    </PageContainer>
  );
};
