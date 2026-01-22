import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { FiX, FiCopy, FiCheck } from 'react-icons/fi';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalContent = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  max-height: 90vh;
  gap: 24px;
  position: relative;
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    max-height: 95vh;
    gap: 16px;
  }
`;

const ImageContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
  border-radius: 16px;
  overflow: hidden;
  
  img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: center;
    border-radius: 12px;
  }
  
  @media (max-width: 768px) {
    max-height: 50vh;
    
    img {
      max-width: 100vw;
      max-height: 50vh;
    }
  }
`;

const GlassCard = styled.div<{ $isVisible: boolean }>`
  width: 420px;
  max-height: 85vh;
  background: rgba(20, 20, 25, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideInRight} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  opacity: ${props => props.$isVisible ? 1 : 0};
  transform: ${props => props.$isVisible ? 'translateX(0)' : 'translateX(30px)'};
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  @media (max-width: 768px) {
    width: 100%;
    max-height: 45vh;
    border-radius: 16px;
  }
`;

const CardHeader = styled.div`
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const Title = styled.h3`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const IconButton = styled.button<{ $variant?: 'copy' | 'close' }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${props => props.$variant === 'copy' 
    ? 'rgba(139, 92, 246, 0.15)' 
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$variant === 'copy'
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$variant === 'copy' ? '#a78bfa' : 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$variant === 'copy'
      ? 'rgba(139, 92, 246, 0.25)'
      : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.$variant === 'copy'
      ? 'rgba(139, 92, 246, 0.5)'
      : 'rgba(255, 255, 255, 0.2)'};
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const CardBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 3px;
    
    &:hover {
      background: rgba(139, 92, 246, 0.5);
    }
  }
`;

const PromptText = styled.div`
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace;
  letter-spacing: 0.2px;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
`;

const ErrorText = styled.div`
  color: rgba(239, 68, 68, 0.9);
  font-size: 14px;
  text-align: center;
  padding: 40px 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(20, 20, 25, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10003;
  
  &:hover {
    background: rgba(20, 20, 25, 0.95);
    border-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
    color: rgba(255, 255, 255, 0.9);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

interface PromptGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt?: string;
  promptText: string | null;
  isLoading?: boolean;
  error?: string | null;
}

export const PromptGlassModal: React.FC<PromptGlassModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageAlt = 'Image',
  promptText,
  isLoading = false,
  error = null,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(true);

  const handleCopy = async () => {
    if (promptText) {
      try {
        await navigator.clipboard.writeText(promptText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
      }
    }
  };

  const handleClosePrompt = () => {
    setIsPromptVisible(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <ModalOverlay onClick={onClose}>
      <CloseButton onClick={onClose}>
        <FiX />
      </CloseButton>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ImageContainer>
          <img src={imageUrl} alt={imageAlt} />
        </ImageContainer>
        {isPromptVisible && (
          <GlassCard $isVisible={isPromptVisible}>
            <CardHeader>
              <Title>Промпт</Title>
              <HeaderButtons>
                {promptText && !isLoading && !error && (
                  <IconButton $variant="copy" onClick={handleCopy} title="Скопировать">
                    {isCopied ? <FiCheck /> : <FiCopy />}
                  </IconButton>
                )}
                <IconButton onClick={handleClosePrompt} title="Скрыть промпт">
                  <FiX />
                </IconButton>
              </HeaderButtons>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <LoadingText>Загрузка промпта...</LoadingText>
              ) : error ? (
                <ErrorText>{error}</ErrorText>
              ) : promptText ? (
                <PromptText>{promptText}</PromptText>
              ) : (
                <LoadingText>Промпт не найден</LoadingText>
              )}
            </CardBody>
          </GlassCard>
        )}
        {!isPromptVisible && (
          <IconButton
            $variant="copy"
            onClick={() => setIsPromptVisible(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '80px',
              width: '140px',
              height: '44px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            Показать промпт
          </IconButton>
        )}
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};
