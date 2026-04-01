import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiPlay, FiCheck, FiX, FiVideo, FiLoader } from 'react-icons/fi';
import { theme } from '../theme';
import { authManager } from '../utils/auth';

const PageContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: white;
  min-height: 100%;
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
`;

const UploadArea = styled.div<{ $hasImage: boolean }>`
  aspect-ratio: 16/9;
  border: 2px dashed ${props => props.$hasImage ? 'rgba(167, 139, 250, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  background: ${props => props.$hasImage ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.02)'};

  &:hover {
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.05);
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  
  &:hover {
    background: #ef4444;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
`;

const QualityToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 0.75rem;
  border-radius: 10px;
  border: none;
  background: ${props => props.$active ? '#a78bfa' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const DurationList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const DurationButton = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid ${props => props.$active ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)'};
  background: ${props => props.$active ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  color: ${props => props.$active ? '#a78bfa' : 'rgba(255, 255, 255, 0.7)'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #a78bfa;
    color: #a78bfa;
  }
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 1rem;
  color: white;
  font-family: inherit;
  resize: none;
  min-height: 120px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #a78bfa;
    background: rgba(255, 255, 255, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  border: none;
  border-radius: 16px;
  padding: 1.25rem;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
  position: relative;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ProgressOverlay = styled.div`
  margin-top: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${props => props.$percent}%;
  height: 100%;
  background: linear-gradient(90deg, #a78bfa, #7c3aed);
  transition: width 0.3s ease;
`;

const VideoResult = styled.video`
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  margin-top: 1.5rem;
`;

const ErrorMsg = styled.div`
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 1rem;
  border-radius: 12px;
  margin-top: 1rem;
  font-size: 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const AnimatePhotoPage: React.FC = () => {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [duration, setDuration] = useState<number>(3);
  const [prompt, setPrompt] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await authManager.fetchWithAuth(`/api/v1/runpod/status/${id}`);
        if (!response.ok) throw new Error('Failed to check status');
        
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'SUCCESS') {
          clearInterval(interval);
          setVideoUrl(data.result.video_url || data.result.video);
          setIsGenerating(false);
          setProgress(100);
          setStatusText(t('common.done') || 'Done!');
        } else if (data.status === 'failed' || data.status === 'FAILURE') {
          clearInterval(interval);
          setError(data.error || 'Generation failed');
          setIsGenerating(false);
        } else if (data.status === 'generating' || data.status === 'PROGRESS') {
          const p = data.result?.progress || 0;
          setProgress(p);
          setStatusText(`${t('chat.generating') || 'Generating'}... ${p}%`);
        } else {
          setStatusText(t('chat.inQueue') || 'In Queue...');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const handleAnimate = async () => {
    if (!image) return;
    
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setVideoUrl(null);
    setStatusText(t('chat.starting') || 'Starting...');

    try {
      const numFrames = duration * 16 + 1;
      const response = await authManager.fetchWithAuth('/api/v1/runpod/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: image.split(',')[1],
          prompt: prompt || 'cinematic motion, smooth animation, high quality',
          num_frames: numFrames,
          width: 832,
          height: 480,
          quality: quality
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start generation');
      }

      const data = await response.json();
      setTaskId(data.task_id);
      pollStatus(data.task_id);
      
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImage(null);
  };

  return (
    <PageContainer>
      <Header>
        <Title>{t('animatePhoto.title')}</Title>
        <Subtitle>{t('animatePhoto.subtitle') || 'Transform your static photos into living animations'}</Subtitle>
      </Header>

      <MainGrid>
        <Card>
          <FormGroup>
            <Label>{t('animatePhoto.selectImage')}</Label>
            <UploadArea $hasImage={!!image} onClick={() => document.getElementById('image-upload')?.click()}>
              <input 
                type="file" 
                id="image-upload" 
                hidden 
                accept="image/*" 
                onChange={onFileChange} 
              />
              {image ? (
                <>
                  <PreviewImage src={image} alt="Preview" />
                  <RemoveImageButton onClick={removeImage}>
                    <FiX size={18} />
                  </RemoveImageButton>
                </>
              ) : (
                <>
                  <FiUpload size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                    Click to upload or drag & drop
                  </span>
                </>
              )}
            </UploadArea>
          </FormGroup>
        </Card>

        <Card>
          <FormGroup>
            <Label>{t('animatePhoto.quality')}</Label>
            <QualityToggle>
              <ToggleButton 
                $active={quality === 'standard'} 
                onClick={() => setQuality('standard')}
              >
                {t('animatePhoto.standard')}
              </ToggleButton>
              <ToggleButton 
                $active={quality === 'high'} 
                onClick={() => setQuality('high')}
              >
                {t('animatePhoto.high')}
              </ToggleButton>
            </QualityToggle>
          </FormGroup>

          <FormGroup>
            <Label>{t('animatePhoto.seconds')}</Label>
            <DurationList>
              {[2, 3, 4, 5, 6, 7].map((s) => (
                <DurationButton 
                  key={s} 
                  $active={duration === s} 
                  onClick={() => setDuration(s)}
                >
                  {s}s
                </DurationButton>
              ))}
            </DurationList>
          </FormGroup>

          <FormGroup>
            <Label>{t('animatePhoto.prompt')}</Label>
            <TextArea 
              placeholder={t('animatePhoto.placeholder')} 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </FormGroup>

          <ActionButton 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            disabled={!image || isGenerating}
            onClick={handleAnimate}
          >
            {isGenerating ? (
              <FiLoader className="spin" size={20} />
            ) : (
              <FiVideo size={20} />
            )}
            {isGenerating ? `${t('chat.generating') || 'Generating'}...` : t('animatePhoto.animate')}
          </ActionButton>

          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ProgressOverlay>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>{statusText}</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar>
                    <ProgressFill $percent={progress} />
                  </ProgressBar>
                </ProgressOverlay>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <ErrorMsg>{error}</ErrorMsg>
              </motion.div>
            )}

            {videoUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div style={{ marginTop: '2rem' }}>
                  <Label style={{ display: 'block', textAlign: 'center', marginBottom: '1rem' }}>
                    {t('common.result') || 'Result'}
                  </Label>
                  <VideoResult controls src={videoUrl} autoPlay loop />
                  <ActionButton 
                    style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}
                    onClick={() => window.open(videoUrl, '_blank')}
                  >
                    <FiUpload size={18} />
                    {t('common.download') || 'Download'}
                  </ActionButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </MainGrid>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 2s linear infinite;
        }
      `}</style>
    </PageContainer>
  );
};

export default AnimatePhotoPage;
