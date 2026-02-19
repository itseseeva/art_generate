import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import '../styles/ContentArea.css';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
  background: transparent;
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

const MessagesList = styled.div`
  flex: 1;
  padding: ${theme.spacing.lg};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  position: relative;
  z-index: 1;
  min-height: 0;
`;

const MessageCard = styled.div`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  display: flex;
  gap: ${theme.spacing.md};
  transition: ${theme.transition.fast};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(148, 163, 184, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.4);
  }
`;

const UserAvatar = styled.div<{ $avatarUrl?: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${props => props.$avatarUrl 
    ? `url(${props.$avatarUrl}) center/cover` 
    : `linear-gradient(135deg, ${theme.colors.accent.primary} 0%, ${theme.colors.accent.secondary} 100%)`};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  border: 2px solid rgba(148, 163, 184, 0.3);
`;

const MessageContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const UserName = styled.button`
  background: transparent;
  border: none;
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color ${theme.transition.fast};
  
  &:hover {
    color: rgba(200, 200, 200, 1);
  }
`;

const MessageText = styled.div`
  color: rgba(180, 180, 180, 1);
  font-size: ${theme.fontSize.md};
  line-height: 1.5;
`;

const CharacterName = styled.button`
  background: transparent;
  border: none;
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.md};
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color ${theme.transition.fast};
  display: inline;
  
  &:hover {
    color: rgba(240, 240, 240, 1);
    text-decoration: underline;
  }
`;

const AmountBadge = styled.span`
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.8) 0%, rgba(150, 150, 150, 0.8) 100%);
  color: white;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  display: inline-block;
  margin-left: ${theme.spacing.xs};
`;

const Timestamp = styled.div`
  color: rgba(140, 140, 140, 1);
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.xs};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  min-height: 400px;
  color: rgba(200, 200, 200, 1);
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${theme.spacing.lg};
  opacity: 0.6;
`;

const EmptyStateTitle = styled.h2`
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin-bottom: ${theme.spacing.sm};
`;

const EmptyStateText = styled.p`
  font-size: ${theme.fontSize.md};
  color: rgba(180, 180, 180, 1);
  max-width: 400px;
  line-height: 1.6;
