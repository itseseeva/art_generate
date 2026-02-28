import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.secondary};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.glow};
`;

const ModalHeader = styled.h3`
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.lg};
  font-size: ${theme.fontSize.xl};
  font-weight: 600;
`;

const HintSection = styled.div`
  background: rgba(0, 123, 255, 0.1);
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: ${theme.spacing.lg};
  border-left: 4px solid #007bff;
`;

const HintTitle = styled.h4`
  margin: 0 0 ${theme.spacing.sm} 0;
  color: #007bff;
  font-size: ${theme.fontSize.md};
`;

const HintText = styled.p`
  margin: 0;
  font-size: ${theme.fontSize.sm};
  line-height: 1.4;
  color: ${theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const Label = styled.label`
  color: ${theme.colors.text.primary};
  font-weight: 500;
  font-size: ${theme.fontSize.sm};
`;

const Input = styled.input`
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.tertiary};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.text.muted};
  }
`;

const TextArea = styled.textarea`
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.tertiary};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
  
  &::placeholder {
    color: ${theme.colors.text.muted};
  }
`;

const SmallText = styled.small`
  color: ${theme.colors.text.muted};
  font-size: ${theme.fontSize.xs};
`;

const CostSection = styled.div`
  background: rgba(255, 193, 7, 0.1);
  padding: ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.md};
  border-left: 4px solid #ffc107;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CostText = styled.strong`
  color: ${theme.colors.text.primary};
`;

const UserCoinsInfo = styled.span`
  color: ${theme.colors.text.primary};
  font-weight: 500;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${theme.spacing.lg};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  border: none;
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  ${props => props.variant === 'primary' ? `
    background: ${theme.colors.gradients.button};
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: ${theme.colors.shadow.glow};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
  ` : `
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
    border: 1px solid ${theme.colors.border.primary};
    
    &:hover {
      background: ${theme.colors.background.secondary};
    }
  `}
`;

const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.sm};
`;

const SuccessMessage = styled.div`
  color: ${theme.colors.success};
  font-size: ${theme.fontSize.sm};
  margin-top: ${theme.spacing.sm};
`;

interface CreateCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoins: number;
  onCreateCharacter: (data: {
    name: string;
    personality: string;
    situation: string;
    instructions: string;
    style: string;
    appearance: string;
    location: string;
  }) => Promise<void>;
}

export const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({
  isOpen,
  onClose,
  userCoins,
  onCreateCharacter
}) => {
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    situation: '',
    instructions: '',
    style: '',
    appearance: '',
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields as in HTML version
    if (!formData.name.trim()) {
      setError('Character name is required');
      return;
    }
    
    if (!formData.personality.trim()) {
      setError('Character personality is required');
      return;
    }
    
    if (!formData.situation.trim()) {
      setError('Character situation is required');
      return;
    }
    
    if (!formData.instructions.trim()) {
      setError('Character instructions are required');
      return;
    }
    
    if (userCoins < 10) {
      setError(`Not enough coins! You have: ${userCoins}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await onCreateCharacter(formData);
      setSuccess(`Character "${formData.name}"`);
      
      // Clear form
      setFormData({
        name: '',
        personality: '',
        situation: '',
        instructions: '',
        style: '',
        appearance: '',
        location: ''
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Character creation error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>Create Character</ModalHeader>
        
        <HintSection>
          <HintTitle>Hint!</HintTitle>
          <HintText>
            For quality character creation, follow this format:<br />
            <strong>Character Name</strong> - enter character name<br />
            1. <strong>Personality and Character</strong> - describe character personality<br />
            2. <strong>Role-playing Situation</strong> - what situation the character is in<br />
            3. <strong>Instructions</strong> - how the character should behave<br />
            4. <strong>Response Style</strong> (optional) - speech features<br />
            5. <strong>Appearance</strong> (for photos) - character appearance description<br />
            6. <strong>Location</strong> (for photos) - where the character is located
          </HintText>
        </HintSection>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="characterName">Character Name:</Label>
            <Input
              id="characterName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="For example: Anna"
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterPersonality">1. Personality and Character:</Label>
            <TextArea
              id="characterPersonality"
              value={formData.personality}
              onChange={(e) => handleInputChange('personality', e.target.value)}
              placeholder="Describe the character's personality, appearance, main character traits..."
              rows={3}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterSituation">2. Role-playing Situation:</Label>
            <TextArea
              id="characterSituation"
              value={formData.situation}
              onChange={(e) => handleInputChange('situation', e.target.value)}
              placeholder="What situation is the character in? What's happening in their world?"
              rows={3}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterInstructions">3. Instructions:</Label>
            <TextArea
              id="characterInstructions"
              value={formData.instructions}
              onChange={(e) => handleInputChange('instructions', e.target.value)}
              placeholder="How should the character behave? What rules to follow?"
              rows={3}
              required
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterStyle">4. Response Style (optional):</Label>
            <TextArea
              id="characterStyle"
              value={formData.style}
              onChange={(e) => handleInputChange('style', e.target.value)}
              placeholder="Speech features, communication style, favorite phrases..."
              rows={2}
            />
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterAppearance">5. Character Appearance (for photo generation):</Label>
            <TextArea
              id="characterAppearance"
              value={formData.appearance}
              onChange={(e) => handleInputChange('appearance', e.target.value)}
              placeholder="Describe the character's appearance: hair color, eyes, clothing, features..."
              rows={2}
            />
            <SmallText>This field directly affects image generation!</SmallText>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="characterLocation">6. Location (for photo generation):</Label>
            <TextArea
              id="characterLocation"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Describe the place where the character is: room, street, nature..."
              rows={2}
            />
            <SmallText>This field directly affects image generation!</SmallText>
          </FormGroup>
          
          <CostSection>
            <UserCoinsInfo>You have: {userCoins} coins</UserCoinsInfo>
          </CostSection>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          
          <ModalButtons>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Character'}
            </Button>
          </ModalButtons>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};
