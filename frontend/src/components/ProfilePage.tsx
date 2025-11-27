import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import SplitText from './SplitText';
import { AuthModal } from './AuthModal';
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
  FiShoppingBag as ShopIcon
} from 'react-icons/fi';

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
    console.log('[NOTIFICATION] Уведомление о недостатке кредитов показано');
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

interface ProfilePageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onOpenUserGallery?: (userId?: number) => void;
  onProfile?: (userId?: number) => void;
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

const MainContainer = styled.div`
  width: 100vw;
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

const NotificationContent = styled.div`
  background: linear-gradient(135deg, rgb(244, 63, 94), rgb(220, 38, 38));
  border: 3px solid rgba(244, 63, 94, 0.7);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: 0 20px 60px rgba(244, 63, 94, 0.5), 0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
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
    background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 70%);
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

const NotificationTitle = styled.h3`
  margin: 0 0 ${theme.spacing.md} 0;
  font-size: ${theme.fontSize['2xl']};
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
`;

const NotificationMessage = styled.p`
  margin: 0 0 ${theme.spacing.xl} 0;
  font-size: ${theme.fontSize.lg};
  color: rgba(255, 255, 255, 0.95);
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

const NotificationCancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg} ${theme.spacing.xxl};
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.normal};
  position: relative;
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
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
  const [email, setEmail] = useState(userInfo?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [emailChangeStep, setEmailChangeStep] = useState<'request' | 'confirm'>('request');
  const [passwordChangeStep, setPasswordChangeStep] = useState<'request' | 'verify' | 'confirm'>('request');

  useEffect(() => {
    if (userInfo) {
      setUsername(userInfo.username || '');
      setEmail(userInfo.email || '');
    }
  }, [userInfo]);

  const handleUpdateUsername = async () => {
    if (!authToken || !username.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/update-username/', {
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

  const handleRequestEmailChange = async () => {
    if (!authToken || !email.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/request-email-change/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ new_email: email.trim() })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса смены email');
      }
      setEmailChangeStep('confirm');
      setMessage({ text: 'Код верификации отправлен на новый email', error: false });
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка запроса смены email', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!authToken || !email.trim() || !verificationCode.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/confirm-email-change/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ new_email: email.trim(), verification_code: emailVerificationCode.trim() })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка подтверждения смены email');
      }
      setMessage({ text: 'Email успешно изменен', error: false });
      setEmailChangeStep('request');
      setEmailVerificationCode('');
      onUpdate();
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка подтверждения смены email', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    if (!authToken) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/request-password-change/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса смены пароля');
      }
      setPasswordChangeStep('verify');
      setMessage({ text: 'Код верификации отправлен на email', error: false });
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка запроса смены пароля', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPasswordChangeCode = async () => {
    if (!authToken || !passwordVerificationCode.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/verify-password-change-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ verification_code: passwordVerificationCode.trim() })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка проверки кода');
      }
      setPasswordChangeStep('confirm');
      setMessage({ text: 'Код подтвержден. Теперь введите новый пароль', error: false });
    } catch (error: any) {
      setMessage({ text: error.message || 'Ошибка проверки кода', error: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!authToken || !newPassword.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/confirm-password-change/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка подтверждения смены пароля');
      }
      setMessage({ text: 'Пароль успешно изменен', error: false });
      setPasswordChangeStep('request');
      setNewPassword('');
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
        <EditLabel>Email</EditLabel>
        <EditInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Введите новый email"
          disabled={isLoading || emailChangeStep === 'confirm'}
        />
        {emailChangeStep === 'request' ? (
          <EditButtonGroup>
            <EditButton onClick={handleRequestEmailChange} disabled={isLoading || !email.trim()}>
              Запросить код
            </EditButton>
          </EditButtonGroup>
        ) : (
          <>
            <EditInput
              type="text"
              value={emailVerificationCode}
              onChange={(e) => setEmailVerificationCode(e.target.value)}
              placeholder="Введите код из письма"
              disabled={isLoading}
            />
            <EditButtonGroup>
              <EditButton onClick={handleConfirmEmailChange} disabled={isLoading || !emailVerificationCode.trim()}>
                Подтвердить
              </EditButton>
              <EditButton onClick={() => { setEmailChangeStep('request'); setEmailVerificationCode(''); }} disabled={isLoading}>
                Отмена
              </EditButton>
            </EditButtonGroup>
          </>
        )}
      </EditField>

      <EditField>
        <EditLabel>Новый пароль</EditLabel>
        {passwordChangeStep === 'request' ? (
          <EditButtonGroup>
            <EditButton onClick={handleRequestPasswordChange} disabled={isLoading}>
              Запросить код для смены пароля
            </EditButton>
          </EditButtonGroup>
        ) : passwordChangeStep === 'verify' ? (
          <>
            <EditInput
              type="text"
              value={passwordVerificationCode}
              onChange={(e) => setPasswordVerificationCode(e.target.value)}
              placeholder="Введите код из письма"
              disabled={isLoading}
              autoFocus
            />
            <EditButtonGroup>
              <EditButton onClick={handleVerifyPasswordChangeCode} disabled={isLoading || !passwordVerificationCode.trim()}>
                Проверить код
              </EditButton>
              <EditButton onClick={() => { setPasswordChangeStep('request'); setPasswordVerificationCode(''); }} disabled={isLoading}>
                Отмена
              </EditButton>
            </EditButtonGroup>
          </>
        ) : (
          <>
            <EditInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Введите новый пароль"
              disabled={isLoading}
              autoFocus
            />
            <EditButtonGroup>
              <EditButton onClick={handleConfirmPasswordChange} disabled={isLoading || !newPassword.trim()}>
                Изменить пароль
              </EditButton>
              <EditButton onClick={() => { setPasswordChangeStep('request'); setNewPassword(''); setPasswordVerificationCode(''); }} disabled={isLoading}>
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
  userId: profileUserId
}) => {
  console.log('[PROFILE] ProfilePage rendered with profileUserId:', profileUserId);
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [photosCount, setPhotosCount] = useState<number>(0); // Количество фото в "Моей галерее" (UserGallery)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // ID текущего авторизованного пользователя
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [generatedPhotosCount, setGeneratedPhotosCount] = useState<number>(0); // Количество сгенерированных фото для чужого профиля
  const [currentUserCoins, setCurrentUserCoins] = useState<number | null>(null);
  const [hasUnlockedGallery, setHasUnlockedGallery] = useState(false);
  const [showInsufficientCreditsNotification, setShowInsufficientCreditsNotification] = useState(false);

  const isViewingOwnProfile = !profileUserId || (currentUserId !== null && profileUserId === currentUserId);
  const viewedUserName = userInfo?.username || userInfo?.email?.split('@')[0] || (userInfo?.id ? `user_${userInfo.id}` : 'Пользователь');

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
      ? `http://localhost:8000/api/v1/auth/users/${profileUserId}/`
      : 'http://localhost:8000/api/v1/auth/me/';
    
    console.log('[PROFILE] fetchUserInfo called with profileUserId:', profileUserId);
    console.log('[PROFILE] Fetching from URL:', url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PROFILE] Error fetching user info:', errorText);
      throw new Error('Не удалось загрузить данные пользователя');
    }

    const data = await response.json();
    if (!data) {
        throw new Error('Пустой ответ от сервера');
    }
    console.log('[PROFILE] User data loaded:', data);
    console.log('[PROFILE] User ID:', data.id);
    console.log('[PROFILE] Username:', data.username);
    setUserInfo(data as UserInfoResponse);
    
    // Если это свой профиль, сохраняем ID текущего пользователя
    if (!profileUserId) {
      console.log('[PROFILE] Setting currentUserId to:', data.id);
      setCurrentUserId(data.id);
      setCurrentUserCoins(typeof data.coins === 'number' ? data.coins : null);
    }
    
    return data as UserInfoResponse;
  }, [profileUserId]);

  const fetchSubscriptionStats = useCallback(async (token: string) => {
    const response = await fetch('http://localhost:8000/api/v1/profit/stats/', {
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
      const response = await fetch('http://localhost:8000/api/v1/auth/me/', {
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
      console.error('[PROFILE] Не удалось загрузить данные текущего пользователя:', error);
      return null;
    }
  }, [authToken]);

  const loadPhotosCount = useCallback(async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/user-gallery/', {
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
      console.error('[PROFILE] Ошибка загрузки количества фото:', error);
    }
  }, []);


  const unlockUserGallery = useCallback(async (token: string, targetUserId: number) => {
    const response = await fetch('http://localhost:8000/api/v1/auth/unlock-user-gallery/', {
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
      const response = await fetch(`http://localhost:8000/api/v1/auth/user-generated-photos/${userId}/`, {
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
      console.error('[PROFILE] Ошибка загрузки количества сгенерированных фото:', error);
    }
  }, []);

  const verifyGalleryAccess = useCallback(async (): Promise<boolean> => {
    if (!authToken || !profileUserId) {
      return false;
    }
    try {
      const response = await fetch(`http://localhost:8000/api/v1/auth/user-generated-photos/${profileUserId}/?limit=1`, {
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
        console.warn('[PROFILE] Сервер сообщил, что галерея не разблокирована. Сбрасываем локальный кэш.');
        forgetUnlockedUserGallery(profileUserId);
        setHasUnlockedGallery(false);
        return false;
      }

      console.warn('[PROFILE] Не удалось проверить доступ к галерее, статус:', response.status);
      return false;
    } catch (error) {
      console.error('[PROFILE] Ошибка проверки доступа к галерее:', error);
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
    console.log('[PROFILE] handleOpenUserGallery вызван', { 
      profileUserId, 
      isViewingOwnProfile, 
      hasUnlockedGallery, 
      currentUserCoins,
      authToken: !!authToken 
    });
    
    if (!authToken) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      return;
    }

    if (!profileUserId || isViewingOwnProfile) {
      // Открываем свою галерею
      console.log('[PROFILE] Открываем свою галерею');
      onOpenUserGallery?.();
      return;
    }

    // Проверяем подписку перед разблокировкой
    const subscriptionTypeRaw = stats?.subscription_type || userInfo?.subscription?.subscription_type || '';
    const currentSubscription = subscriptionTypeRaw ? subscriptionTypeRaw.toLowerCase() : '';
    console.log('[PROFILE] Проверка подписки:', { subscriptionTypeRaw, currentSubscription, stats, userInfo });
    // Проверяем, что подписка есть и она STANDARD или PREMIUM
    // subscription_type может быть 'PREMIUM', 'STANDARD' (верхний регистр) или 'premium', 'standard' (нижний)
    const allowedSubscriptions = ['standard', 'premium', 'standart'];
    if (!currentSubscription || !allowedSubscriptions.includes(currentSubscription)) {
      alert('Для разблокировки галереи необходима подписка STANDARD или PREMIUM');
      if (onShop) {
        onShop();
      }
      return;
    }

    if (hasUnlockedGallery) {
      console.log('[PROFILE] Проверяем актуальность разблокированной галереи на сервере');
      const hasServerAccess = await verifyGalleryAccess();
      if (hasServerAccess) {
        console.log('[PROFILE] Галерея подтверждена сервером, открываем');
        onOpenUserGallery?.(profileUserId);
        return;
      }

      console.warn('[PROFILE] Локальный кэш галереи устарел. Требуется повторная разблокировка.');
    }
    
    console.log('[PROFILE] Начинаем разблокировку галереи');

    setIsLoadingGallery(true);
    try {
      // Вызываем разблокировку - бэкенд проверит баланс, подписку и списал кредиты
      await unlockUserGallery(authToken, profileUserId);
      await fetchCurrentUserProfile();
      rememberUnlockedUserGallery(profileUserId);
      setHasUnlockedGallery(true);
      
      // Диспатчим событие обновления баланса
      window.dispatchEvent(new Event('balance-update'));

      if (onOpenUserGallery) {
        // Передаем profileUserId чтобы открыть галерею именно этого пользователя
        onOpenUserGallery(profileUserId);
      }
    } catch (error: any) {
      console.error('[PROFILE] Ошибка при разблокировке галереи:', error);
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
        alert(error.message || 'Для разблокировки галереи необходима подписка STANDARD или PREMIUM');
        if (onShop) {
          onShop();
        }
      } else if (isInsufficientCredits) {
        console.log('[PROFILE] Обнаружена ошибка недостатка кредитов, показываем уведомление');
        setShowInsufficientCreditsNotification(true);
      } else {
        // Для других ошибок показываем alert
        alert(error.message || 'Ошибка при открытии альбома пользователя');
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

    // Если это чужой профиль, сначала загружаем ID текущего пользователя
    let myUserId: number | null = null;
    if (profileUserId) {
      const myProfileData = await fetchCurrentUserProfile();
      myUserId = myProfileData?.id ?? null;
    }

    const results = await Promise.allSettled([
      fetchUserInfo(authToken),
      profileUserId ? Promise.resolve(null) : fetchSubscriptionStats(authToken), // Статистика только для своего профиля
      profileUserId ? Promise.resolve(null) : loadPhotosCount(authToken) // Фото только для своего профиля
    ]);

    // Если это чужой профиль, загружаем количество сгенерированных фото
    if (profileUserId && myUserId && profileUserId !== myUserId) {
      try {
        await loadGeneratedPhotosCount(authToken, profileUserId);
      } catch (error) {
        console.error('[PROFILE] Ошибка загрузки количества фото для чужого профиля:', error);
      }
    }

    const rejectedResult = results.find((item) => item.status === 'rejected');

    if (rejectedResult && rejectedResult.status === 'rejected') {
      const reason = rejectedResult.reason;
      setError(reason instanceof Error ? reason.message : 'Не удалось обновить данные профиля');
    } else {
      setError(null);
      setBalanceRefreshTrigger((prev) => prev + 1);
    }

    setIsLoading(false);
  }, [authToken, fetchSubscriptionStats, fetchUserInfo, loadPhotosCount, profileUserId, currentUserId, loadGeneratedPhotosCount, fetchCurrentUserProfile]);

  // Логируем изменения profileUserId
  useEffect(() => {
    console.log('[PROFILE] profileUserId changed to:', profileUserId);
  }, [profileUserId]);

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
    const socket = new WebSocket(`${protocol}://localhost:8000/api/v1/profile/ws?token=${encodeURIComponent(authToken)}`);

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
        console.error('[PROFILE] Ошибка обработки данных WebSocket:', parseError);
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
        <ErrorBanner>
          Для просмотра профиля необходимо войти в систему.
        </ErrorBanner>
      );
    }

    if (isLoading) {
      return (
        <ErrorBanner>
          Загрузка данных профиля...
        </ErrorBanner>
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


    return (
      <>
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <ProfileHeader>
          <HeaderContent>
            <UserInfoSection>
              <AvatarContainer
                title={isViewingOwnProfile ? 'Нажмите для загрузки фото' : undefined}
                $isReadOnly={!isViewingOwnProfile}
              >
                {userInfo?.avatar_url ? (
                  <AvatarImage src={userInfo.avatar_url} alt="Avatar" />
                ) : userInfo?.username || userInfo?.email ? (
                  <span>{getInitials(userInfo.username, userInfo.email)}</span>
                ) : (
                  <UserIcon />
                )}
                {isViewingOwnProfile && (
                  <AvatarInput
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                    // Защита от двойного вызова
                    if (isUploadingRef.current) {
                      e.target.value = '';
                      return;
                    }
                    
                    const file = e.target.files?.[0];
                    if (!file || !authToken) {
                      // Очищаем input даже если файл не выбран
                      e.target.value = '';
                      return;
                    }
                    
                    // Устанавливаем флаг загрузки
                    isUploadingRef.current = true;
                    
                    console.log('[AVATAR] Начало загрузки аватара:', file.name, file.size, 'байт');
                    
                    const formData = new FormData();
                    formData.append('avatar', file);
                    
                    try {
                      const response = await fetch('http://localhost:8000/api/v1/auth/avatar/', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${authToken}`
                        },
                        body: formData
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log('[AVATAR] Аватар успешно загружен:', data.avatar_url);
                        setUserInfo(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
                        // Не вызываем loadProfileData, так как WebSocket обновит данные автоматически
                      } else {
                        const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
                        console.error('[AVATAR] Ошибка загрузки:', errorData);
                        setError(errorData.detail || 'Не удалось загрузить фото');
                      }
                    } catch (err) {
                      console.error('[AVATAR] Исключение при загрузке:', err);
                      setError('Ошибка при загрузке фото');
                    } finally {
                      // Сбрасываем флаг загрузки и очищаем input
                      isUploadingRef.current = false;
                      e.target.value = '';
                    }
                    }}
                  />
                )}
              </AvatarContainer>
              <UserDetails>
                <UserName>{viewedUserName}</UserName>
                <UserEmail>{userInfo?.email || '—'}</UserEmail>
                {subscriptionType && subscriptionType !== '—' && (
                  <BadgeContainer>
                    <Badge>
                      <AwardIcon />
                      {subscriptionType.toUpperCase()}
                    </Badge>
                  </BadgeContainer>
                )}
              </UserDetails>
            </UserInfoSection>
            <HeaderActions>
              {hasAuthToken && (
                <>
                  {/* Если это свой профиль - показываем "Моя галерея" */}
                  {isViewingOwnProfile && (
                    <GalleryButtonContainer style={{ marginBottom: '1rem' }}>
                      <ActionButton onClick={() => onOpenUserGallery?.()} style={{ background: 'rgba(80, 80, 80, 0.5)' }}>
                        <ImageIcon />
                        Моя галерея ({photosCount} фото)
                      </ActionButton>
                      <GalleryButtonDescription>
                        Просмотр всех ваших сгенерированных фото
                      </GalleryButtonDescription>
                    </GalleryButtonContainer>
                  )}
                  {/* Если это чужой профиль - показываем кнопку для открытия альбома за 500 кредитов */}
                  {profileUserId && currentUserId && profileUserId !== currentUserId && (
                    <GalleryButtonContainer style={{ marginBottom: '1rem' }}>
                      <ActionButton 
                        onClick={(e) => {
                          console.log('[PROFILE] Кнопка "Купить доступ к галерее" нажата');
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenUserGallery();
                        }} 
                        disabled={isLoadingGallery}
                        style={!hasUnlockedGallery ? { background: 'rgba(80, 80, 80, 0.9)' } : undefined}
                      >
                        <ImageIcon />
                        {hasUnlockedGallery
                          ? 'Открыть галерею'
                          : `Купить доступ к галерее за 500 кредитов`}
                      </ActionButton>
                      {!hasUnlockedGallery && (
                        <GalleryButtonPrice>
                          Стоимость открытия: 500 кредитов
                        </GalleryButtonPrice>
                      )}
                      <GalleryButtonDescription>
                        {hasUnlockedGallery
                          ? 'Галерея уже разблокирована. Нажмите, чтобы открыть.'
                          : `Вы откроете доступ ко всем ${generatedPhotosCount} сгенерированным фото пользователя. После покупки галерея будет доступна всегда.`}
                      </GalleryButtonDescription>
                    </GalleryButtonContainer>
                  )}
                </>
              )}
            </HeaderActions>
          </HeaderContent>
        </ProfileHeader>

        {isViewingOwnProfile ? (
          <TwoColumnLayout>
            <div>
              <Section>
                <SectionHeader>
                  <SplitText text="Настройки профиля" delay={25} />
                  <SectionSubtitle>Изменить данные учетной записи</SectionSubtitle>
                </SectionHeader>

                <EditProfileForm userInfo={userInfo} authToken={authToken} onUpdate={loadProfileData} />
              </Section>
            </div>

            <div>
              <Section>
                <StatsGrid>
                  <StatCard>
                    <StatIcon color="rgba(59, 130, 246, 0.15)">
                      <CoinsIcon />
                    </StatIcon>
                    <StatContent>
                      <StatValue>{coinBalance}</StatValue>
                      <StatLabel>Баланс монет</StatLabel>
                      <StatDescription>Обновляется после любого списания или пополнения</StatDescription>
                    </StatContent>
                  </StatCard>

                  <StatCard>
                    <StatIcon color="rgba(80, 80, 80, 0.3)">
                      <ImageIcon />
                    </StatIcon>
                    <StatContent>
                      <StatValue>{photosRemaining}</StatValue>
                      <StatLabel>Генераций фото</StatLabel>
                      <StatDescription>Доступно для создания изображений</StatDescription>
                    </StatContent>
                  </StatCard>

                  <StatCard>
                    <StatIcon color="rgba(34, 197, 94, 0.15)">
                      <ClockIcon />
                    </StatIcon>
                    <StatContent>
                      <StatValue>{stats?.days_left ?? '—'}</StatValue>
                      <StatLabel>Дней до обновления</StatLabel>
                      <StatDescription>Срок действия текущей подписки</StatDescription>
                    </StatContent>
                  </StatCard>
                </StatsGrid>
              </Section>
            </div>

          </TwoColumnLayout>
        ) : (
          userInfo && (
            <Section>
              <SectionHeader>
                <SplitText text="Информация о пользователе" delay={25} />
                <SectionSubtitle>Основные данные создателя персонажа</SectionSubtitle>
              </SectionHeader>
              <InfoGrid>
                <InfoCard>
                  <InfoLabel>Имя пользователя</InfoLabel>
                  <InfoValue>{viewedUserName}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>{userInfo.email ?? '—'}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>ID</InfoLabel>
                  <InfoValue>#{userInfo.id}</InfoValue>
                </InfoCard>
                <InfoCard>
                  <InfoLabel>Статус</InfoLabel>
                  <InfoValue>{userInfo.is_active ? 'Активен' : 'Неактивен'}</InfoValue>
                </InfoCard>
              </InfoGrid>
            </Section>
          )
        )}
      </>
    );
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
          onLogout={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            setAuthToken(null);
            window.location.reload();
          }}
          onProfile={() => {
            // При клике на кнопку профиля в GlobalHeader открываем свой профиль
            console.log('[PROFILE] GlobalHeader onProfile clicked, calling onProfile(undefined)');
            if (onProfile) {
              onProfile(undefined);
            } else {
              // Если onProfile не передан, используем глобальное событие
              window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { userId: undefined } }));
            }
          }}
          onBalance={() => {}}
          refreshTrigger={balanceRefreshTrigger}
        />

        <MainContent>{renderContent()}</MainContent>
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
          onAuthSuccess={({ accessToken, refreshToken }) => {
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
          {console.log('[PROFILE] Рендерим уведомление о недостатке кредитов, showInsufficientCreditsNotification =', showInsufficientCreditsNotification)}
          <InsufficientCreditsNotification
            onClose={() => {
              console.log('[PROFILE] Закрываем уведомление');
              setShowInsufficientCreditsNotification(false);
            }}
            onOpenShop={() => {
              console.log('[PROFILE] Переход в магазин из уведомления');
              setShowInsufficientCreditsNotification(false);
              if (onShop) {
                onShop();
              }
            }}
            hasShopButton={!!onShop}
          />
        </>
      )}
    </MainContainer>
  );
};
