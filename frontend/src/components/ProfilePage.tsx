import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import SplitText from './SplitText';
import { AuthModal } from './AuthModal';
import { API_CONFIG } from '../config/api';
import { LoadingSpinner } from './LoadingSpinner';
import {
  FiAward as AwardIcon,
  FiTrendingUp as TrendingUpIcon,
  FiGithub as GithubIcon,
  FiMail as MailIcon,
  FiLink as LinkIcon,
  FiCalendar as CalendarIcon,
  FiMapPin as MapPinIcon,
  FiUser as UserIcon,
  FiImage as ImageIcon,
  FiClock as ClockIcon,
  FiDollarSign as CoinsIcon,
  FiAlertCircle as AlertIcon,
  FiShoppingBag as ShopIcon,
  FiUsers as UsersIcon,
  FiMessageSquare as MessageIcon,
  FiArrowRight as ArrowRightIcon,
  FiHome as HomeIcon,
  FiHeart as HeartIcon,
  FiUserPlus as UserPlusIcon,
  FiEdit as EditIcon,
  FiLogIn as LogInIcon,
  FiLogOut as LogOutIcon,
  FiSettings as SettingsIcon,
  FiArrowLeft as ArrowLeftIcon
} from 'react-icons/fi';
import { User, Coins, Crown, History, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { CircularGallery } from './ui/circular-gallery';

const UNLOCKED_USER_GALLERIES_KEY = 'userGalleryUnlocked';

const parseUnlockedGalleries = (raw: string | null): number[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'number') : [];
  } catch {
    return [];
  }
};

const getUnlockedUserGalleries = (): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  return parseUnlockedGalleries(window.localStorage.getItem(UNLOCKED_USER_GALLERIES_KEY));
};

const rememberUnlockedUserGallery = (userId: number): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const current = getUnlockedUserGalleries();
  if (current.includes(userId)) {
    return current;
  }
  const updated = [...current, userId];
  window.localStorage.setItem(UNLOCKED_USER_GALLERIES_KEY, JSON.stringify(updated));
  return updated;
};

const forgetUnlockedUserGallery = (userId: number): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const current = getUnlockedUserGalleries();
  if (!current.includes(userId)) {
    return current;
  }
  const updated = current.filter((storedId) => storedId !== userId);
  window.localStorage.setItem(UNLOCKED_USER_GALLERIES_KEY, JSON.stringify(updated));
  return updated;
};

interface InsufficientCreditsNotificationProps {
  onClose: () => void;
  onOpenShop?: () => void;
  hasShopButton?: boolean;
}

const InsufficientCreditsNotification: React.FC<InsufficientCreditsNotificationProps> = ({
  onClose,
  onOpenShop,
  hasShopButton
}) => {
  useEffect(() => {
    
  }, []);

  return (
    <>
      <NotificationOverlay onClick={onClose} />
      <NotificationContainer $isClosing={false}>
        <NotificationContent>
          <IconWrapper>
            <AlertIcon />
          </IconWrapper>
          <NotificationTitle>Упс! Недостаточно кредитов</NotificationTitle>
          <NotificationMessage>
            Для открытия галереи пользователя необходимо 500 кредитов. 
            У вас недостаточно средств для покупки доступа.
          </NotificationMessage>
          <NotificationButtonGroup>
            {hasShopButton && (
              <NotificationButton onClick={onOpenShop}>
                <ShopIcon />
                Перейти в магазин
              </NotificationButton>
            )}
            <NotificationCancelButton onClick={onClose}>
              Отмена
            </NotificationCancelButton>
          </NotificationButtonGroup>
        </NotificationContent>
      </NotificationContainer>
    </>
  );
};

interface FreeSubscriptionWarningModalProps {
  onClose: () => void;
  onOpenShop?: () => void;
}

const FreeSubscriptionWarningModal: React.FC<FreeSubscriptionWarningModalProps> = ({
  onClose,
  onOpenShop
}) => {
  useEffect(() => {
    
  }, []);

  const handleShopClick = () => {
    if (onOpenShop) {
      onOpenShop();
    }
    onClose();
  };

  return (
    <>
      <NotificationOverlay onClick={onClose} />
      <NotificationContainer $isClosing={false}>
        <NotificationContent $variant="warning">
          <IconWrapper>
            <AlertIcon />
          </IconWrapper>
          <NotificationTitle $variant="warning">Требуется подписка</NotificationTitle>
          <NotificationMessage $variant="warning">
            Для разблокировки галереи пользователя необходима подписка STANDARD или PREMIUM.
            Перейдите в магазин, чтобы оформить подписку.
          </NotificationMessage>
          <NotificationButtonGroup>
            <NotificationButton onClick={handleShopClick} $variant="warning">
              <ShopIcon />
              Магазин
            </NotificationButton>
            <NotificationCancelButton onClick={onClose} $variant="warning">
              Отмена
            </NotificationCancelButton>
          </NotificationButtonGroup>
        </NotificationContent>
      </NotificationContainer>
    </>
  );
};

interface ProfilePageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onOpenUserGallery?: (userId?: number) => void;
  onProfile?: (userId?: number) => void;
  onHome?: () => void;
  onFavorites?: () => void;
  onMyCharacters?: () => void;
  onMessages?: () => void;
  onHistory?: () => void;
  onBalanceHistory?: () => void;
  onCharacterSelect?: (character: any) => void;
  userId?: number; // ID пользователя, профиль которого показывается (если не указан - показывается свой профиль)
}

interface UserInfoResponse {
  id: number;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_admin?: boolean;
  coins: number;
  created_at?: string;
  subscription?: {
    subscription_type?: string;
    status?: string;
    monthly_credits?: number;
    monthly_photos?: number;
    max_message_length?: number;
    used_credits?: number;
    used_photos?: number;
    activated_at?: string;
    expires_at?: string;
  } | null;
}

interface SubscriptionStats {
  subscription_type: string | null;
  monthly_credits: number;
  monthly_photos: number;
  used_credits: number;
  used_photos: number;
  credits_remaining: number;
  photos_remaining: number;
  days_left: number | null;
  is_active: boolean;
}

interface ProfileUpdateMessage {
  user?: UserInfoResponse;
  stats?: SubscriptionStats;
  error?: string;
  timestamp?: string;
}

import { useIsMobile } from '../hooks/useIsMobile';

const MainContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: rgba(20, 20, 20, 1);
`;


const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.xxl};
  background: rgba(20, 20, 20, 1);
`;

