import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence
} from 'motion/react';
import React, { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

import './Dock.css';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  vertical?: boolean;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  vertical?: boolean;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize,
  vertical = false
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);
  const [isLocalHovered, setIsLocalHovered] = useState(false);

  const mouseDistance = useTransform(
    vertical ? mouseY : mouseX,
    val => {
      const rect = ref.current?.getBoundingClientRect() ?? {
        x: 0,
        y: 0,
        width: baseItemSize,
        height: baseItemSize
      };
      if (vertical) {
        return val - rect.y - baseItemSize / 2;
      }
      return val - rect.x - baseItemSize / 2;
    }
  );

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => {
        isHovered.set(1);
        setIsLocalHovered(true);
      }}
      onHoverEnd={() => {
        isHovered.set(0);
        setIsLocalHovered(false);
      }}
      onFocus={() => {
        isHovered.set(1);
        setIsLocalHovered(true);
      }}
      onBlur={() => {
        isHovered.set(0);
        setIsLocalHovered(false);
      }}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={className?.includes('disabled') ? -1 : 0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, child =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number>; isLocalHovered?: boolean; vertical?: boolean }>, { 
              isHovered,
              isLocalHovered,
              vertical
            })
          : child
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
  isLocalHovered?: boolean;
  vertical?: boolean;
};

function DockLabel({ children, className = '', isHovered, isLocalHovered = false, vertical = false }: DockLabelProps) {
  // Для горизонтального dock показываем tooltip при наведении
  // Для вертикального dock лейблы всегда видимы
  const isVisible = vertical ? true : isLocalHovered;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`dock-label ${vertical ? 'dock-label-vertical' : ''} ${className}`}
      role="tooltip"
    >
      {children}
    </motion.div>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  vertical = false
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const mouseY = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const isTopRightDock = className.includes('top-right-dock');

  return (
    <motion.div 
      style={{ 
        height: isTopRightDock ? panelHeight : (vertical ? 'auto' : panelHeight), 
        width: vertical ? panelHeight : 'auto',
        scrollbarWidth: 'none' 
      }} 
      className={`dock-outer ${vertical ? 'dock-outer-vertical' : ''}`}
    >
      <motion.div
        onMouseMove={({ pageX, pageY }) => {
          mouseX.set(pageX);
          mouseY.set(pageY);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
          mouseY.set(Infinity);
        }}
        className={`dock-panel ${vertical ? 'dock-panel-vertical' : ''} ${className}`}
        style={{ 
          height: vertical ? 'auto' : panelHeight,
          width: vertical ? panelHeight : 'auto'
        }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            mouseY={mouseY}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            vertical={vertical}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel vertical={vertical}>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
