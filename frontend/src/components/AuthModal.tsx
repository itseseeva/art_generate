import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { i18n } = useTranslation();

  // Редирект на страницу /auth вместо показа модального окна
  React.useEffect(() => {
    if (isOpen) {
      const currentLang = i18n.language?.split('-')[0] || 'en';

      // ВАЖНО: Не добавляем redirect если уже на странице login/register
      // иначе получается бесконечный цикл редиректов
      const isAlreadyOnAuthPage = window.location.pathname.includes(`/${currentLang}/login`) ||
        window.location.pathname.includes(`/${currentLang}/register`) ||
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';

      if (isAlreadyOnAuthPage) {
        // Если мы уже на странице авторизации - НИЧЕГО НЕ ДЕЛАЕМ
        // Просто закрываем модалку (логический флаг), чтобы не висела
        if (onClose) onClose();
        return;
      }

      // Определяем URL в зависимости от mode с учетом текущего пути для редиректа
      const currentPath = window.location.pathname + window.location.search;

      const authUrl = mode === 'register'
        ? `/${currentLang}/register?redirect=${encodeURIComponent(currentPath)}`
        : `/${currentLang}/login?redirect=${encodeURIComponent(currentPath)}`;

      window.location.href = authUrl;

      // Закрываем модальное окно (если компонент ещё смонтирован)
      if (onClose) {
        onClose();
      }
    }
  }, [isOpen, mode, onClose, i18n.language]);

  // Не рендерим ничего, так как редиректим
  return null;
};
