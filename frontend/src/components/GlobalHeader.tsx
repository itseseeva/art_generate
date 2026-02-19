import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { ShoppingBag, User, Coins, DollarSign, LogOut, LogIn, UserPlus, X, ClipboardList, CheckCircle, Crown, Home } from 'lucide-react';
import { generationTracker } from '../utils/generationTracker';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SearchBar } from './SearchBar';
import { MenuToggle } from './ui/MenuToggle';


const HeaderContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  padding: 0.2rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  z-index: 10000;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
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
  gap: 1rem;
  height: 100%;
  overflow: visible;
  margin-left: 10px;

  @media (max-width: 768px) {
    margin-left: 5px;
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
    outline: none;
  }

  &:focus {
    outline: none;
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
    font - size: 0.85rem;
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
    outline: none;
  }

  &:focus {
    outline: none;
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
    z-index: 1001;
    pointer-events: auto;
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
      border - color: rgba(168, 85, 247, 0.8);
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

  &:focus {
    outline: none;
  }
    `;

const slideIn = keyframes`
    from {
      transform: translateX(100%);
    opacity: 0;
  }
    to {
      transform: translateX(0);
    opacity: 1;
  }
    `;

const pulse = keyframes`
    0%, 100% {
      box - shadow: 0 0 0 0 rgba(76, 175, 80, 0.7), 0 4px 20px rgba(0, 0, 0, 0.5);
  }
    50% {
      box - shadow: 0 0 0 10px rgba(76, 175, 80, 0), 0 4px 20px rgba(0, 0, 0, 0.5);
  }
    `;

const NotificationContainer = styled.div`
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 99999;
    animation: ${slideIn} 0.4s ease-out;

    @media (max-width: 768px) {
      top: 50px;
    right: 0.5rem;
    left: 0.5rem;
  }
    `;

const Notification = styled.div`
    background: linear-gradient(135deg, rgba(46, 125, 50, 0.95) 0%, rgba(27, 94, 32, 0.95) 100%);
    border: 2px solid rgba(76, 175, 80, 0.8);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    min-width: 280px;
    max-width: 400px;
    color: rgba(255, 255, 255, 1);
    font-weight: 600;
    font-size: 0.9rem;
    animation: ${pulse} 2s infinite;

    @media (max-width: 768px) {
      min - width: auto;
    max-width: none;
    padding: 0.6rem 0.8rem;
  }
    `;

const NotificationText = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    `;

const NotificationTitle = styled.div`
    font-weight: 700;
    font-size: 0.85rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `;

const NotificationMessage = styled.div`
    font-weight: 500;
    font-size: 0.75rem;
    opacity: 0.95;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;

    @media (max-width: 768px) {
      max - width: none;
    white-space: normal;
  }
    `;

const NotificationButton = styled.button`
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    padding: 0.4rem 0.8rem;
    color: rgba(255, 255, 255, 1);
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.6);
    transform: scale(1.05);
  }

    &:focus {
      outline: none;
    }
    `;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    color: rgba(255, 255, 255, 1);
  }

    &:focus {
      outline: none;
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
  currentCharacterId?: string | number;
  /** true только когда хедер рендерится внутри ChatContainer; иначе считаем, что пользователь не в чате и показываем уведомление о готовности фото */
  isOnChatPage?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

const borderMove = keyframes`
    0% {background - position: 0% 50%; }
    100% {background - position: 400% 50%; }
    `;

const AnimatedBorderButton = styled(motion.button)`
    position: relative;
    padding: 1px;
    border-radius: 0.75rem; /* rounded-xl */
    background: linear-gradient(90deg, #ec4899, #06b6d4, #8b5cf6, #ec4899);
    background-size: 400% 100%;
    animation: ${borderMove} 9s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(236, 72, 153, 0.4), 0 0 15px rgba(6, 182, 212, 0.4);

    &::before {
      content: '';
    position: absolute;
    inset: -2px;
    border-radius: 0.85rem;
    background: inherit;
    z-index: -1;
    opacity: 0.6;
    filter: blur(12px);
    transition: opacity 0.3s ease;
  }

    &:focus {
      outline: none;
    }
    `;

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  onShop,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  onBalance,
  onHome,
  leftContent,
  refreshTrigger,
  currentCharacterId,
  isOnChatPage: isOnChatPageProp,
  isOpen = false,
  onToggle = () => { }
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const langInUrl = pathParts[1];
  const currentLang = ['ru', 'en'].includes(langInUrl) ? langInUrl : 'ru';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username: string, coins: number, avatar_url?: string, is_admin?: boolean } | null>(null);
  const [notification, setNotification] = useState<{
    taskId: string;
    imageUrl: string;
    characterName?: string;
    characterId?: string | number;
  } | null>(null);
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
              username: userData.username || userData.email || t('common.user'),
              coins: userData.coins || 0,
              avatar_url: userData.avatar_url,
              is_admin: userData.is_admin || false
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

  // Подписка на уведомления о готовности генерации
  useEffect(() => {
    const unsubscribe = generationTracker.addListener((taskId, imageUrl, characterName, characterId) => {
      // Считаем "в чате" только когда проп явно true (ChatContainer); иначе показываем уведомление при выходе из чата
      const isOnChatPage = isOnChatPageProp === true;
      const isSameCharacter = currentCharacterId && characterId && String(currentCharacterId) === String(characterId);

      // Показываем уведомление если пользователь не на странице чата
      if (!isOnChatPage) {
        setNotification({ taskId, imageUrl, characterName, characterId });

        // Автоматически скрываем уведомление через 15 секунд
        setTimeout(() => {
          setNotification(null);
        }, 15000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentCharacterId, isOnChatPageProp]);

  const handleNotificationClick = async () => {
    // Переходим в чат с персонажем, если указан
    if (notification?.characterId || notification?.characterName) {
      // Используем ID персонажа, если он есть, иначе используем имя
      const characterIdentifier = notification.characterId || notification.characterName;

      // Навигация напрямую в чат персонажа
      navigate(`/${currentLang}/chat/${encodeURIComponent(String(characterIdentifier))}`);
    }
    setNotification(null);
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleShop = () => {
    if (onShop) {
      onShop();
    } else {
      navigate(`/${currentLang}/shop`);
    }
  };

  const handleProfile = () => {
    if (onProfile) {
      onProfile();
    } else {
      navigate(`/${currentLang}/profile`);
    }
  };

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate(`/${currentLang}/login`);
    }
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister();
    } else {
      navigate(`/${currentLang}/register`);
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      navigate(`/${currentLang}/`);
    }
  };

  return (
    <HeaderContainer>
      <LeftSection>
        <MenuToggle toggle={onToggle} isOpen={isOpen} />
        {leftContent}
        <div id="header-left-portal" style={{ display: 'flex', alignItems: 'center' }} />
      </LeftSection>

      {notification && (
        <NotificationContainer>
          <Notification>
            <CheckCircle size={24} style={{ flexShrink: 0 }} />
            <NotificationText>
              <NotificationTitle>{t('notifications.photoReady')}</NotificationTitle>
              <NotificationMessage>
                {notification.characterName
                  ? `${t('notifications.character')}: ${notification.characterName}`
                  : t('notifications.imageReady')}
              </NotificationMessage>
            </NotificationText>
            <NotificationButton onClick={handleNotificationClick}>
              {t('common.open')}
            </NotificationButton>
            <CloseButton onClick={handleCloseNotification}>
              <X size={16} />
            </CloseButton>
          </Notification>
        </NotificationContainer>
      )}

      <RightSection>
        <SearchBar />
        <ShopButton onClick={handleHome} title={t('common.home')}>
          <Home size={20} />
        </ShopButton>
        {isAuthenticated && userInfo?.is_admin && (
          <ShopButton
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-admin-logs'))}
            title={t('nav.adminLogs')}
          >
            <ClipboardList size={20} />
          </ShopButton>
        )}
        {isAuthenticated && (
          <AnimatedBorderButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShop}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-slate-950/90 backdrop-blur-md rounded-[11px] w-full h-full z-10 transition-colors group">
              <motion.div
                whileHover={{ rotate: 15 }}
                className="text-cyan-400 flex items-center justify-center"
              >
                <Crown size={16} className="drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </motion.div>
              <span className="font-sans font-medium tracking-tight text-white/90 text-sm whitespace-nowrap">
                {t('header.changePlan')}
              </span>
            </div>
          </AnimatedBorderButton>
        )}

        <LanguageSwitcher />

        {!isAuthenticated && (
          <>
            <ShopButton onClick={handleLogin} title={t('header.loginButton')}>
              <LogIn size={20} />
            </ShopButton>
            <ShopButton onClick={handleRegister} title={t('header.registerButton')}>
              <UserPlus size={20} />
            </ShopButton>
          </>
        )}

        {isAuthenticated && (
          <ShopButton onClick={onLogout || (() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.href = `/${currentLang}/`;
          })} title={t('auth.logout')}>
            <LogOut size={20} />
          </ShopButton>
        )}


        {isAuthenticated && (
          <ProfileButton onClick={handleProfile} $isAuthenticated={isAuthenticated}>
            {userInfo?.avatar_url ? (
              <img
                src={userInfo.avatar_url}
                alt={userInfo.username}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <img
                src="/avatar_default.jpg"
                alt={t('header.profileButton')}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </ProfileButton>
        )}
      </RightSection>
    </HeaderContainer>
  );
};
