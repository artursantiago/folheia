import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface CommonProps {
  variant?: Variant | undefined;
  icon?: IconName | undefined;
  fullWidth?: boolean | undefined;
  compact?: boolean | undefined;
  children: ReactNode;
}

type AsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = AsButton | AsLink;

function classes({ variant = 'secondary', fullWidth, compact }: CommonProps) {
  return [styles.button, styles[variant], fullWidth && styles.full, compact && styles.compact]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps) {
  const { variant, icon, fullWidth, compact, children, className, ...rest } = props;
  const cls = [classes({ variant, fullWidth, compact, children }), className]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {icon && <Icon name={icon} />}
      {children}
    </>
  );
  if (rest.href !== undefined) {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  const { type = 'button', ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={cls} {...buttonRest}>
      {content}
    </button>
  );
}