`;

interface TipMessage {
  id: number;
  sender_id: number;
  sender_email: string;
  sender_username?: string;
  sender_avatar_url?: string;
  character_id: number;
  character_name: string;
  amount: number;
  message?: string;
  is_read: boolean;
  created_at: string;
}

interface MessagesPageProps {
  onBackToMain: () => void;
  onShop: () => void;
  onCreateCharacter: () => void;
  onEditCharacters: () => void;
  onProfile?: (userId?: number) => void;
  onOpenChat: (character: any) => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  onBackToMain,
  onShop,
  onCreateCharacter,
  onEditCharacters,
  onProfile,
  onOpenChat
}) => {
  const [messages, setMessages] = useState<TipMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [charactersMap, setCharactersMap] = useState<Map<string, any>>(new Map());
  const hasLoadedRef = React.useRef(false);

  const loadTipMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Загружаем tip messages и персонажей параллельно
      const [messagesResponse, charactersResponse] = await Promise.all([
        authManager.fetchWithAuth('/api/v1/auth/tip-messages/'),
        authManager.fetchWithAuth('/api/v1/characters/'),
      ]);

      if (!messagesResponse.ok) {
        if (messagesResponse.status === 404 || messagesResponse.status === 403) {
          setMessages([]);
          hasLoadedRef.current = true;
          setIsLoading(false);
          return;
        }
        const errorText = await messagesResponse.text().catch(() => 'Неизвестная ошибка');
        throw new Error('Не удалось получить сообщения благодарности');
      }

      const tipMessages = await messagesResponse.json().catch(() => []);
      const charactersData = await charactersResponse.json().catch(() => []);


      // Создаем карту персонажей для быстрого доступа
      const map = new Map<string, any>();
      if (Array.isArray(charactersData)) {
        charactersData.forEach((char: any) => {
          if (char?.name) {
            map.set(char.name.toLowerCase(), char);
          }
        });
      }
      setCharactersMap(map);
      const messagesArray = Array.isArray(tipMessages) ? tipMessages : [];
      setMessages(messagesArray);
      
      // Отмечаем все непрочитанные сообщения как прочитанные
      const unreadMessages = messagesArray.filter((msg: TipMessage) => !msg.is_read);
      if (unreadMessages.length > 0) {
        try {
          await Promise.all(
            unreadMessages.map((msg: TipMessage) =>
              authManager.fetchWithAuth(`/api/v1/auth/tip-messages/${msg.id}/read/`, {
                method: 'POST'
              })
            )
          );
          // Отправляем событие для обновления счетчика
          window.dispatchEvent(new CustomEvent('tip-messages-read'));
        } catch (err) {
          // Игнорируем ошибки при отметке сообщений как прочитанных
        }
      }
      
      hasLoadedRef.current = true;
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки');
      setMessages([]);
      hasLoadedRef.current = true; // Отмечаем как загруженное, чтобы показать пустое состояние
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Проверяем наличие токена в localStorage перед загрузкой
    const token = authManager.getToken();

    // Если токен есть, но данные не загружены, принудительно загружаем
    if (token && !hasLoadedRef.current) {
      loadTipMessages();
    } else if (!token) {
      setMessages([]);
      hasLoadedRef.current = true;
      setIsLoading(false);
    }
  }, [loadTipMessages]);

  // Синхронизация состояния авторизации
  useEffect(() => {
    const unsubscribe = authManager.subscribeAuthChanges((state) => {
      if (!state.isAuthenticated) {
        // Если пользователь вышел, очищаем данные
        setMessages([]);
        setCharactersMap(new Map());
        hasLoadedRef.current = false;
        setError(null);
      } else {
        // Если пользователь вошел (или сменился), перезагружаем данные
        hasLoadedRef.current = false;
        setMessages([]);
        setCharactersMap(new Map());
        setError(null);
        // Небольшая задержка, чтобы убедиться, что токен обновлен
        setTimeout(() => {
          loadTipMessages();
        }, 100);
      }
    });

    return unsubscribe;
  }, [loadTipMessages]);

  const handleCharacterClick = (characterName: string) => {
    const character = charactersMap.get(characterName.toLowerCase());
    if (character) {
      onOpenChat(character);
    } else {
      // Если персонаж не найден в карте, создаем минимальный объект
      onOpenChat({
        id: `char-${characterName}`,
        name: characterName,
        description: '',
        avatar: (characterName?.[0] || '?').toUpperCase(),
        photos: [],
        tags: [],
        author: 'Unknown',
        likes: 0,
        views: 0,
        comments: 0,
        mode: 'safe' as const,
      });
    }
  };

  const handleUserClick = (userId: number) => {
    if (onProfile) {
      onProfile(userId);
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      return name[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  return (
    <MainContainer>
      <div className="content-area vertical">

        {error && (
          <div style={{ padding: '1rem' }}>
            <ErrorMessage message={error} onClose={() => setError(null)} />
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner text="Загружаем сообщения благодарности..." />
        ) : (
          <MessagesList>
            {messages.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>💬</EmptyStateIcon>
                <EmptyStateTitle>У вас пока нет сообщений</EmptyStateTitle>
                <EmptyStateText>
                  Здесь будут отображаться сообщения благодарности от других пользователей за ваших персонажей
                </EmptyStateText>
              </EmptyState>
            ) : (
              messages.map((msg) => (
                <MessageCard key={msg.id}>
                  <UserAvatar 
                    $avatarUrl={msg.sender_avatar_url}
                  >
                    {!msg.sender_avatar_url && getInitials(msg.sender_username, msg.sender_email)}
                  </UserAvatar>
                  <MessageContent>
                    <div>
                      <UserName onClick={() => handleUserClick(msg.sender_id)}>
                        {msg.sender_username || msg.sender_email}
                      </UserName>
                      {' отправил(а) '}
                      <AmountBadge>{msg.amount} кредитов</AmountBadge>
                      {' за персонажа '}
                      <CharacterName onClick={() => handleCharacterClick(msg.character_name)}>
                        {msg.character_name}
                      </CharacterName>
                    </div>
                    {msg.message && (
                      <MessageText>
                        {msg.message}
                      </MessageText>
                    )}
                    <Timestamp>
                      {new Date(msg.created_at).toLocaleString('ru-RU')}
                    </Timestamp>
                  </MessageContent>
                </MessageCard>
              ))
            )}
          </MessagesList>
        )}
      </div>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
    </MainContainer>
  );
};
