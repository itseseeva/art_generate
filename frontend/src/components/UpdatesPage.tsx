import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { useIsMobile } from '../hooks/useIsMobile';
import { Footer } from './Footer';
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
  padding: 4rem 2rem;
  max-width: 900px;
  margin: 0 auto;
  color: ${theme.colors.text.primary};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
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

const PatchVersion = styled.div`
  text-align: center;
  margin: 2rem 0 3rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  display: inline-block;
  margin-left: 50%;
  transform: translateX(-50%);
  
  span {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Content = styled.div`
  font-size: 1.15rem;
  line-height: 1.9;
  color: #d1d1d1;
  margin-top: 2rem;
`;

const UpdateSection = styled.div`
  margin-bottom: 2.5rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.02);
  border-left: 4px solid rgba(139, 92, 246, 0.4);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-left-color: rgba(139, 92, 246, 0.7);
    transform: translateX(5px);
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.1);
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
`;

const UpdateList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const UpdateItem = styled.li`
  margin-bottom: 1.25rem;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  position: relative;
  padding-left: 2.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.3);
    transform: translateX(5px);
  }
  
  &::before {
    content: '•';
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.2rem;
    color: #8b5cf6;
  }
  
  strong {
    color: #a78bfa;
    font-weight: 600;
  }
`;

const HighlightBox = styled.div`
  margin-top: 3rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);
  border: 2px solid rgba(139, 92, 246, 0.3);
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
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.6), transparent);
  }
  
  p {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #e0e0e0;
    margin: 0;
  }
`;

export const UpdatesPage: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <MainContainer>
      <BackgroundWrapper>
        <DarkVeil speed={1.1} />
      </BackgroundWrapper>
      <Container>
        <ContentWrapper>
          <Title>Обновления</Title>
          <PatchVersion>
            <span>Патч 0.01</span>
          </PatchVersion>
          <Content>
            <UpdateSection>
              <SectionTitle>Улучшения интерфейса</SectionTitle>
              <UpdateList>
                <UpdateItem>
                  <strong>Страницы создания и редактирования персонажей</strong> — полностью переработан дизайн для более удобной и интуитивной работы
                </UpdateItem>
                <UpdateItem>
                  <strong>Анимированный выбор моделей</strong> — добавлен красивый выбор моделей генерации с превью-изображениями при наведении курсора
                </UpdateItem>
                <UpdateItem>
                  <strong>Страница редактирования</strong> — улучшен интерфейс, обновлён выбор моделей с визуальными подсказками
                </UpdateItem>
                <UpdateItem>
                  <strong>Создание платного альбома</strong> — изменён дизайн страницы, добавлен улучшенный выбор моделей с предпросмотром
                </UpdateItem>
                <UpdateItem>
                  <strong>Выбор моделей в чате</strong> — обновлён интерфейс выбора моделей для более комфортного использования
                </UpdateItem>
              </UpdateList>
            </UpdateSection>

            <HighlightBox>
              <p>
                Мы продолжаем улучшать ваш опыт использования платформы. 
                Все изменения направлены на то, чтобы сделать работу с персонажами и генерацией изображений более удобной, 
                быстрой и приятной. Спасибо, что остаётесь с нами!
              </p>
            </HighlightBox>
          </Content>
        </ContentWrapper>
      </Container>
      <Footer />
    </MainContainer>
  );
};
