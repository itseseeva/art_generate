import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: ${theme.colors.gradients.card};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: ${theme.colors.shadow.card};
  border: 1px solid ${theme.colors.border.accent};
  max-width: 400px;
  width: 90vw;
  animation: slideIn 0.3s ease-out;
`;

const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  
  h3 {
    font-size: ${theme.fontSize['2xl']};
    font-weight: 700;
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing.sm};
  }
  
  p {
    color: ${theme.colors.text.muted};
    font-size: ${theme.fontSize.sm};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  
  label {
    font-weight: 600;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSize.sm};
  }
  
  input {
    padding: ${theme.spacing.md};
    background: ${theme.colors.background.secondary};
    border: 2px solid ${theme.colors.border.primary};
    border-radius: ${theme.borderRadius.lg};
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSize.base};
    transition: ${theme.transition.fast};
    
    &:focus {
      border-color: ${theme.colors.accent.primary};
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
      outline: none;
    }
    
    &::placeholder {
      color: ${theme.colors.text.muted};
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  ${props => props.$variant === 'primary' ? `
    background: ${theme.colors.gradients.button};
    color: ${theme.colors.text.primary};
    
    &:hover {
      background: ${theme.colors.gradients.buttonHover};
      box-shadow: ${theme.colors.shadow.button};
      transform: translateY(-2px);
    }
  ` : `
    background: transparent;
    color: ${theme.colors.text.secondary};
    border: 2px solid ${theme.colors.border.primary};
    
    &:hover {
      border-color: ${theme.colors.accent.primary};
      color: ${theme.colors.text.primary};
    }
  `}
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: ${theme.colors.status.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  text-align: center;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: ${theme.colors.text.primary};
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string) => void;
  mode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' 
        ? { email, password, username: username || email }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Ошибка ${mode === 'register' ? 'регистрации' : 'авторизации'}`);
      }

      const data = await response.json();
      onAuthSuccess(data.access_token || data.token);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Перенаправляем на Google OAuth
    window.location.href = '/auth/google';
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>{mode === 'register' ? 'Регистрация' : 'Вход в систему'}</h3>
          <p>{mode === 'register' ? 'Создайте новый аккаунт' : 'Войдите в свой аккаунт для продолжения'}</p>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <FormGroup>
              <label htmlFor="username">Имя пользователя:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя пользователя"
                required
                disabled={isLoading}
              />
            </FormGroup>
          )}
          <FormGroup>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              required
              disabled={isLoading}
            />
          </FormGroup>

          <FormGroup>
            <label htmlFor="password">Пароль:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button
              type="submit"
              $variant="primary"
              disabled={isLoading || !email || !password || (mode === 'register' && !username)}
            >
              {isLoading ? <LoadingSpinner /> : (mode === 'register' ? 'Зарегистрироваться' : 'Войти')}
            </Button>
            <Button
              type="button"
              $variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </Button>
          </ButtonGroup>
        </Form>

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            <Button
              type="button"
              $variant="secondary"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              Войти через Google
            </Button>
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
