import React from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiLock, FiArrowLeft, FiLogIn } from 'react-icons/fi';
import { motion, AnimatePresence } from 'motion/react';

// Animation Variants
const overlayVariants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  visible: {
    opacity: 1,
    backdropFilter: "blur(20px)",
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    rotateX: 10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      duration: 0.5,
      delayChildren: 0.2,
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.3 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const iconVariants = {
  hidden: { scale: 0, rotate: -45, opacity: 0 },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    boxShadow: [
      "0 0 30px rgba(239, 68, 68, 0.2)",
      "0 0 50px rgba(239, 68, 68, 0.5)",
      "0 0 30px rgba(239, 68, 68, 0.2)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(5, 5, 10, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  perspective: 1000px;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(165deg, rgba(20, 20, 25, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%);
  border-radius: 32px;
  padding: 48px;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.05),
    0 40px 80px rgba(0, 0, 0, 0.7),
    0 0 100px rgba(239, 68, 68, 0.1);
  max-width: 500px;
  width: 90vw;
  text-align: center;
  position: relative;
  overflow: hidden;

  /* Premium glowing border on top */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.6), transparent);
  }
  
  /* Subtle red glow at bottom */
  &::after {
    content: '';
    position: absolute;
    bottom: -50px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 100px;
    background: rgba(239, 68, 68, 0.15);
    filter: blur(50px);
    pointer-events: none;
    z-index: 0;
  }
`;

const WarningIconWrapper = styled(motion.div)`
  width: 88px;
  height: 88px;
  margin: 0 auto 32px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  position: relative;
  border: 1px solid rgba(239, 68, 68, 0.2);
  
  svg {
    width: 44px;
    height: 44px;
    stroke-width: 2;
    filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.4));
  }
`;

const Title = styled(motion.h2)`
  color: white;
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 20px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 30%, #fca5a5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 10px rgba(239, 68, 68, 0.2);
`;

const Message = styled(motion.div)`
  color: #a1a1aa;
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
  
  strong {
    color: #fca5a5;
    font-weight: 600;
  }
`;

const AgeVerificationBox = styled(motion.div)`
  margin-top: 28px;
  padding: 18px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 16px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    animation: shine 3s infinite linear;
  }

  @keyframes shine {
    0% { left: -100%; }
    50% { left: 100%; }
    100% { left: 100%; }
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #f87171;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`;

const ButtonGroup = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const Button = styled(motion.button) <{ $variant?: 'primary' | 'secondary' }>`
  position: relative;
  width: 100%;
  padding: 18px 24px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  
  ${props => props.$variant === 'primary' ? `
    /* Primary Button: Gradient, Inner Glow, Shine effect */
    background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
    color: white;
    border: none;
    box-shadow: 
      0 4px 20px rgba(220, 38, 38, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    
    /* Animated shine/glow overlay */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
      transform: translateX(-100%) skewX(-15deg);
      transition: transform 0.6s ease;
    }

    &:hover {
      box-shadow: 
        0 8px 30px rgba(220, 38, 38, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%);

      /* Shine effect on hover */
      &::before {
        transform: translateX(100%) skewX(-15deg);
        transition: transform 0.6s ease;
      }
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
    }
  ` : `
    /* Secondary Button: Glassmorphism */
    background: rgba(255, 255, 255, 0.03);
    color: #a1a1aa;
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    &:active {
      transform: translateY(0);
      background: rgba(255, 255, 255, 0.05);
    }
  `}
`;

interface NSFWWarningModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const NSFWWarningModal: React.FC<NSFWWarningModalProps> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return createPortal(
    <AnimatePresence>
      <ModalOverlay
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onCancel}
      >
        <ModalContent
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <WarningIconWrapper
            variants={iconVariants}
            animate="pulse"
          >
            <FiAlertTriangle />
          </WarningIconWrapper>

          <Title variants={itemVariants}>
            {t('nsfwWarning.title')}
          </Title>

          <Message variants={itemVariants}>
            <p>
              {t('nsfwWarning.message')} <strong>{t('nsfwWarning.explicitContent')}</strong>.
            </p>
            <p style={{ marginTop: '12px' }}>
              {t('nsfwWarning.description')}
            </p>

            <AgeVerificationBox>
              <p>
                <FiLock size={16} />
                {t('nsfwWarning.ageVerification')}
              </p>
            </AgeVerificationBox>
          </Message>

          <ButtonGroup variants={itemVariants}>
            <Button
              $variant="secondary"
              onClick={onCancel}
              whileHover="hover"
              whileTap="tap"
            >
              <FiArrowLeft size={18} />
              <span>{t('common.return')}</span>
            </Button>
            <Button
              $variant="primary"
              onClick={onConfirm}
              whileHover="hover"
              whileTap="tap"
            >
              <span>{t('nsfwWarning.enter')}</span>
              <FiLogIn size={18} />
            </Button>
          </ButtonGroup>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>,
    document.body
  );
};
