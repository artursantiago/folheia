import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export interface NoticeProps {
  children: ReactNode;
  action?: { label: string; onClick: () => void };
}

/** Short ink strip with one action ("Nova edição disponível · Recarregar"). */
export function Notice({ children, action }: NoticeProps) {
  return (
    <div role="status" className={styles.notice}>
      <span className={styles.message}>{children}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
