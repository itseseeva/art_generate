import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface MenuToggleProps {
    toggle: () => void;
    isOpen: boolean;
}

export const MenuToggle: React.FC<MenuToggleProps> = ({ toggle, isOpen }) => {
    const { t } = useTranslation('common');

    return (
        <button
            onClick={toggle}
            style={{
                outline: "none",
                border: "none",
                cursor: "pointer",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px",
                color: "white",
                fontWeight: 600,
                fontSize: "16px",
                fontFamily: "'Inter', sans-serif",
                zIndex: 1002,
                pointerEvents: 'auto',
            }}
        >
            <span style={{ minWidth: '45px', textAlign: 'left' }}>
                {isOpen ? t('common.close') : t('sidebar.menu')}
            </span>
            <motion.div
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="10" y1="3" x2="10" y2="17" />
                    <line x1="3" y1="10" x2="17" y2="10" />
                </svg>
            </motion.div>
        </button>
    );
};