const ProfileHeader = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
  padding: ${theme.spacing.xxl};
  margin-bottom: ${theme.spacing.xxl};
  margin-top: -60px;
  backdrop-filter: blur(12px);
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
`;

const UserInfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
`;

const AvatarContainer = styled.div<{ isReadOnly?: boolean }>`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 2px solid rgba(150, 150, 150, 0.3);
  overflow: hidden;
  background: linear-gradient(135deg, rgba(80, 80, 80, 0.3), rgba(100, 100, 100, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize['3xl']};
  font-weight: 700;
  color: rgba(200, 200, 200, 1);
  flex-shrink: 0;
  position: relative;
  cursor: ${({ isReadOnly }) => (isReadOnly ? 'default' : 'pointer')};
  transition: all ${theme.transition.normal};
  
  &:hover {
    border-color: ${({ isReadOnly }) => (isReadOnly ? 'rgba(150, 150, 150, 0.3)' : 'rgba(200, 200, 200, 0.8)')};
    transform: ${({ isReadOnly }) => (isReadOnly ? 'none' : 'scale(1.05)')};
  }
  
  @media (min-width: 768px) {
    width: 200px;
    height: 200px;
  }
`;

const AvatarInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
  font-size: 0;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const UserName = styled.h1`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['3xl']};
  font-weight: 700;
  margin: 0;
  
  @media (min-width: 768px) {
    font-size: ${theme.fontSize['4xl']};
  }
`;

const UserEmail = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
  margin: 0;
`;

const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.xs};
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  background: rgba(80, 80, 80, 0.3);
  border: 1px solid rgba(150, 150, 150, 0.3);
  color: rgba(200, 200, 200, 1);
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
`;

const HeaderActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  flex-shrink: 0;
  align-items: flex-end;
`;

const GalleryButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  align-items: flex-end;
`;

const GalleryButtonDescription = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.secondary};
  text-align: right;
  max-width: 300px;
`;

const GalleryButtonPrice = styled.div`
  font-size: ${theme.fontSize.base};
  color: rgba(200, 200, 200, 1);
  font-weight: 700;
  margin-top: ${theme.spacing.sm};
  padding: ${theme.spacing.sm};
  background: rgba(80, 80, 80, 0.3);
  border-radius: ${theme.borderRadius.md};
  text-align: center;
  border: 1px solid rgba(150, 150, 150, 0.3);
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: rgba(80, 80, 80, 0.8);
  color: rgba(240, 240, 240, 1);
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.normal};
  
  &:hover {
    background: rgba(100, 100, 100, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &.outline {
    background: transparent;
    border: 1px solid rgba(150, 150, 150, 0.3);
    color: rgba(240, 240, 240, 1);
    
    &:hover {
      background: rgba(80, 80, 80, 0.3);
    }
  }
`;

const Section = styled.section`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  margin-bottom: ${theme.spacing.xxl};
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
`;

const SectionSubtitle = styled.p`
  color: ${theme.colors.text.tertiary};
  font-size: ${theme.fontSize.sm};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.xl};
`;

const StatCard = styled.div`
  position: relative;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  min-height: 120px;
  overflow: hidden;
  border: 1px solid rgba(150, 150, 150, 0.3);
  background: linear-gradient(
    135deg,
    rgba(60, 60, 60, 0.5) 0%,
    rgba(50, 50, 50, 0.3) 50%,
    rgba(30, 30, 30, 0.8) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 64px;
  height: 64px;
  border-radius: ${theme.borderRadius.lg};
  background: ${props => props.color || 'rgba(80, 80, 80, 0.3)'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 32px;
    height: 32px;
    color: ${props => props.color?.replace('0.15', '1').replace('0.3', '1') || 'rgba(200, 200, 200, 1)'};
  }
`;

const StatContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const StatValue = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
`;

const StatLabel = styled.span`
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.base};
  font-weight: 500;
`;

const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${theme.spacing.xxl};
  
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const LeftColumn = styled.div`
  margin-left: 0;
  padding-left: 0;
  
  ${Section} {
    max-width: none;
    margin-left: 0;
    margin-right: auto;
  }
`;

const RightColumn = styled.div`
  margin-right: 0;
  padding-right: 0;
  
  ${Section} {
    max-width: none;
    margin-left: auto;
    margin-right: 0;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const ActivityDot = styled.div<{ color?: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.color || theme.colors.accent.primary};
  margin-top: ${theme.spacing.xs};
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const ActivityText = styled.p`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  margin: 0;
  
  span {
    color: ${theme.colors.text.muted};
  }
  
  strong {
    font-weight: 600;
  }
`;

const ActivityTime = styled.span`
  color: ${theme.colors.text.tertiary};
  font-size: ${theme.fontSize.xs};
`;

const SkillsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const SkillBadge = styled.span`
  padding: ${theme.spacing.xs} ${theme.spacing.md};
  background: rgba(80, 80, 80, 0.3);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
`;



const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: ${theme.spacing.lg};
`;

const InfoCard = styled.div`
  background: rgba(40, 40, 40, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const InfoLabel = styled.span`
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.2rem;
`;

const InfoValue = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
`;

const StatDescription = styled.span`
  display: block;
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
`;

const ProgressBarContainer = styled.div`
  margin-top: ${theme.spacing.sm};
  width: 100%;
`;

const ProgressBar = styled.div<{ $percentage: number }>`
  width: 100%;
  height: 8px;
  background: rgba(80, 80, 80, 0.3);
  border-radius: ${theme.borderRadius.full};
  overflow: hidden;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => Math.min(100, Math.max(0, props.$percentage))}%;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.8), rgba(99, 102, 241, 0.8));
    border-radius: ${theme.borderRadius.full};
    transition: width 0.3s ease;
  }
`;

const ProgressText = styled.span`
  display: block;
  margin-top: ${theme.spacing.xs};
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.xs};
`;

const QuickActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.xl};
`;

const QuickActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(60, 60, 60, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 500;
  cursor: pointer;
  transition: all ${theme.transition.normal};
  
  &:hover {
    background: rgba(80, 80, 80, 0.7);
    border-color: rgba(200, 200, 200, 0.5);
    transform: translateX(4px);
  }
  
  svg {
    width: 20px;
    height: 20px;
    color: rgba(200, 200, 200, 0.8);
  }
`;

const QuickActionLabel = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const ErrorBanner = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: ${theme.colors.status.error};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.base};
  text-align: center;
  max-width: 700px;
  margin: ${theme.spacing.xl} auto;
