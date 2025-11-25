import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { Button } from 'flowbite-react';
import { FiHeart, FiX } from 'react-icons/fi';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: ${theme.colors.gradients.card};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xxl};
  box-shadow: ${theme.colors.shadow.card};
  border: 1px solid ${theme.colors.border.accent};
  max-width: 500px;
  width: 90vw;
  animation: slideIn 0.3s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.xl};
  
  h3 {
    font-size: ${theme.fontSize['2xl']};
    font-weight: 700;
    color: ${theme.colors.text.primary};
    display: flex;
    align-items: center;
    gap: ${theme.spacing.md};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.muted};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  transition: ${theme.transition.fast};
  
  &:hover {
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
  }
`;

const CharacterInfo = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  
  p {
    color: ${theme.colors.text.secondary};
    margin: ${theme.spacing.sm} 0;
  }
  
  strong {
    color: ${theme.colors.text.primary};
  }
`;

const AmountSelector = styled.div`
  margin-bottom: ${theme.spacing.xl};
  
  label {
    display: block;
    font-weight: 600;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSize.sm};
    margin-bottom: ${theme.spacing.md};
  }
`;

const AmountButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const AmountButton = styled.button<{ selected: boolean }>`
  padding: ${theme.spacing.md};
  background: ${props => props.selected ? theme.colors.accent.primary : theme.colors.background.secondary};
  border: 2px solid ${props => props.selected ? theme.colors.accent.primary : theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  color: ${theme.colors.text.primary};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    border-color: ${theme.colors.accent.primary};
    background: ${props => props.selected ? theme.colors.accent.primary : theme.colors.background.tertiary};
  }
`;

const CustomAmountInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.secondary};
  border: 2px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  transition: ${theme.transition.fast};
  
  &:focus {
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }
`;

const MessageInput = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.secondary};
  border: 2px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  resize: vertical;
  min-height: 80px;
  margin-bottom: ${theme.spacing.xl};
  transition: ${theme.transition.fast};
  
  &:focus {
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    outline: none;
  }
  
  &::placeholder {
    color: ${theme.colors.text.muted};
  }
`;

const BalanceInfo = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.xl};
  text-align: center;
  
  p {
    color: ${theme.colors.text.secondary};
    margin: 0;
    
    strong {
      color: ${theme.colors.accent.primary};
      font-size: ${theme.fontSize.lg};
    }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: ${theme.colors.status.error};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: ${theme.colors.status.success};
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
`;

interface TipCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  characterDisplayName?: string;
  userBalance: number;
  onSuccess: (newBalance: number, amount: number) => void;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 250, 500, 1000];

export const TipCreatorModal: React.FC<TipCreatorModalProps> = ({
  isOpen,
  onClose,
  characterName,
  characterDisplayName,
  userBalance,
  onSuccess
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const handleSubmit = async () => {
    const amount = getActualAmount();

    // Валидация
    if (amount <= 0) {
      setError('Пожалуйста, укажите количество кредитов');
      return;
    }

    if (amount > 1000) {
      setError('Максимум 1000 кредитов за один раз');
      return;
    }

    if (amount > userBalance) {
      setError(`Недостаточно кредитов. У вас: ${userBalance}`);
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

      console.log('[TIP DEBUG] Отправка кредитов для персонажа:', characterName);
      console.log('[TIP DEBUG] Полный запрос:', {
        character_name: characterName,
        amount: amount,
        message: message || undefined
      });

      const response = await fetch('http://localhost:8000/api/v1/auth/coins/tip-creator/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: characterName,
          amount: amount,
          message: message || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при отправке кредитов');
      }

      const data = await response.json();
      console.log('[TIP SUCCESS] Кредиты успешно отправлены!');
      setSuccess(data.message);
      
      // Диспатчим событие обновления баланса
      window.dispatchEvent(new Event('balance-update'));
      
      // Сразу закрываем модалку и показываем toast
      onSuccess(data.sender_coins_remaining, amount);
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
            Создателю персонажа будет отправлена благодарность в виде кредитов
          </p>
        </CharacterInfo>

        <BalanceInfo>
          <p>
            Ваш баланс: <strong>{userBalance}</strong> кредитов
          </p>
        </BalanceInfo>

        <AmountSelector>
          <label>Выберите количество кредитов:</label>
          <AmountButtons>
            {PRESET_AMOUNTS.map(amount => (
              <AmountButton
                key={amount}
                selected={selectedAmount === amount}
                onClick={() => handleAmountSelect(amount)}
                disabled={isLoading || amount > userBalance}
                style={{ opacity: amount > userBalance ? 0.5 : 1 }}
              >
                {amount}
              </AmountButton>
            ))}
          </AmountButtons>
          <CustomAmountInput
            type="number"
            placeholder="Или введите свою сумму (1-1000)"
            value={customAmount}
            onChange={handleCustomAmountChange}
            min={1}
            max={1000}
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
          <Button
            onClick={handleSubmit}
            disabled={isLoading || actualAmount <= 0 || actualAmount > userBalance}
            color="purple"
            style={{ flex: 1 }}
          >
            {isLoading ? 'Отправка...' : `Отправить ${actualAmount} кредитов`}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
            color="dark"
            outline
          >
            Отмена
          </Button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

