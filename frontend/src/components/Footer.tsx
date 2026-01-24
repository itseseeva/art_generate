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
          <FooterSeparator>|</FooterSeparator>
          <FooterLink href="/terms-of-service.html" target="_blank">Пользовательское соглашение</FooterLink>
          <FooterSeparator>|</FooterSeparator>
          <FooterLink href="/privacy-policy.html" target="_blank">Политика конфиденциальности</FooterLink>
        </FooterColumn>
        <FooterSeparator>|</FooterSeparator>
        <FooterText>Крецу Василе, ИНН: 772426525886</FooterText>
      </FooterContent>
    </FooterContainer>
  );
};

