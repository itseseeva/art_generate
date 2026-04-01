import { useState, useEffect, useCallback } from 'react';

const PROMO_DURATION_SECONDS = 10 * 60; // 10 минут
const STORAGE_KEY = 'promo_end_time';

export interface PromoTimerState {
  timeLeft: number;       // секунды до конца
  isActive: boolean;      // промо сейчас активно
  minutes: string;        // MM
  seconds: string;        // SS
  hasDiscount: boolean;   // успел ли зарегистрироваться и получить скидку
}

function initEndTime(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const ts = parseInt(stored, 10);
    if (!isNaN(ts) && ts > Date.now()) return ts;
    // Время истекло — не сбрасываем, пусть будет 0
    if (!isNaN(ts)) return 0;
  }
  // Первый визит — запускаем таймер
  const endTime = Date.now() + PROMO_DURATION_SECONDS * 1000;
  localStorage.setItem(STORAGE_KEY, String(endTime));
  return endTime;
}

export function usePromoTimer(): PromoTimerState {
  const [endTime] = useState<number>(() => initEndTime());
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (endTime === 0) return 0;
    return Math.max(0, Math.round((endTime - Date.now()) / 1000));
  });

  const hasDiscount = localStorage.getItem('has_welcome_discount') === 'true';

  useEffect(() => {
    if (endTime === 0) return;

    const tick = () => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const isActive = timeLeft > 0;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return {
    timeLeft,
    isActive,
    minutes: String(mins).padStart(2, '0'),
    seconds: String(secs).padStart(2, '0'),
    hasDiscount,
  };
}

/** Вызывать после успешной регистрации: отправляет запрос на бэкенд */
export async function claimPromoDiscount(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/auth/promo/claim-discount/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.has_welcome_discount) {
        localStorage.setItem('has_welcome_discount', 'true');
      }
      return data.success;
    }
    return false;
  } catch {
    return false;
  }
}
