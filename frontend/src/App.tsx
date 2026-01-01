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
import { HistoryPage } from './components/HistoryPage';
import { UserGalleryPage } from './components/UserGalleryPage';
import { PaidAlbumPage } from './components/PaidAlbumPage';
import { PaidAlbumBuilderPage } from './components/PaidAlbumBuilderPage';
import { PhotoGenerationPage3 } from './components/PhotoGenerationPage3';
import { EditCharactersPage } from './components/EditCharactersPage';
import { EditCharacterPage } from './components/EditCharacterPage';
import { FavoritesPage } from './components/FavoritesPage';
import { BalanceHistoryPage } from './components/BalanceHistoryPage';
import { CharacterCommentsPage } from './components/CharacterCommentsPage';
import { BugReportPage } from './components/BugReportPage';
import { LeftDockSidebar } from './components/LeftDockSidebar';
import { AuthModal } from './components/AuthModal';
import { AgeVerificationModal } from './components/AgeVerificationModal';
import { LegalPage } from './components/LegalPage';
import { AboutPage } from './components/AboutPage';
import { TariffsPage } from './components/TariffsPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { PaidAlbumPurchaseModal } from './components/PaidAlbumPurchaseModal';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  | 'favorites'
  | 'history'
  | 'balance-history'
  | 'character-comments'
  | 'legal'
  | 'about'
  | 'tariffs'
  | 'how-it-works'
  | 'bug-report';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('main');
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [contentMode, setContentMode] = useState<'safe' | 'nsfw'>('safe');
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState<string>('');

  // Мемоизируем initialCharacter для ChatContainer, чтобы избежать лишних перезагрузок
  const memoizedInitialCharacter = React.useMemo(() => {
    return selectedCharacter;
  }, [selectedCharacter?.raw?.name, selectedCharacter?.name, selectedCharacter?.id]);

  // Функция загрузки персонажа по ID или имени
  const loadCharacterById = async (characterId: string | number): Promise<any | null> => {
    try {
      console.log('[APP] loadCharacterById called with:', characterId);
      
      // Сначала проверяем localStorage (по ID и по имени)
      const savedById = localStorage.getItem(`character_${characterId}`);
      if (savedById) {
        console.log('[APP] Character found in localStorage by ID:', characterId);
        return JSON.parse(savedById);
      }

      // Пытаемся загрузить из API по ID
      try {
        const response = await fetch(`/api/v1/characters/${encodeURIComponent(characterId)}`);
        if (response.ok) {
          const character = await response.json();
          if (character && (character.id || character.name)) {
            console.log('[APP] Character loaded from API by ID:', characterId);
            // Сохраняем в localStorage
            const storageKey = character.id ? `character_${character.id}` : `character_${character.name}`;
            localStorage.setItem(storageKey, JSON.stringify(character));
            return character;
          }
        }
      } catch (apiError) {
        console.warn('[APP] Failed to load character by ID from API, trying list:', apiError);
      }

      // Если не удалось загрузить по ID, пытаемся найти в списке всех персонажей
      const response = await fetch(`/api/v1/characters/`);
      if (response.ok) {
        const characters = await response.json();
        if (Array.isArray(characters)) {
          // Ищем по ID
          let character = characters.find((char: any) => 
            char.id === Number(characterId) || 
            char.id === String(characterId) ||
            String(char.id) === String(characterId)
          );
          
          // Если не нашли по ID, ищем по имени
          if (!character) {
            character = characters.find((char: any) => 
              char.name === characterId || 
              char.name === String(characterId)
            );
          }
          
          if (character) {
            console.log('[APP] Character found in list:', characterId);
            // Сохраняем в localStorage
            const storageKey = character.id ? `character_${character.id}` : `character_${character.name}`;
            localStorage.setItem(storageKey, JSON.stringify(character));
            return character;
          }
        }
      }
      
      console.warn('[APP] Character not found:', characterId);
      return null;
    } catch (error) {
      console.error('[APP] Error loading character by ID:', error);
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
    } else if (path.includes('/legal')) {
      setCurrentPage('legal');
      window.history.replaceState({ page: 'legal' }, '', path);
    } else if (path.includes('/about')) {
      setCurrentPage('about');
      window.history.replaceState({ page: 'about' }, '', path);
    } else if (path.includes('/tariffs')) {
      setCurrentPage('tariffs');
      window.history.replaceState({ page: 'tariffs' }, '', path);
    } else if (path.includes('/how-it-works')) {
      setCurrentPage('how-it-works');
      window.history.replaceState({ page: 'how-it-works' }, '', path);
    } else if (path.includes('/bug-report')) {
      setCurrentPage('bug-report');
      window.history.replaceState({ page: 'bug-report' }, '', path);
    } else if (path.includes('/history')) {
      setCurrentPage('history');
      window.history.replaceState({ page: 'history' }, '', path);
    } else if (path.includes('/create-character')) {
      setCurrentPage('create-character');
      window.history.replaceState({ page: 'create-character' }, '', path);
    } else if (path.includes('/edit-character')) {
      // КРИТИЧНО: Восстанавливаем персонажа для страницы редактирования
      const characterId = urlParams.get('character');
      if (characterId) {
        console.log('[APP] Restoring character for edit-character:', characterId);
        loadCharacterById(characterId).then(char => {
          if (char) {
            console.log('[APP] Character loaded for edit:', char);
            setSelectedCharacter(char);
            setCurrentPage('edit-character');
            window.history.replaceState({ page: 'edit-character', character: characterId }, '', path);
          } else {
            console.error('[APP] Failed to load character for edit:', characterId);
            setCurrentPage('edit-characters');
            window.history.replaceState({ page: 'edit-characters' }, '', '/edit-characters');
          }
        });
        return; // Выходим, чтобы не устанавливать main
      } else {
        // Если нет characterId, переходим на список редактирования
        setCurrentPage('edit-characters');
        window.history.replaceState({ page: 'edit-characters' }, '', '/edit-characters');
      }
    } else if (path.includes('/edit-characters')) {
      setCurrentPage('edit-characters');
      window.history.replaceState({ page: 'edit-characters' }, '', path);
    } else if (path.includes('/shop')) {
      setCurrentPage('shop');
      // Всегда устанавливаем состояние shop при загрузке страницы
      const currentState = window.history.state;
      if (!currentState || currentState.page !== 'shop') {
        window.history.replaceState({ page: 'shop' }, '', path);
      }
      
      // Проверяем, вернулись ли мы с оплаты
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        // Очищаем URL от параметров после обработки
        window.history.replaceState({ page: 'shop' }, '', '/shop');
      }
    } else if (path.includes('/profile')) {
      setCurrentPage('profile');
      window.history.replaceState({ page: 'profile' }, '', path);
    } else if (path.includes('/messages')) {
      setCurrentPage('messages');
      window.history.replaceState({ page: 'messages' }, '', path);
    } else if (path.includes('/user-gallery')) {
      const galleryUrlParams = new URLSearchParams(window.location.search);
      const galleryUserId = galleryUrlParams.get('user') ? Number(galleryUrlParams.get('user')) : undefined;
      setCurrentPage('user-gallery');
      if (galleryUserId) {
        window.history.replaceState({ page: 'user-gallery', userId: galleryUserId }, '', path);
      } else {
        window.history.replaceState({ page: 'user-gallery' }, '', path);
      }
    } else if (path.includes('/paid-album')) {
      const characterId = urlParams.get('character');
      if (characterId) {
        loadCharacterById(characterId).then(char => {
          if (char) {
            setSelectedCharacter(char);
            setCurrentPage('paid-album');
            window.history.replaceState({ page: 'paid-album', character: characterId }, '', path);
          } else {
            setCurrentPage('main');
            window.history.replaceState({ page: 'main' }, '', '/');
          }
        });
        return;
      } else {
        setCurrentPage('main');
        window.history.replaceState({ page: 'main' }, '', '/');
      }
    } else if (path.includes('/paid-album-builder')) {
      const characterId = urlParams.get('character');
      if (characterId) {
        loadCharacterById(characterId).then(char => {
          if (char) {
            setSelectedCharacter(char);
            setCurrentPage('paid-album-builder');
            window.history.replaceState({ page: 'paid-album-builder', character: characterId }, '', path);
          } else {
            setCurrentPage('main');
            window.history.replaceState({ page: 'main' }, '', '/');
          }
        });
        return;
      } else {
        setCurrentPage('main');
        window.history.replaceState({ page: 'main' }, '', '/');
      }
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
    } else if (path.includes('/character-comments')) {
      const characterName = urlParams.get('character');
      if (characterName) {
        // Загружаем данные персонажа по имени или ID
        loadCharacterById(characterName).then(char => {
          if (char) {
            setSelectedCharacter(char);
            setCurrentPage('character-comments');
            window.history.replaceState({ page: 'character-comments', character: characterName }, '', path);
          } else {
            // Если не удалось загрузить по ID, создаем минимальный объект с именем
            setSelectedCharacter({ name: decodeURIComponent(characterName), id: characterName });
            setCurrentPage('character-comments');
            window.history.replaceState({ page: 'character-comments', character: characterName }, '', path);
          }
        });
        return;
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
        // Если нет состояния, проверяем текущий путь
        const path = window.location.pathname;
        if (path.includes('/shop')) {
          // Если мы на /shop, восстанавливаем состояние shop
          setCurrentPage('shop');
          window.history.replaceState({ page: 'shop' }, '', '/shop');
        } else {
          // Иначе возвращаемся на главную
          setCurrentPage('main');
          setSelectedCharacter(null);
        }
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

      // Переходим на главную страницу после OAuth авторизации
      window.location.href = '/';
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

  const handlePaidAlbum = async (character: any) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
      return;
    }

    // Загружаем актуальную информацию о подписке
    let currentSubscriptionType = subscriptionStats?.subscription_type || userInfo?.subscription?.subscription_type || 'free';
    
    // Если статистика не загружена, загружаем её
    if (!subscriptionStats) {
      try {
        const statsResponse = await authManager.fetchWithAuth('/api/v1/profit/stats/');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setSubscriptionStats(statsData);
          currentSubscriptionType = statsData.subscription_type || 'free';
        }
      } catch (error) {
        console.error('[APP] Ошибка загрузки статистики подписки:', error);
      }
    }

    const normalizedSubscriptionType = currentSubscriptionType.toLowerCase();
    
    // Проверяем статус альбома перед показом модального окна
    try {
      const statusResponse = await authManager.fetchWithAuth(
        `/api/v1/paid-gallery/${character.name}/status/`
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('[APP] Статус платного альбома:', statusData);
        
        // Если альбом уже разблокирован (куплен, Premium, или владелец) - сразу открываем
        if (statusData.unlocked) {
          console.log('[APP] Альбом уже разблокирован, открываем напрямую');
          setSelectedCharacter(character);
          setCurrentPage('paid-album');
          if (character?.id) {
            localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
            window.history.pushState({ page: 'paid-album', character: character.id }, '', `/paid-album?character=${character.id}`);
          } else {
            window.history.pushState({ page: 'paid-album' }, '', '/paid-album');
          }
          return;
        }
      }
    } catch (error) {
      console.error('[APP] Ошибка проверки статуса альбома:', error);
    }
    
    // Для PREMIUM - сразу открываем альбом (все альбомы бесплатны)
    if (normalizedSubscriptionType === 'premium') {
      setSelectedCharacter(character);
      setCurrentPage('paid-album');
      if (character?.id) {
        localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
        window.history.pushState({ page: 'paid-album', character: character.id }, '', `/paid-album?character=${character.id}`);
      } else {
        window.history.pushState({ page: 'paid-album' }, '', '/paid-album');
      }
      return;
    }

    // Для FREE и STANDARD - показываем модальное окно только если альбом не разблокирован
    setSelectedAlbumCharacter(character);
    setIsPaidAlbumModalOpen(true);
  };

  const handlePurchaseAlbum = async () => {
    if (!selectedAlbumCharacter) return;

    try {
      const response = await authManager.fetchWithAuth('/api/v1/paid-gallery/unlock/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ character_name: selectedAlbumCharacter.name })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = (data && (data.detail || data.message)) || 'Не удалось разблокировать альбом';
        throw new Error(message);
      }

      // Обновляем баланс
      if (data.coins !== undefined && typeof data.coins === 'number') {
        window.dispatchEvent(new CustomEvent('balance-update', { detail: { coins: data.coins } }));
      } else {
        window.dispatchEvent(new Event('balance-update'));
      }

      // Закрываем модальное окно и открываем альбом
      setIsPaidAlbumModalOpen(false);
      setSelectedCharacter(selectedAlbumCharacter);
      setCurrentPage('paid-album');
      if (selectedAlbumCharacter?.id) {
        localStorage.setItem(`character_${selectedAlbumCharacter.id}`, JSON.stringify(selectedAlbumCharacter));
        window.history.pushState({ page: 'paid-album', character: selectedAlbumCharacter.id }, '', `/paid-album?character=${selectedAlbumCharacter.id}`);
      } else {
        window.history.pushState({ page: 'paid-album' }, '', '/paid-album');
      }
    } catch (error) {
      console.error('[APP] Ошибка покупки альбома:', error);
      throw error;
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
    setCurrentPage('history');
    window.history.pushState({ page: 'history' }, '', '/history');
  };

  const handleBalanceHistory = () => {
    setCurrentPage('balance-history');
    window.history.pushState({ page: 'balance-history' }, '', '/balance-history');
  };

  const handleBugReport = () => {
    setCurrentPage('bug-report');
    window.history.pushState({ page: 'bug-report' }, '', '/bug-report');
  };

  const handlePaymentMethod = (subscriptionType: string) => {
    // Этот метод больше не используется, так как кнопки оплаты теперь на странице магазина
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
            onPaymentMethod={handlePaymentMethod}
            contentMode={contentMode}
          />
        );
      case 'chat':
        return (
          <ErrorBoundary>
          <ChatContainer
            onBackToMain={handleBackToMain}
            initialCharacter={memoizedInitialCharacter}
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
          </ErrorBoundary>
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
            onCharacterSelect={handleCharacterSelect}
          />
        );
      case 'create-character':
        return (
          <ErrorBoundary>
          <CreateCharacterPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onMyCharacters={handleMyCharacters}
            onOpenPaidAlbumBuilder={(character) => {
              setSelectedCharacter(character);
              setCurrentPage('paid-album-builder');
              if (character?.id) {
                localStorage.setItem(`character_${character.id}`, JSON.stringify(character));
                window.history.pushState({ page: 'paid-album-builder', character: character.id }, '', `/paid-album-builder?character=${character.id}`);
              } else if (character?.name) {
                localStorage.setItem(`character_${character.name}`, JSON.stringify(character));
                window.history.pushState({ page: 'paid-album-builder', character: character.name }, '', `/paid-album-builder?character=${encodeURIComponent(character.name)}`);
              } else {
                window.history.pushState({ page: 'paid-album-builder' }, '', '/paid-album-builder');
              }
            }}
            onOpenChat={handleCharacterSelect}
            onPhotoGeneration={handlePhotoGeneration}
            contentMode={contentMode}
            isAuthenticated={isAuthenticated}
            userInfo={userInfo}
          />
          </ErrorBoundary>
        );
      case 'shop':
        return (
          <ShopPage
            onBackToMain={handleBackToMain}
            onCreateCharacter={handleCreateCharacter}
            onShop={handleShop}
            onPaymentMethod={handlePaymentMethod}
            isAuthenticated={isAuthenticated}
            userInfo={userInfo}
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
            onHome={handleBackToMain}
            onFavorites={handleFavorites}
            onMyCharacters={handleMyCharacters}
            onMessages={handleMessages}
            onHistory={handleHistory}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacters={handleEditCharacters}
            onCharacterSelect={handleCharacterSelect}
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
            onProfile={handleProfile}
          />
        );
      case 'history':
        return (
          <HistoryPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacters={handleEditCharacters}
            onOpenChat={handleCharacterSelect}
            onProfile={handleProfile}
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
              console.log('[APP] ========== onEditCharacter CALLED ==========');
              console.log('[APP] Character received:', character);
              console.log('[APP] Character name:', character?.name);
              console.log('[APP] Character id:', character?.id);
              
              // Строгая проверка на валидность character
              if (!character) {
                console.error('[APP] Character is null or undefined');
                alert('Ошибка: данные персонажа не найдены.');
                return;
              }
              
              // Проверяем наличие хотя бы одного идентификатора
              if (!character.name && !character.id) {
                console.error('[APP] Character has no name or id:', character);
                alert('Ошибка: персонаж не имеет имени или ID.');
                return;
              }
              
              // Создаем безопасную копию character
              const safeCharacter = {
                ...character,
                name: character.name || character.id?.toString() || 'Unknown',
                id: character.id || character.name || 'unknown',
                description: character.description || '',
                avatar: character.avatar || '',
                photos: character.photos || [],
                tags: character.tags || [],
                author: character.author || '',
                likes: character.likes || 0,
                views: character.views || 0,
                comments: character.comments || 0
              };
              
              console.log('[APP] Safe character created for edit:', safeCharacter);
              console.log('[APP] Setting selectedCharacter and switching to edit-character page');
              
              // КРИТИЧНО: Сначала устанавливаем selectedCharacter
              setSelectedCharacter(safeCharacter);
              
              // КРИТИЧНО: Сохраняем персонажа в localStorage и URL для восстановления при обновлении
              if (safeCharacter.id) {
                localStorage.setItem(`character_${safeCharacter.id}`, JSON.stringify(safeCharacter));
                window.history.pushState({ page: 'edit-character', character: safeCharacter.id }, '', `/edit-character?character=${safeCharacter.id}`);
              } else if (safeCharacter.name) {
                // Если нет ID, используем имя как идентификатор
                localStorage.setItem(`character_${safeCharacter.name}`, JSON.stringify(safeCharacter));
                window.history.pushState({ page: 'edit-character', character: safeCharacter.name }, '', `/edit-character?character=${encodeURIComponent(safeCharacter.name)}`);
              } else {
                window.history.pushState({ page: 'edit-character' }, '', '/edit-character');
              }
              
              // КРИТИЧНО: Переключаем страницу ПОСЛЕ установки selectedCharacter
              console.log('[APP] Switching to edit-character page');
              setCurrentPage('edit-character');
              console.log('[APP] ============================================');
            }}
          />
        );
      case 'edit-character':
        console.log('[APP] ========== RENDERING edit-character PAGE ==========');
        console.log('[APP] selectedCharacter:', selectedCharacter);
        console.log('[APP] selectedCharacter.name:', selectedCharacter?.name);
        console.log('[APP] selectedCharacter.id:', selectedCharacter?.id);
        
        // Более строгая проверка на валидность character
        if (!selectedCharacter || (!selectedCharacter.name && !selectedCharacter.id)) {
          console.error('[APP] Invalid selectedCharacter for edit-character:', selectedCharacter);
          return (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100vh',
              color: '#ffffff',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: '#1a1a1a'
            }}>
              <h2>Ошибка загрузки</h2>
              <p>Персонаж не найден или данные повреждены. Пожалуйста, вернитесь к списку персонажей.</p>
              <button 
                onClick={() => {
                  setSelectedCharacter(null);
                  setCurrentPage('edit-characters');
                }} 
                style={{ 
                  marginTop: '1rem', 
                  padding: '0.5rem 1rem', 
                  cursor: 'pointer',
                  background: 'rgba(100, 100, 100, 0.3)',
                  border: '1px solid rgba(150, 150, 150, 0.5)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '16px'
                }}
              >
                ← Назад к списку
              </button>
            </div>
          );
        }
        
        console.log('[APP] Rendering EditCharacterPage with character:', selectedCharacter);
        return (
          <EditCharacterPage
            character={selectedCharacter}
            onBackToEditList={() => {
              console.log('[APP] onBackToEditList called');
              setSelectedCharacter(null);
              setCurrentPage('edit-characters');
            }}
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onProfile={handleProfile}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacters={handleEditCharacters}
          />
        );
      case 'balance-history':
        return (
          <BalanceHistoryPage
            onBackToMain={handleBackToMain}
            onShop={handleShop}
            onProfile={handleProfile}
          />
        );
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
      case 'legal':
        return <LegalPage />;
      case 'about':
        return <AboutPage />;
      case 'tariffs':
        return <TariffsPage />;
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'bug-report':
        return <BugReportPage onBackToMain={handleBackToMain} onProfile={handleProfile} />;
      case 'character-comments':
        return selectedCharacter ? (
          <CharacterCommentsPage
            characterName={selectedCharacter.name || selectedCharacter.id || ''}
            onBack={() => {
              // Возвращаемся на чат с тем же персонажем
              setCurrentPage('chat');
              const characterIdentifier = selectedCharacter?.id || selectedCharacter?.name || '';
              if (characterIdentifier) {
                window.history.pushState({ page: 'chat', character: characterIdentifier }, '', `/chat?character=${encodeURIComponent(characterIdentifier)}`);
              }
            }}
            onShop={handleShop}
            onProfile={handleProfile}
          />
        ) : null;
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
  const [userInfo, setUserInfo] = React.useState<{username: string, coins: number, id?: number, subscription?: {subscription_type: string}} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAgeVerified, setIsAgeVerified] = useState(() => {
    return localStorage.getItem('age_verified') === 'true';
  });
  const [isPaidAlbumModalOpen, setIsPaidAlbumModalOpen] = useState(false);
  const [selectedAlbumCharacter, setSelectedAlbumCharacter] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<{subscription_type?: string} | null>(null);

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
        console.log(`[APP] checkAuth response: status=${response.status}, statusText=${response.statusText}`);
        
        if (response.ok) {
          const text = await response.text();
          console.log('[APP] Auth response text:', text);
          if (!text) {
             console.error('[APP] Auth response is empty!');
          }
          
          try {
            const userData = text ? JSON.parse(text) : null;
            if (userData) {
              console.log('[APP] Auth check successful, user:', userData.username || userData.email);
              setUserInfo({
                username: userData.username || userData.email || 'Пользователь',
                coins: userData.coins || 0,
                id: userData.id,
                subscription: userData.subscription
              });
              setIsAuthenticated(true);
              
              // Загружаем статистику подписки
              if (userData.id) {
                try {
                  const statsResponse = await authManager.fetchWithAuth('/api/v1/profit/stats/');
                  if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setSubscriptionStats(statsData);
                  }
                } catch (error) {
                  console.error('[APP] Ошибка загрузки статистики подписки:', error);
                }
              }
            } else {
              console.error('[APP] Auth check returned empty data (parsed null)');
              setIsAuthenticated(false);
              setUserInfo(null);
            }
          } catch (e) {
            console.error('[APP] Failed to parse auth response:', e);
            setIsAuthenticated(false);
            setUserInfo(null);
          }
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

  // Слушаем события обновления баланса и обновляем userInfo
  React.useEffect(() => {
    const handleBalanceUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      
      // Если в событии есть данные о балансе - обновляем сразу
      if (customEvent.detail && customEvent.detail.coins !== undefined) {
        const newCoins = customEvent.detail.coins;
        console.log('[APP] Обновление баланса из события:', newCoins);
        if (userInfo) {
          setUserInfo({
            ...userInfo,
            coins: newCoins
          });
        }
        return;
      }

      // Если данных нет, загружаем из API
      try {
        const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.coins !== undefined) {
            console.log('[APP] Обновление баланса из API:', userData.coins);
            setUserInfo({
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              id: userData.id
            });
          }
        }
      } catch (error) {
        console.error('[APP] Ошибка обновления баланса:', error);
      }
    };

    const handleSubscriptionUpdate = async () => {
      console.log('[APP] Событие subscription-update получено');
      // Загружаем баланс и статистику подписки из API при обновлении подписки
      try {
        const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.coins !== undefined) {
            // Обновляем баланс без избыточного логирования
            setUserInfo({
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              id: userData.id,
              subscription: userData.subscription
            });
          }
        }
        
        // Загружаем статистику подписки
        const statsResponse = await authManager.fetchWithAuth('/api/v1/profit/stats/');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setSubscriptionStats(statsData);
        }
      } catch (error) {
        console.error('[APP] Ошибка обновления баланса после subscription-update:', error);
      }
    };

    const handleAuthSuccess = async () => {
      console.log('[APP] Событие auth-success получено');
      // Обновляем состояние авторизации
      const token = authManager.getToken();
      if (token) {
        try {
          const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
          if (response.ok) {
            const userData = await response.json();
            setIsAuthenticated(true);
            setUserInfo({
              username: userData.username || userData.email || 'Пользователь',
              coins: userData.coins || 0,
              id: userData.id
            });
            console.log('[APP] Авторизация обновлена после входа');
          }
        } catch (error) {
          console.error('[APP] Ошибка обновления авторизации:', error);
        }
      }
    };

    window.addEventListener('balance-update', handleBalanceUpdate);
    window.addEventListener('subscription-update', handleSubscriptionUpdate);
    window.addEventListener('auth-success', handleAuthSuccess);

    return () => {
      window.removeEventListener('balance-update', handleBalanceUpdate);
      window.removeEventListener('subscription-update', handleSubscriptionUpdate);
      window.removeEventListener('auth-success', handleAuthSuccess);
    };
  }, [userInfo]);

  // Применяем темную тему
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
  }, []);

  const handleGoogleLogin = () => {
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

        // Небольшая задержка перед проверкой авторизации, чтобы токены точно сохранились
        setTimeout(async () => {
          console.log('Checking auth after OAuth success...');
          // Проверяем авторизацию без перезагрузки страницы
          try {
            const authResult = await authManager.checkAuth();
            console.log('Auth check result:', authResult);
            if (authResult.isAuthenticated && authResult.userInfo) {
              setIsAuthenticated(true);
              setUserInfo({
                username: authResult.userInfo.username || authResult.userInfo.email || 'Пользователь',
                coins: authResult.userInfo.coins || 0,
                id: authResult.userInfo.id
              });
              setIsAuthModalOpen(false); // Закрываем модальное окно авторизации
              setAuthMode('login'); // Сбрасываем режим на login
              setCurrentPage('main');
              window.history.pushState({ page: 'main' }, '', '/');
            }
          } catch (error) {
            console.error('Error checking auth after OAuth:', error);
            // В случае ошибки все равно перезагружаем страницу
            window.location.reload();
          }
        }, 300);
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

  const handleLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleRegister = () => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
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

  const handleAgeAccept = () => {
    localStorage.setItem('age_verified', 'true');
    setIsAgeVerified(true);
  };

  const handleAgeDecline = () => {
    window.location.href = 'about:blank';
  };

  if (!isAgeVerified) {
    return (
      <>
        <GlobalStyles />
        <AgeVerificationModal onAccept={handleAgeAccept} onDecline={handleAgeDecline} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <AppContainer>
        <LeftDockSidebar
          onCreateCharacter={handleCreateCharacter}
          onEditCharacters={handleEditCharacters}
          onHistory={handleHistory}
          onFavorites={handleFavorites}
          onMyCharacters={handleMyCharacters}
          onHome={handleBackToMain}
          onMessages={handleMessages}
          onBalanceHistory={handleBalanceHistory}
          onBugReport={handleBugReport}
          onProfile={handleProfile}
          onShop={handleShop}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onLogout={handleLogout}
          isAuthenticated={isAuthenticated}
          contentMode={contentMode}
          onContentModeChange={setContentMode}
        />
        <PageContainer className="app-scroll-container">
          {renderPage()}
        </PageContainer>
      </AppContainer>

      {isPaidAlbumModalOpen && selectedAlbumCharacter && (
        <PaidAlbumPurchaseModal
          isOpen={isPaidAlbumModalOpen}
          onClose={() => {
            setIsPaidAlbumModalOpen(false);
            setSelectedAlbumCharacter(null);
          }}
          onPurchase={handlePurchaseAlbum}
          onOpenShop={handleShop}
          characterName={selectedAlbumCharacter.name || selectedAlbumCharacter.id || 'Персонаж'}
          subscriptionType={subscriptionStats?.subscription_type || userInfo?.subscription?.subscription_type || 'free'}
          userCoins={userInfo?.coins || 0}
        />
      )}

      {isPaidAlbumModalOpen && selectedAlbumCharacter && (
        <PaidAlbumPurchaseModal
          isOpen={isPaidAlbumModalOpen}
          onClose={() => {
            setIsPaidAlbumModalOpen(false);
            setSelectedAlbumCharacter(null);
          }}
          onPurchase={handlePurchaseAlbum}
          onOpenShop={handleShop}
          characterName={selectedAlbumCharacter.name || selectedAlbumCharacter.id || 'Персонаж'}
          subscriptionType={subscriptionStats?.subscription_type || userInfo?.subscription?.subscription_type || 'free'}
          userCoins={userInfo?.coins || 0}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Переходим на главную страницу после авторизации
            setCurrentPage('main');
            window.history.pushState({ page: 'main' }, '', '/');
            // Обновляем данные пользователя без перезагрузки
            checkAuth();
          }}
          onGoogleLogin={handleGoogleLogin}
        />
      )}
    </>
  );
}

export default App;