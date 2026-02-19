import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { theme } from '../theme';
import { API_CONFIG } from '../config/api';

const FooterContainer = styled.footer`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem 1rem;
  width: 100%;
  position: relative;
  z-index: 10;
  margin-top: auto;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
`;

const TopSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1rem;
  align-items: center;

  @media (max-width: 768px) {
    gap: 0.5rem;
    font-size: 0.75rem;
  }
`;

const FooterLink = styled(Link)`
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    color: ${theme.colors.accent.primary};
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
`;

const ExternalFooterLink = styled.a`
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s;
  
  &:hover {
    color: ${theme.colors.accent.primary};
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
`;

const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const TagLink = styled(Link)`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }
`;

const CopyrightSection = styled.div`
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
`;

const SeoText = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  opacity: 0.01; 
  height: 1px;
  overflow: hidden;
  pointer-events: none;
  text-align: center;
`;

export const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/characters/available-tags`);
        if (response.ok) {
          const data = await response.json();
          // Deduplicate
          const uniqueTags = new Map();
          if (Array.isArray(data)) {
            data.forEach((tag: any) => {
              const tagObj = typeof tag === 'string' ? { name: tag, slug: tag } : tag;
              if (!uniqueTags.has(tagObj.name)) {
                uniqueTags.set(tagObj.name, tagObj);
              }
            });
            setTags(Array.from(uniqueTags.values()));
          }
        }
      } catch (error) {
        console.error('Error fetching tags for footer:', error);
      }
    };
    fetchTags();
  }, []);

  const currentYear = new Date().getFullYear();
  const isRu = i18n.language === 'ru';

  const getLangPath = (path: string) => {
    return isRu ? `/ru${path}` : path;
  };

  const seoDescription = isRu
    ? "CandyGirlsChat — лучший ИИ чат 18+ на русском. Ролевой чат без цензуры, бесплатно и без регистрации. ИИ собеседники с фото и уникальными характерами."
    : "CandyGirlsChat — the leading AI roleplay chat for NSFW experiences. No-filter AI characters, free and no registration required. Virtual companions with photos and deep personalities.";

  return (
    <FooterContainer>
      <FooterContent>
        <TopSection>
          <FooterLink to={getLangPath("/how-it-works")}>{t('footer.howItWorks', 'How it works')}</FooterLink>
          <span>|</span>
          <FooterLink to={getLangPath("/about")}>{t('footer.about', 'About us')}</FooterLink>
          <span>|</span>
          <FooterLink to={getLangPath("/legal")}>{t('footer.legal', 'Legal')}</FooterLink>
          <span>|</span>
          <FooterLink to={getLangPath("/terms")}>{t('footer.terms', 'Terms of Service')}</FooterLink>
          <span>|</span>
          <FooterLink to={getLangPath("/privacy")}>{t('footer.privacy', 'Privacy Policy')}</FooterLink>
        </TopSection>

        {tags.length > 0 && (
          <TagsSection>
            {tags.slice(0, 30).map((tag) => (
              <TagLink key={tag.slug || tag.name} to={getLangPath(`/tags/${tag.slug || tag.name}`)}>
                #{isRu ? (tag.name_ru || tag.name) : (tag.name_en || tag.name)}
              </TagLink>
            ))}
          </TagsSection>
        )}

        <CopyrightSection>
          CandyGirlsChat © {currentYear}. {t('footer.rights', 'All rights reserved.')}
        </CopyrightSection>
      </FooterContent>

      <SeoText>
        <h1>CandyGirlsChat</h1>
        <p>{seoDescription}</p>
      </SeoText>
    </FooterContainer>
  );
};

