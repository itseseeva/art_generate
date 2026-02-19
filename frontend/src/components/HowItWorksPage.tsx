import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { theme } from '../theme';
import { Footer } from './Footer';
import { useIsMobile } from '../hooks/useIsMobile';
import DarkVeil from '../../@/components/DarkVeil';

const MainContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 0;
  overflow-y: visible;
  position: relative;
  font-family: 'Inter', sans-serif;
  color: white;
`;

const BackgroundWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

const Container = styled.div`
  padding: 4rem 2rem 2rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
  color: ${theme.colors.text.primary};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
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
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <Container>
        <Content>
          <Title>{t('howItWorks.title')}</Title>

          <HowItWorksSection>
            <Step>
              <StepNumber>1</StepNumber>
              <StepTitle>{t('howItWorks.step1.title')}</StepTitle>
              <StepDescription>{t('howItWorks.step1.description')}</StepDescription>
            </Step>
            <Step>
              <StepNumber>2</StepNumber>
              <StepTitle>{t('howItWorks.step2.title')}</StepTitle>
              <StepDescription>{t('howItWorks.step2.description')}</StepDescription>
            </Step>
            <Step>
              <StepNumber>3</StepNumber>
              <StepTitle>{t('howItWorks.step3.title')}</StepTitle>
              <StepDescription>{t('howItWorks.step3.description')}</StepDescription>
            </Step>
          </HowItWorksSection>

          <DetailedSection>
            <DetailedTitle>{t('howItWorks.uniqueChar.title')}</DetailedTitle>
            <DetailedText>
              {t('howItWorks.uniqueChar.text')}
            </DetailedText>

            <FeatureList>
              <li>{t('howItWorks.uniqueChar.list.1')}</li>
              <li>{t('howItWorks.uniqueChar.list.2')}</li>
              <li>{t('howItWorks.uniqueChar.list.3')}</li>
              <li>{t('howItWorks.uniqueChar.list.4')}</li>
            </FeatureList>

            <DetailedTitle>{t('howItWorks.interactive.title')}</DetailedTitle>
            <DetailedText>
              {t('howItWorks.interactive.text')}
            </DetailedText>

            <DetailedTitle>{t('howItWorks.photoGen.title')}</DetailedTitle>
            <DetailedText>
              {t('howItWorks.photoGen.text')}
            </DetailedText>
          </DetailedSection>
        </Content>
      </Container>
      <Footer />
    </MainContainer>
  );
};

