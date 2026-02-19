import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlusCircle, FiEdit, FiClock, FiHeart, FiGrid, FiMessageSquare,
    FiAlertTriangle, FiUser, FiLogOut, FiBarChart2
} from 'react-icons/fi';
import { Crown } from 'lucide-react';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import Switcher4 from './Switcher4';
import { NSFWWarningModal } from './NSFWWarningModal';
import { useTranslation } from 'react-i18next';

// --- Types ---
interface StaggeredSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    isMobile?: boolean;
    onCreateCharacter?: () => void;
    onEditCharacters?: () => void;
    onHistory?: () => void;
    onFavorites?: () => void;
    onMyCharacters?: () => void;
    onMessages?: () => void;
    onBugReport?: () => void;
    onProfile?: () => void;
    onShop?: () => void;
    isAuthenticated?: boolean;
    isAdmin?: boolean;
    contentMode?: 'safe' | 'nsfw';
    onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
    onRequireAuth?: () => void;
}

// --- Styled Components ---

const SidebarWrapper = styled(motion.div) <{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 226px;
  background: ${props => props.$isOpen ? 'rgba(8, 8, 18, 0.95)' : 'transparent'};
  backdrop-filter: ${props => props.$isOpen ? 'blur(10px)' : 'none'};
  -webkit-backdrop-filter: ${props => props.$isOpen ? 'blur(10px)' : 'none'};
  z-index: 1000;
  border-right: ${props => props.$isOpen ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'};
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: ${props => props.$isOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none'};
  pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};

  @media (max-width: 768px) {
    width: ${props => props.$isOpen ? '100%' : '60px'};
    max-width: ${props => props.$isOpen ? '300px' : '60px'};
  }
`;

const MenuContainer = styled(motion.div)`
  margin-top: 80px;
  padding: 0 10px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

const MenuItem = styled(motion.button) <{ $isActive?: boolean }>`
  background: ${props => props.$isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent'};
  border: 1px solid ${props => props.$isActive ? 'rgba(139, 92, 246, 0.3)' : 'transparent'};
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: ${props => props.$isActive ? '#a78bfa' : 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  overflow: hidden;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
    transform: translateX(4px);
  }

  &:focus {
    outline: none;
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    min-width: 20px;
    font-size: 20px;
  }
`;

const Badge = styled.span`
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
`;

const NSFWContainer = styled(motion.div)`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  white-space: nowrap;
  white-space: nowrap;
`;

// --- Animations ---

const staggerVariants = {
    open: {
        transition: { staggerChildren: 0.07, delayChildren: 0.1 }
    },
    closed: {
        transition: { staggerChildren: 0.05, staggerDirection: -1 }
    }
};

const itemVariants = {
    open: {
        y: 0,
        opacity: 1,
        transition: {
            y: { stiffness: 1000, velocity: -100 }
        }
    },
    closed: {
        y: 50,
        opacity: 0,
        transition: {
            y: { stiffness: 1000 }
        }
    }
};




// --- Component ---

export const StaggeredSidebar: React.FC<StaggeredSidebarProps> = ({
    isOpen,
    onToggle,
    isMobile = false,
    onCreateCharacter,
    onEditCharacters,
    onHistory,
    onFavorites,
    onMyCharacters,
    onMessages,
    onBugReport,
    onProfile,
    onShop,
    isAuthenticated = false,
    isAdmin = false,
    contentMode = 'safe',
    onContentModeChange,
    onRequireAuth,
}) => {
    const { t } = useTranslation();
    // const [isOpen, setIsOpen] = useState(false); // Removed internal state
    const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
    const isNsfw = contentMode === 'nsfw';
    const [checked, setChecked] = useState(isNsfw);
    const [showNSFWWarning, setShowNSFWWarning] = useState(false);
    const [pendingMode, setPendingMode] = useState<'safe' | 'nsfw' | null>(null);

    useEffect(() => {
        setChecked(isNsfw);
    }, [isNsfw]);

    // Load unread messages logic (copied from LeftDockSidebar)
    useEffect(() => {
        const loadUnreadCount = async () => {
            if (!isAuthenticated) {
                setUnreadMessagesCount(0);
                return;
            }
            try {
                const response = await authManager.fetchWithAuth('/api/v1/auth/tip-messages/unread-count/');
                if (response.ok) {
                    const data = await response.json();
                    setUnreadMessagesCount(data.unread_count || 0);
                }
            } catch (error) { }
        };

        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000);
        const handleMessagesRead = () => loadUnreadCount();
        window.addEventListener('tip-messages-read', handleMessagesRead);
        return () => {
            clearInterval(interval);
            window.removeEventListener('tip-messages-read', handleMessagesRead);
        };
    }, [isAuthenticated]);

    const handleToggleChange = (nextChecked: boolean) => {
        console.log('Sidebar: handleToggleChange', nextChecked, isAuthenticated);
        if (!isAuthenticated) {
            console.log('Sidebar: Auth required');
            onRequireAuth?.();
            return;
        }
        if (nextChecked && !isNsfw) {
            console.log('Sidebar: Show warning');
            setPendingMode('nsfw');
            setShowNSFWWarning(true);
        } else {
            console.log('Sidebar: Set checked', nextChecked);
            setChecked(nextChecked);
            onContentModeChange?.(nextChecked ? 'nsfw' : 'safe');
        }
    };

    const menuItems = [
        { icon: <FiPlusCircle />, label: t('sidebar.createCharacter'), onClick: onCreateCharacter },
        { icon: <FiEdit />, label: t('sidebar.editCharacters'), onClick: onEditCharacters },
        { icon: <FiClock />, label: t('sidebar.history'), onClick: onHistory },
        { icon: <FiHeart />, label: t('sidebar.favorites'), onClick: onFavorites },
        { icon: <FiGrid />, label: t('sidebar.myCharacters'), onClick: onMyCharacters },
        ...(isAuthenticated && onMessages ? [{
            icon: <FiMessageSquare />,
            label: t('sidebar.messages'),
            onClick: onMessages,
            badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined
        }] : []),
        { icon: <FiAlertTriangle />, label: t('sidebar.bugReport'), onClick: onBugReport },
        ...(isAuthenticated && isAdmin ? [{
            icon: <FiBarChart2 />,
            label: t('nav.adminLogs'),
            onClick: () => window.dispatchEvent(new CustomEvent('navigate-to-admin-logs'))
        }] : []),
        ...(isAuthenticated && onProfile ? [{ icon: <FiUser />, label: t('sidebar.profile'), onClick: onProfile }] : []),
        ...(onShop ? [{
            icon: <Crown color="#22d3ee" style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.8))' }} />,
            label: t('sidebar.shop'),
            onClick: onShop
        }] : []),
    ];


    // ... (inside StaggeredSidebar component)

    return (
        <>
            <SidebarWrapper
                $isOpen={isOpen}
                initial={false}
                animate={isOpen ? "open" : "closed"}
            >

                {onContentModeChange && (
                    <NSFWContainer variants={itemVariants} style={{ marginTop: '70px', marginBottom: '10px' }}>
                        <Switcher4 checked={checked} onToggle={handleToggleChange} variant="pink" />
                        {isOpen && (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                color: checked ? '#ec4899' : 'rgba(255,255,255,0.5)'
                            }}>
                                NSFW 18+
                            </span>
                        )}
                    </NSFWContainer>
                )}

                <MenuContainer variants={staggerVariants} style={{ marginTop: onContentModeChange ? '10px' : '80px' }}>
                    {menuItems.map((item, index) => (
                        <MenuItem
                            key={index}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (item.onClick) item.onClick();
                                if (isMobile) onToggle();
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px' }}>
                                {item.icon}
                            </div>
                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                            {item.badge && <Badge>{item.badge}</Badge>}
                        </MenuItem>
                    ))}
                </MenuContainer>


            </SidebarWrapper>

            {showNSFWWarning && (
                <NSFWWarningModal
                    onConfirm={() => {
                        setShowNSFWWarning(false);
                        if (pendingMode) {
                            setChecked(true);
                            onContentModeChange?.(pendingMode);
                            setPendingMode(null);
                        }
                    }}
                    onCancel={() => {
                        setShowNSFWWarning(false);
                        setPendingMode(null);
                        setChecked(isNsfw);
                    }}
                />
            )}
        </>
    );
};
