import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.primary};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.message};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
  padding-bottom: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.border.primary};
`;

const Title = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.xl};
  cursor: pointer;
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  transition: ${theme.transition.fast};
  
  &:hover {
    background: ${theme.colors.background.secondary};
    color: ${theme.colors.text.primary};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const Label = styled.label`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
`;

const Input = styled.input`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.md};
  font-family: inherit;
  transition: ${theme.transition.fast};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

const TextArea = styled.textarea`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.md};
  font-family: inherit;
  min-height: 100px;
  resize: vertical;
  transition: ${theme.transition.fast};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  border: none;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${theme.colors.gradients.button};
          color: ${theme.colors.text.primary};
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: ${theme.colors.shadow.button};
          }
        `;
      case 'danger':
        return `
          background: #dc2626;
          color: white;
          
          &:hover {
            background: #b91c1c;
            transform: translateY(-2px);
          }
        `;
      default:
        return `
          background: ${theme.colors.background.secondary};
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.primary};
          
          &:hover {
            background: ${theme.colors.background.tertiary};
            border-color: ${theme.colors.accent.primary};
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.sm};
`;

const SuccessMessage = styled.div`
  color: #16a34a;
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.sm};
`;


interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  photos?: string[];
  tags: string[];
  author: string;
  likes: number;
  views: number;
  comments: number;
}

interface EditCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  userCoins: number;
  onCharacterUpdated: () => void;
}

export const EditCharacterModal: React.FC<EditCharacterModalProps> = ({
  isOpen,
  onClose,
  character,
  userCoins,
  onCharacterUpdated
}) => {
  const [formData, setFormData] = useState({
    name: character.name,
    prompt: '',
    appearance: character.description,
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Загружаем данные персонажа при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      loadCharacterData();
    }
  }, [isOpen, character.id]);

  const loadCharacterData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/v1/characters/${character.name}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const characterData = await response.json();
        setFormData({
          name: characterData.name,
          prompt: characterData.prompt || '',
          appearance: characterData.character_appearance || '',
          location: characterData.location || ''
        });
      }
    } catch (error) {
      
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Имя персонажа обязательно');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Необходимо войти в систему');
        return;
      }

      // Обновляем данные персонажа
      const updateData: any = {};
      if (formData.name.trim()) updateData.name = formData.name.trim();
      if (formData.prompt.trim()) updateData.prompt = formData.prompt.trim();
      if (formData.appearance.trim()) updateData.character_appearance = formData.appearance.trim();
      if (formData.location.trim()) updateData.location = formData.location.trim();

      const response = await fetch(`/api/v1/characters/${character.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка обновления персонажа');
      }

      setSuccess('Персонаж успешно обновлен!');

      // Обновляем данные в родительском компоненте
      onCharacterUpdated();

      // Закрываем модальное окно через 2 секунды
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <Title>✏️ Редактировать персонажа: {character.name}</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Имя персонажа:</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Введите имя персонажа..."
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="prompt">Промпт персонажа:</Label>
            <TextArea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
              placeholder="Введите промпт персонажа..."
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="appearance">Внешность:</Label>
            <TextArea
              id="appearance"
              value={formData.appearance}
              onChange={(e) => handleInputChange('appearance', e.target.value)}
              placeholder="Опишите внешность персонажа..."
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="location">Локация:</Label>
            <TextArea
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Опишите локацию персонажа..."
            />
          </FormGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          
          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};
