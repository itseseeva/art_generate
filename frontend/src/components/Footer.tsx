import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const FooterContainer = styled.footer`
  background: rgba(15, 15, 20, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  margin-top: auto;
  width: 100%;
  overflow: hidden;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  scrollbar-width: none;
  -ms-overflow-style: none;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  color: #888888;
  font-size: 0.7rem;
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const FooterTitle = styled.span`
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 600;
  margin-right: 0.25rem;
`;

const FooterText = styled.span`
  color: #888888;
  font-size: 0.7rem;
`;

const FooterSeparator = styled.span`
  color: #555;
  margin: 0 0.25rem;
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
          <FooterLink href="/tariffs">Тарифы</FooterLink>
          <FooterSeparator>|</FooterSeparator>
          <FooterLink href="/legal">Оферта / Реквизиты</FooterLink>
        </FooterColumn>
        <FooterSeparator>|</FooterSeparator>
        <FooterText>ИП Крецу Василе, ИНН: 772426525886</FooterText>
      </FooterContent>
    </FooterContainer>
  );
};

