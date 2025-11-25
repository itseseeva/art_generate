import { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import './VerticalDock.css';

function DockItem({
  children,
  className = '',
  onClick,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize
}) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseY, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      y: 0,
      height: baseItemSize,
    };
    return val - rect.y - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
      }}
      className={`dock-item vertical ${className}`}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      tabIndex={0}
      role="button"
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
          animate={{ opacity: 1, y: -10 }}
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

export default function VerticalDock({
  items,
  className = '',
  spring = { mass: 0.5, stiffness: 100, damping: 20 },
  magnification = 60,
  distance = 160,
  panelWidth = 80,
  dockWidth = 200,
  baseItemSize = 50,
  isCollapsed = false,
  onToggle
}) {
  const mouseY = useMotionValue(Infinity);

  return (
    <motion.div 
      style={{ 
        scrollbarWidth: 'none',
        position: 'relative',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }} 
      className="vertical-dock-outer"
      animate={{ width: isCollapsed ? 40 : panelWidth }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Кнопка закрытия - над контейнером с тенью */}
      <motion.div
        className="close-button-above"
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          border: '2px solid #333',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
        onClick={onToggle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points={isCollapsed ? "9,18 15,12 9,6" : "15,18 9,12 15,6"}></polyline>
        </svg>
      </motion.div>

      <motion.div
        onMouseMove={({ pageY }) => {
          mouseY.set(pageY);
        }}
        onMouseLeave={() => {
          mouseY.set(Infinity);
        }}
        className={`vertical-dock-panel ${className}`}
        role="toolbar"
        aria-label="Sidebar dock"
        initial={false}
        animate={{
          opacity: isCollapsed ? 0 : 1,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut"
        }}
        style={{
          width: panelWidth,
          pointerEvents: isCollapsed ? 'none' : 'auto',
        }}
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseY={mouseY}
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