import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../theme';
import '../styles/ContentArea.css';
import { AuthModal } from './AuthModal';
import { translateToEnglish } from '../utils/translate';

const MainContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: linear-gradient(to bottom right, rgba(8, 8, 18, 1), rgba(8, 8, 18, 0.95), rgba(40, 40, 40, 0.1));
  overflow: visible;
  box-sizing: border-box;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 80px;
    left: 40px;
    width: 288px;
    height: 288px;
    background: rgba(80, 80, 80, 0.15);
    border-radius: 50%;
    filter: blur(96px);
    animation: float 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: 80px;
    right: 40px;
    width: 384px;
    height: 384px;
    background: rgba(60, 60, 60, 0.15);
    border-radius: 50%;
    filter: blur(96px);
    animation: float 8s ease-in-out infinite;
    animation-delay: 1s;
    pointer-events: none;
    z-index: 0;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;



const MainContent = styled.div`
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 10;
  color: #ffffff;
`;

const LeftColumn = styled.div`
  width: 100%;
  min-height: calc(150vh - 80px);
  background: linear-gradient(135deg, rgba(12, 12, 12, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 2px solid rgba(60, 60, 60, 0.9);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(100, 100, 100, 0.3), transparent);
    pointer-events: none;
  }
`;


const ThirdColumn = styled.div`
  display: none; /* Скрываем третий столбец */
`;

const Form = styled.form`
  width: 100%;
  height: 100%;
`;

const ColumnContent = styled.div`
  padding: ${theme.spacing.sm} !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  visibility: visible !important;
  opacity: 1 !important;
  min-height: 300px !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  position: relative !important;
  z-index: 10 !important;
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  box-sizing: border-box !important;
  gap: ${theme.spacing.md} !important;
  
  /* Кастомный скроллбар */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(15, 15, 15, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 80, 80, 0.6);
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    
    &:hover {
      background: rgba(100, 100, 100, 0.7);
    }
  }
  
  /* Убеждаемся, что все дочерние элементы не выходят за границы */
  > * {
    max-width: 100%;
    box-sizing: border-box;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0 !important;
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(22, 22, 22, 0.98) 100%);
  border-radius: ${theme.borderRadius.lg} !important;
  padding: ${theme.spacing.xl} !important;
  border: 1px solid rgba(70, 70, 70, 0.8) !important;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: auto !important;
  box-sizing: border-box !important;
  overflow: visible !important;
  word-wrap: break-word !important;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 0 0 1px rgba(0, 0, 0, 0.2);
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(100, 100, 100, 0.4), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: rgba(100, 100, 100, 0.9) !important;
    background: linear-gradient(135deg, rgba(18, 18, 18, 0.98) 0%, rgba(25, 25, 25, 1) 100%) !important;
    box-shadow: 
      0 6px 24px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    transform: translateY(-2px);
    
    &::before {
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:nth-child(1) {
    animation-delay: 0.05s;
  }
  &:nth-child(2) {
    animation-delay: 0.1s;
  }
  &:nth-child(3) {
    animation-delay: 0.15s;
  }
  &:nth-child(4) {
    animation-delay: 0.2s;
  }
  &:nth-child(5) {
    animation-delay: 0.25s;
  }
  &:nth-child(6) {
    animation-delay: 0.3s;
  }
  &:nth-child(7) {
    animation-delay: 0.35s;
  }
  &:nth-child(8) {
    animation-delay: 0.4s;
  }
  
  /* Убеждаемся, что все дочерние элементы видны */
  > * {
    visibility: visible !important;
    opacity: 1 !important;
    display: block !important;
  }
`;

const Label = styled.label`
  display: flex !important;
  align-items: center !important;
  gap: ${theme.spacing.md} !important;
  color: rgba(230, 230, 230, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-weight: 700 !important;
  margin-bottom: ${theme.spacing.lg} !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: 100% !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 13px;
  
  &::before {
    content: attr(data-icon);
    width: 36px;
    height: 36px;
    border: 2px solid rgba(90, 90, 90, 0.7);
    border-radius: ${theme.borderRadius.md};
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(200, 200, 200, 1);
    background: linear-gradient(135deg, rgba(25, 25, 25, 0.8) 0%, rgba(35, 35, 35, 0.9) 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    font-size: 18px;
    flex-shrink: 0;
  }
  
  ${FormGroup}:hover &::before {
    border-color: rgba(120, 120, 120, 0.9);
    background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 1) 100%);
    box-shadow: 
      0 4px 12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 12px rgba(100, 100, 100, 0.2);
    transform: scale(1.05);
  }
`;

