import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiPlusCircle, FiEdit, FiClock, FiHeart, FiGrid, FiMessageSquare, FiTrendingUp, FiChevronRight, FiAlertTriangle, FiUser, FiLogIn, FiUserPlus, FiLogOut, FiDollarSign, FiRefreshCw, FiFileText, FiBarChart2, FiMenu } from 'react-icons/fi';

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
  padding: ${props => props.$isCollapsed ? '0' : '5rem 0.25rem 1.5rem 0.5rem'};
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
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: transparent;
  color: rgba(240, 240, 240, 0.9);
  border: none;
  display: flex !important;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  outline: none;
  z-index: 10002; /* Above GlobalHeader */
  position: fixed;
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
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: scale(1.05);
  }
  
  &:hover * {
    filter: none !important;
    -webkit-filter: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  &:focus,
  &:focus-visible,
  &:active {
    outline: none;
    box-shadow: none;
  }

  &:active {
    transform: scale(0.95);
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

const rainbowColors = [
  '#ff3366', '#ff6633', '#ffaa33', '#aaff33', '#33ffaa', '#33aaff', '#6633ff', '#ff33aa'
];

const NSFWToggleLabel = styled.span<{ $isNsfw?: boolean }>`
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
  animation: ${props => props.$isNsfw ? 'rainbowGlow 3s ease-in-out infinite' : 'rainbowGlow 4s ease-in-out infinite'};
  
  @keyframes rainbowGlow {
    0% {
      color: ${rainbowColors[0]};
      text-shadow: 0 0 12px ${rainbowColors[0]}b3, 0 0 24px ${rainbowColors[0]}80, 0 0 36px ${rainbowColors[0]}4d;
    }
    14% {
      color: ${rainbowColors[1]};
      text-shadow: 0 0 12px ${rainbowColors[1]}b3, 0 0 24px ${rainbowColors[1]}80, 0 0 36px ${rainbowColors[1]}4d;
    }
    28% {
      color: ${rainbowColors[2]};
      text-shadow: 0 0 12px ${rainbowColors[2]}b3, 0 0 24px ${rainbowColors[2]}80, 0 0 36px ${rainbowColors[2]}4d;
    }
    42% {
      color: ${rainbowColors[3]};
      text-shadow: 0 0 12px ${rainbowColors[3]}b3, 0 0 24px ${rainbowColors[3]}80, 0 0 36px ${rainbowColors[3]}4d;
    }
    57% {
      color: ${rainbowColors[4]};
      text-shadow: 0 0 12px ${rainbowColors[4]}b3, 0 0 24px ${rainbowColors[4]}80, 0 0 36px ${rainbowColors[4]}4d;
    }
    71% {
      color: ${rainbowColors[5]};
      text-shadow: 0 0 12px ${rainbowColors[5]}b3, 0 0 24px ${rainbowColors[5]}80, 0 0 36px ${rainbowColors[5]}4d;
    }
    85% {
      color: ${rainbowColors[6]};
      text-shadow: 0 0 12px ${rainbowColors[6]}b3, 0 0 24px ${rainbowColors[6]}80, 0 0 36px ${rainbowColors[6]}4d;
    }
    100% {
      color: ${rainbowColors[0]};
      text-shadow: 0 0 12px ${rainbowColors[0]}b3, 0 0 24px ${rainbowColors[0]}80, 0 0 36px ${rainbowColors[0]}4d;
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
          top: '14px',
          left: '20px'
        }}
      >
        <FiMenu size={24} />
      </ToggleArrowButton>
      <SidebarContainer $isCollapsed={isCollapsed} $isMobile={isMobile}>
        <SidebarContent $isCollapsed={isCollapsed} $isMobile={isMobile}>
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

