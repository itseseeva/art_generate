import React, { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

// Add animations to document head if not already present
if (typeof document !== 'undefined') {
  const styleId = 'auth-modal-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
      }
      .animate-slideIn {
        animation: slideIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
}

interface ValidationErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
  ctx?: Record<string, unknown>;
}

function formatValidationErrors(detail: unknown): string {
  if (!Array.isArray(detail)) {
    return typeof detail === 'string' ? detail : 'Ошибка валидации.';
  }
  const messages: string[] = [];
  for (const e of detail as ValidationErrorItem[]) {
    const loc = e.loc || [];
    const field = (typeof loc[loc.length - 1] === 'string' ? loc[loc.length - 1] : '') as string;
    const msg = (e.msg || '').toLowerCase();
    const type = (e.type || '').toLowerCase();
    const fullMsg = (e.msg || '').trim();
    if (/[а-яА-ЯёЁ]/.test(fullMsg)) {
      messages.push(fullMsg);
      continue;
    }
    if (field === 'password') {
      if (type === 'string_too_short' || /at least 8|min_length|8 character/.test(msg)) {
        messages.push('Пароль: не менее 8 символов, строчная буква и цифра.');
      } else if (/lowercase|строчн|lower/.test(msg)) {
        messages.push('Пароль должен содержать хотя бы одну строчную букву.');
      } else if (/digit|цифр|number/.test(msg)) {
        messages.push('Пароль должен содержать хотя бы одну цифру.');
      } else {
        messages.push('Пароль: не менее 8 символов, строчная буква и цифра.');
      }
    } else if (field === 'username') {
      if (type === 'string_too_short' || /at least 3|min_length|3 character/.test(msg)) {
        messages.push('Имя пользователя: не менее 3 символов.');
      } else if (type === 'string_too_long' || /at most 30|max_length|30 character/.test(msg)) {
        messages.push('Имя пользователя: не более 30 символов.');
      } else {
        messages.push('Имя пользователя: от 3 до 30 символов.');
      }
    } else if (field === 'email') {
      messages.push('Введите корректный email.');
    } else if (fullMsg) {
      messages.push(fullMsg);
    }
  }
  const uniq = [...new Set(messages)];
  return uniq.length ? uniq.join(' ') : 'Ошибка валидации.';
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (accessToken: string, refreshToken?: string) => void;
  mode?: 'login' | 'register';
  onGoogleLogin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, mode = 'login', onGoogleLogin }) => {
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
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

  // Синхронизируем currentMode с пропом mode
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Получаем fingerprint_id при открытии модального окна
  useEffect(() => {
    if (isOpen && currentMode === 'register') {
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
  }, [isOpen, currentMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // КРИТИЧНО: Для регистрации fingerprint_id обязателен
      if (currentMode === 'register' && !fingerprintId) {
        setError('Не удалось определить устройство. Пожалуйста, обновите страницу и попробуйте снова.');
        setIsLoading(false);
        return;
      }

      const endpoint = currentMode === 'register' ? '/api/v1/auth/register/' : '/api/v1/auth/login/';
      // Формируем body с обязательным fingerprint_id для регистрации
      const body = currentMode === 'register' 
        ? { 
            email, 
            password, 
            username: username || email, 
            fingerprint_id: fingerprintId
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
        let errorMessage = `Ошибка ${currentMode === 'register' ? 'регистрации' : 'авторизации'}`;
        try {
          const errorData = await response.json();
          const d = errorData.detail;
          if (response.status === 422 && d != null) {
            const arr = Array.isArray(d) ? d : [d];
            const formatted = formatValidationErrors(arr);
            errorMessage = currentMode === 'register'
              ? `Исправьте данные: ${formatted}`
              : formatted;
          } else if (response.status === 500 && currentMode === 'register') {
            errorMessage = 'Временная ошибка. Проверьте: пароль от 8 символов, строчная буква и цифра; имя от 3 до 30 символов. Отправьте снова.';
          } else if (typeof d === 'string') {
            errorMessage = d;
          } else if (d) {
            errorMessage = formatValidationErrors(Array.isArray(d) ? d : [d]);
          }
        } catch {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            /* ignore */
          }
        }
        if (currentMode === 'register' && response.status === 500 && errorMessage.includes('JSON serializable')) {
          errorMessage = 'Временная ошибка. Проверьте: пароль от 8 символов, строчная буква и цифра; имя от 3 до 30 символов. Отправьте снова.';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Если это регистрация, показываем окно для ввода кода верификации
      if (currentMode === 'register') {
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
      // КРИТИЧНО: fingerprint_id обязателен для подтверждения регистрации
      if (!fingerprintId) {
        setError('Не удалось определить устройство. Пожалуйста, обновите страницу и попробуйте снова.');
        setIsLoading(false);
        return;
      }

      // Подтверждаем регистрацию с кодом верификации
      const response = await fetch('/api/v1/auth/confirm-registration/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verification_code: verificationCode,
          fingerprint_id: fingerprintId
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
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-950 to-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 md:p-10 max-w-md w-[90vw] md:w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl animate-slideIn">
        <div className="flex justify-center mb-8">
          <img src="/logo-header.png" alt="Site Logo" className="h-15 object-contain" />
        </div>
        
        <div className="text-center mb-8">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {showForgotPassword 
              ? 'Восстановление пароля'
              : currentMode === 'register' 
                ? 'Регистрация' 
                : 'Вход в систему'
            }
          </h3>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            {showForgotPassword
              ? resetStep === 'email'
                ? 'Введите email для восстановления пароля'
                : resetStep === 'code'
                  ? `Мы отправили код на ${resetEmail}. Введите код из письма:`
                  : 'Введите новый пароль'
              : showVerificationCode 
                ? `Мы отправили код верификации на ${email}. Введите код из письма:`
                : currentMode === 'register' 
                  ? 'Создайте новый аккаунт' 
                  : 'Войдите в свой аккаунт для продолжения'
            }
          </p>
        </div>

        {showForgotPassword ? (
          resetStep === 'email' ? (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-6">
              <div className="mb-4">
                <label htmlFor="reset_email" className="block mb-2 font-semibold text-gray-200 text-sm">Email:</label>
                <input
                  type="email"
                  id="reset_email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Введите ваш email"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !resetEmail}
                className="w-full py-3.5 bg-gradient-to-r from-[#9F1239] to-[#B91C3C] text-white font-semibold rounded-xl shadow-lg shadow-[#9F1239]/20 hover:shadow-[#9F1239]/30 hover:from-[#B91C3C] hover:to-[#C91E42] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#9F1239]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <LoadingSpinner /> : 'Отправить код'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full py-2.5 text-gray-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </form>
          ) : resetStep === 'code' ? (
            <form onSubmit={handleVerifyResetCode} className="flex flex-col gap-6">
              <div className="mb-5">
                <label htmlFor="reset_code" className="block mb-3 font-semibold text-gray-200 text-sm">
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
                  className="w-full px-4 py-4 bg-black/20 border border-gray-700/50 rounded-xl text-white text-2xl font-bold text-center tracking-[0.75rem] focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !resetCode || resetCode.length !== 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#9F1239] to-[#B91C3C] text-white font-semibold rounded-xl shadow-lg shadow-[#9F1239]/20 hover:shadow-[#9F1239]/30 hover:from-[#B91C3C] hover:to-[#C91E42] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#9F1239]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <LoadingSpinner /> : 'Продолжить'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetStep('email');
                  setResetCode('');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full py-2.5 text-gray-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
              <div className="mb-4">
                <label htmlFor="new_password" className="block mb-2 font-semibold text-gray-200 text-sm">Новый пароль:</label>
                <input
                  type="password"
                  id="new_password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="confirm_password" className="block mb-2 font-semibold text-gray-200 text-sm">Подтвердите пароль:</label>
                <input
                  type="password"
                  id="confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full py-3.5 bg-gradient-to-r from-[#9F1239] to-[#B91C3C] text-white font-semibold rounded-xl shadow-lg shadow-[#9F1239]/20 hover:shadow-[#9F1239]/30 hover:from-[#B91C3C] hover:to-[#C91E42] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#9F1239]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? <LoadingSpinner /> : 'Сбросить пароль'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetStep('code');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full py-2.5 text-gray-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
            </form>
          )
        ) : showVerificationCode ? (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-6">
            <div className="mb-5">
              <label htmlFor="verification_code" className="block mb-3 font-semibold text-gray-200 text-sm">
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
                className="w-full px-4 py-4 bg-black/20 border border-gray-700/50 rounded-xl text-white text-2xl font-bold text-center tracking-[0.75rem] focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !verificationCode || verificationCode.length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-[#9F1239] to-[#B91C3C] text-white font-semibold rounded-xl shadow-lg shadow-[#9F1239]/20 hover:shadow-[#9F1239]/30 hover:from-[#B91C3C] hover:to-[#C91E42] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#9F1239]/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <LoadingSpinner /> : 'Подтвердить'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowVerificationCode(false);
                setVerificationCode('');
                setError(null);
              }}
              disabled={isLoading}
              className="w-full py-2.5 text-gray-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {currentMode === 'register' && (
            <div className="mb-4">
              <label htmlFor="username" className="block mb-2 font-semibold text-gray-200 text-sm">Имя пользователя:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите имя пользователя"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="block mt-2 text-xs text-gray-400">От 3 до 30 символов.</span>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="user_email" className="block mb-2 font-semibold text-gray-200 text-sm">Email:</label>
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
              className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="user_password" className="block mb-2 font-semibold text-gray-200 text-sm">Пароль:</label>
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
              className="w-full px-4 py-3 bg-black/20 border border-gray-700/50 rounded-xl text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-[#9F1239] focus:ring-2 focus:ring-[#9F1239]/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {currentMode === 'register' && (
              <span className="block mt-2 text-xs text-gray-400">Не менее 8 символов, строчная буква и цифра.</span>
            )}
          </div>

          {currentMode === 'login' && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(email);
                  setResetStep('email');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full text-left text-sm text-gray-400 hover:text-[#9F1239] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Забыл пароль?
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password || (currentMode === 'register' && !username)}
            className="w-full py-3.5 bg-gradient-to-r from-[#9F1239] to-[#B91C3C] text-white font-semibold rounded-xl shadow-lg shadow-[#9F1239]/20 hover:shadow-[#9F1239]/30 hover:from-[#B91C3C] hover:to-[#C91E42] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#9F1239]/20 flex items-center justify-center gap-2"
          >
            {isLoading ? <LoadingSpinner /> : (currentMode === 'register' ? 'Готово' : 'Войти')}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2.5 text-gray-400 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>

          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentMode(currentMode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              disabled={isLoading}
              className="text-xs text-gray-400 hover:text-[#9F1239] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentMode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </form>
        )}

        {!showVerificationCode && !showForgotPassword && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-auto max-w-[200px] mx-auto p-0 border-none rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <img 
                src="/photo_2025-11-28_03-16-03.jpg" 
                alt="Sign in with Google"
                className="w-full max-w-[200px] h-auto block object-contain rounded-lg"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
