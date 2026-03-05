/**
 * useCharactersCache — хук для кэширования персонажей в sessionStorage.
 *
 * Best-practice стратегия:
 * - Данные хранятся в sessionStorage (очищается при закрытии вкладки).
 * - TTL 5 минут: если данные устарели — запрашивает API заново.
 * - При принудительном обновлении (forceRefresh) кэш сбрасывается.
 * - Используется сжатая версия данных: только нужные поля (без raw).
 */

const CACHE_KEY = 'characters_cache_v4'; // v4: добавлены name_ru/name_en
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут

interface CharactersCacheEntry {
    timestamp: number;
    data: any[];
}

const readCache = (): CharactersCacheEntry | null => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry: CharactersCacheEntry = JSON.parse(raw);
        return entry;
    } catch {
        return null;
    }
};

const writeCache = (data: any[]): void => {
    try {
        const entry: CharactersCacheEntry = {
            timestamp: Date.now(),
            data,
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
        // sessionStorage может быть недоступен (приватный режим, переполнение)
    }
};

const clearCache = (): void => {
    try {
        sessionStorage.removeItem(CACHE_KEY);
    } catch {
        // игнорируем
    }
};

const isCacheValid = (entry: CharactersCacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
};

/**
 * Возвращает данные из кэша если они свежие, иначе null.
 * @param forceRefresh если true — всегда возвращает null (принудительный bypass кэша)
 */
export const getCharactersFromCache = (forceRefresh = false): any[] | null => {
    if (forceRefresh) {
        clearCache();
        return null;
    }

    const entry = readCache();
    if (!entry || !isCacheValid(entry)) {
        return null;
    }
    return entry.data;
};

/**
 * Сохраняет данные персонажей в кэш.
 */
export const saveCharactersToCache = (data: any[]): void => {
    writeCache(data);
};

/**
 * Принудительно инвалидирует кэш (например, при создании/удалении персонажа).
 */
export const invalidateCharactersCache = (): void => {
    clearCache();
};
