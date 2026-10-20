import type { ReactNode } from 'react';
import styles from './Popover.module.css';

export interface PopoverProps {
  title: string;
  meta?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Floating card anchored by its parent (settings menu). Positioning is the caller's job. */
export function Popover({ title, meta, id, className, children }: PopoverProps) {
  return (
    <div
      id={id}
      role="group"
      aria-label={title}
      className={[styles.popover, className].filter(Boolean).join(' ')}
    >
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {meta}
      </div>
      {children}
    </div>
  );
}

export function PopoverRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
