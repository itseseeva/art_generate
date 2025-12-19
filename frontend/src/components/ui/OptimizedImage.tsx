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
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt = '',
  className,
  style,
  onLoad,
  onError,
  eager = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setIsLoading(false);
    setHasLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  const handleError = () => {
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

  return (
    <ImageContainer 
      $isLoading={isLoading} 
      $hasLoaded={hasLoaded}
      className={className}
      style={style}
    >
      {isLoading && !hasLoaded && !hasError && <Skeleton />}
      <StyledImage
        ref={imgRef}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        $hasLoaded={hasLoaded}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          display: hasError ? 'none' : 'block',
          opacity: hasLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
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
