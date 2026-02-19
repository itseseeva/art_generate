import { useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGUAGES = ['ru', 'en'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface LanguageWrapperProps {
    forceLang?: string;
}

export const LanguageWrapper = ({ forceLang }: LanguageWrapperProps) => {
    const { lang } = useParams<{ lang: string }>();
    const navigate = useNavigate();
    const { i18n } = useTranslation();

    const currentLang = forceLang || lang;

    useEffect(() => {
        // Validate language parameter if it came from URL
        // If forceLang is provided, we assume it's valid
        if (!forceLang) {
            const isValidLang = lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);

            if (!isValidLang) {
                // Redirect to browser language or default
                const browserLang = navigator.language.split('-')[0];
                const defaultLang = SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)
                    ? browserLang
                    : 'ru';

                // If default is 'en', we might want to redirect to root?
                // But this logic is primarily for cleaning up invalid URL params.
                // Let's keep it simple: if invalid param, redirect to /ru or /en (which will be handled by App router)

                // However, with new routing, /en should redirect to /
                // So let's just let AppRouter handle it. 
                // Using replace to fix URL
                const currentPath = window.location.pathname;
                const newPath = currentPath.replace(/^\/[^\/]*/, `/${defaultLang}`);
                navigate(newPath, { replace: true });
                return;
            }
        }

        // FORCE language change
        if (currentLang && i18n.language !== currentLang) {
            i18n.changeLanguage(currentLang);
        }

        // Update HTML lang attribute
        if (currentLang) {
            document.documentElement.lang = currentLang;
        }
    }, [lang, forceLang, i18n, navigate]);

    return <Outlet />;
};
