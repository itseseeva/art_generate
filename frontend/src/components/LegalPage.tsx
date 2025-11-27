import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

import { Footer } from './Footer';

const Container = styled.div`
  padding: 4rem 2rem;
  max-width: 900px;
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

const Section = styled.section`
  margin-bottom: 3.5rem;
  padding: 2.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, #8b5cf6, #6366f1);
    opacity: 0.6;
  }
  
  &:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateX(5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3), 
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  position: relative;
  padding-left: 1rem;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 24px;
    background: linear-gradient(180deg, #8b5cf6, #6366f1);
    border-radius: 2px;
  }
`;

const Text = styled.p`
  font-size: 1.05rem;
  line-height: 1.8;
  margin-bottom: 1.25rem;
  color: #d1d1d1;
  
  strong {
    color: #ffffff;
    font-weight: 600;
    background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  br {
    line-height: 2;
  }
`;

const List = styled.ul`
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  color: #d1d1d1;
`;

const ListItem = styled.li`
  margin-bottom: 0.75rem;
  line-height: 1.6;
`;

export const LegalPage: React.FC = () => {
  return (
    <Container>
      <Content>
        <Title>Правовая информация</Title>

        <Section>
          <SectionTitle>Договор оферты</SectionTitle>
          <Text>
            Настоящий документ является официальным предложением (публичной офертой) индивидуального предпринимателя Крецу Василе (ИНН 772426525886), предоставляющего доступ к онлайн-сервису генерации изображений с использованием технологий искусственного интеллекта.
          </Text>
          <Text>
            <strong>1. Предмет договора</strong><br/>
            1.1. Исполнитель предоставляет Заказчику доступ к функционалу сервиса после оплаты выбранного тарифа.<br/>
            1.2. Услуги оказываются дистанционно, в электронном виде.
          </Text>
          <Text>
            <strong>2. Порядок предоставления доступа</strong><br/>
            2.1. После завершения оплаты доступ предоставляется автоматически в личном кабинете пользователя.<br/>
            2.2. Объём доступных функций зависит от выбранного тарифа.<br/>
            2.3. Факт оплаты подтверждается электронным чеком.
          </Text>
          <Text>
            <strong>3. Оплата услуг</strong><br/>
            3.1. Оплата осуществляется безналичным способом через подключённые платёжные системы.<br/>
            3.2. Стоимость тарифов указана на сайте и может быть изменена Исполнителем в одностороннем порядке, при этом изменения не применяются к уже оплаченным услугам.<br/>
            3.3. Услуги не облагаются НДС (ст. 346.11 НК РФ).
          </Text>
          <Text>
            <strong>4. Возврат средств</strong><br/>
            4.1. Возврат осуществляется в случае, если доступ к сервису не был предоставлен по технической ошибке со стороны Исполнителя.<br/>
            4.2. Обращение на возврат направляется на email службы поддержки.<br/>
            4.3. Возвраты не осуществляются, если услуга фактически оказана (доступ предоставлен).
          </Text>
        </Section>

        <Section>
          <SectionTitle>Политика конфиденциальности</SectionTitle>
          <Text>
            <strong>1. Какие данные собираются</strong><br/>
            1.1. Email для регистрации и авторизации.<br/>
            1.2. Технические данные (IP-адрес, cookie) для работы сайта.
          </Text>
          <Text>
            <strong>2. Как используются данные</strong><br/>
            2.1. Для создания и ведения личного кабинета.<br/>
            2.2. Для обеспечения работы сервиса.<br/>
            2.3. Данные не передаются третьим лицам, за исключением случаев, предусмотренных законом.
          </Text>
          <Text>
            <strong>3. Безопасность данных</strong><br/>
            3.1. Доступ к данным ограничен и защищён техническими мерами.
          </Text>
        </Section>

        <Section>
          <SectionTitle>Реквизиты и контакты</SectionTitle>
          <Text>
            <strong>Индивидуальный предприниматель:</strong> Крецу Василе<br/>
            <strong>ИНН:</strong> 772426525886<br/>
            <strong>Email:</strong> Vasilexretsu@proton.me<br/>
            <strong>Телефон:</strong> +7 995 232-72-19
          </Text>
        </Section>
      </Content>
      <Footer />
    </Container>
  );
};

