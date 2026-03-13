import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { OptimizedImage } from './ui/OptimizedImage';

// Mock photos for the test
const MOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&h=700&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&h=700&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=700&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=700&fit=crop',
];

const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 40px;
  background: #0f0f13;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 40px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  max-width: 1000px;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const CardTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #e9d5ff;
`;

const CardContainer = styled.div`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 20px;
  padding: 0;
  position: relative;
  overflow: hidden;
  height: 339px;
  width: 231px;
  border: 2px solid rgba(139, 92, 246, 0.2);
`;

const PhotoContainer = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 20px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

// --- ANIMATION REUSABLE COMPONENT ---

const slideAnimationConfigs = {
  // 1. Ken Burns (Premium / Tinder Gold style)
  cinematic: {
    variants: {
      initial: { opacity: 0, scale: 1.15 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
    transition: {
      duration: 1.5,
      ease: 'easeOut' as const,
      exit: { duration: 0.8, ease: 'easeIn' as const },
    },
    perspective: false,
  },
  // 2. 3D Card Stack (Depth effect)
  stack3d: {
    variants: {
      initial: { opacity: 0, y: 50, scale: 0.8, rotateX: -20 },
      animate: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
      exit: { opacity: 0, y: -50, scale: 1.05, rotateX: 20 },
    },
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number], // Custom spring-like easing
      exit: { duration: 0.5, ease: 'easeIn' as const },
    },
    perspective: true,
  },
  // 3. Glass Wipe (Diagonal mask wipe)
  glassWipe: {
    variants: {
      initial: { clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)', filter: 'blur(10px)', opacity: 0.5 },
      animate: { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', filter: 'blur(0px)', opacity: 1 },
      exit: { clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)', filter: 'blur(5px)', opacity: 0 },
    },
    transition: {
      duration: 1.0,
      ease: 'easeInOut' as const,
    },
    perspective: false,
  },
  // 4. Dynamic Flash / Motion Blur (Energetic)
  dynamicFlash: {
    variants: {
      initial: { x: '50%', filter: 'blur(20px) brightness(2)', opacity: 0 },
      animate: { x: '0%', filter: 'blur(0px) brightness(1)', opacity: 1 },
      exit: { x: '-50%', filter: 'blur(20px) brightness(0.5)', opacity: 0 },
    },
    transition: {
      duration: 0.6,
      ease: 'circOut' as const,
      exit: { duration: 0.4, ease: 'circIn' as const },
    },
    perspective: false,
  },
  // 5. Fade & Scale Down (Элегантное уменьшение)
  fadeScale: {
    variants: {
      initial: { opacity: 0, scale: 1.1 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    transition: { duration: 0.8, ease: 'easeInOut' as const },
    perspective: false,
  },
  // 6. 3D Flip (Переворот карточки по Y)
  flip3d: {
    variants: {
      initial: { opacity: 0, rotateY: -90, scale: 0.9 },
      animate: { opacity: 1, rotateY: 0, scale: 1 },
      exit: { opacity: 0, rotateY: 90, scale: 0.9 },
    },
    transition: { duration: 0.7, ease: 'backOut' as const },
    perspective: true,
  },
  // 7. Push Reveal (Новое фото выталкивает старое снизу)
  pushReveal: {
    variants: {
      initial: { y: '100%', opacity: 1 },
      animate: { y: '0%', opacity: 1 },
      exit: { y: '-30%', opacity: 0.5, filter: 'brightness(0.5)' },
    },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    perspective: false,
  },
  // 8. Cyber Glitch (Сдвиг RGB-каналов + скачок)
  glitch: {
    variants: {
      initial: { x: '-5%', filter: 'hue-rotate(90deg) contrast(200%)', opacity: 0 },
      animate: { x: '0%', filter: 'hue-rotate(0deg) contrast(100%)', opacity: 1 },
      exit: { x: '5%', filter: 'hue-rotate(-90deg) contrast(200%) blur(2px)', opacity: 0 },
    },
    transition: { duration: 0.4, ease: 'anticipate' as const },
    perspective: false,
  },
  // 9. Diagonal Slice (Диагональное движение сверху-слева)
  diagonalSlice: {
    variants: {
      initial: { x: '-20%', y: '-20%', opacity: 0 },
      animate: { x: '0%', y: '0%', opacity: 1 },
      exit: { x: '20%', y: '20%', opacity: 0 },
    },
    transition: { duration: 0.6, ease: 'easeOut' as const },
    perspective: false,
  },
  // 10. Circle Reveal (Раскрытие кругом из центра)
  circleReveal: {
    variants: {
      initial: { clipPath: 'circle(0% at 50% 50%)', scale: 1.2 },
      animate: { clipPath: 'circle(150% at 50% 50%)', scale: 1 },
      exit: { opacity: 0 },
    },
    transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    perspective: false,
  },
  // 11. Perspective Door (Открытие как дверь)
  doorWipe: {
    variants: {
      initial: { rotateY: 90, originX: 0, opacity: 0 },
      animate: { rotateY: 0, opacity: 1 },
      exit: { rotateY: -90, originX: 1, opacity: 0 },
    },
    transition: { duration: 0.8, ease: 'easeOut' as const },
    perspective: true,
  },
  // 12. Liquid Drop (Капля падает и расплывается)
  liquidDrop: {
    variants: {
      initial: { y: '-50%', scaleY: 1.5, filter: 'blur(10px)', opacity: 0 },
      animate: { y: '0%', scaleY: 1, filter: 'blur(0px)', opacity: 1 },
      exit: { opacity: 0, filter: 'blur(5px) drop-shadow(0 10px 10px rgba(0,0,0,0.5))' },
    },
    transition: { duration: 0.6, type: 'spring' as const, bounce: 0.5 },
    perspective: false,
  },
  // 13. Horizontal Pixelate (Синтетический эффект)
  horizontalPan: {
    variants: {
      initial: { x: '100%', opacity: 1 },
      animate: { x: '0%', opacity: 1 },
      exit: { x: '-100%', opacity: 1 },
    },
    transition: { duration: 0.7, ease: 'easeInOut' as const },
    perspective: false,
  },
  // 14. Shrink & Spin (Уменьшение с мини-вращением)
  shrinkSpin: {
    variants: {
      initial: { scale: 1.5, rotate: 10, opacity: 0 },
      animate: { scale: 1, rotate: 0, opacity: 1 },
      exit: { scale: 0.5, rotate: -10, opacity: 0 },
    },
    transition: { duration: 0.6, ease: 'backOut' as const },
    perspective: false,
  },
};

const TestSlideShow: React.FC<{ type: keyof typeof slideAnimationConfigs }> = ({ type }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % MOCK_PHOTOS.length);
    }, 3500); // 3.5 seconds per slide to see the effect well
    return () => clearInterval(interval);
  }, []);

  const config = slideAnimationConfigs[type];

  return (
    <CardContainer>
      <PhotoContainer>
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          borderRadius: 'inherit',
          perspective: config.perspective ? '1000px' : undefined,
        }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentSlide}
              variants={config.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={config.transition}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                willChange: 'transform, opacity, filter, clip-path',
                transformStyle: config.perspective ? 'preserve-3d' : undefined,
                transformOrigin: 'center center',
              }}
            >
              <OptimizedImage
                src={MOCK_PHOTOS[currentSlide]}
                alt="Test Slide"
                eager={true}
                sizes="231px"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </PhotoContainer>
    </CardContainer>
  );
};

export const AnimationsTestPage: React.FC = () => {
  return (
    <PageWrapper>
      <Title>Анимации смены фото</Title>
      
      <Grid>
        <CardWrapper>
          <CardTitle>1. Cinematic Ken Burns</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Премиум эффект (Tinder Gold), медленный зум-аут</p>
          <TestSlideShow type="cinematic" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>2. 3D Card Stack</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Эффект перелистывания объёмных карточек</p>
          <TestSlideShow type="stack3d" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>3. Glass Wipe</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Появление через шторку с размытием</p>
          <TestSlideShow type="glassWipe" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>4. Dynamic Flash</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Энергичный влёт с моушн-блюром и вспышкой</p>
          <TestSlideShow type="dynamicFlash" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>5. Fade & Scale</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Плавное затухание с легким уменьшением (база)</p>
          <TestSlideShow type="fadeScale" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>6. 3D Flip</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Резкий переворот карточки вокруг оси Y</p>
          <TestSlideShow type="flip3d" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>7. Push Reveal</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Новое фото выталкивает старое снизу вверх</p>
          <TestSlideShow type="pushReveal" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>8. Cyber Glitch</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Резкий киберпанк-скачок с изменением цвета</p>
          <TestSlideShow type="glitch" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>9. Diagonal Slice</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Динамичный выезд по диагонали</p>
          <TestSlideShow type="diagonalSlice" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>10. Circle Reveal</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Мягкое раскрытие из центра круглым окном</p>
          <TestSlideShow type="circleReveal" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>11. Perspective Door</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Открытие как створка двери (с перспективой)</p>
          <TestSlideShow type="doorWipe" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>12. Liquid Drop</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Эффект пружинящей "водяной капли", которая шмякается</p>
          <TestSlideShow type="liquidDrop" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>13. Horizontal Pan</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Классический слайдер (свайп влево-вправо)</p>
          <TestSlideShow type="horizontalPan" />
        </CardWrapper>

        <CardWrapper>
          <CardTitle>14. Shrink & Spin</CardTitle>
          <p style={{fontSize: '12px', color: '#9ca3af', textAlign: 'center'}}>Игривое появление с микро-вращением</p>
          <TestSlideShow type="shrinkSpin" />
        </CardWrapper>
      </Grid>
    </PageWrapper>
  );
};
