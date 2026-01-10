import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { GlobalHeader } from './GlobalHeader';
import '../styles/ContentArea.css';
import { AuthModal } from './AuthModal';
import { LoadingSpinner } from './LoadingSpinner';

const MainContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
`;


const Header = styled.div`
  background: rgba(40, 40, 40, 0.6);
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  border-bottom: 1px solid rgba(150, 150, 150, 0.3);
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
  color: rgba(200, 200, 200, 1);
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
`;

const AuthButton = styled.button`
  background: rgba(60, 60, 60, 0.5);
  border: 1px solid rgba(150, 150, 150, 0.5);
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  margin-left: ${theme.spacing.sm};
  
  &:hover {
    background: rgba(80, 80, 80, 0.7);
    border-color: rgba(180, 180, 180, 0.7);
    color: #ffffff;
  }
  
  &:active {
    transform: scale(0.95);
    background: rgba(50, 50, 50, 0.5);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.variant === 'primary' ? 'rgba(80, 80, 80, 0.7)' : 'rgba(60, 60, 60, 0.5)'};
  border: 1px solid rgba(150, 150, 150, 0.5);
  color: #a8a8a8;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all ${theme.transition.fast};
  
  &:hover {
    background: ${props => props.variant === 'primary' ? 'rgba(100, 100, 100, 0.8)' : 'rgba(80, 80, 80, 0.7)'};
    border-color: rgba(180, 180, 180, 0.7);
    color: #ffffff;
  }
  
  &:active {
    transform: scale(0.95);
    background: rgba(50, 50, 50, 0.5);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: rgba(40, 40, 40, 0.3);
  }
`;

const PromptInput = styled.textarea`
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  width: 100%;
  
  &::placeholder {
    color: rgba(150, 150, 150, 0.7);
  }
  
  &:focus {
    outline: none;
    border-color: rgba(180, 180, 180, 0.6);
    box-shadow: 0 0 0 2px rgba(150, 150, 150, 0.2);
  }
`;

const PromptSection = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: flex-start;
`;

const PromptContainer = styled.div`
  flex: 1;
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
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
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  border: 1px solid rgba(150, 150, 150, 0.3);
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
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  border: 1px solid rgba(150, 150, 150, 0.3);
`;

const SectionTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.lg} 0;
`;

const PhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing.lg};
  margin-bottom: ${theme.spacing.xl};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PhotoCard = styled.div<{ isSelected?: boolean; isMain?: boolean }>`
  position: relative;
  background: rgba(40, 40, 40, 0.5);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 2px solid ${props => 
    props.isMain ? 'rgba(200, 200, 200, 0.8)' : 
    props.isSelected ? 'rgba(180, 180, 180, 0.7)' : 
    'rgba(150, 150, 150, 0.3)'};
  cursor: pointer;
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border-color: rgba(180, 180, 180, 0.6);
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
  color: ${props => props.isMain ? 'rgba(200, 200, 200, 1)' : 'rgba(150, 150, 150, 0.8)'};
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
  const [selectedModel, setSelectedModel] = useState<'anime-realism' | 'anime' | 'realism'>('anime-realism');
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
      
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        
        
      } else {
        
      }
    } catch (error) {
      
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
      } else if (response.status === 401) {
        // Только при 401 пытаемся обновить токен
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await fetch('/api/v1/auth/refresh/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (refreshResponse.ok) {
              const tokenData = await refreshResponse.json();
              localStorage.setItem('authToken', tokenData.access_token);
              if (tokenData.refresh_token) {
                localStorage.setItem('refreshToken', tokenData.refresh_token);
              }
              // Повторяем проверку с новым токеном
              await checkAuth();
              return;
            }
          } catch (refreshError) {
            
          }
        }
        // Если refresh не удался, удаляем токены
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      } else {
        // Для других ошибок не удаляем токены
        
        setIsAuthenticated(false);
      }
    } catch (error) {
      
      setIsAuthenticated(false);
    }
  };

  // Генерация 3 фото
  const generatePhoto = async () => {
    if (!userInfo || userInfo.coins < 90) {
      setError('Недостаточно монет! Нужно 90 монет для генерации 3 фото (30 монет за фото).');
      return;
    }

    setIsGenerating(true);
    setError(null);
    startFakeProgress();

    let generationFailed = false;
    const newPhotos: GeneratedPhoto[] = [];

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      // Используем кастомный промпт или дефолтный
      let basePrompt = customPrompt.trim();
      if (!basePrompt) {
        const parts = [character.character_appearance, character.location].filter(p => p && p.trim());
        basePrompt = parts.length > 0 ? parts.join(' | ') : '';
      }

      // Генерируем 3 фото с разными вариациями промпта
      const prompts = [
        basePrompt,
        `${basePrompt}, style 1`,
        `${basePrompt}, style 2`
      ];

      for (let i = 0; i < 3; i++) {
        const requestBody: any = {
          character: character.name,
          prompt: prompts[i],
          negative_prompt: generationSettings?.negative_prompt,
          width: generationSettings?.width,
          height: generationSettings?.height,
          steps: generationSettings?.steps,
          cfg_scale: generationSettings?.cfg_scale,
          use_default_prompts: false,
          model: selectedModel
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
          throw new Error(errorData.detail || `Ошибка генерации фото ${i + 1}`);
        }

        const result = await response.json();
        
        if (!result.image_url) {
          throw new Error(`Не удалось получить изображение ${i + 1}`);
        }

        const newPhoto: GeneratedPhoto = {
          id: result.image_id || `${Date.now()}-${i}`,
          url: result.image_url,
          isSelected: false,
          isMain: false
        };
        
        newPhotos.push(newPhoto);
        
        // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
        try {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: result.image_url,
              character_name: character?.name || null
            })
          });
          
          if (addToGalleryResponse.ok) {
            
          }
        } catch (galleryError) {
          
        }
      }
      
      setGeneratedPhotos(prev => [...prev, ...newPhotos]);
      setSuccess('3 фото успешно сгенерированы!');
      
      await checkAuth();
      
    } catch (err) {
      generationFailed = true;
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
      // Если хотя бы одно фото сгенерировалось, добавляем его
      if (newPhotos.length > 0) {
        setGeneratedPhotos(prev => [...prev, ...newPhotos]);
      }
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
      
      const response = await fetch(`/api/v1/characters/${character.name}/photos/`);
      
      
      if (response.ok) {
        const photos = await response.json();
        
        
        const formattedPhotos: GeneratedPhoto[] = photos.map((photo: any, index: number) => ({
          id: photo.id || index.toString(),
          url: photo.url,
          isSelected: false,
          isMain: photo.is_main || false
        }));
        
        
        setGeneratedPhotos(formattedPhotos);
      } else {
        
      }
    } catch (error) {
      
    }
  };

  // Обработчики
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.reload();
  };

  const handleFinish = () => {
    onBackToMain();
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    checkAuth();
    loadCharacterPhotos();
    loadGenerationSettings();
  }, []);

