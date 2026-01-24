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
  badgeCount?: number;
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
  showLabels?: boolean;
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
  showLabels?: boolean;
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
  vertical = false,
  showLabels = false
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

  const targetScale = useTransform(mouseDistance, [-distance, 0, distance], [1, magnification / baseItemSize, 1]);
  const scale = useSpring(targetScale, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: baseItemSize,
        height: baseItemSize,
        scale: scale,
        filter: 'none',
        WebkitFilter: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        transformStyle: 'flat',
        WebkitTransformStyle: 'flat',
        backfaceVisibility: 'visible',
        WebkitBackfaceVisibility: 'visible',
        willChange: 'transform',
        imageRendering: 'crisp-edges',
        WebkitImageRendering: 'crisp-edges'
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
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number>; isLocalHovered?: boolean; vertical?: boolean; itemClassName?: string; showLabels?: boolean }>, { 
              isHovered,
              isLocalHovered,
              vertical,
              itemClassName: className,
              showLabels
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
  itemClassName?: string;
  showLabels?: boolean;
};

function DockLabel({ children, className = '', isHovered, isLocalHovered = false, vertical = false, itemClassName = '', showLabels = false }: DockLabelProps) {
  const isVisible = showLabels || isLocalHovered === true;

  return (
    <>
      {isVisible && (
        <div
          className={`dock-label ${vertical ? 'dock-label-vertical' : ''} ${className}`}
          role="tooltip"
          style={{ 
            pointerEvents: 'none',
            color: '#ffffff',
            opacity: 1,
            transform: vertical ? 'translateX(-50%) translateZ(0)' : 'translateX(-50%) translateZ(0)',
            transformOrigin: 'center center',
            transformStyle: 'flat',
            WebkitTransformStyle: 'flat',
            backfaceVisibility: 'visible',
            WebkitBackfaceVisibility: 'visible',
            transition: 'none',
            animation: 'none',
            willChange: 'opacity',
            filter: 'none',
            WebkitFilter: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            imageRendering: 'crisp-edges',
            WebkitImageRendering: 'crisp-edges'
          }}
        >
          <span style={{ 
            color: '#ffffff', 
            display: 'inline-block',
            transform: 'scale(1) translateZ(0)',
            transformOrigin: 'center center',
            filter: 'none',
            WebkitFilter: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            transformStyle: 'flat',
            WebkitTransformStyle: 'flat',
            backfaceVisibility: 'visible',
            WebkitBackfaceVisibility: 'visible',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            imageRendering: 'crisp-edges',
            WebkitImageRendering: 'crisp-edges',
            willChange: 'auto'
          }}>{children}</span>
        </div>
      )}
    </>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
  badgeCount?: number;
};

function DockIcon({ children, className = '', badgeCount }: DockIconProps) {
  return (
    <div className={`dock-icon ${className}`} style={{ position: 'relative' }}>
      {children}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '10px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '0 4px',
            border: '2px solid rgba(0, 0, 0, 0.8)',
            zIndex: 10
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </div>
  );
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
  vertical = false,
  showLabels = false
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
        scrollbarWidth: 'none',
        filter: 'none',
        WebkitFilter: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none'
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
          width: vertical ? panelHeight : 'auto',
          filter: 'none',
          WebkitFilter: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none'
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
            showLabels={showLabels}
          >
            <DockIcon badgeCount={item.badgeCount}>{item.icon}</DockIcon>
            <DockLabel vertical={vertical} itemClassName={item.className} showLabels={showLabels}>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
