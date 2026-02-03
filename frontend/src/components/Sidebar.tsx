import React from 'react';
import styled from 'styled-components';
import { theme } from '../theme';

const SidebarContainer = styled.div`
  width: 300px;
  min-width: 300px;
  height: 100vh;
  background: rgba(22, 33, 62, 0.3); /* Очень прозрачный */
  backdrop-filter: blur(5px);
  padding: ${theme.spacing.xl};
  border-right: 1px solid ${theme.colors.border.accent};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  
  /* Добавляем эффект свечения */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: ${theme.colors.gradients.button};
    opacity: 0.3;
  }

  /* Адаптивность для мобильных устройств */
  @media (max-width: 1024px) {
    width: 100%;
    height: auto;
    min-height: 200px;
    border-right: none;
    border-bottom: 1px solid ${theme.colors.border.accent};
    
    &::after {
      display: none;
    }
  }

  @media (max-width: 768px) {
    padding: ${theme.spacing.lg};
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
  
  h2 {
    font-size: ${theme.fontSize.xl};
    font-weight: 700;
    background: ${theme.colors.gradients.button};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: ${theme.spacing.sm};
  }
  
  p {
    color: ${theme.colors.text.muted};
    font-size: ${theme.fontSize.sm};
  }
`;

const InfoSection = styled.div`
  background: ${theme.colors.gradients.card};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.message};
`;

const SectionTitle = styled.h3`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 1px solid ${theme.colors.border.primary};
`;

const CharactersSection = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const CharacterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

const CharacterItem = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: ${props => props.$isActive
    ? theme.colors.gradients.button
    : 'transparent'
  };
  border: 1px solid ${props => props.$isActive
    ? theme.colors.accent.primary
    : theme.colors.border.primary
  };
  border-radius: ${theme.borderRadius.lg};
  color: ${theme.colors.text.primary};
  transition: ${theme.transition.fast};
  cursor: pointer;
  text-align: left;
  
  &:hover {
    background: ${props => props.$isActive
    ? theme.colors.gradients.buttonHover
    : theme.colors.background.tertiary
  };
    border-color: ${theme.colors.accent.primary};
    transform: translateX(4px);
  }
  
  ${props => props.$isActive && `
    box-shadow: ${theme.colors.shadow.glow};
  `}
`;

const CharacterAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.gradients.button};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${theme.fontSize.lg};
  color: ${theme.colors.text.primary};
`;

const CharacterInfo = styled.div`
  flex: 1;
`;

const CharacterName = styled.div`
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  margin-bottom: 2px;
`;

const CharacterDescription = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.muted};
  line-height: 1.4;
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.lg};
`;

const QuickActionButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-weight: 600;
  font-size: ${theme.fontSize.sm};
  cursor: pointer;
  transition: ${theme.transition.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  
  &:hover {
    background: ${theme.colors.gradients.buttonHover};
    box-shadow: ${theme.colors.shadow.button};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const AuthSection = styled.div`
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid ${theme.colors.border.primary};
`;

const AuthButton = styled.button<{ $isDisabled?: boolean }>`
  width: 100%;
  padding: ${theme.spacing.md};
  background: ${props => props.$isDisabled
    ? theme.colors.background.tertiary
    : theme.colors.gradients.button
  };
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-weight: 600;
  font-size: ${theme.fontSize.base};
  cursor: ${props => props.$isDisabled ? 'not-allowed' : 'pointer'};
  transition: ${theme.transition.fast};
  opacity: ${props => props.$isDisabled ? 0.6 : 1};
  
  &:hover:not(:disabled) {
    background: ${theme.colors.gradients.buttonHover};
    box-shadow: ${theme.colors.shadow.button};
    transform: translateY(-2px);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const UserInfo = styled.div`
  padding: ${theme.spacing.md};
  background: ${theme.colors.background.tertiary};
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid ${theme.colors.border.accent};
  margin-bottom: ${theme.spacing.md};
`;

const UserName = styled.div`
  font-weight: 600;
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing.xs};
`;

const UserStatus = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.muted};
`;

const ModelInfo = styled.div`
  font-size: ${theme.fontSize.sm};
  color: ${theme.colors.text.muted};
  margin-top: ${theme.spacing.sm};
`;

interface Character {
  id: string;
  name: string;
  description: string;
  avatar?: string;
}

interface SidebarProps {
  currentCharacter: Character;
  onCharacterSelect: (character: Character) => void;
  isAuthenticated: boolean;
  onAuthClick: () => void;
  onQuickAction: (action: string) => void;
  modelInfo?: string;
  userInfo?: {
    username: string;
    coins: number;
  };
}

const characters: Character[] = [
  {
    id: 'anna',
    name: 'Anna',
    description: 'Дружелюбный помощник с теплым характером',
    avatar: 'A'
  },
  {
    id: 'caitlin',
    name: 'Caitlin',
    description: 'Креативный художник и дизайнер',
    avatar: 'C'
  },
  {
    id: 'christina',
    name: 'Christina',
    description: 'Мудрый наставник и философ',
    avatar: 'C'
  },
  {
    id: 'nadya1',
    name: 'Nadya1',
    description: 'Технический эксперт и программист',
    avatar: 'N'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentCharacter,
  onCharacterSelect,
  isAuthenticated,
  onAuthClick,
  onQuickAction,
  modelInfo = "Загрузка...",
  userInfo
}) => {
  return (
    <SidebarContainer>
      <Logo>
        <h2>AI Chat</h2>
        <p>Выберите персонажа для общения</p>
      </Logo>

      <CharactersSection>
        <InfoSection>
          <SectionTitle>Доступные персонажи</SectionTitle>
          <CharacterList>
            {characters.map((character) => (
              <CharacterItem
                key={character.id}
                $isActive={currentCharacter.id === character.id}
                onClick={() => onCharacterSelect(character)}
              >
                <CharacterAvatar>
                  {character.avatar || character.name[0]}
                </CharacterAvatar>
                <CharacterInfo>
                  <CharacterName>{character.name}</CharacterName>
                  <CharacterDescription>{character.description}</CharacterDescription>
                </CharacterInfo>
              </CharacterItem>
            ))}
          </CharacterList>
        </InfoSection>
      </CharactersSection>

      <InfoSection>
        <SectionTitle>Информация</SectionTitle>
        <ModelInfo>{modelInfo}</ModelInfo>
      </InfoSection>

      <QuickActions>
        <QuickActionButton onClick={() => onQuickAction('gallery')}>
          Платная галерея
        </QuickActionButton>
        <QuickActionButton onClick={() => onQuickAction('shop')}>
          Магазин
        </QuickActionButton>
        <QuickActionButton onClick={() => onQuickAction('create')}>
          Создать персонажа
        </QuickActionButton>
        <QuickActionButton onClick={() => onQuickAction('clear')}>
          Очистить чат
        </QuickActionButton>
      </QuickActions>

      <AuthSection>
        {isAuthenticated && userInfo ? (
          <UserInfo>
            <UserName>{userInfo.username}</UserName>
            <UserStatus>Авторизован</UserStatus>
          </UserInfo>
        ) : (
          <AuthButton onClick={onAuthClick}>
            Войти в систему
          </AuthButton>
        )}
      </AuthSection>
    </SidebarContainer>
  );
};
