import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { Footer } from './Footer';

const Container = styled.div`
  padding: 4rem 2rem 2rem 2rem;
  max-width: 1000px;
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
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  margin-bottom: 3rem;
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
    width: 200px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
    border-radius: 2px;
  }
`;

const HowItWorksSection = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%);
  padding: 3rem;
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: center;
  gap: 4rem;
  margin-bottom: 3rem;
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
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
  }
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: ${theme.colors.text.secondary};
  text-align: center;
  max-width: 250px;
  flex: 1;
`;

const StepNumber = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
`;

const StepTitle = styled.h3`
  color: ${theme.colors.text.primary};
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #ffffff 0%, #d1d5db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const StepDescription = styled.p`
  margin: 0;
  font-size: 1rem;
  color: #d1d1d1;
  line-height: 1.6;
`;

const DetailedSection = styled.div`
  background: rgba(139, 92, 246, 0.05);
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  margin-top: 2rem;
`;

const DetailedTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: ${theme.colors.text.primary};
  font-weight: 600;
`;

const DetailedText = styled.p`
  font-size: 1.1rem;
  color: #d1d1d1;
  line-height: 1.8;
  margin-bottom: 1.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  
  li {
    padding: 0.75rem 0;
    padding-left: 2rem;
    position: relative;
    color: #d1d1d1;
    font-size: 1.1rem;
    line-height: 1.6;
    
    &::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #8b5cf6;
      font-weight: bold;
      font-size: 1.2rem;
    }
  }
`;

export const HowItWorksPage: React.FC = () => {
  return (
    <Container>
      <Content>
        <Title>Как это работает</Title>
        
        <HowItWorksSection>
          <Step>
            <StepNumber>1</StepNumber>
            <StepTitle>Создайте персонажа</StepTitle>
            <StepDescription>Опишите внешность, характер и личность вашего персонажа. Пропишите его уникальные черты и особенности</StepDescription>
          </Step>
          <Step>
            <StepNumber>2</StepNumber>
            <StepTitle>Общайтесь</StepTitle>
            <StepDescription>Ведите диалог с персонажем. ИИ будет отвечать в соответствии с заданным характером и личностью</StepDescription>
          </Step>
          <Step>
            <StepNumber>3</StepNumber>
            <StepTitle>Генерируйте фото</StepTitle>
            <StepDescription>Создавайте фотореалистичные изображения вашего персонажа в любых позах и ситуациях. ИИ использует описанную внешность</StepDescription>
          </Step>
        </HowItWorksSection>
        
        <DetailedSection>
          <DetailedTitle>Создание уникального персонажа</DetailedTitle>
          <DetailedText>
            Вы сами создаете своего персонажа с нуля. Опишите каждую деталь: цвет волос и глаз, черты лица, 
            телосложение, стиль одежды. Определите характер: будет ли он застенчивым или уверенным, 
            романтичным или игривым, серьезным или веселым.
          </DetailedText>
          
          <FeatureList>
            <li>Детальное описание внешности: волосы, глаза, фигура, особенности</li>
            <li>Характер и личность: темперамент, манера общения, привычки</li>
            <li>Предпочтения и интересы: хобби, любимые места, стиль жизни</li>
            <li>Уникальные черты: татуировки, пирсинг, родинки, шрамы</li>
          </FeatureList>
          
          <DetailedTitle>Интерактивное общение</DetailedTitle>
          <DetailedText>
            После создания персонажа вы можете общаться с ним в режиме реального времени. 
            ИИ анализирует заданный вами характер и отвечает соответствующим образом, создавая 
            естественный и живой диалог.
          </DetailedText>
          
          <DetailedTitle>Генерация фотореалистичных изображений</DetailedTitle>
          <DetailedText>
            На основе описанной внешности ИИ генерирует фотореалистичные изображения вашего персонажа. 
            Вы можете запросить любую позу, локацию или ситуацию. Технология использует мощные 
            нейросети для создания детализированных и реалистичных изображений с идеальными лицами и глазами.
          </DetailedText>
        </DetailedSection>
      </Content>
      <Footer />
    </Container>
  );
};

