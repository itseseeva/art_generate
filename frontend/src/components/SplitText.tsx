import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styled from 'styled-components';

interface SplitTextProps {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
}

const AnimatedText = styled.div`
  color: white;
  font-family: inherit;
  display: inline-block;
`;

const Char = styled.span`
  display: inline-block;
`;

const SplitText: React.FC<SplitTextProps> = ({ 
  text, 
  delay = 100, 
  duration = 0.6,
  className 
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (!textRef.current) return;

    const chars = charsRef.current;
    
    // Set initial state
    gsap.set(chars, {
      y: 100,
      opacity: 0,
      rotationX: -90,
      transformOrigin: "50% 50% -50px",
    });

    // Animate characters
    gsap.to(chars, {
      y: 0,
      opacity: 1,
      rotationX: 0,
      duration: duration,
      stagger: delay / 1000, // convert to seconds
      ease: "back.out(1.7)",
      delay: 0.2
    });

    return () => {
      gsap.killTweensOf(chars);
    };
  }, [text, delay, duration]);

  const chars = text.split('').map((char, index) => (
    <Char 
      key={index} 
      ref={(el) => {
        if (el) charsRef.current[index] = el;
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </Char>
  ));

  return (
    <AnimatedText ref={textRef} className={className}>
      {chars}
    </AnimatedText>
  );
};

export default SplitText;
