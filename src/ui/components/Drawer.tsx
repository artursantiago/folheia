import type { ReactNode } from 'react';
import { IconButton } from './IconButton';
import styles from './Drawer.module.css';

export interface DrawerProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string | undefined;
}

/** Side panel (the "card catalog drawer"), used for the book index. */
export function Drawer({ title, closeLabel, onClose, children, className }: DrawerProps) {
  return (
    <aside aria-label={title} className={[styles.drawer, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton icon="close" label={closeLabel} onClick={onClose} />
      </header>
      <div className={styles.content}>{children}</div>
    </aside>
  );
}

export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}
