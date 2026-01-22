import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { authManager } from '../utils/auth';
import { FiArrowLeft, FiEdit2, FiTrash2, FiSend, FiMessageSquare } from 'react-icons/fi';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { GlobalHeader } from './GlobalHeader';
import { API_CONFIG } from '../config/api';

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(15, 15, 15, 1);
  overflow: hidden;
`;

const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 2rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(25, 25, 25, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h2`
  color: rgba(255, 255, 255, 1);
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  cursor: pointer;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 1);
  }
`;

const CommentsList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.3);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.6);
    border-radius: 4px;
    
    &:hover {
      background: rgba(100, 100, 100, 0.8);
    }
  }
`;

const CommentCard = styled.div`
  background: rgba(30, 30, 30, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(40, 40, 40, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.div<{ $avatarUrl?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$avatarUrl 
    ? `url(${props.$avatarUrl}) center/cover` 
    : 'rgba(60, 60, 60, 0.8)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 1);
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Username = styled.div<{ $clickable?: boolean }>`
  color: rgba(255, 255, 255, 1);
  font-weight: 600;
  font-size: 14px;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  transition: color 0.2s ease;
  
  &:hover {
    color: ${props => props.$clickable ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 1)'};
  }
`;

const CommentDate = styled.div`
  color: rgba(180, 180, 180, 0.8);
  font-size: 12px;
