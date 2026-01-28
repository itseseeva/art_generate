import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiPlusCircle, FiEdit, FiClock, FiHeart, FiGrid, FiHome, FiMessageSquare, FiTrendingUp, FiChevronRight, FiAlertTriangle, FiUser, FiLogIn, FiUserPlus, FiLogOut, FiDollarSign, FiRefreshCw, FiFileText, FiBarChart2 } from 'react-icons/fi';

import Dock, { type DockItemData } from './Dock';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import Switcher4 from './Switcher4';
import { NSFWWarningModal } from './NSFWWarningModal';
import './LeftDockSidebar.css';

interface LeftDockSidebarProps {
  isMobile?: boolean;
  onCreateCharacter?: () => void;
  onEditCharacters?: () => void;
  onHistory?: () => void;
  onFavorites?: () => void;
  onMyCharacters?: () => void;
  onHome?: () => void;
  onMessages?: () => void;
  onBalanceHistory?: () => void;
  onBugReport?: () => void;
  onProfile?: () => void;
  onShop?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
  onRequireAuth?: () => void;
}

const SidebarWrapper = styled.div`
  position: relative;
  height: 100%;
  z-index: 5;
  flex-shrink: 0;
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const SIDEBAR_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SIDEBAR_DURATION = '0.35s';

const SidebarContainer = styled.aside<{ $isCollapsed?: boolean; $isMobile?: boolean }>`
  width: ${props => props.$isCollapsed ? '0' : (props.$isMobile ? '70px' : '76px')};
  min-width: ${props => props.$isCollapsed ? '0' : (props.$isMobile ? '70px' : '76px')};
  height: 100%;
  padding: ${props => props.$isCollapsed ? '0' : '1.5rem 0.25rem 1.5rem 0.5rem'};
  background: rgba(8, 8, 18, 0.95);
  border-right-width: ${props => props.$isCollapsed ? '0' : '1px'};
  border-right-style: solid;
  border-right-color: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1.25rem;
  position: relative;
  overflow: ${props => props.$isCollapsed ? 'hidden' : 'visible'};
  transition:
    width ${SIDEBAR_DURATION} ${SIDEBAR_EASING},
    min-width ${SIDEBAR_DURATION} ${SIDEBAR_EASING},
    padding ${SIDEBAR_DURATION} ${SIDEBAR_EASING},
    border-right-width ${SIDEBAR_DURATION} ${SIDEBAR_EASING};
  z-index: 1000;
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const HomeButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(12, 12, 24, 0.85);
  color: rgba(240, 240, 240, 1);
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    background 0.3s ease;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35),
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  outline: none;
  margin: 0 auto;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(20, 20, 35, 0.95);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  &:hover * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:active {
    transform: scale(0.98);
    border-color: rgba(255, 255, 255, 0.1);
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.2),
      0 15px 35px rgba(0, 0, 0, 0.4);
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:focus {
    outline: none;
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const DockWrapper = styled.div<{ $isMobile?: boolean }>`
  flex: 1;
  width: 100%;
  display: flex !important;
  flex-direction: ${props => props.$isMobile ? 'row' : 'column'};
  align-items: center;
  justify-content: ${props => props.$isMobile ? 'center' : 'flex-start'};
  position: relative;
  gap: 0.8rem;
  overflow: visible;
  margin-top: ${props => props.$isMobile ? '0' : '15%'};
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  &::-webkit-scrollbar {
    width: 0;
    display: none;
  }
  
  &::-webkit-scrollbar-track {
    display: none;
  }
  
  &::-webkit-scrollbar-thumb {
    display: none;
  }
  
  scrollbar-width: none;
  -ms-overflow-style: none;
`;

const ToggleArrowButton = styled.button<{ $isCollapsed?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(12, 12, 24, 0.85);
  color: rgba(240, 240, 240, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    left ${SIDEBAR_DURATION} ${SIDEBAR_EASING},
    transform ${SIDEBAR_DURATION} ${SIDEBAR_EASING},
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
  outline: none;
  z-index: 20;
  position: fixed;
  left: ${props => props.$isCollapsed ? '-8px' : '70px'};
  transform: ${props => props.$isCollapsed ? 'translateY(-50%) rotate(0deg)' : 'translateY(-50%) rotate(180deg)'};
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:hover {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(1.1) rotate(0deg)' : 'translateY(-50%) scale(1.1) rotate(180deg)'};
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(20, 20, 35, 0.95);
    color: rgba(240, 240, 240, 1);
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  &:hover * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:active {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(0.95) rotate(0deg)' : 'translateY(-50%) scale(0.95) rotate(180deg)'};
    outline: none;
    box-shadow: none;
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:focus-visible {
    outline: none;
    box-shadow: none;
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  &:focus {
    outline: none;
    box-shadow: none;
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const SidebarContent = styled.div<{ $isCollapsed?: boolean; $isMobile?: boolean }>`
  width: 100%;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  min-height: 0;
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  visibility: ${props => props.$isCollapsed ? 'hidden' : 'visible'};
  transition:
    opacity ${SIDEBAR_DURATION} ${SIDEBAR_EASING} ${props => props.$isCollapsed ? '0s' : '0.08s'},
    visibility 0s linear ${props => props.$isCollapsed ? SIDEBAR_DURATION : '0s'};
  pointer-events: ${props => props.$isCollapsed ? 'none' : 'auto'};
  position: relative;
  z-index: 1;
  filter: none !important;
  -webkit-filter: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  
  * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

const NSFWToggleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0;
  position: relative;
  width: 100%;
`;

const NSFWToggleLabel = styled.span<{ $isNsfw?: boolean }>`
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.$isNsfw ? '#ff6b9d' : '#f8fafc'};
  text-shadow: ${props => props.$isNsfw 
    ? '0 0 10px rgba(255, 107, 157, 0.8), 0 0 20px rgba(255, 107, 157, 0.6), 0 0 30px rgba(255, 107, 157, 0.4)'
    : '0 0 8px rgba(139, 92, 246, 0.6), 0 0 16px rgba(139, 92, 246, 0.4)'};
  animation: ${props => props.$isNsfw ? 'glowPulse 2s ease-in-out infinite' : 'glowPulseBlue 2s ease-in-out infinite'};
  
  @keyframes glowPulse {
    0%, 100% {
      text-shadow: 
        0 0 10px rgba(255, 107, 157, 0.8),
        0 0 20px rgba(255, 107, 157, 0.6),
        0 0 30px rgba(255, 107, 157, 0.4),
        0 0 40px rgba(255, 107, 157, 0.2);
      color: #ff6b9d;
    }
    50% {
      text-shadow: 
        0 0 15px rgba(255, 107, 157, 1),
        0 0 25px rgba(255, 107, 157, 0.8),
        0 0 35px rgba(255, 107, 157, 0.6),
        0 0 45px rgba(255, 107, 157, 0.4);
      color: #ff8fb3;
    }
  }
  
  @keyframes glowPulseBlue {
    0%, 100% {
      text-shadow: 
        0 0 8px rgba(139, 92, 246, 0.6),
        0 0 16px rgba(139, 92, 246, 0.4),
        0 0 24px rgba(139, 92, 246, 0.2);
      color: #f8fafc;
    }
    50% {
      text-shadow: 
        0 0 12px rgba(139, 92, 246, 0.8),
        0 0 20px rgba(139, 92, 246, 0.6),
        0 0 28px rgba(139, 92, 246, 0.4);
      color: #e0e7ff;
    }
  }
`;

export const LeftDockSidebar: React.FC<LeftDockSidebarProps> = ({
  isMobile = false,
  onCreateCharacter,
  onEditCharacters,
  onHistory,
  onFavorites,
  onMyCharacters,
  onHome,
  onMessages,
  onBalanceHistory,
  onBugReport,
  onProfile,
  onShop,
  onLogin,
  onRegister,
  onLogout,
  isAuthenticated = false,
  isAdmin = false,
  contentMode = 'safe',
  onContentModeChange,
  onRequireAuth,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Панель развернута по умолчанию
  const [arrowTop, setArrowTop] = useState<string>('50%');
  const dockWrapperRef = useRef<HTMLDivElement>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const isNsfw = contentMode === 'nsfw';
  const [checked, setChecked] = useState(isNsfw);
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<'safe' | 'nsfw' | null>(null);

  useEffect(() => {
    setChecked(isNsfw);
  }, [isNsfw]);

  const handleToggleChange = (nextChecked: boolean) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    
    if (nextChecked && !isNsfw) {
      // Показываем предупреждение при переключении на NSFW
      setPendingMode('nsfw');
      setShowNSFWWarning(true);
    } else {
      // Переключение обратно на SAFE не требует подтверждения
      setChecked(nextChecked);
      onContentModeChange?.(nextChecked ? 'nsfw' : 'safe');
    }
  };

  const topDockItems = [
    {
      icon: <FiPlusCircle size={18} />,
      label: 'Создать',
      onClick: () => onCreateCharacter?.(),
    },
    {
      icon: <FiEdit size={18} />,
      label: 'Редактор',
      onClick: () => onEditCharacters?.(),
    },
    {
      icon: <FiClock size={18} />,
      label: 'История',
      onClick: () => onHistory?.(),
    },
    {
      icon: <FiHeart size={18} />,
      label: 'Избранное',
      onClick: () => onFavorites?.(),
    },
  ];

  // Основные кнопки (всегда видимые)
  const mainBottomDockItems: DockItemData[] = [
    {
      icon: <FiGrid size={18} />,
      label: 'Персонажи',
      onClick: () => onMyCharacters?.(),
      className: 'dock-item-characters',
    },
    {
      icon: <FiAlertTriangle size={18} />,
      label: 'Жалоба',
      onClick: () => onBugReport?.(),
      className: 'dock-item-bug',
    },
  ];

  // Добавляем кнопку истории баланса для авторизованных пользователей
  if (isAuthenticated && onBalanceHistory) {
    mainBottomDockItems.push({
      icon: <FiTrendingUp size={18} />,
      label: 'Списания',
      onClick: () => onBalanceHistory?.(),
      className: 'dock-item-balance',
    });
  }

  // Для авторизованных пользователей добавляем Messages
  if (isAuthenticated) {
    if (onMessages) {
      mainBottomDockItems.push({
        icon: <FiMessageSquare size={18} />,
        label: 'Сообщения',
        onClick: () => onMessages?.(),
        className: 'dock-item-messages',
        badgeCount: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      });
    }
  }

  if (isAuthenticated && isAdmin) {
    mainBottomDockItems.push({
      icon: <FiBarChart2 size={18} />,
      label: 'Логи',
      onClick: () => window.dispatchEvent(new CustomEvent('navigate-to-admin-logs')),
      className: 'dock-item-admin-logs',
    });
  }

  // Дополнительные кнопки (скрытые по умолчанию)
  const additionalDockItems = [];

  // Добавляем кнопки из правой верхней панели
  // Профиль - только для авторизованных
  if (isAuthenticated && onProfile) {
    additionalDockItems.push({
      icon: <FiUser size={18} />,
      label: 'Профиль',
      onClick: () => onProfile?.(),
      className: 'dock-item-profile',
    });
  }

  // Магазин - всегда
  if (onShop) {
    additionalDockItems.push({
      icon: <FiDollarSign size={18} color="#facc15" />,
      label: 'Магазин',
      onClick: () => onShop?.(),
      className: 'dock-item-shop',
    });
  }


  // Кнопки авторизации - УДАЛЕНЫ (перенесены в хедер)
  if (!isAuthenticated) {
    // Больше ничего не добавляем
  } else {
    // Кнопка выхода - УДАЛЕНА (перенесена в хедер)
  }

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
      } catch (error) {
      }
    };

    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    const handleMessagesRead = () => {
      loadUnreadCount();
    };

    window.addEventListener('tip-messages-read', handleMessagesRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tip-messages-read', handleMessagesRead);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (dockWrapperRef.current && !isCollapsed) {
      const timeoutId = setTimeout(() => {
        const dockWrapper = dockWrapperRef.current;
        if (!dockWrapper) return;

        const dockPanel = dockWrapper.querySelector('.dock-panel-vertical');
        if (!dockPanel) return;

        const items = dockPanel.querySelectorAll('.dock-item');
        if (items.length === 0) return;

        let charactersElement: Element | null = null;
        let bugReportElement: Element | null = null;

        items.forEach((item) => {
          const label = item.querySelector('.dock-label-vertical')?.textContent?.trim();
          if (label === 'Персонажи' && !charactersElement) {
            charactersElement = item;
          }
        });

        if (charactersElement) {
          let foundCharacters = false;
          items.forEach((item) => {
            if (item === charactersElement) {
              foundCharacters = true;
              return;
            }
            if (foundCharacters && !bugReportElement) {
              const label = item.querySelector('.dock-label-vertical')?.textContent?.trim();
              if (label === 'Жалоба') {
                bugReportElement = item;
              }
            }
          });
        }

        if (charactersElement && bugReportElement) {
          const charactersRect = charactersElement.getBoundingClientRect();
          const bugReportRect = bugReportElement.getBoundingClientRect();

          const spaceStart = charactersRect.bottom;
          const spaceEnd = bugReportRect.top;
          const middleY = (spaceStart + spaceEnd) / 2;

          setArrowTop(`${middleY}px`);
        }
      }, 400);

      return () => clearTimeout(timeoutId);
    }
  }, [isCollapsed, isAuthenticated, onBalanceHistory, onMessages]);

  const allDockItems = [...topDockItems, ...mainBottomDockItems, ...additionalDockItems];

  return (
    <SidebarWrapper className="left-dock-sidebar-root" style={{ height: '100%' }}>
      <ToggleArrowButton
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
        $isCollapsed={isCollapsed}
        style={{
          top: isCollapsed ? '50%' : arrowTop,
          left: isCollapsed ? (isMobile ? '-4px' : '-8px') : (isMobile ? '64px' : '70px')
        }}
      >
        <FiChevronRight size={14} />
      </ToggleArrowButton>
      <SidebarContainer $isCollapsed={isCollapsed} $isMobile={isMobile}>
        <SidebarContent $isCollapsed={isCollapsed} $isMobile={isMobile}>
          <HomeButton onClick={onHome} title="Главная">
            <FiHome size={16} />
          </HomeButton>
          {onContentModeChange && (
            <NSFWToggleWrapper>
              <Switcher4 checked={checked} onToggle={handleToggleChange} variant="pink" />
              <NSFWToggleLabel $isNsfw={checked}>NSFW</NSFWToggleLabel>
            </NSFWToggleWrapper>
          )}
          <DockWrapper ref={dockWrapperRef} $isMobile={false}>
            <Dock
              items={allDockItems}
              vertical={true}
              dockHeight={420}
              panelHeight={58}
              baseItemSize={34}
              magnification={45}
              distance={150}
              spring={{ mass: 0.15, stiffness: 180, damping: 35 }}
              className="left-dock-panel"
              showLabels={false}
            />
          </DockWrapper>
        </SidebarContent>
      </SidebarContainer>
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
            // Возвращаем переключатель в исходное состояние
            setChecked(isNsfw);
          }}
        />
      )}
    </SidebarWrapper>
  );
};

