import { useState, useEffect } from 'react';
import React from 'react';
import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import { MainPage } from './components/MainPage';
import { ChatContainer } from './components/ChatContainer';
import { MyCharactersPage } from './components/MyCharactersPage';
import { CreateCharacterPage } from './components/CreateCharacterPage';
import { ShopPage } from './components/ShopPage';
import { ProfilePage } from './components/ProfilePage';
import { MessagesPage } from './components/MessagesPage';
import { UserGalleryPage } from './components/UserGalleryPage';
import { PaidAlbumPage } from './components/PaidAlbumPage';
import { PaidAlbumBuilderPage } from './components/PaidAlbumBuilderPage';
import { PhotoGenerationPage3 } from './components/PhotoGenerationPage3';
import { EditCharactersPage } from './components/EditCharactersPage';
import { EditCharacterPage } from './components/EditCharacterPage';
import { FavoritesPage } from './components/FavoritesPage';
import { LeftDockSidebar } from './components/LeftDockSidebar';
import { authManager } from './utils/auth';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  position: relative;
`;

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: auto;
  position: relative;
  padding-top: 0;
  scroll-behavior: smooth;
`;

type PageType = 
  | 'main' 
  | 'chat' 
  | 'my-characters' 
  | 'create-character' 
  | 'shop' 
  | 'profile' 
  | 'messages' 
  | 'user-gallery' 
  | 'paid-album' 
  | 'paid-album-builder'
  | 'photo-generation' 
  | 'edit-characters'
  | 'edit-character'
  | 'favorites';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('main');
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [contentMode, setContentMode] = useState<'safe' | 'nsfw'>('safe');

  // Функция загрузки персонажа по ID
  const loadCharacterById = async (characterId: string | number): Promise<any | null> => {
    try {
      // Сначала проверяем localStorage
      const savedCharacter = localStorage.getItem(`character_${characterId}`);
      if (savedCharacter) {
        return JSON.parse(savedCharacter);
      }

      // Загружаем из API
      const response = await fetch(`/api/v1/characters/`);
      if (response.ok) {
        const characters = await response.json();
        const character = Array.isArray(characters) 
          ? characters.find((char: any) => char.id === Number(characterId) || char.id === String(characterId))
          : null;
        
        if (character) {
          // Сохраняем в localStorage
          localStorage.setItem(`character_${characterId}`, JSON.stringify(character));
          return character;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading character by ID:', error);
      return null;
    }
  };

  // Синхронизация с историей браузера
  useEffect(() => {
    // Восстанавливаем состояние из URL при загрузке
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Парсим состояние из hash или query параметров
    if (path.includes('/chat')) {
      const characterId = urlParams.get('character');
      if (characterId) {
        // Восстанавливаем персонажа из localStorage или API
        loadCharacterById(characterId).then(char => {
          if (char) {
            console.log('Loaded character for chat:', char);
            setSelectedCharacter(char);
            setCurrentPage('chat');
            window.history.replaceState({ page: 'chat', character: characterId }, '', path);
          } else {
            console.error('Failed to load character with ID:', characterId);
            // Если не удалось загрузить, остаемся на главной
            setCurrentPage('main');
            window.history.replaceState({ page: 'main' }, '', '/');
          }
        });
      } else {
        // Если нет characterId, остаемся на главной
        setCurrentPage('main');
        window.history.replaceState({ page: 'main' }, '', '/');
      }
    } else if (path.includes('/my-characters')) {
      setCurrentPage('my-characters');
      window.history.replaceState({ page: 'my-characters' }, '', path);
    } else if (path.includes('/favorites')) {
      setCurrentPage('favorites');
      window.history.replaceState({ page: 'favorites' }, '', path);
    } else if (path.includes('/create-character')) {
      setCurrentPage('create-character');
      window.history.replaceState({ page: 'create-character' }, '', path);
    } else if (path.includes('/shop')) {
      setCurrentPage('shop');
      window.history.replaceState({ page: 'shop' }, '', path);
    } else if (path.includes('/profile')) {
      setCurrentPage('profile');
      window.history.replaceState({ page: 'profile' }, '', path);
    } else if (path.includes('/messages')) {
      setCurrentPage('messages');
      window.history.replaceState({ page: 'messages' }, '', path);
    } else if (path.includes('/photo-generation')) {
      const characterId = urlParams.get('character');
      if (characterId) {
        // Загружаем данные персонажа по ID
        loadCharacterById(characterId).then(char => {
          if (char) {
            setSelectedCharacter(char);
            setCurrentPage('photo-generation');
            window.history.replaceState({ page: 'photo-generation', character: characterId }, '', path);
          } else {
            setCurrentPage('main');
            window.history.replaceState({ page: 'main' }, '', '/');
          }
        });
        return; // Выходим, чтобы не устанавливать main
      } else {
        setCurrentPage('main');
        window.history.replaceState({ page: 'main' }, '', '/');
      }
    } else {
      setCurrentPage('main');
      window.history.replaceState({ page: 'main' }, '', '/');
    }
  }, []);

  // Обработка кнопок назад/вперед в браузере
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { page, character } = event.state;
        if (page) {
          setCurrentPage(page as PageType);
          if (character) {
            const savedCharacter = localStorage.getItem(`character_${character}`);
            if (savedCharacter) {
              setSelectedCharacter(JSON.parse(savedCharacter));
            }
          } else {
            setSelectedCharacter(null);
          }
        }
      } else {
        // Если нет состояния, возвращаемся на главную
        setCurrentPage('main');
        setSelectedCharacter(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Обработка OAuth callback - сохранение токенов из URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const needsUsername = urlParams.get('needs_username') === 'true';

    if (accessToken) {
      // Сохраняем токены через authManager
      authManager.setTokens(accessToken, refreshToken || null);

      // Очищаем URL от токенов для безопасности
      window.history.replaceState({}, document.title, window.location.pathname);

      // Если нужен username, можно показать модальное окно
      if (needsUsername) {
        // TODO: Показать модальное окно для установки username
        console.log('User needs to set username');
      }

      // Перезагружаем страницу для обновления состояния авторизации
      window.location.reload();
    }
  }, []);

  const handleCharacterSelect = (character: any) => {
    setSelectedCharacter(character);
    setCurrentPage('chat');
    // Сохраняем персонажа для истории
    if (character?.id) {
      localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
      window.history.pushState({ page: 'chat', character: character.id }, '', `/chat?character=${character.id}`);
    } else {
      window.history.pushState({ page: 'chat' }, '', '/chat');
    }
  };

  const handlePaidAlbumBuilder = (character: any) => {
    setSelectedCharacter(character);
    setCurrentPage('paid-album-builder');
    if (character?.id) {
      localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
      window.history.pushState({ page: 'paid-album-builder', character: character.id }, '', `/paid-album-builder?character=${character.id}`);
    } else {
      window.history.pushState({ page: 'paid-album-builder' }, '', '/paid-album-builder');
    }
  };

  const handleBackToMain = () => {
    setCurrentPage('main');
    setSelectedCharacter(null);
    window.history.pushState({ page: 'main' }, '', '/');
  };

  const handleMyCharacters = () => {
    setCurrentPage('my-characters');
    window.history.pushState({ page: 'my-characters' }, '', '/my-characters');
  };

  const handleCreateCharacter = () => {
    setCurrentPage('create-character');
    window.history.pushState({ page: 'create-character' }, '', '/create-character');
  };

  const handleShop = () => {
    setCurrentPage('shop');
    window.history.pushState({ page: 'shop' }, '', '/shop');
  };

  const handleProfile = (userId?: number) => {
    setCurrentPage('profile');
    if (userId) {
      window.history.pushState({ page: 'profile', userId }, '', `/profile?user=${userId}`);
    } else {
      window.history.pushState({ page: 'profile' }, '', '/profile');
    }
  };

  const handleMessages = () => {
    setCurrentPage('messages');
    window.history.pushState({ page: 'messages' }, '', '/messages');
  };


  const handlePhotoGeneration = (character: any) => {
    setSelectedCharacter(character);
    setCurrentPage('photo-generation');
    if (character?.id) {
      localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
      window.history.pushState({ page: 'photo-generation', character: character.id }, '', `/photo-generation?character=${character.id}`);
    } else {
      window.history.pushState({ page: 'photo-generation' }, '', '/photo-generation');
    }
  };

  const handlePaidAlbum = (character: any) => {
    setSelectedCharacter(character);
    setCurrentPage('paid-album');
    if (character?.id) {
      localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
      window.history.pushState({ page: 'paid-album', character: character.id }, '', `/paid-album?character=${character.id}`);
    } else {
      window.history.pushState({ page: 'paid-album' }, '', '/paid-album');
    }
  };

  const handleEditCharacters = () => {
    setCurrentPage('edit-characters');
    window.history.pushState({ page: 'edit-characters' }, '', '/edit-characters');
  };

  const handleFavorites = () => {
    setCurrentPage('favorites');
    window.history.pushState({ page: 'favorites' }, '', '/favorites');
  };

  const handleOpenUserGallery = (userId?: number) => {
    setCurrentPage('user-gallery');
    if (userId) {
      window.history.pushState({ page: 'user-gallery', userId }, '', `/user-gallery?user=${userId}`);
    } else {
      window.history.pushState({ page: 'user-gallery' }, '', '/user-gallery');
    }
  };

  const handleHistory = () => {
    setCurrentPage('messages');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'main':
        return (
          <MainPage 
            onCharacterSelect={handleCharacterSelect} 
            onMyCharacters={handleMyCharacters}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onProfile={handleProfile}
            onMessages={handleMessages}
            onPhotoGeneration={handlePhotoGeneration}
            onPaidAlbum={handlePaidAlbum}
            onEditCharacters={handleEditCharacters}
            onFavorites={handleFavorites}
            onHistory={handleHistory}
            onHome={handleBackToMain}
            contentMode={contentMode}
          />
        );
      case 'chat':
        return (
          <ChatContainer 
            onBackToMain={handleBackToMain}
            initialCharacter={selectedCharacter}
            onShop={handleShop}
            onProfile={handleProfile}
            onOpenPaidAlbum={handlePaidAlbum}
            onOpenPaidAlbumBuilder={(character) => {
              setSelectedCharacter(character);
              setCurrentPage('paid-album-builder');
              if (character?.id) {
                localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
                window.history.pushState({ page: 'paid-album-builder', character: character.id }, '', `/paid-album-builder?character=${character.id}`);
              } else {
                window.history.pushState({ page: 'paid-album-builder' }, '', '/paid-album-builder');
              }
            }}
            onNavigate={(page, character) => {
              setSelectedCharacter(character);
              setCurrentPage(page as PageType);
              if (character?.id) {
                localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
                window.history.pushState({ page, character: character.id }, '', `/${page}?character=${character.id}`);
              } else {
                window.history.pushState({ page }, '', `/${page}`);
              }
            }}
          />
        );
      case 'my-characters':
        return (
          <MyCharactersPage
            onBackToMain={handleBackToMain}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onEditCharacters={handleEditCharacters}
            onPhotoGeneration={handlePhotoGeneration}
            onPaidAlbum={handlePaidAlbum}
          />
        );
      case 'create-character':
        return (
          <CreateCharacterPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onMyCharacters={handleMyCharacters}
            onPhotoGeneration={handlePhotoGeneration}
            contentMode={contentMode}
          />
        );
      case 'shop':
        return (
          <ShopPage
            onBackToMain={handleBackToMain}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
          />
        );
      case 'profile':
        const urlParams = new URLSearchParams(window.location.search);
        const profileUserId = urlParams.get('user') ? Number(urlParams.get('user')) : undefined;
        return (
          <ProfilePage
            userId={profileUserId}
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onOpenUserGallery={handleOpenUserGallery}
            onProfile={handleProfile}
          />
        );
      case 'messages':
        return (
          <MessagesPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacters={handleEditCharacters}
            onOpenChat={handleCharacterSelect}
          />
        );
      case 'user-gallery':
        const galleryUrlParams = new URLSearchParams(window.location.search);
        const galleryUserId = galleryUrlParams.get('user') ? Number(galleryUrlParams.get('user')) : undefined;
        return (
          <UserGalleryPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            userId={galleryUserId}
          />
        );
      case 'paid-album':
        return selectedCharacter ? (
          <PaidAlbumPage
            character={selectedCharacter}
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onBackToChat={() => setCurrentPage('chat')}
          />
        ) : null;
      case 'paid-album-builder':
        return selectedCharacter ? (
          <PaidAlbumBuilderPage
            character={selectedCharacter}
            onBackToMain={handleBackToMain}
            onBackToAlbum={() => handlePaidAlbum(selectedCharacter)}
            onBackToChat={() => setCurrentPage('chat')}
          />
        ) : null;
      case 'photo-generation':
        return selectedCharacter ? (
          <PhotoGenerationPage3
            character={selectedCharacter}
            onBackToMain={handleBackToMain}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onProfile={handleProfile}
            onChat={handleCharacterSelect}
            onPaidAlbumBuilder={handlePaidAlbumBuilder}
          />
        ) : null;
      case 'edit-characters':
        return (
          <EditCharactersPage
            onBackToMain={handleBackToMain}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onEditCharacter={(character) => {
              setSelectedCharacter(character);
              setCurrentPage('edit-character');
            }}
          />
        );
      case 'edit-character':
        return selectedCharacter ? (
          <EditCharacterPage
            character={selectedCharacter}
            onBackToEditList={() => setCurrentPage('edit-characters')}
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onProfile={handleProfile}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacters={handleEditCharacters}
          />
        ) : null;
      case 'favorites':
        return (
          <FavoritesPage
            onBackToMain={handleBackToMain}
            onCharacterSelect={handleCharacterSelect}
            onShop={handleShop}
            onPhotoGeneration={handlePhotoGeneration}
            onPaidAlbum={handlePaidAlbum}
          />
        );
      default:
        return (
          <MainPage 
            onCharacterSelect={handleCharacterSelect} 
            onMyCharacters={handleMyCharacters}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onProfile={handleProfile}
            onMessages={handleMessages}
            onPhotoGeneration={handlePhotoGeneration}
            onPaidAlbum={handlePaidAlbum}
          />
        );
    }
  };

  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userInfo, setUserInfo] = React.useState<{username: string, coins: number} | null>(null);

  React.useEffect(() => {
    const checkAuth = async () => {
      // Даем время для загрузки токена после перезагрузки страницы
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        const token = authManager.getToken();
        console.log('[APP] Checking auth, token exists:', !!token);
        if (!token) {
          // Пытаемся обновить токен через refresh token
          const refreshToken = authManager.getRefreshToken();
          if (refreshToken) {
            try {
              console.log('[APP] Attempting to refresh token...');
              await authManager.refreshAccessToken();
              console.log('[APP] Token refreshed successfully');
            } catch (error) {
              console.error('[APP] Failed to refresh token:', error);
              setIsAuthenticated(false);
              setUserInfo(null);
              return;
            }
          } else {
          setIsAuthenticated(false);
          setUserInfo(null);
          return;
          }
        }

        const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
        if (response.ok) {
          const userData = await response.json();
          console.log('[APP] Auth check successful, user:', userData.username || userData.email);
          setUserInfo({
            username: userData.username || userData.email || 'Пользователь',
            coins: userData.coins || 0
          });
          setIsAuthenticated(true);
        } else {
          console.error('[APP] Auth check failed, status:', response.status);
          authManager.clearTokens();
          setIsAuthenticated(false);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('[APP] Auth check error:', error);
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    };

    checkAuth();
  }, []);

  // Применяем темную тему
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
  }, []);

  const handleLogin = () => {
    // Открываем popup окно для OAuth
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      '/auth/google/?mode=popup',
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // Слушаем сообщения от popup окна
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    messageHandler = (event: MessageEvent) => {
      // Проверяем origin для безопасности (разрешаем localhost и 127.0.0.1)
      const allowedOrigins = [
        window.location.origin,
        'http://localhost:5175',
        'http://127.0.0.1:5175',
        'http://localhost:8000',
        'http://127.0.0.1:8000'
      ];
      
      if (!allowedOrigins.includes(event.origin)) {
        console.log('OAuth message from unauthorized origin:', event.origin);
        return;
      }

      console.log('OAuth message received:', event.data);

      if (event.data && event.data.type === 'oauth-success') {
        console.log('OAuth success, saving tokens...');
        // Сохраняем токены через authManager
        if (event.data.accessToken) {
          authManager.setTokens(event.data.accessToken, event.data.refreshToken || null);
          console.log('Tokens saved via authManager');
        }

        // Закрываем popup (безопасно, без проверки closed)
        try {
          if (popup) {
            popup.close();
          }
        } catch (e) {
          // Игнорируем ошибки закрытия popup
        }

        // Удаляем слушатель
        if (messageHandler) {
          window.removeEventListener('message', messageHandler);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Небольшая задержка перед перезагрузкой, чтобы токены точно сохранились
        setTimeout(() => {
          console.log('Reloading page after OAuth success...');
          // Обновляем состояние авторизации
          window.location.reload();
        }, 200);
      } else if (event.data && event.data.type === 'oauth-error') {
        console.error('OAuth error:', event.data.error);
        try {
          if (popup) {
            popup.close();
          }
        } catch (e) {
          // Игнорируем ошибки закрытия popup
        }
        if (messageHandler) {
          window.removeEventListener('message', messageHandler);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    window.addEventListener('message', messageHandler);

    // Таймаут для очистки слушателя, если popup не ответил
    timeoutId = setTimeout(() => {
      if (messageHandler) {
        window.removeEventListener('message', messageHandler);
      }
    }, 5 * 60 * 1000); // 5 минут таймаут
  };

  const handleRegister = () => {
    // Регистрация через тот же OAuth (Google OAuth используется и для логина, и для регистрации)
    console.log('Register button clicked');
    handleLogin();
  };

  const handleLogout = async () => {
    try {
      await authManager.logout();
      setIsAuthenticated(false);
      setUserInfo(null);
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <GlobalStyles />
      <AppContainer>
        <LeftDockSidebar
          onProfile={handleProfile}
          onShop={handleShop}
          onCreateCharacter={handleCreateCharacter}
          onEditCharacters={handleEditCharacters}
          onHistory={handleHistory}
          onFavorites={handleFavorites}
          onMyCharacters={handleMyCharacters}
          onHome={handleBackToMain}
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          contentMode={contentMode}
          onContentModeChange={setContentMode}
        />
        <PageContainer className="app-scroll-container">
          {renderPage()}
        </PageContainer>
      </AppContainer>
    </>
  );
}

export default App;