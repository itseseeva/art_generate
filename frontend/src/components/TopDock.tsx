'use client';

import React, { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import Switcher4 from './Switcher4';

import './TopDock.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, child => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: 10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

type ContentMode = 'safe' | 'nsfw';

interface TopDockProps {
  items: Array<{ icon: React.ReactNode; label: string; onClick?: () => void; className?: string }>;
  className?: string;
  spring?: { mass: number; stiffness: number; damping: number };
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  mode?: ContentMode;
  onModeChange?: (mode: ContentMode) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
}

export default function TopDock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  baseItemSize = 50,
  mode,
  onModeChange,
  isAuthenticated = false,
  onRequireAuth
}: TopDockProps) {
  const mouseX = useMotionValue(Infinity);
  const hasToggle = typeof mode !== 'undefined' && typeof onModeChange === 'function';
  const isNsfw = mode === 'nsfw';
  const [checked, setChecked] = useState(isNsfw);

  useEffect(() => {
    setChecked(isNsfw);
  }, [isNsfw]);

  const handleToggleChange = (nextChecked: boolean) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setChecked(nextChecked);
    onModeChange?.(nextChecked ? 'nsfw' : 'safe');
  };

  return (
    <motion.div style={{ height: panelHeight, scrollbarWidth: 'none' }} className="dock-outer">
			{hasToggle && (
				<div className="dock-toggle">
					<Switcher4 checked={checked} onToggle={handleToggleChange} variant="pink" />
					<span className="dock-toggle-label">NSFW</span>
				</div>
			)}
      <motion.div
        onMouseMove={({ pageX }) => {
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}