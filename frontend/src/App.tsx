import { useState, useEffect } from 'react';
import React from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import { LanguageWrapper } from './components/LanguageWrapper';
import { MainPage } from './components/MainPage';
import { ChatContainer } from './components/ChatContainer';
import DarkVeil from '../@/components/DarkVeil';
import { MyCharactersPage } from './components/MyCharactersPage';
import { CreateCharacterPage } from './components/CreateCharacterPage';
import { ShopPage } from './components/ShopPage';
import { ProfilePage } from './components/ProfilePage';
import { MessagesPage } from './components/MessagesPage';
import { HistoryPage } from './components/HistoryPage';
import { UserGalleryPage } from './components/UserGalleryPage';
import { PaidAlbumPage } from './components/PaidAlbumPage';
import { PaidAlbumBuilderPage } from './components/PaidAlbumBuilderPage';
import { PhotoGenerationPage3 } from './components/PhotoGenerationPage3';
import { EditCharactersPage } from './components/EditCharactersPage';
import { EditCharacterPage } from './components/EditCharacterPage';
import { FavoritesPage } from './components/FavoritesPage';
import { CharacterCommentsPage } from './components/CharacterCommentsPage';
import { BugReportPage } from './components/BugReportPage';
import { AdminLogsPage } from './components/AdminLogsPage';
import { StaggeredSidebar } from './components/StaggeredSidebar';
import { LegalPage } from './components/LegalPage';
import { TermsPage } from './components/TermsPage';
import { PrivacyPage } from './components/PrivacyPage';
import { AboutPage } from './components/AboutPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import AuthPage from './components/AuthPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import { PaidAlbumPurchaseModal } from './components/PaidAlbumPurchaseModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { GlobalHeader } from './components/GlobalHeader';
import { authManager } from './utils/auth';
import { ContentRatingModal } from './components/ContentRatingModal';
import { TagsPage } from './components/TagsPage';
import { useSEO } from './hooks/useSEO';
import { useIsMobile } from './hooks/useIsMobile';
import { API_CONFIG } from './config/api';
import { getFingerprintId } from './utils/fingerprint';
import { ActionTooltip } from './components/ActionTooltip';
import { BoosterOfferModal } from './components/BoosterOfferModal';

const AppContainer = styled.div<{ $isMobile?: boolean }>`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  position: relative;
`;

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

const PageContainer = styled.div<{ $isMobile?: boolean; $isSidebarOpen?: boolean; $isFullWidth?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  padding-top: ${(p) => (p.$isMobile ? '45px' : '55px')};
  padding-left: ${(p) => (!p.$isMobile && (p.$isSidebarOpen || !p.$isFullWidth) ? '226px' : '0')};
  padding-right: ${(p) => (!p.$isMobile && !p.$isFullWidth ? '226px' : '0')};
  scroll-behavior: smooth;
  width: 100%;
  max-width: 100%;
  background: transparent;
  z-index: 1;
  transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  @media (min-width: 1201px) and (max-width: 1600px) {
    padding-right: ${(p) => (!p.$isMobile && !p.$isFullWidth ? '100px' : '0')};
  }

  @media (min-width: 769px) and (max-width: 1200px) {
    padding-right: ${(p) => (!p.$isMobile && !p.$isFullWidth ? '40px' : '0')};
  }
`;

const EmptyAlbumToast = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001;
  padding: 12px 20px;
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  color: rgba(226, 232, 240, 1);
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-width: 90vw;
`;

const LanguageRedirect = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const storedLang = localStorage.getItem('i18nextLng');
  const browserLang = navigator.language.split('-')[0];

  // Decide target language: 1. stored, 2. browser, 3. default 'ru'
  const targetLang = storedLang?.startsWith('en') ? 'en' :
    storedLang?.startsWith('ru') ? 'ru' :
      (browserLang === 'ru' ? 'ru' : 'en');

  return <Navigate to={`/${targetLang}${location.pathname === '/' ? '' : location.pathname}`} replace />;
};

