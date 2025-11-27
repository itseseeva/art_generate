import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const FooterContainer = styled.footer`
  background: rgba(15, 15, 20, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  margin-top: auto;
  width: 100%;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2rem;
  color: #888888;
  font-size: 0.9rem;
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FooterTitle = styled.h4`
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
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
          <FooterTitle>Реквизиты</FooterTitle>
          <div>ИП Крецу Василе</div>
          <div>ИНН: 772426525886</div>
        </FooterColumn>
        
        <FooterColumn>
          <FooterTitle>Контакты</FooterTitle>
          <div>Email: Vasilexretsu@proton.me</div>
          <div>Тел: +7 995 232-72-19</div>
        </FooterColumn>
        
        <FooterColumn>
          <FooterTitle>Информация</FooterTitle>
          <FooterLink href="/legal">Оферта и Политика конфиденциальности</FooterLink>
          <FooterLink href="/tariffs">Тарифы</FooterLink>
          <FooterLink href="/about">О сервисе</FooterLink>
        </FooterColumn>
      </FooterContent>
    </FooterContainer>
  );
};

