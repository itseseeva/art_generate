import React from 'react';
import styled from 'styled-components';
import { useTranslation, Trans } from 'react-i18next';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  animation: fadeIn 0.3s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(145deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.9) 100%);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(100, 100, 100, 0.3);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
  animation: slideIn 0.3s ease-out;

  @media (max-width: 768px) {
    padding: ${theme.spacing.lg};
    width: 95%;
  }
  
  @keyframes slideIn {
    from {
      transform: translateY(-20px) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  /* Стили для скроллбара */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(20, 20, 20, 0.3);
    border-radius: ${theme.borderRadius.md};
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.6);
    border-radius: ${theme.borderRadius.md};
    
    &:hover {
      background: rgba(100, 100, 100, 0.8);
    }
  }
`;

const Title = styled.h2`
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.lg} 0;
  letter-spacing: -0.5px;
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing.xl};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  color: rgba(240, 240, 240, 1);
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
`;

const Text = styled.p`
  color: rgba(180, 180, 180, 1);
  font-size: ${theme.fontSize.base};
  margin: 0 0 ${theme.spacing.md} 0;
  line-height: 1.6;
`;

const Highlight = styled.span`
  color: rgba(255, 255, 255, 1);
  font-weight: 600;
`;

const CodeBlock = styled.pre`
  background: rgba(15, 15, 20, 0.8);
  border: 1px solid rgba(60, 60, 60, 0.5);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  color: rgba(220, 220, 220, 1);
  font-family: 'Courier New', monospace;
  font-size: ${theme.fontSize.sm};
  overflow-x: auto;
  margin: ${theme.spacing.md} 0;
  line-height: 1.5;
`;

const List = styled.ul`
  color: rgba(180, 180, 180, 1);
  font-size: ${theme.fontSize.base};
  margin: ${theme.spacing.md} 0;
  padding-left: ${theme.spacing.xl};
  line-height: 1.8;
`;

const ListItem = styled.li`
  margin-bottom: ${theme.spacing.sm};
`;

const ExampleBox = styled.div`
  background: rgba(25, 35, 50, 0.6);
  border-left: 3px solid rgba(102, 126, 234, 0.8);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
