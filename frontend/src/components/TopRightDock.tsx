import React from 'react';
import CardNav from '../../@/components/CardNav';
import './TopRightDock.css';

interface TopRightDockProps {
  isAuthenticated: boolean;
  onProfile?: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onBalance?: () => void;
  userCoins?: number;
  isHidden?: boolean;
}

export const TopRightDock: React.FC<TopRightDockProps> = ({
  isAuthenticated,
  onProfile,
  onLogin,
  onLogout,
  onBalance,
  userCoins,
  isHidden = false
}) => {
  const items = [];

  if (isAuthenticated) {
    if (onProfile) {
      items.push({
        label: 'Профиль',
        bgColor: '#0D0716',
        textColor: '#fff',
        links: [
          { label: 'Мой профиль', href: '#', ariaLabel: 'Перейти в профиль' }
        ]
      });
    }
    
    if (onBalance) {
      items.push({
        label: 'Баланс',
        bgColor: '#170D27',
        textColor: '#fff',
        links: [
          { 
            label: userCoins !== undefined ? `${userCoins} монет` : 'Пополнить баланс', 
            href: '#', 
            ariaLabel: 'Баланс' 
          }
        ]
      });
    }
    
    items.push({
      label: 'Выйти',
      bgColor: '#271E37',
      textColor: '#fff',
      links: [
        { label: 'Выйти из аккаунта', href: '#', ariaLabel: 'Выйти' }
      ]
    });
  } else {
    items.push({
      label: 'Войти',
      bgColor: '#0D0716',
      textColor: '#fff',
      links: [
        { label: 'Войти в аккаунт', href: '#', ariaLabel: 'Войти' }
      ]
    });
  }

  React.useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.nav-card-link');
      if (!link) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const card = link.closest('.nav-card');
      const cardLabel = card?.querySelector('.nav-card-label')?.textContent?.trim() || '';
      
      if (cardLabel === 'Профиль' && onProfile) {
        onProfile();
      } else if (cardLabel === 'Баланс' && onBalance) {
        onBalance();
      } else if (cardLabel === 'Выйти' && onLogout) {
        onLogout();
      } else if (cardLabel === 'Войти' && onLogin) {
        onLogin();
      }
    };

    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.card-nav-cta-button');
      if (!button) return;
      
      const buttonText = button.textContent?.trim();
      
      if (buttonText === 'Profile' && onProfile) {
        e.preventDefault();
        e.stopPropagation();
        onProfile();
      }
    };

    const container = document.querySelector('.top-right-card-nav');
    if (container) {
      container.addEventListener('click', handleLinkClick);
      container.addEventListener('click', handleButtonClick);
      return () => {
        container.removeEventListener('click', handleLinkClick);
        container.removeEventListener('click', handleButtonClick);
      };
    }
  }, [onProfile, onBalance, onLogout, onLogin, isAuthenticated]);

  const logoUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E";

  const additionalButtons = [];
  
  if (isAuthenticated) {
    additionalButtons.push({
      label: 'Logout',
      onClick: onLogout,
      bgColor: '#271E37',
      textColor: '#fff'
    });
  } else {
    additionalButtons.push({
      label: 'Login',
      onClick: onLogin,
      bgColor: '#0D0716',
      textColor: '#fff'
    });
  }

  return (
    <CardNav
      logo={logoUrl}
      logoAlt="Menu"
      items={items}
      className={`top-right-card-nav ${isHidden ? 'top-right-card-nav--hidden' : ''}`}
      baseColor="rgba(22, 33, 62, 0.3)"
      menuColor="#fff"
      buttonBgColor="#111"
      buttonTextColor="#fff"
      buttonText="Profile"
      additionalButtons={additionalButtons}
      ease="power3.out"
    />
  );
};
