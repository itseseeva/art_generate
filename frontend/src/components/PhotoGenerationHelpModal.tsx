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
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <Title>📸 Полная инструкция по генерации фото</Title>
        
        <Section>
          <SectionTitle>🎯 Что это такое?</SectionTitle>
          <Text>
            Генерация изображений — это создание картинки по вашему текстовому описанию с помощью искусственного интеллекта. Вы пишете, что хотите увидеть, а нейросеть рисует это за вас.
          </Text>
        <Text>
            <Highlight>Простыми словами:</Highlight> Вы описываете картинку словами, нажимаете кнопку "Сгенерировать", и через 10-30 секунд получаете готовое изображение!
        </Text>
        </Section>

        <Section>
          <SectionTitle>🚀 Как сгенерировать фото в первый раз (пошагово)</SectionTitle>
          <List>
            <ListItem>
              <Highlight>Шаг 1:</Highlight> Напишите сообщение персонажу в чате (или оставьте пустым)
            </ListItem>
            <ListItem>
              <Highlight>Шаг 2:</Highlight> Нажмите кнопку с иконкой фото (📷) под полем ввода сообщения
            </ListItem>
            <ListItem>
              <Highlight>Шаг 3:</Highlight> В открывшемся окне вы увидите предзаполненный текст — это описание будущей картинки
            </ListItem>
            <ListItem>
              <Highlight>Шаг 4:</Highlight> Выберите стиль изображения: <Highlight>Сочетание аниме и реалистичных текстур</Highlight>, <Highlight>Классический аниме стиль</Highlight> или <Highlight>Максимальная фотореалистичность</Highlight>
            </ListItem>
            <ListItem>
              <Highlight>Шаг 5:</Highlight> При необходимости отредактируйте описание (можно писать на русском)
            </ListItem>
            <ListItem>
              <Highlight>Шаг 6:</Highlight> Нажмите "Сгенерировать" и подождите 10-15 секунд
            </ListItem>
            <ListItem>
              <Highlight>Шаг 7:</Highlight> Готово! Фото появится в чате
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>🎨 Выбор стиля изображения (модели)</SectionTitle>
          <Text>
            Перед генерацией вы можете выбрать один из трех стилей:
          </Text>
          <List>
          <ListItem>
            <Highlight>Классический аниме стиль</Highlight> — яркие цвета, большие глаза, стилизованная графика
          </ListItem>
          <ListItem>
            <Highlight>Сочетание аниме и реалистичных текстур</Highlight> — смесь аниме и реализма, более реалистичные пропорции, но сохраняет аниме-эстетику
          </ListItem>
          <ListItem>
            <Highlight>Максимальная фотореалистичность</Highlight> — максимально реалистичные изображения, как фотографии
          </ListItem>
          </List>
          <Text>
            <Highlight>Совет:</Highlight> Попробуйте все три стиля с одним и тем же описанием, чтобы увидеть разницу!
          </Text>
        </Section>

        <Section>
          <SectionTitle>✍️ Что такое промпт и как его писать?</SectionTitle>
          <Text>
            <Highlight>Промпт</Highlight> — это текстовое описание того, что вы хотите увидеть на картинке. Это как инструкция для художника, только вместо художника работает нейросеть.
          </Text>
          <Text>
            <Highlight>Важно:</Highlight> Нейросеть запоминает только первые 40-50 слов! Всё, что написано дальше, она может проигнорировать.
          </Text>
        </Section>

        <Section>
          <SectionTitle>📝 Правильная структура промпта</SectionTitle>
          <Text>
            Чтобы получить хороший результат, пишите описание в правильном порядке:
          </Text>
          <ExampleBox>
            <ExampleLabel>Правильный порядок:</ExampleLabel>
            <ExampleText>
              1. КТО (персонаж, человек, животное)<br/>
              2. ВО ЧТО ОДЕТ (одежда, костюм)<br/>
              3. ГДЕ НАХОДИТСЯ (место, локация)<br/>
              4. ФОН (что на заднем плане)<br/>
              5. ОСВЕЩЕНИЕ (свет, время суток)<br/>
              6. ДЕТАЛИ КАЧЕСТВА (в конце!)
            </ExampleText>
          </ExampleBox>
          <Text>
            <Highlight>Правило:</Highlight> Самое важное пишите в начале, детали качества — в конце!
          </Text>
        </Section>

        <Section>
          <SectionTitle>✅ Примеры хороших промптов</SectionTitle>
          <ExampleBox>
            <ExampleLabel>Пример 1 (простой):</ExampleLabel>
            <ExampleText>
              красивая девушка в красном платье стоит на пляже на закате, киношный свет, объемные световые лучи, красивые глубокие тени, шедевр
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>Пример 2 (детальный):</ExampleLabel>
            <ExampleText>
              молодой человек в черном костюме сидит в кафе, теплый свет из окна, городской фон, киношный свет, объемные световые лучи, красивые глубокие тени, шедевр
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>Пример 3 (с акцентом на детали):</ExampleLabel>
            <ExampleText>
              девушка с длинными волосами в белом платье в саду, цветы на фоне, солнечный свет, киношный свет, объемные световые лучи, красивые глубокие тени, шедевр
            </ExampleText>
          </ExampleBox>
        </Section>

        <Section>
          <SectionTitle>❌ Примеры плохих промптов (чего избегать)</SectionTitle>
          <ExampleBox>
            <ExampleLabel>Плохо (слишком коротко):</ExampleLabel>
            <ExampleText>
              девушка
            </ExampleText>
          </ExampleBox>
          <ExampleBox>
            <ExampleLabel>Плохо (слишком длинно, важное в конце):</ExampleLabel>
            <ExampleText>
              очень красивая картинка с хорошим качеством, профессиональная фотография, высокое разрешение, детализированная, девушка в платье
            </ExampleText>
          </ExampleBox>
          <Text>
            <Highlight>Проблема:</Highlight> В первом примере слишком мало информации, во втором — важное (девушка в платье) в конце, где нейросеть может его не заметить.
          </Text>
        </Section>

        <Section>
          <SectionTitle>🔧 Секрет скобок (если нейросеть "не слышит")</SectionTitle>
          <Text>
            Если вы написали "синие глаза", а на картинке они получились карие — используйте усиление важности. Напишите нужное слово в круглых скобках с цифрой:
          </Text>
          <CodeBlock>(синие глаза:1.3)</CodeBlock>
          <Text>
            Нейросеть поймет: "Это очень важно, сделай обязательно!" Цифра 1.3 означает усиление на 30%.
          </Text>
          <List>
            <ListItem><Highlight>1.2</Highlight> — слабое усиление (20%)</ListItem>
            <ListItem><Highlight>1.3</Highlight> — среднее усиление (30%) — рекомендуется</ListItem>
            <ListItem><Highlight>1.5</Highlight> — сильное усиление (50%) — используйте осторожно</ListItem>
            <ListItem><Highlight>2.0</Highlight> — очень сильное усиление (100%) — может исказить изображение</ListItem>
          </List>
          <ExampleBox>
            <ExampleLabel>Примеры использования:</ExampleLabel>
            <ExampleText>
              девушка с (длинные волосы:1.3) в (красное платье:1.5) стоит на пляже, киношный свет, шедевр
            </ExampleText>
          </ExampleBox>
        </Section>

        <Section>
          <SectionTitle>✨ Слова-улучшайзеры (обязательно добавляйте в конец!)</SectionTitle>
          <Text>
            Чтобы картинка получилась сочной, объемной и профессиональной, всегда добавляйте эти слова в самый конец описания:
          </Text>
          <List>
            <ListItem><Highlight>киношный свет</Highlight> — делает изображение похожим на кадр из фильма</ListItem>
            <ListItem><Highlight>объемные световые лучи</Highlight> — создают глубину и атмосферу</ListItem>
            <ListItem><Highlight>красивые глубокие тени</Highlight> — добавляют объем и реалистичность</ListItem>
            <ListItem><Highlight>шедевр</Highlight> — сигнализирует нейросети о высоком качестве</ListItem>
            <ListItem><Highlight>детализированная</Highlight> — больше мелких деталей</ListItem>
            <ListItem><Highlight>профессиональная фотография</Highlight> — улучшает общее качество</ListItem>
          </List>
          <Text>
            <Highlight>Важно:</Highlight> Эти слова можно писать на русском или английском — нейросеть их понимает. Всегда добавляйте их в конец промпта!
          </Text>
        </Section>

        <Section>
          <SectionTitle>🔄 Что делать, если результат не понравился?</SectionTitle>
          <List>
            <ListItem>
              <Highlight>Вариант 1:</Highlight> Отредактируйте промпт и сгенерируйте снова. Попробуйте изменить порядок слов, добавить детали или использовать скобки для важных элементов
            </ListItem>
            <ListItem>
              <Highlight>Вариант 2:</Highlight> Попробуйте другой стиль (Сочетание аниме и реализма, Классический аниме стиль, Максимальная фотореалистичность) — иногда это кардинально меняет результат
            </ListItem>
            <ListItem>
              <Highlight>Вариант 3:</Highlight> Сгенерируйте несколько раз с тем же промптом — каждый раз результат будет немного отличаться
            </ListItem>
            <ListItem>
              <Highlight>Вариант 4:</Highlight> Упростите промпт — иногда меньше значит больше. Уберите лишние детали и оставьте только самое важное
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>💡 Полезные советы</SectionTitle>
          <List>
            <ListItem>
              <Highlight>Пишите на русском:</Highlight> Нейросеть понимает русский язык, не нужно переводить на английский
            </ListItem>
            <ListItem>
              <Highlight>Используйте конкретные слова:</Highlight> "красное платье" лучше, чем "красивая одежда"
            </ListItem>
            <ListItem>
              <Highlight>Не перегружайте деталями:</Highlight> 30-40 слов обычно достаточно для хорошего результата
            </ListItem>
            <ListItem>
              <Highlight>Экспериментируйте:</Highlight> Попробуйте разные комбинации слов, стилей и настроек
            </ListItem>
            <ListItem>
              <Highlight>Сохраняйте понравившиеся промпты:</Highlight> Если результат понравился, запомните промпт для будущего использования
            </ListItem>
          </List>
        </Section>

        <Section>
          <SectionTitle>🎓 Краткая памятка</SectionTitle>
          <Text>
            <Highlight>1.</Highlight> Важное в начале, детали в конце<br/>
            <Highlight>2.</Highlight> Используйте скобки (слово:1.3) для важных элементов<br/>
            <Highlight>3.</Highlight> Всегда добавляйте "киношный свет, объемные световые лучи, красивые глубокие тени, шедевр" в конец<br/>
            <Highlight>4.</Highlight> Не пишите больше 40-50 слов<br/>
            <Highlight>5.</Highlight> Экспериментируйте с разными стилями и промптами
          </Text>
        </Section>

        <CloseButton onClick={onClose}>
          Понятно, спасибо! 🎉
        </CloseButton>
      </ModalContent>
    </ModalOverlay>
  );
};
