import React from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useIsMobile';
import { Footer } from './Footer';
import DarkVeil from '../../@/components/DarkVeil';
import {
  MainContainer,
  BackgroundWrapper,
  Container,
  Content,
  Title,
  Section,
  SectionTitle,
  Text
} from './LegalStyles';
import styled from 'styled-components';

const Paragraph = styled(Text)`
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
`;

const FeatureList = styled.ul`
    margin-top: 1rem;
    padding-left: 1.5rem;
    
    li {
      margin-bottom: 0.75rem;
      position: relative;
      list-style: none;
      color: #d1d1d1;
      
      &::before {
        content: '▸';
        position: absolute;
        left: -1.5rem;
        color: #8b5cf6;
        font-weight: bold;
      }
    }
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const ContactCard = styled.div`
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-5px);
  }
  
  strong {
    color: #a78bfa;
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  span {
    color: #ffffff;
    font-size: 1.1rem;
  }
`;

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <Container>
        <Content>
          <Title>{t('about.title')}</Title>

          <Paragraph>
            {t('about.intro')}
          </Paragraph>

          <Section>
            <SectionTitle>{t('about.mission.title')}</SectionTitle>
            <Text>{t('about.mission.text')}</Text>
            <Text>{t('about.description')}</Text>
          </Section>

          <Section>
            <SectionTitle>{t('about.technology.title')}</SectionTitle>
            <Text>{t('about.technology.text')}</Text>
          </Section>

          <Section>
            <SectionTitle>{t('about.keyFeatures.title')}</SectionTitle>
            <FeatureList>
              <li><span dangerouslySetInnerHTML={{ __html: t('about.keyFeatures.list.1') }} /></li>
              <li><span dangerouslySetInnerHTML={{ __html: t('about.keyFeatures.list.2') }} /></li>
              <li><span dangerouslySetInnerHTML={{ __html: t('about.keyFeatures.list.3') }} /></li>
              <li><span dangerouslySetInnerHTML={{ __html: t('about.keyFeatures.list.4') }} /></li>
            </FeatureList>
          </Section>

          <Paragraph style={{ fontStyle: 'italic', opacity: 0.7 }}>
            {t('about.access')}
          </Paragraph>

          <Section>
            <SectionTitle>{t('about.contacts.title')}</SectionTitle>
            <ContactGrid>
              <ContactCard>
                <strong>{t('about.contacts.inn')}</strong>
                <span>772426525886</span>
              </ContactCard>
              <ContactCard>
                <strong>{t('about.contacts.email')}</strong>
                <span>Vasilexretsu@proton.me</span>
              </ContactCard>
              <ContactCard>
                <strong>{t('about.contacts.phone')}</strong>
                <span>+7 995 232-72-19</span>
              </ContactCard>
            </ContactGrid>
          </Section>
        </Content>
      </Container>
      <Footer />
    </MainContainer>
  );
};
