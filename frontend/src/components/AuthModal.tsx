import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 20px;
  padding: ${theme.spacing.xxl};
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  max-width: 420px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
  border: 1px solid rgba(100, 100, 100, 0.2);

  @media (max-width: 768px) {
    padding: ${theme.spacing.lg};
    width: 95vw;
  }
`;

const ModalHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  
  h3 {
    font-size: ${theme.fontSize['2xl']};
    font-weight: 700;
    color: #ffffff;
    margin-bottom: ${theme.spacing.sm};
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  
  p {
    color: #b0b0b0;
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
  gap: 8px;
  margin-bottom: 16px;
  
  label {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 14px;
    display: block;
  }
  
  input {
    width: 100%;
    padding: 14px 16px;
    background: rgba(30, 30, 30, 0.8);
    border: 2px solid rgba(80, 80, 80, 0.5);
    border-radius: 10px;
    color: #ffffff;
    font-size: 15px;
    transition: all 0.3s ease;
    display: block;
    position: relative;
    z-index: 1;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
    
    &:focus {
      border-color: rgba(150, 150, 150, 0.8);
      box-shadow: 
        0 0 0 3px rgba(150, 150, 150, 0.2),
        inset 0 2px 4px rgba(0, 0, 0, 0.3);
      outline: none;
      background: rgba(35, 35, 35, 0.9);
    }
    
    &::placeholder {
      color: #666666;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: ${theme.fontSize.base};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  ${props => props.$variant === 'primary' ? `
    background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
    color: #ffffff;
    box-shadow: 
      0 4px 15px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.5s;
    }
    
    &:hover {
      background: linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%);
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      
      &::before {
        left: 100%;
      }
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
  ` : `
    background: rgba(40, 40, 40, 0.8);
    color: #d0d0d0;
    border: 2px solid rgba(100, 100, 100, 0.4);
    box-shadow: 
      0 4px 15px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    
    &:hover {
      background: rgba(50, 50, 50, 0.9);
      border-color: rgba(150, 150, 150, 0.6);
      color: #ffffff;
      box-shadow: 
        0 6px 20px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(200, 50, 50, 0.2);
  border: 1px solid rgba(200, 50, 50, 0.4);
  color: #ff6b6b;
  padding: ${theme.spacing.md};
  border-radius: 10px;
  font-size: ${theme.fontSize.sm};
  text-align: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
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

const GoogleButton = styled.button`
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  background: transparent;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const GoogleButtonImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
`;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (accessToken: string, refreshToken?: string) => void;
  mode?: 'login' | 'register';
  onGoogleLogin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, mode = 'login', onGoogleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationCode, setShowVerificationCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [fingerprintId, setFingerprintId] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');

  // Получаем fingerprint_id при открытии модального окна
  useEffect(() => {
    if (isOpen && mode === 'register') {
      const getFingerprint = async () => {
        try {
          const fp = await FingerprintJS.load();
          const result = await fp.get();
          setFingerprintId(result.visitorId);
        } catch (err) {
          
          // В случае ошибки продолжаем без fingerprint_id
          setFingerprintId(null);
        }
      };
      getFingerprint();
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === 'register' ? '/api/v1/auth/register/' : '/api/v1/auth/login/';
      // Формируем body с fingerprint_id только если он есть
      const body = mode === 'register' 
        ? { 
            email, 
            password, 
            username: username || email, 
            ...(fingerprintId && { fingerprint_id: fingerprintId })
          }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Пытаемся получить текст ошибки (может быть JSON или текст)
        let errorMessage = `Ошибка ${mode === 'register' ? 'регистрации' : 'авторизации'}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Если не JSON, пытаемся получить текст
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Если это регистрация, показываем окно для ввода кода верификации
      if (mode === 'register') {
        // Очищаем предыдущий код при повторной регистрации
        setVerificationCode('');
        setError(null);
        setShowVerificationCode(true);
        setIsLoading(false);
        return;
      }
      
      // Если это логин, сохраняем токены
      const accessToken = data.access_token || data.token;
      const refreshToken = data.refresh_token;
      if (accessToken) {
        onAuthSuccess(accessToken, refreshToken);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Подтверждаем регистрацию с кодом верификации
      const response = await fetch('/api/v1/auth/confirm-registration/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verification_code: verificationCode,
          ...(fingerprintId && { fingerprint_id: fingerprintId })
        }),
      });

      if (!response.ok) {
        // Пытаемся получить текст ошибки (может быть JSON или текст)
        let errorMessage = 'Неверный код верификации';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Если не JSON, пытаемся получить текст
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const accessToken = data.access_token || data.token;
      const refreshToken = data.refresh_token;
      if (accessToken) {
        onAuthSuccess(accessToken, refreshToken);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    if (onGoogleLogin) {
      onGoogleLogin();
    } else {
      // Перенаправляем на Google OAuth (fallback)
    window.location.href = '/auth/google';
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/forgot-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка при отправке кода';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      setResetStep('code');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!resetCode || resetCode.length !== 6) {
      setError('Введите 6-значный код');
      setIsLoading(false);
      return;
    }

    setResetStep('password');
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/reset-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail,
          verification_code: resetCode,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Ошибка при сбросе пароля';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Пароль успешно сброшен, закрываем модальное окно
      setShowForgotPassword(false);
      setResetStep('email');
      setResetEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          <h3>
            {showForgotPassword 
              ? 'Восстановление пароля'
              : mode === 'register' 
                ? 'Регистрация' 
                : 'Вход в систему'
            }
          </h3>
          <p>
            {showForgotPassword
              ? resetStep === 'email'
                ? 'Введите email для восстановления пароля'
                : resetStep === 'code'
                  ? `Мы отправили код на ${resetEmail}. Введите код из письма:`
                  : 'Введите новый пароль'
              : showVerificationCode 
                ? `Мы отправили код верификации на ${email}. Введите код из письма:`
                : mode === 'register' 
                  ? 'Создайте новый аккаунт' 
                  : 'Войдите в свой аккаунт для продолжения'
            }
          </p>
        </ModalHeader>

        {showForgotPassword ? (
          resetStep === 'email' ? (
            <Form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="reset_email" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Email:</label>
                <input
                  type="email"
                  id="reset_email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Введите ваш email"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a2e',
                    border: '2px solid #374151',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonGroup>
                <Button
                  type="submit"
                  $variant="primary"
                  disabled={isLoading || !resetEmail}
                >
                  {isLoading ? <LoadingSpinner /> : 'Отправить код'}
                </Button>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Отмена
                </Button>
              </ButtonGroup>
            </Form>
          ) : resetStep === 'code' ? (
            <Form onSubmit={handleVerifyResetCode}>
              <div style={{ marginBottom: '20px' }}>
                <label 
                  htmlFor="reset_code" 
                  style={{ 
                    display: 'block', 
                    marginBottom: '12px', 
                    fontWeight: 600, 
                    color: '#e2e8f0', 
                    fontSize: '14px' 
                  }}
                >
                  Код восстановления:
                </label>
                <input
                  type="text"
                  id="reset_code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  disabled={isLoading}
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'rgba(30, 30, 30, 0.8)',
                    border: '2px solid rgba(80, 80, 80, 0.5)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    letterSpacing: '12px',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'block',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonGroup>
                <Button
                  type="submit"
                  $variant="primary"
                  disabled={isLoading || !resetCode || resetCode.length !== 6}
                >
                  {isLoading ? <LoadingSpinner /> : 'Продолжить'}
                </Button>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => {
                    setResetStep('email');
                    setResetCode('');
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Назад
                </Button>
              </ButtonGroup>
            </Form>
          ) : (
            <Form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="new_password" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Новый пароль:</label>
                <input
                  type="password"
                  id="new_password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a2e',
                    border: '2px solid #374151',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="confirm_password" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Подтвердите пароль:</label>
                <input
                  type="password"
                  id="confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1a1a2e',
                    border: '2px solid #374151',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonGroup>
                <Button
                  type="submit"
                  $variant="primary"
                  disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {isLoading ? <LoadingSpinner /> : 'Сбросить пароль'}
                </Button>
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => {
                    setResetStep('code');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Назад
                </Button>
              </ButtonGroup>
            </Form>
          )
        ) : showVerificationCode ? (
          <Form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="verification_code" 
                style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: 600, 
                  color: '#e2e8f0', 
                  fontSize: '14px' 
                }}
              >
                Код верификации:
              </label>
              <input
                type="text"
                id="verification_code"
                name="verification_code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                disabled={isLoading}
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(30, 30, 30, 0.8)',
                  border: '2px solid rgba(80, 80, 80, 0.5)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  letterSpacing: '12px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'block',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(150, 150, 150, 0.8)';
                  e.target.style.background = 'rgba(35, 35, 35, 0.9)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(80, 80, 80, 0.5)';
                  e.target.style.background = 'rgba(30, 30, 30, 0.8)';
                }}
              />
            </div>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <ButtonGroup>
              <Button
                type="submit"
                $variant="primary"
                disabled={isLoading || !verificationCode || verificationCode.length !== 6}
              >
                {isLoading ? <LoadingSpinner /> : 'Подтвердить'}
              </Button>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => {
                  setShowVerificationCode(false);
                  setVerificationCode('');
                  setError(null);
                }}
                disabled={isLoading}
              >
                Отмена
              </Button>
            </ButtonGroup>
          </Form>
        ) : (
          <Form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="username" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Имя пользователя:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя пользователя"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(30, 30, 30, 0.8)',
                  border: '2px solid rgba(80, 80, 80, 0.5)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}
              />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="user_email" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Email:</label>
            <input
              type="email"
              id="user_email"
              name="user_email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a2e',
                border: '2px solid #374151',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="user_password" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>Пароль:</label>
            <input
              type="password"
              id="user_password"
              name="user_password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a2e',
                border: '2px solid #374151',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          {mode === 'login' && (
            <div style={{ marginBottom: '16px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(email);
                  setResetStep('email');
                  setError(null);
                }}
                disabled={isLoading}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Забыл пароль?
              </button>
            </div>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button
              type="submit"
              $variant="primary"
              disabled={isLoading || !email || !password || (mode === 'register' && !username)}
            >
              {isLoading ? <LoadingSpinner /> : (mode === 'register' ? 'Готово' : 'Войти')}
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
        )}

        {!showVerificationCode && !showForgotPassword && (
          <div style={{ textAlign: 'center', marginTop: theme.spacing.lg }}>
            <GoogleButton
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              <GoogleButtonImage 
                src="/photo_2025-11-28_03-16-03.jpg" 
                alt="Sign in with Google"
              />
            </GoogleButton>
          </div>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
