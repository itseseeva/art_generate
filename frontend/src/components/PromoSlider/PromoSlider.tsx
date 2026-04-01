import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Zap, CheckCircle } from 'lucide-react';
import { CountdownTimer } from './CountdownTimer';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';
import { authManager } from '../../utils/auth';
import { usePromoTimer } from '../../hooks/usePromoTimer';

// --- Styled Components ---

const SliderContainer = styled.div`
  width: 100%;
  position: relative;
  margin: 1.5rem 0;
  border-radius: 20px;
  overflow: hidden;
  min-height: 300px;
  background: #141416;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    min-height: 210px;
    margin: 1rem 0;
  }
`;

const SlideWrapper = styled(motion.div)`
  width: 100%;
  height: 100%;
  padding: 2rem 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  cursor: pointer;

  @media (max-width: 768px) {
    padding: 1.5rem;
    flex-direction: column;
    text-align: center;
    justify-content: center;
  }
`;

const SlideBackground = styled.div<{ src: string }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${props => props.src});
  background-size: cover;
  background-position: center;
  z-index: 1;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(20, 20, 22, 0.8) 0%, rgba(20, 20, 22, 0.4) 50%, rgba(20, 20, 22, 0.7) 100%);
  }
`;

const ContentPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  max-width: 500px;
  z-index: 10;
  position: relative;

  @media (max-width: 768px) {
    max-width: 100%;
    align-items: center;
  }
`;





const NavButton = styled.button<{ position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.position}: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.3s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    ${props => props.position}: 0.5rem;
  }
`;

const DotsContainer = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 20;
`;

const Dot = styled.button<{ active: boolean }>`
  width: ${props => props.active ? '24px' : '8px'};
  height: 8px;
  border-radius: 4px;
  border: none;
  background: ${props => props.active ? '#a855f7' : 'rgba(255, 255, 255, 0.3)'};
  cursor: pointer;
  transition: all 0.3s;
`;

// --- Component ---

interface Slide {
  id: number;
  image_url: string;
  image_url_en: string;
  target_url: string;
  show_timer: boolean;
}

export const PromoSlider: React.FC = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const navigate = useNavigate();
  const { hasDiscount } = usePromoTimer();
  const [slides, setSlides] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
        try {
            const { userInfo } = await authManager.checkAuth();
            setIsAdmin(!!userInfo?.is_admin);
        } catch (e) {}
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/promo-slider/`);
        setSlides(response.data);
      } catch (err) {
        console.error('Failed to fetch slides:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
  }, []);

  const displayedSlides = slides;

  useEffect(() => {
    if (displayedSlides.length <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [displayedSlides.length, currentIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % displayedSlides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + displayedSlides.length) % displayedSlides.length);
  };

  if (loading) return null;
  
  if (displayedSlides.length === 0) {
    if (!isAdmin) return null;
    
    return (
      <SliderContainer style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.dispatchEvent(new Event('navigate-to-admin-slider'))}>
         <div style={{ textAlign: 'center', opacity: 0.8 }}>
            <Zap size={40} style={{ marginBottom: '10px', color: '#a855f7' }} />
            <h3 style={{ margin: 0 }}>{currentLang === 'ru' ? 'Слайдер пуст. Нажмите, чтобы добавить первый слайд' : 'Slider is empty. Click to add your first slide'}</h3>
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{currentLang === 'ru' ? '(Это сообщение видите только вы, как администратор)' : '(Only you, as an admin, see this message)'}</p>
         </div>
      </SliderContainer>
    );
  }

  // Ensure currentIndex is within bounds of displayedSlides
  const safeIndex = currentIndex % displayedSlides.length;
  const currentSlide = displayedSlides[safeIndex];

  return (
    <SliderContainer>
      <AnimatePresence mode="wait">
        <SlideWrapper
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          onClick={() => {
            let url = currentSlide.target_url || `/${currentLang}/register`;
            url = url.trim();
            if (url.startsWith('http') || url.startsWith('https') || url.startsWith('//')) {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              navigate(url);
            }
          }}
        >
          <SlideBackground src={currentLang === 'en' && currentSlide.image_url_en ? currentSlide.image_url_en : currentSlide.image_url} />
          
          {currentSlide.show_timer && (
            <div style={{
              position: 'absolute',
              top: '1.2rem',
              right: '1.2rem',
              zIndex: 9999, /* Максимальный приоритет */
              pointerEvents: 'none' /* Чтобы не мешал кликать по баннеру */
            }}>
              <CountdownTimer />
            </div>
          )}

          <ContentPanel>
            {/* CountdownTimer removed from here */}
          </ContentPanel>
        </SlideWrapper>
      </AnimatePresence>

      {slides.length > 1 && (
        <>
          <NavButton position="left" onClick={prevSlide}>
            <ChevronLeft />
          </NavButton>
          <NavButton position="right" onClick={nextSlide}>
            <ChevronRight />
          </NavButton>
          <DotsContainer>
            {slides.map((_, idx) => (
              <Dot 
                key={idx} 
                active={idx === currentIndex} 
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </DotsContainer>
        </>
      )}
    </SliderContainer>
  );
};