`;

const ExampleLabel = styled.div`
  color: rgba(102, 126, 234, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExampleText = styled.div`
  color: rgba(220, 220, 220, 1);
  font-size: ${theme.fontSize.sm};
  font-family: 'Courier New', monospace;
  line-height: 1.6;
`;

const CloseButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(80, 100, 200, 0.9) 100%);
  border: none;
  border-radius: ${theme.borderRadius.lg};
  color: rgba(255, 255, 255, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: ${theme.spacing.xl};
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, rgba(102, 126, 234, 1) 0%, rgba(80, 100, 200, 1) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }
`;

interface PhotoGenerationHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhotoGenerationHelpModal: React.FC<PhotoGenerationHelpModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>📸 {t('photoGenHelp.title')}</Title>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.intro.title')}</SectionTitle>
          <Text>
            {t('photoGenHelp.sections.intro.text')}
          </Text>
          <Text>
            <Highlight>{t('photoGenHelp.sections.intro.highlight1')}</Highlight> {t('photoGenHelp.sections.intro.text2')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.steps.title')}</SectionTitle>
          <List>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step1')}</Highlight> {t('photoGenHelp.sections.steps.step1Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step2')}</Highlight> {t('photoGenHelp.sections.steps.step2Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step3')}</Highlight> {t('photoGenHelp.sections.steps.step3Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step4')}</Highlight> {t('photoGenHelp.sections.steps.step4Text')} <Highlight>{t('photoGenHelp.sections.steps.styles.animeRealism')}</Highlight>, <Highlight>{t('photoGenHelp.sections.steps.styles.anime')}</Highlight> {t('common.or')} <Highlight>{t('photoGenHelp.sections.steps.styles.realism')}</Highlight>
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step5')}</Highlight> {t('photoGenHelp.sections.steps.step5Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step6')}</Highlight> {t('photoGenHelp.sections.steps.step6Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.step7')}</Highlight> {t('photoGenHelp.sections.steps.step7Text')}
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.styles.title')}</SectionTitle>
          <Text>
            {t('photoGenHelp.sections.styles.intro')}
          </Text>
          <List>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.styles.anime')}</Highlight> — {t('photoGenHelp.sections.styles.anime').split(' — ')[1]}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.styles.animeRealism')}</Highlight> — {t('photoGenHelp.sections.styles.animeRealism').split(' — ')[1]}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.steps.styles.realism')}</Highlight> — {t('photoGenHelp.sections.styles.realism').split(' — ')[1]}
            </ListItem>
          </List>
          <Text>
            <Highlight>{t('photoGenHelp.sections.styles.tip')}</Highlight> {t('photoGenHelp.sections.styles.tipText')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.whatIsPrompt.title')}</SectionTitle>
          <Text>
            <Highlight>{t('photoGenHelp.sections.whatIsPrompt.highlight1')}</Highlight>{t('photoGenHelp.sections.whatIsPrompt.text1')}
          </Text>
          <Text>
            <Highlight>{t('photoGenHelp.sections.whatIsPrompt.highlight2')}</Highlight> {t('photoGenHelp.sections.whatIsPrompt.text2')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.structure.title')}</SectionTitle>
          <Text>
            {t('photoGenHelp.sections.structure.intro')}
          </Text>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.structure.label')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.structure.item1')}<br />
              {t('photoGenHelp.sections.structure.item2')}<br />
              {t('photoGenHelp.sections.structure.item3')}<br />
              {t('photoGenHelp.sections.structure.item4')}<br />
              {t('photoGenHelp.sections.structure.item5')}<br />
              {t('photoGenHelp.sections.structure.item6')}
            </ExampleText>
          </ExampleBox>
          <Text>
            <Highlight>{t('photoGenHelp.sections.structure.rule')}</Highlight> {t('photoGenHelp.sections.structure.ruleText')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.examples.title')}</SectionTitle>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.examples.ex1Label')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.examples.ex1Text')}
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.examples.ex2Label')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.examples.ex2Text')}
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.examples.ex3Label')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.examples.ex3Text')}
            </ExampleText>
          </ExampleBox>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.badExamples.title')}</SectionTitle>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.badExamples.label1')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.badExamples.text1')}
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.badExamples.label2')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.badExamples.text2')}
            </ExampleText>
          </ExampleBox>
          <Text>
            <Highlight>{t('photoGenHelp.sections.badExamples.problem')}</Highlight> {t('photoGenHelp.sections.badExamples.problemText')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.brackets.title')}</SectionTitle>
          <Text>
            {t('photoGenHelp.sections.brackets.text1')}
          </Text>
          <CodeBlock>(синие глаза:1.3)</CodeBlock>
          <Text>
            {t('photoGenHelp.sections.brackets.text2')}
          </Text>
          <List>
            <ListItem><Highlight>1.2</Highlight>{t('photoGenHelp.sections.brackets.weak')}</ListItem>
            <ListItem><Highlight>1.3</Highlight>{t('photoGenHelp.sections.brackets.medium')}</ListItem>
            <ListItem><Highlight>1.5</Highlight>{t('photoGenHelp.sections.brackets.strong')}</ListItem>
            <ListItem><Highlight>2.0</Highlight>{t('photoGenHelp.sections.brackets.veryStrong')}</ListItem>
          </List>
          <ExampleBox>
            <ExampleLabel>{t('photoGenHelp.sections.brackets.exLabel')}</ExampleLabel>
            <ExampleText>
              {t('photoGenHelp.sections.brackets.exText')}
            </ExampleText>
          </ExampleBox>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.boosters.title')}</SectionTitle>
          <Text>
            {t('photoGenHelp.sections.boosters.text1')}
          </Text>
          <List>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item1')}</Highlight>{t('photoGenHelp.sections.boosters.item1Desc')}</ListItem>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item2')}</Highlight>{t('photoGenHelp.sections.boosters.item2Desc')}</ListItem>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item3')}</Highlight>{t('photoGenHelp.sections.boosters.item3Desc')}</ListItem>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item4')}</Highlight>{t('photoGenHelp.sections.boosters.item4Desc')}</ListItem>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item5')}</Highlight>{t('photoGenHelp.sections.boosters.item5Desc')}</ListItem>
            <ListItem><Highlight>{t('photoGenHelp.sections.boosters.item6')}</Highlight>{t('photoGenHelp.sections.boosters.item6Desc')}</ListItem>
          </List>
          <Text>
            <Highlight>{t('photoGenHelp.sections.boosters.important')}</Highlight> {t('photoGenHelp.sections.boosters.importantText')}
          </Text>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.retry.title')}</SectionTitle>
          <List>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.retry.v1')}</Highlight> {t('photoGenHelp.sections.retry.v1Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.retry.v2')}</Highlight> {t('photoGenHelp.sections.retry.v2Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.retry.v3')}</Highlight> {t('photoGenHelp.sections.retry.v3Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.retry.v4')}</Highlight> {t('photoGenHelp.sections.retry.v4Text')}
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.tips.title')}</SectionTitle>
          <List>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.tips.tip1')}</Highlight> {t('photoGenHelp.sections.tips.tip1Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.tips.tip2')}</Highlight> {t('photoGenHelp.sections.tips.tip2Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.tips.tip3')}</Highlight> {t('photoGenHelp.sections.tips.tip3Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.tips.tip4')}</Highlight> {t('photoGenHelp.sections.tips.tip4Text')}
            </ListItem>
            <ListItem>
              <Highlight>{t('photoGenHelp.sections.tips.tip5')}</Highlight> {t('photoGenHelp.sections.tips.tip5Text')}
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>{t('photoGenHelp.sections.summary.title')}</SectionTitle>
          <Text>
            <Highlight>{t('photoGenHelp.sections.summary.item1')}</Highlight>{t('photoGenHelp.sections.summary.item1Text')}<br />
            <Highlight>{t('photoGenHelp.sections.summary.item2')}</Highlight>{t('photoGenHelp.sections.summary.item2Text')}<br />
            <Highlight>{t('photoGenHelp.sections.summary.item3')}</Highlight>{t('photoGenHelp.sections.summary.item3Text')}<br />
            <Highlight>{t('photoGenHelp.sections.summary.item4')}</Highlight>{t('photoGenHelp.sections.summary.item4Text')}<br />
            <Highlight>{t('photoGenHelp.sections.summary.item5')}</Highlight>{t('photoGenHelp.sections.summary.item5Text')}
          </Text>
        </Section>

        <CloseButton onClick={onClose}>
          {t('photoGenHelp.close')}
        </CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};
