'use client';

import React, { useMemo, useState } from 'react';

import './Switcher4.css';

type SwitcherVariant = 'pink' | 'blue' | 'green' | 'amber' | 'violet';

interface SwitchTheme {
  off: { background: string; border: string; shadow: string };
  on: { background: string; border: string; shadow: string };
  thumbShadow: { off: string; on: string };
  thumbBorder: { off: string; on: string };
}

const SWITCHER_THEMES: Record<SwitcherVariant, SwitchTheme> = {
  pink: {
    off: {
      background: '#fef0f7',
      border: 'rgba(236,72,153,0.4)',
      shadow: '0 3px 8px rgba(236,72,153,0.25)'
    },
    on: {
      background: 'linear-gradient(135deg,#ffa6c9,#f43f5e)',
      border: 'rgba(244,63,94,0.95)',
      shadow: '0 12px 26px rgba(244,63,94,0.6)'
    },
    thumbShadow: {
      off: '0 3px 8px rgba(244,114,182,0.35)',
      on: '0 6px 14px rgba(244,63,94,0.55)'
    },
    thumbBorder: {
      off: 'rgba(244,114,182,0.8)',
      on: 'rgba(244,63,94,0.95)'
    }
  },
  blue: {
    off: {
      background: '#eef4ff',
      border: 'rgba(79,70,229,0.4)',
      shadow: '0 3px 8px rgba(79,70,229,0.25)'
    },
    on: {
      background: 'linear-gradient(135deg,#a5b4fc,#2563eb)',
      border: 'rgba(59,130,246,0.95)',
      shadow: '0 12px 26px rgba(59,130,246,0.6)'
    },
    thumbShadow: {
      off: '0 3px 8px rgba(79,70,229,0.3)',
      on: '0 6px 14px rgba(59,130,246,0.55)'
    },
    thumbBorder: {
      off: 'rgba(147,197,253,0.9)',
      on: 'rgba(59,130,246,1)'
    }
  },
  green: {
    off: {
      background: '#ecfdf3',
      border: 'rgba(34,197,94,0.35)',
      shadow: '0 3px 8px rgba(34,197,94,0.25)'
    },
    on: {
      background: 'linear-gradient(135deg,#bbf7d0,#16a34a)',
      border: 'rgba(34,197,94,0.9)',
      shadow: '0 12px 26px rgba(34,197,94,0.55)'
    },
    thumbShadow: {
      off: '0 3px 8px rgba(16,185,129,0.3)',
      on: '0 6px 14px rgba(34,197,94,0.5)'
    },
    thumbBorder: {
      off: 'rgba(134,239,172,0.9)',
      on: 'rgba(22,163,74,1)'
    }
  },
  amber: {
    off: {
      background: '#fff7eb',
      border: 'rgba(251,191,36,0.4)',
      shadow: '0 3px 8px rgba(251,191,36,0.25)'
    },
    on: {
      background: 'linear-gradient(135deg,#fde68a,#f97316)',
      border: 'rgba(249,115,22,0.9)',
      shadow: '0 12px 26px rgba(249,115,22,0.6)'
    },
    thumbShadow: {
      off: '0 3px 8px rgba(249,115,22,0.3)',
      on: '0 6px 14px rgba(249,115,22,0.55)'
    },
    thumbBorder: {
      off: 'rgba(251,191,36,0.85)',
      on: 'rgba(249,115,22,1)'
    }
  },
  violet: {
    off: {
      background: '#f6f3ff',
      border: 'rgba(168,85,247,0.35)',
      shadow: '0 3px 8px rgba(168,85,247,0.25)'
    },
    on: {
      background: 'linear-gradient(135deg,#d8b4fe,#9333ea)',
      border: 'rgba(147,51,234,0.95)',
      shadow: '0 12px 26px rgba(147,51,234,0.6)'
    },
    thumbShadow: {
      off: '0 3px 8px rgba(147,51,234,0.3)',
      on: '0 6px 14px rgba(147,51,234,0.55)'
    },
    thumbBorder: {
      off: 'rgba(196,181,253,0.9)',
      on: 'rgba(147,51,234,1)'
    }
  }
};

interface Switcher4Props {
  checked?: boolean;
  defaultChecked?: boolean;
  onToggle?: (checked: boolean) => void;
  className?: string;
  variant?: SwitcherVariant;
}

export default function Switcher4({
  checked,
  defaultChecked = false,
  onToggle,
  className = '',
  variant = 'pink'
}: Switcher4Props) {
  const isControlled = typeof checked === 'boolean';
  const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked);
  const currentChecked = isControlled ? (checked as boolean) : internalChecked;
  const theme = useMemo(() => SWITCHER_THEMES[variant], [variant]);

  const handleCheckboxChange = () => {
    const nextState = !currentChecked;
    if (!isControlled) {
      setInternalChecked(nextState);
    }
    onToggle?.(nextState);
  };

  return (
    <div className={`switcher4 ${className}`}>
      <label className="switcher4-toggle">
        <input
          type="checkbox"
          checked={currentChecked}
          onChange={handleCheckboxChange}
          className="sr-only"
          aria-label="Safe / NSFW switch"
        />
        <div
          className="switcher4-track"
          style={{
            background: currentChecked ? theme.on.background : theme.off.background,
            border: `1px solid ${currentChecked ? theme.on.border : theme.off.border}`,
            boxShadow: currentChecked ? theme.on.shadow : theme.off.shadow,
            '--thumb-x': `${currentChecked ? 19 : 0}px`
          } as React.CSSProperties}
        >
          <div
            className="switcher4-thumb"
            style={{
              transform: `translateX(${currentChecked ? 19 : 0}px)`,
              boxShadow: currentChecked ? theme.thumbShadow.on : theme.thumbShadow.off,
              border: `2px solid ${currentChecked ? theme.thumbBorder.on : theme.thumbBorder.off}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {currentChecked ? (
              <span className="switcher4-thumb-label" style={{ fontSize: '8px', fontWeight: 'bold' }}>18+</span>
            ) : (
              <span className="switcher4-thumb-label" style={{ fontSize: '7px', color: '#64748b', fontWeight: 'bold' }}>Safe</span>
            )}
          </div>
        </div>
      </label>
    </div>
  );
}

