import { useI18n } from '../hooks/useI18n';
import styles from './Accession.module.css';

export interface AccessionProps {
  /** Accession number; shown zero-padded ("Nº 0001"). Omit for an empty slot. */
  number?: number;
  /** Extra metadata joined with " · " (year, language…). */
  details?: readonly (string | number)[];
  className?: string;
}

export function formatAccession(prefix: string, number?: number): string {
  return number === undefined ? `${prefix} ————` : `${prefix} ${String(number).padStart(4, '0')}`;
}

/** The "tombo": a library accession number in typewriter type. */
export function Accession({ number, details = [], className }: AccessionProps) {
  const { t } = useI18n();
  const text = [formatAccession(t('accession.prefix'), number), ...details].join(' · ');
  return <span className={[styles.accession, className].filter(Boolean).join(' ')}>{text}</span>;
}
