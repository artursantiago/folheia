import type { ReactNode } from 'react';
import styles from './ReaderBar.module.css';

export interface ReaderBarProps {
  label: string;
  children: ReactNode;
  className?: string;
  /** `floating`: a card centered over the page. `strip`: edge to edge along the bottom (immersive mode). */
  variant?: 'floating' | 'strip';
}

/** The reading toolbar: a horizontal card with a perforated top edge. */
export function ReaderBar({ label, children, className, variant = 'floating' }: ReaderBarProps) {
  return (
    <nav
      aria-label={label}
      data-variant={variant}
      className={[styles.bar, className].filter(Boolean).join(' ')}
    >
      {children}
    </nav>
  );
}

export function ReaderBarSeparator() {
  return <span className={styles.separator} aria-hidden="true" />;
}

export interface PageCounterProps {
  /** Visible text, e.g. "12–13". */
  current: string;
  total: number;
  /** Accessible description, e.g. "Página 12 de 51. Ir para página". */
  label: string;
  onClick?: () => void;
}

export function PageCounter({ current, total, label, onClick }: PageCounterProps) {
  return (
    <button type="button" className={styles.counter} aria-label={label} onClick={onClick}>
      {current}
      <span className={styles.total}>/ {total}</span>
    </button>
  );
}
