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
  Text,
  Subsection,
  SubsectionTitle,
  RecursiveContent
} from './LegalStyles';

export const LegalPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <Container>
        <Content>
          <Title>{t('legal.title')}</Title>

          {/* Offer Section */}
          <Section>
            <SectionTitle>{t('legal.offer.title')}</SectionTitle>
            <Text>{t('legal.offer.intro')}</Text>
            {['1', '2', '3', '4', '5'].map(key => (
              <Text key={key}>
                <strong>{t(`legal.offer.items.${key}.title`)}</strong><br />
                <span dangerouslySetInnerHTML={{ __html: t(`legal.offer.items.${key}.text`) }} />
              </Text>
            ))}
          </Section>

          {/* Privacy Section (dynamic) */}
          <Section>
            <RecursiveContent data={t('common:legal.privacy', { returnObjects: true })} isTopLevel={true} />
          </Section>

          {/* Terms Section (dynamic) */}
          <Section>
            <RecursiveContent data={t('common:legal.terms', { returnObjects: true })} isTopLevel={true} />
          </Section>

          {/* Contacts Section */}
          <Section>
            <SectionTitle>{t('legal.contacts.title')}</SectionTitle>
            <Subsection>
              <SubsectionTitle>{t('legal.contacts.sub1.title')}</SubsectionTitle>
              <Text>
                <strong>{t('legal.contacts.sub1.fio')}</strong> {t('legal.contacts.sub1.title')}<br />
                <strong>{t('legal.contacts.sub1.inn')}</strong> 772426525886<br />
                <strong>{t('legal.contacts.sub1.ogrnip')}</strong> {t('legal.contacts.sub1.ogrnipVal')}
              </Text>
            </Subsection>
            <Subsection>
              <SubsectionTitle>{t('legal.contacts.sub2.title')}</SubsectionTitle>
              <Text>
                <strong>{t('legal.contacts.sub2.email')}</strong> Vasilexretsu@proton.me<br />
                <strong>{t('legal.contacts.sub2.emailSupport')}</strong> pixotujepayo06@gmail.com<br />
                <strong>{t('legal.contacts.sub2.phone')}</strong> +7 995 232-72-19<br />
                <strong>{t('legal.contacts.sub2.hours')}</strong> {t('legal.contacts.sub2.hoursVal')}
              </Text>
            </Subsection>
            <Subsection>
              <SubsectionTitle>{t('legal.contacts.sub3.title')}</SubsectionTitle>
              <Text>
                <span dangerouslySetInnerHTML={{ __html: t('legal.contacts.sub3.text') }} />
              </Text>
            </Subsection>
          </Section>

          {/* Final Section */}
          <Section>
            <SectionTitle>{t('legal.final.title')}</SectionTitle>
            {['1', '2'].map(key => (
              <Text key={key}>
                <strong>{t(`legal.final.items.${key}.title`)}</strong><br />
                <span dangerouslySetInnerHTML={{ __html: t(`legal.final.items.${key}.text`) }} />
              </Text>
            ))}
            <Text>
              <strong>{t(`legal.final.items.3.title`)}</strong><br />
              <span dangerouslySetInnerHTML={{ __html: t(`legal.final.items.3.text`) }} /> {new Date().toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </Section>
        </Content>
      </Container>
      <Footer />
    </MainContainer>
  );
};