`;

const CommentActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ $variant?: 'edit' | 'delete' }>`
  background: transparent;
  border: none;
  color: ${props => props.$variant === 'delete' ? 'rgba(255, 100, 100, 0.8)' : 'rgba(200, 200, 200, 0.8)'};
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 16px;
  
  &:hover {
    background: ${props => props.$variant === 'delete' ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
    color: ${props => props.$variant === 'delete' ? 'rgba(255, 100, 100, 1)' : 'rgba(255, 255, 255, 1)'};
  }
`;

const CommentContent = styled.div`
  color: rgba(240, 240, 240, 1);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 0.5rem;
`;

const EditedBadge = styled.span`
  color: rgba(180, 180, 180, 0.6);
  font-size: 12px;
  font-style: italic;
`;

const CommentForm = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 1.5rem;
  background: rgba(25, 25, 25, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
`;

const FormTitle = styled.h3`
  color: rgba(255, 255, 255, 1);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 1rem 0;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  background: rgba(20, 20, 20, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(240, 240, 240, 1);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(25, 25, 25, 0.6);
  }
  
  &::placeholder {
    color: rgba(140, 140, 140, 0.6);
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const SubmitButton = styled.button<{ $disabled?: boolean }>`
  padding: 0.75rem 1.5rem;
  background: ${props => props.$disabled 
    ? 'rgba(50, 50, 50, 0.5)' 
    : 'rgba(60, 60, 60, 0.8)'};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: rgba(255, 255, 255, 1);
  font-weight: 600;
  font-size: 14px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    background: rgba(80, 80, 80, 0.9);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(180, 180, 180, 0.8);
  font-size: 16px;
`;

interface Comment {
  id: number;
  character_name: string;
  user_id: number;
  username?: string;
  email?: string;
  avatar_url?: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at?: string;
  can_edit: boolean;
  can_delete: boolean;
}

interface CharacterCommentsPageProps {
  characterName: string;
  onBack: () => void;
  onShop?: () => void;
  onProfile?: (userId?: number) => void;
}

export const CharacterCommentsPage: React.FC<CharacterCommentsPageProps> = ({
  characterName: propCharacterName,
  onBack,
  onShop,
  onProfile
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Получаем characterName из пропсов или из URL
  const getCharacterName = useCallback((): string => {
    if (propCharacterName) {
      return propCharacterName;
    }
    // Если characterName не передан в пропсах, извлекаем из URL
    const urlParams = new URLSearchParams(window.location.search);
    const characterFromUrl = urlParams.get('character');
    if (characterFromUrl) {
      return decodeURIComponent(characterFromUrl);
    }
    // Пытаемся извлечь из пути
    const pathMatch = window.location.pathname.match(/character-comments[?&]character=([^&]+)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return '';
  }, [propCharacterName]);

  const characterName = getCharacterName();

  const loadComments = async () => {
    if (!characterName) {
      setError('Имя персонажа не указано');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await authManager.fetchWithAuth(
        `/api/v1/character-comments/${encodeURIComponent(characterName)}`
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить комментарии');
      }

      const data = await response.json();
      setComments(data.comments || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки комментариев');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterName]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    if (newComment.trim().length > 2000) {
      setError('Комментарий слишком длинный (максимум 2000 символов)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/character-comments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: characterName,
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка создания комментария');
      }

      setNewComment('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания комментария');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editContent.trim()) {
      setError('Комментарий не может быть пустым');
      return;
    }

    if (editContent.trim().length > 2000) {
      setError('Комментарий слишком длинный (максимум 2000 символов)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/character-comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка обновления комментария');
      }

      setEditingCommentId(null);
      setEditContent('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления комментария');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/character-comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка удаления комментария');
      }

      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления комментария');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserInitial = (username?: string, email?: string) => {
    if (username) return username[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PageContainer>
      <GlobalHeader
        onShop={onShop}
        onProfile={onProfile}
      />
      <ContentWrapper>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <BackButton onClick={onBack}>
              <FiArrowLeft size={20} />
              Назад
            </BackButton>
            <Title>
              <FiMessageSquare size={24} />
              Комментарии к {characterName || 'персонажу'} ({totalCount})
            </Title>
          </div>
        </Header>

        {error && (
          <ErrorMessage 
            message={error} 
            onClose={() => setError(null)} 
          />
        )}

        {isLoading ? (
          <LoadingSpinner text="Загрузка комментариев..." />
        ) : (
          <>
            <CommentsList>
              {comments.length === 0 ? (
                <EmptyState>
                  Пока нет комментариев. Будьте первым, кто оставит отзыв!
                </EmptyState>
              ) : (
                comments.map((comment) => (
                  <CommentCard key={comment.id}>
                    <CommentHeader>
                      <UserInfo>
                        <Avatar $avatarUrl={comment.avatar_url}>
                          {!comment.avatar_url && getUserInitial(comment.username, comment.email)}
                        </Avatar>
                        <UserDetails>
                          <Username 
                            $clickable={!!onProfile && !!comment.user_id}
                            onClick={() => {
                              if (onProfile && comment.user_id) {
                                onProfile(comment.user_id);
                              }
                            }}
                          >
                            {comment.username || 'Аноним'}
                          </Username>
                          <CommentDate>
                            {formatDate(comment.created_at)}
                            {comment.is_edited && ' (отредактировано)'}
                          </CommentDate>
                        </UserDetails>
                      </UserInfo>
                      {(comment.can_edit || comment.can_delete) && (
                        <CommentActions>
                          {comment.can_edit && editingCommentId !== comment.id && (
                            <ActionButton
                              $variant="edit"
                              onClick={() => handleEditComment(comment)}
                              title="Редактировать"
                            >
                              <FiEdit2 />
                            </ActionButton>
                          )}
                          {comment.can_delete && (
                            <ActionButton
                              $variant="delete"
                              onClick={() => handleDeleteComment(comment.id)}
                              title="Удалить"
                            >
                              <FiTrash2 />
                            </ActionButton>
                          )}
                        </CommentActions>
                      )}
                    </CommentHeader>
                    {editingCommentId === comment.id ? (
                      <div>
                        <TextArea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Введите текст комментария..."
                        />
                        <FormActions>
                          <SubmitButton
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={isSubmitting || !editContent.trim()}
                          >
                            Сохранить
                          </SubmitButton>
                          <SubmitButton
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditContent('');
                            }}
                            disabled={isSubmitting}
                            style={{ background: 'rgba(80, 80, 80, 0.8)' }}
                          >
                            Отмена
                          </SubmitButton>
                        </FormActions>
                      </div>
                    ) : (
                      <>
                        <CommentContent>{comment.content}</CommentContent>
                        {comment.is_edited && (
                          <EditedBadge>(отредактировано)</EditedBadge>
                        )}
                      </>
                    )}
                  </CommentCard>
                ))
              )}
              <div ref={commentsEndRef} />
            </CommentsList>

            <CommentForm>
              <FormTitle>Оставить комментарий</FormTitle>
              <TextArea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Напишите ваш отзыв о персонаже, его плюсы и минусы..."
                disabled={isSubmitting}
              />
              <FormActions>
                <SubmitButton
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  <FiSend size={16} />
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </SubmitButton>
              </FormActions>
            </CommentForm>
          </>
        )}
      </ContentWrapper>
    </PageContainer>
  );
};

