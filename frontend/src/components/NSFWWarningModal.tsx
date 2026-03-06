import React from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiAlertTriangle, FiLock, FiArrowLeft, FiLogIn } from 'react-icons/fi';
import { motion, AnimatePresence, Variants } from 'motion/react';

// Animation Variants
const overlayVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  visible: {
    opacity: 1,
    backdropFilter: "blur(35px)",
    transition: { duration: 0.5, ease: "easeOut" as const }
  },
  exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.3 } }
};

const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 30,
    rotateX: 15
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring" as const,
      damping: 22,
      stiffness: 280,
      duration: 0.6,
      delayChildren: 0.1,
      staggerChildren: 0.08
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.3, ease: "easeIn" as const }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

const badgeVariants: Variants = {
  hidden: { scale: 0, opacity: 0, rotate: -180 },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20
    }
  },
  pulse: {
    boxShadow: [
      "0 0 20px rgba(239, 68, 68, 0.3)",
      "0 0 40px rgba(239, 68, 68, 0.6)",
      "0 0 20px rgba(239, 68, 68, 0.3)"
    ],
    textShadow: [
      "0 0 10px rgba(239, 68, 68, 0.5)",
      "0 0 20px rgba(239, 68, 68, 0.8)",
      "0 0 10px rgba(239, 68, 68, 0.5)"
    ],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(3, 3, 5, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  perspective: 1200px;
`;

const ModalContent = styled(motion.div)`
  background: rgba(10, 10, 15, 0.75);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 40px;
  padding: 56px 48px;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 40px 100px rgba(0, 0, 0, 0.8),
    0 0 80px rgba(239, 68, 68, 0.15);
  max-width: 520px;
  width: 90vw;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(239, 68, 68, 0.4) 20%, 
      rgba(239, 68, 68, 0.8) 50%, 
      rgba(239, 68, 68, 0.4) 80%, 
      transparent 100%
    );
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 120px;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%);
    filter: blur(40px);
    pointer-events: none;
    z-index: 0;
  }
`;

const NSFWBadge = styled(motion.div)`
  width: 100px;
  height: 100px;
  margin: 0 auto 36px;
  background: rgba(239, 68, 68, 0.12);
  border: 2px solid rgba(239, 68, 68, 0.4);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  font-size: 32px;
  font-weight: 900;
  font-family: 'Inter', sans-serif;
  letter-spacing: -1px;
  position: relative;
  transform: rotate(-5deg);
  
  &::after {
    content: 'NSFW';
    position: absolute;
    bottom: -10px;
    right: -10px;
    font-size: 10px;
    background: #ef4444;
    color: white;
    padding: 2px 6px;
    border-radius: 6px;
    letter-spacing: 1px;
  }
`;

const Title = styled(motion.h2)`
  color: white;
  font-size: 32px;
  font-weight: 900;
  margin-bottom: 24px;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #ffffff 0%, #fecaca 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.3));
`;

const MessageBody = styled(motion.div)`
  color: rgba(255, 255, 255, 0.7);
  font-size: 17px;
  line-height: 1.6;
  margin-bottom: 44px;
  z-index: 1;
  
  p {
    margin-bottom: 16px;
  }

  strong {
    color: #ef4444;
    font-weight: 800;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  }
`;

const VerificationContainer = styled(motion.div)`
  margin-top: 32px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background: #ef4444;
    box-shadow: 0 0 10px #ef4444;
  }

  p {
    margin: 0;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
`;

const ActionRow = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 12px;
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const PremiumButton = styled(motion.button) <{ $primary?: boolean }>`
  position: relative;
  width: 100%;
  padding: 20px;
  border-radius: 22px;
  font-weight: 800;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
    color: white;
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
    
    &::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    &:hover {
      box-shadow: 0 15px 35px rgba(239, 68, 68, 0.6);
      transform: translateY(-3px) scale(1.02);
      
      &::after {
        opacity: 1;
      }
    }
  ` : `
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: white;
      transform: translateY(-3px);
    }
  `}

  &:active {
    transform: translateY(-1px) scale(0.98);
  }
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
          <NSFWBadge
            variants={badgeVariants}
            animate="pulse"
          >
            18+
          </NSFWBadge>

          <Title variants={itemVariants}>
            {t('nsfwWarning.title')}
          </Title>

          <MessageBody variants={itemVariants}>
            <p>
              {t('nsfwWarning.message')} <strong>{t('nsfwWarning.explicitContent')}</strong>.
            </p>
            <p style={{ opacity: 0.8, fontSize: '15px' }}>
              {t('nsfwWarning.description')}
            </p>

            <VerificationContainer>
              <p>
                <FiLock size={18} color="#ef4444" />
                {t('nsfwWarning.ageVerification')}
              </p>
            </VerificationContainer>
          </MessageBody>

          <ActionRow variants={itemVariants}>
            <PremiumButton
              onClick={onCancel}
            >
              <FiArrowLeft size={20} />
              <span>{t('common.return')}</span>
            </PremiumButton>
            <PremiumButton
              $primary
              onClick={onConfirm}
            >
              <span>{t('nsfwWarning.enter')}</span>
              <FiLogIn size={20} />
            </PremiumButton>
          </ActionRow>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>,
    document.body
  );
};
