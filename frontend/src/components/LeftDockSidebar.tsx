import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiPlusCircle, FiEdit, FiClock, FiHeart, FiGrid, FiHome, FiLogIn, FiUser, FiLogOut, FiShoppingBag, FiMessageSquare, FiTrendingUp, FiMail, FiChevronRight } from 'react-icons/fi';
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
  onProfile?: () => void;
  onShop?: () => void;
  onMessages?: () => void;
  onBalanceHistory?: () => void;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
}

const SidebarWrapper = styled.div`
  position: relative;
  height: 100%;
  z-index: 5;
`;

const SidebarContainer = styled.aside<{ $isCollapsed?: boolean }>`
  width: ${props => props.$isCollapsed ? '0' : '72px'};
  min-width: ${props => props.$isCollapsed ? '0' : '72px'};
  height: 100%;
  padding: ${props => props.$isCollapsed ? '0' : '1.5rem 0.75rem'};
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
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(12, 12, 24, 0.85);
  color: rgba(240, 240, 240, 1);
  font-size: 1rem;
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
  gap: 0.5rem;
  overflow: visible;
`;

const SwitcherContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 0;
  margin-top: calc(0.5rem - 4px);
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
    left 0.3s ease;
  flex-shrink: 0;
  outline: none;
  z-index: 20;
  position: fixed;
  top: 50%;
  left: ${props => props.$isCollapsed ? '-8px' : '40px'};
  transform: ${props => props.$isCollapsed ? 'translateY(-50%) rotate(0deg)' : 'translateY(-50%) rotate(180deg)'};

  &:hover {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(1.1) rotate(0deg)' : 'translateY(-50%) scale(1.1) rotate(180deg)'};
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(20, 20, 35, 0.95);
    color: rgba(240, 240, 240, 1);
  }

  &:active {
    transform: ${props => props.$isCollapsed ? 'translateY(-50%) scale(0.95) rotate(0deg)' : 'translateY(-50%) scale(0.95) rotate(180deg)'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
`;

const SidebarContent = styled.div<{ $isCollapsed?: boolean }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  visibility: ${props => props.$isCollapsed ? 'hidden' : 'visible'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  flex: 1;
  overflow: visible;
`;

export const LeftDockSidebar: React.FC<LeftDockSidebarProps> = ({
  onCreateCharacter,
  onEditCharacters,
  onHistory,
  onFavorites,
  onMyCharacters,
  onHome,
  onProfile,
  onShop,
  onMessages,
  onBalanceHistory,
  isAuthenticated = false,
  onLogin,
  onRegister,
  onLogout,
  contentMode = 'safe',
  onContentModeChange,
}) => {
  const [showNSFWWarning, setShowNSFWWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<'safe' | 'nsfw' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const topDockItems = [
    {
      icon: <FiPlusCircle size={22} />,
      label: 'Создать',
      onClick: () => onCreateCharacter?.(),
    },
    {
      icon: <FiEdit size={22} />,
      label: 'Редактор',
      onClick: () => onEditCharacters?.(),
    },
    {
      icon: <FiClock size={22} />,
      label: 'История',
      onClick: () => onHistory?.(),
    },
    {
      icon: <FiHeart size={22} />,
      label: 'Избранное',
      onClick: () => onFavorites?.(),
    },
  ];

  const bottomDockItems = [
    {
      icon: <FiGrid size={22} />,
      label: 'Персонажи',
      onClick: () => onMyCharacters?.(),
      className: 'dock-item-characters',
    },
    {
      icon: <FiUser size={22} />,
      label: 'Профиль',
      onClick: () => onProfile?.(),
    },
    {
      icon: <FiShoppingBag size={22} />,
      label: 'Магазин',
      onClick: () => onShop?.(),
    },
  ];

  // Добавляем кнопку истории баланса для авторизованных пользователей
  if (isAuthenticated && onBalanceHistory) {
    bottomDockItems.push({
      icon: <FiTrendingUp size={22} />,
      label: 'Списания',
      onClick: () => onBalanceHistory?.(),
    });
  }

  // Добавляем кнопки авторизации в зависимости от статуса
  if (!isAuthenticated) {
    bottomDockItems.push(
      {
        icon: <FiLogIn size={22} />,
        label: 'Войти',
        onClick: () => onLogin?.(),
      },
      {
        icon: <FiMail size={22} />,
        label: 'Регистрация',
        onClick: () => onRegister?.(),
      }
    );
  } else {
    // Для авторизованных пользователей добавляем Messages вместо Register
    if (onMessages) {
      bottomDockItems.push({
        icon: <FiMessageSquare size={22} />,
        label: 'Сообщения',
        onClick: () => onMessages?.(),
      });
    }
    bottomDockItems.push({
      icon: <FiLogOut size={22} />,
      label: 'Выйти',
      onClick: () => onLogout?.(),
    });
  }

  return (
    <SidebarWrapper>
      <ToggleArrowButton 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Развернуть панель" : "Свернуть панель"}
        $isCollapsed={isCollapsed}
      >
        <FiChevronRight size={18} />
      </ToggleArrowButton>
      <SidebarContainer $isCollapsed={isCollapsed}>
        <SidebarContent $isCollapsed={isCollapsed}>
          <HomeButton onClick={onHome} title="Главная">
            <FiHome size={20} />
          </HomeButton>
          <SwitcherContainer>
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
          <DockWrapper>
            <Dock
              items={[...topDockItems, ...bottomDockItems]}
              vertical
              dockHeight={420}
              panelHeight={90}
              baseItemSize={43}
              magnification={56}
              distance={120}
              spring={{ mass: 0.15, stiffness: 180, damping: 35 }}
              className="left-dock-panel"
            />
          </DockWrapper>
        </SidebarContent>
      </SidebarContainer>
    </SidebarWrapper>
  );
};

