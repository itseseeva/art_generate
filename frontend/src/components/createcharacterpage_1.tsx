import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import { CompactSidebar } from './CompactSidebar';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: transparent;
  overflow: visible;
  box-sizing: border-box;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: visible;
  width: calc(100vw - 80px);
  min-width: 0;
`;

const Header = styled.div`
  background: rgba(102, 126, 234, 0.1);
  backdrop-filter: blur(3px);
  padding: ${theme.spacing.lg} ${theme.spacing.xl};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${theme.colors.border.accent};
  z-index: 10;
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.md};
  cursor: pointer;
  transition: color ${theme.transition.fast};
  
  &:hover {
    color: ${theme.colors.text.primary};
  }
`;

const PageTitle = styled.h2`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  margin: 0;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.accent};
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
  position: relative;
  
  /* Градиентный текст */
  background: linear-gradient(135deg, #a8a8a8, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    
    /* Более яркий градиент при hover */
    background: linear-gradient(135deg, #ffffff, rgba(102, 126, 234, 0.9));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    /* Показываем светящуюся линию */
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const MainContent = styled.div`
  flex: 1;
  padding: 0;
  overflow-y: auto;
  display: flex;
  gap: 0;
  width: 100%;
  height: 100%;
`;

const LeftColumn = styled.div`
  flex: 1; /* Равная ширина с правым столбцом */
  min-width: 0;
  min-height: calc(150vh - 80px); /* Увеличиваем высоту столбцов */
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 0;
  padding: 0;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: ${theme.colors.shadow.message};
  display: flex;
  flex-direction: column;
`;

const RightColumn = styled.div`
  flex: 1; /* Равная ширина с левым столбцом */
  min-width: 0;
  min-height: calc(150vh - 80px); /* Увеличиваем высоту столбцов */
  background: transparent; /* Убираем фон чтобы был виден основной фон */
  backdrop-filter: none; /* Убираем размытие */
  border-radius: 0;
  padding: 0;
  border: 1px solid ${theme.colors.border.accent};
  box-shadow: none; /* Убираем тень */
  display: flex;
  flex-direction: column;
`;

const ThirdColumn = styled.div`
  display: none; /* Скрываем третий столбец */
`;

const Form = styled.form`
  display: contents;
`;

const ColumnContent = styled.div`
  padding: ${theme.spacing.md} ${theme.spacing.sm};
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.md};
  border: none;
  border-radius: ${theme.borderRadius.md};
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
  
  &:focus {
    outline: none;
    background: rgba(22, 33, 62, 0.5);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.accent};
  border-radius: ${theme.borderRadius.md};
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.sm};
  font-family: inherit;
  resize: vertical;
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(45deg, #764ba2 50%, #4a0000 50%) 1;
  color: #a8a8a8;
  padding: ${theme.spacing.md} ${theme.spacing.xl};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  cursor: pointer;
  transition: transform ${theme.transition.fast};
  position: relative;
  
  /* Градиентный текст */
  background: linear-gradient(135deg, #a8a8a8, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  /* Светящаяся линия снизу */
  &::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.8), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(1px);
  }
  
  &:hover {
    transform: scale(1.05);
    border-image: linear-gradient(45deg, #8b5cf6 50%, #7f1d1d 50%) 1;
    
    /* Более яркий градиент при hover */
    background: linear-gradient(135deg, #ffffff, rgba(102, 126, 234, 0.9));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    
    /* Показываем светящуюся линию */
    &::after {
      opacity: 1;
    }
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    
    &::after {
      opacity: 0;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  justify-content: center;
`;

const CoinsDisplay = styled.div`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(5px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.accent};
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const CoinsText = styled.span`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
`;

const PhotoGenerationBox = styled.div`
  background: rgba(22, 33, 62, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.lg} 0;
  text-align: center;
`;

const PhotoGenerationBoxTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm} 0;
`;

const PhotoGenerationDescription = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  margin: 0 0 ${theme.spacing.md} 0;
  line-height: 1.4;
`;

const PhotoGenerationPlaceholder = styled.div`
  background: rgba(22, 33, 62, 0.3);
  border: 1px solid ${theme.colors.border.accent}; /* Сплошная обводка как у столбцов */
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
  min-height: calc(120vh - 300px); /* Увеличиваем высоту области для фото */
  display: flex;
  align-items: center;
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

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: ${theme.colors.accent.primary};
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const HintDescription = styled.span`
  color: ${theme.colors.text.secondary};
`;

const PhotoModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${theme.spacing.xl};
`;

const PhotoModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
`;

const PhotoModalImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: ${theme.borderRadius.lg};
`;

const PhotoModalClose = styled.button`
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: ${theme.fontSize.xl};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const PhotosContainer = styled.div`
  position: relative;
  width: 100%;
  height: 400px; /* Фиксированная высота чтобы столбец не менял размеры */
`;

const SwiperContainer = styled.div`
  position: relative;
  overflow: hidden;
  height: 100%;
`;

const SwiperWrapper = styled.div<{ translateX: number }>`
  display: flex;
  transition: transform 0.3s ease;
  transform: translateX(${props => props.translateX}px);
  height: 100%;
`;

const SwiperSlide = styled.div`
  min-width: 200px;
  margin-right: ${theme.spacing.md};
  height: 100%;
  
  &:last-child {
    margin-right: 0;
  }
`;

const SwiperButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction === 'left' ? 'left: -20px' : 'right: -20px'};
  transform: translateY(-50%);
  background: rgba(102, 126, 234, 0.8);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSize.lg};
  z-index: 10;
  
  &:hover {
    background: rgba(102, 126, 234, 1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FullSizePhotoSlider = styled.div`
  position: relative;
  width: 100%;
  height: 700px; /* Высота для описания без превью */
`;

const SliderButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction === 'left' ? 'left: -20px' : 'right: -20px'};
  transform: translateY(-50%);
  background: rgba(102, 126, 234, 0.8);
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  z-index: 10;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(102, 126, 234, 1);
    transform: translateY(-50%) scale(1.1);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const SliderContainer = styled.div`
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
`;

const SliderWrapper = styled.div<{ translateX: number }>`
  display: flex;
  transition: transform 0.3s ease;
  transform: translateX(${props => props.translateX}%);
  height: 100%;
`;

const SliderSlide = styled.div`
  min-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
`;

const FullSizePhoto = styled.img`
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 500px; /* Ограничиваем максимальную высоту */
  border-radius: ${theme.borderRadius.lg};
  border: 2px solid ${theme.colors.border.accent};
  transition: all 0.3s ease;
  object-fit: contain; /* Сохраняем пропорции */
  
  &:hover {
    border-color: ${theme.colors.accent.primary};
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
    transform: scale(1.02);
  }
`;

const SliderDescription = styled.div`
  position: absolute;
  bottom: -100px;
  left: 0;
  right: 0;
  padding: ${theme.spacing.md};
`;

const DescriptionTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.sm} 0;
  text-align: center;
`;

const DescriptionText = styled.p`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  margin: 0 0 ${theme.spacing.sm} 0;
  text-align: center;
  line-height: 1.5;
`;

const SavePhotosButton = styled.button`
  background: ${theme.colors.gradients.button};
  color: ${theme.colors.text.primary};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  margin-top: ${theme.spacing.sm};
  transition: ${theme.transition.fast};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${theme.colors.shadow.glow};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DescriptionNote = styled.p`
  color: ${theme.colors.accent.primary};
  font-size: ${theme.fontSize.sm};
  font-weight: 500;
  margin: 0;
  text-align: center;
  font-style: italic;
`;

const CharacterCardPreview = styled.div`
  position: absolute;
  bottom: -200px;
  left: 0;
  right: 0;
  background: rgba(22, 33, 62, 0.9);
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid ${theme.colors.border.accent};
`;

const PreviewTitle = styled.h4`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.md};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const PreviewCardContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const PreviewCard = styled.div`
  background: rgba(22, 33, 62, 0.3);
  backdrop-fi