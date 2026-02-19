export const getFingerprintId = (): string => {
    const STORAGE_KEY = 'device_fingerprint_id';
    let fingerprint = localStorage.getItem(STORAGE_KEY);

    if (!fingerprint) {
        // Generate a simple UUID v4-like string
        fingerprint = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem(STORAGE_KEY, fingerprint);
    }

    return fingerprint;
};
