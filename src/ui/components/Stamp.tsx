import type { ReactNode } from 'react';
import styles from './Stamp.module.css';

export interface StampProps {
  children: ReactNode;
  tone?: 'accent' | 'muted';
  /** Rotation in degrees; library stamps are never quite straight. */
  tilt?: number;
  className?: string | undefined;
}

/** The "carimbo": marks states and seals ("Domínio público", "Pág. 87"). */
export function Stamp({ children, tone = 'accent', tilt, className }: StampProps) {
  return (
    <span
      className={[styles.stamp, styles[tone], className].filter(Boolean).join(' ')}
      style={tilt === undefined ? undefined : { transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}
