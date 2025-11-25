import React from 'react';
import Dock from './Dock';
import { FiUserPlus, FiShoppingBag, FiUsers } from 'react-icons/fi';
import styled from 'styled-components';
import { theme } from '../theme';
import './Dock.css';
import './VerticalDockSidebar.css';

interface VerticalDockSidebarProps {
  onCreateCharacter: () => void;
  onShop: () => void;
  onMyCharacters: () => void;
}

const VerticalDockContainer = styled.div`
  width: 80px;
  min-width: 80px;
  height: 100vh;
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  padding: ${theme.spacing.lg} ${theme.spacing.md};
  border-right: 1px solid ${theme.colors.border.accent};
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: ${theme.colors.gradients.button};
    opacity: 0.3;
  }
`;

const LogoContainer = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${theme.colors.gradients.button};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.xl};
  margin-bottom: ${theme.spacing.xl};
  box-shadow: ${theme.colors.shadow.button};
  color: ${theme.colors.text.primary};
`;

export const VerticalDockSidebar: React.FC<VerticalDockSidebarProps> = ({
  onCreateCharacter,
  onShop,
  onMyCharacters
}) => {
  return (
    <VerticalDockContainer>
      <LogoContainer>♥</LogoContainer>
      
      <div className="vertical-dock-wrapper">
        <Dock
          items={[
            {
              icon: <FiUserPlus size={24} />,
              label: 'Персонаж',
              onClick: onCreateCharacter
            },
            {
              icon: <FiUsers size={24} />,
              label: 'Мои',
              onClick: onMyCharacters
            },
            {
              icon: <FiShoppingBag size={24} />,
              label: 'Магазин',
              onClick: onShop
            }
          ]}
          vertical={true}
          spring={{ mass: 0.1, stiffness: 150, damping: 12 }}
          magnification={70}
          distance={200}
          baseItemSize={50}
        />
      </div>
    </VerticalDockContainer>
  );
};

