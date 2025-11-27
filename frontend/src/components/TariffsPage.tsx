import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

import { Footer } from './Footer';

const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 1200px;
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

const Content = styled.div`
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
    width: 150px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    border-radius: 2px;
  }
`;

const Subtitle = styled.p`
  font-size: 1.3rem;
  color: #b8b8b8;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 4rem;
  font-weight: 300;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2.5rem;
  margin-bottom: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{ $highlight?: boolean }>`
  background: ${props => props.$highlight 
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)' 
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'};
  border: 2px solid ${props => props.$highlight 
    ? 'rgba(139, 92, 246, 0.4)' 
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$highlight 
    ? '0 20px 60px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
    : '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'};
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$highlight 
      ? 'linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6)' 
      : 'transparent'};
    opacity: ${props => props.$highlight ? 1 : 0};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: ${props => props.$highlight 
      ? 'rgba(139, 92, 246, 0.6)' 
      : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$highlight 
      ? '0 25px 70px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
      : '0 15px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'};
  }
  
  ${props => props.$highlight && `
    &::after {
      content: 'ПОПУЛЯРНЫЙ';
      position: absolute;
      top: 20px;
      right: -35px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      padding: 5px 40px;
      font-size: 0.75rem;
      font-weight: 700;
      transform: rotate(45deg);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
  `}
`;

const PlanName = styled.h3`
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
`;

const Price = styled.div`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  
  span {
    font-size: 1.1rem;
    color: #888888;
    font-weight: 400;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  flex: 1;
`;

const Feature = styled.li`
  margin-bottom: 1.25rem;
  color: #d1d1d1;
  display: flex;
  align-items: flex-start;
  font-size: 1.05rem;
  line-height: 1.5;
  
  &:before {
    content: '✓';
    color: #8b5cf6;
    margin-right: 0.75rem;
    font-weight: bold;
    font-size: 1.2rem;
    flex-shrink: 0;
    margin-top: 2px;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }
`;

const InfoBlock = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  padding: 2.5rem;
  border-radius: 20px;
  margin-top: 2rem;
  border: 1px solid rgba(139, 92, 246, 0.2);
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

const InfoTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
`;

const InfoText = styled.p`
  color: #d1d1d1;
  line-height: 1.8;
  font-size: 1.05rem;
`;

export const TariffsPage: React.FC = () => {
  return (
    <Container>
      <Content>
        <Title>Тарифные планы</Title>
        <Subtitle>Выберите подходящий план для ваших творческих задач. НДС не облагается.</Subtitle>

        <Grid>
          <Card>
            <PlanName>Базовый</PlanName>
            <Price>299₽ <span>/ месяц</span></Price>
            <FeatureList>
              <Feature>100 кредитов</Feature>
              <Feature>10 генераций фото</Feature>
              <Feature>Доступ к базовым персонажам</Feature>
              <Feature>Стандартная скорость генерации</Feature>
            </FeatureList>
          </Card>

          <Card $highlight>
            <PlanName>Премиум</PlanName>
            <Price>599₽ <span>/ месяц</span></Price>
            <FeatureList>
              <Feature>500 кредитов</Feature>
              <Feature>50 генераций фото</Feature>
              <Feature>Доступ ко всем персонажам</Feature>
              <Feature>Высокая скорость генерации</Feature>
              <Feature>Приоритетная поддержка</Feature>
            </FeatureList>
          </Card>

          <Card>
            <PlanName>VIP</PlanName>
            <Price>999₽ <span>/ месяц</span></Price>
            <FeatureList>
              <Feature>1000 кредитов</Feature>
              <Feature>100 генераций фото</Feature>
              <Feature>Эксклюзивные персонажи</Feature>
              <Feature>Максимальная скорость</Feature>
              <Feature>Персональный менеджер</Feature>
            </FeatureList>
          </Card>
        </Grid>

        <InfoBlock>
          <InfoTitle>Информация о доставке</InfoTitle>
          <InfoText>
            Доступ к услугам предоставляется автоматически в личном кабинете пользователя сразу после подтверждения оплаты.
            Никаких дополнительных действий не требуется. История ваших генераций и баланс обновляются мгновенно.
          </InfoText>
        </InfoBlock>
      </Content>
      <Footer />
    </Container>
  );
};

