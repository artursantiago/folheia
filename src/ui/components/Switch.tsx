import { useId } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ label, description, checked, onChange }: SwitchProps) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.text}>
        <label htmlFor={id}>{label}</label>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}
