/**
 * Утилита для отслеживания активных генераций изображений
 * и уведомления пользователя о готовности, даже если он не на странице чата
 */

interface ActiveGeneration {
  taskId: string;
  messageId: string;
  characterName?: string;
  characterId?: string | number;
  startTime: number;
  token?: string;
}

class GenerationTracker {
  private activeGenerations: Map<string, ActiveGeneration> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(taskId: string, imageUrl: string, characterName?: string, characterId?: string | number) => void> = new Set();

  /**
   * Добавляет генерацию в отслеживание
   */
  addGeneration(taskId: string, messageId: string, characterName?: string, characterId?: string | number, token?: string): void {
    this.activeGenerations.set(taskId, {
      taskId,
      messageId,
      characterName,
      characterId,
      startTime: Date.now(),
      token
    });

    // Начинаем опрос статуса
    this.startPolling(taskId);
  }

  /**
   * Удаляет генерацию из отслеживания
   */
  removeGeneration(taskId: string): void {
    this.activeGenerations.delete(taskId);
    const interval = this.pollingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(taskId);
    }
  }

  /**
   * Начинает опрос статуса генерации
   */
  private startPolling(taskId: string): void {
    const generation = this.activeGenerations.get(taskId);
    if (!generation) return;

    const pollInterval = 2000; // 2 секунды
    const maxAttempts = 120; // Максимум 4 минуты
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        this.removeGeneration(taskId);
        return;
      }

      attempts++;

      try {
        const statusUrl = `/api/v1/generation-status/${taskId}`;
        const response = await fetch(statusUrl, {
          headers: generation.token ? { 'Authorization': `Bearer ${generation.token}` } : undefined
        });

        if (!response.ok) {
          // Если ошибка, продолжаем опрос
          return;
        }

        const statusData = await response.json();

        // Проверяем статус завершения
        if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED') {
          const result = statusData.result || {};
          const imageUrl = result.image_url || result.cloud_url || statusData.image_url || statusData.cloud_url;

          if (imageUrl) {
            // Уведомляем всех слушателей ПЕРЕД удалением генерации
            this.notifyListeners(taskId, imageUrl, generation.characterName, generation.characterId);
            // Удаляем генерацию после уведомления
            this.removeGeneration(taskId);
          }
        } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
          // Генерация завершилась с ошибкой - удаляем из отслеживания
          this.removeGeneration(taskId);
        }
      } catch (error) {
        // Игнорируем ошибки и продолжаем опрос
      }
    };

    // Первый опрос сразу
    poll();

    // Затем опрашиваем каждые 2 секунды
    const interval = setInterval(poll, pollInterval);
    this.pollingIntervals.set(taskId, interval);
  }

  /**
   * Добавляет слушателя уведомлений
   */
  addListener(callback: (taskId: string, imageUrl: string, characterName?: string, characterId?: string | number) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Уведомляет всех слушателей о готовности генерации
   */
  private notifyListeners(taskId: string, imageUrl: string, characterName?: string, characterId?: string | number): void {
    this.listeners.forEach(callback => {
      try {
        callback(taskId, imageUrl, characterName, characterId);
      } catch (error) {
        // Игнорируем ошибки в слушателях
      }
    });
  }

  /**
   * Получает все активные генерации
   */
  getGenerations(): Map<string, ActiveGeneration> {
    return new Map(this.activeGenerations);
  }

  /**
   * Очищает все активные генерации
   */
  clear(): void {
    this.activeGenerations.forEach((_, taskId) => {
      this.removeGeneration(taskId);
    });
  }
}

export const generationTracker = new GenerationTracker();
