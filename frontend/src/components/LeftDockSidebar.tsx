import React from 'react';
import styled from 'styled-components';
import { FiUserPlus, FiEdit, FiClock, FiHeart, FiUsers, FiHome, FiLogIn, FiUser, FiLogOut, FiShoppingBag, FiMessageSquare } from 'react-icons/fi';
import Switcher4 from './Switcher4';

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
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
}

const SidebarContainer = styled.aside`
  width: 72px;
  min-width: 72px;
  height: 100%;
  padding: 1.5rem 0.75rem;
  background: rgba(8, 8, 18, 0.85);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  position: relative;
  z-index: 5;
  overflow-y: auto;
  overflow-x: hidden;
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
  align-items: center;
  position: relative;
`;

const SwitcherContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 0;
  margin-top: 0.5rem;
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
  isAuthenticated = false,
  onLogin,
  onRegister,
  onLogout,
  contentMode = 'safe',
  onContentModeChange,
}) => {
  const dockItems = [
    {
      icon: <FiUserPlus size={22} />,
      label: 'Create',
      onClick: () => onCreateCharacter?.(),
    },
    {
      icon: <FiEdit size={22} />,
      label: 'Edit',
      onClick: () => onEditCharacters?.(),
    },
    {
      icon: <FiClock size={22} />,
      label: 'History',
      onClick: () => onHistory?.(),
    },
    {
      icon: <FiHeart size={22} />,
      label: 'Favorites',
      onClick: () => onFavorites?.(),
    },
    {
      icon: <FiUsers size={22} />,
      label: 'My Characters',
      onClick: () => onMyCharacters?.(),
    },
    {
      icon: <FiUser size={22} />,
      label: 'Profile',
      onClick: () => onProfile?.(),
    },
    {
      icon: <FiShoppingBag size={22} />,
      label: 'Shop',
      onClick: () => onShop?.(),
    },
  ];

  // Добавляем кнопки авторизации в зависимости от статуса
  if (!isAuthenticated) {
    dockItems.push(
      {
        icon: <FiLogIn size={22} />,
        label: 'Login',
        onClick: () => onLogin?.(),
      },
      {
        icon: <FiUser size={22} />,
        label: 'Register',
        onClick: () => onRegister?.(),
      }
    );
  } else {
    // Для авторизованных пользователей добавляем Messages вместо Register
    if (onMessages) {
      dockItems.push({
        icon: <FiMessageSquare size={22} />,
        label: 'Messages',
        onClick: () => onMessages?.(),
      });
    }
    dockItems.push({
      icon: <FiLogOut size={22} />,
      label: 'Logout',
      onClick: () => onLogout?.(),
    });
  }

  return (
    <SidebarContainer>
      <HomeButton onClick={onHome} title="Home">
        <FiHome size={20} />
      </HomeButton>
      <SwitcherContainer>
        <Switcher4
          checked={contentMode === 'nsfw'}
          onToggle={(checked) => {
            onContentModeChange?.(checked ? 'nsfw' : 'safe');
          }}
          variant="pink"
        />
      </SwitcherContainer>
      <DockWrapper>
        <Dock
          items={dockItems}
          vertical
          dockHeight={420}
          panelHeight={90}
          baseItemSize={43}
          magnification={64}
          distance={180}
          className="left-dock-panel"
        />
      </DockWrapper>
    </SidebarContainer>
  );
};

