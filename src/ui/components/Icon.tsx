import styles from './Icon.module.css';

const paths = {
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  first: 'M17 6l-6 6 6 6M7 6v12',
  last: 'M7 6l6 6-6 6M17 6v12',
  zoomIn: 'M20 20l-4.5-4.5M11 8v6M8 11h6M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  zoomOut: 'M20 20l-4.5-4.5M8 11h6M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  thumbnails: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  outline: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  settings:
    'M4 7h10M18 7h2M4 17h4M12 17h8M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v6h14v-6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  card: 'M3 5h18v14H3zM7 9h10M7 13h6',
  lock: 'M5 11h14v9H5zM8 11V8a4 4 0 0 1 8 0v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
} as const;

export type IconName = keyof typeof paths;

export interface IconProps {
  name: IconName;
  size?: 'md' | 'sm' | 'lg';
  /** Omit for decorative icons (hidden from assistive tech). */
  label?: string;
}

export function Icon({ name, size = 'md', label }: IconProps) {
  return (
    <svg
      className={`${styles.icon} ${styles[size]}`}
      viewBox="0 0 24 24"
      data-icon={name}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path d={paths[name]} />
    </svg>
  );
}