useEffect(() => {
  return () => {
    if (fakeProgressIntervalRef.current) {
      clearInterval(fakeProgressIntervalRef.current);
      fakeProgressIntervalRef.current = null;
    }
    if (fakeProgressTimeoutRef.current) {
      clearTimeout(fakeProgressTimeoutRef.current);
      fakeProgressTimeoutRef.current = null;
    }
  };
}, []);


  if (!isAuthenticated) {
    return (
      <MainContainer>
        <div className="content-area vertical">
          <GlobalHeader 
            onShop={onShop}
            leftContent={<Title>Генерация фото персонажа</Title>}
          />
          <MainContent>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Необходимо войти в систему для генерации фото персонажа</p>
            </div>
          </MainContent>
        </div>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      
      <div className="content-area vertical">
        <GlobalHeader 
          onShop={onShop}
          onLogin={() => {
            setAuthMode('login');
            setIsAuthModalOpen(true);
          }}
          onRegister={() => {
            setAuthMode('register');
            setIsAuthModalOpen(true);
          }}
          onLogout={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            window.location.reload();
          }}
          onProfile={onProfile}
          onBalance={() => alert('Баланс пользователя')}
          leftContent={<Title>Генерация фото персонажа</Title>}
        />
        
        <MainContent>
          <CharacterInfo>
            <CharacterName>{character.name}</CharacterName>
            <CharacterDescription>{character.description}</CharacterDescription>
          </CharacterInfo>

          <GenerationSection>
            <SectionTitle>Генерация 3 фото для карточки персонажа (90 монет - 30 за каждое фото)</SectionTitle>
            
            <PromptSection>
              <PromptContainer>
                <PromptLabel htmlFor="custom-prompt">Промпт для генерации:</PromptLabel>
                <PromptInput
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={(() => {
                    const parts = [character.character_appearance, character.location].filter(p => p && p.trim());
                    return parts.length > 0 ? parts.join(' | ') : '';
                  })()}
                />
              </PromptContainer>
              
              <PromptContainer>
                <PromptLabel htmlFor="model-select">Модель генерации:</PromptLabel>
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'anime-realism' | 'anime' | 'realism')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(40, 40, 40, 0.5)',
                    border: '1px solid rgba(100, 100, 100, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="anime-realism">Сочетание аниме и реалистичных текстур</option>
                  <option value="anime">Классический аниме стиль</option>
                  <option value="realism">Максимальная фотореалистичность</option>
                </select>
              </PromptContainer>
              
              <GenerateSection>
              <Button 
                onClick={generatePhoto} 
                disabled={isGenerating || !userInfo || userInfo.coins < 90}
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" /> Генерация 3 фото... {fakeProgress}%
                  </>
                ) : (
                  'Сгенерировать'
                )}
              </Button>
              </GenerateSection>
            </PromptSection>

            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}

            {generatedPhotos.length > 0 && (
              <>
                <SectionTitle>Выберите главные фото для карточки (максимум 3)</SectionTitle>
                
                <PhotosGrid>
                  {generatedPhotos.map((photo) => (
                    <PhotoCard 
                      key={photo.id}
                      isSelected={photo.isSelected}
                      isMain={photo.isMain}
                      onClick={() => togglePhotoSelection(photo.id)}
                    >
                      <PhotoImage 
                        src={photo.url} 
                        alt="Generated photo"
                        loading="lazy"
                        onError={(e) => {
                          
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <PhotoActions>
                        <PhotoStatus isMain={photo.isMain}>
                          {photo.isMain ? 'Главное фото' : 'Дополнительное'}
                        </PhotoStatus>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo.id);
                          }}
                        >
                          {photo.isSelected ? 'Выбрано' : 'Выбрать'}
                        </Button>
                      </PhotoActions>
                    </PhotoCard>
                  ))}
                </PhotosGrid>

                <ActionButtons>
                  <Button 
                    onClick={saveMainPhotos}
                    disabled={generatedPhotos.filter(p => p.isSelected).length === 0}
                  >
                    Сохранить главные фото
                  </Button>
                  <Button 
                    onClick={handleFinish}
                  >
                    Завершить
                  </Button>
                </ActionButtons>
              </>
            )}
          </GenerationSection>
        </MainContent>
      </div>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setIsAuthenticated(true);
            setIsAuthModalOpen(false);
            setAuthMode('login');
            window.location.reload();
          }}
        />
      )}
    </MainContainer>
  );
};