function App() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
  const [contentMode, setContentMode] = useState<'safe' | 'nsfw'>(() => {
    // Инициализируем из URL
    return window.location.pathname.includes('/nsfw') ? 'nsfw' : 'safe';
  });
  const [showContentRatingModal, setShowContentRatingModal] = useState(false);
  const [showCreateRatingModal, setShowCreateRatingModal] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState<string>('');
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isPaidAlbumModalOpen, setIsPaidAlbumModalOpen] = useState(false);
  const [selectedAlbumCharacter, setSelectedAlbumCharacter] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [emptyAlbumToast, setEmptyAlbumToast] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const pathParts = location.pathname.split('/');
  const langInUrl = pathParts[1];
  const currentLang = ['ru', 'en'].includes(langInUrl) ? langInUrl : (i18n.language || 'ru');

  const navigateWithLang = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    navigate(`/${currentLang}${cleanPath}`);
  };

  const checkAuth = async () => {
    try {
      const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserInfo(data);
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUserInfo(null);
    }
  };

  useEffect(() => {
    // Check for tokens in URL (OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Save tokens
      authManager.setTokens(accessToken, refreshToken);

      // Clear tokens from URL but keep path
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }

    checkAuth();
  }, []);

  // Вычисляем, может ли пользователь редактировать альбомы
  // ВАЖНО: Админы могут редактировать любые альбомы
  // Пользователи с подпиской STANDARD или PREMIUM могут редактировать альбомы
  // Владельцы персонажей могут редактировать альбомы своих персонажей (проверка в компонентах)
  const canEditAlbum = userInfo?.is_admin ||
    userInfo?.subscription?.subscription_type === 'standard' ||
    userInfo?.subscription?.subscription_type === 'premium';

  // Navigation handlers
  const handleBackToMain = () => navigateWithLang('/');
  const handleCreateCharacter = () => {
    // Show modal first, then navigate
    setShowCreateRatingModal(true);
  };
  const handleEditCharacters = () => navigateWithLang('/edit-characters');
  const handleHistory = () => navigateWithLang('/history');
  const handleFavorites = () => navigateWithLang('/favorites');
  const handleMyCharacters = () => navigateWithLang('/my-characters');
  const handleMessages = () => navigateWithLang('/messages');
  const handleBugReport = () => navigateWithLang('/bug-report');
  const handleProfile = (userId?: number) => {
    if (userId) {
      navigateWithLang(`/profile/${userId}`);
    } else {
      navigateWithLang('/profile');
    }
  };
  const handleShop = () => navigateWithLang('/shop');
  const handleLogin = (redirectPath?: string) => {
    if (typeof redirectPath === 'string' && redirectPath.startsWith('/')) {
      navigateWithLang(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    } else {
      navigateWithLang('/login');
    }
  };

  const handleLogout = async () => {
    await authManager.logout();
    setIsAuthenticated(false);
    setUserInfo(null);
    navigateWithLang('/');
  };

  const handleRegister = (redirectPath?: string) => {
    if (typeof redirectPath === 'string' && redirectPath.startsWith('/')) {
      navigateWithLang(`/register?redirect=${encodeURIComponent(redirectPath)}`);
    } else {
      navigateWithLang('/register');
    }
  };

  const handeLoginWrapper = () => handleLogin(); // Wrapper for simple calls if needed, or usage of handleLogin is fine

  const handleUserLogin = async (email: string, password: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || t('auth.loginError'));
    }

    const data = await response.json();
    authManager.setTokens(data.access_token, data.refresh_token);
    await checkAuth();

    // Check for redirect param
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    if (redirect) {
      // Decode if it was encoded
      const targetPath = decodeURIComponent(redirect);
      // Ensure we don't redirect to external sites
      if (targetPath.startsWith('/')) {
        navigate(targetPath);
        return;
      }
    }

    navigateWithLang('/');
  };

  const handleUserRegister = async (email: string, password: string, username: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        username,
        fingerprint_id: getFingerprintId()
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || t('auth.registerError'));
    }

    // Save email for verification
    localStorage.setItem('registration_email', email);
  };

  const handleUserVerifyCode = async (code: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/confirm-registration/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verification_code: code,
        email: localStorage.getItem('registration_email'),
        fingerprint_id: getFingerprintId()
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || t('auth.verifyError'));
    }

    // Preserve redirect param
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    if (redirect) {
      navigateWithLang(`/login?redirect=${encodeURIComponent(redirect)}`);
    } else {
      navigateWithLang('/login');
    }
  };

  const handleGoogleLogin = () => {
    const searchParams = new URLSearchParams(window.location.search);
    let redirect = searchParams.get('redirect');

    // Если нет параметра redirect и мы не на странице логина/регистрации,
    // используем текущий путь как redirect
    if (!redirect) {
      const currentPath = window.location.pathname;
      // Исключаем страницы аутентификации, чтобы не создавать циклические редиректы
      if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/auth/')) {
        redirect = currentPath + window.location.search;
      }
    }

    let googleAuthUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.GOOGLE_AUTH}`;
    if (redirect) {
      const separator = googleAuthUrl.includes('?') ? '&' : '?';
      googleAuthUrl = `${googleAuthUrl}${separator}redirect=${encodeURIComponent(redirect)}`;
    }

    window.location.href = googleAuthUrl;
  };

  const handleCharacterSelect = (character: any) => {
    setSelectedCharacter(character);
    navigateWithLang(`/chat/${character.id}`);
  };

  const handlePhotoGeneration = (character: any) => {
    setSelectedCharacter(character);
    navigateWithLang(`/photo-generation/${character.id}`);
  };

  const handlePaidAlbum = (character: any) => {
    console.log('[DEBUG] handlePaidAlbum called');
    console.log('[DEBUG] canEditAlbum:', canEditAlbum);
    console.log('[DEBUG] userInfo:', userInfo);
    console.log('[DEBUG] subscription:', userInfo?.subscription);
    console.log('[DEBUG] subscription_type:', userInfo?.subscription?.subscription_type);

    // Для пользователей с подпиской STANDARD или PREMIUM открываем альбом сразу
    if (canEditAlbum) {
      console.log('[DEBUG] Opening album directly (user has subscription)');
      setSelectedCharacter(character);
      navigateWithLang(`/paid-album/${character.id}`);
    } else {
      console.log('[DEBUG] Opening modal (user does NOT have subscription)');
      // Для FREE пользователей показываем модальное окно с предложением подписки
      setSelectedAlbumCharacter(character);
      setIsPaidAlbumModalOpen(true);
    }
  };

  const handleOpenChat = (character: any) => {
    setSelectedCharacter(character);
    navigateWithLang(`/chat/${character.id}`);
  };

  const handleBackToChat = () => {
    if (selectedCharacter) {
      navigateWithLang(`/chat/${selectedCharacter.id}`);
    } else {
      navigate(-1);
    }
  };
  const handleBackToAlbum = () => navigate(-1);

  const handlePurchaseAlbum = async (characterId: number) => {
    setIsPaidAlbumModalOpen(false);
    navigateWithLang(`/paid-album/${characterId}`);
  };

  const handleContentRatingSelect = (rating: 'safe' | 'nsfw') => {
    localStorage.setItem('contentRating', rating);
    setContentMode(rating);
    setShowContentRatingModal(false);
    if (rating === 'nsfw') {
      navigateWithLang('/nsfw');
    } else {
      navigateWithLang('/');
    }
  };

  const handleCreateRatingSelect = (rating: 'safe' | 'nsfw') => {
    setShowCreateRatingModal(false);
    navigate(`/${currentLang}/create-character`, { state: { contentMode: rating } });
  };

  const handleEditCharacterSelect = async (character: any) => {
    console.log('[EDIT] Starting edit for character:', character);
    setIsLoadingCharacter(true);
    try {
      // Загружаем полные данные персонажа с сервера
      const identifier = character.id || character.name;
      console.log('[EDIT] Loading character data for identifier:', identifier);
      const response = await authManager.fetchWithAuth(
        `${API_CONFIG.BASE_URL}/api/v1/characters/${encodeURIComponent(identifier)}/with-creator`
      );

      console.log('[EDIT] API response status:', response.status);

      if (response.ok) {
        const fullCharacterData = await response.json();
        console.log('[EDIT] Full character data from API:', fullCharacterData);
        console.log('[EDIT] Fields check:', {
          situation_ru: fullCharacterData.situation_ru,
          situation_en: fullCharacterData.situation_en,
          instructions_ru: fullCharacterData.instructions_ru,
          instructions_en: fullCharacterData.instructions_en,
          appearance_ru: fullCharacterData.appearance_ru,
          appearance_en: fullCharacterData.appearance_en,
          character_appearance: fullCharacterData.character_appearance,
          location_ru: fullCharacterData.location_ru,
          location_en: fullCharacterData.location_en,
          location: fullCharacterData.location
        });

        setSelectedCharacter(fullCharacterData);
        // Используем setTimeout чтобы дать React время обновить состояние перед навигацией
        setTimeout(() => {
          navigateWithLang('/edit-character');
        }, 0);
      } else {
        console.error('[EDIT] Failed to load character data:', response.status);
        // Fallback: используем переданные данные, если загрузка не удалась
        setSelectedCharacter(character);
        setTimeout(() => {
          navigateWithLang('/edit-character');
        }, 0);
      }
    } catch (error) {
      console.error('[EDIT] Error loading character data:', error);
      // Fallback: используем переданные данные при ошибке
      setSelectedCharacter(character);
      setTimeout(() => {
        navigateWithLang('/edit-character');
      }, 0);
    } finally {
      setIsLoadingCharacter(false);
    }
  };

  // SEO configuration
  const getSEOConfig = () => {
    const baseUrl = 'https://candygirlschat.com';
    const innerPath = location.pathname.split('/').slice(2).join('/');

    const hreflangs = ['ru', 'en'].map(l => ({
      hreflang: l,
      href: `${baseUrl}/${l}/${innerPath}`
    }));

    const getConfig = (titleKey: string, descKey: string) => ({
      title: t(titleKey),
      description: t(descKey),
      canonical: `${baseUrl}/${currentLang}/${innerPath}`,
      keywords: 'ai chat, virtual characters, candy girls',
      ogImage: `${baseUrl}/logo-cherry.png`,
      hreflangs
    });

    if (location.pathname.includes('/chat/')) {
      const charName = selectedCharacter?.translations?.[currentLang]?.name || selectedCharacter?.name || selectedCharacter?.display_name;
      return {
        title: t('seo.chatTitle', { name: charName }),
        description: selectedCharacter?.translations?.[currentLang]?.description || selectedCharacter?.description || t('seo.chatDescription', { name: charName }),
        canonical: `${baseUrl}/${currentLang}/${innerPath}`,
        keywords: `${charName}, ai chat, virtual characters`,
        ogImage: selectedCharacter?.avatar || `${baseUrl}/logo-cherry.png`,
        hreflangs
      };
    }

    if (location.pathname.includes('/login')) return getConfig('seo.loginTitle', 'seo.loginDescription');
    if (location.pathname.includes('/register')) return getConfig('seo.registerTitle', 'seo.registerDescription');
    if (location.pathname.includes('/shop')) return getConfig('seo.shopTitle', 'seo.shopDescription');
    if (location.pathname.includes('/profile')) return getConfig('seo.profileTitle', 'seo.profileDescription');
    if (location.pathname.includes('/favorites')) return getConfig('seo.favoritesTitle', 'seo.favoritesDescription');

    return getConfig('seo.mainTitle', 'seo.mainDescription');
  };

  useSEO(getSEOConfig());

  const commonRoutes = (
    <>
      <Route index element={<MainPage contentMode='safe' onCharacterSelect={handleCharacterSelect} onShop={handleShop} onProfile={handleProfile} onPhotoGeneration={handlePhotoGeneration} onPaidAlbum={handlePaidAlbum} onCreateCharacter={handleCreateCharacter} />} />
      <Route path="nsfw" element={<MainPage contentMode='nsfw' onCharacterSelect={handleCharacterSelect} onShop={handleShop} onProfile={handleProfile} onPhotoGeneration={handlePhotoGeneration} onPaidAlbum={handlePaidAlbum} onCreateCharacter={handleCreateCharacter} />} />
      <Route path="chat/:characterId" element={
        <ChatContainer
          onBackToMain={handleBackToMain}
          onCreateCharacter={handleCreateCharacter}
          onEditCharacters={handleEditCharacters}
          onShop={handleShop}
          onProfile={(userId) => handleProfile(userId)}
          onOwnProfile={() => handleProfile()}
          initialCharacter={selectedCharacter}
          onOpenPaidAlbum={handlePaidAlbum}
          onOpenPaidAlbumBuilder={(char) => navigateWithLang(`/paid-album-builder/${char.id}`)}
          onNavigate={(page, char) => {
            setSelectedCharacter(char);
            navigateWithLang(`/${page}/${char.id}`);
          }}
          subscriptionType={userInfo?.subscription?.subscription_type || 'free'}
        />
      } />
      <Route path="shop" element={<ShopPage onBackToMain={handleBackToMain} onProfile={handleProfile} onLogin={handleLogin} />} />
      <Route path="profile" element={<ProfilePage onBackToMain={handleBackToMain} onLogout={handleLogout} onShop={handleShop} onCharacterSelect={handleCharacterSelect} />} />
      <Route path="profile/:userId" element={<ProfilePage onBackToMain={handleBackToMain} onLogout={handleLogout} onShop={handleShop} onCharacterSelect={handleCharacterSelect} />} />
      <Route path="photo-generation/:id" element={<PhotoGenerationPage3 character={selectedCharacter} onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} onChat={handleOpenChat} onPaidAlbumBuilder={(char) => navigateWithLang(`/paid-album-builder/${char.id}`)} />} />
      <Route path="paid-album/:id" element={<PaidAlbumPage character={selectedCharacter} onBackToMain={handleBackToMain} onBackToChat={handleBackToChat} onShop={handleShop} onProfile={handleProfile} canEditAlbum={canEditAlbum} />} />
      <Route path="paid-album-builder/:id" element={<PaidAlbumBuilderPage character={selectedCharacter} onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} onBackToAlbum={handleBackToAlbum} canEditAlbum={canEditAlbum} />} />
      <Route path="my-characters" element={<MyCharactersPage onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} onEditCharacters={handleEditCharacters} onCreateCharacter={handleCreateCharacter} onCharacterSelect={handleCharacterSelect} />} />
      <Route path="create-character" element={
        <CreateCharacterPage
          onBackToMain={handleBackToMain}
          onShop={handleShop}
          onProfile={handleProfile}
          onOpenPaidAlbumBuilder={(char) => navigateWithLang(`/paid-album-builder/${char.id}`)}
          onOpenChat={handleOpenChat}
          onLogin={handleLogin}
        />
      } />
      <Route path="edit-character" element={
        <CreateCharacterPage
          mode="edit"
          initialCharacter={selectedCharacter}
          onBackToEditList={handleEditCharacters}
          onBackToMain={handleBackToMain}
          onShop={handleShop}
          onProfile={() => handleProfile()}
          onOpenPaidAlbumBuilder={(char) => navigateWithLang(`/paid-album-builder/${char.id}`)}
          onOpenChat={handleOpenChat}
          onLogin={handleLogin}
        />
      } />
      <Route path="edit-characters" element={<EditCharactersPage onBackToMain={handleBackToMain} onShop={handleShop} onEditCharacter={handleEditCharacterSelect} onCreateCharacter={handleCreateCharacter} />} />
      <Route path="history" element={<HistoryPage onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} onCreateCharacter={handleCreateCharacter} onEditCharacters={handleEditCharacters} onOpenChat={handleOpenChat} />} />
      <Route path="messages" element={<MessagesPage onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} onCreateCharacter={handleCreateCharacter} onEditCharacters={handleEditCharacters} onOpenChat={handleOpenChat} />} />
      <Route path="gallery" element={<UserGalleryPage onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} />} />
      <Route path="favorites" element={<FavoritesPage onBackToMain={handleBackToMain} onCharacterSelect={handleCharacterSelect} onShop={handleShop} onPhotoGeneration={handlePhotoGeneration} onPaidAlbum={handlePaidAlbum} onProfile={handleProfile} />} />
      <Route path="character-comments" element={
        <CharacterCommentsPage
          characterName={selectedCharacter?.name || ''}
          onBack={() => navigate(-1)}
          onShop={handleShop}
          onProfile={handleProfile}
        />
      } />
      <Route path="bug-report" element={<BugReportPage onBackToMain={handleBackToMain} onProfile={handleProfile} onLogout={handleLogout} />} />
      <Route path="admin-logs" element={<AdminLogsPage onBackToMain={handleBackToMain} onShop={handleShop} onProfile={handleProfile} />} />
      <Route path="legal" element={<LegalPage />} />
      <Route path="terms" element={<TermsPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="how-it-works" element={<HowItWorksPage />} />
      <Route path="login" element={
        <AuthPage
          onLogin={handleUserLogin}
          onGoogleLogin={handleGoogleLogin}
          onSignUp={(redirect) => handleRegister(redirect)}
          onForgotPassword={() => navigateWithLang('/forgot-password')}
          onBackToMain={handleBackToMain}
        />
      } />
      <Route path="register" element={
        <RegisterPage
          onLogin={(redirect) => handleLogin(redirect)}
          onRegister={handleUserRegister}
          onVerifyCode={handleUserVerifyCode}
          onGoogleRegister={handleGoogleLogin}
          onBackToMain={handleBackToMain}
        />
      } />
      <Route path="forgot-password" element={
        <ForgotPasswordPage
          onBackToLogin={handleLogin}
          onBackToMain={handleBackToMain}
        />
      } />
      <Route path="tags/:tagSlug" element={<TagsPage slug={selectedTagId || ''} onBackToMain={handleBackToMain} onCharacterSelect={handleCharacterSelect} setTagName={setTagName} onShop={handleShop} onProfile={handleProfile} />} />
    </>
  );

  const isFullWidthPage = ['/chat', '/create-character', '/edit-character'].some(path => {
    if (path === '/edit-character') {
      return location.pathname === '/edit-character';
    }
    return location.pathname.includes(path);
  });
  const isCreateOrEditPage = ['/create-character', '/edit-character'].some(path => location.pathname.includes(path));

  return (
    <>
      <GlobalStyles />
      <ErrorBoundary>
        <AppContainer $isMobile={isMobile}>
          <BackgroundWrapper>
            <DarkVeil speed={1.1} />
          </BackgroundWrapper>

          <StaggeredSidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            isMobile={isMobile}
            onCreateCharacter={() => { setIsSidebarOpen(false); handleCreateCharacter(); }}
            onEditCharacters={() => { setIsSidebarOpen(false); handleEditCharacters(); }}
            onHistory={() => { setIsSidebarOpen(false); handleHistory(); }}
            onFavorites={() => { setIsSidebarOpen(false); handleFavorites(); }}
            onMyCharacters={() => { setIsSidebarOpen(false); handleMyCharacters(); }}
            onMessages={() => { setIsSidebarOpen(false); handleMessages(); }}
            onBugReport={() => { setIsSidebarOpen(false); handleBugReport(); }}
            onProfile={() => { setIsSidebarOpen(false); handleProfile(); }}
            onShop={() => { setIsSidebarOpen(false); handleShop(); }}
            isAuthenticated={isAuthenticated}
            isAdmin={userInfo?.is_admin}
            contentMode={contentMode}
            onContentModeChange={(mode) => {
              setContentMode(mode);
              if (mode === 'nsfw') {
                navigateWithLang('/nsfw');
              } else {
                navigateWithLang('/');
              }
            }}
            onRequireAuth={() => navigateWithLang('/login')}
          />

          <GlobalHeader
            onShop={handleShop}
            onProfile={() => handleProfile()}
            onLogin={handleLogin}
            onRegister={() => navigateWithLang('/register')}
            onLogout={handleLogout}
            onHome={handleBackToMain}
            currentCharacterId={selectedCharacter?.id}
            isOnChatPage={location.pathname.includes('/chat/')}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <PageContainer $isMobile={isMobile} $isSidebarOpen={isSidebarOpen} $isFullWidth={isFullWidthPage}>
            <Routes>
              {/* Redirect root to preferred language */}
              <Route path="/" element={<LanguageRedirect />} />

              {/* Explicit Language Routes */}
              <Route path=":lang/*" element={<LanguageWrapper />}>
                <Route path="*" element={<Routes>{commonRoutes}</Routes>} />
              </Route>
            </Routes>
          </PageContainer>
        </AppContainer>

        {isPaidAlbumModalOpen && selectedAlbumCharacter && (
          <BoosterOfferModal
            isOpen={isPaidAlbumModalOpen}
            onClose={() => {
              setIsPaidAlbumModalOpen(false);
              setSelectedAlbumCharacter(null);
            }}
            limitType="photos"
            variant="album_access"
            characterId={selectedAlbumCharacter.id}
            onShop={handleShop}
          />
        )}

        {/* Global Content Mode Modal */}
        <ContentRatingModal
          isOpen={showContentRatingModal}
          onClose={() => setShowContentRatingModal(false)}
          onSelect={handleContentRatingSelect}
        />

        {/* Create Character Pre-Rating Modal */}
        <ContentRatingModal
          isOpen={showCreateRatingModal}
          onClose={() => setShowCreateRatingModal(false)}
          onSelect={handleCreateRatingSelect}
        />

        {emptyAlbumToast && (
          <EmptyAlbumToast>{t('album.noPhotos')}</EmptyAlbumToast>
        )}
      </ErrorBoundary>
    </>
  );
}

export default App;