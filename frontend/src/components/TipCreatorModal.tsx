import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { FiHeart, FiX, FiImage, FiMic } from 'react-icons/fi';
import { API_CONFIG } from '../config/api';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(70px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%);
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 
              inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;

  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 95vw;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h3 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cccccc;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const CharacterInfo = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  
  p {
    color: #d1d1d1;
    margin: 0.5rem 0;
    line-height: 1.6;
  }
  
  strong {
    color: #ffffff;
    font-weight: 600;
  }
`;

const TipTypeSelector = styled.div`
  margin-bottom: 2rem;
  
  label {
    display: block;
    font-weight: 600;
    color: #d1d1d1;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const TipTypeButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const TipTypeButton = styled.button<{ selected: boolean }>`
  padding: 1rem;
  background: ${props => props.selected
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.selected
    ? 'rgba(139, 92, 246, 0.5)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    border-color: rgba(139, 92, 246, 0.6);
    background: ${props => props.selected
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const AmountSelector = styled.div`
  margin-bottom: 2rem;
  
  label {
    display: block;
    font-weight: 600;
    color: #d1d1d1;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const AmountButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
`;

const AmountButton = styled.button<{ selected: boolean }>`
  padding: 0.75rem;
  background: ${props => props.selected
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.selected
    ? 'rgba(139, 92, 246, 0.5)'
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 60px;
  position: relative;
  z-index: 10;
  
  &:hover:not(:disabled) {
    border-color: rgba(139, 92, 246, 0.6);
    background: ${props => props.selected
    ? 'linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%)'
    : 'rgba(255, 255, 255, 0.1)'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.6rem;
    font-size: 0.9rem;
    flex: 1 1 calc(25% - 0.5rem);
    min-width: 50px;
  }
`;

const CustomAmountInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: #888888;
  }
`;

const MessageInput = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
  font-family: inherit;
  
  &:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: #888888;
  }
`;

const BalanceInfo = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
  text-align: center;
  
  p {
    color: #d1d1d1;
    margin: 0;
    
    strong {
      color: #a78bfa;
      font-size: 1.25rem;
    }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 1rem;
  background: #6d28d9;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(99, 102, 241, 1) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }
  
  &:disabled {
    background: rgba(60, 60, 60, 0.5);
    border-color: rgba(100, 100, 100, 0.3);
    color: rgba(255, 255, 255, 0.4);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const CancelButton = styled.button`
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #d1d1d1;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface TipCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  characterDisplayName?: string;
  photoGenerations: number;
  voiceGenerations: number;
  onSuccess: (tipType: 'photo' | 'voice', remaining: number, amount: number) => void;
}

const PRESET_AMOUNTS = [1, 2, 5, 10, 15, 20, 30, 50];

export const TipCreatorModal: React.FC<TipCreatorModalProps> = ({
  isOpen,
  onClose,
  characterName,
  characterDisplayName,
  photoGenerations,
  voiceGenerations,
  onSuccess
}) => {
  const [tipType, setTipType] = useState<'photo' | 'voice'>('photo');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBalance = tipType === 'photo' ? photoGenerations : voiceGenerations;
  const balanceLabel = tipType === 'photo' ? 'фото-генераций' : 'голосовых генераций';

  const getActualAmount = (): number => {
    if (customAmount) {
      const amount = parseInt(customAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return selectedAmount || 0;
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    setSelectedAmount(null);
    setError(null);
  };

  const handleTipTypeChange = (newType: 'photo' | 'voice') => {
    setTipType(newType);
    setError(null);
  };

  const handleSubmit = async () => {
    const amount = getActualAmount();

    // Валидация
    if (amount <= 0) {
      setError('Пожалуйста, укажите количество генераций');
      return;
    }

    if (amount > 100) {
      setError('Максимум 100 генераций за один раз');
      return;
    }

    if (amount > currentBalance) {
      setError(`Недостаточно ${balanceLabel}. У вас: ${currentBalance}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Необходима авторизация');
        return;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/auth/coins/tip-creator/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: characterName,
          tip_type: tipType,
          amount: amount,
          message: message || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при отправке генераций');
      }

      const data = await response.json();

      setSuccess(data.message);

      // Диспатчим событие обновления баланса
      window.dispatchEvent(new CustomEvent('balance-update', {
        detail: {
          tipType: data.tip_type,
          remaining: data.sender_remaining
        }
      }));

      // Сразу закрываем модалку и показываем toast
      onSuccess(data.tip_type, data.sender_remaining, amount);
      onClose();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = characterDisplayName || characterName;
  const actualAmount = getActualAmount();

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h3>
            <FiHeart /> Поблагодарить создателя
          </h3>
          <CloseButton onClick={onClose}>
            <FiX size={24} />
          </CloseButton>
        </ModalHeader>

        <CharacterInfo>
          <p>
            <strong>Персонаж:</strong> {displayName}
          </p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Создателю персонажа будет отправлена благодарность в виде фото-генераций или голосовых генераций
          </p>
        </CharacterInfo>

        <TipTypeSelector>
          <label>Выберите тип благодарности:</label>
          <TipTypeButtons>
            <TipTypeButton
              selected={tipType === 'photo'}
              onClick={() => handleTipTypeChange('photo')}
              disabled={isLoading}
            >
              <FiImage />
              Фото-генерации
            </TipTypeButton>
            <TipTypeButton
              selected={tipType === 'voice'}
              onClick={() => handleTipTypeChange('voice')}
              disabled={isLoading}
            >
              <FiMic />
              Голосовые генерации
            </TipTypeButton>
          </TipTypeButtons>
        </TipTypeSelector>

        <BalanceInfo>
          <p>
            Ваш баланс: <strong>{currentBalance}</strong> {balanceLabel}
          </p>
        </BalanceInfo>

        <AmountSelector>
          <label>Выберите количество:</label>
          <AmountButtons>
            {PRESET_AMOUNTS.map(amount => (
              <AmountButton
                key={amount}
                selected={selectedAmount === amount}
                onClick={() => handleAmountSelect(amount)}
                disabled={isLoading || amount > currentBalance}
                style={{ opacity: amount > currentBalance ? 0.5 : 1 }}
              >
                {amount}
              </AmountButton>
            ))}
          </AmountButtons>
          <CustomAmountInput
            type="number"
            placeholder="Или введите свою сумму (1-100)"
            value={customAmount}
            onChange={handleCustomAmountChange}
            min={1}
            max={100}
            disabled={isLoading}
          />
        </AmountSelector>

        <div style={{ marginBottom: theme.spacing.xl }}>
          <label style={{
            display: 'block',
            fontWeight: 600,
            color: theme.colors.text.secondary,
            fontSize: theme.fontSize.sm,
            marginBottom: theme.spacing.md
          }}>
            Сообщение (необязательно):
          </label>
          <MessageInput
            placeholder="Напишите сообщение создателю..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            disabled={isLoading}
          />
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <ButtonGroup>
          <SubmitButton
            onClick={handleSubmit}
            disabled={isLoading || actualAmount <= 0 || actualAmount > currentBalance}
          >
            {isLoading ? 'Отправка...' : `Отправить ${actualAmount} ${balanceLabel}`}
          </SubmitButton>
          <CancelButton
            onClick={onClose}
            disabled={isLoading}
          >
            Отмена
          </CancelButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
