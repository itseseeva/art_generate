import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';

const HeaderContainer = styled.div`
  background: transparent;
  backdrop-filter: none;
  padding: 0.5rem ${theme.spacing.xl};
  margin-top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  z-index: 100;
  min-height: auto;
  max-height: none;
  overflow: visible;
  position: relative;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: ${theme.spacing.lg};
  flex: 1;
  min-width: 0;
  overflow: visible;
  position: relative;
  padding-top: 0;
  width: 100%;
`;

interface GlobalHeaderProps {
  onShop?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
  onBalance?: () => void;
  leftContent?: React.ReactNode;
  refreshTrigger?: number;
  contentMode?: 'safe' | 'nsfw';
  onContentModeChange?: (mode: 'safe' | 'nsfw') => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  onShop,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  onBalance,
  leftContent,
  refreshTrigger,
  contentMode,
  onContentModeChange
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number} | null>(null);

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
              coins: userData.coins || 0
            };
            setUserInfo(newUserInfo);
            setIsAuthenticated(true);
          } else if (isMounted) {
             // Обработка случая, когда userData is null
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
        console.error('[GLOBAL HEADER] Auth check error:', error);
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

    // Слушаем глобальное событие обновления баланса
    const handleBalanceUpdate = () => {
      if (isMounted) {
        // Всегда обновляем данные при событии обновления баланса
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

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    }
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister();
    } else if (onLogin) {
      onLogin();
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      authManager.clearTokens();
    }
  };

  const handleShop = () => {
    // Сначала пробуем использовать переданный обработчик
    if (onShop) {
      onShop();
      return;
    }
    // Если обработчик не передан, используем глобальное событие
    window.dispatchEvent(new CustomEvent('navigate-to-shop'));
  };

  const handleProfile = () => {
    console.log('[GLOBAL HEADER] Profile button clicked');
    // Сначала пробуем использовать переданный обработчик
    if (onProfile) {
      console.log('[GLOBAL HEADER] Calling onProfile handler');
      try {
        onProfile();
      } catch (error) {
        console.error('[GLOBAL HEADER] Error calling onProfile:', error);
        // Если обработчик выбросил ошибку, используем глобальное событие
        window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { userId: undefined } }));
      }
      return;
    }
    // Если обработчик не передан, используем глобальное событие
    console.log('[GLOBAL HEADER] Dispatching navigate-to-profile event');
    window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { userId: undefined } }));
  };

  const handleBalance = () => {
    // Сначала пробуем использовать переданный обработчик
    if (onBalance) {
      onBalance();
      return;
    }
    // Если обработчик не передан, просто показываем информацию
    alert('Баланс пользователя');
  };

  return (
    <HeaderContainer>
      <LeftSection>
        {leftContent || <div></div>}
      </LeftSection>
      
      <RightSection>
      </RightSection>
    </HeaderContainer>
  );
};
