import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const SwitcherContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const LanguageButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${props => props.$active ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  color: ${props => props.$active ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 14px;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.95);
  }

  &:focus {
    outline: none;
  }
`;

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const switchLanguage = (newLang: string) => {
        const currentPath = location.pathname;
        const languages = ['ru', 'en'];

        // Check if path starts with a language prefix
        const currentLangPrefix = languages.find(lang =>
            currentPath === `/${lang}` || currentPath.startsWith(`/${lang}/`)
        );

        let pathWithoutLang = currentPath;
        if (currentLangPrefix) {
            // Remove the language prefix
            pathWithoutLang = currentPath.substring(currentLangPrefix.length + 1);
        }

        // Ensure path starts with /
        if (!pathWithoutLang.startsWith('/')) {
            pathWithoutLang = '/' + pathWithoutLang;
        }

        // Handle root path case to avoid double slashes if needed, though // is usually fine
        if (pathWithoutLang === '/' && newLang) {
            navigate(`/${newLang}`);
            return;
        }

        navigate(`/${newLang}${pathWithoutLang}`);
    };

    return (
        <SwitcherContainer>
            <LanguageButton
                $active={i18n.language === 'ru'}
                onClick={() => switchLanguage('ru')}
            >
                RU
            </LanguageButton>
            <LanguageButton
                $active={i18n.language === 'en'}
                onClick={() => switchLanguage('en')}
            >
                EN
            </LanguageButton>
        </SwitcherContainer>
    );
};
