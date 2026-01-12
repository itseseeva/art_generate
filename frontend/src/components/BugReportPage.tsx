import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { FiArrowLeft, FiAlertTriangle, FiSend, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 20, 1);
  overflow: hidden;

  @media (max-width: 768px) {
    overflow-y: auto;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    overflow: visible;
    padding: ${theme.spacing.md};
    gap: ${theme.spacing.md};
    height: auto;
  }
`;

const LeftColumn = styled.div`
  width: 400px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    overflow-y: visible;
    height: auto;
  }
`;

const RightColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-width: 0;

  @media (max-width: 768px) {
    overflow-y: visible;
    height: auto;
  }
`;

const PageTitle = styled.h1`
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  color: rgba(240, 240, 240, 1);
  margin: 0 0 ${theme.spacing.lg} 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const FormContainer = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
`;

const FormTitle = styled.h2`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0 0 ${theme.spacing.md} 0;
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  color: rgba(200, 200, 200, 1);
  margin-bottom: ${theme.spacing.xs};
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: rgba(150, 150, 150, 0.7);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: rgba(150, 150, 150, 0.7);
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.9));
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(139, 92, 246, 1), rgba(124, 58, 237, 1));
    border-color: rgba(139, 92, 246, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BugsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const BugCard = styled.div`
  background: rgba(30, 30, 30, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  transition: all 0.3s ease;

  &:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: rgba(150, 150, 150, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const BugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${theme.spacing.md};
  gap: ${theme.spacing.md};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${theme.spacing.sm};
  }
`;

const BugTitle = styled.h3`
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  color: rgba(240, 240, 240, 1);
  margin: 0;
  flex: 1;
`;

const BugMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${theme.spacing.xs};
  font-size: ${theme.fontSize.sm};
  color: rgba(160, 160, 160, 1);

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    padding-top: ${theme.spacing.sm};
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const BugStatus = styled.div<{ $status: string }>`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  background: ${props => {
    if (props.$status === 'Завершено') return 'rgba(34, 197, 94, 0.2)';
    if (props.$status === 'В разработке') return 'rgba(59, 130, 246, 0.2)';
    return 'rgba(251, 191, 36, 0.2)';
  }};
  color: ${props => {
    if (props.$status === 'Завершено') return 'rgba(34, 197, 94, 1)';
    if (props.$status === 'В разработке') return 'rgba(59, 130, 246, 1)';
    return 'rgba(251, 191, 36, 1)';
  }};
  border: 1px solid ${props => {
    if (props.$status === 'Завершено') return 'rgba(34, 197, 94, 0.3)';
    if (props.$status === 'В разработке') return 'rgba(59, 130, 246, 0.3)';
    return 'rgba(251, 191, 36, 0.3)';
  }};
`;

const StatusSelect = styled.select`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.sm};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xs};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
  }
`;

const BugDescription = styled.p`
  font-size: ${theme.fontSize.base};
  color: rgba(200, 200, 200, 1);
  margin: 0 0 ${theme.spacing.md} 0;
  line-height: 1.6;
`;

const BugLocation = styled.div`
  font-size: ${theme.fontSize.sm};
  color: rgba(150, 150, 150, 1);
  margin-bottom: ${theme.spacing.md};
  padding: ${theme.spacing.sm};
  background: rgba(20, 20, 20, 0.5);
  border-radius: ${theme.borderRadius.sm};
`;

const CommentsSection = styled.div`
  margin-top: ${theme.spacing.md};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid rgba(100, 100, 100, 0.2);
`;

const CommentsTitle = styled.h4`
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  color: rgba(220, 220, 220, 1);
  margin: 0 0 ${theme.spacing.md} 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const CommentForm = styled.form`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const CommentInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
  }

  &::placeholder {
    color: rgba(150, 150, 150, 0.7);
  }
`;

const CommentButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(139, 92, 246, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: ${theme.borderRadius.md};
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 1);
    border-color: rgba(139, 92, 246, 0.8);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled.button`
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: ${theme.borderRadius.md};
  color: rgba(239, 68, 68, 1);
  font-size: ${theme.fontSize.xs};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CommentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CommentItem = styled.div`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(20, 20, 20, 0.5);
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  color: rgba(200, 200, 200, 1);
  line-height: 1.5;
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  color: rgba(139, 92, 246, 0.9);
  margin-right: ${theme.spacing.xs};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xxl};
  color: rgba(160, 160, 160, 1);
  font-size: ${theme.fontSize.lg};
`;

const SuccessMessage = styled.div`
  padding: ${theme.spacing.sm};
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: ${theme.borderRadius.md};
  color: rgba(34, 197, 94, 1);
  margin-bottom: ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
