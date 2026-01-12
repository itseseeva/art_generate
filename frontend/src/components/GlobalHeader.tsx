import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { ShoppingBag, User, Coins, DollarSign, LogOut, LogIn, UserPlus } from 'lucide-react';

const HeaderContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0.2rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  z-index: 1000;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  height: 55px;
  overflow: visible;

  @media (max-width: 768px) {
    padding: 0.15rem 1rem;
    height: 45px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1.5rem;
  height: 100%;
  overflow: visible;
`;

const Logo = styled.img`
  height: 80px;
  max-height: 80px;
  width: auto;
  cursor: pointer;
  object-fit: contain;
  object-position: center bottom;
  transition: transform 0.2s;
  display: block;
  margin: 0;
  align-self: flex-end;
  margin-bottom: -35px;
  
  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    height: 60px;
    max-height: 60px;
    margin-bottom: -25px;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const BalanceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  padding: 0.5rem 1rem;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  white-space: nowrap;
  box-shadow: none;
  position: relative;
  
  &:hover {
    background: transparent;
    border: none;
    box-shadow: none;
    transform: none;
  }

  &:active {
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.35rem 0.6rem;
    gap: 0.25rem;
  }
`;

const BalanceAmount = styled.span`
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const CoinIcon = styled(Coins)`
  color: #ffd700;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6)) drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4));
  transition: all 0.3s ease;
  
  ${BalanceContainer}:hover & {
    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 2px 6px rgba(255, 215, 0, 0.6));
    transform: scale(1.1) rotate(5deg);
  }

  @media (max-width: 768px) {
    width: 14px;
    height: 14px;
  }
`;

const ShopButton = styled.button`
  background: transparent;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: none;
  white-space: nowrap;
  position: relative;
  overflow: visible;
  min-width: auto;
  width: auto;
  height: auto;
  
  &:hover {
    background: transparent;
    box-shadow: none;
    transform: none;
    filter: none;
    
    svg {
      filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 2px 4px rgba(255, 237, 78, 0.6));
      transform: scale(1.1);
      color: #ffd700;
    }
  }

  &:active {
    transform: none;
    box-shadow: none;
  }
  
  svg {
    transition: all 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.6rem;
    gap: 0;
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

const ProfileButton = styled.div<{ $isAuthenticated?: boolean }>`
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 50%;
  overflow: visible;
  border: 2px solid rgba(139, 92, 246, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(139, 92, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(139, 92, 246, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(168, 85, 247, 0.6));
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(8px);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #10b981;
    border: 2px solid rgba(15, 23, 42, 0.8);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    z-index: 2;
    opacity: ${props => props.$isAuthenticated ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: rgba(168, 85, 247, 0.8);
    background: rgba(139, 92, 246, 0.2);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.5), 0 0 40px rgba(168, 85, 247, 0.3), inset 0 0 15px rgba(139, 92, 246, 0.2);
    transform: scale(1.08);
    
    &::before {
      opacity: 1;
    }
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  svg {
    color: #fff;
    width: 20px;
    height: 20px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 50%;
    
    &::after {
      width: 8px;
      height: 8px;
      top: 1px;
      right: 1px;
    }
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

interface GlobalHeaderProps {
  onShop?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  onBalance?: () => void;
  onHome?: () => void;
  leftContent?: React.ReactNode;
  refreshTrigger?: number;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  onShop,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  onBalance,
  onHome,
  leftContent,
  refreshTrigger
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, avatar_url?: string} | null>(null);

  // Проверка авторизации и обновление баланса
  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const token = authManager.getToken();
        if (!token) {
          if (isMounted) {
            setIsAuthenticated(false);
            setUserInfo(null);
          }
          return;
        }

        const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
        if (!isMounted) {
          return;
        }

        if (response.ok) {
          const userData = await response.json();
          if (isMounted && userData) {
            const newUserInfo = {
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              avatar_url: userData.avatar_url
            };
            setUserInfo(newUserInfo);
            setIsAuthenticated(true);
          } else if (isMounted) {
             authManager.clearTokens();
             setIsAuthenticated(false);
             setUserInfo(null);
          }
        } else {
          if (isMounted) {
            authManager.clearTokens();
            setIsAuthenticated(false);
            setUserInfo(null);
          }
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    };

    fetchUser();

    const unsubscribe = authManager.subscribeAuthChanges(({ isAuthenticated: authState }) => {
      if (!isMounted) {
        return;
      }

      if (authState) {
        fetchUser();
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    });

    const handleBalanceUpdate = () => {
      if (isMounted) {
        fetchUser();
      }
    };

    window.addEventListener('balance-update', handleBalanceUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('balance-update', handleBalanceUpdate);
    };
  }, [refreshTrigger]);

  const handleShop = () => {
    if (onShop) {
      onShop();
      return;
    }
    window.dispatchEvent(new CustomEvent('navigate-to-shop'));
  };

  const handleProfile = () => {
    if (!isAuthenticated) {
      if (onLogin) onLogin();
      return;
    }
    if (onProfile) {
      onProfile();
      return;
    }
    window.dispatchEvent(new CustomEvent('navigate-to-profile'));
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }
    window.location.href = '/';
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <Logo 
          src="/logo-header.png" 
          alt="CherryLust" 
          onClick={handleHome}
        />
        {leftContent}
      </LeftSection>
      
      <RightSection>
        {isAuthenticated && (
          <>
            <BalanceContainer onClick={onBalance || handleShop}>
              <CoinIcon />
              <BalanceAmount>{userInfo?.coins || 0}</BalanceAmount>
            </BalanceContainer>
            
            <ShopButton onClick={handleShop}>
              <DollarSign size={20} />
            </ShopButton>
          </>
        )}
        
        {!isAuthenticated && (
          <>
            <ShopButton onClick={onLogin} title="Войти">
              <LogIn size={20} />
            </ShopButton>
            <ShopButton onClick={onRegister} title="Регистрация">
              <UserPlus size={20} />
            </ShopButton>
          </>
        )}

        {isAuthenticated && (
          <ShopButton onClick={onLogout || (() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/';
          })} title="Выйти">
            <LogOut size={20} />
          </ShopButton>
        )}

        <ProfileButton onClick={handleProfile} $isAuthenticated={isAuthenticated}>
          {userInfo?.avatar_url ? (
            <img src={userInfo.avatar_url} alt={userInfo.username} />
          ) : (
            <img src="/avatar_default.jpg" alt="Профиль" />
          )}
        </ProfileButton>
      </RightSection>
    </HeaderContainer>
  );
};
