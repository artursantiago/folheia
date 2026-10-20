import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Small mono label on the left of the header ("Ficha de empréstimo"). */
  label?: ReactNode;
  /** Right side of the header: an accession number or an action. */
  meta?: ReactNode;
  /** Ruled lines in the body, like an index card. */
  ruled?: boolean;
  /** Dashed inner border, like a perforated card. */
  perforated?: boolean;
  /** Punched hole at the bottom center, like a library card. */
  punched?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
  bodyClassName?: string;
  children?: ReactNode;
}

/** The "ficha": the core surface of the Ex-libris identity. */
export function Card({
  label,
  meta,
  ruled = false,
  perforated = false,
  punched = false,
  as: Tag = 'div',
  className,
  bodyClassName,
  children,
  ...rest
}: CardProps) {
  const cls = [styles.card, perforated && styles.perforated, punched && styles.punched, className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {(label !== undefined || meta !== undefined) && (
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          {meta}
        </div>
      )}
      <div
        className={[styles.body, ruled && styles.ruled, bodyClassName].filter(Boolean).join(' ')}
      >
        {children}
      </div>
      {punched && <span className={styles.hole} aria-hidden="true" />}
    </Tag>
  );
}