`;

const slideIn = keyframes`
  from {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(0.7);
    opacity: 0;
  }
`;

const NotificationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 99998;
  pointer-events: auto;
`;

const NotificationContainer = styled.div<{ $isClosing: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  animation: ${props => props.$isClosing ? slideOut : slideIn} 0.4s ease-out forwards;
  pointer-events: auto;
`;

const NotificationContent = styled.div<{ $variant?: 'error' | 'warning' }>`
  background: ${props => props.$variant === 'warning' 
    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
    : 'linear-gradient(135deg, rgb(244, 63, 94), rgb(220, 38, 38))'};
  border: ${props => props.$variant === 'warning'
    ? '2px solid rgba(150, 150, 150, 0.3)'
    : '3px solid rgba(244, 63, 94, 0.7)'};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: ${props => props.$variant === 'warning'
    ? '0 20px 60px rgba(0, 0, 0, 0.8), 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
    : '0 20px 60px rgba(244, 63, 94, 0.5), 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'};
  min-width: 450px;
  max-width: 550px;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$variant === 'warning'
      ? 'radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent 70%)'
      : 'radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 70%)'};
    pointer-events: none;
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: ${theme.borderRadius.full};
  margin: 0 auto ${theme.spacing.lg};
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  
  svg {
    color: white;
    width: 40px;
    height: 40px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
`;

const NotificationTitle = styled.h3<{ $variant?: 'error' | 'warning' }>`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.fontSize['2xl']};
  font-weight: 800;
  color: ${props => props.$variant === 'warning' ? '#ffffff' : 'white'};
  text-shadow: ${props => props.$variant === 'warning' 
    ? '0 2px 8px rgba(0, 0, 0, 0.6)'
    : '0 2px 8px rgba(0, 0, 0, 0.4)'};
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
`;

const NotificationMessage = styled.p<{ $variant?: 'error' | 'warning' }>`
  margin: 0 0 ${theme.spacing.xl} 0;
  font-size: ${theme.fontSize.lg};
  color: ${props => props.$variant === 'warning' 
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(255, 255, 255, 0.95)'};
  line-height: 1.7;
  position: relative;
  z-index: 1;
  font-weight: 500;
`;

const NotificationButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xxl};
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  cursor: pointer;
  transition: all ${theme.transition.normal};
  position: relative;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  &:active {
    transform: translateY(-1px) scale(0.98);
  }
  
  svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
`;

const NotificationButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;

const NotificationCancelButton = styled.button<{ $variant?: 'error' | 'warning' }>`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xxl};
  background: ${props => props.$variant === 'warning'
    ? 'rgba(60, 60, 60, 0.6)'
    : 'rgba(255, 255, 255, 0.15)'};
  color: ${props => props.$variant === 'warning'
    ? 'rgba(255, 255, 255, 0.9)'
    : 'rgba(255, 255, 255, 0.9)'};
  border: ${props => props.$variant === 'warning'
    ? '1px solid rgba(150, 150, 150, 0.3)'
    : '2px solid rgba(255, 255, 255, 0.3)'};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.normal};
  position: relative;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: ${props => props.$variant === 'warning'
    ? '0 4px 15px rgba(0, 0, 0, 0.3)'
    : '0 4px 15px rgba(0, 0, 0, 0.2)'};
  
  &:hover {
    background: ${props => props.$variant === 'warning'
      ? 'rgba(80, 80, 80, 0.8)'
      : 'rgba(255, 255, 255, 0.25)'};
    border-color: ${props => props.$variant === 'warning'
      ? 'rgba(150, 150, 150, 0.5)'
      : 'rgba(255, 255, 255, 0.5)'};
    color: white;
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'warning'
      ? '0 6px 20px rgba(0, 0, 0, 0.4)'
      : '0 6px 20px rgba(0, 0, 0, 0.3)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;


const InfoBanner = styled.div`
  background: rgba(60, 60, 60, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.3);
  color: rgba(240, 240, 240, 1);
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  text-align: center;
  max-width: 900px;
  margin: 0 auto ${theme.spacing.xl};
  line-height: 1.6;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.3);
