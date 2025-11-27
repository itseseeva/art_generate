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

export const HowItWorksPage: React.FC = () => {
  return (
    <Container>
      <Content>
        <Title>Как это работает</Title>
        
        <HowItWorksSection>
          <Step>
            <StepNumber>1</StepNumber>
            <StepTitle>Заливаете запрос</StepTitle>
            <StepDescription>Опишите желаемое изображение или выберите персонажа для общения</StepDescription>
          </Step>
          <Step>
            <StepNumber>2</StepNumber>
            <StepTitle>ИИ генерирует</StepTitle>
            <StepDescription>Генерируйте изображение по вашему описанию или общайтесь с виртуальным персонажем</StepDescription>
          </Step>
          <Step>
            <StepNumber>3</StepNumber>
            <StepTitle>Получаете результат</StepTitle>
            <StepDescription>Готовый арт в высоком качестве или результат общения с персонажем</StepDescription>
          </Step>
        </HowItWorksSection>
      </Content>
      <Footer />
    </Container>
  );
};

