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

interface PendingNotification {
  taskId: string;
  imageUrl: string;
  characterName?: string;
  characterId?: string | number;
  timestamp: number;
}

class GenerationTracker {
  private activeGenerations: Map<string, ActiveGeneration> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(taskId: string, imageUrl: string, characterName?: string, characterId?: string | number) => void> = new Set();
  // Очередь ожидающих уведомлений - для случаев когда генерация завершилась, но listener ещё не подписался
  private pendingNotifications: PendingNotification[] = [];
  // Время жизни ожидающего уведомления (30 секунд)
  private readonly PENDING_NOTIFICATION_TTL = 30000;

  /**
   * Добавляет генерацию в отслеживание (идемпотентно — повторный вызов с тем же taskId игнорируется).
   */
  addGeneration(taskId: string, messageId: string, characterName?: string, characterId?: string | number, token?: string): void {
    if (this.activeGenerations.has(taskId)) return;

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

          console.log('[GenerationTracker] Генерация завершена:', { taskId, imageUrl, status: statusData.status });

          if (imageUrl) {
            // Уведомляем всех слушателей ПЕРЕД удалением генерации
            console.log('[GenerationTracker] Уведомляем слушателей о завершении');
            this.notifyListeners(taskId, imageUrl, generation.characterName, generation.characterId);
            // Удаляем генерацию после уведомления
            this.removeGeneration(taskId);
          }
        } else if (statusData.status === 'FAILURE' || statusData.status === 'ERROR') {
          console.log('[GenerationTracker] Генерация завершилась с ошибкой:', taskId);
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
   * При добавлении с небольшой задержкой отдаёт все ожидающие уведомления
   */
  addListener(callback: (taskId: string, imageUrl: string, characterName?: string, characterId?: string | number) => void): () => void {
    console.log('[GenerationTracker] Добавлен новый слушатель, всего слушателей:', this.listeners.size + 1);
    this.listeners.add(callback);
    
    console.log('[GenerationTracker] Проверяем ожидающие уведомления через 100мс');
    // Отдаём ожидающие уведомления с небольшой задержкой,
    // чтобы React успел полностью смонтировать компонент
    setTimeout(() => {
      console.log('[GenerationTracker] Вызываем flushPendingNotifications');
      this.flushPendingNotifications();
    }, 100);
    
    return () => {
      console.log('[GenerationTracker] Слушатель удалён');
      this.listeners.delete(callback);
    };
  }

  /**
   * Отправляет все ожидающие уведомления текущим слушателям и очищает очередь
   */
  private flushPendingNotifications(): void {
    console.log('[GenerationTracker] flushPendingNotifications:', {
      pendingCount: this.pendingNotifications.length,
      listenersCount: this.listeners.size
    });

    if (this.pendingNotifications.length === 0) {
      console.log('[GenerationTracker] Нет ожидающих уведомлений');
      return;
    }

    if (this.listeners.size === 0) {
      console.log('[GenerationTracker] Нет слушателей для отправки ожидающих уведомлений');
      return;
    }

    const now = Date.now();
    // Фильтруем просроченные уведомления
    const validNotifications = this.pendingNotifications.filter(
      n => now - n.timestamp < this.PENDING_NOTIFICATION_TTL
    );

    console.log('[GenerationTracker] Отправляем', validNotifications.length, 'валидных уведомлений');

    // Отправляем каждое уведомление слушателям
    for (const notification of validNotifications) {
      console.log('[GenerationTracker] Отправка уведомления:', notification);
      this.listeners.forEach(callback => {
        try {
          callback(notification.taskId, notification.imageUrl, notification.characterName, notification.characterId);
        } catch (error) {
          console.error('[GenerationTracker] Ошибка при отправке ожидающего уведомления:', error);
        }
      });
    }

    // Очищаем очередь
    this.pendingNotifications = [];
    console.log('[GenerationTracker] Очередь очищена');
  }

  /**
   * Уведомляет всех слушателей о готовности генерации
   * Если слушателей нет, добавляет уведомление в очередь ожидания
   */
  private notifyListeners(taskId: string, imageUrl: string, characterName?: string, characterId?: string | number): void {
    console.log('[GenerationTracker] notifyListeners вызван:', { 
      taskId, 
      imageUrl, 
      characterName, 
      characterId,
      listenersCount: this.listeners.size 
    });

    if (this.listeners.size === 0) {
      console.log('[GenerationTracker] Нет слушателей, добавляем в очередь');
      // Нет активных слушателей - добавляем в очередь ожидания
      this.pendingNotifications.push({
        taskId,
        imageUrl,
        characterName,
        characterId,
        timestamp: Date.now()
      });
      console.log('[GenerationTracker] Размер очереди:', this.pendingNotifications.length);
      return;
    }

    console.log('[GenerationTracker] Уведомляем', this.listeners.size, 'слушателей');
    this.listeners.forEach(callback => {
      try {
        callback(taskId, imageUrl, characterName, characterId);
      } catch (error) {
        console.error('[GenerationTracker] Ошибка в слушателе:', error);
      }
    });
  }

  /**
   * Читает клон потока ответа до получения task_id и добавляет генерацию в трекер.
   * Вызывается сразу после fetch(), чтобы трекер получал task_id даже если пользователь
   * выйдет из чата до прихода первого чанка (поток компонента может прерваться).
   */
  trackStreamForTaskId(
    responseClone: Response,
    options: {
      characterName?: string;
      characterId?: string | number;
      token?: string;
      messageId: string;
    }
  ): void {
    const { characterName, characterId, token, messageId } = options;
    const reader = responseClone.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    const readLoop = async (): Promise<void> => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.task_id && !data.image_url && !data.cloud_url) {
                this.addGeneration(data.task_id, messageId, characterName, characterId, token);
                reader.cancel();
                return;
              }
            } catch {
              // игнорируем не-JSON строки
            }
          }
        }
      } catch {
        // поток закрыт или ошибка — нормально при навигации
      }
    };

    readLoop();
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
