import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { API_CONFIG } from '../config/api';
import { authManager } from '../utils/auth';
import { Button } from 'flowbite-react';
import { FiUser as UserIcon } from 'react-icons/fi';

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
  flex-direction: column;
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  background: rgba(239, 68, 68, 0.1);
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  text-align: center;
`;

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        throw new Error('Имя пользователя обязательно');
      }
      if (trimmedUsername.length < 3) {
        throw new Error('Имя пользователя должно содержать минимум 3 символа');
      }
      if (trimmedUsername.length > 30) {
        throw new Error('Имя пользователя не должно превышать 30 символов');
      }

      const token = authManager.getToken();
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.SET_USERNAME, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: trimmedUsername })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.detail || 'Ошибка при установке имени пользователя';
        throw new Error(message);
      }

      // Успешно установлен username
      onSuccess();
      setUsername('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Произошла ошибка';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>Введите имя пользователя</h3>
          <p>Пожалуйста, укажите имя пользователя для завершения регистрации</p>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <label htmlFor="username">Имя пользователя:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              minLength={3}
              maxLength={30}
              required
              disabled={isLoading}
              autoFocus
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button
              type="submit"
              disabled={isLoading || !username.trim()}
              color="purple"
            >
              {isLoading ? (
                'Сохранение...'
              ) : (
                <>
                  <UserIcon style={{ marginRight: '8px' }} />
                  Сохранить
                </>
              )}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

