/**
 * Темная тема с фиолетово-черными градиентами и пурпурными акцентами
 * Основана на стиле с темными фиолетовыми тонами, переходящими в черный,
 * с яркими пурпурными акцентами и синими подтонами
 */

export const theme = {
  colors: {
    // Основные цвета фона
    background: {
      primary: '#0a0a0f',      // Почти черный с фиолетовым подтоном
      secondary: '#1a1a2e',   // Темно-фиолетовый
      tertiary: '#16213e',    // Темно-синий с фиолетовым
      gradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
    },

    // Акцентные цвета
    accent: {
      primary: '#8b5cf6',     // Яркий фиолетовый
      secondary: '#a855f7',   // Пурпурный
      tertiary: '#c084fc',   // Светло-пурпурный
      glow: '#e879f9',       // Светящийся пурпурный
    },

    // Градиенты
    gradients: {
      main: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 30%, #16213e 70%, #8b5cf6 100%)',
      card: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
      button: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      buttonHover: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
      message: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      sidebar: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)',
    },

    // Текст
    text: {
      primary: '#ffffff',     // Белый
      secondary: '#e2e8f0',   // Светло-серый
      tertiary: '#94a3b8',   // Серый
      muted: '#64748b',      // Приглушенный серый
      accent: '#c084fc',     // Пурпурный для акцентов
    },

    // Состояния
    status: {
      success: '#10b981',    // Зеленый
      warning: '#f59e0b',    // Оранжевый
      error: '#ef4444',      // Красный
      info: '#3b82f6',       // Синий
    },

    // Границы и разделители
    border: {
      primary: '#374151',     // Темно-серый
      secondary: '#4b5563',  // Серый
      accent: '#8b5cf6',     // Фиолетовый
    },

    // Тени и эффекты
    shadow: {
      card: '0 10px 25px rgba(0, 0, 0, 0.3), 0 0 20px rgba(139, 92, 246, 0.1)',
      button: '0 4px 15px rgba(139, 92, 246, 0.3)',
      glow: '0 0 20px rgba(232, 121, 249, 0.5)',
      message: '0 2px 10px rgba(0, 0, 0, 0.2)',
    },
  },

  // Размеры и отступы
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem',     // 48px
  },

  // Радиусы скругления
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },

  // Размеры шрифтов
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },

  // Переходы
  transition: {
    fast: '0.15s ease-in-out',
    normal: '0.3s ease-in-out',
    slow: '0.5s ease-in-out',
  },

  // Z-index слои
  zIndex: {
    dropdown: 1000,
    modal: 2000,
    toast: 3000,
  },
} as const;

export type Theme = typeof theme;
