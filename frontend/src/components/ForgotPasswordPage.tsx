import React, { useState } from 'react';
import styled from 'styled-components';
import { FiMail, FiLock, FiArrowLeft } from 'react-icons/fi';
import DarkVeil from '../../@/components/DarkVeil';
import { API_CONFIG } from '../config/api';
import { useTranslation } from 'react-i18next';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
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

const FormContainer = styled.div`
  width: 100%;
  max-width: 450px;
  padding: 40px;
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
  margin: 20px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 24px;
  padding: 8px 0;
  transition: color 0.2s ease;

  &:hover {
    color: rgba(255, 255, 255, 1);
  }
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #e879f9 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  position: relative;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px 14px 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #e879f9 0%, #a855f7 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.6);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Message = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  background: ${props => props.$type === 'success'
        ? 'rgba(34, 197, 94, 0.1)'
        : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid ${props => props.$type === 'success'
        ? 'rgba(34, 197, 94, 0.3)'
        : 'rgba(239, 68, 68, 0.3)'};
  color: ${props => props.$type === 'success'
        ? 'rgba(34, 197, 94, 1)'
        : 'rgba(239, 68, 68, 1)'};
`;

interface ForgotPasswordPageProps {
    onBackToLogin: () => void;
    onBackToMain?: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBackToLogin }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/forgot-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: t('auth.codeSent') });
                setStep('reset');
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.detail || t('auth.errorSendingCode') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('auth.serverError') });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: t('auth.passwordsDoNotMatch') });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: t('auth.passwordTooShort') });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/reset-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    verification_code: verificationCode,
                    new_password: newPassword,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: t('auth.passwordResetSuccess') });
                setTimeout(() => {
                    onBackToLogin();
                }, 2000);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.detail || t('auth.errorResetPassword') });
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('auth.serverError') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <BackgroundWrapper>
                <DarkVeil />
            </BackgroundWrapper>

            <FormContainer>
                <BackButton onClick={onBackToLogin}>
                    <FiArrowLeft size={18} />
                    {t('auth.backToLogin')}
                </BackButton>

                {step === 'email' ? (
                    <>
                        <Title>{t('auth.forgotPasswordTitle')}</Title>
                        <Subtitle>
                            {t('auth.forgotPasswordSubtitle')}
                        </Subtitle>

                        <Form onSubmit={handleSendCode}>
                            <InputGroup>
                                <InputIcon>
                                    <FiMail size={20} />
                                </InputIcon>
                                <Input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </InputGroup>

                            {message && <Message $type={message.type}>{message.text}</Message>}

                            <Button type="submit" disabled={loading}>
                                {loading ? t('auth.sending') : t('auth.sendCode')}
                            </Button>
                        </Form>
                    </>
                ) : (
                    <>
                        <Title>{t('auth.resetPasswordTitle')}</Title>
                        <Subtitle>
                            {t('auth.resetPasswordSubtitle')}
                        </Subtitle>

                        <Form onSubmit={handleResetPassword}>
                            <InputGroup>
                                <InputIcon>
                                    <FiMail size={20} />
                                </InputIcon>
                                <Input
                                    type="text"
                                    placeholder={t('auth.enterCode')}
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                />
                            </InputGroup>

                            <InputGroup>
                                <InputIcon>
                                    <FiLock size={20} />
                                </InputIcon>
                                <Input
                                    type="password"
                                    placeholder={t('auth.newPassword')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </InputGroup>

                            <InputGroup>
                                <InputIcon>
                                    <FiLock size={20} />
                                </InputIcon>
                                <Input
                                    type="password"
                                    placeholder={t('auth.confirmPassword')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </InputGroup>

                            {message && <Message $type={message.type}>{message.text}</Message>}

                            <Button type="submit" disabled={loading}>
                                {loading ? t('auth.resetting') : t('auth.resetPassword')}
                            </Button>
                        </Form>
                    </>
                )}
            </FormContainer>
        </PageContainer>
    );
};

export default ForgotPasswordPage;