const Input = styled.input`
  width: 100% !important;
  max-width: 100% !important;
  height: 52px !important;
  min-height: 52px !important;
  max-height: 52px !important;
  padding: 0 ${theme.spacing.lg} !important;
  border: 2px solid rgba(70, 70, 70, 0.8) !important;
  border-radius: ${theme.borderRadius.md} !important;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%) !important;
  color: rgba(240, 240, 240, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-weight: 500 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.3) !important;
  margin: 0 !important;
  margin-top: 0 !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
  flex-shrink: 0 !important;
  
  &::placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
    font-weight: 400 !important;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(120, 120, 120, 1) !important;
    background: linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%) !important;
    box-shadow: 
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0 0 3px rgba(100, 100, 100, 0.15),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(85, 85, 85, 0.9) !important;
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.4) !important;
  }
  
  /* Убеждаемся, что текст всегда виден */
  &::-webkit-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &::-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-ms-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
`;

const Textarea = styled.textarea`
  width: 100% !important;
  max-width: 100% !important;
  min-height: 140px !important;
  height: auto !important;
  padding: ${theme.spacing.lg} !important;
  border: 2px solid rgba(70, 70, 70, 0.8) !important;
  border-radius: ${theme.borderRadius.md} !important;
  background: linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(18, 18, 18, 0.98) 100%) !important;
  color: rgba(240, 240, 240, 1) !important;
  font-size: ${theme.fontSize.base} !important;
  font-family: inherit !important;
  font-weight: 500 !important;
  resize: vertical;
  line-height: 1.7 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  box-sizing: border-box !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  white-space: pre-wrap !important;
  box-shadow: 
    inset 0 2px 6px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.02),
    0 0 0 1px rgba(0, 0, 0, 0.3) !important;
  margin: 0 !important;
  margin-top: 0 !important;
  position: relative !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
  flex-shrink: 0 !important;
  
  &::placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
    font-weight: 400 !important;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(120, 120, 120, 1) !important;
    background: linear-gradient(135deg, rgba(15, 15, 15, 0.98) 0%, rgba(22, 22, 22, 1) 100%) !important;
    box-shadow: 
      inset 0 2px 8px rgba(0, 0, 0, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.03),
      0 0 0 3px rgba(100, 100, 100, 0.15),
      0 0 20px rgba(100, 100, 100, 0.1) !important;
    -webkit-text-fill-color: rgba(240, 240, 240, 1) !important;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(85, 85, 85, 0.9) !important;
    box-shadow: 
      inset 0 2px 6px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.02),
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 2px 8px rgba(0, 0, 0, 0.4) !important;
  }
  
  /* Убеждаемся, что текст всегда виден */
  &::-webkit-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &::-moz-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
  
  &:-ms-input-placeholder {
    color: rgba(100, 100, 100, 0.8) !important;
    opacity: 1 !important;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  height: 56px;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 1px solid rgba(170, 170, 170, 0.4);
  background: ${props => props.$variant === 'primary' ? 'rgba(200, 200, 200, 0.15)' : 'transparent'};
  color: ${theme.colors.text.primary};
  
  &:hover {
    transform: scale(1.02);
    border-color: rgba(255, 255, 255, 0.6);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding-top: ${theme.spacing.xl};
  animation: fadeIn 0.6s ease-out forwards;
  animation-delay: 0.8s;
  opacity: 0;
`;

const CoinsDisplay = styled.div`
  background: transparent;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(150, 150, 150, 0.4);
  margin-bottom: ${theme.spacing.lg};
  text-align: center;
`;

const CoinsText = styled.span`
  color: rgba(150, 150, 150, 1);
  font-size: ${theme.fontSize.base};
  font-weight: 600;
`;

const PhotoGenerationBox = styled.div`
  background: transparent;
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  margin: ${theme.spacing.lg} 0;
  text-align: center;
`;

const PhotoGenerationBoxTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
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
  background: transparent;
  border: 1px solid rgba(130, 130, 130, 0.3);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.lg};
  min-height: calc(120vh - 300px);
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
  border-top-color: rgba(200, 200, 200, 0.8);
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
  background: rgba(150, 150, 150, 0.8);
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
    background: rgba(150, 150, 150, 1);
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
  background: rgba(150, 150, 150, 0.8);
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
    background: rgba(150, 150, 150, 1);
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
  border: 2px solid rgba(130, 130, 130, 0.5);
  transition: all 0.3s ease;
  object-fit: contain; /* Сохраняем пропорции */
  
  &:hover {
    border-color: rgba(150, 150, 150, 1);
    box-shadow: 0 0 20px rgba(150, 150, 150, 0.3);
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
  color: rgba(150, 150, 150, 1);
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
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: none;
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  border: 1px solid rgba(130, 130, 130, 0.4);
`;

const PreviewTitle = styled.h4`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  margin: 0 0 ${theme.spacing.md} 0;
  text-align: center;
`;

const PreviewCardContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const PreviewCard = styled.div`
  background: transparent;
  backdrop-filter: none;
  border-radius: ${theme.borderRadius.lg};
  border: 1px solid rgba(130, 130, 130, 0.4);
  box-shadow: none;
  width: 200px;
  height: 150px;
  position: relative;
  overflow: hidden;
`;

const PreviewSlideShow = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const PreviewSlideImage = styled.img<{ $isActive: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${props => props.$isActive ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const PreviewDots = styled.div`
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  z-index: 3;
`;

const PreviewDot = styled.div<{ $isActive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'};
  transition: background 0.3s ease;
`;

const PreviewPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
    background: rgba(100, 100, 100, 0.1);
`;

const PreviewPlaceholderText = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.fontSize.sm};
  text-align: center;
`;

const PhotoGenerationSection = styled.div<{ $isExpanded: boolean }>`
  background: rgba(22, 33, 62, 0.15);
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  margin-top: ${theme.spacing.xl};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1);
  max-height: ${props => props.$isExpanded ? '600px' : '0'};
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  transform: ${props => props.$isExpanded ? 'translateY(0)' : 'translateY(-20px)'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(150, 150, 150, 1), transparent);
    opacity: ${props => props.$isExpanded ? '1' : '0'};
    transition: opacity 0.6s ease;
  }
`;

const PhotoGenerationMainTitle = styled.h3`
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.xl};
  font-weight: 700;
  margin: 0 0 ${theme.spacing.xl} 0;
  text-align: center;
  background: linear-gradient(135deg, ${theme.colors.text.primary}, rgba(150, 150, 150, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(150, 150, 150, 1), transparent);
  }
`;

const PromptSection = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  align-items: flex-start;
  margin-bottom: ${theme.spacing.xl};
`;

const PromptContainer = styled.div`
  flex: 1;
  background: rgba(22, 33, 62, 0.2);
  backdrop-filter: blur(8px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 1px solid rgba(150, 150, 150, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  position: relative;
  max-width: 400px;
`;

const PromptLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const PromptInput = styled.textarea`
  background: rgba(22, 33, 62, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 1);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 3px rgba(102, 126, 234, 0.2),
      0 0 20px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
  }
`;

const GenerateSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
  min-width: 180px;
  align-items: center;
`;

const GenerateButton = styled.button`
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.1), rgba(80, 80, 80, 0.1));
  backdrop-filter: blur(8px);
  border: 2px solid;
  border-image: linear-gradient(45deg, rgba(150, 150, 150, 1), rgba(100, 100, 100, 1)) 1;
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.lg};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(100, 100, 100, 0.2);
  position: relative;
  overflow: hidden;
  min-width: 160px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 
      0 8px 32px rgba(100, 100, 100, 0.3),
      0 0 0 1px rgba(100, 100, 100, 0.3);
    border-image: linear-gradient(45deg, rgba(150, 150, 150, 1), rgba(100, 100, 100, 1)) 1;
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const LargeTextInputArea = styled.div`
  background: rgba(22, 33, 62, 0.2);
  backdrop-filter: blur(8px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.xl};
  border: 1px solid rgba(150, 150, 150, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  margin-top: ${theme.spacing.xl};
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const LargeTextInput = styled.textarea`
  background: rgba(22, 33, 62, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(150, 150, 150, 0.4);
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.base};
  font-family: inherit;
  resize: vertical;
  flex: 1;
  width: 100%;
  min-height: 200px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    border-color: rgba(150, 150, 150, 1);
    box-shadow: 
      inset 0 2px 4px rgba(0, 0, 0, 0.1),
      0 0 0 2px rgba(150, 150, 150, 0.2);
  }
`;

const LargeTextLabel = styled.label`
  display: block;
  color: ${theme.colors.text.primary};
  font-size: ${theme.fontSize.lg};
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  background: linear-gradient(135deg, rgba(150, 150, 150, 1), rgba(100, 100, 100, 1));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PhotoCard = styled.div<{ isSelected?: boolean }>`
  position: relative;
  background: rgba(22, 33, 62, 0.1);
  backdrop-filter: blur(8px);
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.lg};
  border: 2px solid ${props => 
    props.isSelected ? 'rgba(150, 150, 150, 1)' : 
    'rgba(100, 100, 100, 0.2)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.isSelected 
      ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.1), transparent)'
      : 'linear-gradient(135deg, rgba(100, 100, 100, 0.05), transparent)'};
    opacity: ${props => props.isSelected ? '1' : '0'};
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 32px rgba(100, 100, 100, 0.2);
    border-color: ${props => props.isSelected 
      ? 'rgba(150, 150, 150, 1)' 
      : 'rgba(102, 126, 234, 0.4)'};
    
    &::before {
      opacity: 1;
    }
  }
