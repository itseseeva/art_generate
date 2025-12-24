import React from 'react';
import styled from 'styled-components';
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
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>Как создать шедевр: Простая инструкция</Title>
        
        <Text>
          Нейросеть работает как художник с короткой памятью. Она запоминает только первые 40–50 слов вашего описания. Всё, что написано дальше, она скорее всего проигнорирует.
        </Text>

        <Section>
          <SectionTitle>1. Главное правило: Важное — вперёд!</SectionTitle>
          <Text>
            Нейросеть читает ваш запрос слева направо, поэтому самое важное должно быть в начале.
          </Text>
          <List>
            <ListItem>
              <Highlight>В НАЧАЛЕ (первые 10 слов):</Highlight> Обязательно укажите, <Highlight>КОГО</Highlight> вы рисуете и <Highlight>ГДЕ</Highlight> он находится.
            </ListItem>
            <ListItem>
              <Highlight>В КОНЦЕ (остальные слова):</Highlight> Добавьте описание освещения, деталей и качества изображения.
            </ListItem>
          </List>
          <Text>
            <strong>Правильная структура промпта:</strong> (Кто), Во что одет, Где находится, Фон, Освещение и Детали качества
          </Text>
        </Section>

        <Section>
          <SectionTitle>2. Секрет скобок (если нейросеть "не слышит")</SectionTitle>
          <Text>
            Если вы написали "синие глаза", а на картинке они получились карие — используйте усиление важности. Напишите нужное слово в круглых скобках с цифрой 1.3:
          </Text>
          <CodeBlock>(синие глаза:1.3)</CodeBlock>
          <Text>
            Нейросеть поймет: "Это очень важно, сделай обязательно!" Цифра 1.3 означает усиление на 30%.
          </Text>
          <Text>
            <strong>Примеры:</strong> (длинные волосы:1.3), (красное платье:1.5), (улыбка:1.2)
          </Text>
        </Section>

        <Section>
          <SectionTitle>3. Слова-улучшайзеры (обязательно пишите в конце)</SectionTitle>
          <Text>
            Чтобы картинка получилась сочной, объемной и профессиональной, всегда добавляйте эти слова в самый конец описания:
          </Text>
          <List>
            <ListItem><Highlight>киношный свет</Highlight> — как в фильмах</ListItem>
            <ListItem><Highlight>объемные световые лучи</Highlight> — создают глубину и атмосферу</ListItem>
            <ListItem><Highlight>красивые глубокие тени</Highlight> — добавляют объем и реалистичность</ListItem>
            <ListItem><Highlight>шедевр</Highlight> — высокое качество изображения</ListItem>
          </List>
          <Text>
            Эти слова можно писать на русском или английском — нейросеть их понимает и они улучшают качество изображения.
          </Text>
        </Section>

        <CloseButton onClick={onClose}>
          Понятно, спасибо!
        </CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};