`;

interface BugReport {
  id: number;
  title: string;
  description: string;
  location?: string;
  status: string;
  user_id?: number;
  author_username?: string;
  created_at: string;
  comments?: BugComment[];
}

interface BugComment {
  id: number;
  user_id?: number;
  content: string;
  author_username?: string;
  created_at: string;
}

interface BugReportPageProps {
  onBackToMain?: () => void;
  onProfile?: (userId?: number) => void;
  onLogout?: () => void;
}

const UsernameLink = styled.span<{ $clickable: boolean }>`
  color: ${props => props.$clickable ? 'rgba(139, 92, 246, 1)' : 'rgba(240, 240, 240, 1)'};
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  text-decoration: ${props => props.$clickable ? 'underline' : 'none'};
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.$clickable ? 'rgba(167, 139, 250, 1)' : 'rgba(240, 240, 240, 1)'};
  }
`;

export const BugReportPage: React.FC<BugReportPageProps> = ({
  onBackToMain,
  onProfile,
  onLogout,
}) => {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});
  const [submittingComments, setSubmittingComments] = useState<{ [key: number]: boolean }>({});
  const [updatingStatuses, setUpdatingStatuses] = useState<{ [key: number]: boolean }>({});
  const [deletingBugs, setDeletingBugs] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    checkAdminStatus();
    loadBugs();
  }, []);
  
  // Перезагружаем баги после установки currentUserId, чтобы кнопки удаления обновились
  useEffect(() => {
    if (currentUserId !== null && bugs.length > 0) {
      // Не перезагружаем, просто обновляем состояние для перерисовки
      // loadBugs() уже был вызван в первом useEffect
    }
  }, [currentUserId]);

  useEffect(() => {
    
    
    if (bugs.length > 0) {
      
    }
  }, [currentUserId, isAdmin, bugs]);

  const checkAdminStatus = async () => {
    try {
      const token = authManager.getToken();
      if (!token) {
        setIsAdmin(false);
        setCurrentUserId(null);
        return;
      }

      const response = await authManager.fetchWithAuth('/api/v1/auth/me/');
      if (response.ok) {
        const userData = await response.json();
        
        const userId = userData.id != null ? Number(userData.id) : null;
        setIsAdmin(userData.is_admin === true);
        setCurrentUserId(userId);
        
        
      } else {
        
      }
    } catch (err) {
      setIsAdmin(false);
      setCurrentUserId(null);
    }
  };

  const loadBugs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bug-reports/`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить баг-репорты');
      }

      const data = await response.json();
      setBugs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      
      setError(err.message || 'Ошибка загрузки баг-репортов');
      setBugs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bug-reports/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось создать баг-репорт');
      }

      setTitle('');
      setDescription('');
      setLocation('');
      setSuccess('Баг-репорт успешно создан!');
      await loadBugs();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      
      setError(err.message || 'Ошибка при создании баг-репорта');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async (bugId: number, e: React.FormEvent) => {
    e.preventDefault();
    
    const commentText = commentTexts[bugId]?.trim();
    if (!commentText) {
      return;
    }

    try {
      setSubmittingComments({ ...submittingComments, [bugId]: true });

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bug-reports/${bugId}/comments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось добавить комментарий');
      }

      setCommentTexts({ ...commentTexts, [bugId]: '' });
      await loadBugs();
    } catch (err: any) {
      
      setError(err.message || 'Ошибка при добавлении комментария');
    } finally {
      setSubmittingComments({ ...submittingComments, [bugId]: false });
    }
  };

  const handleStatusChange = async (bugId: number, newStatus: string) => {
    try {
      setUpdatingStatuses({ ...updatingStatuses, [bugId]: true });

      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bug-reports/${bugId}/status/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          new_status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось обновить статус');
      }

      await loadBugs();
    } catch (err: any) {
      
      setError(err.message || 'Ошибка при обновлении статуса');
    } finally {
      setUpdatingStatuses({ ...updatingStatuses, [bugId]: false });
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await authManager.logout();
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/';
    }
  };

  const handleDeleteBug = async (bugId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот баг-репорт?')) {
      return;
    }

    const bug = bugs.find(b => b.id === bugId);
    if (!bug) {
      setError('Баг-репорт не найден');
      return;
    }
    
    // Проверяем права: админ ИЛИ создатель
    const isCreator = currentUserId != null && bug.user_id != null && Number(currentUserId) === Number(bug.user_id);
    const canDelete = isAdmin || isCreator;
    
    
    
    
    
    if (!canDelete) {
      
      setError('У вас нет прав для удаления этого баг-репорта');
      return;
    }

    try {
      setDeletingBugs({ ...deletingBugs, [bugId]: true });

      const token = authManager.getToken();
      if (!token) {
        throw new Error('Необходима авторизация');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bug-reports/${bugId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось удалить баг-репорт');
      }

      setSuccess('Баг-репорт успешно удален!');
      await loadBugs();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      
      setError(err.message || 'Ошибка при удалении баг-репорта');
    } finally {
      setDeletingBugs({ ...deletingBugs, [bugId]: false });
    }
  };

  return (
    <MainContainer>
      <GlobalHeader
        onHome={onBackToMain}
        onProfile={onProfile}
        onLogout={handleLogout}
      />
      <ContentContainer>
        <LeftColumn>
          <PageTitle>
            <FiAlertTriangle size={24} />
            Сообщить о баге
          </PageTitle>

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <FormContainer>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="bug-title">Название проблемы *</Label>
                <Input
                  id="bug-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Краткое описание проблемы"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="bug-description">Описание *</Label>
                <Textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Подробное описание проблемы, шаги для воспроизведения..."
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="bug-location">Где происходит проблема</Label>
                <Input
                  id="bug-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Например: Страница профиля, Чат с персонажем..."
                />
              </FormGroup>

              <SubmitButton type="submit" disabled={isSubmitting}>
                <FiSend size={16} />
                {isSubmitting ? 'Отправка...' : 'Отправить баг-репорт'}
              </SubmitButton>
            </form>
          </FormContainer>
        </LeftColumn>

        <RightColumn>
          <PageTitle>
            Все баг-репорты
          </PageTitle>

          {isLoading ? (
            <LoadingSpinner />
          ) : bugs.length === 0 ? (
            <EmptyState>Пока нет баг-репортов. Будьте первым!</EmptyState>
          ) : (
            <BugsList>
              {bugs.map((bug) => {
                // Упрощенная проверка: админ ИЛИ создатель (сравниваем как числа)
                const isCreator = currentUserId != null && bug.user_id != null && Number(currentUserId) === Number(bug.user_id);
                const canDelete = isAdmin || isCreator;
                
                // ВСЕГДА логируем для отладки
                
                
                
                
                return (
                <BugCard key={bug.id}>
                  <BugHeader>
                    <BugTitle>{bug.title}</BugTitle>
                    <BugMeta>
                      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                        {isAdmin ? (
                          <StatusSelect
                            value={bug.status}
                            onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                            disabled={updatingStatuses[bug.id]}
                          >
                            <option value="На проверке">На проверке</option>
                            <option value="В разработке">В разработке</option>
                            <option value="Завершено">Завершено</option>
                          </StatusSelect>
                        ) : (
                          <BugStatus $status={bug.status}>{bug.status}</BugStatus>
                        )}
                        {canDelete && (
                          <DeleteButton
                            onClick={() => handleDeleteBug(bug.id)}
                            disabled={deletingBugs[bug.id]}
                            title="Удалить баг-репорт"
                          >
                            <FiTrash2 size={14} />
                            {deletingBugs[bug.id] ? 'Удаление...' : 'Удалить'}
                          </DeleteButton>
                        )}
                      </div>
                      <div>
                        {bug.author_username ? (
                          bug.user_id ? (
                            <UsernameLink 
                              $clickable={!!onProfile}
                              onClick={() => onProfile && onProfile(bug.user_id)}
                            >
                              {bug.author_username}
                            </UsernameLink>
                          ) : (
                            <span>{bug.author_username}</span>
                          )
                        ) : (
                          <span>Анонимный пользователь</span>
                        )}
                      </div>
                      <div>{new Date(bug.created_at).toLocaleString('ru-RU')}</div>
                    </BugMeta>
                  </BugHeader>
                  
                  {bug.location && (
                    <BugLocation>
                      <strong>Место: </strong>{bug.location}
                    </BugLocation>
                  )}
                  
                  <BugDescription>{bug.description}</BugDescription>

                  <CommentsSection>
                    <CommentsTitle>
                      <FiMessageSquare size={18} />
                      Комментарии ({bug.comments?.length || 0})
                    </CommentsTitle>

                    <CommentForm onSubmit={(e) => handleCommentSubmit(bug.id, e)}>
                      <CommentInput
                        type="text"
                        placeholder="Добавить комментарий..."
                        value={commentTexts[bug.id] || ''}
                        onChange={(e) => setCommentTexts({ ...commentTexts, [bug.id]: e.target.value })}
                      />
                      <CommentButton 
                        type="submit" 
                        disabled={submittingComments[bug.id] || !commentTexts[bug.id]?.trim()}
                      >
                        <FiSend size={14} />
                        Отправить
                      </CommentButton>
                    </CommentForm>

                    {bug.comments && bug.comments.length > 0 && (
                      <CommentsList>
                        {bug.comments.map((comment) => (
                          <CommentItem key={comment.id}>
                            <CommentAuthor>
                              {comment.author_username ? (
                                comment.user_id ? (
                                  <UsernameLink 
                                    $clickable={!!onProfile}
                                    onClick={() => onProfile && onProfile(comment.user_id)}
                                  >
                                    {comment.author_username}
                                  </UsernameLink>
                                ) : (
                                  <span>{comment.author_username}</span>
                                )
                              ) : (
                                <span>Анонимный пользователь</span>
                              )}
                              :
                            </CommentAuthor>
                            {comment.content}
                            <div style={{ 
                              fontSize: theme.fontSize.xs, 
                              color: 'rgba(120, 120, 120, 1)', 
                              marginTop: theme.spacing.xs 
                            }}>
                              {new Date(comment.created_at).toLocaleString('ru-RU')}
                            </div>
                          </CommentItem>
                        ))}
                      </CommentsList>
                    )}
                  </CommentsSection>
                </BugCard>
                );
              })}
            </BugsList>
          )}
        </RightColumn>
      </ContentContainer>
    </MainContainer>
  );
};
