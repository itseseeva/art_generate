import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const FooterContainer = styled.footer`
  background: rgba(15, 15, 20, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.35rem 1rem;
  width: 100%;
  overflow: hidden;
  padding-bottom: 0.35rem;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  scrollbar-width: none;
  -ms-overflow-style: none;

  @media (max-width: 768px) {
    padding: 0.2rem 0.5rem;
    padding-bottom: 0.2rem;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.6rem;
  color: #888888;
  font-size: 0.6rem;

  @media (max-width: 768px) {
    gap: 0.4rem;
    font-size: 0.55rem;
  }
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.3rem;
    justify-content: center;
  }
`;

const FooterTitle = styled.span`
  color: #ffffff;
  font-size: 0.6rem;
  font-weight: 600;
  margin-right: 0.2rem;
`;

const FooterText = styled.span`
  color: #888888;
  font-size: 0.6rem;
`;

const FooterSeparator = styled.span`
  color: #555;
  margin: 0 0.2rem;
  font-size: 0.6rem;
`;

const FooterLink = styled.a`
  color: #888888;
  text-decoration: none;
  transition: color 0.2s;
  
  &:hover {
    color: ${theme.colors.accent.primary};
  }
`;

const SocialLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.4rem;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.7;
  text-decoration: none;
  color: #888888;
  
  &:hover {
    transform: scale(1.05);
    opacity: 1;
    color: ${theme.colors.accent.primary};
  }
`;

const SocialIcon = styled.img`
  width: 20px;
  height: 20px;
  object-fit: contain;
`;

const SocialText = styled.span`
  font-size: 0.6rem;
  color: inherit;
`;

export const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterColumn>
          <FooterLink href="/how-it-works">Как это работает</FooterLink>
          <FooterSeparator>|</FooterSeparator>
          <FooterLink href="/about">О сервисе</FooterLink>
          <FooterSeparator>|</FooterSeparator>
          <FooterLink href="/legal">Оферта / Реквизиты</FooterLink>
        </FooterColumn>
        <FooterSeparator>|</FooterSeparator>
        <FooterText>ИП Крецу Василе, ИНН: 772426525886</FooterText>
        <SocialLinks>
          <SocialLink 
            href="https://t.me/CherryLustClub" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Telegram"
          >
            <SocialIcon src="/tg.png" alt="Telegram" />
            <SocialText>Telegram</SocialText>
          </SocialLink>
          <SocialLink 
            href="https://x.com/CherrylustAI" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
          >
            <SocialIcon src="/twitter_x_new_logo_square_x_icon_256075.webp" alt="X (Twitter)" />
            <SocialText>X (Twitter)</SocialText>
          </SocialLink>
        </SocialLinks>
      </FooterContent>
    </FooterContainer>
  );
};