`;

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
};

const EditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const EditField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const EditLabel = styled.label`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const EditInput = styled.input`
  padding: ${theme.spacing.md};
  background: rgba(40, 40, 40, 0.5);
  border: 2px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.base};
  transition: ${theme.transition.fast};
  
  &:focus {
    border-color: rgba(200, 200, 200, 0.8);
    box-shadow: 0 0 0 3px rgba(100, 100, 100, 0.2);
    outline: none;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditButton = styled.button`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(80, 80, 80, 0.8);
  color: rgba(240, 240, 240, 1);
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover:not(:disabled) {
    background: rgba(100, 100, 100, 0.9);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EditButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

const EditMessage = styled.div<{ $error?: boolean }>`
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  background: ${props => props.$error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'};
  color: ${props => props.$error ? theme.colors.error : theme.colors.status.success};
`;

const getInitials = (username?: string | null, email?: string): string => {
  if (username) {
    return username.substring(0, 2).toUpperCase();
  }
  if (email) {
    const parts = email.split('@')[0];
    return parts.substring(0, 2).toUpperCase();
  }
  return 'U';
};

interface EditProfileFormProps {
  userInfo: UserInfoResponse | null;
  authToken: string | null;
  onUpdate: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ userInfo, authToken, onUpdate }) => {
  const [username, setUsername] = useState(userInfo?.username || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'form' | 'code'>('form');

  useEffect(() => {
    if (userInfo) {
      setUsername(userInfo.username || '');
    }
  }, [userInfo]);

  const handleUpdateUsername = async () => {
    if (!authToken || !username.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/update-username/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ username: username.trim() })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка обновления username');
      }
      setMessage({ text: 'Username успешно обновлен', error: false });
      onUpdate();
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка обновления username', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    if (!authToken || !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) return;
    
    // Проверяем, что новый пароль и повтор совпадают
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Новый пароль и повтор не совпадают', error: true });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/request-password-change-with-old/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса смены пароля');
      }
      setPasswordChangeStep('code');
      setMessage({ text: 'Код верификации отправлен на email', error: false });
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка запроса смены пароля', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!authToken || !passwordVerificationCode.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/confirm-password-change-with-code/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ verification_code: passwordVerificationCode.trim() })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка подтверждения смены пароля');
      }
      setMessage({ text: 'Пароль успешно изменен', error: false });
      setPasswordChangeStep('form');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordVerificationCode('');
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка подтверждения смены пароля', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EditForm>
      {message && <EditMessage $error={message.error}>{message.text}</EditMessage>}
      
      <EditField>
        <EditLabel>Имя пользователя</EditLabel>
        <EditInput
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Введите имя пользователя"
          disabled={isLoading}
        />
        <EditButtonGroup>
          <EditButton onClick={handleUpdateUsername} disabled={isLoading || !username.trim()}>
            Сохранить
          </EditButton>
        </EditButtonGroup>
      </EditField>

      <EditField>
        <EditLabel>Смена пароля</EditLabel>
        {passwordChangeStep === 'form' ? (
          <>
            <EditInput
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Старый пароль"
              disabled={isLoading}
            />
            <EditInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новый пароль"
              disabled={isLoading}
              style={{ marginTop: '12px' }}
            />
            <EditInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повтор нового пароля"
              disabled={isLoading}
              style={{ marginTop: '12px' }}
            />
            <EditButtonGroup style={{ marginTop: '12px' }}>
              <EditButton onClick={handleRequestPasswordChange} disabled={isLoading || !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}>
                Готово
              </EditButton>
            </EditButtonGroup>
          </>
        ) : (
          <>
            <EditInput
              type="text"
              value={passwordVerificationCode}
              onChange={(e) => setPasswordVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              disabled={isLoading}
              maxLength={6}
              style={{
                textAlign: 'center',
                letterSpacing: '12px',
                fontSize: '20px',
                fontWeight: 'bold'
              }}
            />
            <EditButtonGroup style={{ marginTop: '12px' }}>
              <EditButton onClick={handleConfirmPasswordChange} disabled={isLoading || !passwordVerificationCode.trim() || passwordVerificationCode.length !== 6}>
                Подтвердить
              </EditButton>
              <EditButton onClick={() => { 
                setPasswordChangeStep('form'); 
                setPasswordVerificationCode('');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }} disabled={isLoading}>
                Отмена
              </EditButton>
            </EditButtonGroup>
          </>
        )}
      </EditField>
    </EditForm>
  );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onBackToMain,
  onShop,
  onCreateCharacter,
  onEditCharacters,
  onOpenUserGallery,
  onProfile,
  onHome,
  onFavorites,
  onMyCharacters,
  onMessages,
  onHistory,
  onBalanceHistory,
  onCharacterSelect,
  userId: profileUserId
}) => {
  
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // Если токена нет, сразу устанавливаем isLoading в false
    const token = localStorage.getItem('authToken');
    return !!token;
  });
  const [error, setError] = useState<string | null>(null);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFreeSubscriptionModalOpen, setIsFreeSubscriptionModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [photosCount, setPhotosCount] = useState<number>(0); // Количество фото в "Моей галерее" (UserGallery)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // ID текущего авторизованного пользователя
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [generatedPhotosCount, setGeneratedPhotosCount] = useState<number>(0); // Количество сгенерированных фото для чужого профиля
  const [currentUserCoins, setCurrentUserCoins] = useState<number | null>(null);
  const [hasUnlockedGallery, setHasUnlockedGallery] = useState(false);
  const [showInsufficientCreditsNotification, setShowInsufficientCreditsNotification] = useState(false);
  const [profileStats, setProfileStats] = useState<{
    characters_count: number;
    messages_count: number;
    created_at: string | null;
  } | null>(null);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0);
  const [rawCharactersData, setRawCharactersData] = useState<any[]>([]);

  const isViewingOwnProfile = !profileUserId || (currentUserId !== null && profileUserId === currentUserId);
  const isMobile = useIsMobile();
  
  // Загрузка персонажей пользователя
  const loadUserCharacters = useCallback(async () => {
    if (!authToken || !isViewingOwnProfile) {
      setUserCharacters([]);
      return;
    }

    try {
      const token = authToken;
      
      // Получаем ID текущего пользователя
      const userResponse = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        return;
      }

      const userData = await userResponse.json();
      const currentUserIdValue = userData?.id;
      
      if (!currentUserIdValue) {
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const charactersData = await response.json();
        
        if (!Array.isArray(charactersData)) {
          setUserCharacters([]);
          return;
        }
        
        // Фильтруем только персонажей текущего пользователя
        const myCharacters = charactersData.filter((char: any) => {
          if (!char || !char.id) {
            return false;
          }
          return Number(char.user_id) === Number(currentUserIdValue);
        });
        
        // Загружаем фото из main_photos
        const photosMap: Record<string, string[]> = {};
        
        for (const char of myCharacters) {
          if (!char || !char.main_photos) {
            continue;
          }

          const canonicalName = char.name || char.display_name;
          if (!canonicalName) {
            continue;
          }

          let parsedPhotos: any[] = [];

          if (Array.isArray(char.main_photos)) {
            parsedPhotos = char.main_photos;
          } else if (typeof char.main_photos === 'string') {
            try {
              parsedPhotos = JSON.parse(char.main_photos);
            } catch (e) {
              
              parsedPhotos = [];
            }
          } else {
            parsedPhotos = [char.main_photos];
          }

          const normalizedKey = canonicalName.toLowerCase();
          const photoUrls = parsedPhotos
            .map((photo: any) => {
              if (!photo) {
                return null;
              }

              if (typeof photo === 'string') {
                return photo.startsWith('http')
                  ? photo
                  : `/static/photos/${normalizedKey}/${photo}.png`;
              }

              if (photo.url) {
                return photo.url;
              }

              if (photo.id) {
                return `/static/photos/${normalizedKey}/${photo.id}.png`;
              }

              return null;
            })
            .filter((url): url is string => Boolean(url));

          if (photoUrls.length) {
            photosMap[normalizedKey] = photoUrls;
          }
        }
        
        // Сохраняем raw данные персонажей
        setRawCharactersData(myCharacters);
        
        // Форматируем персонажей для CircularGallery
        const formattedCharacters = myCharacters
          .filter((char: any) => char && char.id != null)
          .map((char: any) => {
            const normalizedKey = (char.name || char.display_name || '').toLowerCase();
            const charName = char.name || char.display_name || 'Unknown';
            return {
              id: String(char.id || ''),
              name: charName,
              photos: photosMap[normalizedKey] || [],
            };
          });
        
        setUserCharacters(formattedCharacters);
        setSelectedCharacterIndex(0); // Сбрасываем индекс при загрузке новых персонажей
      }
    } catch (error) {
      
      setUserCharacters([]);
    }
  }, [authToken, isViewingOwnProfile]);
  const viewedUserName = userInfo?.username || userInfo?.email?.split('@')[0] || 'Пользователь';

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectionIdRef = useRef(0);
  const isUploadingRef = useRef(false);

  const hasAuthToken = Boolean(authToken);

  useEffect(() => {
    if (!profileUserId) {
      setHasUnlockedGallery(true);
      return;
    }
    const unlocked = getUnlockedUserGalleries();
    setHasUnlockedGallery(unlocked.includes(profileUserId));
  }, [profileUserId]);

  

  const clearRealtimeConnection = useCallback(() => {
    if (wsRef.current) {
      connectionIdRef.current += 1;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const fetchUserInfo = useCallback(async (token: string) => {
    // Если передан profileUserId, загружаем данные этого пользователя
    // Иначе загружаем данные текущего пользователя
    const url = profileUserId 
      ? `${API_CONFIG.BASE_URL}/api/v1/auth/users/${profileUserId}/`
      : `${API_CONFIG.BASE_URL}/api/v1/auth/me/`;
    
    
    
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      throw new Error('Не удалось загрузить данные пользователя');
    }

    const data = await response.json();
    if (!data) {
        throw new Error('Пустой ответ от сервера');
    }
    
    
    
    setUserInfo(data as UserInfoResponse);
    
    // Если это свой профиль, сохраняем ID текущего пользователя
    if (!profileUserId) {
      
      setCurrentUserId(data.id);
      setCurrentUserCoins(typeof data.coins === 'number' ? data.coins : null);
    }
    
    return data as UserInfoResponse;
  }, [profileUserId]);

  const fetchSubscriptionStats = useCallback(async (token: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/profit/stats/`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось загрузить статистику подписки');
    }

    const data = await response.json();
    setStats(data as SubscriptionStats);
    return data as SubscriptionStats;
  }, []);

  const fetchCurrentUserProfile = useCallback(async () => {
    if (!authToken) {
      return null;
    }
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      setCurrentUserId(data.id);
      setCurrentUserCoins(typeof data.coins === 'number' ? data.coins : null);
      return data as UserInfoResponse;
    } catch (error) {
      
      return null;
    }
  }, [authToken]);

  const loadPhotosCount = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/user-gallery/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPhotosCount(data?.total || 0);
      }
    } catch (error) {
      // Игнорируем ошибки при загрузке количества фото
      
    }
  }, []);

  const fetchProfileStats = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/profile-stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileStats({
          characters_count: data.characters_count || 0,
          messages_count: data.messages_count || 0,
          created_at: data.created_at || null
        });
      }
    } catch (error) {
      
    }
  }, []);


  const unlockUserGallery = useCallback(async (token: string, targetUserId: number) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/unlock-user-gallery/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ user_id: targetUserId })
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.detail || 'Ошибка открытия галереи';
      // Сохраняем статус ошибки для правильной обработки
      const errorWithStatus = new Error(errorMessage);
      (errorWithStatus as any).status = response.status;
      throw errorWithStatus;
    }

    return await response.json();
  }, []);

  const loadGeneratedPhotosCount = useCallback(async (token: string, userId: number) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/user-generated-photos/${userId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedPhotosCount(data.total || 0);
        rememberUnlockedUserGallery(userId);
        setHasUnlockedGallery(true);
      } else if (response.status === 403) {
        // Галерея не разблокирована - сбрасываем локальное кэширование
        forgetUnlockedUserGallery(userId);
        setGeneratedPhotosCount(0);
        setHasUnlockedGallery(false);
      }
    } catch (error) {
      
    }
  }, []);

  const verifyGalleryAccess = useCallback(async (): Promise<boolean> => {
    if (!authToken || !profileUserId) {
      return false;
    }
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/user-generated-photos/${profileUserId}/?limit=1`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        rememberUnlockedUserGallery(profileUserId);
        setHasUnlockedGallery(true);
        return true;
      }

      if (response.status === 403) {
        
        forgetUnlockedUserGallery(profileUserId);
        setHasUnlockedGallery(false);
        return false;
      }

      
      return false;
    } catch (error) {
      
      return false;
    }
  }, [authToken, profileUserId]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    let isMounted = true;

    const handleBalanceUpdate = async () => {
      if (!isMounted) {
        return;
      }
      const currentProfile = await fetchCurrentUserProfile();
      if (!currentProfile || !isMounted) {
        return;
      }

      if (!profileUserId || profileUserId === currentProfile.id) {
        setUserInfo((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            coins: currentProfile.coins
          };
        });
      }

      if (profileUserId && profileUserId !== currentProfile.id) {
        await verifyGalleryAccess();
      }
    };

    window.addEventListener('balance-update', handleBalanceUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('balance-update', handleBalanceUpdate);
    };
  }, [authToken, profileUserId, fetchCurrentUserProfile, verifyGalleryAccess]);

  const handleOpenUserGallery = useCallback(async () => {
    
    
    if (!authToken) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      return;
    }

    if (!profileUserId || isViewingOwnProfile) {
      // Открываем свою галерею
      
      onOpenUserGallery?.();
      return;
    }

    // Загружаем актуальные данные подписки ТЕКУЩЕГО пользователя перед проверкой
    // ВАЖНО: используем /api/v1/auth/me/ для получения данных текущего пользователя,
    // а не fetchUserInfo, который может загружать данные чужого пользователя
    let currentStats = stats;
    let currentUserInfo = userInfo;
    
    if (!currentStats) {
      
      try {
        currentStats = await fetchSubscriptionStats(authToken);
      } catch (error) {
        
      }
    }
    
    // Всегда загружаем данные текущего пользователя через /api/v1/auth/me/
    // чтобы получить правильную информацию о подписке
    if (!currentUserInfo?.subscription?.subscription_type || currentUserInfo?.id !== currentUserId) {
      
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/me/`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
        if (response.ok) {
          const meData = await response.json();
          currentUserInfo = meData;
          
        }
      } catch (error) {
        
      }
    }

    // Проверяем подписку перед разблокировкой
    const subscriptionTypeRaw = currentStats?.subscription_type || currentUserInfo?.subscription?.subscription_type || '';
    const currentSubscription = subscriptionTypeRaw ? subscriptionTypeRaw.toLowerCase() : '';
    
    
    // Проверяем, что подписка есть и она STANDARD или PREMIUM
    const allowedSubscriptions = ['standard', 'premium'];
    if (!currentSubscription || !allowedSubscriptions.includes(currentSubscription)) {
      // Показываем модальное окно ТОЛЬКО для FREE пользователей
      
      setIsFreeSubscriptionModalOpen(true);
      return;
    }

    if (hasUnlockedGallery) {
      
      const hasServerAccess = await verifyGalleryAccess();
      if (hasServerAccess) {
        
        onOpenUserGallery?.(profileUserId);
        return;
      }

      
    }
    
    

    setIsLoadingGallery(true);
    try {
      // Вызываем разблокировку - бэкенд проверит баланс, подписку и списал кредиты
      await unlockUserGallery(authToken, profileUserId);
      const updatedProfile = await fetchCurrentUserProfile();
      rememberUnlockedUserGallery(profileUserId);
      setHasUnlockedGallery(true);
      
      // Диспатчим событие обновления баланса с данными
      if (updatedProfile && updatedProfile.coins !== undefined) {
        
        window.dispatchEvent(new CustomEvent('balance-update', { detail: { coins: updatedProfile.coins } }));
      } else {
        setTimeout(() => {
          
          window.dispatchEvent(new Event('balance-update'));
        }, 100);
      }

      if (onOpenUserGallery) {
        // Передаем profileUserId чтобы открыть галерею именно этого пользователя
        onOpenUserGallery(profileUserId);
      }
    } catch (error: any) {
      
      // Если ошибка связана с недостатком кредитов (400 статус или сообщение содержит ключевые слова), показываем стильное уведомление
      const isInsufficientCredits = error.status === 400 || 
        (error.message && (
          error.message.toLowerCase().includes('кредит') || 
          error.message.toLowerCase().includes('баланс') || 
          error.message.toLowerCase().includes('недостаточно') ||
          error.message.toLowerCase().includes('insufficient') ||
          error.message.toLowerCase().includes('balance')
        ));
      
      // Если ошибка связана с подпиской (403 статус)
      const isSubscriptionError = error.status === 403 || 
        (error.message && (
          error.message.toLowerCase().includes('подписк') ||
          error.message.toLowerCase().includes('subscription') ||
          error.message.toLowerCase().includes('standard') ||
          error.message.toLowerCase().includes('premium')
        ));
      
      if (isSubscriptionError) {
        // Показываем модальное окно для ошибок подписки
        setIsFreeSubscriptionModalOpen(true);
      } else if (isInsufficientCredits) {
        
        setShowInsufficientCreditsNotification(true);
      } else {
        // Для других ошибок показываем уведомление о недостатке кредитов
        
        setShowInsufficientCreditsNotification(true);
      }
    } finally {
      setIsLoadingGallery(false);
    }
  }, [
    authToken,
    profileUserId,
    unlockUserGallery,
    onOpenUserGallery,
    hasUnlockedGallery,
    currentUserCoins,
    fetchCurrentUserProfile,
    isViewingOwnProfile,
    verifyGalleryAccess,
    stats,
    userInfo,
    onShop
  ]);



  useEffect(() => {
    const handleGalleryUpdate = () => {
      if (authToken) {
        loadPhotosCount(authToken);
      }
    };

    window.addEventListener('gallery-update', handleGalleryUpdate);
    return () => window.removeEventListener('gallery-update', handleGalleryUpdate);
  }, [authToken, loadPhotosCount]);

  const loadProfileData = useCallback(async () => {
    if (!authToken) {
      setUserInfo(null);
      setStats(null);
      setIsLoading(false);
      setPhotosCount(0);
      setGeneratedPhotosCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
    // Если это чужой профиль, сначала загружаем ID текущего пользователя
    let myUserId: number | null = null;
    if (profileUserId) {
        try {
      const myProfileData = await fetchCurrentUserProfile();
      myUserId = myProfileData?.id ?? null;
        } catch (error) {
          
          // Продолжаем загрузку даже если не удалось получить ID текущего пользователя
        }
    }

    const results = await Promise.allSettled([
      fetchUserInfo(authToken),
      fetchSubscriptionStats(authToken), // Всегда загружаем статистику текущего пользователя (нужна для проверки подписки при разблокировке галереи)
      profileUserId ? Promise.resolve(null) : loadPhotosCount(authToken), // Фото только для своего профиля
      isViewingOwnProfile ? fetchProfileStats(authToken) : Promise.resolve(null) // Расширенная статистика только для своего профиля
    ]);

    // Если это чужой профиль, загружаем количество сгенерированных фото
    if (profileUserId && myUserId && profileUserId !== myUserId) {
      try {
        await loadGeneratedPhotosCount(authToken, profileUserId);
      } catch (error) {
        
      }
    }

      // Проверяем результат загрузки userInfo (первый промис)
      const userInfoResult = results[0];
      if (userInfoResult.status === 'rejected') {
        const reason = userInfoResult.reason;
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные пользователя');
        // Если не удалось загрузить userInfo, очищаем его
        setUserInfo(null);
      } else if (userInfoResult.status === 'fulfilled' && userInfoResult.value) {
        // Если userInfo успешно загружен, проверяем другие ошибки
        const otherRejectedResult = results.slice(1).find((item) => item.status === 'rejected');
        if (otherRejectedResult && otherRejectedResult.status === 'rejected') {
          const reason = otherRejectedResult.reason;
          // Показываем предупреждение, но не критическую ошибку
          
        }
      setError(null);
      setBalanceRefreshTrigger((prev) => prev + 1);
      } else {
        // Если userInfo не загружен, но и ошибки нет
        setError('Не удалось загрузить данные профиля');
        setUserInfo(null);
    }
    } catch (error) {
      
      setError(error instanceof Error ? error.message : 'Не удалось загрузить данные профиля');
    } finally {
    setIsLoading(false);
    }
  }, [authToken, fetchSubscriptionStats, fetchUserInfo, loadPhotosCount, profileUserId, currentUserId, loadGeneratedPhotosCount, fetchCurrentUserProfile, fetchProfileStats, isViewingOwnProfile]);

  // Логируем изменения profileUserId
  useEffect(() => {
    
  }, [profileUserId]);

  // Загружаем персонажей пользователя
  useEffect(() => {
    if (isViewingOwnProfile && authToken) {
      loadUserCharacters();
    } else {
      setUserCharacters([]);
    }
  }, [isViewingOwnProfile, authToken, loadUserCharacters]);

  const startRealtimeConnection = useCallback(() => {
    if (!authToken || !isViewingOwnProfile) {
      return;
    }

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    clearRealtimeConnection();

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const connectionId = connectionIdRef.current + 1;
    connectionIdRef.current = connectionId;
    // Формируем WebSocket URL на основе текущего домена
    const wsHost = API_CONFIG.BASE_URL 
      ? API_CONFIG.BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : window.location.host;
    const wsUrl = `${protocol}://${wsHost}/api/v1/profile/ws?token=${encodeURIComponent(authToken)}`;
    const socket = new WebSocket(wsUrl);

    wsRef.current = socket;
    setIsLoading(true);

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const message: ProfileUpdateMessage = JSON.parse(event.data);

        if (message.error) {
          setError(message.error);
          return;
        }

        if (message.user) {
          setUserInfo(message.user);
        }

        if (message.stats) {
          setStats(message.stats);
        }

        setError(null);
        setIsLoading(false);
        setBalanceRefreshTrigger((prev) => prev + 1);
      } catch (parseError) {
        
        setError('Не удалось обработать обновление профиля');
      }
    };

    socket.onerror = () => {
      setError('Ошибка соединения с сервером профиля');
    };

    socket.onclose = () => {
      if (connectionId !== connectionIdRef.current) {
        return;
      }

      wsRef.current = null;
      if (!authToken) {
        return;
      }

      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        startRealtimeConnection();
      }, 5000);
    };
  }, [authToken, clearRealtimeConnection, isViewingOwnProfile]);

  useEffect(() => {
    const handleStorage = () => {
      setAuthToken(localStorage.getItem('authToken'));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (authToken) {
      if (isViewingOwnProfile) {
        startRealtimeConnection();
      } else {
        clearRealtimeConnection();
      }
      loadProfileData();
    } else {
      clearRealtimeConnection();
      setUserInfo(null);
      setStats(null);
      setIsLoading(false);
      setError(null);
    }

    return () => {
      clearRealtimeConnection();
    };
  }, [authToken, clearRealtimeConnection, loadProfileData, startRealtimeConnection, isViewingOwnProfile]);

  useEffect(() => {
    if (!hasAuthToken) {
      return;
    }

    const handler = () => {
      loadProfileData();
    };

    window.addEventListener('subscription-update', handler);
    return () => window.removeEventListener('subscription-update', handler);
  }, [hasAuthToken, loadProfileData]);

  const subscriptionType = stats?.subscription_type ?? userInfo?.subscription?.subscription_type ?? '—';
  const photosRemaining = stats?.photos_remaining ?? userInfo?.subscription?.monthly_photos ?? 0;
  const coinBalance = userInfo?.coins ?? 0;

  const renderContent = () => {
    if (!hasAuthToken) {
      return (
        <div className="w-full min-h-screen bg-black p-6 md:p-8 flex items-center justify-center">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-md max-w-md text-center">
          Для просмотра профиля необходимо войти в систему.
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="w-full min-h-screen bg-black p-6 md:p-8 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Загрузка профиля..." />
        </div>
      );
    }

    // Если открыта страница настроек, показываем её
    if (showSettingsPage && isViewingOwnProfile) {
      return (
        <div className="w-full min-h-screen bg-black p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-md">
              {error}
            </div>
          )}
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-lg shadow-pink-500/5"
            >
              <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => setShowSettingsPage(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">Настройки профиля</h2>
                  <p className="text-white/60 text-sm mt-1">Изменить данные учетной записи</p>
                </div>
              </div>
            <EditProfileForm userInfo={userInfo} authToken={authToken} onUpdate={loadProfileData} />
            </motion.div>
          </div>
        </div>
      );
    }

    // Если данные не загрузились, показываем сообщение
    if (!userInfo && !error) {
      return (
        <div className="w-full min-h-screen bg-black p-6 md:p-8 flex items-center justify-center">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-md max-w-md text-center">
          Не удалось загрузить данные профиля. Пожалуйста, обновите страницу.
          </div>
        </div>
      );
    }

    const recentActivities = [
      { action: 'Использовано', item: `${stats?.used_credits ?? 0} кредитов`, time: 'Сегодня', type: 'credits' },
      { action: 'Создано', item: `${stats?.used_photos ?? 0} изображений`, time: 'На этой неделе', type: 'photos' },
      { action: 'Пополнен', item: `баланс на ${coinBalance} монет`, time: 'Недавно', type: 'coins' },
    ].filter(activity => {
      if (activity.type === 'credits') return (stats?.used_credits ?? 0) > 0;
      if (activity.type === 'photos') return (stats?.used_photos ?? 0) > 0;
      return true;
    });


    const subscriptionTypeUpper = subscriptionType && subscriptionType !== '—' ? subscriptionType.toUpperCase() : null;
    const isPremium = subscriptionTypeUpper === 'PREMIUM';
    const progressPercentage = stats?.monthly_credits 
      ? Math.min(100, Math.round((stats.used_credits / stats.monthly_credits) * 100))
      : 0;

    return (
      <div className="w-full min-h-screen bg-black p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 backdrop-blur-md">
            {error}
          </div>
        )}

        {isViewingOwnProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {/* Блок 1 (2x1): Карточка пользователя */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 hover:border-pink-500/30 transition-all duration-300 shadow-lg shadow-pink-500/5"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 ${
                    isPremium 
                      ? 'border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]' 
                      : 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                  } relative ${isViewingOwnProfile ? 'cursor-pointer' : ''}`}>
                {userInfo?.avatar_url ? (
                      <img src={userInfo.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : userInfo?.username || userInfo?.email ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-3xl md:text-4xl font-bold text-white">
                        {getInitials(userInfo.username, userInfo.email)}
                      </div>
                ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                        <User className="w-12 h-12 text-white/70" />
                      </div>
                )}
                {isViewingOwnProfile && (
                      <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                    if (isUploadingRef.current) {
                      e.target.value = '';
                      return;
                    }
                    const file = e.target.files?.[0];
                    if (!file || !authToken) {
                      e.target.value = '';
                      return;
                    }
                    isUploadingRef.current = true;
                    
                    const formData = new FormData();
                    formData.append('avatar', file);
                    try {
                      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/avatar/`, {
                        method: 'POST',
                              headers: { Authorization: `Bearer ${authToken}` },
                        body: formData
                      });
                      if (response.ok) {
                        const data = await response.json();
                        
                        setUserInfo(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
                      } else {
                        const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
                        
                        setError(errorData.detail || 'Не удалось загрузить фото');
                      }
                    } catch (err) {
                      
                      setError('Ошибка при загрузке фото');
                    } finally {
                      isUploadingRef.current = false;
                      e.target.value = '';
                    }
                    }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{viewedUserName}</h1>
                  <p className="text-white/60 mb-4">{userInfo?.email || '—'}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {subscriptionTypeUpper && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                        isPremium
                          ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-300 border border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
                          : 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                      }`}>
                        <Crown className={`w-4 h-4 ${isPremium ? 'text-yellow-400' : 'text-pink-400'}`} />
                        {subscriptionTypeUpper}
                      </div>
                    )}
                    <button
                      onClick={handleOpenUserGallery}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg text-white font-semibold text-sm hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-lg shadow-pink-500/25"
                    >
                      Галерея пользователя
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Блок 2 (1x1): Виджет баланса */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 shadow-lg shadow-pink-500/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                    <Coins className="w-5 h-5 text-pink-400" />
                  </div>
                  <span className="text-white/60 text-sm">Баланс</span>
                </div>
                <div className="text-4xl font-bold text-white mb-2">{coinBalance}</div>
                <div className="text-white/40 text-xs">кредитов</div>
              </div>
                    {onShop && (
                <button
                  onClick={onShop}
                  className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg text-white font-semibold hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-lg shadow-pink-500/25"
                >
                  Пополнить
                </button>
              )}
            </motion.div>

            {/* Блок 3 (1x1): Прогресс подписки */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 shadow-lg shadow-pink-500/5"
            >
              <div className="mb-4">
                <span className="text-white/60 text-sm">Использовано кредитов</span>
                <div className="text-2xl font-bold text-white mt-2">
                  {stats?.used_credits ?? 0} / {stats?.monthly_credits ?? 0}
                </div>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className={`h-full rounded-full ${
                    isPremium
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                      : 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                  }`}
                />
              </div>
              <div className="text-white/40 text-xs mt-2">{progressPercentage}% использовано</div>
            </motion.div>

            {/* Блок 4 (1x1): История транзакций */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 shadow-lg shadow-blue-500/5 cursor-pointer group"
              onClick={onBalanceHistory}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                  <History className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-white/60 text-sm">История транзакций</span>
              </div>
              <div className="text-white/40 text-xs">Просмотр всех операций</div>
            </motion.div>

            {/* Блок 5 (1x1): Выход */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-red-500/50 transition-all duration-300 shadow-lg shadow-red-500/5 cursor-pointer group"
              onClick={() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                setAuthToken(null);
                window.location.reload();
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30 group-hover:bg-red-500/30 transition-colors">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-white/60 text-sm">Выход</span>
              </div>
              <div className="text-white/40 text-xs">Выйти из аккаунта</div>
            </motion.div>

            {/* Блок 6 (3x1): Галерея персонажей */}
            {userCharacters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="md:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 shadow-lg shadow-pink-500/5"
              >
                <div className="flex flex-col items-center gap-4">
                  <h3 className="text-xl font-bold text-white text-center">Персонажи</h3>
                  <CircularGallery
                    items={userCharacters}
                    itemHeight={isMobile ? 220 : 300}
                    itemWidth={isMobile ? 150 : 200}
                    visibleCount={isMobile ? 3 : 5}
                    bend={10}
                    borderRadius={0.22}
                    scrollSpeed={3.4}
                    scrollEase={0.11}
                    onIndexChange={(index) => setSelectedCharacterIndex(index)}
                    onItemClick={(item) => {
                      if (onMyCharacters) {
                        onMyCharacters();
                      }
                    }}
                    className="min-h-[400px]"
                  />
                  {userCharacters.length > 0 && onCharacterSelect && (
                    <button
                      onClick={() => {
                        const selectedItem = userCharacters[selectedCharacterIndex];
                        if (!selectedItem) return;
                        
                        // Находим raw данные выбранного персонажа
                        const rawChar = rawCharactersData.find(
                          (char: any) => String(char.id) === selectedItem.id
                        );
                        
                        if (rawChar) {
                          const charName = rawChar.name || rawChar.display_name || selectedItem.name;
                          const normalizedId = (rawChar.id ?? charName).toString();
                          
                          const character = {
                            id: normalizedId,
                            name: charName,
                            description: rawChar.description || rawChar.character_appearance || 'No description available',
                            avatar: charName.charAt(0).toUpperCase(),
                            photos: selectedItem.photos || [],
                            tags: Array.isArray(rawChar.tags) && rawChar.tags.length ? rawChar.tags : ['User Created'],
                            author: 'User',
                            likes: Number(rawChar.likes) || 0,
                            views: Number(rawChar.views) || 0,
                            comments: Number(rawChar.comments) || 0,
                            is_nsfw: rawChar.is_nsfw === true,
                            raw: rawChar,
                          };
                          
                          onCharacterSelect(character);
                        }
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg text-white font-semibold text-sm hover:from-pink-600 hover:to-rose-700 transition-all duration-200 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40"
                    >
                      В чат
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          userInfo && (
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-lg shadow-pink-500/5"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Информация о пользователе</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-sm mb-2">Имя пользователя</div>
                    <div className="text-white text-lg font-semibold">{viewedUserName}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-sm mb-2">Email</div>
                    <div className="text-white text-lg font-semibold">{userInfo.email ?? '—'}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="text-white/60 text-sm mb-2">Статус</div>
                    <div className="text-white text-lg font-semibold">{userInfo.is_active ? 'Активен' : 'Неактивен'}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-black">
      <div className="content-area vertical flex-1 flex flex-col">
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
          onLogout={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setAuthToken(null);
            window.location.reload();
          }}
          onProfile={() => {
            if (onProfile) {
              onProfile(undefined);
            } else {
              window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { userId: undefined } }));
            }
          }}
          onHome={() => {
            if (onBackToMain) {
              onBackToMain();
            } else {
              window.location.href = '/';
            }
          }}
          onBalance={() => {}}
          refreshTrigger={balanceRefreshTrigger}
        />

        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>

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
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setAuthToken(accessToken);
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
        />
      )}

      {showInsufficientCreditsNotification && (
        <>
          {}
          <InsufficientCreditsNotification
            onClose={() => {
              
              setShowInsufficientCreditsNotification(false);
            }}
            onOpenShop={() => {
              
              setShowInsufficientCreditsNotification(false);
              if (onShop) {
                onShop();
              }
            }}
            hasShopButton={!!onShop}
          />
        </>
      )}
      {isFreeSubscriptionModalOpen && (
        <FreeSubscriptionWarningModal
          onClose={() => {
            setIsFreeSubscriptionModalOpen(false);
          }}
          onOpenShop={() => {
            if (onShop) {
              onShop();
            }
          }}
        />
      )}
    </div>
  );
};
