import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Accessible name, also shown as a tooltip. Required: icon-only controls need one. */
  label: string;
  /** Toggle buttons (e.g. an open panel) show as pressed. */
  pressed?: boolean;
}

export function IconButton({
  icon,
  label,
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
