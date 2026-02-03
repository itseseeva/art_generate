import React from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (accessToken: string, refreshToken?: string) => void;
  mode?: 'login' | 'register';
  onGoogleLogin?: () => void;
}

/**
 * AuthModal - компонент больше не показывает модальное окно входа/регистрации.
 * Вместо этого он редиректит пользователя на страницу /auth.
 * 
 * Это сделано для того, чтобы иметь одну централизованную страницу аутентификации
 * вместо множества модальных окон по всему приложению.
 */
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  mode = 'login',
  onGoogleLogin
}) => {
  // Редирект на страницу /auth вместо показа модального окна
  React.useEffect(() => {
    if (isOpen) {
      // Определяем URL в зависимости от mode с учетом текущего пути для редиректа
      const currentPath = window.location.pathname + window.location.search;
      const authUrl = mode === 'register'
        ? `/register?redirect=${encodeURIComponent(currentPath)}`
        : `/login?redirect=${encodeURIComponent(currentPath)}`;

      window.location.href = authUrl;

      // Закрываем модальное окно (если компонент ещё смонтирован)
      if (onClose) {
        onClose();
      }
    }
  }, [isOpen, mode, onClose]);

  // Не рендерим ничего, так как редиректим
  return null;
};
