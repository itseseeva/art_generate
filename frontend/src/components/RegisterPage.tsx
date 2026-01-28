import React, { useState } from 'react';
import styled from 'styled-components';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiMessageSquare, FiImage, FiZap, FiCpu } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import DarkVeil from '../../@/components/DarkVeil';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  
  @media (max-width: 968px) {
    flex-direction: column;
  }
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

const LeftSection = styled.div`
  flex: 1;
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
  z-index: 1;
  
  @media (max-width: 968px) {
    padding: 40px 30px;
    min-height: 40vh;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 60px;
  
  img {
    height: 80px;
    width: auto;
  }
`;

const MainHeading = styled.h1`
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  line-height: 1.2;
  color: white;
  
  span {
    background: linear-gradient(135deg, #e879f9 0%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  @media (max-width: 968px) {
    font-size: 36px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 50px;
  
  @media (max-width: 968px) {
    font-size: 16px;
  }
`;

const FeaturesList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  .icon-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .icon {
    width: 24px;
    height: 24px;
    color: #a855f7;
  }
  
  .title {
    font-size: 16px;
    font-weight: 600;
    color: white;
  }
  
  .description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
  }
`;

const RightSection = styled.div`
  flex: 1;
  padding: 60px 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  
  @media (max-width: 968px) {
    padding: 40px 30px;
  }
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 440px;
  background: rgba(30, 30, 40, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 968px) {
    padding: 32px 24px;
  }
`;

const FormTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  text-align: center;
`;

const FormSubtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  color: #4ade80;
  font-size: 14px;
  text-align: center;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
  position: relative;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px 14px 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  &:focus {
    outline: none;
    border-color: #a855f7;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  pointer-events: none;
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
  
  &:hover {
    color: rgba(255, 255, 255, 0.7);
  }
`;

const RegisterButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ef4444 0%, #ec4899 50%, #a855f7 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(239, 68, 68, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 28px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
  
  span {
    padding: 0 16px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    font-size: 20px;
  }
`;

const LoginLink = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  
  a {
    color: #a855f7;
    text-decoration: none;
    font-weight: 600;
    cursor: pointer;
    
    &:hover {
      color: #e879f9;
    }
  }
`;

interface RegisterPageProps {
  onRegister?: (email: string, password: string, username: string) => Promise<void>;
  onVerifyCode?: (code: string) => Promise<void>;
  onGoogleRegister?: () => void;
  onLogin?: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, onVerifyCode, onGoogleRegister, onLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (onRegister) {
        await onRegister(email, password, username);
        // После успешной регистрации показываем поле для ввода кода
        setShowVerification(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (onVerifyCode) {
        await onVerifyCode(verificationCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <FiMessageSquare />,
      title: 'Общение с AI персонажами',
      description: 'Создавайте и общайтесь с уникальными персонажами'
    },
    {
      icon: <FiImage />,
      title: 'Генерация изображений',
      description: 'Создавайте фото персонажей с помощью AI'
    },
    {
      icon: <FiZap />,
      title: 'Генерация голосов',
      description: 'Озвучивайте персонажей с помощью AI'
    },
    {
      icon: <FiCpu />,
      title: 'Продвинутые модели',
      description: 'Доступ к лучшим AI моделям для генерации'
    }
  ];

  return (
    <PageContainer>
      <BackgroundWrapper>
        <DarkVeil />
      </BackgroundWrapper>

      <LeftSection>
        <Logo>
          <img src="/logo-header.png" alt="Cherry Lust" />
        </Logo>

        <MainHeading>
          Получи свои первые <span>200 монет</span><br />
          при регистрации
        </MainHeading>

        <Subtitle>
          Присоединяйтесь к тысячам пользователей, которые уже создают своих уникальных AI персонажей
        </Subtitle>

        <FeaturesList>
          {features.map((feature, index) => (
            <FeatureItem key={index}>
              <div className="icon-row">
                <div className="icon">{feature.icon}</div>
                <div className="title">{feature.title}</div>
              </div>
              <div className="description">{feature.description}</div>
            </FeatureItem>
          ))}
        </FeaturesList>
      </LeftSection>

      <RightSection>
        <FormContainer>
          {!showVerification ? (
            <>
              <FormTitle>Регистрация в Cherry Lust</FormTitle>
              <FormSubtitle>Создайте аккаунт, чтобы начать</FormSubtitle>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <form onSubmit={handleSubmit}>
                <InputGroup>
                  <InputWrapper>
                    <InputIcon>
                      <FiUser size={18} />
                    </InputIcon>
                    <Input
                      type="text"
                      placeholder="Имя пользователя"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={30}
                    />
                  </InputWrapper>
                </InputGroup>

                <InputGroup>
                  <InputWrapper>
                    <InputIcon>
                      <FiMail size={18} />
                    </InputIcon>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </InputWrapper>
                </InputGroup>

                <InputGroup>
                  <InputWrapper>
                    <InputIcon>
                      <FiLock size={18} />
                    </InputIcon>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Пароль (минимум 8 символов)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <TogglePasswordButton
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </TogglePasswordButton>
                  </InputWrapper>
                </InputGroup>

                <RegisterButton type="submit" disabled={isLoading}>
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </RegisterButton>
              </form>

              <Divider>
                <span>ИЛИ</span>
              </Divider>

              <GoogleButton type="button" onClick={onGoogleRegister}>
                <FcGoogle />
                Зарегистрироваться через Google
              </GoogleButton>

              <LoginLink>
                Уже есть аккаунт? <a onClick={onLogin}>Войти</a>
              </LoginLink>
            </>
          ) : (
            <>
              <FormTitle>Подтверждение регистрации</FormTitle>
              <FormSubtitle>Проверьте вашу почту для подтверждения</FormSubtitle>

              <SuccessMessage>
                Регистрация успешна! Введите код подтверждения из письма
              </SuccessMessage>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <form onSubmit={handleVerifySubmit}>
                <InputGroup>
                  <Input
                    type="text"
                    placeholder="Введите код подтверждения"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    style={{ paddingLeft: '16px' }}
                  />
                </InputGroup>

                <RegisterButton type="submit" disabled={isLoading}>
                  {isLoading ? 'Подтверждение...' : 'Подтвердить'}
                </RegisterButton>
              </form>

              <LoginLink>
                <a onClick={() => setShowVerification(false)}>Назад к регистрации</a>
              </LoginLink>
            </>
          )}
        </FormContainer>
      </RightSection>
    </PageContainer>
  );
};

export default RegisterPage;
