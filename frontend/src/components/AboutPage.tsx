import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

import { Footer } from './Footer';

const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 900px;
  margin: 0 auto;
  color: ${theme.colors.text.primary};
  background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
  }
`;

const ContentWrapper = styled.div`
  flex: 1;
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    border-radius: 2px;
  }
`;

const Content = styled.div`
  font-size: 1.15rem;
  line-height: 1.9;
  color: #d1d1d1;
  margin-top: 3rem;
`;

const Paragraph = styled.p`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-left-color: rgba(139, 92, 246, 0.6);
    transform: translateX(5px);
  }
  
  strong {
    color: #ffffff;
    font-weight: 600;
  }
  
  ul {
    margin-top: 1rem;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.75rem;
      position: relative;
      
      &::marker {
        color: #8b5cf6;
      }
      
      &::before {
        content: '▸';
        position: absolute;
        left: -1.5rem;
        color: #8b5cf6;
        font-weight: bold;
      }
    }
  }
`;

const ContactSection = styled.div`
  margin-top: 4rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
  }
`;

const ContactTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
`;

const ContactItem = styled.div`
  margin-bottom: 1.25rem;
  font-size: 1.1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
    transform: translateX(5px);
  }
  
  strong {
    color: #a78bfa;
    margin-right: 0.5rem;
    font-weight: 600;
  }
`;

export const AboutPage: React.FC = () => {
  return (
    <Container>
      <ContentWrapper>
        <Title>О сервисе</Title>
        <Content>
          <Paragraph>
            Наш сервис представляет собой современную платформу для генерации уникальных изображений с использованием передовых технологий искусственного интеллекта.
          </Paragraph>
          <Paragraph>
            Мы предоставляем инструменты, которые позволяют пользователям создавать высококачественные арты, иллюстрации и концепты за считанные секунды. Наш сервис идеально подходит как для профессиональных художников и дизайнеров, ищущих вдохновение, так и для энтузиастов, желающих воплотить свои идеи в жизнь.
          </Paragraph>
          <Paragraph>
            <strong>Ключевые возможности:</strong>
            <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>Генерация изображений по текстовому описанию</li>
              <li>Выбор стилей и параметров генерации</li>
              <li>Интерактивный чат с виртуальными персонажами</li>
              <li>Сохранение истории и галерея работ</li>
            </ul>
          </Paragraph>
          <Paragraph style={{ marginTop: '2rem', fontStyle: 'italic', color: '#888888' }}>
            Доступ к сервису предоставляется автоматически после успешной оплаты выбранного тарифа.
          </Paragraph>
        </Content>

        <ContactSection>
          <ContactTitle>Контакты</ContactTitle>
          <ContactItem>
            <strong>Индивидуальный предприниматель:</strong> Крецу Василе
          </ContactItem>
          <ContactItem>
            <strong>ИНН:</strong> 772426525886
          </ContactItem>
          <ContactItem>
            <strong>Email:</strong> Vasilexretsu@proton.me
          </ContactItem>
          <ContactItem>
            <strong>Телефон:</strong> +7 995 232-72-19
          </ContactItem>
        </ContactSection>
      </ContentWrapper>
      <Footer />
    </Container>
  );
};

