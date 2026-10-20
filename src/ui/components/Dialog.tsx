import { useEffect, useRef, type ReactNode } from 'react';
import { Card } from './Card';
import { IconButton } from './IconButton';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  /** Accessible name of the dialog. */
  title: string;
  /** Mono label in the card header ("Ficha catalográfica"). */
  label: ReactNode;
  meta?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
  punched?: boolean;
  width?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/** Modal built on native <dialog>: focus trap, Esc and backdrop come from the browser. */
export function Dialog({
  open,
  title,
  label,
  meta,
  closeLabel,
  onClose,
  punched = false,
  width = 'md',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`${styles.dialog} ${styles[width]}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <Card
        label={label}
        punched={punched}
        meta={
          <span className={styles.meta}>
            {meta}
            {closeLabel && <IconButton icon="close" label={closeLabel} onClick={onClose} />}
          </span>
        }
      >
        {children}
      </Card>
    </dialog>
  );
}
