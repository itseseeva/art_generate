import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { CompactSidebar } from './CompactSidebar';
import { GlobalHeader } from './GlobalHeader';
import { AuthModal } from './AuthModal';
import { LoadingSpinner } from './LoadingSpinner';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent; /* Используем глобальный фон */
  overflow: hidden;
`;

const Header = styled.div`
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid ${theme.colors.border.primary};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const UserName = styled.span`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const UserCoins = styled.span`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const AuthButton = styled.button`
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: transform ${theme.transition.fast};
  margin-left: ${theme.spacing.sm};
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    color: ${theme.colors.text.primary};
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: transform ${theme.transition.fast};
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    color: ${theme.colors.text.primary};
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PromptInput = styled.textarea`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border: 1px solid ${theme.colors.border.accent};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  width: 100%;
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
`;

const PromptSection = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: flex-start;
`;

const PromptContainer = styled.div`
  flex: 1;
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  border: 1px solid ${theme.colors.border.accent};
`;

const PromptLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm};
`;

const GenerateSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  min-width: 200px;
`;

const MainContent = styled.div`
  flex: 1;
  padding: ${theme.spacing.xl};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xl};
`;

const CharacterInfo = styled.div`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  border: 1px solid ${theme.colors.border.accent};
  text-align: center;
`;

const CharacterName = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize['2xl']};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.md} 0;
`;

const CharacterDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.base};
  margin: 0;
`;

const GenerationSection = styled.div`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  border: 1px solid ${theme.colors.border.accent};
`;

const SectionTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.lg} 0;
`;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
`;

const PhotoCard = styled.div<{ isSelected?: boolean; isMain?: boolean }>`
  position: relative;
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 2px solid ${props => 
    props.isMain ? theme.colors.accent.primary : 
    props.isSelected ? theme.colors.accent.secondary : 
    theme.colors.border.accent};
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.colors.shadow.glow};
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing.sm};
`;

const PhotoActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PhotoStatus = styled.span<{ isMain?: boolean }>`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: ${props => props.isMain ? theme.colors.accent.primary : theme.colors.text.secondary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

const SuccessMessage = styled.div`
  color: #51cf66;
  background: rgba(81, 207, 102, 0.1);
  border: 1px solid rgba(81, 207, 102, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.md};
  margin: ${theme.spacing.md} 0;
  font-size: ${theme.fontSize.sm};
`;

interface Character {
  id: string;
  name: string;
  description: string;
  character_appearance?: string;
  location?: string;
}

interface GeneratedPhoto {
  id: string;
  url: string;
  isSelected: boolean;
  isMain: boolean;
}

interface PhotoGenerationPageProps {
  character: Character;
  onBackToMain: () => void;
  onCreateCharacter: () => void;
  onShop: () => void;
  onProfile?: () => void;
}

export const PhotoGenerationPage: React.FC<PhotoGenerationPageProps> = ({
  character,
  onBackToMain,
  onCreateCharacter,
  onShop,
  onProfile
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number} | null>(null);
  const [generatedPhotos, setGeneratedPhotos] = useState<GeneratedPhoto[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const fakeProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeProgressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFakeProgress = useCallback(() => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    setFakeProgress(0);
    fakeProgressIntervalRef.current = setInterval(() => {
      setFakeProgress(prev => (prev >= 99 ? 99 : prev + 1));
    }, 300);
  }, []);

  const stopFakeProgress = useCallback((immediate: boolean) => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
    if (immediate) {
      setFakeProgress(0);
      return;
    }
    setFakeProgress(100);
    fakeProgressTimeoutRef.current = setTimeout(() => {
      setFakeProgress(0);
      fakeProgressTimeoutRef.current = null;
    }, 500);
  }, []);

  // Загрузка настроек генерации
  const loadGenerationSettings = async () => {
    try {
      const response = await fetch('/api/v1/fallback-settings/');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        console.log('Настройки генерации загружены:', settings);
        console.log('Steps:', settings.steps, 'CFG:', settings.cfg_scale);
      } else {
        console.error('Ошибка загрузки настроек генерации:', response.status);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек генерации:', error);
    }
  };

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUserInfo({
          username: userData.email,
          coins: userData.coins,
          id: userData.id
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  // Генерация фото
  const generatePhoto = async () => {
    if (!userInfo || userInfo.coins < 30) {
      setError('Недостаточно монет! Нужно 30 монет для генерации фото.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    startFakeProgress();

    let generationFailed = false;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      // Используем кастомный промпт или дефолтный
      const prompt = customPrompt.trim() || `${character.character_appearance || ''} ${character.location || ''}`.trim() || 'portrait, high quality, detailed';

      const requestBody: any = {
        character: character.name,
        prompt: prompt,
        negative_prompt: generationSettings?.negative_prompt,
        width: generationSettings?.width,
        height: generationSettings?.height,
        steps: generationSettings?.steps,
        cfg_scale: generationSettings?.cfg_scale,
        use_default_prompts: false
      };
      
      // Добавляем user_id если пользователь авторизован
      if (token && userInfo) {
        requestBody.user_id = userInfo.id;
      }

      const response = await fetch('/api/v1/generate-image/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка генерации фото');
      }

      const result = await response.json();
      
      if (!result.image_url) {
        throw new Error('Не удалось получить изображение');
      }

      const newPhoto: GeneratedPhoto = {
        id: result.image_id || Date.now().toString(),
        url: result.image_url,
        isSelected: false,
        isMain: false
      };
      
      setGeneratedPhotos(prev => [...prev, newPhoto]);
      setSuccess('Фото успешно сгенерировано!');
      
      await checkAuth();
      
    } catch (err) {
      generationFailed = true;
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
    } finally {
      setIsGenerating(false);
      stopFakeProgress(generationFailed);
    }
  };

  // Выбор фото как главного
  const togglePhotoSelection = (photoId: string) => {
    setGeneratedPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, isSelected: !photo.isSelected }
        : photo
    ));
  };

  // Сохранение выбранных фото как главных
  const saveMainPhotos = async () => {
    const selectedPhotosList = generatedPhotos.filter(photo => photo.isSelected);
    
    if (selectedPhotosList.length === 0) {
      setError('Выберите хотя бы одно фото для карточки персонажа');
      return;
    }

    if (selectedPhotosList.length > 3) {
      setError('Можно выбрать максимум 3 фото для карточки персонажа');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      const response = await fetch('/api/v1/characters/set-main-photos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: character.name,
          photo_ids: selectedPhotosList.map(photo => photo.id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка сохранения главных фото');
      }

      setSuccess('Главные фото успешно сохранены!');
      
      // Обновляем статус фото
      setGeneratedPhotos(prev => prev.map(photo => ({
        ...photo,
        isMain: selectedPhotosList.some(selected => selected.id === photo.id)
      })));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения фото');
    }
  };

  // Загрузка существующих фото персонажа
  const loadCharacterPhotos = async () => {
    try {
      console.log(`Loading photos for character: ${character.name}`);
      const response = await fetch(`/api/v1/characters/${character.name}/photos/`);
      console.log(`Response status: ${response.status}`);
      
      if (response.ok) {
        co