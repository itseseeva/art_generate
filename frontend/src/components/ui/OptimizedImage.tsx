import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const ImageContainer = styled.div<{ $isLoading: boolean; $hasLoaded: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  background: rgba(22, 33, 62, 0.3);
  border-radius: 8px;
  overflow: hidden;
  
  ${props => props.$isLoading && !props.$hasLoaded && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const Skeleton = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(40, 40, 40, 0.3) 0%,
    rgba(60, 60, 60, 0.5) 50%,
    rgba(40, 40, 40, 0.3) 100%
  );
  background-size: 200% 100%;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const StyledImage = styled.img<{ $hasLoaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: ${props => props.$hasLoaded ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
  background: rgba(22, 33, 62, 0.3);
  
  ${props => props.$hasLoaded && css`
    animation: ${fadeIn} 0.3s ease-in-out;
  `}
`;

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  eager?: boolean;
  sizes?: string;
  priority?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt = '',
  className,
  style,
  onLoad,
  onError,
  eager = false,
  sizes,
  priority = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(eager || priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLoad = () => {
    setIsLoading(false);
    setHasLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  const handleError = (e?: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Подавляем ошибки загрузки изображений в консоль
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError();
    }
  };

  // Сброс состояния при изменении src
  useEffect(() => {
    setIsLoading(true);
    setHasLoaded(false);
    setHasError(false);
  }, [src]);

  // Устанавливаем fetchPriority напрямую в нативный элемент
  useEffect(() => {
    if (imgRef.current && priority) {
      imgRef.current.setAttribute('fetchpriority', 'high');
    }
  }, [priority]);

  // Проверяем, загружено ли изображение уже (например, из кеша)
  useEffect(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      // Если изображение уже загружено (из кеша), сразу показываем его
      if (img.complete && img.naturalWidth > 0) {
        setIsLoading(false);
        setHasLoaded(true);
        if (onLoad) {
          onLoad();
        }
      }
    }
  }, [src, onLoad]);

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!containerRef.current || eager || priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '200px', // Начинаем загрузку за 200px до появления
        threshold: 0.01
      }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [eager, priority, shouldLoad]);

  // Оптимизация: генерируем WebP fallback URL только для локальных файлов
  const optimizedSrc = React.useMemo(() => {
    // Отключаем WebP оптимизацию для прокси URL (/media/) так как изображения на Yandex.Cloud в формате PNG
    if (src.includes('/media/') || src.includes('storage.yandexcloud.net')) {
      return src;
    }
    
    if (src.includes('generated') && !src.includes('.webp')) {
      return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return src;
  }, [src]);

  return (
    <ImageContainer 
      ref={containerRef}
      $isLoading={isLoading} 
      $hasLoaded={hasLoaded}
      className={className}
      style={style}
    >
      {(isLoading || !shouldLoad) && !hasLoaded && !hasError && <Skeleton />}
      {shouldLoad && src && (
        <picture>
          <source srcSet={optimizedSrc} type="image/webp" />
          <StyledImage
            ref={imgRef}
            src={src}
            alt={alt}
            loading={eager || priority ? "eager" : "lazy"}
            decoding="async"
            sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            $hasLoaded={hasLoaded}
            onLoad={handleLoad}
            onError={handleError}
            style={{ 
              display: hasError ? 'none' : 'block',
              opacity: hasLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
              willChange: hasLoaded ? 'auto' : 'opacity'
            }}
          />
        </picture>
      )}
      {hasError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(40, 40, 40, 0.5)',
          color: 'rgba(180, 180, 180, 0.8)',
          fontSize: '0.875rem',
        }}>
          Ошибка загрузки
        </div>
      )}
    </ImageContainer>
  );
};
