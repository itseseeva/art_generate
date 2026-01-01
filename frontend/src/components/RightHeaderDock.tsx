import React from 'react';
import styled from 'styled-components';
import { FiUser, FiLogIn, FiUserPlus, FiLogOut } from 'react-icons/fi';
import Dock from './Dock';
import { theme } from '../theme';
import './RightHeaderDock.css';

interface RightHeaderDockProps {
  onProfile?: () => void;
  onShop?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

const HeaderDockWrapper = styled.div`
  position: fixed;
  top: 0px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
`;

const HeaderDockContainer = styled.div`
  pointer-events: auto;
  background: rgba(8, 8, 18, 0.85);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-radius: 14px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 7px 17px rgba(0, 0, 0, 0.35);
`;

export const RightHeaderDock: React.FC<RightHeaderDockProps> = ({
  onProfile,
  onShop,
  onLogin,
  onRegister,
  onLogout,
  isAuthenticated = false,
}) => {
  const dockItems = [];

  // Профиль - только для авторизованных
  if (isAuthenticated && onProfile) {
    dockItems.push({
      icon: <FiUser size={14} />,
      label: 'Профиль',
      onClick: () => onProfile?.(),
      className: 'dock-item-profile',
    });
  }

  // Магазин - всегда
  if (onShop) {
    dockItems.push({
      icon: <span style={{ fontSize: '14px', fontWeight: 600 }}>$</span>,
      label: 'Магазин',
      onClick: () => onShop?.(),
      className: 'dock-item-shop',
    });
  }

  // Кнопки авторизации - для неавторизованных
  if (!isAuthenticated) {
    if (onLogin) {
      dockItems.push({
        icon: <FiLogIn size={14} />,
        label: 'Войти',
        onClick: () => onLogin?.(),
        className: 'dock-item-login',
      });
    }
    if (onRegister) {
      dockItems.push({
        icon: <FiUserPlus size={14} />,
        label: 'Регистрация',
        onClick: () => onRegister?.(),
        className: 'dock-item-register',
      });
    }
  } else {
    // Кнопка выхода - для авторизованных
    if (onLogout) {
      dockItems.push({
        icon: <FiLogOut size={14} />,
        label: 'Выйти',
        onClick: () => onLogout?.(),
        className: 'dock-item-logout',
      });
    }
  }

  if (dockItems.length === 0) {
    return null;
  }

  return (
    <HeaderDockWrapper>
      <HeaderDockContainer>
        <Dock
          items={dockItems}
          vertical={false}
          dockHeight={41}
          panelHeight={41}
          baseItemSize={28}
          magnification={35}
          distance={83}
          spring={{ mass: 0.15, stiffness: 180, damping: 35 }}
          className="right-header-dock"
        />
      </HeaderDockContainer>
    </HeaderDockWrapper>
  );
};