`;

const PhotoImage = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: ${theme.spacing.md};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
`;

const PhotoActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const GeneratedPhotosGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${theme.spacing.md};
  margin-top: ${theme.spacing.lg};
  flex: 1;
  min-height: calc(120vh - 400px); /* Увеличиваем высоту области для фото */
  padding: ${theme.spacing.md};
`;

const SelectButton = styled.button<{ $isSelected: boolean }>`
  background: ${props => props.$isSelected 
    ? 'linear-gradient(135deg, #808080 0%, #606060 100%)' 
    : 'rgba(22, 33, 62, 0.3)'};
  border: 1px solid ${props => props.$isSelected 
      ? 'rgba(150, 150, 150, 0.8)' 
    : 'rgba(100, 100, 100, 0.4)'};
  color: ${theme.colors.text.primary};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  
  &:hover {
    background: ${props => props.$isSelected 
      ? 'linear-gradient(135deg, #808080 0%, #606060 100%)' 
      : 'rgba(100, 100, 100, 0.2)'};
    border-color: rgba(150, 150, 150, 1);
    transform: translateY(-1px);
  }
`;

const PhotoStatus = styled.span<{ isSelected?: boolean }>`
  font-size: ${theme.fontSize.sm};
  font-weight: 600;
  color: ${props => props.isSelected 
    ? 'rgba(220, 220, 220, 0.95)' 
    : theme.colors.text.secondary};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing.lg};
  justify-content: center;
  margin-top: ${theme.spacing.xl};
