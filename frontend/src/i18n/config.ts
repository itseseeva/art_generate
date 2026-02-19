import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Очищаем кэш переводов в localStorage при каждом запуске
const I18N_VERSION = '4';
const storedVersion = localStorage.getItem('i18n_version');
if (storedVersion !== I18N_VERSION) {
    // Удаляем все старые кэши i18next
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('i18next_') || key.startsWith('i18n_')) {
            localStorage.removeItem(key);
        }
    });
    localStorage.setItem('i18n_version', I18N_VERSION);
}

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'ru',
        supportedLngs: ['ru', 'en'],
        debug: false,

        detection: {
            order: ['path', 'localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupFromPathIndex: 0,
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
            queryStringParams: { v: I18N_VERSION },
        },

        ns: ['common', 'prompts'],
        defaultNS: 'common',

        interpolation: {
            escapeValue: false,
        },

        react: {
            useSuspense: true,
        },
    });

export default i18n;
