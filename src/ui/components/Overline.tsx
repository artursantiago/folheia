import type { ReactNode } from 'react';
import styles from './Overline.module.css';

/** Small typewriter label in caps ("FICHA DE EMPRÉSTIMO", "DO ACERVO"). */
export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={[styles.overline, className].filter(Boolean).join(' ')}>{children}</span>;
}