`;

interface CreateCharacterPageProps {
  onBackToMain: () => void;
  onShop?: () => void;
  onMyCharacters?: () => void;
  onPhotoGeneration?: (character: any) => void;
  contentMode?: 'safe' | 'nsfw';
}

export const CreateCharacterPage: React.FC<CreateCharacterPageProps> = ({
  onBackToMain,
  onShop,
  onMyCharacters,
  onPhotoGeneration,
  contentMode = 'safe'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    situation: '',
    instructions: '',
    style: '',
    appearance: '',
    location: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{username: string, coins: number, id: number} | null>(null);
  const [isPhotoGenerationExpanded, setIsPhotoGenerationExpanded] = useState(false);
  const [createdCharacterData, setCreatedCharacterData] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [largeTextInput, setLargeTextInput] = useState('');
  const [generatedPhotos, setGeneratedPhotos] = useState<any[]>([]);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [generationSettings, setGenerationSettings] = useState<any>(null);
  const [isCharacterCreated, setIsCharacterCreated] = useState(false); // Новое состояние
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<any>(null); // Для модального окна просмотра фото
  const [swiperTranslateX, setSwiperTranslateX] = useState(0); // Для swiper
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]); // Выбранные фото для карточки
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Валидация имени персонажа
  const validateCharacterName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'Имя персонажа не может быть пустым';
    }
    
    if (name.length < 2) {
      return 'Имя должно содержать минимум 2 символа';
    }
    
    if (name.length > 50) {
      return 'Имя не может быть длиннее 50 символов';
    }
    
    // Проверяем что имя содержит хотя бы одну букву
    if (!/[a-zA-Zа-яА-ЯёЁ]/.test(name)) {
      return 'Имя должно содержать хотя бы одну букву';
    }
    
    // Проверяем что имя содержит только допустимые символы
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9\s\-_]+$/.test(name)) {
      return 'Имя может содержать только буквы, цифры, пробелы, дефисы и подчёркивания';
    }
    
    return null;
  };

  // Проверка авторизации
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Auth token:', token ? 'exists' : 'not found');
      
      if (!token) {
        setIsAuthenticated(false);
        setUserInfo(null);
        console.log('No token, setting isAuthenticated to false');
        return;
      }

      const response = await fetch('/api/v1/auth/me/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Auth response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('User data:', userData);
        setIsAuthenticated(true);
        setUserInfo(userData);
        console.log('Authentication successful, isAuthenticated set to true');
      } else {
        console.log('Auth failed, removing token');
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthCheckComplete(true);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      console.log('[CREATE_CHAR] Инициализация страницы...');
      try {
        await checkAuth();
        console.log('[CREATE_CHAR] checkAuth завершён');
      } catch (error) {
        console.error('[CREATE_CHAR] Ошибка checkAuth:', error);
        setAuthCheckComplete(true);
      }
      
      try {
        await loadGenerationSettings();
        console.log('[CREATE_CHAR] Инициализация завершена');
      } catch (error) {
        console.error('[CREATE_CHAR] Ошибка loadGenerationSettings:', error);
      }
    };
    
    initPage();
  }, []);

  // Показываем модалку ТОЛЬКО один раз после проверки
  useEffect(() => {
    if (authCheckComplete && !isAuthenticated && !isAuthModalOpen) {
      setIsAuthModalOpen(true);
      setAuthMode('login');
    }
  }, [authCheckComplete]);

  // Загружаем настройки генерации из API
  const loadGenerationSettings = async () => {
    try {
      console.log('[CREATE_CHAR] Загружаем настройки генерации...');
      const response = await fetch('/api/v1/fallback-settings/');
      console.log('[CREATE_CHAR] Response status:', response.status);
      
      if (response.ok) {
        const settings = await response.json();
        setGenerationSettings(settings);
        console.log('[CREATE_CHAR] Настройки генерации загружены:', settings);
      } else {
        console.error('[CREATE_CHAR] Ошибка загрузки настроек генерации:', response.status);
      }
    } catch (error) {
      console.error('[CREATE_CHAR] Ошибка загрузки настроек генерации:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
    
    // Валидация имени в реальном времени
    if (name === 'name') {
      const error = validateCharacterName(value);
      setNameError(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', formData); // Добавляем отладку
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Необходимо войти в систему для создания персонажей');
      }

      // Переводим поля appearance и location на английский перед отправкой
      let translatedAppearance = formData.appearance?.trim() || null;
      let translatedLocation = formData.location?.trim() || null;
      
      if (translatedAppearance) {
        translatedAppearance = await translateToEnglish(translatedAppearance);
      }
      if (translatedLocation) {
        translatedLocation = await translateToEnglish(translatedLocation);
      }

      // Преобразуем данные в формат UserCharacterCreate
      const requestData = {
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        situation: formData.situation.trim(),
        instructions: formData.instructions.trim(),
        style: formData.style?.trim() || null,
        appearance: translatedAppearance,
        location: translatedLocation,
        is_nsfw: contentMode === 'nsfw'
      };

      // Проверяем обязательные поля
      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      console.log('Sending request to API...', requestData); // Добавляем отладку
      // КРИТИЧНО: Используем полный URL с базовым адресом API
      const apiUrl = 'http://localhost:8000/api/v1/characters/create/';
      console.log('[CREATE_CHAR] API URL:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status); // Добавляем отладку
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData); // Добавляем отладку
        throw new Error(errorData.detail || 'Ошибка при создании персонажа');
      }

      const result = await response.json();
      console.log('Character created successfully:', result); // Добавляем отладку
      setCreatedCharacterData(result);
      setIsCharacterCreated(true); // Устанавливаем состояние создания персонажа
      setSuccess('Персонаж успешно создан!');

      // Обновляем информацию о пользователе
      await checkAuth();
      
      // Даем время бэкенду сохранить персонажа в БД
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Отправляем событие для обновления персонажей на главной странице
      // Делаем это после задержки, чтобы убедиться, что персонаж сохранен в БД
      console.log('Отправляем событие character-created для обновления главной страницы');
      const event = new CustomEvent('character-created', { 
        detail: { character: result } 
      });
      window.dispatchEvent(event);
      console.log('Событие отправлено. Персонаж должен появиться на главной странице.');
      
      // Даем время главной странице обновиться перед переходом
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Переход на страницу генерации фото
      if (onPhotoGeneration && result) {
        onPhotoGeneration(result);
      }
      
    } catch (err) {
      console.error('Error creating character:', err); // Добавляем отладку
      setError(err instanceof Error ? err.message : 'Ошибка при создании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Editing character...', formData);
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Необходимо войти в систему для редактирования персонажей');
      }

      // Преобразуем данные в формат для редактирования
      const requestData = {
        name: formData.name.trim(),
        personality: formData.personality.trim(),
        situation: formData.situation.trim(),
        instructions: formData.instructions.trim(),
        style: formData.style?.trim() || null,
        appearance: formData.appearance?.trim() || null,
        location: formData.location?.trim() || null
      };

      // Проверяем обязательные поля
      if (!requestData.name || !requestData.personality || !requestData.situation || !requestData.instructions) {
        throw new Error('Все обязательные поля должны быть заполнены');
      }

      console.log('Sending edit request to API...', requestData);
      const response = await fetch(`/api/v1/characters/${createdCharacterData.name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Edit response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.detail || 'Ошибка при редактировании персонажа');
      }

      const result = await response.json();
      console.log('Character edited successfully:', result);
      setCreatedCharacterData(result);
      setSuccess('Персонаж успешно обновлен!');

      // Обновляем информацию о пользователе
      await checkAuth();
      
    } catch (err) {
      console.error('Error editing character:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при редактировании персонажа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.reload();
  };

  // Генерация фото
  const togglePhotoSelection = (photoId: string) => {
    setGeneratedPhotos(prev => 
      prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, isSelected: !photo.isSelected }
          : photo
      )
    );
    
    // Обновляем список выбранных фото
    setSelectedPhotos(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        // Ограничиваем до 3 фото
        if (prev.length >= 3) {
          return prev;
        }
        return [...prev, photoId];
      }
    });
  };

  // Сохранение выбранных фото
  const saveSelectedPhotos = async () => {
    console.log('Saving selected photos:', selectedPhotos);
    console.log('Created character data:', createdCharacterData);
    
    if (!createdCharacterData || selectedPhotos.length === 0) {
      setError('Нет выбранных фото для сохранения');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Необходимо войти в систему');
        return;
      }

      const requestData = {
        character_name: createdCharacterData.name,
        photo_ids: selectedPhotos
      };
      
      console.log('Sending request to API:', requestData);

      const response = await fetch('/api/v1/characters/set-main-photos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response data:', result);
        setSuccess('Главные фото успешно сохранены!');
        console.log('Main photos saved:', selectedPhotos);
        
        // Принудительно обновляем главный экран
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setError(`Ошибка сохранения фото: ${errorData.detail || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      console.error('Error saving main photos:', err);
      setError('Ошибка при сохранении фото');
    }
  };

  const openPhotoModal = (photo: any) => {
    console.log('Opening photo modal for:', photo);
    setSelectedPhotoForView(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhotoForView(null);
  };

  const nextSwiperSlide = () => {
    const maxTranslate = -(generatedPhotos.length - 1) * 100; // Процентное смещение
    setSwiperTranslateX(prev => {
      const newTranslate = prev - 100; // Перемещаем на 100% (следующий слайд)
      return Math.max(newTranslate, maxTranslate);
    });
  };

  const prevSwiperSlide = () => {
    setSwiperTranslateX(prev => {
      const newTranslate = prev + 100; // Перемещаем на 100% (предыдущий слайд)
      return Math.min(newTranslate, 0);
    });
  };

  const generatePhoto = async () => {
    if (!userInfo || userInfo.coins < 30) {
      setError('Недостаточно монет! Нужно 30 монет для генерации фото.');
      return;
    }

    setIsGeneratingPhoto(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Необходимо войти в систему');

      // Используем кастомный промпт или дефолтный
      let prompt = customPrompt.trim();
      if (!prompt && createdCharacterData) {
        const parts = [createdCharacterData.character_appearance, createdCharacterData.location].filter(p => p && p.trim());
        prompt = parts.length > 0 ? parts.join(' | ') : '';
      }

      // Используем настройки из API, как в chat.html
      console.log('Generation settings:', generationSettings);
      console.log('Using steps:', generationSettings?.steps || 20);
      console.log('Using cfg_scale:', generationSettings?.cfg_scale || 4);
      
      const requestBody: any = {
        character: createdCharacterData?.name || 'character',
        prompt: prompt,
        negative_prompt: generationSettings?.negative_prompt || 'blurry, low quality, distorted, bad anatomy',
        width: generationSettings?.width || 512,
        height: generationSettings?.height || 512,
        steps: generationSettings?.steps || 20,
        cfg_scale: generationSettings?.cfg_scale || 4,
        use_default_prompts: false,
        model: 'anime-realism'  // Дефолтная модель для CreateCharacterPage
      };
      
      console.log('Request body:', requestBody);
      
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
      console.log('API Response:', result);
      console.log('Image URL:', result.image_url);
      console.log('Image filename:', result.filename);
      
      // Проверяем URL изображения
      if (!result.image_url) {
        throw new Error('URL изображения не получен от сервера');
      }
      
      // Добавляем новое фото в список
      const filename = result.filename || Date.now().toString();
      const photoId = filename.replace('.png', '').replace('.jpg', ''); // Убираем расширение
      
      const newPhoto = {
        id: photoId,
        url: result.image_url,
        isSelected: false
      };
      
      console.log('New photo object:', newPhoto);
      console.log('Photo URL for display:', newPhoto.url);
      
      // КРИТИЧЕСКИ ВАЖНО: Добавляем фото в галерею пользователя
      try {
        if (token) {
          const addToGalleryResponse = await fetch('/api/v1/auth/user-gallery/add/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              image_url: result.image_url,
              character_name: formData.name || null
            })
          });
          
          if (addToGalleryResponse.ok) {
            console.log('[CreateCharacterPage] Фото добавлено в галерею пользователя');
          }
        }
      } catch (galleryError) {
        console.warn('[CreateCharacterPage] Не удалось добавить фото в галерею:', galleryError);
      }
      
              setGeneratedPhotos(prev => [...prev, newPhoto]);
              setSuccess('Фото успешно сгенерировано!');
              
              // Сбрасываем позицию swiper если добавили второе фото
              if (generatedPhotos.length === 1) {
                setSwiperTranslateX(0);
              }
      
      // Обновляем информацию о пользователе
      await checkAuth();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации фото');
    } finally {
      setIsGeneratingPhoto(false);
    }
  };



  // Завершение создания персонажа
  const handleFinish = () => {
    onBackToMain();
  };

  // Убрана блокировка - страница показывается всегда
  // authCheckComplete используется только для показа модалки входа

  console.log('[CREATE_CHAR] Rendering component, authCheckComplete:', authCheckComplete, 'isAuthenticated:', isAuthenticated);
  
  // Проверка на undefined states/props
  if (!formData) {
    console.error('[CREATE_CHAR] formData is undefined!');
  return (
    <MainContainer>
        <MainContent style={{ background: 'rgba(20, 20, 30, 0.9)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', textAlign: 'center' }}>
            <h2>Ошибка инициализации</h2>
            <p>Не удалось загрузить форму. Пожалуйста, обновите страницу.</p>
          </div>
        </MainContent>
      </MainContainer>
    );
  }
  
  return (
    <MainContainer>
        <MainContent style={{ background: 'rgba(20, 20, 30, 0.9)', minHeight: '100vh' }}>
          <Form onSubmit={isCharacterCreated ? handleEditCharacter : handleSubmit}>
            <LeftColumn>
              <ColumnContent>
                <FormGroup>
                <Label htmlFor="name" data-icon="👤">Имя персонажа:</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Введите имя персонажа..."
                  required
                  style={{ borderColor: nameError ? '#ff4444' : undefined }}
                />
                {nameError && (
                  <div style={{ 
                    color: '#ff4444', 
                    fontSize: '0.875rem', 
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(255, 68, 68, 0.1)',
                    borderRadius: '8px'
                  }}>
                    {nameError}
                  </div>
                )}
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="personality" data-icon="🧠">Личность и характер:</Label>
                <Textarea
                  id="personality"
                  name="personality"
                  value={formData.personality}
                  onChange={handleInputChange}
                  placeholder="Опишите характер и личность персонажа..."
                  rows={4}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="situation" data-icon="💬">Ролевая ситуация:</Label>
                <Textarea
                  id="situation"
                  name="situation"
                  value={formData.situation}
                  onChange={handleInputChange}
                  placeholder="Опишите ситуацию, в которой находится персонаж..."
                  rows={3}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="instructions" data-icon="📋">Инструкции для персонажа:</Label>
                <Textarea
                  id="instructions"
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  placeholder="Как должен вести себя персонаж, что говорить..."
                  rows={4}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="style" data-icon="✨">Стиль ответа (необязательно):</Label>
                <Input
                  type="text"
                  id="style"
                  name="style"
                  value={formData.style}
                  onChange={handleInputChange}
                  placeholder="Например: формальный, дружелюбный, загадочный..."
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="appearance" data-icon="🎨">Внешность (для фото):</Label>
                <Textarea
                  id="appearance"
                  name="appearance"
                  value={formData.appearance}
                  onChange={handleInputChange}
                  placeholder="Опишите внешность персонажа для генерации фото..."
                  rows={3}
                />
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="location" data-icon="📍">Локация (для фото):</Label>
                <Textarea
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Опишите локацию персонажа для генерации фото..."
                  rows={3}
                />
              </FormGroup>

              {userInfo && (
                <CoinsDisplay>
                  <CoinsText>Ваши монеты: {userInfo.coins}</CoinsText>
                </CoinsDisplay>
              )}

              {error && <ErrorMessage>{error}</ErrorMessage>}
              {success && <SuccessMessage>{success}</SuccessMessage>}

              <ButtonGroup>
                <Button type="button" $variant="secondary" onClick={onBackToMain} disabled={isLoading}>
                  Отмена
                </Button>
                <Button type="submit" $variant="primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <LoadingSpinner /> {isCharacterCreated ? 'Обновление...' : 'Создание...'}
                    </>
                  ) : (
                    isCharacterCreated ? 'Редактировать' : 'Создать персонажа'
                  )}
                </Button>
              </ButtonGroup>
              </ColumnContent>
            </LeftColumn>
          </Form>
        </MainContent>
      
      {/* Модальное окно для просмотра фото в полный размер */}
      {selectedPhotoForView && (
        <PhotoModal onClick={closePhotoModal}>
          <PhotoModalContent onClick={(e) => e.stopPropagation()}>
            <PhotoModalClose onClick={closePhotoModal}>×</PhotoModalClose>
            <PhotoModalImage 
              src={selectedPhotoForView.url} 
              alt="Generated photo full size"
              onLoad={() => console.log('Modal image loaded:', selectedPhotoForView.url)}
            />
          </PhotoModalContent>
        </PhotoModal>
      )}
      
      {/* Отладочная информация */}
      {console.log('Selected photo for view:', selectedPhotoForView)}

      {/* Модальное окно авторизации */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          mode={authMode}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Если закрыл без входа - на главную
            if (!isAuthenticated) {
              onBackToMain();
            }
          }}
          onAuthSuccess={(accessToken, refreshToken) => {
            localStorage.setItem('authToken', accessToken);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
            setIsAuthModalOpen(false);
            setAuthMode('login');
            // Диспатчим событие для обновления App.tsx
            window.dispatchEvent(new Event('auth-success'));
            // Перебрасываем на главную после входа
            onBackToMain();
          }}
        />
      )}
    </MainContainer>
  );
}