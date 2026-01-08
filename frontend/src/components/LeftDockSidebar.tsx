import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiPlusCircle, FiEdit, FiClock, FiHeart, FiGrid, FiHome, FiMessageSquare, FiTrendingUp, FiChevronRight, FiAlertTriangle, FiUser, FiLogIn, FiUserPlus, FiLogOut, FiShoppingBag, FiBarChart2 } from 'react-icons/fi';
import Switcher4 from './Switcher4';
import { NSFWWarningModal } from './NSFWWarningModal';

import Dock from './Dock';
import { theme } from '../theme';
import './LeftDockSidebar.css';

interface LeftDockSidebarProps {
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
  onLogs?: () => void;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
}

const SidebarWrapper = styled.div`
  position: relative;
  height: 100%;
  z-index: 5;
`;

const SidebarContainer = styled.aside<{ $isCollapsed?: boolean }>`
  width: ${props => props.$isCollapsed ? '0' : '76px'};
  min-width: ${props => props.$isCollapsed ? '0' : '76px'};
  height: 100%;
  padding: ${props => props.$isCollapsed ? '0' : '1.5rem 0.25rem 1.5rem 0.5rem'};
  background: rgba(8, 8, 18, 0.85);
  border-right: ${props => props.$isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'};
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  position: relative;
  overflow: visible;
  transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease, border 0.3s ease;
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

  &:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(20, 20, 35, 0.95);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &:active {
    transform: scale(0.98);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.2),
      0 15px 35px rgba(0, 0, 0, 0.4);
  }

  &:focus {
    outline: none;
  }
`;

const DockWrapper = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  position: relative;
  gap: 0.8rem;
  overflow-y: auto;
  overflow-x: visible;
  overflow: visible;
  margin-top: 15%;
  
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
    transform 0.3s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    left 0.3s ease,
    top 0.3s ease;
  flex-shrink: 0;
  outline: none;
  z-index: 20;
  position: fixed;
  left: ${props => props.$isCollapsed ? '-8px' : '70px'};
  transform: ${props => props.$isCollapsed ? 'translateY(-50%) rotate(0deg)' : 'translateY(-50%) rotate(180deg)'};

  &:hover {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(1.1) rotate(0deg)' : 'translateY(-50%) scale(1.1) rotate(180deg)'};
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(20, 20, 35, 0.95);
    color: rgba(240, 240, 240, 1);
  }

  &:active {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(0.95) rotate(0deg)' : 'translateY(-50%) scale(0.95) rotate(180deg)'};
    outline: none;
    box-shadow: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow: none;
  }
  
  &:focus {
    outline: none;
    box-shadow: none;
  }
`;

const FilterTooltip = styled.div`
  position: absolute;
  top: calc(100% + 10%);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const SwitcherContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.6rem 0;
  margin-top: calc(0.5rem - 4px);
  transform: translateY(-20%);
  position: relative;

  &:hover ${FilterTooltip} {
    opacity: 1;
  }
`;

const SidebarContent = styled.div<{ $isCollapsed?: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  flex: 1;
  overflow: visible;
  overflow-y: auto;
  min-height: 0;
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  visibility: ${props => props.$isCollapsed ? 'hidden' : 'visible'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

export const LeftDockSidebar: React.FC<LeftDockSidebarProps> = ({
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
  onLogs,
  isAuthenticated = false,
  isAdmin = false,
  contentMode = 'safe',
  onContentModeChange,
}) => {
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<'safe' | 'nsfw' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [arrowTop, setArrowTop] = useState<string>('50%');
  const dockWrapperRef = useRef<HTMLDivElement>(null);

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
  const mainBottomDockItems = [
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
      });
    }
  }

  // Дополнительные кнопки (скрытые по умолчанию)
  const additionalDockItems = [];

  // Кнопка Logs - только для админов
  if (isAdmin && onLogs) {
    additionalDockItems.push({
      icon: <FiBarChart2 size={18} />,
      label: 'Logs',
      onClick: () => onLogs?.(),
      className: 'dock-item-logs',
    });
  }

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
      icon: <FiShoppingBag size={18} />,
      label: 'Магазин',
      onClick: () => onShop?.(),
      className: 'dock-item-shop',
    });
  }

  // Кнопки авторизации - для неавторизованных
  if (!isAuthenticated) {
    if (onLogin) {
      additionalDockItems.push({
        icon: <FiLogIn size={18} />,
        label: 'Войти',
        onClick: () => onLogin?.(),
        className: 'dock-item-login',
      });
    }
    if (onRegister) {
      additionalDockItems.push({
        icon: <FiUserPlus size={18} />,
        label: 'Регистрация',
        onClick: () => onRegister?.(),
        className: 'dock-item-register',
      });
    }
  } else {
    // Кнопка выхода - для авторизованных
    if (onLogout) {
      additionalDockItems.push({
        icon: <FiLogOut size={18} />,
        label: 'Выйти',
        onClick: () => onLogout?.(),
        className: 'dock-item-logout',
      });
    }
  }

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
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isCollapsed, isAuthenticated, onBalanceHistory, onMessages]);

  return (
    <SidebarWrapper>
      <ToggleArrowButton 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
        $isCollapsed={isCollapsed}
        style={{ top: isCollapsed ? '50%' : arrowTop }}
      >
        <FiChevronRight size={14} />
      </ToggleArrowButton>
      <SidebarContainer $isCollapsed={isCollapsed}>
        <SidebarContent $isCollapsed={isCollapsed}>
          <HomeButton onClick={onHome} title="Главная">
            <FiHome size={16} />
          </HomeButton>
          <SwitcherContainer>
            <FilterTooltip>Фильтр</FilterTooltip>
            <Switcher4
              checked={contentMode === 'nsfw'}
              onToggle={(checked) => {
                if (checked && contentMode === 'safe') {
                  // Показываем предупреждение при переключении на NSFW
                  setPendingMode('nsfw');
                  setShowNSFWWarning(true);
                } else {
                  // Переключение обратно на SAFE не требует подтверждения
                  onContentModeChange?.(checked ? 'nsfw' : 'safe');
                }
              }}
              variant="pink"
            />
          </SwitcherContainer>
          
          {showNSFWWarning && (
            <NSFWWarningModal
              onConfirm={() => {
                setShowNSFWWarning(false);
                if (pendingMode) {
                  onContentModeChange?.(pendingMode);
                  setPendingMode(null);
                }
              }}
              onCancel={() => {
                setShowNSFWWarning(false);
                setPendingMode(null);
              }}
            />
          )}
          <DockWrapper ref={dockWrapperRef}>
            <Dock
              items={[...topDockItems, ...mainBottomDockItems, ...additionalDockItems]}
              vertical
              dockHeight={420}
              panelHeight={58}
              baseItemSize={34}
              magnification={45}
              distance={150}
              spring={{ mass: 0.15, stiffness: 180, damping: 35 }}
              className="left-dock-panel"
            />
          </DockWrapper>
        </SidebarContent>
      </SidebarContainer>
    </SidebarWrapper>
  );
};

